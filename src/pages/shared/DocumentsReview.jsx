import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/common/Table.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import FilterSelect from '../../components/common/FilterSelect.jsx';
import ReasonModal from '../../components/workflow/ReasonModal.jsx';
import { ConfirmDialog } from '../../components/common/Modal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { DOC_STATUS, DOC_STATUS_META } from '../../constants/statuses.js';
import { formatDate } from '../../utils/format.js';

const COLUMNS = [
  { key: 'label', label: 'Document' },
  { key: 'candidate', label: 'Candidate' },
  { key: 'fileName', label: 'File' },
  { key: 'uploadedAt', label: 'Uploaded' },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Action' },
];

export default function DocumentsReview({ basePath }) {
  const { data, getApplication, verifyDocument, rejectDocument } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [rejecting, setRejecting] = useState(null);
  const [verifying, setVerifying] = useState(null);

  const rows = useMemo(
    () =>
      (data.documents || [])
        .map((d) => {
          const app = getApplication(d.applicationId);
          if (!app) return null;
          return { ...d, candidate: `${app.personal.firstName} ${app.personal.lastName}`, candidateId: app.candidateId };
        })
        .filter(Boolean)
        .filter((r) => {
          const t = q.trim().toLowerCase();
          return (!t || r.candidate.toLowerCase().includes(t) || r.label.toLowerCase().includes(t)) && (status === 'all' || r.status === status);
        })
        .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || '')),
    [data.documents, q, status, getApplication]
  );

  const pendingCount = rows.filter((r) => r.status === DOC_STATUS.UPLOADED).length;

  return (
    <div className="page-body">
      <h1 className="page-title mb-2">Document verification</h1>
      <p className="text-secondary text-small mb-4">{pendingCount} document(s) awaiting verification.</p>
      <div className="toolbar">
        <SearchBar value={q} onChange={setQ} placeholder="Search candidate or document" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={Object.entries(DOC_STATUS_META).map(([value, m]) => ({ value, label: m.label }))}
        />
      </div>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        emptyProps={{ icon: 'Files', title: 'No documents found' }}
        renderRow={(r) => {
          const m = DOC_STATUS_META[r.status];
          return (
            <tr key={r.id}>
              <td className="strong">{r.label}</td>
              <td>
                <button className="btn btn--ghost btn--sm" onClick={() => navigate(`${basePath}/candidates/${r.candidateId}`)}>
                  {r.candidate}
                </button>
              </td>
              <td>{r.fileName || '—'}</td>
              <td>{r.uploadedAt ? formatDate(r.uploadedAt) : '—'}</td>
              <td>
                <Badge tone={m.tone} icon={m.icon}>{m.label}</Badge>
                {r.status === DOC_STATUS.REJECTED && <div className="text-xs text-secondary">{r.rejectionReason}</div>}
              </td>
              <td>
                <div className="row gap-1">
                  <Button size="sm" variant="ghost" icon="Eye" disabled={!r.fileName} onClick={() => toast.info(`Previewing ${r.fileName} (simulated).`)}>
                    View
                  </Button>
                  {r.status === DOC_STATUS.UPLOADED && (
                    <>
                      <Button size="sm" variant="success" icon="CheckCircle2" onClick={() => setVerifying(r)}>
                        Verify
                      </Button>
                      <Button size="sm" variant="danger" icon="XCircle" onClick={() => setRejecting(r)}>
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        }}
      />
      <ReasonModal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject "${rejecting?.label}"`}
        label="Document Rejection Reason"
        confirmLabel="Reject Document"
        tone="danger"
        onSubmit={(reason) => { rejectDocument(rejecting.id, reason); setRejecting(null); toast.success('Document rejected — candidate notified.'); }}
      />
      <ConfirmDialog
        open={!!verifying}
        onClose={() => setVerifying(null)}
        title={`Verify "${verifying?.label}"?`}
        message="This marks the document as verified on record."
        confirmLabel="Verify"
        onConfirm={() => { verifyDocument(verifying.id); toast.success('Document verified.'); setVerifying(null); }}
      />
    </div>
  );
}
