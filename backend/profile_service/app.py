from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv
from candidate_routes import candidate_bp
from company_routes import company_bp
from resume_routes import resume_bp

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['UPLOAD_FOLDER'] = 'uploads/resumes'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

app.register_blueprint(candidate_bp, url_prefix='/api/profiles')
app.register_blueprint(company_bp, url_prefix='/api/profiles')
app.register_blueprint(resume_bp, url_prefix='/api/profiles')

@app.route('/')
def health_check():
    return {"status": "Profile Service is running"}, 200

if __name__ == '__main__':
    app.run(debug=True, port=5001)