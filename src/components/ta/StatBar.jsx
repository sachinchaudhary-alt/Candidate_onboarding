import Icon from '../common/Icon.jsx';

/* Compact one-line summary of key numbers — a lighter alternative to a row
   of KPI tiles. Each item: { icon, value, label, accent, onClick }. */
export default function StatBar({ items }) {
  return (
    <div className="ta-statbar">
      {items.map((it) => {
        const Row = it.onClick ? 'button' : 'div';
        return (
          <Row
            key={it.label}
            type={it.onClick ? 'button' : undefined}
            className={`ta-statbar__item${it.onClick ? ' ta-statbar__item--link' : ''}`}
            onClick={it.onClick}
          >
            <span className={`ta-statbar__icon ta-statbar__icon--${it.accent || 'blue'}`}>
              <Icon name={it.icon} size={16} />
            </span>
            <span className="ta-statbar__text">
              <span className="ta-statbar__num">{it.value}</span>
              <span className="ta-statbar__label">{it.label}</span>
            </span>
          </Row>
        );
      })}
    </div>
  );
}
