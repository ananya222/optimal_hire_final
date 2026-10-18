import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const JOB_SERVICE_URL = 'http://127.0.0.1:5003';
const MATCH_SERVICE_URL = 'http://127.0.0.1:5002';
const PROFILE_SERVICE_URL = 'http://127.0.0.1:5001';

// Score (0-100) -> visual match category, mirrors the ring colors used on the dashboard
function getMatchCategory(scorePct) {
  if (scorePct >= 85) return { label: 'Excellent', stroke: '#16a34a', text: '#16a34a' };
  if (scorePct >= 70) return { label: 'Good', stroke: '#2563eb', text: '#2563eb' };
  if (scorePct >= 55) return { label: 'Fair', stroke: '#7c3aed', text: '#7c3aed' };
  if (scorePct >= 40) return { label: 'Needs Review', stroke: '#d97706', text: '#d97706' };
  return { label: 'Low Match', stroke: '#9ca3af', text: '#6b7280' };
}

function ScoreRing({ scorePct }) {
  const category = getMatchCategory(scorePct);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(scorePct, 0), 100) / 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 64 }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={category.stroke} strokeWidth="4"
          strokeDasharray={`${pct * circumference} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="37" textAnchor="middle" fontSize="17" fontWeight="700" fill={category.text}>
          {scorePct}
        </text>
      </svg>
      <span style={{ fontSize: '12px', fontWeight: '600', color: category.text, marginTop: '2px' }}>
        {category.label}
      </span>
    </div>
  );
}

function formatSalary(minSalary, currency) {
  if (minSalary === null || minSalary === undefined) return null;
  const amount = Number(minSalary);
  if (Number.isNaN(amount)) return null;
  return `${currency || 'USD'} ${amount.toLocaleString()}`;
}

function ApplicantCard({ applicant }) {
  const scorePct = Math.round((applicant.score || 0) * 100);
  const skills = Array.isArray(applicant.skills) ? applicant.skills : [];
  const visibleSkills = skills.slice(0, 4);
  const extraSkillCount = skills.length - visibleSkills.length;
  const salary = formatSalary(applicant.min_salary, applicant.currency);

  const metaParts = [];
  if (applicant.years_experience !== null && applicant.years_experience !== undefined) {
    metaParts.push(`${applicant.years_experience} yrs exp`);
  }
  if (applicant.work_mode) metaParts.push(applicant.work_mode);
  if (applicant.role_type) metaParts.push(applicant.role_type);
  if (salary) metaParts.push(salary);

  const buttonBaseStyle = {
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid #e5e7eb',
    backgroundColor: 'white',
    color: '#1f2937',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'inline-block'
  };

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px'
    }}>
      <ScoreRing scorePct={scorePct} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827' }}>
          {applicant.full_name || `Candidate #${applicant.user_id}`}
        </p>
        <p style={{ margin: '2px 0 6px', fontSize: '13px', color: '#6b7280' }}>
          {applicant.headline || applicant.seniority_level || 'Candidate'}
        </p>

        {metaParts.length > 0 && (
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#6b7280' }}>
            {metaParts.join(' \u00b7 ')}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {visibleSkills.map((skill, idx) => (
              <span key={idx} style={{
                backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px',
                padding: '3px 10px', fontSize: '12px', color: '#374151'
              }}>
                {skill}
              </span>
            ))}
            {extraSkillCount > 0 && (
              <span style={{
                backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px',
                padding: '3px 10px', fontSize: '12px', color: '#374151'
              }}>
                +{extraSkillCount}
              </span>
            )}
          </div>

          {applicant.resume_path ? (
            <a
              href={`${PROFILE_SERVICE_URL}/api/profiles/resume/${applicant.user_id}/preview`}
              style={buttonBaseStyle}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
            >
              Download Resume &#8595;
            </a>
          ) : (
            <span style={{ ...buttonBaseStyle, color: '#9ca3af', cursor: 'default' }}>
              No Resume
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicantsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApplicants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const fetchApplicants = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Job details, for the header
      const jobResponse = await fetch(`${JOB_SERVICE_URL}/jobs/${jobId}`);
      const jobData = await jobResponse.json();
      if (!jobResponse.ok) {
        setError(jobData.error || 'Failed to load job.');
        setLoading(false);
        return;
      }
      setJob(jobData);

      // 2. Scored applicants for this job
      const matchResponse = await fetch(`${MATCH_SERVICE_URL}/score_resumes_for_job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: Number(jobId) })
      });
      const matchData = await matchResponse.json();
      if (!matchResponse.ok) {
        setError(matchData.error || 'Failed to score applicants.');
        setApplicants([]);
        setLoading(false);
        return;
      }

      const matches = matchData.matches || [];

      // 3. Enrich each match with the candidate's full profile (name, skills, etc.)
      const enriched = await Promise.all(
        matches.map(async (match) => {
          try {
            const profileResponse = await fetch(`${PROFILE_SERVICE_URL}/api/profiles/candidate/${match.user_id}`);
            if (!profileResponse.ok) return match;
            const profile = await profileResponse.json();
            return { ...match, ...profile };
          } catch (e) {
            return match;
          }
        })
      );

      // Preserve match-score ordering (highest first) from match_service
      enriched.sort((a, b) => (b.score || 0) - (a.score || 0));
      setApplicants(enriched);
    } catch (err) {
      console.error('Error:', err);
      setError('Unable to load jobs at this time. Please try again later.');
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '32px',
        width: '100%',
        maxWidth: '700px'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#374151', fontSize: '14px', padding: 0, marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          &#8592; Back
        </button>

        <h2 style={{ textAlign: 'center', marginBottom: '4px', fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
          Applicants
        </h2>
        {job && (
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '4px', fontSize: '14px' }}>
            {job.job_title} &middot; {job.role_type} &middot; {job.work_mode}
          </p>
        )}

        {!loading && !error && (
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
            {applicants.length} applicant{applicants.length !== 1 ? 's' : ''} found
          </p>
        )}

        {error && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            borderRadius: '6px', padding: '12px', fontSize: '13px', marginTop: '16px', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <div style={{ maxHeight: '620px', overflowY: 'auto', paddingRight: '4px' }}>
          {loading && (
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', padding: '40px 0' }}>
              Loading applicants...
            </p>
          )}

          {!loading && !error && applicants.length === 0 && (
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', padding: '40px 0' }}>
              No applicants yet for this job.
            </p>
          )}

          {!loading && applicants.map((applicant) => (
            <ApplicantCard key={applicant.user_id} applicant={applicant} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ApplicantsPage;