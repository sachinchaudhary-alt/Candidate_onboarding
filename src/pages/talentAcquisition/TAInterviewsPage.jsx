import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/common/Table.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import FilterSelect from '../../components/common/FilterSelect.jsx';
import InterviewResultModal from '../../components/workflow/InterviewResultModal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROUND_STATUS, ROUND_STATUS_META, INTERVIEW_TYPES } from '../../constants/statuses.js';
import { formatDate } from '../../utils/format.js';

const COLUMNS = [
  { key: 'candidate', label: 'Candidate' },
  { key: 'round', label: 'Round' },
  { key: 'type', label: 'Type' },
  { key: 'when', label: 'Date & Time' },
  { key: 'mode', label: 'Mode' },
  { key: 'interviewer', label: 'Interviewer' },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Action' },
];

export default function TAInterviewsPage() {
  const { data, getApplication, recordInterviewResult } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [resultFor, setResultFor] = useState(null);

  const rows = useMemo(() => {
    return (data.interviews || [])
      .map((iv) => {
        const app = getApplication(iv.applicationId);
        if (!app) return null;
        return {
          ...iv,
          candidate: `${app.personal.firstName} ${app.personal.lastName}`,
          candidateId: app.candidateId,
        };
      })
      .filter(Boolean)
      .filter((r) => {
        const t = q.trim().toLowerCase();
        return (
          (!t || r.candidate.toLowerCase().includes(t) || r.candidateId.toLowerCase().includes(t)) &&
          (type === 'all' || r.type === type) &&
          (status === 'all' || r.status === status)
        );
      })
      .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
  }, [data.interviews, q, type, status, getApplication]);

  return (
    <div className="page-body">
      <h1 className="page-title mb-4">Interviews</h1>
      <div className="toolbar">
        <SearchBar value={q} onChange={setQ} placeholder="Search candidate" />
        <FilterSelect label="Type" value={type} onChange={setType} options={INTERVIEW_TYPES} />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={Object.entries(ROUND_STATUS_META).map(([value, m]) => ({ value, label: m.label }))}
        />
      </div>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        emptyProps={{ icon: 'CalendarDays', title: 'No interviews found' }}
        renderRow={(r) => {
          const m = ROUND_STATUS_META[r.status];
          return (
            <tr key={r.id}>
              <td className="strong">{r.candidate}</td>
              <td>Round {r.round}</td>
              <td>{r.type}</td>
              <td>{formatDate(r.date)} · {r.time}</td>
              <td>{r.mode}</td>
              <td>{r.interviewer}</td>
              <td><Badge tone={m.tone} icon={m.icon}>{m.label}</Badge></td>
              <td>
                <div className="row gap-1">
                  {r.status === ROUND_STATUS.SCHEDULED && (
                    <Button size="sm" variant="secondary" icon="ClipboardCheck" onClick={() => setResultFor(r)}>
                      Result
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" icon="Eye" onClick={() => navigate(`/ta/candidates/${r.candidateId}`)}>
                    Candidate
                  </Button>
                </div>
              </td>
            </tr>
          );
        }}
      />
      <InterviewResultModal
        open={!!resultFor}
        onClose={() => setResultFor(null)}
        interview={resultFor}
        onSave={(res) => {
          recordInterviewResult(resultFor.id, res);
          setResultFor(null);
          toast.success('Interview result saved.');
        }}
      />
    </div>
  );
}
