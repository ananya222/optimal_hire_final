from flask import Blueprint, request, jsonify, send_file
import mysql.connector
import os
import logging
from functools import wraps
from contextlib import contextmanager
from werkzeug.utils import secure_filename
from datetime import datetime
import mimetypes
from resume_validators import get_validator

# Define the Blueprint
resume_bp = Blueprint('resume_bp', __name__)

logger = logging.getLogger(__name__)

# Configuration
UPLOAD_FOLDER = os.getenv('RESUME_UPLOAD_FOLDER', 'uploads/resumes')
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('PROFILE_DB_NAME', 'optimal_hire_profiles_db')
}

# Database configuration
@contextmanager
def get_db_connection():
    #Context manager for database connections
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
    #Decorator to standardize error handling
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
        except FileNotFoundError as e:
            logger.warning(f"File not found in {f.__name__}: {str(e)}")
            return jsonify({"error": "File not found"}), 404
        except Exception as e:
            logger.exception(f"Unexpected error in {f.__name__}: {str(e)}")
            return jsonify({"error": "An unexpected error occurred"}), 500
    return decorated_function

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_file_size(max_size=5*1024*1024):
    """Validate file size - safe version"""
    file_size = request.content_length
    
    # Fallback if header missing
    if file_size is None:
        file = request.files.get('resume')
        file_size = len(file.read())
        file.seek(0)
    
    if file_size > max_size:
        raise ValueError(f"File too large")
    
    return file_size



def format_timestamp(timestamp):
    #Convert timestamp to string for JSON compatibility
    return timestamp.strftime('%Y-%m-%d %H:%M:%S') if timestamp else None


# ==================== RESUME ENDPOINTS ====================

@resume_bp.route('/resume/<int:user_id>/upload', methods=['POST'])
@handle_errors
def upload_resume(user_id):
    """
    Upload or update candidate resume
    
    Request: multipart/form-data with 'resume' file
    Returns: 200 with file information
    """
    
    logger.info(f"Resume upload initiated for user_id: {user_id}")
    
    # Check if file is present
    if 'resume' not in request.files:
        raise ValueError("No file part in request")
    
    file = request.files['resume']
    
    if file.filename == '':
        raise ValueError("No file selected")
    
    # Validate file extension
    if not allowed_file(file.filename):
        raise ValueError(f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Validate file size
    '''file_size = validate_file_size(file)'''

    with get_db_connection() as (conn, cursor):
        # Verify profile exists
        verify_query = "SELECT id, resume_path FROM candidate_profiles WHERE user_id = %s"
        cursor.execute(verify_query, (user_id,))
        result = cursor.fetchone()
        if not result:
            raise ValueError(f"Candidate profile not found for user_id: {user_id}")
        
        # Delete old resume if exists
        old_resume_path = result['resume_path']
        if old_resume_path and os.path.exists(old_resume_path):
            try:
                os.remove(old_resume_path)
                logger.info(f"Deleted old resume: {old_resume_path}")
            except Exception as e:
                logger.warning(f"Could not delete old resume: {str(e)}")
        # Save new resume with sanitized filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        timestamp = datetime.now().timestamp()
        filename = secure_filename(f"user_{user_id}_resume_{timestamp}.{file_extension}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
    
        file.save(filepath)

        validator = get_validator(file_extension)
        print(validator)
        print(validator.is_valid(filepath))
        if not validator or not validator.is_valid(filepath):
            raise ValueError(f"File content does not match a valid {file_extension.upper()} file")
        
        # Update database with new resume path
        update_query = """
            UPDATE candidate_profiles 
            SET resume_path = %s, updated_at = %s 
            WHERE user_id = %s
        """
        cursor.execute(update_query, (filepath, datetime.now(), user_id))
        
        logger.info(f"Resume uploaded successfully for user_id: {user_id}, path: {filepath}")
        return jsonify({
            "message": "Resume uploaded successfully",
            "user_id": user_id,
            "resume_path": filepath,
            "file_size": 0,
            "file_name": filename,
            "uploaded_at": format_timestamp(datetime.now())
        }), 200


@resume_bp.route('/resume/<int:user_id>/preview', methods=['GET'])
@handle_errors
def preview_resume(user_id):
    """
    Preview/download resume file
    
    Returns: File stream or file information
    Query param: 'info_only=true' to get only metadata without downloading
    """
    logger.info(f"Resume preview requested for user_id: {user_id}")
    
    with get_db_connection() as (conn, cursor):
        query = """
            SELECT resume_path, updated_at 
            FROM candidate_profiles 
            WHERE user_id = %s
        """
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        
        if not result:
            raise ValueError(f"Candidate profile not found for user_id: {user_id}")
        
        resume_path = result['resume_path']
        
        if not resume_path:
            return jsonify({"error": "No resume uploaded for this candidate"}), 404
        
        if not os.path.exists(resume_path):
            logger.error(f"Resume file not found at path: {resume_path}")
            return jsonify({"error": "Resume file not found on server"}), 404
        
        # If info_only query parameter is set, return metadata only
        if request.args.get('info_only') == 'true':
            file_size = os.path.getsize(resume_path)
            logger.info(f"Resume info retrieved for user_id: {user_id}")
            return jsonify({
                "user_id": user_id,
                "resume_path": resume_path,
                "file_name": os.path.basename(resume_path),
                "file_size": file_size,
                "file_size_mb": round(file_size / (1024*1024), 2),
                "updated_at": format_timestamp(result['updated_at']),
                "file_type": os.path.splitext(resume_path)[1].lstrip('.')
            }), 200
        
        # Return the file for download
        try:
            logger.info(f"Serving resume file for user_id: {user_id}")
            return send_file(
                resume_path,
                as_attachment=True,
                download_name=os.path.basename(resume_path),
                mimetype=mimetypes.guess_type(resume_path)[0]
            )
        except FileNotFoundError:
            raise ValueError("Resume file not found")
