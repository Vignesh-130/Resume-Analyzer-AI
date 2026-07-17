const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const axios = require("axios");
// Middleware
app.use(bodyParser.json());
app.use(cors());
// Python function to get match score
async function getMatchScore(resumeText, jobDescription) {

  const response = await axios.post(
    "http://127.0.0.1:8000/analyze",
    {
      resume_text: resumeText,
      job_description: jobDescription
    }
  );

  return response.data;
}
const fs = require("fs");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

async function extractText(filePath, fileType) {
  if (fileType === "application/pdf") {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const data = await mammoth.extractRawText({ path: filePath });
    return data.value;
  }

  return "";
}
// API  Route to calculate match score
app.post("/match-score", upload.single("resume"), async (req, res) => {
  try {
    const jobDescription = req.body.jobDescription;
    console.log("Uploaded File Info:", req.file);
console.log("MIME Type:", req.file?.mimetype);
console.log("Job Description:", jobDescription);

    if (!req.file || !jobDescription) {
      return res.status(400).json({ error: "Missing file or job description" });
    }

    // Extract text from uploaded file
    const resumeText = await extractText(req.file.path, req.file.mimetype);
    console.log("Resume Text:", resumeText.slice(0, 200)); // first 200 chars

    // Get match score
    const score = await getMatchScore(resumeText, jobDescription);

    res.json(score);

  } catch (error) {
  console.error("FULL ERROR:", error);
  res.status(500).json({ error: error.toString() });
}
});
// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});