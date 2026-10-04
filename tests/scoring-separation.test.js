const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PORT = "5051";
const BASE_URL = `http://127.0.0.1:${PORT}`;

const docxMime =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const jobs = [
  {
    name: "Data Analyst",
    description:
      "Data Analyst role requiring SQL, Excel, Power BI, data analysis, dashboards, reporting, statistics, and communication with business stakeholders."
  },
  {
    name: "Java Developer",
    description:
      "Java Developer role requiring Java, Spring Boot, REST API, MySQL, object-oriented programming, Git, unit testing, backend development, and scalable services."
  },
  {
    name: "Frontend Developer",
    description:
      "Frontend Developer role requiring HTML, CSS, JavaScript, React, responsive design, accessibility, Git, API integration, and performance optimization."
  },
  {
    name: "Data Analyst repeat",
    description:
      "Data Analyst role requiring SQL, Excel, Power BI, data analysis, dashboards, reporting, statistics, and communication with business stakeholders."
  }
];

function findResumeFixture() {
  const uploadsDir = path.join(ROOT, "uploads");
  const files = fs
    .readdirSync(uploadsDir)
    .map(name => path.join(uploadsDir, name))
    .filter(file => fs.statSync(file).isFile());

  if (!files.length) {
    throw new Error("No resume fixture found in uploads/.");
  }

  return files[0];
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Server did not start in time."));
    }, 10000);

    child.stdout.on("data", chunk => {
      if (chunk.toString().includes(`http://localhost:${PORT}`)) {
        clearTimeout(timeout);
        resolve();
      }
    });

    child.stderr.on("data", chunk => {
      process.stderr.write(chunk);
    });

    child.on("exit", code => {
      clearTimeout(timeout);
      reject(new Error(`Server exited early with code ${code}.`));
    });
  });
}

async function analyze(resumePath, description) {
  const form = new FormData();
  const buffer = fs.readFileSync(resumePath);
  form.append(
    "resume",
    new Blob([buffer], { type: docxMime }),
    "RESUME.docx"
  );
  form.append("jobDescription", description);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: form
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`);
  }

  return data;
}

(async () => {
  const resumePath = findResumeFixture();
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT,
      GROQ_API_KEY: "",
      AI_SERVER_URL: "http://127.0.0.1:65535"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForServer(child);
    const results = [];

    for (const job of jobs) {
      const data = await analyze(resumePath, job.description);
      results.push({
        jd: job.name,
        readability: data.ats_readability,
        match: data.match_score,
        overall: data.overall_score
      });
    }

    const firstReadability = results[0].readability;
    const readabilityStable = results.every(
      result => result.readability === firstReadability
    );

    const jd1RepeatStable =
      results[0].readability === results[3].readability &&
      results[0].match === results[3].match &&
      results[0].overall === results[3].overall;

    console.table(results);

    if (!readabilityStable) {
      throw new Error("ATS Readability changed across JDs.");
    }

    if (!jd1RepeatStable) {
      throw new Error("Repeated JD1 did not produce deterministic scores.");
    }
  } finally {
    child.kill();
  }
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
