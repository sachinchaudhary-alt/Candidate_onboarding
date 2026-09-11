const TONE = {
  indigo: 'var(--color-primary)',
  violet: 'var(--tf-violet)',
  teal: 'var(--tf-teal)',
  amber: 'var(--tf-amber)',
  coral: 'var(--tf-coral)',
  rose: 'var(--tf-rose)',
};

/**
 * Compact dashboard stat: label + value, value coloured by `tone`.
 */
export default function Metric({ label, value, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  const color = TONE[tone];
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`metric${onClick ? ' metric--link' : ''}${color ? ' metric--toned' : ''}`}
      style={color ? { '--mt': color } : undefined}
      onClick={onClick}
    >
      <div className="metric__label">{label}</div>
      <div className="metric__value">{value}</div>
    </Tag>
  );
}
