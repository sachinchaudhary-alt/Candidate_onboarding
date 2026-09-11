import Icon from './Icon.jsx';
import { formatDateTime } from '../../utils/format.js';

/* Icon + colour tone per activity type. */
export const TYPE_META = {
  application: { icon: 'FileText', tone: 'blue' },
  review: { icon: 'Eye', tone: 'violet' },
  approve: { icon: 'CheckCircle2', tone: 'green' },
  return: { icon: 'RotateCcw', tone: 'amber' },
  reject: { icon: 'XCircle', tone: 'red' },
  interview: { icon: 'CalendarDays', tone: 'violet' },
  documents: { icon: 'Files', tone: 'teal' },
  offer: { icon: 'FileCheck', tone: 'blue' },
  onboarding: { icon: 'UserRoundCheck', tone: 'green' },
};

export function ActivityTimeline({ items, onSelect }) {
  if (!items?.length) {
    return <p className="ta-cell-mute">No activity recorded yet.</p>;
  }
  return (
    <div className="act-feed">
      {items.map((it) => {
        const m = TYPE_META[it.type] || { icon: 'CircleDot', tone: 'grey' };
        const Row = onSelect ? 'button' : 'div';
        return (
          <Row
            key={it.id}
            type={onSelect ? 'button' : undefined}
            className={`act-feed__item${onSelect ? ' act-feed__item--link' : ''}`}
            onClick={onSelect ? () => onSelect(it) : undefined}
          >
            <span className={`act-feed__icon act-feed__icon--${m.tone}`}>
              <Icon name={m.icon} size={14} />
            </span>
            <div className="act-feed__body">
              <div className="act-feed__head">
                <span className="act-feed__title">{it.title}</span>
                <span className="act-feed__when">{formatDateTime(it.at)} · {it.actor}</span>
              </div>
              {it.description && <div className="act-feed__desc">{it.description}</div>}
            </div>
            {onSelect && <Icon name="ArrowRight" size={14} className="act-feed__go" />}
          </Row>
        );
      })}
    </div>
  );
}

/** Pipeline stage tracker for the candidate. */
export function StageTracker({ stages }) {
  return (
    <div className="timeline">
      {stages.map((s) => (
        <div className="timeline__item" key={s.key}>
          <div className={`timeline__dot timeline__dot--${s.state}`}>
            <Icon
              name={s.state === 'done' ? 'Check' : s.state === 'current' ? 'CircleDot' : 'Circle'}
              size={16}
            />
          </div>
          <div className="timeline__content">
            <div className="timeline__title">{s.label}</div>
            <div className="text-small text-secondary">{s.description}</div>
            {s.date && <div className="timeline__meta">{s.date}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
