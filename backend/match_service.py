from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
from pydantic import BaseModel
import torch
import torch.nn as nn
import torch.nn.functional as F
import os, json, logging
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
from transformers import BertTokenizer, BertModel
import requests
from sorting import quicksort_matches


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

MODEL_DIR = "/Users/ananya/development/optimal_hire/model/siamese_bert_model"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

with open(os.path.join(MODEL_DIR, "config.json")) as f:
    CONFIG = json.load(f)
MAX_LENGTH = CONFIG["max_length"]
tokenizer = BertTokenizer.from_pretrained(os.path.join(MODEL_DIR, "bert"))

class SiameseBERT(nn.Module):
    def __init__(self, bert_dir):
        super().__init__()
        self.bert = BertModel.from_pretrained(bert_dir)
        self.fc = nn.Linear(768, 128)

    def encode(self, ids, mask):
        output = self.bert(input_ids=ids, attention_mask=mask)
        hidden = output.last_hidden_state
        mask = mask.unsqueeze(-1).float()
        mean_emb = (hidden * mask).sum(dim=1) / mask.sum(dim=1)
        x = self.fc(mean_emb)
        return F.normalize(x, p=2, dim=1)

    def forward(self, jd_ids, jd_mask, res_ids, res_mask):
        jd_emb = self.encode(jd_ids, jd_mask)
        res_emb = self.encode(res_ids, res_mask)
        sim = (jd_emb * res_emb).sum(dim=1)
        return sim

model = SiameseBERT(os.path.join(MODEL_DIR, "bert"))
model.load_state_dict(torch.load(
    os.path.join(MODEL_DIR, "siamese_bert_weights.pt"),
    map_location=DEVICE
))
model.to(DEVICE)
model.eval()

def score_match(job_desc: str, resume: str) -> float:
    jd_tokens = tokenizer(job_desc, max_length=MAX_LENGTH, padding="max_length",
                          truncation=True, return_tensors="pt")
    res_tokens = tokenizer(resume, max_length=MAX_LENGTH, padding="max_length",
                           truncation=True, return_tensors="pt")
    jd_ids, jd_mask = jd_tokens["input_ids"].to(DEVICE), jd_tokens["attention_mask"].to(DEVICE)
    res_ids, res_mask = res_tokens["input_ids"].to(DEVICE), res_tokens["attention_mask"].to(DEVICE)

    with torch.no_grad():
        sim = model(jd_ids, jd_mask, res_ids, res_mask)
    return round((sim.item() + 1) / 2, 3)

JOB_SERVICE_URL = "http://127.0.0.1:5003"
APPLICATION_SERVICE_URL = "http://127.0.0.1:5004"
CANDIDATE_SERVICE_URL = "http://127.0.0.1:5001"

def get_job_by_id(job_id):
    """Fetch a single job (needs job_description) from job_service."""
    try:
        response = requests.get(f"{JOB_SERVICE_URL}/jobs/{job_id}", timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch job {job_id} from job_service: {e}")
        return None

def get_applicant_user_ids(job_id):
    """Fetch user_ids of everyone who applied to a job, from application_service."""
    try:
        response = requests.get(f"{APPLICATION_SERVICE_URL}/applications", params={"job_id": job_id}, timeout=5)
        response.raise_for_status()
        applications = response.json()
        return [app["user_id"] for app in applications if app.get("user_id") is not None]
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch applications for job {job_id}: {e}")
        return []

def get_candidate_professional_summary(user_id):
    """Fetch a candidate's professional_summary from the profile/candidate service."""
    try:
        response = requests.get(f"{CANDIDATE_SERVICE_URL}/api/profiles/candidate/{user_id}", timeout=5)
        response.raise_for_status()
        profile = response.json()
        return profile.get("professional_summary")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch candidate profile for user_id {user_id}: {e}")
        return None

def get_job_descriptions():
    """Fetch job_id + job_title + job_description from job_service instead of a hardcoded list."""
    try:
        response = requests.get(f"{JOB_SERVICE_URL}/jobs", timeout=5)
        response.raise_for_status()
        jobs = response.json()
        return [
            {"job_id": job["job_id"], "job_title": job["job_title"], "job_description": job["job_description"]}
            for job in jobs if job.get("job_description")
        ]
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch jobs from job_service: {e}")
        return []

JOBS = get_job_descriptions()

class JobInput(BaseModel):
    job_id: int

class ResumeInput(BaseModel):
    resume: str


@app.route("/score_resumes_for_job", methods=["POST"])
def score_resumes_for_job():
    """Given a job_id, score every candidate who applied to that job."""
    try:
        data = request.get_json()
        if not data or "job_id" not in data:
            return jsonify({"error": "Missing 'job_id' field"}), 400
        job_id = data["job_id"]

        job = get_job_by_id(job_id)
        if not job or not job.get("job_description"):
            return jsonify({"error": "Job not found"}), 404
        job_description = job["job_description"]

        user_ids = get_applicant_user_ids(job_id)
        print(user_ids)

        matches = []
        for user_id in user_ids:
            professional_summary = get_candidate_professional_summary(user_id)
            if not professional_summary:
                continue
            matches.append({
                "user_id": user_id,
                "professional_summary": professional_summary,
                "score": score_match(job_description, professional_summary)
            })
        matches = quicksort_matches(matches)
        return jsonify({
            "job_id": job_id,
            "matches": matches
        }), 200
    except Exception as e:
        logger.exception(f"Error in score_resumes_for_job: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route("/score_jobs_for_resume", methods=["POST"])
def score_jobs_for_resume():
    """Given a resume, return matching job descriptions."""
    try:
        data = request.get_json()
        if not data or "resume" not in data:
            return jsonify({"error": "Missing 'resume' field"}), 400
        resume_text = data["resume"]
        matches = [
            {"job_id": j["job_id"], "job_title": j["job_title"], "job_description": j["job_description"], "score": score_match(j["job_description"], resume_text)}
            for j in get_job_descriptions()
        ]
        matches = quicksort_matches(matches)
        return jsonify({
            "resume": resume_text,
            "matches": matches
        }), 200
    except Exception as e:
        logger.exception(f"Error in score_jobs_for_resume: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5002)