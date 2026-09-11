export default function Tooltip({ label, side = 'top', children }) {
  if (!label) return children;
  return (
    <span className="tt">
      {children}
      <span className={`tt__bubble${side === 'right' ? ' tt__bubble--right' : ''}`} role="tooltip">
        {label}
      </span>
    </span>
  );
}
