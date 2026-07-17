require("dotenv").config({
  override: true
});

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const mammoth = require("mammoth");
const axios = require("axios");
const Groq = require("groq-sdk");
const pdf = require("pdf-parse");

const app = express();

app.use(express.static("public"));
app.use(cors());
app.use(express.json());

const groqModel =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const hasGroqKey =
  Boolean(process.env.GROQ_API_KEY) &&
  process.env.GROQ_API_KEY.startsWith("gsk_");

console.log(
  "Groq Key Loaded:",
  hasGroqKey ? "YES" : "NO"
);

// ✅ Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// =========================
// SKILLS DATABASE
// =========================

const categorizedSkills = {

  technical: [
    "MySQL",
    "Oracle",
    "PostgreSQL",
    "SQLite",
    "Firebase",
    "NoSQL",
    "Data Engineering",
    "ETL",
    "Big Data",
    "Java",
    "Python",
    "JavaScript",
    "React",
    "Node.js",
    "Express.js",
    "HTML",
    "CSS",
    "SQL",
    "MongoDB",
    "Frontend",
    "Backend",
    "Full Stack Development",
    "Responsive Design",
    "Web Security",
    "Scalability",
    "Performance Optimization",
    "C++",
    "C",
    "Machine Learning",
    "Data Structures",
    "Power BI",
    "Excel",
    "Database Management",
    "Data Virtualization",
    "Data Analysis",
    "Data Science",
    "Artificial Intelligence",
    "Deep Learning",
    "Cloud Computing",
    "AWS",
    "Azure",
    "DevOps",
    "Kubernetes",
    "REST API",
    "API Integration",
    "Spring Boot",
    "TensorFlow",
    "Pandas",
    "NumPy",
    "Tableau",
    "Cybersecurity"
  ],

  soft: [
    "Leadership",
    "Communication",
    "Teamwork",
    "Problem Solving",
    "Creativity",
    "Time Management"
  ],

  tools: [
    "Git",
    "Docker",
    "VS Code",
    "Postman",
    "Figma",
    "Linux"
  ]
};

// =========================
// COMBINED SKILLS
// =========================

const skillsList = [
  ...categorizedSkills.technical,
  ...categorizedSkills.soft,
  ...categorizedSkills.tools
];

const skillAliases = {
  "Node.js": ["Node", "NodeJS", "Node JS"],
  "Express.js": ["Express", "ExpressJS", "Express JS"],
  "REST API": ["REST APIs", "RESTful API", "RESTful APIs", "API"],
  "API Integration": ["integrate APIs", "API integrations", "integrate databases"],
  "Frontend": ["front end", "front-end", "frontend components"],
  "Backend": ["back end", "back-end", "backend components"],
  "Full Stack Development": ["full stack", "full-stack", "frontend and backend"],
  "Responsive Design": ["responsive user interfaces", "responsive UI", "responsive web design"],
  "Web Security": ["security", "secure applications", "application security"],
  "Scalability": ["scalable", "application scalability"],
  "Performance Optimization": ["performance", "optimization", "optimize"]
};

// =========================
// MULTER
// =========================

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage
});

const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasSkill = (text, skill) => {
  const terms = [
    skill,
    ...(skillAliases[skill] || [])
  ];

  return terms.some(term => {
    const escapedSkill = term
    .trim()
    .split(/\s+/)
    .map(escapeRegex)
    .join("[\\s\\-.]+");

    const pattern = new RegExp(
      `(^|[^a-z0-9+.#])${escapedSkill}([^a-z0-9+.#]|$)`,
      "i"
    );

    return pattern.test(text);
  });
};

