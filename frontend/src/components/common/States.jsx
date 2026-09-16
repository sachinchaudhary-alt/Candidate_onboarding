import Icon from './Icon.jsx';

export function EmptyState({ icon = 'Inbox', title = 'Nothing here yet', message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon name={icon} size={22} />
      </div>
      <div className="strong">{title}</div>
      {message && <div className="text-small">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="loading-state">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function Spinner({ large }) {
  return <span className={`spinner${large ? ' spinner--lg' : ''}`} />;
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="stack gap-2" style={{ padding: 16 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 40 }} />
      ))}
    </div>
  );
}
