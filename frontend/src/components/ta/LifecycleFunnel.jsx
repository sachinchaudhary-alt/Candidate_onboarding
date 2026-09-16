import Icon from '../common/Icon.jsx';

/* Employee Lifecycle Funnel — horizontal gradient bars, one per phase, each in
   its own colour along a cool blue → green progression. Bar length is the
   phase's share of the intake, so the bars taper as people move through.
   The flagged phase turns amber. `stages` = [{ label, count, pct, attention, onClick }]. */
const BARS = [
  ['#6ea8ff', '#3b6ef5'], // blue
  ['#8e86f5', '#5b52d6'], // indigo
  ['#a97cf0', '#7c4fd6'], // violet
  ['#4fc9b5', '#0e9d88'], // teal
  ['#5fd08a', '#1f9d55'], // green
];

export default function LifecycleFunnel({ stages }) {
  return (
    <div className="ta-lcf">
      {stages.map((s, i) => {
        const [a, b] = BARS[i] || BARS[BARS.length - 1];
        return (
          <button
            key={s.label}
            type="button"
            className={`ta-lcf__row${s.attention ? ' is-attn' : ''}`}
            onClick={s.onClick}
            title={`View ${s.label} — ${s.count}`}
          >
            <span className="ta-lcf__head">
              <span className="ta-lcf__label">
                {s.attention && <Icon name="AlertTriangle" size={11} />}
                {s.label}
              </span>
              <span className="ta-lcf__count">{s.count}</span>
            </span>
            <span className="ta-lcf__track">
              <span
                className="ta-lcf__bar"
                style={{ width: `${Math.max(s.pct, 7)}%`, background: s.attention ? undefined : `linear-gradient(90deg, ${a}, ${b})` }}
              >
                <span className="ta-lcf__pct">{s.pct}%</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
