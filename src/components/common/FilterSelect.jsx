import Icon from './Icon.jsx';

export default function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="row gap-2" style={{ position: 'relative' }}>
      <Icon name="SlidersHorizontal" size={14} style={{ color: 'var(--color-text-secondary)' }} />
      <span className="sr-only">{label}</span>
      <select
        className="select"
        style={{ width: 'auto', minWidth: 150 }}
        value={value ?? 'all'}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="all">{label}: All</option>
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>
              {label}: {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {label}: {o.label}
            </option>
          )
        )}
      </select>
    </label>
  );
}
