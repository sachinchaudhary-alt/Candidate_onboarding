import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/common/Table.jsx';
import { Badge, StatusBadge } from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import FilterSelect from '../../components/common/FilterSelect.jsx';
import OfferDrawer from '../../components/workflow/OfferDrawer.jsx';
import { EmptyState } from '../../components/common/States.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { APP_STATUS, OFFER_STATUS, OFFER_STATUS_META } from '../../constants/statuses.js';
import { findJob } from '../../data/jobs.js';
import { formatDate, formatCurrencyINR } from '../../utils/format.js';

const COLUMNS = [
  { key: 'candidate', label: 'Candidate' },
  { key: 'job', label: 'Position' },
  { key: 'joiningDate', label: 'Joining Date' },
  { key: 'compensation', label: 'Compensation' },
  { key: 'status', label: 'Offer Status' },
  { key: 'action', label: 'Action' },
];

export default function TAOffersPage() {
  const { data, getApplication, offerFor, saveOffer, confirmOfferAccepted } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [prepareApp, setPrepareApp] = useState(null);

  const readyToPrepare = (data.applications || []).filter((a) => a.status === APP_STATUS.DOCS_VERIFIED && !offerFor(a.id));

  const rows = useMemo(
    () =>
      (data.offers || [])
        .map((o) => {
          const app = getApplication(o.applicationId);
          return app ? { ...o, candidate: o.candidateName, candidateId: app.candidateId, job: o.jobTitle } : null;
        })
        .filter(Boolean)
        .filter((r) => {
          const t = q.trim().toLowerCase();
          return (!t || r.candidate.toLowerCase().includes(t) || r.job.toLowerCase().includes(t)) && (status === 'all' || r.status === status);
        }),
    [data.offers, q, status, getApplication]
  );

  return (
    <div className="page-body">
      <h1 className="page-title mb-4">Offers</h1>

      {readyToPrepare.length > 0 && (
        <div className="card mb-4">
          <div className="card__header">
            <h3 className="section-title">Ready for offer</h3>
          </div>
          <div className="card__body stack gap-2">
            {readyToPrepare.map((a) => (
              <div className="round-card" key={a.id}>
                <div className="round-card__head">
                  <div>
                    <div className="strong">{a.personal.firstName} {a.personal.lastName}</div>
                    <div className="text-xs text-secondary">{a.candidateId} · {a.jobTitle} · all documents verified</div>
                  </div>
                  <Button size="sm" icon="FileCheck" onClick={() => setPrepareApp(a)}>
                    Record extended offer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="toolbar">
        <SearchBar value={q} onChange={setQ} placeholder="Search candidate or position" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={Object.entries(OFFER_STATUS_META).map(([value, m]) => ({ value, label: m.label }))}
        />
      </div>

      {rows.length === 0 && readyToPrepare.length === 0 ? (
        <EmptyState icon="FileCheck" title="No offers yet" message="Offers appear here once a candidate clears document verification." />
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={rows}
          emptyProps={{ icon: 'FileCheck', title: 'No offers match your filters' }}
          renderRow={(r) => {
            const m = OFFER_STATUS_META[r.status];
            return (
              <tr key={r.id}>
                <td className="strong">{r.candidate}</td>
                <td>{r.job}</td>
                <td>{formatDate(r.joiningDate)}</td>
                <td>{formatCurrencyINR(r.compensation)}</td>
                <td><Badge tone={m.tone} icon={m.icon}>{m.label}</Badge></td>
                <td>
                  <div className="row gap-2">
                    {r.status === OFFER_STATUS.ISSUED && (
                      <Button
                        size="sm"
                        icon="CheckCircle2"
                        onClick={() => { confirmOfferAccepted(r.id); toast.success(`${r.candidate}'s acceptance confirmed — handed over to HR.`); }}
                      >
                        Confirm accepted
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" icon="Eye" onClick={() => navigate(`/ta/candidates/${r.candidateId}`)}>
                      Open
                    </Button>
                  </div>
                </td>
              </tr>
            );
          }}
        />
      )}

      {prepareApp && (
        <OfferDrawer
          open
          onClose={() => setPrepareApp(null)}
          application={prepareApp}
          job={prepareApp.jobId ? findJob(prepareApp.jobId) : null}
          existingOffer={null}
          onSave={(payload) => {
            saveOffer(prepareApp.id, payload, true);
            setPrepareApp(null);
            toast.success('Extended offer recorded — awaiting the candidate\'s response.');
          }}
        />
      )}
    </div>
  );
}
