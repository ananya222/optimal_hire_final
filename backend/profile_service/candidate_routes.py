from flask import Blueprint, request, jsonify
import mysql.connector
import os
import json
from datetime import datetime
import logging
from functools import wraps
from contextlib import contextmanager

# Define the Blueprint
candidate_bp = Blueprint('candidate_bp', __name__)

logger = logging.getLogger(__name__)

db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('PROFILE_DB_NAME', 'optimal_hire_profiles_db')
}

# Database configuration (should ideally be in a shared utils.py file)
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

def validate_required_fields(data, required_fields):
    """Validate that all required fields are present in data"""
    if not data:
        raise ValueError("No data provided")
    
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

def validate_enum_field(value, allowed_values, field_name):
    """Validate enum field values"""
    if value and value not in allowed_values:
        raise ValueError(f"Invalid {field_name}. Must be one of: {', '.join(allowed_values)}")

def trigger_vectorization(user_id, profile_data):
    """
    Placeholder for triggering profile vectorization.
    Call your vector service/ML model here to generate profile_vector.
    Returns the vector or None if not ready.
    """
    logger.info(f"Vectorization triggered for user_id: {user_id}")
    # TODO: Integrate with your vectorization service
    return None






@candidate_bp.route('/candidate', methods=['POST'])
@handle_errors
def create_profile():
    #Create a new candidate profile
    data = request.get_json()
    required_fields = ['user_id', 'full_name', 'professional_summary']
    validate_required_fields(data, required_fields)
    
    user_id = data['user_id']
    logger.info(f"Creating profile for user_id: {user_id}")
    
    # Validate enum fields if provided
    if 'role_type' in data:
        validate_enum_field(data['role_type'], ['Full-time', 'Part-time'], 'role_type')
    if 'seniority_level' in data:
        validate_enum_field(data['seniority_level'], ['Entry', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Executive'], 'seniority_level')
    if 'work_mode' in data:
        validate_enum_field(data['work_mode'], ['Remote', 'On-Site', 'Hybrid'], 'work_mode')
    
    with get_db_connection() as (conn, cursor):
        # Prepare profile data
        skills = data.get('skills', [])
        if isinstance(skills, list):
            skills = json.dumps(skills)
        
        # Trigger vectorization
        profile_vector = trigger_vectorization(user_id, data)
        profile_vector_json = json.dumps(profile_vector) if profile_vector else None
        
        query = """
            INSERT INTO candidate_profiles 
            (user_id, full_name, headline, professional_summary, skills, role_type, 
             seniority_level, work_mode, min_salary, currency, years_experience, profile_vector, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        values = (
            user_id,
            data['full_name'],
            data.get('headline'),
            data['professional_summary'],
            skills,
            data.get('role_type'),
            data.get('seniority_level'),
            data.get('work_mode'),
            data.get('min_salary'),
            data.get('currency', 'USD'),
            data.get('years_experience', 0.0),
            profile_vector_json,
            datetime.now()
        )
        
        cursor.execute(query, values)
        logger.info(f"Profile created successfully for candidate user_id: {user_id}")
        return jsonify({"message": "Profile created successfully", "user_id": user_id}), 201



@candidate_bp.route('/candidate/<int:user_id>', methods=['GET'])
@handle_errors
def get_profile(user_id):
    """Fetch candidate profile by user_id"""
    logger.info(f"Fetching profile for user_id: {user_id}")
    
    with get_db_connection() as (conn, cursor):
        query = """
            SELECT id, user_id, full_name, headline, professional_summary, skills, 
                   resume_path, role_type, seniority_level, work_mode, min_salary, 
                   currency, years_experience, profile_vector, updated_at
            FROM candidate_profiles
            WHERE user_id = %s
        """
        cursor.execute(query, (user_id,))
        profile = cursor.fetchone()
        
        if not profile:
            logger.warning(f"Profile not found for user_id: {user_id}")
            return jsonify({"error": "Profile not found"}), 404
        
        # Parse JSON fields
        profile['skills'] = json.loads(profile['skills']) if profile['skills'] else []
        profile['profile_vector'] = json.loads(profile['profile_vector']) if profile['profile_vector'] else None
        
        logger.info(f"Successfully retrieved profile for user_id: {user_id}")
        return jsonify(profile), 200

@candidate_bp.route('/candidate/<int:user_id>', methods=['PUT'])
@handle_errors
def update_profile(user_id):
    """Update candidate profile"""
    data = request.get_json()

    if not data:
        raise ValueError("No data provided")
    
    logger.info(f"Updating profile for user_id: {user_id}")
    
    # Validate enum fields if provided
    if 'role_type' in data:
        validate_enum_field(data['role_type'], ['Full-time', 'Part-time'], 'role_type')
    if 'seniority_level' in data:
        validate_enum_field(data['seniority_level'], ['Entry', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Executive'], 'seniority_level')
    if 'work_mode' in data:
        validate_enum_field(data['work_mode'], ['Remote', 'On-Site', 'Hybrid'], 'work_mode')
    
    with get_db_connection() as (conn, cursor):
        # Verify profile exists
        verify_query = "SELECT id FROM candidate_profiles WHERE user_id = %s"
        cursor.execute(verify_query, (user_id,))
        if not cursor.fetchone():
            raise ValueError(f"Profile not found for user_id: {user_id}")
        
        # Build dynamic update query
        update_fields = []
        update_values = []
        
        if 'full_name' in data:
            update_fields.append("full_name = %s")
            update_values.append(data['full_name'])
        
        if 'headline' in data:
            update_fields.append("headline = %s")
            update_values.append(data['headline'])
        
        if 'professional_summary' in data:
            update_fields.append("professional_summary = %s")
            update_values.append(data['professional_summary'])
        
        if 'skills' in data:
            skills = data['skills']
            if isinstance(skills, list):
                skills = json.dumps(skills)
            update_fields.append("skills = %s")
            update_values.append(skills)
        
        if 'role_type' in data:
            update_fields.append("role_type = %s")
            update_values.append(data['role_type'])
        
        if 'seniority_level' in data:
            update_fields.append("seniority_level = %s")
            update_values.append(data['seniority_level'])
        
        if 'work_mode' in data:
            update_fields.append("work_mode = %s")
            update_values.append(data['work_mode'])
        
        if 'min_salary' in data:
            update_fields.append("min_salary = %s")
            update_values.append(data['min_salary'])
        
        if 'currency' in data:
            update_fields.append("currency = %s")
            update_values.append(data['currency'])
        
        if 'years_experience' in data:
            update_fields.append("years_experience = %s")
            update_values.append(data['years_experience'])
        
        if not update_fields:
            raise ValueError("No valid fields to update")
        
        # If text fields changed, trigger re-vectorization
        text_fields_changed = any(field in data for field in 
                                 ['professional_summary', 'headline', 'skills'])
        if text_fields_changed:
            profile_vector = trigger_vectorization(user_id, data)
            if profile_vector:
                update_fields.append("profile_vector = %s")
                update_values.append(json.dumps(profile_vector))
        
        # Add timestamp
        update_fields.append("updated_at = %s")
        update_values.append(datetime.now())
        
        update_values.append(user_id)
        update_query = f"UPDATE candidate_profiles SET {', '.join(update_fields)} WHERE user_id = %s"
        cursor.execute(update_query, tuple(update_values))
        
        logger.info(f"Successfully updated profile for user_id: {user_id}")
        return jsonify({"message": "Profile updated successfully"}), 200
