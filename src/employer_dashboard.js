import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const JOB_SERVICE_URL = 'http://127.0.0.1:5003';

// Ring colors cycle in the same order the mockup used
const RING_COLORS = [
  { stroke: '#16a34a', bg: '#dcfce7', text: '#15803d' }, // green
  { stroke: '#2563eb', bg: '#dbeafe', text: '#1d4ed8' }, // blue
  { stroke: '#7c3aed', bg: '#ede9fe', text: '#6d28d9' }, // purple
  { stroke: '#d97706', bg: '#fef3c7', text: '#b45309' }, // amber
  { stroke: '#dc2626', bg: '#fee2e2', text: '#b91c1c' }  // red
];

// Ring fill is normalized against this so a very high applicant count doesn't overflow the circle
const MAX_APPLICANTS_FOR_RING = 150;

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp.replace(' ', 'T'));
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ApplicantRing({ count, color }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min((count || 0) / MAX_APPLICANTS_FOR_RING, 1);

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
      <circle cx="22" cy="22" r={radius} fill="none" stroke={color.bg} strokeWidth="5" />
      <circle
        cx="22" cy="22" r={radius} fill="none"
        stroke={color.stroke} strokeWidth="5"
        strokeDasharray={`${pct * circumference} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="20" textAnchor="middle" fontSize="11" fontWeight="600" fill={color.text}>
        {count ?? 0}
      </text>
      <text x="22" y="30" textAnchor="middle" fontSize="6" fill={color.text}>
        Applicants
      </text>
    </svg>
  );
}

function EmployerDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user?.user_id;

      if (!userId) {
        setError('User not found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${JOB_SERVICE_URL}/jobs?user_id=${userId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load job listings.');
        setJobs([]);
        return;
      }

      setJobs(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Unable to load jobs at this time. Please try again later.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = () => {
    navigate('/jobs/new');
  };

  const handleEditListing = (job) => {
    navigate(`/jobs/${job.job_id}/edit`);
  };

  const handleViewApplicants = (job) => {
    navigate(`/jobs/${job.job_id}/applicants`);
  };

  const buttonBaseStyle = {
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
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
        {/* Header */}
        <h2 style={{ textAlign: 'center', marginBottom: '4px', fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
          Employer Dashboard
        </h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
          Manage your job listings — {jobs.length} listing{jobs.length !== 1 ? 's' : ''} found
        </p>

        {/* Create button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            onClick={handleCreateListing}
            style={{ ...buttonBaseStyle, backgroundColor: '#2563eb', color: 'white', padding: '10px 16px' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            Create New Job Listing +
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            borderRadius: '6px', padding: '12px', fontSize: '13px', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {/* Listings */}
        <div style={{ maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
          {loading && (
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', padding: '40px 0' }}>
              Loading job listings...
            </p>
          )}

          {!loading && !error && jobs.length === 0 && (
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', padding: '40px 0' }}>
              You haven't posted any jobs yet.
            </p>
          )}

          {!loading && jobs.map((job, i) => {
            const color = RING_COLORS[i % RING_COLORS.length];
            const skills = Array.isArray(job.skills_required) ? job.skills_required.slice(0, 3) : [];

            return (
              <div key={job.job_id} style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <ApplicantRing count={job.number_of_applicants} color={color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                      {job.job_title}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                      Created: {formatDate(job.created_at)} &middot; {job.role_type} &middot; {job.work_mode}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {skills.map((skill, idx) => (
                      <span key={idx} style={{
                        backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px',
                        padding: '3px 10px', fontSize: '12px', color: '#374151'
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleViewApplicants(job)}
                      style={{ ...buttonBaseStyle, backgroundColor: '#2563eb', color: 'white' }}
                    >
                      View Applicants ↗
                    </button>
                    <button
                      onClick={() => handleEditListing(job)}
                      style={{ ...buttonBaseStyle, backgroundColor: '#f3f4f6', color: '#1f2937' }}
                    >
                      Edit Listing ✎
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ flex: 1, padding: '10px 16px', backgroundColor: '#f3f4f6', color: '#1f2937', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
          >
            Back
          </button>

          <button
            onClick={() => navigate('/company-profile')}
            style={{ flex: 1, padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            Company Profile ↗
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmployerDashboard;