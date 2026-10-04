# Resume Analyzer

A web-based resume analysis tool that matches uploaded resumes to a target job description, identifies missing keywords, and displays skill match and resume strength insights.

## Project Overview

This project is a resume analysis tool designed to help job seekers and hiring teams assess resume quality against a target job description. It performs file extraction, keyword matching, and resume scoring while presenting results with clear charts, skill groupings, and improvement suggestions.

## Resume Project Documentation

### Purpose
- Analyze an uploaded resume against a specific job description.
- Identify skill matches, missing job keywords, and formatting issues.
- Provide an overall resume strength score and ATS readability assessment.
- Generate actionable improvement suggestions using built-in rules and optional AI integrations.

### User Flow
1. The user uploads a resume file (`.pdf` or `.docx`).
2. The user pastes or enters a job description into the text area.
3. The application sends the resume and job description to the backend.
4. The backend extracts the resume text and compares it to the job description.
5. Results are returned and displayed in the browser with charts, badges, and summaries.

### How It Works
- The frontend validates that a file and job description exist before submitting.
- The backend accepts uploads via `/upload`, parses the resume text, and extracts keywords.
- Resume skills are classified into three categories: technical, soft, and tools.
- Job-required keywords are detected separately and compared to the resume skills.
- Missing skills and formatting issues are reported.
- ATS Readability is calculated from resume-only factors.
- ATS Match Score is calculated from resume + job-description comparison.
- Overall Score is calculated from Readability and Match Score using explicit weights.
- Optional AI or GROQ-based suggestions are appended when configured.

### Scoring Architecture

The project intentionally separates resume quality from job fit:

- `ats_readability`
  - Resume-only score.
  - Uses parsing success, supported file type, text extraction quality, section detection, contact information, and formatting issues.
  - Does not use job description keywords, required skills, keyword density, semantic similarity, or match ratios.

- `match_score`
  - Job-dependent score.
  - Uses required skill matching, missing skills, resume/JD terminology coverage, and job-specific requirements.
  - Changes naturally when the job description changes.

- `overall_score`
  - Combined score.
  - Current weighting: `35% readability + 65% match`.

### Core Components
- `server.js`
  - Main Node.js backend and API server.
  - Handles file uploads using `multer`.
  - Parses PDF files with `pdf-parse` and DOCX files with `mammoth`.
  - Performs resume/job description matching and builds the response payload.

- `public/index.html`
  - User interface for upload, input, and results presentation.
  - Includes placeholders for charts, file preview, and suggestion sections.

- `public/script.js`
  - Client-side logic for form validation and submission.
  - Fetches results from the backend and renders charts with Chart.js.
  - Displays errors and loading state cleanly.

- `public/style.css`
  - Custom styling for overlays, animations, and chart sizing.

- `.env`
  - Holds configuration values like `GROQ_API_KEY` and `GROQ_MODEL`.

### Request / Response Contract
- POST `/upload`
  - Request fields:
    - `resume` file upload (`application/pdf` or DOCX MIME type)
    - `jobDescription` text field
  - Response fields:
    - `technical_skills`, `soft_skills`, `tool_skills`
    - `found_skills`, `required_skills`, `missing_skills`
    - `formatting_issues`, `keyword_density`, `resume_sections`
    - `suggestions`, `score`, `ats_readability`

### Validation and Error Handling
- Frontend:
  - Ensures resume file is selected and job description is filled.
  - Shows reusable error messages instead of browser alerts.
  - Disables the analyze button during upload.

- Backend:
  - Rejects unsupported file types and files larger than 5 MB.
  - Returns clear JSON error responses for parsing and validation failures.
  - Validates that extracted resume text is present and job description is provided.

### Technology Stack
- Node.js
- Express
- Multer
- PDF parsing: `pdf-parse`
- DOCX parsing: `mammoth`
- Frontend styling: Tailwind CSS via CDN
- Charts: Chart.js
- Optional AI integration: GROQ and an external AI server

### Deployment and Run Instructions
1. Install dependencies:

```bash
npm install
```

2. Configure `.env` with:

```text
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

3. Start the project:

```bash
npm start
```

4. Open the app at `http://localhost:5000`.

### Extensibility Notes
- Add new resume file formats by extending `multer` file filtering and parser logic.
- Improve scoring by replacing keyword heuristics with NLP similarity or embeddings.
- Add user authentication and resume history tracking for a multi-user experience.
- Store resume uploads securely and remove retained file storage for production.

## Features

- Upload resume in PDF or DOCX format
- Paste a job description to compare against
- Skill match chart with found vs missing skills
- Resume strength donut chart and status label
- Automatic extraction of technical, soft, and tool skills
- AI-driven suggestions when external services are available

## Installation

1. Clone the repository:

```bash
git clone <repo-url>
cd resume-analyzer
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your environment variables (do not commit this file):

```text
AI_SERVER_URL=http://127.0.0.1:8000
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

4. Start the server:

```bash
npm start
```

5. Open the app in your browser at `http://localhost:5000`

## Usage

- Upload a resume file using the upload widget
- Paste the job description into the textarea
- Click **Analyze Resume**
- Review the results on the dashboard

## Technical Architecture

- `server.js`: main backend server and current upload API
- `public/index.html`: frontend UI layout
- `public/script.js`: client-side behavior, fetch logic, chart rendering
- `public/style.css`: custom styling for overlay and charts
- `uploads/`: file storage area for test/development uploads
- `.env`: secrets and model config

## API Contract

### POST `/upload`

Request:
- `resume`: file upload (`.pdf` or `.docx`)
- `jobDescription`: text

Response:
- `technical_skills`
- `soft_skills`
- `tool_skills`
- `file_name`
- `extracted_text`
- `score`
- `found_skills`
- `required_skills`
- `missing_skills`
- `formatting_issues`
- `keyword_density`
- `resume_sections`
- `suggestions`
- `ats_readability`

## Current Notes

1. **Single backend entrypoint**
   - `server.js` is the main backend and serves both the API and frontend.
   - `index.js` is legacy code and is not used by `npm start`.

2. **Optional AI services**
   - Groq is used when `GROQ_API_KEY` starts with `gsk_`.
   - The Python AI server at `AI_SERVER_URL` is optional. The app still works with built-in scoring and fallback suggestions if it is not running.

3. **Sensitive data in `.env`**
   - `.env` currently contains an API key.
   - Do not commit `.env` to version control. Use `.env.example` as the safe template.

## Recommended Improvements

- Add `.gitignore` with `/uploads`, `.env`, and `node_modules`
- Consolidate the backend into a single entrypoint
- Add input size limits and stricter file validation
- Improve error messages on the frontend for backend failures
- Add tests for API behavior and skill extraction
- Add deployment instructions for production servers

## Future Enhancements

- Add authentication for user-specific resume history
- Support more resume file formats and better extraction
- Add server-side caching of parsed resumes
- Add keyword target weighting and scoring explanations
- Improve matching by using NLP sentence similarity rather than simple keyword regex

## Recommended Main File

Use `server.js` as the primary backend entrypoint for this project, and remove or archive `index.js` once you confirm `server.js` has all required functionality.

---

### Project Status

The project is finalized as a local Resume Analyzer prototype. It supports PDF/DOCX upload, job-description matching, ATS readability checks, fallback suggestions, optional Groq suggestions, and clear frontend error handling.
