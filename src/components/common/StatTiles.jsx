/**
 * Compact stat-tile row for list / pipeline pages.
 * tiles = [{ n, label, tone?: 'accent' | 'warn', onClick?, active? }]
 */
export default function StatTiles({ tiles }) {
  return (
    <div className="stat-tiles">
      {tiles.map((t) => {
        const cls = [
          'stat-tile',
          t.tone ? `stat-tile--${t.tone}` : '',
          t.onClick ? 'stat-tile--link' : '',
          t.active ? 'stat-tile--active' : '',
        ]
          .filter(Boolean)
          .join(' ');
        if (t.onClick) {
          return (
            <button key={t.label} type="button" className={cls} onClick={t.onClick} aria-pressed={!!t.active}>
              <div className="stat-tile__n">{t.n}</div>
              <div className="stat-tile__l">{t.label}</div>
            </button>
          );
        }
        return (
          <div key={t.label} className={cls}>
            <div className="stat-tile__n">{t.n}</div>
            <div className="stat-tile__l">{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}
