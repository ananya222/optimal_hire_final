from flask import Blueprint, request, jsonify
import mysql.connector
import os
import json
from datetime import datetime
import logging
from functools import wraps
from contextlib import contextmanager

# Define the Blueprint
company_bp = Blueprint('company_bp', __name__)

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






@company_bp.route('/company', methods=['POST'])
@handle_errors
def create_profile():
    #Create a new company profile

    data = request.get_json()
    
    required_fields = ['company_name', 'industry', 'company_bio']
    validate_required_fields(data, required_fields)
    
    user_id = data['user_id']
    logger.info(f"Creating profile for user_id: {user_id}")

    # Validate enum fields
    validate_enum_field(data['industry'], ['Tech', 'Finance', 'Healthcare', 'Education', 'Retail', 'Other'], 'industry')

    with get_db_connection() as (conn, cursor):
        # Prepare profile data

        query = """
            INSERT INTO companies 
            (user_id, company_name, industry, location, website, company_bio, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            user_id,
            data.get('company_name'),
            data.get('industry'),
            data.get('location'),
            data.get('website'),
            data.get('company_bio'),
            datetime.now()
        )

        cursor.execute(query, values)
        logger.info(f"Profile created successfully for company user_id: {user_id}")
        return jsonify({"message": "Profile created successfully", "user_id": user_id}), 201


@company_bp.route('/company/<int:user_id>', methods=['GET'])
@handle_errors
def get_profile(user_id):
    #Fetch company profile by user_id
    logger.info(f"Fetching profile for user_id: {user_id}")
    
    with get_db_connection() as (conn, cursor):
        query = """
            SELECT user_id, company_name, industry, location, website, company_bio, updated_at
            FROM companies
            WHERE user_id = %s
        """
        cursor.execute(query, (user_id,))
        profile = cursor.fetchone()
        
        if not profile:
            logger.warning(f"Profile not found for user_id: {user_id}")
            return jsonify({"error": "Profile not found"}), 404
        
        logger.info(f"Successfully retrieved profile for user_id: {user_id}")
        return jsonify(profile), 200


@company_bp.route('/company/<int:user_id>', methods=['PUT'])
@handle_errors
def update_profile(user_id):
    #Update candidate profile
    data = request.get_json()

    if not data:
        raise ValueError("No data provided")
    
    logger.info(f"Updating profile for user_id: {user_id}")
    
    # Validate enum fields if provided
    if 'industry' in data:
        validate_enum_field(data['industry'], ['Tech', 'Finance', 'Healthcare', 'Education', 'Retail', 'Other'], 'industry')
    
    with get_db_connection() as (conn, cursor):
        # Verify profile exists
        verify_query = "SELECT id FROM companies WHERE user_id = %s"
        cursor.execute(verify_query, (user_id,))
        if not cursor.fetchone():
            raise ValueError(f"Profile not found for user_id: {user_id}")
        
        # Build dynamic update query
        update_fields = []
        update_values = []
        
        if 'company_name' in data:
            update_fields.append("company_name = %s")
            update_values.append(data['company_name'])

        if 'industry' in data:
            update_fields.append("industry = %s")
            update_values.append(data['industry'])

        if 'location' in data:
            update_fields.append("location = %s")
            update_values.append(data['location'])
        
        if 'website' in data:
            update_fields.append("website = %s")
            update_values.append(data['website'])
        
        if 'company_bio' in data:
            update_fields.append("company_bio = %s")
            update_values.append(data['company_bio'])
        
        if not update_fields:
            raise ValueError("No valid fields to update")
        
        # Add timestamp
        update_fields.append("updated_at = %s")
        update_values.append(datetime.now())
        
        update_values.append(user_id)
        update_query = f"UPDATE companies SET {', '.join(update_fields)} WHERE user_id = %s"
        cursor.execute(update_query, tuple(update_values))
        
        logger.info(f"Successfully updated profile for user_id: {user_id}")
        return jsonify({"message": "Profile updated successfully"}), 200
