import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JOB_SERVICE_URL = 'http://127.0.0.1:5003';

// Schema note: jobs.role_type is ENUM('Full-time','Part-time') only.
// 'Contract' and 'Internship' shown in the mockup aren't supported by the DB yet.
const ROLE_TYPES = ['Full-time', 'Part-time'];
const WORK_MODES = ['Remote', 'On-Site', 'Hybrid'];
const SENIORITY_LEVELS = ['Entry', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Executive'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];

function CreateJobListing() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    workMode: 'Remote',
    roleType: 'Full-time',
    salaryOffered: '',
    currency: 'USD',
    seniorityLevel: 'Entry',
    skills: []
  });
  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const skill = skillInput.trim();
      if (skill && !formData.skills.includes(skill)) {
        setFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';
    if (!formData.jobDescription.trim()) newErrors.jobDescription = 'Job description is required';
    if (!formData.workMode) newErrors.workMode = 'Work mode is required';
    if (!formData.roleType) newErrors.roleType = 'Role type is required';
    if (!formData.seniorityLevel) newErrors.seniorityLevel = 'Seniority level is required';

    if (formData.salaryOffered && isNaN(Number(formData.salaryOffered))) {
      newErrors.salaryOffered = 'Salary must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user?.user_id;

      if (!userId) {
        setSubmitError('User not found. Please log in again.');
        setSubmitting(false);
        return;
      }

      const response = await fetch(`${JOB_SERVICE_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          job_title: formData.jobTitle,
          job_description: formData.jobDescription,
          work_mode: formData.workMode,
          role_type: formData.roleType,
          salary_offered: formData.salaryOffered ? Number(formData.salaryOffered) : null,
          currency: formData.currency,
          seniority_level: formData.seniorityLevel,
          skills_required: formData.skills
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.error || 'Failed to create job listing.');
        setSubmitting(false);
        return;
      }

      navigate('/employer-dashboard');
    } catch (err) {
      console.error('Error:', err);
      setSubmitError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  const inputStyle = (fieldName) => ({
    width: '100%',
    padding: '10px',
    border: `1px solid ${errors[fieldName] ? '#ef4444' : '#ddd'}`,
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box'
  });

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '14px',
    fontWeight: '500'
  };

  const sectionHeaderStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '12px',
    marginTop: '24px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '32px',
        width: '100%',
        maxWidth: '600px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
          Create New Job Listing
        </h2>

        {submitError && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            borderRadius: '6px', padding: '12px', fontSize: '13px', marginBottom: '16px'
          }}>
            {submitError}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Job Title</label>
          <input
            type="text"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleInputChange}
            placeholder="e.g. Content Writer"
            style={inputStyle('jobTitle')}
          />
          {errors.jobTitle && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.jobTitle}</p>}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Job Description</label>
          <textarea
            name="jobDescription"
            value={formData.jobDescription}
            onChange={handleInputChange}
            placeholder="Enter job responsibilities, requirements, and benefits..."
            style={{ ...inputStyle('jobDescription'), minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
          />
          {errors.jobDescription && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.jobDescription}</p>}
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Work Mode</label>
            <select name="workMode" value={formData.workMode} onChange={handleInputChange} style={inputStyle('workMode')}>
              {WORK_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Role Type</label>
            <select name="roleType" value={formData.roleType} onChange={handleInputChange} style={inputStyle('roleType')}>
              {ROLE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>

        <h3 style={sectionHeaderStyle}>Compensation &amp; Experience</h3>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Salary Offered</label>
            <input
              type="text"
              name="salaryOffered"
              value={formData.salaryOffered}
              onChange={handleInputChange}
              placeholder="e.g. 25000"
              style={inputStyle('salaryOffered')}
            />
            {errors.salaryOffered && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.salaryOffered}</p>}
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Currency</label>
            <select name="currency" value={formData.currency} onChange={handleInputChange} style={inputStyle('currency')}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Seniority Level</label>
            <select name="seniorityLevel" value={formData.seniorityLevel} onChange={handleInputChange} style={inputStyle('seniorityLevel')}>
              {SENIORITY_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
        </div>

        <h3 style={sectionHeaderStyle}>Requirements &amp; Tags</h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Skills Required</label>
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKeyDown}
            placeholder="Type a skill and press Enter"
            style={inputStyle('skills')}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {formData.skills.map(skill => (
              <span key={skill} style={{
                backgroundColor: '#e5e7eb', color: '#1f2937', borderRadius: '14px',
                padding: '4px 8px 4px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                {skill}
                <span
                  onClick={() => removeSkill(skill)}
                  style={{ cursor: 'pointer', fontWeight: 'bold', color: '#6b7280', lineHeight: 1 }}
                >
                  ×
                </span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/employer-dashboard')}
            style={{
              flex: 1, padding: '10px 16px', backgroundColor: '#f3f4f6', color: '#1f2937',
              border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1, padding: '10px 16px', backgroundColor: submitting ? '#93c5fd' : '#2563eb', color: 'white',
              border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
            onMouseOver={(e) => { if (!submitting) e.target.style.backgroundColor = '#1d4ed8'; }}
            onMouseOut={(e) => { if (!submitting) e.target.style.backgroundColor = '#2563eb'; }}
          >
            {submitting ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateJobListing;