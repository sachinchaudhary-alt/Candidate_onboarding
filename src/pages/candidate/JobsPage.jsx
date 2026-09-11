import { useNavigate } from 'react-router-dom';
import Button from '../../components/ta/Button.jsx';
import JobBrowser from '../../components/JobBrowser.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useJobFilters } from '../../hooks/useJobFilters.js';

export default function JobsPage() {
  const navigate = useNavigate();
  const { jobs } = useApp();
  const f = useJobFilters(jobs);

  return (
    <div className="cx-page">
      <div className="cx-page__head" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 className="cx-page__title">Open positions</h1>
          <p className="cx-page__sub">{f.filtered.length} of {jobs.length} roles match your search</p>
        </div>
        <Button variant="ghost" icon="FileText" onClick={() => navigate('/candidate/apply')}>Submit general application</Button>
      </div>

      <JobBrowser f={f} />
    </div>
  );
}
