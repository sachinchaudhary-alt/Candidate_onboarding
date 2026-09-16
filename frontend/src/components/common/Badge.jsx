import Icon from './Icon.jsx';
import { statusMeta } from '../../constants/statuses.js';

export function Badge({ tone = 'neutral', icon, children }) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

/** Status badge driven by any *_STATUS_META map or the app status registry. */
export function StatusBadge({ status, meta }) {
  const m = meta || statusMeta(status);
  return (
    <span className={`badge badge--${m.tone}`}>
      <Icon name={m.icon} size={12} />
      {m.label}
    </span>
  );
}
