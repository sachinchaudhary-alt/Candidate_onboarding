import { useState } from 'react';

/* Stage funnel — coloured trapezoid bands that narrow down the pipeline.
   Hover a band: it lifts, glints, and the rest dim. The % sits to its right.
   `stages` = [{ label, value }] in pipeline order.
   `labelMode`: 'pct' (share of the first stage, default) or 'count' (raw number). */
const RAMP = ['#4b7bf7', '#8b7ff0', '#f6a04a', '#46c98a', '#a5ddc2', '#c7e8d6'];

export default function FunnelChart({ stages, labelMode = 'pct', onSegmentClick }) {
  const [hover, setHover] = useState(null);
  const clickable = typeof onSegmentClick === 'function';
  const first = stages[0]?.value || 1;
  const pct = (s) => Math.round((s.value / first) * 100);
  const max = Math.max(1, ...stages.map((s) => s.value));
  const bandH = 42;
  const gap = 4;
  const vbW = 240;
  const vbH = stages.length * bandH;
  const cx = 92;
  const widthFor = (v) => Math.max(16, (v / max) * 150);

  return (
    <div className="ta-chartbox" onMouseLeave={() => setHover(null)}>
      <svg className="ta-funnel" viewBox={`0 0 ${vbW} ${vbH}`} role="img" aria-label="Pipeline funnel">
        <defs>
          <linearGradient id="taFunnelGlint" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            <animateTransform
              attributeName="gradientTransform" type="translate"
              values="-1.2 0; 1.2 0; 1.2 0" keyTimes="0; 0.45; 1"
              dur="3s" repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
        {stages.map((s, i) => {
          const y = i * bandH;
          const wTop = widthFor(s.value);
          const wBot = widthFor(stages[i + 1]?.value ?? s.value);
          const points = [
            `${cx - wTop / 2},${y + gap / 2}`,
            `${cx + wTop / 2},${y + gap / 2}`,
            `${cx + wBot / 2},${y + bandH - gap / 2}`,
            `${cx - wBot / 2},${y + bandH - gap / 2}`,
          ].join(' ');
          const active = hover === i;
          const dim = hover != null && !active;
          return (
            <g
              key={s.label}
              className="ta-funnel__band"
              style={{ transform: active ? 'translateY(-3px)' : 'none', opacity: dim ? 0.4 : 1, cursor: clickable ? 'pointer' : 'default' }}
              onMouseEnter={() => setHover(i)}
              onClick={clickable ? () => onSegmentClick(i) : undefined}
            >
              <polygon points={points} fill={RAMP[i] || RAMP[RAMP.length - 1]} />
              {active && <polygon points={points} fill="url(#taFunnelGlint)" style={{ pointerEvents: 'none' }} />}
              <line x1={cx + wTop / 2} y1={y + bandH / 2} x2={206} y2={y + bandH / 2} stroke="var(--ta-line)" strokeWidth="1" />
              <text className="ta-funnel__pct" x={210} y={y + bandH / 2} dominantBaseline="central">
                {labelMode === 'count' ? s.value : `${pct(s)}%`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
