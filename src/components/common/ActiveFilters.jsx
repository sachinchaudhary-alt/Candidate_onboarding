import Icon from './Icon.jsx';

/**
 * chips = [{ key, label, onRemove }]
 */
export default function ActiveFilters({ chips = [], onClearAll }) {
  if (chips.length === 0) return null;
  return (
    <div className="fchips">
      {chips.map((c) => (
        <span className="fchip" key={c.key}>
          {c.label}
          <button type="button" onClick={c.onRemove} aria-label={`Remove ${c.label}`}>
            <Icon name="X" size={11} />
          </button>
        </span>
      ))}
      {chips.length > 1 && onClearAll && (
        <button type="button" className="fchip__clear" onClick={onClearAll}>
          Clear all
        </button>
      )}
    </div>
  );
}
