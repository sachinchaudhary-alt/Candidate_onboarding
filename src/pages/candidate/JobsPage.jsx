import JobBrowser from '../../components/JobBrowser.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useJobFilters } from '../../hooks/useJobFilters.js';

export default function JobsPage() {
  const { jobs } = useApp();
  const f = useJobFilters(jobs);

  return (
    <div className="cx-page">
      <div className="cx-page__head">
        <h1 className="cx-page__title">Open positions</h1>
        <p className="cx-page__sub">{f.filtered.length} of {jobs.length} roles match your search</p>
      </div>

      <JobBrowser f={f} />
    </div>
  );
}
