import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/common/Icon.jsx';
import TAHeader from '../../components/ta/TAHeader.jsx';
import DataGrid from '../../components/ta/DataGrid.jsx';
import Toolbar from '../../components/ta/Toolbar.jsx';
import Tag from '../../components/ta/Tag.jsx';
import AssignTAModal from '../../components/workflow/AssignTAModal.jsx';
import { ConfirmDialog } from '../../components/common/Modal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useCollectionView } from '../../hooks/useCollectionView.js';
import { APP_STATUS, DOC_STATUS, stageBadgeForStatus } from '../../constants/statuses.js';
import { TA_TEAM } from '../../constants/taTeam.js';
import { formatDate } from '../../utils/format.js';

/* Friendly stage buckets for the filter dropdown. */
const STAGE_GROUPS = {
  applied: { label: 'Applied', match: (s) => [APP_STATUS.SUBMITTED, APP_STATUS.RETURNED].includes(s) },
  screening: { label: 'Screening', match: (s) => s === APP_STATUS.TA_REVIEW },
  interview: { label: 'Interview', match: (s) => [APP_STATUS.INTERVIEW_PLANNING, APP_STATUS.INTERVIEW_IN_PROGRESS, APP_STATUS.INTERVIEW_PASSED].includes(s) },
  documents: { label: 'Documents', match: (s) => [APP_STATUS.DOC_VERIFICATION, APP_STATUS.DOCS_VERIFIED].includes(s) },
  offer: { label: 'Offer', match: (s) => [APP_STATUS.OFFER_DRAFT, APP_STATUS.OFFER_ISSUED, APP_STATUS.OFFER_ACCEPTED].includes(s) },
  hired: {
    label: 'Hired',
    match: (s) => [APP_STATUS.ONBOARDING_PENDING, APP_STATUS.HR_VERIFICATION, APP_STATUS.HR_VERIFICATION_REJECTED, APP_STATUS.JOINING_PENDING, APP_STATUS.EMPLOYEE].includes(s),
  },
  rejected: { label: 'Rejected', match: (s) => [APP_STATUS.REJECTED, APP_STATUS.INTERVIEW_FAILED].includes(s) },
};

const EXPERIENCE = {
  junior: { label: '0–3 years', match: (n) => n <= 3 },
  mid: { label: '3–6 years', match: (n) => n > 3 && n <= 6 },
  senior: { label: '6+ years', match: (n) => n > 6 },
};

const SOURCES = ['Direct', 'Job Board', 'Referral', 'Social'];

// Same notice-period options offered on the apply form, so the filter matches the stored values.
const NOTICE_PERIODS = ['Immediate', '15 days', '30 days', '45 days', '60 days', '90 days'];

function experienceLabel(n) {
  return n <= 0 ? 'Fresher' : `${n}+ Years`;
}

const COLUMNS = [
  { key: 'name', label: 'Candidate', sortable: true },
  { key: 'job', label: 'Job Applied', sortable: true },
  { key: 'experience', label: 'Experience', sortable: true },
  { key: 'status', label: 'Current Stage', sortable: true },
  { key: 'assignedTo', label: 'Assigned To', sortable: true },
  { key: 'noticePeriod', label: 'Notice Period', sortable: true },
  { key: 'submittedAt', label: 'Applied On', sortable: true },
  { key: 'docs', label: 'Documents' },
  { key: 'actions', label: 'Actions' },
];

