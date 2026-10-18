import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const JOB_SERVICE_URL = 'http://127.0.0.1:5003';

// Schema note: jobs.role_type is ENUM('Full-time','Part-time') only.
const ROLE_TYPES = ['Full-time', 'Part-time'];
const WORK_MODES = ['Remote', 'On-Site', 'Hybrid'];
const SENIORITY_LEVELS = ['Entry', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Executive'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];

const labelStyle = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '14px',
  fontWeight: '500'
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box'
};

const buttonBaseStyle = {
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '500',
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

function EditJobListing() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editingField, setEditingField] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [draftSkills, setDraftSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const fetchJob = async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response = await fetch(`${JOB_SERVICE_URL}/jobs/${jobId}`);
      const data = await response.json();

      if (!response.ok) {
        setLoadError(data.error || 'Failed to load job listing.');
        return;
      }

      setJob(data);
    } catch (err) {
      console.error('Error:', err);
      setLoadError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (field) => {
    setFieldError('');
    setEditingField(field);
    if (field === 'skills_required') {
      setDraftSkills(Array.isArray(job.skills_required) ? [...job.skills_required] : []);
      setSkillInput('');
    } else {
      setDraftValue(job[field] ?? '');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setFieldError('');
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const skill = skillInput.trim();
      if (skill && !draftSkills.includes(skill)) {
        setDraftSkills(prev => [...prev, skill]);
      }
      setSkillInput('');
    }
  };

  const removeDraftSkill = (skill) => {
    setDraftSkills(prev => prev.filter(s => s !== skill));
  };

  const saveField = async (field) => {
    setFieldError('');

    let payload = {};
    if (field === 'skills_required') {
      payload = { skills_required: draftSkills };
    } else if (field === 'salary_offered') {
      if (draftValue !== '' && isNaN(Number(draftValue))) {
        setFieldError('Salary must be a number');
        return;
      }
      payload = { salary_offered: draftValue === '' ? null : Number(draftValue) };
    } else if (field === 'job_title' && !draftValue.trim()) {
      setFieldError('Job title cannot be empty');
      return;
    } else if (field === 'job_description' && !draftValue.trim()) {
      setFieldError('Job description cannot be empty');
      return;
    } else {
      payload = { [field]: draftValue };
    }

    setSaving(true);
    try {
      const response = await fetch(`${JOB_SERVICE_URL}/jobs/update/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setFieldError(data.error || 'Failed to save changes.');
        setSaving(false);
        return;
      }

      setJob(prev => ({ ...prev, ...payload }));
      setEditingField(null);
    } catch (err) {
      console.error('Error:', err);
      setFieldError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.replace(' ', 'T'));
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // A single row: label, current value (or edit control), Edit/Save/Cancel buttons
  const FieldRow = ({ field, label, type = 'text', options = null }) => {
    const isEditing = editingField === field;

    return (
      <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? '8px' : '0' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
          {!isEditing && (
            <button
              onClick={() => startEdit(field)}
              style={{ ...buttonBaseStyle, backgroundColor: '#f3f4f6', color: '#1f2937' }}
            >
              Edit ✎
            </button>
          )}
        </div>

        {!isEditing && (
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#374151' }}>
            {field === 'skills_required'
              ? (Array.isArray(job.skills_required) && job.skills_required.length > 0 ? job.skills_required.join(', ') : '—')
              : (job[field] !== null && job[field] !== undefined && job[field] !== '' ? job[field] : '—')}
          </p>
        )}

        {isEditing && (
          <div>
            {type === 'textarea' && (
              <textarea
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
              />
            )}

            {type === 'select' && (
              <select value={draftValue} onChange={(e) => setDraftValue(e.target.value)} style={inputStyle}>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}

            {type === 'text' && (
              <input
                type="text"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                style={inputStyle}
              />
            )}

            {type === 'skills' && (
              <div>
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Type a skill and press Enter"
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {draftSkills.map(skill => (
                    <span key={skill} style={{
                      backgroundColor: '#e5e7eb', color: '#1f2937', borderRadius: '14px',
                      padding: '4px 8px 4px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                      {skill}
                      <span onClick={() => removeDraftSkill(skill)} style={{ cursor: 'pointer', fontWeight: 'bold', color: '#6b7280', lineHeight: 1 }}>×</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {fieldError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{fieldError}</p>}

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={() => saveField(field)}
                disabled={saving}
                style={{ ...buttonBaseStyle, backgroundColor: saving ? '#93c5fd' : '#2563eb', color: 'white', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                style={{ ...buttonBaseStyle, backgroundColor: '#f3f4f6', color: '#1f2937' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
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
        <h2 style={{ textAlign: 'center', marginBottom: '4px', fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
          Edit Job Listing
        </h2>

        {loading && (
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', padding: '40px 0' }}>
            Loading job listing...
          </p>
        )}

        {!loading && loadError && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            borderRadius: '6px', padding: '12px', fontSize: '13px', margin: '16px 0'
          }}>
            {loadError}
          </div>
        )}

        {!loading && job && (
          <>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '20px', fontSize: '13px' }}>
              Created: {formatDate(job.created_at)} &middot; {job.number_of_applicants ?? 0} applicant{job.number_of_applicants === 1 ? '' : 's'}
            </p>

            <div style={{ marginTop: '8px' }}>
              <FieldRow field="job_title" label="Job Title" type="text" />
              <FieldRow field="job_description" label="Job Description" type="textarea" />
              <FieldRow field="work_mode" label="Work Mode" type="select" options={WORK_MODES} />
              <FieldRow field="role_type" label="Role Type" type="select" options={ROLE_TYPES} />
              <FieldRow field="salary_offered" label="Salary Offered" type="text" />
              <FieldRow field="currency" label="Currency" type="select" options={CURRENCIES} />
              <FieldRow field="seniority_level" label="Seniority Level" type="select" options={SENIORITY_LEVELS} />
              <FieldRow field="skills_required" label="Skills Required" type="skills" />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => navigate('/employer-dashboard')}
                style={{
                  flex: 1, padding: '10px 16px', backgroundColor: '#2563eb', color: 'white',
                  border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EditJobListing;