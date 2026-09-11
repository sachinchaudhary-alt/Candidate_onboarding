import Icon from './common/Icon.jsx';
import { EXPERIENCE_OPTIONS } from '../hooks/useJobFilters.js';

/* Filter panel for the job browser — sits in the right column, sticky. */
export default function JobFilters({ f }) {
  const select = (label, value, onChange, options) => (
    <div className="cx-ff__field">
      <span className={value !== 'all' ? 'is-active' : ''}>{label}</span>
      <select className="ta-select cx-ff__select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">All</option>
        {options.map((o) => (typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </div>
  );

  const chips = (label, value, onChange, options) => {
    if (options.length < 2) return null;
    return (
      <div className="cx-ff__field">
        <span className={value !== 'all' ? 'is-active' : ''}>{label}</span>
        <div className="cx-ff__chips">
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            const l = typeof o === 'string' ? o : o.label;
            const on = value === v;
            return (
              <button
                key={v}
                type="button"
                className={`cx-ff__chip${on ? ' is-on' : ''}`}
                onClick={() => onChange(on ? 'all' : v)}
              >
                {on && <Icon name="Check" size={12} />}
                {l}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="cx-ff">
      <div className="cx-ff__head">
        <span><span className="cx-ff__headicon"><Icon name="SlidersHorizontal" size={13} /></span> Filters</span>
        {f.active && <button type="button" className="ta-link" onClick={f.clear}>Clear all</button>}
      </div>

      {select('Department', f.dept, f.setDept, f.facets.departments)}
      {chips('Work location', f.mode, f.setMode, f.facets.modes)}
      {chips('Employment type', f.type, f.setType, f.facets.types)}
      {chips('Experience', f.exp, f.setExp, EXPERIENCE_OPTIONS)}

      <div className="cx-ff__foot">
        <strong>{f.filtered.length}</strong> of {f.facets.total} roles match
      </div>
    </aside>
  );
}
