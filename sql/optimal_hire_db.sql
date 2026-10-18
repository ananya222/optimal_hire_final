database: optimal_hire_db

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('job_seeker', 'employer') NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email_id VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



database: optimal_hire_profiles_db

CREATE TABLE candidate_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    headline VARCHAR(150),
    professional_summary TEXT NOT NULL,
    skills JSON,
    resume_path VARCHAR(500),
    role_type ENUM('Full-time', 'Part-time'),
    seniority_level ENUM('Entry', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Executive'),
    work_mode ENUM('Remote', 'On-Site', 'Hybrid'),
    min_salary INT,
    currency VARCHAR(10) DEFAULT 'USD',
    years_experience DECIMAL(3, 1) DEFAULT 0.0,
    profile_vector JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
);


CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    industry ENUM('Tech', 'Finance', 'Healthcare', 'Education', 'Retail', 'Other') NOT NULL,
    location VARCHAR(255),
    website VARCHAR(255),
    company_bio TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);





database: optimal_hire_jobs_db

CREATE TABLE jobs (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    work_mode ENUM('Remote', 'On-Site', 'Hybrid') NOT NULL,
    role_type ENUM('Full-time', 'Part-time') NOT NULL,
    salary_offered INT,
    currency VARCHAR(10) DEFAULT 'USD',
    seniority_level ENUM('Entry', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Executive') NOT NULL,
    skills_required JSON,
    number_of_applicants INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id)
);





database: optimal_hire_applications_db

CREATE TABLE applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    job_id INT NOT NULL,
    status ENUM('Applied', 'Under Review', 'Interview', 'Rejected', 'Hired') DEFAULT 'Applied',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_application (user_id, job_id),
    INDEX idx_user_id (user_id),
    INDEX idx_job_id (job_id)
);