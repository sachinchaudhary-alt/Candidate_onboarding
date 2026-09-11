import Icon from '../common/Icon.jsx';

/* Numbered pagination with a sliding window of 5 page buttons (1–5, then
   6–10, …). The « / » arrows step one page; the … buttons jump a window.
   - default: a full row with "Showing 1–30 of 248" on the left.
   - `compact`: just the controls, for sitting inside the filter row. */
const WINDOW = 5;

export default function Pager({ page, pageSize, total, onPage, place, compact }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const windowStart = Math.floor((page - 1) / WINDOW) * WINDOW + 1;
  const windowEnd = Math.min(pages, windowStart + WINDOW - 1);
  const nums = [];
  for (let p = windowStart; p <= windowEnd; p += 1) nums.push(p);

  const go = (p) => onPage(Math.min(pages, Math.max(1, p)));

  return (
    <div className={`ta-pager${compact ? ' ta-pager--compact' : ''}${place === 'top' ? ' ta-pager--top' : ''}`}>
      {!compact && <span>Showing {from}–{to} of {total}</span>}
      <div className="ta-pager__nums">
        <button className="ta-pager__btn" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <Icon name="ChevronLeft" size={14} />
        </button>

        {windowStart > 1 && (
          <button className="ta-pager__btn" onClick={() => go(windowStart - 1)} aria-label="Previous pages">…</button>
        )}

        {nums.map((n) => (
          <button
            key={n}
            className={`ta-pager__btn${n === page ? ' ta-pager__btn--active' : ''}`}
            onClick={() => go(n)}
          >
            {n}
          </button>
        ))}

        {windowEnd < pages && (
          <button className="ta-pager__btn" onClick={() => go(windowEnd + 1)} aria-label="More pages">…</button>
        )}

        <button className="ta-pager__btn" onClick={() => go(page + 1)} disabled={page >= pages} aria-label="Next page">
          <Icon name="ChevronRight" size={14} />
        </button>
      </div>
    </div>
  );
}
