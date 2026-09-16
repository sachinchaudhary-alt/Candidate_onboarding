import { useEffect, useState } from 'react';
import Icon from './common/Icon.jsx';
import Button from './ta/Button.jsx';
import EmptyState from './ta/EmptyState.jsx';
import Pager from './ta/Pager.jsx';
import JobCard from './JobCard.jsx';
import JobFilters from './JobFilters.jsx';

const PAGE_SIZE = 30;

/* Job browser: one search bar on top, then the list on the left and the filter
   panel on the right. Shared by the careers landing page and the jobs page.
   The list is paginated — 30 roles per page, numbered pager above the list. */
export default function JobBrowser({ f }) {
  const [page, setPage] = useState(1);

  // Back to page 1 whenever the filters change the result set.
  useEffect(() => {
    setPage(1);
  }, [f.q, f.dept, f.mode, f.type, f.exp]);

  const total = f.filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const pageJobs = f.filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goPage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="cx-jobsearch">
        <Icon name="Search" size={17} />
        <input
          value={f.q}
          placeholder="Search jobs by title, skill or keyword"
          onChange={(e) => f.setQ(e.target.value)}
        />
        {f.q && (
          <button type="button" className="cx-jobsearch__clear" onClick={() => f.setQ('')} aria-label="Clear search">
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      <div className="cx-jobs-grid">
        <div className="cx-jobs-grid__main">
          {total === 0 ? (
            <EmptyState
              icon="SearchX"
              title="No roles match your filters"
              message="Try a different keyword or clear the filters."
              action={<Button variant="ghost" onClick={f.clear}>Clear filters</Button>}
            />
          ) : (
            <>
              {total > PAGE_SIZE && (
                <div className="cx-jobpager">
                  <Pager page={safePage} pageSize={PAGE_SIZE} total={total} onPage={goPage} />
                </div>
              )}
              <div className="cx-joblist">
                {pageJobs.map((job) => <JobCard key={job.id} job={job} />)}
              </div>
            </>
          )}
        </div>
        <JobFilters f={f} />
      </div>
    </>
  );
}
