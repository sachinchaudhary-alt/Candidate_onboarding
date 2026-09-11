/**
 * Horizontal funnel of the recruitment pipeline.
 * `stages` = [{ label, value, muted? }]
 */
export default function PipelineFunnel({ stages }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="funnel">
      {stages.map((s) => (
        <div className="funnel__row" key={s.label}>
          <span className="funnel__label">{s.label}</span>
          <div className="funnel__track">
            <div
              className={`funnel__fill${s.muted ? ' funnel__fill--muted' : ''}`}
              style={{ width: `${Math.max(3, (s.value / max) * 100)}%` }}
            />
          </div>
          <span className="funnel__count">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
