import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { Field, Input, Select } from '../common/Field.jsx';
import { todayISO } from '../../utils/format.js';

/* The offer letter is prepared and sent OUTSIDE the app. All the TA records
   here are the few facts the rest of the system needs downstream: which team
   the person joins and when. Acceptance is confirmed separately. */
const DEPARTMENTS = ['Sales', 'Human Resource', 'Talent Acquisition', 'SAP ABAP', 'SAP Functional'];

export default function OfferDrawer({ open, onClose, application, job, existingOffer, onSave }) {
  const [f, setF] = useState(() => ({
    candidateName: existingOffer?.candidateName || `${application.personal.firstName} ${application.personal.lastName}`,
    jobTitle: existingOffer?.jobTitle || application.jobTitle,
    department: existingOffer?.department || job?.department || DEPARTMENTS[0],
    location: existingOffer?.location || job?.location || '',
    joiningDate: existingOffer?.joiningDate || todayISO(),
    reportingManager: existingOffer?.reportingManager || '',
    employmentType: existingOffer?.employmentType || job?.employmentType || 'Full-time',
    compensation: existingOffer?.compensation || '',
    probationPeriod: existingOffer?.probationPeriod || '6 months',
    benefits: existingOffer?.benefits || '',
  }));
  const [error, setError] = useState('');
  const [compError, setCompError] = useState('');
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

  const save = () => {
    const noJoiningDate = !f.joiningDate;
    const badCompensation = !f.compensation || Number.isNaN(Number(f.compensation));
    setError(noJoiningDate ? 'Expected joining date is required.' : '');
    setCompError(badCompensation ? 'Enter a valid compensation amount.' : '');
    if (noJoiningDate || badCompensation) return;
    onSave(f, true);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existingOffer ? 'Update extended offer' : 'Record extended offer'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="Send" onClick={save}>Mark offer as extended</Button>
        </>
      }
    >
      <p className="ta-cell-sub" style={{ marginBottom: 14 }}>
        Prepare and send the offer letter to <strong>{f.candidateName}</strong> over email as usual.
        Record the key details below so HR can plan the joining — you'll confirm acceptance here once
        the candidate replies.
      </p>
      <div className="form-grid">
        <Field label="Candidate"><Input value={f.candidateName} disabled /></Field>
        <Field label="Position"><Input value={f.jobTitle} disabled /></Field>
        <Field label="Department">
          <Select value={f.department} onChange={(e) => set({ department: e.target.value })} options={DEPARTMENTS} />
        </Field>
        <Field label="Expected joining date" required error={error}>
          <Input type="date" value={f.joiningDate} onChange={(e) => set({ joiningDate: e.target.value })} error={error} />
        </Field>
        <Field label="Compensation (₹ / year)" required error={compError}>
          <Input type="number" value={f.compensation} onChange={(e) => set({ compensation: e.target.value })} error={compError} placeholder="e.g. 1800000" />
        </Field>
        <Field label="Reporting manager" full>
          <Input value={f.reportingManager} onChange={(e) => set({ reportingManager: e.target.value })} placeholder="Optional" />
        </Field>
      </div>
    </Modal>
  );
}