const buildFallbackSuggestions = ({
  missingSkills,
  formattingIssues,
  sections,
  score,
  text
}) => {
  const suggestions = [];

  if (missingSkills.length > 0) {
    suggestions.push(
      `Add these job keywords if you genuinely know them: ${missingSkills.slice(0, 6).join(", ")}.`
    );
  }

  if (!sections.projects) {
    suggestions.push(
      "Add a Projects section with 2-3 relevant projects, the tech stack used, and measurable outcomes."
    );
  }

  if (!sections.experience) {
    suggestions.push(
      "Add internship, training, freelance, academic, or volunteer experience using action verbs and impact."
    );
  }

  if (!sections.skills) {
    suggestions.push(
      "Add a clear Skills section grouped by languages, frameworks, tools, and databases."
    );
  }

  if (!sections.education) {
    suggestions.push(
      "Add an Education section with degree, college, graduation year, and relevant coursework."
    );
  }

  if (formattingIssues.length > 0) {
    suggestions.push(
      "Simplify formatting for ATS: avoid tables, unusual symbols, heavy graphics, and complex layouts."
    );
  }

  if (text.length < 800) {
    suggestions.push(
      "Expand resume content with stronger bullet points that show what you built, how you built it, and the result."
    );
  }

  if (Number(score) < 60) {
    suggestions.push(
      "Tailor the resume summary and project bullets to match the job description more closely."
    );
  }

  suggestions.push(
    "Use measurable achievements where possible, such as accuracy, speed, users, marks, completion time, or performance improvement."
  );

  return [...new Set(suggestions)];
};

// =========================
// UPLOAD ROUTE
// =========================

