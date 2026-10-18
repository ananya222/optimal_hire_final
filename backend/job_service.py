from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import json
import os
from dotenv import load_dotenv
import logging
from functools import wraps
from contextlib import contextmanager

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('JOB_DB_NAME', 'optimal_hire_jobs_db')
}

@contextmanager
def get_db_connection():
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        yield conn, cursor
        conn.commit()
    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {str(e)}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except mysql.connector.IntegrityError as e:
            logger.error(f"Integrity error in {f.__name__}: {str(e)}")
            return jsonify({"error": "Data integrity violation", "details": str(e)}), 409
        except mysql.connector.Error as e:
            logger.error(f"Database error in {f.__name__}: {str(e)}")
            return jsonify({"error": "Database error occurred"}), 500
        except ValueError as e:
            logger.warning(f"Validation error in {f.__name__}: {str(e)}")
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.exception(f"Unexpected error in {f.__name__}: {str(e)}")
            return jsonify({"error": "An unexpected error occurred"}), 500
    return decorated_function

def validate_required_fields(data, required_fields):
    if not data:
        raise ValueError("No data provided")

    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

VALID_WORK_MODES = ('Remote', 'On-Site', 'Hybrid')
VALID_ROLE_TYPES = ('Full-time', 'Part-time')
VALID_SENIORITY_LEVELS = ('Entry', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Executive')

def validate_enum_fields(data):
    if 'work_mode' in data and data['work_mode'] not in VALID_WORK_MODES:
        raise ValueError(f"work_mode must be one of: {', '.join(VALID_WORK_MODES)}")

    if 'role_type' in data and data['role_type'] not in VALID_ROLE_TYPES:
        raise ValueError(f"role_type must be one of: {', '.join(VALID_ROLE_TYPES)}")

    if 'seniority_level' in data and data['seniority_level'] not in VALID_SENIORITY_LEVELS:
        raise ValueError(f"seniority_level must be one of: {', '.join(VALID_SENIORITY_LEVELS)}")

def format_timestamp(timestamp):
    """Convert timestamp to string for JSON compatibility"""
    return timestamp.strftime('%Y-%m-%d %H:%M:%S') if timestamp else None

def format_job(job):
    """Format a job row for JSON output (timestamps, JSON fields)"""
    job['created_at'] = format_timestamp(job.get('created_at'))
    job['updated_at'] = format_timestamp(job.get('updated_at'))

    if job.get('skills_required') is not None and isinstance(job['skills_required'], str):
        try:
            job['skills_required'] = json.loads(job['skills_required'])
        except (TypeError, json.JSONDecodeError):
            pass

    return job

@app.route('/jobs/<int:job_id>', methods=['GET'])
@handle_errors
def get_job(job_id):
    logger.info(f"Fetching job with ID: {job_id}")

    with get_db_connection() as (conn, cursor):
        query = "SELECT * FROM jobs WHERE job_id = %s"
        cursor.execute(query, (job_id,))
        job = cursor.fetchone()

        if not job:
            logger.warning(f"Job not found: {job_id}")
            return jsonify({"error": "Job not found"}), 404

        logger.info(f"Successfully retrieved job: {job_id}")
        return jsonify(format_job(job)), 200

@app.route('/jobs', methods=['GET'])
@handle_errors
def list_jobs():
    user_id = request.args.get('user_id')
    work_mode = request.args.get('work_mode')
    role_type = request.args.get('role_type')
    seniority_level = request.args.get('seniority_level')

    logger.info("Fetching job listings")

    with get_db_connection() as (conn, cursor):
        query = "SELECT * FROM jobs WHERE 1=1"
        values = []

        if user_id:
            query += " AND user_id = %s"
            values.append(user_id)

        if work_mode:
            query += " AND work_mode = %s"
            values.append(work_mode)

        if role_type:
            query += " AND role_type = %s"
            values.append(role_type)

        if seniority_level:
            query += " AND seniority_level = %s"
            values.append(seniority_level)

        query += " ORDER BY created_at DESC"

        cursor.execute(query, tuple(values))
        jobs = cursor.fetchall()

        jobs = [format_job(job) for job in jobs]
        logger.info(f"Successfully retrieved {len(jobs)} job(s)")
        return jsonify(jobs), 200

@app.route('/jobs', methods=['POST'])
@handle_errors
def create_job():
    """Create a new job posting"""
    data = request.get_json()
    required_fields = ['user_id', 'job_title', 'job_description', 'work_mode', 'role_type', 'seniority_level']
    validate_required_fields(data, required_fields)
    validate_enum_fields(data)

    logger.info(f"Creating new job for user_id: {data['user_id']}")

    with get_db_connection() as (conn, cursor):
        query = """
            INSERT INTO jobs (
                user_id, job_title, job_description, work_mode, role_type,
                salary_offered, currency, seniority_level, skills_required
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            data['user_id'],
            data['job_title'],
            data['job_description'],
            data['work_mode'],
            data['role_type'],
            data.get('salary_offered'),
            data.get('currency', 'USD'),
            data['seniority_level'],
            json.dumps(data.get('skills_required')) if data.get('skills_required') is not None else None
        )

        cursor.execute(query, values)
        new_job_id = cursor.lastrowid

        logger.info(f"Successfully created job: {new_job_id}")
        return jsonify({"message": "Job created successfully", "job_id": new_job_id}), 201

@app.route('/jobs/update/<int:job_id>', methods=['PUT'])
@handle_errors
def update_job(job_id):
    """Update a job posting"""
    data = request.get_json()

    if not data:
        raise ValueError("No data provided")

    validate_enum_fields(data)

    logger.info(f"Update request for job ID: {job_id}")

    with get_db_connection() as (conn, cursor):
        verify_query = "SELECT job_id FROM jobs WHERE job_id = %s"
        cursor.execute(verify_query, (job_id,))
        job = cursor.fetchone()

        if not job:
            logger.warning(f"Update failed - job not found: {job_id}")
            return jsonify({"error": "Job not found"}), 404

        updatable_fields = [
            'job_title', 'job_description', 'work_mode', 'role_type',
            'salary_offered', 'currency', 'seniority_level',
            'number_of_applicants'
        ]

        update_fields = []
        update_values = []

        for field in updatable_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])

        if 'skills_required' in data:
            update_fields.append("skills_required = %s")
            update_values.append(json.dumps(data['skills_required']) if data['skills_required'] is not None else None)

        if not update_fields:
            raise ValueError(
                "No fields to update. Provide at least one of: job_title, job_description, "
                "work_mode, role_type, salary_offered, currency, seniority_level, "
                "skills_required, number_of_applicants"
            )

        update_values.append(job_id)
        update_query = f"UPDATE jobs SET {', '.join(update_fields)} WHERE job_id = %s"
        cursor.execute(update_query, tuple(update_values))

        logger.info(f"Successfully updated job: {job_id}")
        return jsonify({"message": "Job updated successfully"}), 200

@app.route('/jobs/delete/<int:job_id>', methods=['DELETE'])
@handle_errors
def delete_job(job_id):
    """Delete a job posting"""
    logger.info(f"Delete request for job ID: {job_id}")

    with get_db_connection() as (conn, cursor):
        verify_query = "SELECT job_id FROM jobs WHERE job_id = %s"
        cursor.execute(verify_query, (job_id,))
        job = cursor.fetchone()

        if not job:
            logger.warning(f"Delete failed - job not found: {job_id}")
            return jsonify({"error": "Job not found"}), 404

        delete_query = "DELETE FROM jobs WHERE job_id = %s"
        cursor.execute(delete_query, (job_id,))

        logger.info(f"Successfully deleted job: {job_id}")
        return jsonify({"message": "Job deleted successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5003)