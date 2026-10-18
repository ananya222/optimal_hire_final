import { useState } from 'react';

function CandidateProfileForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    professionalSummary: '',
    skills: [],
    skillInput: '',
    headline: '',
    roleType: 'Full-time',
    seniority: 'Mid-Level',
    workMode: ['Remote'],
    minSalary: '',
    currency: 'USD',
    yearsExperience: '',
    resume: null
  });
  const [errors, setErrors] = useState({});

  const totalSteps = 5;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSkillAdd = () => {
    if (formData.skillInput.trim()) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, formData.skillInput.trim()],
        skillInput: ''
      }));
    }
  };

  const handleSkillRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const handleWorkModeChange = (mode) => {
    setFormData(prev => ({
      ...prev,
      workMode: prev.workMode.includes(mode)
        ? prev.workMode.filter(m => m !== mode)
        : [...prev.workMode, mode]
    }));
  };

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, resume: file }));
    }
  };

  const handleRemoveResume = () => {
    setFormData(prev => ({ ...prev, resume: null }));
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (currentStep === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!formData.professionalSummary.trim()) newErrors.professionalSummary = 'Professional summary is required';
      if (formData.skills.length === 0) newErrors.skills = 'Add at least one skill';
    }
    
    if (currentStep === 2) {
      if (!formData.resume) newErrors.resume = 'Resume is required';
    }
    
    if (currentStep === 3) {
      if (!formData.minSalary) newErrors.minSalary = 'Minimum salary is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    if (validateStep()) {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const userId = user?.user_id;
  
        if (!userId) {
          alert('User not found. Please log in again.');
          return;
        }
  
        // Check if a profile already exists for this user (e.g. from a
        // previous attempt where resume upload failed after profile creation)
        const existingProfileCheck = await fetch(`http://127.0.0.1:5001/api/profiles/candidate/${userId}`);
        const profileExists = existingProfileCheck.ok;
  
        const profilePayload = {
          full_name: formData.fullName,
          headline: formData.headline,
          professional_summary: formData.professionalSummary,
          skills: formData.skills,
          role_type: formData.roleType,
          seniority_level: formData.seniority,
          work_mode: formData.workMode[0],
          min_salary: parseInt(formData.minSalary),
          currency: formData.currency,
          years_experience: parseFloat(formData.yearsExperience) || 0
        };
  
        const profileResponse = await fetch(
          `http://127.0.0.1:5001/api/profiles/candidate${profileExists ? '/' + userId : ''}`,
          {
            method: profileExists ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileExists ? profilePayload : { user_id: userId, ...profilePayload })
          }
        );
  
        const profileData = await profileResponse.json();
  
        if (!profileResponse.ok) {
          alert(`Error: ${profileData.error}`);
          return;
        }
  
        if (formData.resume) {
          const resumeFormData = new FormData();
          resumeFormData.append('resume', formData.resume);
  
          const resumeResponse = await fetch(
            `http://127.0.0.1:5001/api/profiles/resume/${userId}/upload`,
            { method: 'POST', body: resumeFormData }
          );
  
          if (!resumeResponse.ok) {
            const resumeData = await resumeResponse.json().catch(() => ({}));
            alert(`Resume upload failed: ${resumeData.error || 'Unknown error'}`);
            return;
          }
        }
  
        localStorage.setItem('candidate_summary', formData.professionalSummary);
        window.location.href = '/candidate-search';
  
      } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
      }
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Your full name"
                style={inputStyle('fullName')}
              />
              {errors.fullName && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.fullName}</p>}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Professional Summary
              </label>
              <textarea
                name="professionalSummary"
                value={formData.professionalSummary}
                onChange={handleInputChange}
                placeholder="Share your career story, expertise, and aspirations..."
                style={{
                  ...inputStyle('professionalSummary'),
                  minHeight: '100px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {formData.professionalSummary.length} / 500 words
              </div>
              {errors.professionalSummary && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.professionalSummary}</p>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Top Skills & Technologies
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={formData.skillInput}
                  onChange={(e) => setFormData(prev => ({ ...prev, skillInput: e.target.value }))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSkillAdd();
                    }
                  }}
                  placeholder="Add skill..."
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  onClick={handleSkillAdd}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                >
                  Add
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {formData.skills.map((skill, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {skill}
                    <button
                      onClick={() => handleSkillRemove(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        color: '#1e40af',
                        padding: '0'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {errors.skills && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>{errors.skills}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <div
              style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                marginBottom: '16px'
              }}
            >
              {!formData.resume ? (
                <>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>☁️</div>
                  <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                    Drag & Drop PDF or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    style={{ display: 'none' }}
                    id="resume-input"
                  />
                  <button
                    onClick={() => document.getElementById('resume-input').click()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                  >
                    Browse Files
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
                  <p style={{ color: '#111827', fontWeight: '500', marginBottom: '12px', fontSize: '14px' }}>
                    {formData.resume.name}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={handleRemoveResume}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => document.getElementById('resume-input').click()}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Replace
                    </button>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    style={{ display: 'none' }}
                    id="resume-input"
                  />
                </>
              )}
            </div>

            <p style={{ color: '#6b7280', fontSize: '12px' }}>
              PDFs only. Max 5MB
            </p>
            {errors.resume && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.resume}</p>}
          </div>
        );

      case 3:
        return (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Role Type
              </label>
              <select
                name="roleType"
                value={formData.roleType}
                onChange={handleInputChange}
                style={inputStyle('roleType')}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Seniority Level
              </label>
              <select
                name="seniority"
                value={formData.seniority}
                onChange={handleInputChange}
                style={inputStyle('seniority')}
              >
                <option value="Entry">Entry</option>
                <option value="Junior">Junior</option>
                <option value="Mid-Level">Mid-Level</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
                <option value="Executive">Executive</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Work Mode
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Remote', 'Hybrid', 'On-Site'].map(mode => (
                  <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={formData.workMode.includes(mode)}
                      onChange={() => handleWorkModeChange(mode)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    {mode}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Minimum Salary Expectation
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  name="minSalary"
                  value={formData.minSalary}
                  onChange={handleInputChange}
                  placeholder="75000"
                  style={{
                    flex: 1,
                    ...inputStyle('minSalary')
                  }}
                />
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="USD">USD/Year</option>
                  <option value="EUR">EUR/Year</option>
                  <option value="INR">INR/Year</option>
                  <option value="GBP">GBP/Year</option>
                </select>
              </div>
              {errors.minSalary && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.minSalary}</p>}
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Professional Headline (Optional)
              </label>
              <input
                type="text"
                name="headline"
                value={formData.headline}
                onChange={handleInputChange}
                placeholder="E.g., Senior Software Engineer"
                style={inputStyle('headline')}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Years of Experience (Optional)
              </label>
              <input
                type="number"
                name="yearsExperience"
                value={formData.yearsExperience}
                onChange={handleInputChange}
                placeholder="5.5"
                step="0.5"
                min="0"
                style={inputStyle('yearsExperience')}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '6px', padding: '16px', fontSize: '13px', lineHeight: '1.8' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>Name: </span>
                <span>{formData.fullName}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>Summary: </span>
                <span>{formData.professionalSummary}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>Skills: </span>
                <span>{formData.skills.join(', ')}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>Role: </span>
                <span>{formData.roleType}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>Seniority: </span>
                <span>{formData.seniority}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>Work Mode: </span>
                <span>{formData.workMode.join(', ')}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>Salary: </span>
                <span>${formData.minSalary} {formData.currency}/Year</span>
              </div>
              {formData.resume && (
                <div>
                  <span style={{ fontWeight: '600', color: '#6b7280' }}>Resume: </span>
                  <span>📄 {formData.resume.name}</span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
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
        maxWidth: '500px'
      }}>
        {/* Progress Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Progress:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: i < currentStep ? '#2563eb' : i === currentStep - 1 ? '#2563eb' : '#d1d5db',
                  cursor: 'pointer'
                }}
                onClick={() => setCurrentStep(i + 1)}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '6px' }}>
            {Math.round((currentStep / totalSteps) * 100)}%
          </span>
        </div>

        {/* Title */}
        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
          Build Your Profile
        </h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
          Step {currentStep} of {totalSteps}
        </p>

        {/* Form Content */}
        <div style={{ marginBottom: '24px', minHeight: '350px' }}>
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#f3f4f6',
              color: currentStep === 1 ? '#9ca3af' : '#1f2937',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Back
          </button>

          <button
            onClick={currentStep === totalSteps ? handleSubmit : handleNext}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            {currentStep === totalSteps ? 'Complete Profile' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CandidateProfileForm;