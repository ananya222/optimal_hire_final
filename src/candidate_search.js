import { useState, useEffect } from 'react';

const summary = localStorage.getItem('candidate_summary');

const RESUME_PAYLOAD = {
  resume: summary
};

const CARD_THEMES = [
  { icon_bg: '#eff6ff', icon_color: '#2563eb' },
  { icon_bg: '#faf5ff', icon_color: '#7c3aed' },
  { icon_bg: '#fff7ed', icon_color: '#ea580c' },
  { icon_bg: '#f0fdf4', icon_color: '#16a34a' },
  { icon_bg: '#fdf2f8', icon_color: '#db2777' },
  { icon_bg: '#f0fdfa', icon_color: '#0d9488' },
  { icon_bg: '#fefce8', icon_color: '#ca8a04' },
];

function getMatchBadgeStyle(score) {
  if (score >= 80) {
    return { background: '#dcfce7', color: '#15803d' };
  } else if (score >= 60) {
    return { background: '#fef9c3', color: '#854d0e' };
  } else {
    return { background: '#fee2e2', color: '#b91c1c' };
  }
}

function mapMatchesToJobs(matches) {
  return matches.map((match, i) => {
    const theme = CARD_THEMES[i % CARD_THEMES.length];
    const scorePercent = Math.round(match.score * 100);
    return {
      job_id: match.job_id,
      title: match.job_title,
      icon_bg: theme.icon_bg,
      icon_color: theme.icon_color,
      work_mode: 'Remote',
      role_type: 'Full-time',
      description: match.job_description,
      match_score: scorePercent,
    };
  });
}

function JobMatches() {
  const [jobs, setJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    fetchTopJobs();
  }, []);

  const fetchTopJobs = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const response = await fetch('http://127.0.0.1:5002/score_jobs_for_resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(RESUME_PAYLOAD),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const mapped = mapMatchesToJobs(data.matches || []);
      setJobs(mapped);
    } catch (error) {
      console.error('Error fetching job matches:', error);
      setApiError(error.message || 'Failed to load matches');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user?.user_id;

      const response = await fetch('http://127.0.0.1:5004/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, job_id: jobId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(`Error: ${data.error}`);
        return;
      }

      setAppliedJobs((prev) => ({ ...prev, [jobId]: true }));
    } catch (error) {
      console.error('Error applying to job:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleBack = () => window.history.back();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #dce8f5 0%, #e8e4f5 50%, #d8e4f8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          padding: '32px 32px 24px',
          width: '100%',
          maxWidth: '520px',
        }}
      >
        {/* Progress Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Progress:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '6px' }}>100%</span>
        </div>

        {/* Title */}
        <h2
          style={{
            textAlign: 'center',
            marginBottom: '8px',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#111827',
          }}
        >
          Your Top Job Matches
        </h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
          {loading
            ? 'Scanning jobs for your resume…'
            : apiError
            ? 'Could not load matches'
            : `Based on your profile — ${jobs.length} jobs found`}
        </p>

        {/* Job Cards */}
        <div style={{ marginBottom: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: '14px' }}>
              Finding your top matches...
            </div>
          ) : apiError ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                borderRadius: '12px',
                background: '#fef2f2',
                color: '#b91c1c',
                fontSize: '14px',
              }}
            >
              <p style={{ margin: '0 0 8px', fontWeight: '600' }}>Failed to load matches</p>
              <p style={{ margin: '0 0 16px', color: '#9b1c1c', fontSize: '13px' }}>{apiError}</p>
              <button
                onClick={fetchTopJobs}
                style={{
                  padding: '7px 20px',
                  borderRadius: '8px',
                  border: '1px solid #ef4444',
                  background: 'white',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {jobs.map((job) => {
                const badgeStyle = getMatchBadgeStyle(job.match_score);
                const applied = appliedJobs[job.job_id];

                return (
                  <div
                    key={job.job_id}
                    style={{
                      border: '0.5px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      backgroundColor: '#fff',
                    }}
                  >
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: job.icon_bg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: job.icon_color,
                              flexShrink: 0,
                            }}
                          >
                            {job.title.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#0f172a' }}>
                              {job.title}
                            </p>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                              {job.work_mode} · {job.role_type}
                            </p>
                          </div>
                        </div>
                        <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0', lineHeight: '1.5' }}>
                          {job.description}
                        </p>
                      </div>

                      {/* Match score badge */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div
                          style={{
                            ...badgeStyle,
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {job.match_score}% match
                        </div>
                      </div>
                    </div>

                    {/* Apply button */}
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleApply(job.job_id)}
                        disabled={applied}
                        style={{
                          fontSize: '13px',
                          padding: '6px 18px',
                          borderRadius: '8px',
                          border: '1px solid #2563eb',
                          background: applied ? '#2563eb' : 'white',
                          color: applied ? 'white' : '#2563eb',
                          cursor: applied ? 'default' : 'pointer',
                          fontWeight: '500',
                        }}
                      >
                        {applied ? 'Applied!' : 'Apply'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleBack}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default JobMatches;