import { useNavigate } from 'react-router-dom';
import Button from '../../components/ta/Button.jsx';
import JobBrowser from '../../components/JobBrowser.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useJobFilters } from '../../hooks/useJobFilters.js';

export default function LandingPage() {
  const navigate = useNavigate();
  const { jobs } = useApp();
  const f = useJobFilters(jobs);

  return (
    <div className="cx-page">
      <div className="cx-hero">
        <div>
          <div className="cx-hero__eyebrow">Ccentrik Careers</div>
          <h1>Find your next opportunity</h1>
          <p>{jobs.length} open roles across {f.facets.departments.length} departments. Submit your profile and we'll match you to the right role.</p>
        </div>
        <Button icon="FileText" onClick={() => navigate('/candidate/apply')}>Submit general application</Button>
      </div>

      <JobBrowser f={f} />
    </div>
  );
}