app.post(
  "/upload",
  upload.single("resume"),
  async (req, res) => {

    console.log("UPLOAD API HIT");

    try {

      // =========================
      // FILE CHECK
      // =========================

      if (!req.file) {

        return res.status(400).json({
          error: "No resume uploaded"
        });

      }

      console.log("File Name:", req.file.originalname);
      console.log("Mime Type:", req.file.mimetype);

      let text = "";

      // =========================
      // PDF PARSE
      // =========================

      if (req.file.mimetype === "application/pdf") {

        try {

          const data = await pdf(req.file.buffer);

          text = data.text || "";

          text = text
            .replace(/\s+/g, " ")
            .trim();

        }

        catch (pdfError) {

          console.error("PDF PARSE ERROR:");
          console.error(pdfError);

          return res.status(400).json({
            error: "Unable to read PDF file"
          });

        }

      }

      // =========================
      // DOCX PARSE
      // =========================

      else if (
        req.file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {

        try {

          const data =
            await mammoth.extractRawText({
              buffer: req.file.buffer
            });

          text = data.value || "";

        }

        catch (docxError) {

          console.error("DOCX ERROR:");
          console.error(docxError);

          return res.status(400).json({
            error: "Unable to read DOCX file"
          });

        }

      }

      // =========================
      // INVALID FILE
      // =========================

      else {

        return res.status(400).json({
          error: "Only PDF and DOCX supported"
        });

      }

      // =========================
      // EMPTY TEXT CHECK
      // =========================

      if (!text || text.trim().length < 20) {

        return res.status(400).json({
          error: "Resume text could not be extracted"
        });

      }

      // =========================
      // JOB DESCRIPTION
      // =========================

      const jobDescription =
        (req.body.jobDescription || "").trim();

      if (!jobDescription) {

        return res.status(400).json({
          error: "Job description is required"
        });

      }

      // =========================
      // FOUND SKILLS
      // =========================

      const foundSkills =
        skillsList.filter(skill =>
          hasSkill(text, skill)
        );

      // =========================
      // REQUIRED SKILLS
      // =========================

      const requiredSkills =
        skillsList.filter(skill =>
          hasSkill(jobDescription, skill)
        );

      // =========================
      // MISSING SKILLS
      // =========================

      const missingSkills =
        requiredSkills.filter(skill =>
          !foundSkills.includes(skill)
        );

      // =========================
      // CATEGORIZED SKILLS
      // =========================

      const technicalSkills =
        foundSkills.filter(skill =>
          categorizedSkills.technical.includes(skill)
        );

      const softSkills =
        foundSkills.filter(skill =>
          categorizedSkills.soft.includes(skill)
        );

      const toolSkills =
        foundSkills.filter(skill =>
          categorizedSkills.tools.includes(skill)
        );

      // =========================
      // ATS CHECKER
      // =========================

      let formattingIssues = [];

      if (text.length < 300) {

        formattingIssues.push(
          "Resume content is too short."
        );

      }

      if (text.includes("|")) {

        formattingIssues.push(
          "Tables may reduce ATS readability."
        );

      }

      if (text.match(/[■□▪◆★]/g)) {

        formattingIssues.push(
          "Special symbols may confuse ATS."
        );

      }

      // =========================
      // SECTION CHECKER
      // =========================

      const sections = {

        education:
          text.toLowerCase().includes("education"),

        skills:
          text.toLowerCase().includes("skills"),

        projects:
          text.toLowerCase().includes("project"),

        experience:
          text.toLowerCase().includes("experience")

      };

      // =========================
      // ATS READABILITY SCORE
      // =========================

      let atsReadability = 100;

      if (text.length < 500) {
        atsReadability -= 20;
      }

      if (foundSkills.length < 5) {
        atsReadability -= 20;
      }

      if (missingSkills.length > 5) {
        atsReadability -= 20;
      }

      if (!sections.education) {
        atsReadability -= 10;
      }

      if (!sections.skills) {
        atsReadability -= 10;
      }

      if (!sections.projects) {
        atsReadability -= 10;
      }

// =========================
// KEYWORD DENSITY
// =========================

const keywordDensity = {};

requiredSkills.forEach(skill => {

  const terms = [
    skill,
    ...(skillAliases[skill] || [])
  ];

  keywordDensity[skill] =
    terms.reduce((total, term) => {
      const escapedSkill =
        term
          .trim()
          .split(/\s+/)
          .map(escapeRegex)
          .join("[\\s\\-.]+");

      const regex =
        new RegExp(
          `(^|[^a-z0-9+.#])${escapedSkill}([^a-z0-9+.#]|$)`,
          "gi"
        );

      const matches =
        text.match(regex);

      return total + (matches ? matches.length : 0);
    }, 0);

});

      // =========================
      // AI SERVER
      // =========================

      let score = 45;

      let aiSuggestions = [];

      try {

        const aiResponse =
          await axios.post(
            "http://127.0.0.1:8000/analyze",
            {
              resume_text: text,
              job_description: jobDescription
            }
          );

        const aiData = aiResponse.data;

        score =
          aiData.score || 45;

        aiSuggestions =
          aiData.suggestions || [];

      }

      catch (aiError) {

        console.log(
          "AI Server Not Running"
        );

      }

      // =========================
      // GROQ AI
      // =========================

      let aiSuggestion = "";

      if (hasGroqKey) {

        try {

        const completion =
          await groq.chat.completions.create({

            messages: [
              {
                role: "user",
                content: `
Resume Skills:
${foundSkills.join(", ")}

Job Description:
${jobDescription}

Missing Skills:
${missingSkills.join(", ")}

Act as ATS Resume Expert.

Give:
1. Resume improvements
2. ATS optimization tips
3. Project suggestions
4. Missing skills advice

Keep concise.
`
              }
            ],

            model:
              groqModel

          });

        aiSuggestion =
  completion?.choices?.[0]
    ?.message?.content
    || "No AI suggestions";

        }

        catch (groqError) {

        console.error(
          "GROQ ERROR:"
        );

        console.error(
          groqError.message
        );

        }

      }

      // =========================
      // FALLBACK SUGGESTIONS
      // =========================

      const suggestions =
        buildFallbackSuggestions({
          missingSkills,
          formattingIssues,
          sections,
          score,
          text
        });

      // =========================
      // FINAL RESPONSE
      // =========================

      res.json({

        technical_skills:
          technicalSkills,

        soft_skills:
          softSkills,

        tool_skills:
          toolSkills,

        file_name:
          req.file.originalname,

        extracted_text:
          text.substring(0, 2000),

        score:
  Number(score || 0).toFixed(2),

        found_skills:
          foundSkills,

        required_skills:
          requiredSkills,

        missing_skills:
          missingSkills,

        formatting_issues:
          formattingIssues,

        keyword_density:
          keywordDensity,

        resume_sections:
          sections,

        suggestions: [

          ...suggestions,

          ...aiSuggestions,

          ...(aiSuggestion
            ? [aiSuggestion]
            : [])

        ],
                ats_readability:
          atsReadability,

      });

    }

    catch (error) {

      console.error(
        "FULL BACKEND ERROR:"
      );

      console.error(error);

      res.status(500).json({
        error: "Internal Server Error"
      });

    }

  }
);

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `Server running on http://localhost:${PORT}`
  );

});
