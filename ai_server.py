from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import re

app = FastAPI()

# ✅ LOAD MODEL ONLY ONCE
model = SentenceTransformer('all-MiniLM-L6-v2')

class ResumeRequest(BaseModel):
    resume_text: str
    job_description: str


def normalize(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s+.#]', ' ', text)
    return text


skills_db = [
    "python", "java", "c++", "machine learning",
    "deep learning", "sql", "mongodb", "aws",
    "docker", "react", "node js", "javascript",
    "html", "css", "tensorflow", "pytorch",
    "pandas", "numpy", "excel", "power bi"
]


def analyze_resume(resume_text, job_description):

    resume_text = normalize(resume_text)
    job_description = normalize(job_description)

    resume_skills = []
    job_skills = []

    # Extract resume skills
    for skill in skills_db:
        if skill.lower() in resume_text:
            resume_skills.append(skill)

    # Extract job skills
    for skill in skills_db:
        if skill.lower() in job_description:
            job_skills.append(skill)

    # Missing skills
    missing_skills = list(set(job_skills) - set(resume_skills))

    # Suggestions
    suggestions = []

    if missing_skills:
        suggestions.append(
            "Add these skills: " + ", ".join(missing_skills[:5])
        )

    if len(resume_skills) < 3:
        suggestions.append(
            "Add more technical skills to improve ATS score"
        )

    suggestions.append(
        "Add measurable achievements and projects"
    )

    suggestions.append(
        "Use action verbs like developed, optimized, built"
    )

    return missing_skills, suggestions


@app.post("/analyze")
def analyze(data: ResumeRequest):

    embeddings = model.encode([
        data.resume_text,
        data.job_description
    ])

    similarity = cosine_similarity(
        [embeddings[0]],
        [embeddings[1]]
    )[0][0]

    score = float(round(similarity * 100, 2))

    missing_skills, suggestions = analyze_resume(
        data.resume_text,
        data.job_description
    )

    return {
        "score": score,
        "missing_skills": missing_skills,
        "suggestions": suggestions
    }