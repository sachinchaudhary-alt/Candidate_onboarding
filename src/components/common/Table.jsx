import Icon from './Icon.jsx';
import { EmptyState } from './States.jsx';

export function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nums = [];
  for (let p = 1; p <= pages; p += 1) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className="pagination">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="pagination__controls">
        <button className="pagination__btn" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <Icon name="ChevronLeft" size={14} />
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} style={{ padding: '0 4px' }}>
              …
            </span>
          ) : (
            <button
              key={n}
              className={`pagination__btn${n === page ? ' pagination__btn--active' : ''}`}
              onClick={() => onPage(n)}
            >
              {n}
            </button>
          )
        )}
        <button className="pagination__btn" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">
          <Icon name="ChevronRight" size={14} />
        </button>
      </div>
    </div>
  );
}

export function DataTable({ columns, rows, sort, onSort, renderRow, emptyProps }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={c.sortable ? 'sortable' : ''}
                onClick={c.sortable ? () => onSort(c.key) : undefined}
                style={c.width ? { width: c.width } : undefined}
              >
                <span className="row gap-1" style={{ display: 'inline-flex' }}>
                  {c.label}
                  {c.sortable && sort?.key === c.key && (
                    <Icon name={sort.dir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={12} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState {...(emptyProps || { title: 'No records found', message: 'Try changing your filters or search criteria.' })} />
              </td>
            </tr>
          ) : (
            rows.map(renderRow)
          )}
        </tbody>
      </table>
    </div>
  );
}
