from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
import logging
from functools import wraps
from contextlib import contextmanager

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
    'database': os.getenv('DB_NAME', 'optimal_hire_profiles_db')
}

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

# Timestamp formatter
def format_timestamp(timestamp):
    """Convert timestamp to string for JSON compatibility"""
    return timestamp.strftime('%Y-%m-%d %H:%M:%S') if timestamp else None

@app.route('/users/<int:user_id>', methods=['GET'])
@handle_errors
def get_user(user_id):
    """Get user by ID"""
    logger.info(f"Fetching user with ID: {user_id}")
    
    with get_db_connection() as (conn, cursor):
        query = "SELECT user_id, role, first_name, last_name, email_id, created_at FROM users WHERE user_id = %s"
        cursor.execute(query, (user_id,))
        user = cursor.fetchone()
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
        
        user['created_at'] = format_timestamp(user['created_at'])
        logger.info(f"Successfully retrieved user: {user_id}")
        return jsonify(user), 200

@app.route('/login', methods=['POST'])
@handle_errors
def login_user():
    #Authenticate user login
    data = request.get_json()
    validate_required_fields(data, ['email_id', 'password'])
    
    logger.info(f"Login attempt for email: {data['email_id']}")
    
    with get_db_connection() as (conn, cursor):
        query = """
            SELECT user_id, role, first_name, last_name, email_id, password_hash, created_at 
            FROM users 
            WHERE email_id = %s
        """
        cursor.execute(query, (data['email_id'],))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password_hash'], data['password']):
            logger.warning(f"Failed login attempt for email: {data['email_id']}")
            return jsonify({"error": "Invalid email or password"}), 401
        
        user.pop('password_hash', None)
        user['created_at'] = format_timestamp(user['created_at'])
        
        logger.info(f"Successful login for user: {user['user_id']}")
        return jsonify({"message": "Login successful", "user": user}), 200

@app.route('/users', methods=['POST'])
@handle_errors
def create_user():
    """Create a new user"""
    data = request.get_json()
    required_fields = ['role', 'first_name', 'last_name', 'email_id', 'password']
    validate_required_fields(data, required_fields)
    
    logger.info(f"Creating new user with email: {data['email_id']}")
    
    with get_db_connection() as (conn, cursor):
        hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')
        
        query = """
            INSERT INTO users (role, first_name, last_name, email_id, password_hash, created_at) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        values = (
            data['role'],
            data['first_name'],
            data['last_name'],
            data['email_id'],
            hashed_password,
            datetime.now()
        )
        
        cursor.execute(query, values)
        logger.info(f"Successfully created user: {data['email_id']}")
        return jsonify({"message": "User created successfully"}), 201

@app.route('/users/delete', methods=['DELETE'])
@handle_errors
def delete_user():
    """Delete a user after authentication"""
    data = request.get_json()
    validate_required_fields(data, ['email_id', 'password'])
    
    logger.info(f"Delete request for email: {data['email_id']}")
    
    with get_db_connection() as (conn, cursor):
        verify_query = "SELECT user_id, password_hash FROM users WHERE email_id = %s"
        cursor.execute(verify_query, (data['email_id'],))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password_hash'], data['password']):
            logger.warning(f"Failed delete attempt - invalid credentials: {data['email_id']}")
            return jsonify({"error": "Invalid email or password"}), 401
        
        delete_query = "DELETE FROM users WHERE user_id = %s"
        cursor.execute(delete_query, (user['user_id'],))
        
        logger.info(f"Successfully deleted user: {data['email_id']}")
        return jsonify({"message": "User deleted successfully"}), 200

@app.route('/users/update/<int:user_id>', methods=['PUT'])
@handle_errors
def update_user(user_id):
    """Update user information"""
    data = request.get_json()
    
    if not data:
        raise ValueError("No data provided")
    
    logger.info(f"Update request for user ID: {user_id}")
    
    with get_db_connection() as (conn, cursor):
        verify_query = "SELECT user_id FROM users WHERE user_id = %s"
        cursor.execute(verify_query, (user_id,))
        user = cursor.fetchone()
        
        if not user:
            logger.warning(f"Update failed - user not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
        
        # Build dynamic update query
        update_fields = []
        update_values = []
        
        if 'first_name' in data:
            update_fields.append("first_name = %s")
            update_values.append(data['first_name'])
        
        if 'last_name' in data:
            update_fields.append("last_name = %s")
            update_values.append(data['last_name'])
        
        if 'password' in data:
            update_fields.append("password_hash = %s")
            update_values.append(generate_password_hash(data['password']))
        
        if not update_fields:
            raise ValueError("No fields to update. Provide at least one of: first_name, last_name, password")
        
        update_values.append(user_id)
        update_query = f"UPDATE users SET {', '.join(update_fields)} WHERE user_id = %s"
        cursor.execute(update_query, tuple(update_values))
        
        logger.info(f"Successfully updated user: {user_id}")
        return jsonify({"message": "User updated successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True)