import { useState } from 'react';
import Button from '../common/Button.jsx';
import { Badge } from '../common/Badge.jsx';
import ReasonModal from './ReasonModal.jsx';
import { DataTable } from '../common/Table.jsx';
import { DOC_STATUS, DOC_STATUS_META } from '../../constants/statuses.js';
import { formatDate } from '../../utils/format.js';
import { useToast } from '../../context/ToastContext.jsx';

const COLUMNS = [
  { key: 'label', label: 'Document' },
  { key: 'candidate', label: 'Candidate' },
  { key: 'fileName', label: 'File' },
  { key: 'uploadedAt', label: 'Uploaded' },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Action' },
];

export default function DocumentTable({ documents, candidateName, onVerify, onReject, showCandidate }) {
  const toast = useToast();
  const [rejecting, setRejecting] = useState(null);

  const columns = showCandidate ? COLUMNS : COLUMNS.filter((c) => c.key !== 'candidate');

  return (
    <>
      <DataTable
        columns={columns}
        rows={documents}
        emptyProps={{ icon: 'Files', title: 'No documents yet' }}
        renderRow={(doc) => {
          const m = DOC_STATUS_META[doc.status];
          return (
            <tr key={doc.id}>
              <td className="strong">
                {doc.label}
                {doc.required && <span style={{ color: 'var(--color-error)' }}> *</span>}
              </td>
              {showCandidate && <td>{candidateName}</td>}
              <td>{doc.fileName || '—'}</td>
              <td>{doc.uploadedAt ? formatDate(doc.uploadedAt) : '—'}</td>
              <td>
                <Badge tone={m.tone} icon={m.icon}>
                  {m.label}
                </Badge>
                {doc.status === DOC_STATUS.REJECTED && (
                  <div className="text-xs text-secondary">{doc.rejectionReason}</div>
                )}
              </td>
              <td>
                <div className="row gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="Eye"
                    disabled={!doc.fileName}
                    onClick={() => toast.info(`Previewing ${doc.fileName} (simulated).`)}
                  >
                    View
                  </Button>
                  {doc.status === DOC_STATUS.UPLOADED && (
                    <>
                      <Button size="sm" variant="success" icon="CheckCircle2" onClick={() => onVerify(doc.id)}>
                        Verify
                      </Button>
                      <Button size="sm" variant="danger" icon="XCircle" onClick={() => setRejecting(doc)}>
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
        onSubmit={(reason) => {
          onReject(rejecting.id, reason);
          setRejecting(null);
        }}
      />
    </>
  );
}
