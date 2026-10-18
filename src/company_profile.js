import { useState } from 'react';

function CompanyProfile() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    industry: 'Tech',
    location: '',
    website: '',
    companyBio: ''
  });
  const [errors, setErrors] = useState({});

  const totalSteps = 2;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (currentStep === 1) {
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!formData.industry) newErrors.industry = 'Industry is required';
      if (!formData.companyBio.trim()) newErrors.companyBio = 'Company bio is required';
    }
    
    if (currentStep === 2) {
      if (formData.website && !isValidUrl(formData.website)) {
        newErrors.website = 'Please enter a valid URL (e.g., https://example.com)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
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

        const response = await fetch('http://127.0.0.1:5001/api/profiles/company', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            company_name: formData.companyName,
            industry: formData.industry,
            location: formData.location,
            website: formData.website,
            company_bio: formData.companyBio
          })
        });

        const data = await response.json();

        if (!response.ok) {
          alert(`Error: ${data.error}`);
          return;
        }
        window.location.href = '/employer-dashboard';
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
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Your company name"
                style={inputStyle('companyName')}
              />
              {errors.companyName && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.companyName}</p>}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Industry
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                style={inputStyle('industry')}
              >
                <option value="Tech">Tech</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Retail">Retail</option>
                <option value="Other">Other</option>
              </select>
              {errors.industry && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.industry}</p>}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Company Bio
              </label>
              <textarea
                name="companyBio"
                value={formData.companyBio}
                onChange={handleInputChange}
                placeholder="Tell us about your company, mission, and values..."
                style={{
                  ...inputStyle('companyBio'),
                  minHeight: '100px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {formData.companyBio.length} / 1000 characters
              </div>
              {errors.companyBio && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.companyBio}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Location (Optional)
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, State / Country"
                style={inputStyle('location')}
              />
              {errors.location && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.location}</p>}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Website (Optional)
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://example.com"
                style={inputStyle('website')}
              />
              {errors.website && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.website}</p>}
            </div>

            {/* Review Section */}
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '6px', padding: '16px', marginTop: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>Profile Summary</h3>
              <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#374151' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#6b7280' }}>Company: </span>
                  <span>{formData.companyName}</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#6b7280' }}>Industry: </span>
                  <span>{formData.industry}</span>
                </div>
                {formData.location && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#6b7280' }}>Location: </span>
                    <span>{formData.location}</span>
                  </div>
                )}
                {formData.website && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#6b7280' }}>Website: </span>
                    <span>{formData.website}</span>
                  </div>
                )}
                <div>
                  <span style={{ fontWeight: '600', color: '#6b7280' }}>Bio: </span>
                  <span>{formData.companyBio}</span>
                </div>
              </div>
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
          Build Your Company Profile
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

export default CompanyProfile;