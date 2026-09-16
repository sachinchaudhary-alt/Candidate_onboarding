import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon.jsx';
import Button from '../../components/ta/Button.jsx';
import Card from '../../components/ta/Card.jsx';

const NEXT_STEPS = [
  'Application received',
  'Talent Acquisition review',
  'Interview',
  'Document verification',
  'Offer',
  'Joining',
];

export default function ApplicationSuccessPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state?.candidateId) return <Navigate to="/candidate" replace />;

  return (
    <div className="cx-page cx-page--narrow">
      <div className="cx-success">
        <span className="cx-success__check"><Icon name="CheckCircle2" size={26} /></span>
        <h1 className="cx-page__title">Application submitted</h1>
        <p className="cx-page__sub" style={{ marginBottom: 20 }}>
          Thank you for applying to Ccentrik{state.jobTitle ? ` for ${state.jobTitle}` : ''}. Our team will review it and get back to you.
        </p>
      </div>

      <Card>
        <div className="ta-info" style={{ marginBottom: 4 }}>
          <div className="ta-info__item"><span className="ta-info__label">Candidate ID</span><span className="ta-info__value">{state.candidateId}</span></div>
          <div className="ta-info__item"><span className="ta-info__label">Application ID</span><span className="ta-info__value">{state.applicationId}</span></div>
        </div>
      </Card>

      <div style={{ height: 16 }} />

      <Card title="What happens next">
        <ol className="ta-timeline">
          {NEXT_STEPS.map((label, i) => (
            <li key={label}>
              <span className="ta-timeline__dot" style={{ background: i === 0 ? 'var(--tag-green-fg)' : 'var(--ta-line)' }} />
              <div>
                <div className="ta-cell-strong" style={{ color: i === 0 ? undefined : 'var(--ta-text-mute)' }}>{label}</div>
                <div className="ta-cell-sub">{i === 0 ? 'Completed' : 'Upcoming'}</div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
        <Button icon="ClipboardList" onClick={() => navigate('/candidate/application')}>Track application</Button>
        <Button variant="ghost" icon="Briefcase" onClick={() => navigate('/candidate')}>Back to careers</Button>
      </div>
    </div>
  );
}
