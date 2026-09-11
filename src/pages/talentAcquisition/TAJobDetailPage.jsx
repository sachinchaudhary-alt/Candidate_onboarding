import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon.jsx';
import TAHeader from '../../components/ta/TAHeader.jsx';
import Card from '../../components/ta/Card.jsx';
import Button from '../../components/ta/Button.jsx';
import Tag from '../../components/ta/Tag.jsx';
import EmptyState from '../../components/ta/EmptyState.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { APP_STATUS, stageIndexForStatus } from '../../constants/statuses.js';
import { formatDate } from '../../utils/format.js';

const BREAKDOWN = [
  { label: 'Applied', reach: 0, tone: 'blue' },
  { label: 'Screening', reach: 1, tone: 'violet' },
  { label: 'Interview', reach: 2, tone: 'amber' },
  { label: 'Offer', reach: 4, tone: 'green' },
  { label: 'Hired', reach: 5, tone: 'green' },
];

function List({ title, items }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 className="ta-card__title" style={{ marginBottom: 10 }}>{title}</h3>
      <ul className="ta-bullets">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

export default function TAJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { getJob, data } = useApp();
  const job = getJob(jobId);

  const applicants = useMemo(
    () => (data.applications || []).filter((a) => a.jobId === jobId),
    [data.applications, jobId]
  );
  const breakdown = BREAKDOWN.map((b) => ({
    ...b,
    value: applicants.filter((a) => a.status !== APP_STATUS.REJECTED && stageIndexForStatus(a.status) >= b.reach).length,
  }));

  if (!job) {
    return (
      <EmptyState icon="Briefcase" title="Job not found" message="This job may have been removed."
        action={<Button variant="ghost" onClick={() => navigate('/ta/jobs')}>Back to jobs</Button>} />
    );
  }

  return (
    <>
      <TAHeader
        title={job.title}
        subtitle={`${job.department} · ${job.location} · ${job.employmentType} · ${job.workMode} · apply by ${formatDate(job.deadline)}`}
        backTo="/ta/jobs"
        backLabel="Jobs"
      />

      <div className="ta-page-actions">
        <Button icon="Users" onClick={() => navigate(`/ta/candidates?job=${encodeURIComponent(job.title)}`)}>View applicants</Button>
      </div>

      <div className="ta-detail-grid">
        <Card>
          <div style={{ marginBottom: 22 }}>
            <h3 className="ta-card__title" style={{ marginBottom: 10 }}>About the role</h3>
            <p className="ta-cell-mute" style={{ lineHeight: 1.7 }}>{job.description}</p>
          </div>
          <List title="Responsibilities" items={job.responsibilities} />
          {job.requiredSkills?.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h3 className="ta-card__title" style={{ marginBottom: 10 }}>Required skills</h3>
              <div className="ta-skills">{job.requiredSkills.map((s) => <span key={s} className="ta-skill">{s}</span>)}</div>
            </div>
          )}
          {job.preferredSkills?.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h3 className="ta-card__title" style={{ marginBottom: 10 }}>Preferred skills</h3>
              <div className="ta-skills">{job.preferredSkills.map((s) => <span key={s} className="ta-skill">{s}</span>)}</div>
            </div>
          )}
          <List title="Qualifications" items={job.qualifications} />
          <List title="What we offer" items={job.benefits} />
        </Card>

        <Card title="Applicant pipeline">
          {applicants.length === 0 ? (
            <p className="ta-cell-mute">No applicants yet for this role.</p>
          ) : (
            <div className="ta-pipe">
              {breakdown.map((b) => (
                <div className="ta-pipe__row" key={b.label} style={{ cursor: 'default' }}>
                  <span className="ta-pipe__icon" style={{ '--p-bg': `var(--tag-${b.tone}-bg)`, '--p-fg': `var(--tag-${b.tone}-fg)` }}>
                    <Icon name="CircleDot" size={13} />
                  </span>
                  <span className="ta-pipe__label">{b.label}</span>
                  <span className="ta-pipe__count">{b.value}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <Button variant="ghost" iconRight="ArrowRight" onClick={() => navigate(`/ta/candidates?job=${encodeURIComponent(job.title)}`)}>
              Open in candidates
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
