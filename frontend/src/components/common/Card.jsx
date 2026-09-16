import Icon from './Icon.jsx';

export function Card({ title, actions, children, className = '', bodyClass = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card__header">
          {title && <h3 className="section-title">{title}</h3>}
          {actions && <div className="row gap-2">{actions}</div>}
        </div>
      )}
      <div className={`card__body ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function KPICard({ label, value, icon, onClick, active }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`kpi-card${onClick ? ' kpi-card--link' : ''}${active ? ' kpi-card--active' : ''}`}
      onClick={onClick}
    >
      <span className="kpi-card__label">{label}</span>
      <div className="row between">
        <span className="kpi-card__value">{value}</span>
        {icon && (
          <span className="kpi-card__icon">
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>
      {onClick && <Icon name="ArrowRight" size={13} className="kpi-card__go" />}
    </Tag>
  );
}

export function InfoList({ items }) {
  return (
    <div className="info-list">
      {items.map((it) => (
        <div className="info-list__item" key={it.label}>
          <span className="info-list__label">{it.label}</span>
          <span className="info-list__value">{it.value || '—'}</span>
        </div>
      ))}
    </div>
  );
}
