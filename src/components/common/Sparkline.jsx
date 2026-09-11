/**
 * Thin full-width inline SVG sparkline. `data` = array of numbers.
 */
export default function Sparkline({ data = [], color = 'var(--color-primary)', height = 20 }) {
  if (data.length < 2) return null;
  const W = 100;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = W / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 3) - 1.5]);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
