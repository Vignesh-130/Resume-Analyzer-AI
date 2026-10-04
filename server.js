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
app.use(express.json({ limit: "1mb" }));

const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const hasGroqKey = Boolean(process.env.GROQ_API_KEY?.startsWith("gsk_"));
const groq = hasGroqKey ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://127.0.0.1:8000";

// The catalog is intentionally data-only: extending it does not require matcher changes.
const SKILL_CATALOG = {
  "Programming Languages": ["JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "Go", "Rust", "Kotlin", "Swift", "PHP", "Ruby", "R", "Scala", "Racket", "MATLAB", "Perl", "Bash", "PowerShell", "Dart", "Lua", "Objective-C", "Groovy", "VBA", "Solidity", "Julia", "Haskell", "F#", "COBOL", "Fortran", "Assembly", "Visual Basic", "Elixir", "Erlang", "Clojure"],
  Frontend: ["HTML", "CSS", "Sass", "Less", "Tailwind CSS", "Bootstrap", "Material UI", "Chakra UI", "React", "Angular", "Vue.js", "Svelte", "Next.js", "Nuxt.js", "Gatsby", "Redux", "Zustand", "MobX", "Webpack", "Vite", "Parcel", "jQuery", "Three.js", "D3.js", "Chart.js", "Web Components", "Progressive Web Apps", "Responsive Design", "Accessibility", "WCAG", "Figma"],
  Backend: ["Node.js", "Express.js", "NestJS", "Fastify", "Django", "Flask", "FastAPI", "Spring Boot", "Spring", "ASP.NET Core", ".NET", "Laravel", "Ruby on Rails", "Symfony", "Gin", "Fiber", "GraphQL", "REST API", "gRPC", "WebSockets", "Microservices", "Serverless", "OAuth 2.0", "OpenID Connect", "JWT", "Apache Kafka", "RabbitMQ", "Nginx", "Apache HTTP Server"],
  Databases: ["SQL", "MySQL", "PostgreSQL", "SQLite", "Oracle Database", "Microsoft SQL Server", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "Firebase", "Firestore", "Neo4j", "MariaDB", "CouchDB", "InfluxDB", "Snowflake", "BigQuery", "Amazon Redshift", "Data Modeling", "Database Design", "ETL", "Data Warehousing"],
  Cloud: ["AWS", "Microsoft Azure", "Google Cloud Platform", "AWS Lambda", "Amazon EC2", "Amazon S3", "Amazon RDS", "Amazon EKS", "Azure Functions", "Azure DevOps", "Google Kubernetes Engine", "CloudFormation", "Terraform", "OpenStack", "Heroku", "Vercel", "Netlify", "DigitalOcean", "Cloud Security", "Cloud Computing"],
  DevOps: ["Docker", "Kubernetes", "Jenkins", "GitHub Actions", "GitLab CI", "CircleCI", "Travis CI", "Ansible", "Chef", "Puppet", "Helm", "Argo CD", "Prometheus", "Grafana", "Datadog", "Splunk", "Linux", "CI/CD", "Infrastructure as Code", "Monitoring", "Logging", "Load Balancing", "SRE"],
  "AI/ML": ["Machine Learning", "Deep Learning", "Artificial Intelligence", "Natural Language Processing", "Computer Vision", "Generative AI", "Large Language Models", "MLOps", "Data Science", "Data Analysis", "Data Engineering", "TensorFlow", "PyTorch", "scikit-learn", "Keras", "Hugging Face", "OpenAI API", "LangChain", "Pandas", "NumPy", "SciPy", "Jupyter", "Apache Spark", "Hadoop", "Apache Airflow", "MLflow", "Feature Engineering", "Model Deployment", "Statistics", "A/B Testing", "Power BI", "Tableau"],
  Libraries: ["Axios", "Lodash", "RxJS", "React Query", "Socket.IO", "Mongoose", "Prisma", "Sequelize", "SQLAlchemy", "Pydantic", "Celery", "OpenCV", "Matplotlib", "Seaborn", "Plotly", "Beautiful Soup", "Scrapy", "pytest", "Jest", "Mocha", "Chai", "Cypress", "Playwright", "Selenium", "JUnit", "Mockito", "Puppeteer"],
  Frameworks: ["React Native", "Flutter", "Ionic", "Electron", "Android", "Android SDK", "iOS", "Xcode", "Unity", "Unreal Engine", "Qt", "WordPress", "Drupal", "Shopify", "Salesforce", "SAP", "ServiceNow", "SharePoint"],
  Testing: ["Unit Testing", "Integration Testing", "End-to-End Testing", "Test Automation", "TDD", "BDD", "Postman", "SoapUI", "JUnit", "TestNG", "Appium", "k6", "JMeter", "OWASP ZAP"],
  Tools: ["Git", "GitHub", "GitLab", "Bitbucket", "VS Code", "IntelliJ IDEA", "Eclipse", "PyCharm", "Jira", "Confluence", "Slack", "Notion", "Trello", "Maven", "Gradle", "npm", "Yarn", "pnpm", "Postman", "Swagger", "OpenAPI", "SonarQube", "Sentry"],
  "Operating Systems": ["Windows", "macOS", "Ubuntu", "Debian", "Red Hat Enterprise Linux", "CentOS", "Unix", "Android", "iOS"],
  Concepts: ["Data Structures", "Algorithms", "Object-Oriented Programming", "Functional Programming", "Design Patterns", "System Design", "Distributed Systems", "Agile", "Scrum", "Kanban", "SDLC", "Requirements Analysis", "Code Review", "Frontend Development", "Backend Development", "Full Stack Development", "Performance Optimization", "Scalability", "Concurrency", "Multithreading", "Caching", "Event-Driven Architecture", "Domain-Driven Design", "SOLID Principles", "Clean Architecture", "MVC", "MVVM", "API Integration", "Web Security"],
  Networking: ["TCP/IP", "HTTP", "HTTPS", "DNS", "TLS", "SSL", "VPN", "CDN", "WebSockets", "Network Security", "Firewall", "OSI Model", "IPv4", "IPv6"],
  "Cyber Security": ["Cybersecurity", "Application Security", "Penetration Testing", "Vulnerability Assessment", "OWASP", "SIEM", "Incident Response", "Identity and Access Management", "Encryption", "Cryptography", "SOC", "Threat Modeling", "Zero Trust"],
  "Soft Skills": ["Communication", "Leadership", "Teamwork", "Problem Solving", "Time Management", "Critical Thinking", "Adaptability", "Collaboration", "Project Management", "Stakeholder Management"]
};

const UI_CATEGORY = new Map();
const SKILLS = [];
for (const [category, skills] of Object.entries(SKILL_CATALOG)) {
  const outputCategory = category === "Soft Skills" ? "soft" : ["Tools", "Operating Systems", "Testing", "IDEs"].includes(category) ? "tools" : "technical";
  for (const name of skills) {
    const key = name.toLowerCase();
    if (!UI_CATEGORY.has(key)) { SKILLS.push({ name, category, outputCategory }); UI_CATEGORY.set(key, outputCategory); }
  }
}

const ALIASES = {
  HTML: ["html5"], CSS: ["css3"], JavaScript: ["javascript", "ecmascript", "es6", "es7", "es2015", "es2022"],
  "Node.js": ["nodejs", "node js"], "Express.js": ["expressjs", "express js"], "REST API": ["restful api", "restful apis", "rest apis"],
  React: ["reactjs", "react js"], "Next.js": ["nextjs", "next js"], "Vue.js": ["vuejs", "vue js"],
  Angular: ["angularjs"], PyTorch: ["py torch", "pytorch"], FastAPI: ["fast api"], GitHub: ["github"],
  "Machine Learning": ["machine-learning", "machinelearning", "ml"], "Artificial Intelligence": ["artificial intelligence", "ai"],
  "scikit-learn": ["scikit learn", "sklearn"], "Microsoft Azure": ["azure"], "Google Cloud Platform": ["google cloud", "gcp"],
  "C++": ["cpp"], "C#": ["c sharp", "csharp"], ".NET": ["dotnet", "dot net"], "Power BI": ["powerbi"],
  "React Native": ["react-native"], "Tailwind CSS": ["tailwind"], "GraphQL": ["graph ql"], "CI/CD": ["cicd", "ci cd"],
  "Object-Oriented Programming": ["oop"], "Natural Language Processing": ["nlp"], "Large Language Models": ["llm", "llms"],
  AWS: ["amazon web services"], "Amazon EC2": ["ec2"], "Amazon S3": ["s3"], "Amazon RDS": ["rds"],
  "Frontend Development": ["frontend", "front end", "front-end", "frontend components", "user interface", "user interfaces", "ui"],
  "Backend Development": ["backend", "back end", "back-end", "backend components", "server side", "server-side"],
  "Full Stack Development": ["full stack", "full-stack", "frontend and backend"],
  "Responsive Design": ["responsive ui", "responsive user interface", "responsive user interfaces", "responsive web design"],
  "API Integration": ["integrate api", "integrate apis", "api integrations", "integrate databases"],
  "Web Security": ["security", "application security", "secure web applications"],
  "Performance Optimization": ["performance", "optimize", "optimization"]
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeText = value => String(value || "").normalize("NFKC").toLowerCase().replace(/[‐‑–—]/g, "-").replace(/\s+/g, " ").trim();
const compact = value => normalizeText(value).replace(/[^a-z0-9+#]/g, "");
const makePattern = term => new RegExp(`(^|[^a-z0-9+#])${term.trim().split(/[\s.-]+/).filter(Boolean).map(escapeRegex).join("[\\s.-]+")}(?=([^a-z0-9+#]|$))`, "i");
const makeGlobalPattern = term => new RegExp(`(^|[^a-z0-9+#])${term.trim().split(/[\s.-]+/).filter(Boolean).map(escapeRegex).join("[\\s.-]+")}(?=([^a-z0-9+#]|$))`, "gi");

// Compile matching expressions once. Version suffixes are accepted for skills with numeric variants.
const MATCHERS = SKILLS.map(skill => {
  const terms = [skill.name, ...(ALIASES[skill.name] || [])];
  const versionable = ["HTML", "CSS", "Java", "Python", "React", "Angular", "JavaScript", "TypeScript", "Node.js"].includes(skill.name);
  const regexes = terms.map(term => versionable
    ? new RegExp(`(^|[^a-z0-9+#])${term.trim().split(/[\s.-]+/).filter(Boolean).map(escapeRegex).join("[\\s.-]+")}(?:\\s*[-.]?\\d+(?:\\.\\d+)*)?(?=([^a-z0-9+#]|$))`, "i")
    : makePattern(term));
  return { ...skill, terms, regexes, compactTerms: terms.map(compact) };
});

function findExactSkills(text) {
  const normalized = normalizeText(text);
  return MATCHERS.flatMap(matcher => matcher.regexes.some(regex => regex.test(normalized)) ? [{ ...matcher, confidence: "exact" }] : []);
}

function findFuzzySkills(text, exactNames) {
  const tokens = normalizeText(text).split(/[^a-z0-9+#]+/).filter(Boolean);
  const joined = new Set(tokens.map((_, index) => compact(tokens.slice(index, index + 4).join(" "))));
  return MATCHERS.flatMap(matcher => {
    if (exactNames.has(matcher.name)) return [];
    const likely = matcher.compactTerms.some(term => term.length >= 7 && joined.has(term));
    return likely ? [{ ...matcher, confidence: "fuzzy" }] : [];
  });
}

async function matchSkills(text) {
  const exact = findExactSkills(text);
  const exactNames = new Set(exact.map(x => x.name));
  const fuzzy = findFuzzySkills(text, exactNames);
  const merged = [...exact, ...fuzzy];
  return [...new Map(merged.map(skill => [skill.name.toLowerCase(), skill])).values()];
}

function categorise(skills) {
  return { technical: skills.filter(s => s.outputCategory === "technical").map(s => s.name), soft: skills.filter(s => s.outputCategory === "soft").map(s => s.name), tools: skills.filter(s => s.outputCategory === "tools").map(s => s.name) };
}

function detectSections(text) {
  const normalized = normalizeText(text);
  const has = terms => terms.some(term => new RegExp(`(?:^|\\n|\\s)${escapeRegex(term)}(?:\\s|:|$)`, "i").test(text)) || terms.some(term => normalized.includes(term));
  return { education: has(["education", "academic background", "qualifications"]), skills: has(["skills", "technical skills", "core competencies"]), projects: has(["projects", "personal projects", "academic projects"]), experience: has(["experience", "work experience", "employment", "internship", "professional experience"]) };
}

function analyseFormatting(text, sections) {
  const issues = [];
  const lines = String(text).split(/\r?\n/);
  const words = normalizeText(text).split(/\s+/).filter(Boolean).length;
  if (words < 180) issues.push("Resume content is too short for an ATS to assess your experience reliably.");
  for (const [section, exists] of Object.entries(sections)) if (!exists) issues.push(`Missing a clearly labelled ${section} section.`);
  if (!/\b(summary|profile|objective)\b/i.test(text)) issues.push("Consider adding a short professional summary or objective near the top.");
  if (/[★☆◆◇●▪▫✓✔✦➤➢]/u.test(text)) issues.push("Decorative symbols were detected; use simple bullets for more reliable ATS parsing.");
  if (/\[image\]|\[graphic\]|\b(image|photo|headshot)\b/i.test(text)) issues.push("Images or graphics may not be read by ATS software; keep critical details in text.");
  const tableLikeRows = lines.filter(line => /\t/.test(line) && line.split("\t").filter(Boolean).length >= 3).length;
  if (tableLikeRows >= 2) issues.push("Possible table-based layout detected; tables can change reading order in some ATS systems.");
  const longBlankRun = text.match(/(?:\r?\n\s*){5,}/g);
  if (longBlankRun?.length) issues.push("Large blank areas were detected; reduce excess spacing to keep the document compact.");
  return issues;
}

function detectContactInfo(text) {
  return {
    email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text),
    phone: /(?:\+?\d[\s().-]*){10,}/.test(text),
    linkedin: /linkedin\.com\/in\//i.test(text),
    github: /github\.com\//i.test(text)
  };
}

function keywordDensity(text, required) {
  const normalized = normalizeText(text);
  return Object.fromEntries(required.map(skill => {
    const terms = [skill.name, ...(ALIASES[skill.name] || [])];
    const count = terms.reduce((total, term) => total + (normalized.match(makeGlobalPattern(term)) || []).length, 0);
    return [skill.name, count];
  }));
}

// Resume-only analysis. This score must never use job description terms,
// required skills, keyword density, semantic similarity, or match ratios.
function calculateReadability({ text, file, sections, formattingIssues, contactInfo }) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean).length;
  const fileTypeScore = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.mimetype) ? 100 : 0;
  const extractionScore = text.length >= 1200 ? 100 : text.length >= 700 ? 85 : text.length >= 350 ? 65 : text.length >= 150 ? 40 : 15;
  const lengthScore = words >= 350 && words <= 1100 ? 100 : words >= 220 ? 80 : words >= 150 ? 55 : 30;
  const sectionScore = Object.values(sections).filter(Boolean).length * 25;
  const contactScore = Math.round(Object.values(contactInfo).filter(Boolean).length / Object.keys(contactInfo).length * 100);
  const formatScore = Math.max(20, 100 - formattingIssues.length * 13);
  return Math.round(Math.min(100, Math.max(0, fileTypeScore * .10 + extractionScore * .20 + lengthScore * .15 + sectionScore * .25 + contactScore * .15 + formatScore * .15)));
}

function textCoverageScore(resumeText, jobDescription) {
  const resumeTokens = new Set(normalizeText(resumeText).split(/[^a-z0-9+#]+/).filter(token => token.length >= 4));
  const jobTokens = normalizeText(jobDescription).split(/[^a-z0-9+#]+/).filter(token => token.length >= 4);
  const stopWords = new Set(["with", "that", "this", "from", "will", "your", "have", "both", "into", "their", "there", "using", "build", "maintain", "ensure", "develop", "developer", "description", "application", "applications"]);
  const uniqueJobTokens = [...new Set(jobTokens.filter(token => !stopWords.has(token)))];
  if (!uniqueJobTokens.length) return 0;
  const matched = uniqueJobTokens.filter(token => resumeTokens.has(token)).length;
  return Math.round((matched / uniqueJobTokens.length) * 100);
}

// JD-dependent analysis. This score is allowed to use job-specific skills,
// responsibilities, terminology, requirements, and optional semantic signals.
function calculateMatchScore({ resumeText, jobDescription, requiredSkills, matchedSkills }) {
  const skillScore = requiredSkills.length
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 0;
  const terminologyScore = textCoverageScore(resumeText, jobDescription);
  const requirementPresenceScore = requiredSkills.length ? 100 : Math.min(60, terminologyScore);

  return Math.round(Math.min(100, Math.max(0, skillScore * .65 + terminologyScore * .25 + requirementPresenceScore * .10)));
}

function calculateOverallScore({ readabilityScore, matchScore }) {
  return Math.round(Math.min(100, Math.max(0, readabilityScore * .35 + matchScore * .65)));
}

function buildSuggestions({ missingSkills, sections, formattingIssues, text, matchRatio }) {
  const candidates = [];
  if (missingSkills.length) candidates.push({ p: 100, text: `Tailor your Skills and experience bullets with relevant keywords you genuinely know: ${missingSkills.slice(0, 5).join(", ")}.` });
  if (!sections.experience) candidates.push({ p: 90, text: "Add an Experience section with action-led bullets that explain your contribution and result." });
  if (!sections.projects) candidates.push({ p: 85, text: "Add two or three relevant projects, including the stack, your role, and measurable outcomes." });
  if (!sections.skills) candidates.push({ p: 80, text: "Add a clearly labelled Skills section grouped by languages, frameworks, tools, and databases." });
  if (!sections.education) candidates.push({ p: 75, text: "Add an Education section with your degree, institution, and graduation details." });
  if (formattingIssues.length) candidates.push({ p: 70, text: "Simplify the flagged formatting so the resume remains easy for ATS software to parse." });
  if (normalizeText(text).split(/\s+/).length < 350) candidates.push({ p: 65, text: "Expand concise bullets with scope, technologies used, and measurable impact." });
  if (matchRatio < .5) candidates.push({ p: 60, text: "Align your summary and most relevant accomplishments with the responsibilities in this job description." });
  candidates.push({ p: 50, text: "Use numbers where possible, for example accuracy, latency, users, revenue, or delivery time, to show impact." });
  return candidates.sort((a, b) => b.p - a.p).map(x => x.text).filter((value, index, values) => values.indexOf(value) === index).slice(0, 6);
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.mimetype)) });

async function extractText(file) {
  if (file.mimetype === "application/pdf") return (await pdf(file.buffer)).text || "";
  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return (await mammoth.extractRawText({ buffer: file.buffer })).value || "";
  throw new Error("Only PDF and DOCX resume files are supported.");
}

app.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please upload a PDF or DOCX resume." });
    const jobDescription = String(req.body.jobDescription || "").trim();
    if (!jobDescription) return res.status(400).json({ error: "Job description is required." });
    const text = (await extractText(req.file)).replace(/\u0000/g, "").trim();
    if (text.length < 20) return res.status(400).json({ error: "Resume text could not be extracted. Use a text-based PDF or DOCX file." });

    // Resume-only path: parser output -> structure/contact/format checks -> readability score.
    // Nothing in this block may depend on the job description.
    const resumeSkills = await matchSkills(text);
    const sections = detectSections(text);
    const formattingIssues = analyseFormatting(text, sections);
    const contactInfo = detectContactInfo(text);
    const atsReadability = calculateReadability({
      text,
      file: req.file,
      sections,
      formattingIssues,
      contactInfo
    });

    // JD-dependent path: resume + JD -> required skills/terms -> match score.
    // This path can change whenever the job description changes.
    const requiredSkills = await matchSkills(jobDescription);
    const resumeNames = new Set(resumeSkills.map(skill => skill.name.toLowerCase()));
    const matchedSkills = requiredSkills.filter(skill => resumeNames.has(skill.name.toLowerCase()));
    const missingSkills = requiredSkills.filter(skill => !resumeNames.has(skill.name.toLowerCase()));
    const density = keywordDensity(text, requiredSkills);
    const matchRatio = requiredSkills.length ? matchedSkills.length / requiredSkills.length : 0;
    const score = calculateMatchScore({
      resumeText: text,
      jobDescription,
      requiredSkills,
      matchedSkills
    });
    const overallScore = calculateOverallScore({
      readabilityScore: atsReadability,
      matchScore: score
    });
    const uiSkills = categorise(resumeSkills);
    const suggestions = buildSuggestions({ missingSkills: missingSkills.map(x => x.name), sections, formattingIssues, text, matchRatio });

    // Groq is optional enrichment only; deterministic recommendations remain the primary output.
    if (groq && suggestions.length < 6) {
      try {
        const completion = await groq.chat.completions.create({ model: groqModel, messages: [{ role: "user", content: `Give one concise ATS resume improvement in plain text only. Do not use markdown, headings, numbering, or bullet symbols. Resume/job match is ${Math.round(matchRatio * 100)}%. Missing: ${missingSkills.slice(0, 5).map(x => x.name).join(", ")}.` }] });
        const extra = completion.choices?.[0]?.message?.content?.trim();
        if (extra && !suggestions.some(item => compact(item) === compact(extra))) suggestions.push(extra);
      } catch (error) { console.warn("Groq suggestion unavailable:", error.message); }
    }
    res.json({ technical_skills: uiSkills.technical, soft_skills: uiSkills.soft, tool_skills: uiSkills.tools, file_name: req.file.originalname, extracted_text: text.substring(0, 2000), score: score.toFixed(2), match_score: score, overall_score: overallScore, score_breakdown: { readability_score: atsReadability, match_score: score, overall_score: overallScore, overall_weights: { readability: 0.35, match: 0.65 } }, found_skills: resumeSkills.map(x => x.name), required_skills: requiredSkills.map(x => x.name), matched_skills: matchedSkills.map(x => x.name), missing_skills: missingSkills.map(x => x.name), formatting_issues: formattingIssues, keyword_density: density, resume_sections: sections, contact_info: contactInfo, suggestions: suggestions.slice(0, 6), ats_readability: atsReadability });
  } catch (error) { console.error("UPLOAD ERROR:", error); res.status(500).json({ error: "Unable to analyze this resume. Please try another text-based PDF or DOCX file." }); }
});

app.use((err, _req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Resume file is too large. Maximum upload size is 5 MB." });
  if (err) return res.status(400).json({ error: "Only PDF and DOCX resume files are supported." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