export default function TACandidatesPage() {
  const navigate = useNavigate();
  const { data, getJob, documentsFor, isTAHead, taIdentity, assignApplicationToTA } = useApp();
  const toast = useToast();
  const [sp] = useSearchParams();
  const [assignFor, setAssignFor] = useState(null); // { id, name, assignedTo } | null
  const [pendingAssign, setPendingAssign] = useState(null); // { id, name, taName } | null
  const apps = data.applications || [];

  const rows = useMemo(
    () =>
      apps.map((a) => {
        const job = getJob(a.jobId);
        const docs = documentsFor(a.id);
        const verified = docs.filter((d) => d.status === DOC_STATUS.VERIFIED).length;
        const rejected = docs.filter((d) => d.status === DOC_STATUS.REJECTED).length;
        return {
          id: a.id,
          candidateId: a.candidateId,
          name: `${a.personal.firstName} ${a.personal.lastName}`,
          email: a.personal.email,
          job: a.jobTitle,
          department: job?.department || 'General',
          experience: Number(a.professional.totalExperience) || 0,
          source: a.source || 'Direct',
          assignedTo: a.assignedTo || null,
          noticePeriod: a.professional?.noticePeriod || 'Not specified',
          submittedAt: a.submittedAt,
          status: a.status,
          docs: rejected ? { tone: 'red', text: `${rejected} rejected` }
            : docs.length && verified === docs.length ? { tone: 'green', text: 'All verified' }
            : verified ? { tone: 'amber', text: `${verified}/${docs.length} verified` }
            : { tone: 'grey', text: '—' },
        };
      }),
    [apps, getJob, documentsFor]
  );

  const stageParam = STAGE_GROUPS[sp.get('stage')] ? sp.get('stage') : 'all';
  const jobParam = sp.get('job') || null;
  const noticeParam = sp.get('notice') || null; // set when arriving from the dashboard's notice-period chart
  const sourceParam = SOURCES.includes(sp.get('source')) ? sp.get('source') : null; // dashboard source donut
  const assignedRaw = sp.get('assignedTo');
  const assignedParam = assignedRaw === 'unassigned' || TA_TEAM.includes(assignedRaw) ? assignedRaw : null;
  const [stage, setStageKey] = useState(stageParam);
  const [experience, setExpKey] = useState('all');

  const initialFilters = {};
  if (stageParam !== 'all') initialFilters.status = (r) => STAGE_GROUPS[stageParam].match(r.status);
  if (jobParam) initialFilters.job = jobParam;
  if (noticeParam) initialFilters.noticePeriod = noticeParam;
  if (sourceParam) initialFilters.source = sourceParam;
  if (assignedParam) {
    initialFilters.assignedTo = assignedParam === 'unassigned' ? (r) => !r.assignedTo : (r) => r.assignedTo === assignedParam;
  } else if (!isTAHead) {
    // Regular TAs land on their own queue by default — they can still pick a
    // different name from the dropdown, but the Head is the only one who
    // sees "Unassigned" and can hand a lead to someone else.
    initialFilters.assignedTo = (r) => r.assignedTo === taIdentity;
  }

  const view = useCollectionView(rows, {
    searchFields: ['name', 'email', 'candidateId', 'job'],
    pageSize: 30,
    initialSort: { key: 'submittedAt', dir: 'desc' },
    initialFilters: Object.keys(initialFilters).length ? initialFilters : undefined,
  });

  const jobOptions = useMemo(
    () => [...new Set(rows.map((r) => r.job))].sort().map((j) => ({ value: j, label: j })),
    [rows]
  );

  const activeJob = typeof view.filters.job === 'string' ? view.filters.job : 'all';
  const activeSource = typeof view.filters.source === 'string' ? view.filters.source : 'all';
  const activeNotice = typeof view.filters.noticePeriod === 'string' ? view.filters.noticePeriod : 'all';

  // Only the Head can see the Unassigned queue or browse everyone's candidates —
  // a regular TA's dropdown is scoped to picking a specific TA (defaults to themself).
  const defaultAssignee = isTAHead ? 'all' : taIdentity;
  const assigneeOptions = isTAHead
    ? [{ value: 'all', label: 'All' }, { value: 'unassigned', label: 'Unassigned' }, ...TA_TEAM.map((t) => ({ value: t, label: t }))]
    : TA_TEAM.map((t) => ({ value: t, label: t }));
  const [assignee, setAssigneeKey] = useState(assignedParam || defaultAssignee);

  const setStage = (key) => {
    setStageKey(key);
    view.setFilter('status', key === 'all' ? 'all' : (r) => STAGE_GROUPS[key].match(r.status));
  };
  const setExperience = (key) => {
    setExpKey(key);
    view.setFilter('experience', key === 'all' ? 'all' : (r) => EXPERIENCE[key].match(r.experience));
  };
  const setAssignee = (key) => {
    setAssigneeKey(key);
    view.setFilter('assignedTo', key === 'all' ? 'all' : key === 'unassigned' ? (r) => !r.assignedTo : (r) => r.assignedTo === key);
  };

  // The dropdowns / search box already show what's active — no chip row,
  // just a "Clear filters" affordance.
  const hasFilters = stage !== 'all' || experience !== 'all' || activeJob !== 'all'
    || activeSource !== 'all' || activeNotice !== 'all' || assignee !== defaultAssignee || !!view.query;

  const clearAll = () => {
    view.setQuery('');
    setStage('all');
    setExperience('all');
    view.setFilter('job', 'all');
    view.setFilter('source', 'all');
    view.setFilter('noticePeriod', 'all');
    setAssignee(defaultAssignee);
  };

  // Re-apply filters when the page is already open and the URL params change
  // (e.g. clicking a second dashboard tile). The first run is handled by initialFilters.
  const spKey = `${sp.get('stage') || ''}|${sp.get('job') || ''}|${sp.get('notice') || ''}|${sp.get('source') || ''}|${sp.get('assignedTo') || ''}`;
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) { firstSync.current = false; return; }
    setStage(stageParam);
    view.setFilter('job', jobParam || 'all');
    view.setFilter('noticePeriod', noticeParam || 'all');
    view.setFilter('source', sourceParam || 'all');
    setAssignee(assignedParam || defaultAssignee);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spKey]);

  // Re-apply the "Assigned To" default when the acting TA identity changes
  // (ProfileMenu → Acting as) while this page stays mounted — otherwise a
  // non-head TA who was viewing "All"/"Unassigned" as the Head keeps seeing
  // it after switching to a regular TA identity.
  const identityKey = `${taIdentity}|${isTAHead}`;
  const firstIdentitySync = useRef(true);
  useEffect(() => {
    if (firstIdentitySync.current) { firstIdentitySync.current = false; return; }
    setAssignee(assignedParam || defaultAssignee);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey]);

  return (
    <>
      <TAHeader title="Candidates" subtitle="Manage and track candidates through the recruitment process." />

      <Toolbar
        filters={[
          { label: 'Stage', value: stage, onChange: setStage, options: Object.entries(STAGE_GROUPS).map(([value, g]) => ({ value, label: g.label })) },
          { label: 'Job', value: activeJob, onChange: (v) => view.setFilter('job', v), options: jobOptions },
          { label: 'Experience', value: experience, onChange: setExperience, options: Object.entries(EXPERIENCE).map(([value, g]) => ({ value, label: g.label })) },
          { label: 'Source', value: activeSource, onChange: (v) => view.setFilter('source', v), options: SOURCES.map((s) => ({ value: s, label: s })) },
          { label: 'Notice Period', value: activeNotice, onChange: (v) => view.setFilter('noticePeriod', v), options: NOTICE_PERIODS.map((n) => ({ value: n, label: n })) },
          ...(isTAHead ? [{ label: 'Assigned To', value: assignee, onChange: setAssignee, options: assigneeOptions }] : []),
        ]}
        onClearAll={hasFilters ? clearAll : undefined}
        pager={{ page: view.page, pageSize: view.pageSize, total: view.total, onPage: view.setPage }}
      />

      <DataGrid
        columns={COLUMNS}
        rows={view.rows}
        sort={view.sort}
        onSort={view.onSort}
        pager={{ page: view.page, pageSize: view.pageSize, total: view.total, onPage: view.setPage }}
        empty={{ icon: 'Users', title: 'No candidates match', message: 'Try changing the filters or search.' }}
        renderRow={(r) => {
          const badge = stageBadgeForStatus(r.status);
          return (
            <tr key={r.id} onClick={() => navigate(`/ta/candidates/${r.candidateId}`)} style={{ cursor: 'pointer' }}>
              <td>
                <span className="ta-cell-cand__name">{r.name}</span><br />
                <span className="ta-cell-cand__sub">{r.email}</span>
              </td>
              <td>
                <span className="ta-cell-strong">{r.job}</span><br />
                <span className="ta-cell-sub">{r.department}</span>
              </td>
              <td className="ta-cell-mute">{experienceLabel(r.experience)}</td>
              <td><Tag tone={badge.tone}>{badge.label}</Tag></td>
              <td>{r.assignedTo ? <span className="ta-cell-mute">{r.assignedTo}</span> : <Tag tone="grey">Unassigned</Tag>}</td>
              <td className="ta-cell-mute">{r.noticePeriod}</td>
              <td className="ta-cell-mute">{formatDate(r.submittedAt)}</td>
              <td>{r.docs.text === '—' ? <span className="ta-cell-mute">—</span> : <Tag tone={r.docs.tone}>{r.docs.text}</Tag>}</td>
              <td>
                <span className="ta-rowactions" onClick={(e) => e.stopPropagation()}>
                  <a className="ta-iconbtn" href={`mailto:${r.email}`} aria-label={`Email ${r.name}`}><Icon name="Mail" size={15} /></a>
                  {isTAHead && (
                    <button className="ta-iconbtn" onClick={() => setAssignFor(r)} aria-label={`Assign ${r.name} to a TA`}><Icon name="UserRoundCog" size={15} /></button>
                  )}
                  <button className="ta-iconbtn" onClick={() => navigate(`/ta/candidates/${r.candidateId}`)} aria-label="Open candidate"><Icon name="ChevronRight" size={17} /></button>
                </span>
              </td>
            </tr>
          );
        }}
      />

      <AssignTAModal
        open={!!assignFor}
        name={assignFor?.name}
        initialTA={assignFor?.assignedTo || ''}
        onClose={() => setAssignFor(null)}
        onAssign={(taName) => { setPendingAssign({ id: assignFor.id, name: assignFor.name, taName }); setAssignFor(null); }}
      />
      <ConfirmDialog
        open={!!pendingAssign}
        onClose={() => setPendingAssign(null)}
        title={`Assign ${pendingAssign?.name || ''} to ${pendingAssign?.taName || 'this TA'}?`}
        message="This TA becomes the owner of this candidate going forward."
        confirmLabel="Assign"
        onConfirm={() => { assignApplicationToTA(pendingAssign.id, pendingAssign.taName); toast.success(`Assigned to ${pendingAssign.taName}.`); setPendingAssign(null); }}
      />
    </>
  );
}
