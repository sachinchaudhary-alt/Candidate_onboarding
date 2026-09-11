import Icon from '../common/Icon.jsx';

/* Friendly empty state — never a bare "No data". */
export default function EmptyState({ icon = 'Inbox', title, message, action }) {
  return (
    <div className="ta-empty">
      <span className="ta-empty__icon"><Icon name={icon} size={20} /></span>
      <div className="ta-empty__title">{title}</div>
      {message && <div className="ta-empty__msg">{message}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
