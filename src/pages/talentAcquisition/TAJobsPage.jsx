import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon.jsx';
import TAHeader from '../../components/ta/TAHeader.jsx';
import DataGrid from '../../components/ta/DataGrid.jsx';
import Toolbar from '../../components/ta/Toolbar.jsx';
import Button from '../../components/ta/Button.jsx';
import Tag from '../../components/ta/Tag.jsx';
import CreateJobDrawer from '../../components/workflow/CreateJobDrawer.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useCollectionView } from '../../hooks/useCollectionView.js';
import { formatDate } from '../../utils/format.js';

const COLUMNS = [
  { key: 'title', label: 'Job Title', sortable: true },
  { key: 'location', label: 'Location', sortable: true },
  { key: 'workMode', label: 'Mode', sortable: true },
  { key: 'applicants', label: 'Applicants', sortable: true },
  { key: 'deadline', label: 'Deadline', sortable: true },
  { key: 'actions', label: 'Actions' },
];

/* "4–7 years" -> 4, so we can bucket jobs by the experience they ask for. */
const minYears = (exp) => parseInt(exp, 10) || 0;
const EXPERIENCE = {
  junior: { label: '0–3 years', match: (n) => n <= 3 },
  mid: { label: '3–6 years', match: (n) => n > 3 && n <= 6 },
  senior: { label: '6+ years', match: (n) => n > 6 },
};

const APPLICANTS = {
  some: { label: 'Has applicants', match: (n) => n > 0 },
  none: { label: 'No applicants yet', match: (n) => n === 0 },
};

export default function TAJobsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, jobs, createJob } = useApp();
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const counts = {};
    (data.applications || []).forEach((a) => { if (a.jobId) counts[a.jobId] = (counts[a.jobId] || 0) + 1; });
    return jobs.map((j) => ({ ...j, applicants: counts[j.id] || 0 }));
  }, [data.applications, jobs]);

  const view = useCollectionView(rows, {
    searchFields: ['title', 'department', 'id', 'location'],
    pageSize: 30,
    initialSort: { key: 'applicants', dir: 'desc' },
  });

  // Build a dropdown's options from the values that actually appear in the data.
  const optionsFor = (key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort().map((v) => ({ value: v, label: v }));
  const deptOptions = useMemo(() => optionsFor('department'), [rows]);
  const modeOptions = useMemo(() => optionsFor('workMode'), [rows]);
  const typeOptions = useMemo(() => optionsFor('employmentType'), [rows]);
  const locationOptions = useMemo(() => optionsFor('location'), [rows]);

  const strFilter = (key) => (typeof view.filters[key] === 'string' ? view.filters[key] : 'all');
  const activeDept = strFilter('department');
  const activeMode = strFilter('workMode');
  const activeType = strFilter('employmentType');
  const activeLocation = strFilter('location');

  const [exp, setExpKey] = useState('all');
  const setExp = (key) => {
    setExpKey(key);
    view.setFilter('exp', key === 'all' ? 'all' : (r) => EXPERIENCE[key].match(minYears(r.experience)));
  };
  const [applicants, setApplicantsKey] = useState('all');
  const setApplicants = (key) => {
    setApplicantsKey(key);
    view.setFilter('applicants', key === 'all' ? 'all' : (r) => APPLICANTS[key].match(r.applicants));
  };

  const chips = [
    activeDept !== 'all' && { key: 'dept', label: activeDept, onRemove: () => view.setFilter('department', 'all') },
    activeMode !== 'all' && { key: 'mode', label: activeMode, onRemove: () => view.setFilter('workMode', 'all') },
    activeType !== 'all' && { key: 'type', label: activeType, onRemove: () => view.setFilter('employmentType', 'all') },
    activeLocation !== 'all' && { key: 'loc', label: activeLocation, onRemove: () => view.setFilter('location', 'all') },
    exp !== 'all' && { key: 'exp', label: EXPERIENCE[exp].label, onRemove: () => setExp('all') },
    applicants !== 'all' && { key: 'app', label: APPLICANTS[applicants].label, onRemove: () => setApplicants('all') },
  ].filter(Boolean);

  const clearAll = () => {
    view.setFilter('department', 'all');
    view.setFilter('workMode', 'all');
    view.setFilter('employmentType', 'all');
    view.setFilter('location', 'all');
    setExp('all');
    setApplicants('all');
  };

  const totalApplicants = rows.reduce((sum, r) => sum + r.applicants, 0);

  return (
    <>
      <TAHeader title="Jobs" subtitle={`${jobs.length} open positions · ${totalApplicants} applicants in total`} />

      <Toolbar
        filters={[
          { label: 'Department', value: activeDept, onChange: (v) => view.setFilter('department', v), options: deptOptions },
          { label: 'Work mode', value: activeMode, onChange: (v) => view.setFilter('workMode', v), options: modeOptions },
          { label: 'Type', value: activeType, onChange: (v) => view.setFilter('employmentType', v), options: typeOptions },
          { label: 'Location', value: activeLocation, onChange: (v) => view.setFilter('location', v), options: locationOptions },
          { label: 'Experience', value: exp, onChange: setExp, options: Object.entries(EXPERIENCE).map(([value, g]) => ({ value, label: g.label })) },
          { label: 'Applicants', value: applicants, onChange: setApplicants, options: Object.entries(APPLICANTS).map(([value, g]) => ({ value, label: g.label })) },
        ]}
        chips={chips}
        onClearAll={chips.length > 1 ? clearAll : undefined}
        action={<Button icon="Plus" onClick={() => setOpen(true)}>Create Job</Button>}
        pager={{ page: view.page, pageSize: view.pageSize, total: view.total, onPage: view.setPage }}
      />

      <DataGrid
        columns={COLUMNS}
        rows={view.rows}
        sort={view.sort}
        onSort={view.onSort}
        pager={{ page: view.page, pageSize: view.pageSize, total: view.total, onPage: view.setPage }}
        empty={{ icon: 'Briefcase', title: 'No jobs found', message: 'Try a different search, or create a new job.' }}
        renderRow={(j) => (
          <tr key={j.id} onClick={() => navigate(`/ta/jobs/${j.id}`)} style={{ cursor: 'pointer' }}>
            <td>
              <span className="ta-cell-strong">{j.title}</span>
              {j.custom && <Tag tone="blue">New</Tag>}
              <br />
              <span className="ta-cell-sub">{j.department}</span>
            </td>
            <td className="ta-cell-mute">{j.location}</td>
            <td className="ta-cell-mute">{j.workMode}</td>
            <td><Tag tone={j.applicants ? 'blue' : 'grey'}>{j.applicants}</Tag></td>
            <td className="ta-cell-mute">{formatDate(j.deadline)}</td>
            <td>
              <span className="ta-rowactions" onClick={(e) => e.stopPropagation()}>
                <button className="ta-iconbtn" onClick={() => navigate(`/ta/jobs/${j.id}`)} aria-label="Open job"><Icon name="ChevronRight" size={17} /></button>
              </span>
            </td>
          </tr>
        )}
      />

      <CreateJobDrawer
        open={open}
        onClose={() => setOpen(false)}
        onCreate={(payload) => {
          const job = createJob(payload);
          setOpen(false);
          toast.success(`${job.title} published (${job.id}).`);
        }}
      />
    </>
  );
}
