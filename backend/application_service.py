from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import os
from dotenv import load_dotenv
import logging
from functools import wraps
from contextlib import contextmanager
import requests

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Database configuration
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('APPLICATION_DB_NAME', 'optimal_hire_applications_db')
}

# job_service base URL, used to verify jobs exist and to keep number_of_applicants in sync
JOB_SERVICE_URL = os.getenv('JOB_SERVICE_URL', 'http://127.0.0.1:5003')

# Database connection context manager
@contextmanager
def get_db_connection():
    """Context manager for database connections"""
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

# Error handling decorator
def handle_errors(f):
    """Decorator to standardize error handling"""
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

# Validation helper
def validate_required_fields(data, required_fields):
    """Validate that all required fields are present in data"""
    if not data:
        raise ValueError("No data provided")

    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

# Valid ENUM values, mirrored from the schema
VALID_STATUSES = ('Applied', 'Under Review', 'Interview', 'Rejected', 'Hired')

def validate_status(data):
    """Validate the status field against its allowed values, if present"""
    if 'status' in data and data['status'] not in VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(VALID_STATUSES)}")

# Timestamp formatter
def format_timestamp(timestamp):
    """Convert timestamp to string for JSON compatibility"""
    return timestamp.strftime('%Y-%m-%d %H:%M:%S') if timestamp else None

def format_application(application):
    """Format an application row for JSON output (timestamps)"""
    application['applied_at'] = format_timestamp(application.get('applied_at'))
    application['updated_at'] = format_timestamp(application.get('updated_at'))
    return application

def adjust_applicant_count(job_id, delta):
    """
    Best-effort sync of jobs.number_of_applicants over in job_service.
    Failures here are logged but don't block the application operation itself,
    since job_service being down shouldn't stop a candidate from applying.
    """
    try:
        response = requests.get(f"{JOB_SERVICE_URL}/jobs/{job_id}", timeout=5)
        if not response.ok:
            logger.warning(f"Could not fetch job {job_id} to adjust applicant count")
            return
        job = response.json()
        current_count = job.get('number_of_applicants', 0) or 0
        new_count = max(0, current_count + delta)

        update_response = requests.put(
            f"{JOB_SERVICE_URL}/jobs/update/{job_id}",
            json={"number_of_applicants": new_count},
            timeout=5
        )
        if not update_response.ok:
            logger.warning(f"Failed to update applicant count for job {job_id}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Error syncing applicant count for job {job_id}: {e}")

def job_exists(job_id):
    """Check with job_service that the job being applied to actually exists"""
    try:
        response = requests.get(f"{JOB_SERVICE_URL}/jobs/{job_id}", timeout=5)
        return response.ok
    except requests.exceptions.RequestException as e:
        logger.error(f"Error checking job {job_id} existence: {e}")
        return False

@app.route('/applications/<int:application_id>', methods=['GET'])
@handle_errors
def get_application(application_id):
    """Get a single application by ID"""
    logger.info(f"Fetching application with ID: {application_id}")

    with get_db_connection() as (conn, cursor):
        query = "SELECT * FROM applications WHERE application_id = %s"
        cursor.execute(query, (application_id,))
        application = cursor.fetchone()

        if not application:
            logger.warning(f"Application not found: {application_id}")
            return jsonify({"error": "Application not found"}), 404

        logger.info(f"Successfully retrieved application: {application_id}")
        return jsonify(format_application(application)), 200

@app.route('/applications', methods=['GET'])
@handle_errors
def list_applications():
    """List applications, optionally filtered by user_id, job_id, or status"""
    user_id = request.args.get('user_id')
    job_id = request.args.get('job_id')
    status = request.args.get('status')

    logger.info("Fetching applications")

    with get_db_connection() as (conn, cursor):
        query = "SELECT * FROM applications WHERE 1=1"
        values = []

        if user_id:
            query += " AND user_id = %s"
            values.append(user_id)

        if job_id:
            query += " AND job_id = %s"
            values.append(job_id)

        if status:
            query += " AND status = %s"
            values.append(status)

        query += " ORDER BY applied_at DESC"

        cursor.execute(query, tuple(values))
        applications = cursor.fetchall()

        applications = [format_application(app_row) for app_row in applications]
        logger.info(f"Successfully retrieved {len(applications)} application(s)")
        return jsonify(applications), 200

@app.route('/applications', methods=['POST'])
@handle_errors
def create_application():
    """Create a new application (a candidate applying to a job)"""
    data = request.get_json()
    required_fields = ['user_id', 'job_id']
    validate_required_fields(data, required_fields)

    logger.info(f"Creating application: user_id={data['user_id']}, job_id={data['job_id']}")

    if not job_exists(data['job_id']):
        raise ValueError("Job not found")

    with get_db_connection() as (conn, cursor):
        query = """
            INSERT INTO applications (user_id, job_id, status)
            VALUES (%s, %s, %s)
        """
        values = (
            data['user_id'],
            data['job_id'],
            'Applied'
        )

        cursor.execute(query, values)
        new_application_id = cursor.lastrowid

    # Keep job_service's applicant count in sync (best-effort, outside the DB transaction)
    adjust_applicant_count(data['job_id'], 1)

    logger.info(f"Successfully created application: {new_application_id}")
    return jsonify({"message": "Application submitted successfully", "application_id": new_application_id}), 201

@app.route('/applications/update/<int:application_id>', methods=['PUT'])
@handle_errors
def update_application(application_id):
    """Update an application's status"""
    data = request.get_json()

    if not data:
        raise ValueError("No data provided")

    validate_status(data)

    logger.info(f"Update request for application ID: {application_id}")

    with get_db_connection() as (conn, cursor):
        verify_query = "SELECT application_id FROM applications WHERE application_id = %s"
        cursor.execute(verify_query, (application_id,))
        application = cursor.fetchone()

        if not application:
            logger.warning(f"Update failed - application not found: {application_id}")
            return jsonify({"error": "Application not found"}), 404

        if 'status' not in data:
            raise ValueError("No fields to update. Provide: status")

        update_query = "UPDATE applications SET status = %s WHERE application_id = %s"
        cursor.execute(update_query, (data['status'], application_id))

        logger.info(f"Successfully updated application: {application_id}")
        return jsonify({"message": "Application updated successfully"}), 200

@app.route('/applications/delete/<int:application_id>', methods=['DELETE'])
@handle_errors
def delete_application(application_id):
    """Delete (withdraw) an application"""
    logger.info(f"Delete request for application ID: {application_id}")

    with get_db_connection() as (conn, cursor):
        verify_query = "SELECT application_id, job_id FROM applications WHERE application_id = %s"
        cursor.execute(verify_query, (application_id,))
        application = cursor.fetchone()

        if not application:
            logger.warning(f"Delete failed - application not found: {application_id}")
            return jsonify({"error": "Application not found"}), 404

        delete_query = "DELETE FROM applications WHERE application_id = %s"
        cursor.execute(delete_query, (application_id,))

    # Keep job_service's applicant count in sync (best-effort, outside the DB transaction)
    adjust_applicant_count(application['job_id'], -1)

    logger.info(f"Successfully deleted application: {application_id}")
    return jsonify({"message": "Application deleted successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5004)