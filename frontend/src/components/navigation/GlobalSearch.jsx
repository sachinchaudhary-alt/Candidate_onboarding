import { useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../common/Icon.jsx';
import { useApp } from '../../context/AppContext.jsx';

/* Topbar search. Scoped to the page you're on: an Employees page searches
   employees, a Jobs page searches jobs, a Candidates page searches candidates.
   The dashboard is the one universal search — it looks across everything. */
export default function GlobalSearch({ base, variant, placeholder }) {
  const { data, jobs, getApplication } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const barClass = variant === 'ta' ? 'ta-search' : 'search-bar';

  const dashMode = /^\/(ta|hr)\/?$/.test(pathname) || pathname.includes('/dashboard');
  const empMode = !dashMode && pathname.includes('/employees');
  const jobMode = !dashMode && pathname.includes('/jobs') && !empMode;
  const candMode = !dashMode && !empMode && !jobMode;
  const ph = placeholder
    || (empMode ? 'Search employees…'
      : jobMode ? 'Search jobs…'
      : candMode ? 'Search candidates…'
      : 'Search candidates, jobs, IDs…');

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];

    const jobHits = (jobs || [])
      .filter((j) =>
        (j.title || '').toLowerCase().includes(term) ||
        (j.id || '').toLowerCase().includes(term) ||
        (j.department || '').toLowerCase().includes(term) ||
        (j.location || '').toLowerCase().includes(term))
      .map((j) => ({ key: j.id, primary: j.title, secondary: `${j.department} · ${j.location}`, to: `${base}/jobs/${j.id}` }));

    const empHits = (data.employees || [])
      .filter((e) =>
        (e.name || '').toLowerCase().includes(term) ||
        (e.id || '').toLowerCase().includes(term) ||
        (e.position || '').toLowerCase().includes(term) ||
        (e.department || '').toLowerCase().includes(term))
      .map((e) => ({
        key: e.id,
        primary: e.name,
        secondary: `${e.id} · ${e.position}`,
        to: `${base}/candidates/${getApplication(e.applicationId)?.candidateId || ''}`,
      }));

    const candHits = (data.applications || [])
      .filter((a) => {
        const name = `${a.personal.firstName} ${a.personal.lastName}`.toLowerCase();
        return (
          name.includes(term) ||
          a.candidateId.toLowerCase().includes(term) ||
          a.id.toLowerCase().includes(term) ||
          (a.jobTitle || '').toLowerCase().includes(term) ||
          (a.personal.email || '').toLowerCase().includes(term)
        );
      })
      .map((a) => ({
        key: a.id,
        primary: `${a.personal.firstName} ${a.personal.lastName}`,
        secondary: `${a.candidateId} · ${a.jobTitle}`,
        to: `${base}/candidates/${a.candidateId}`,
      }));

    if (jobMode) return jobHits.slice(0, 8);
    if (empMode) return empHits.slice(0, 8);
    if (candMode) return candHits.slice(0, 8);
    return [...candHits.slice(0, 5), ...jobHits.slice(0, 5)];
  }, [q, empMode, jobMode, candMode, data.applications, data.employees, jobs, base, getApplication]);

  return (
    <div className="global-search" ref={ref} style={variant === 'ta' ? undefined : { minWidth: 280 }}>
      <div className={barClass}>
        <Icon name="Search" size={16} />
        <input
          value={q}
          placeholder={ph}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && q.trim() && (
        <div className="global-search__results">
          {results.length === 0 && <div className="global-search__item text-secondary">No matches found.</div>}
          {results.map((r) => (
            <div
              key={r.key}
              className="global-search__item"
              onMouseDown={() => { navigate(r.to); setQ(''); setOpen(false); }}
            >
              <div className="strong text-small">{r.primary}</div>
              <div className="text-xs text-secondary">{r.secondary}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
