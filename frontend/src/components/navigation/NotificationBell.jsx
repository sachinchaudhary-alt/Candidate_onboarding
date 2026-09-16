import { useState } from 'react';
import Icon from '../common/Icon.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { timeAgo } from '../../utils/format.js';

export default function NotificationBell({ role, variant }) {
  const { notificationsFor, markNotificationsRead } = useApp();
  const [open, setOpen] = useState(false);
  const items = notificationsFor(role);
  const unread = items.filter((n) => !n.read).length;
  const btnClass = variant === 'ta' ? 'ta-iconbtn' : 'icon-btn';
  const dotClass = variant === 'ta' ? 'ta-iconbtn__dot' : 'badge-count';

  return (
    <div className="pos-rel">
      <button
        className={btnClass}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread) markNotificationsRead(role);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <Icon name="Bell" size={18} />
        {unread > 0 && <span className={dotClass}>{unread}</span>}
      </button>
      {open && (
        <div className="dropdown-panel">
          <div className="dropdown-panel__header">Notifications</div>
          {items.length === 0 && <div className="notif-item text-secondary">You're all caught up.</div>}
          {items.slice(0, 12).map((n) => (
            <div key={n.id} className={`notif-item${n.read ? '' : ' notif-item--unread'}`}>
              <div className="strong text-small">{n.title}</div>
              <div className="text-xs text-secondary">{n.body}</div>
              <div className="text-xs text-secondary mt-2">{timeAgo(n.at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
