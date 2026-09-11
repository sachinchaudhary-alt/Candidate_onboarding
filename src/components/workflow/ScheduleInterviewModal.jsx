import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { Field, Input, Select, Textarea } from '../common/Field.jsx';
import { INTERVIEW_TYPES, INTERVIEW_MODES } from '../../constants/statuses.js';
import { TA_TEAM as INTERVIEWERS } from '../../constants/taTeam.js';
import { todayISO } from '../../utils/format.js';

export default function ScheduleInterviewModal({ open, onClose, roundNumber, onSchedule }) {
  const [f, setF] = useState({
    type: 'HR Interview',
    interviewer: INTERVIEWERS[0],
    date: todayISO(),
    time: '10:00',
    mode: 'Online',
    link: '',
    location: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

  const submit = () => {
    const e = {};
    if (!f.date) e.date = 'Date is required.';
    if (!f.time) e.time = 'Time is required.';
    if (f.mode === 'Online' && !f.link.trim()) e.link = 'Meeting link is required for online interviews.';
    if (f.mode === 'In-Person' && !f.location.trim()) e.location = 'Location is required for in-person interviews.';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSchedule(f);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Schedule Interview — Round ${roundNumber}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="CalendarPlus" onClick={submit}>
            Schedule Interview
          </Button>
        </>
      }
    >
      <Field label="Interview Round">
        <Input value={`Round ${roundNumber}`} disabled />
      </Field>
      <Field label="Interview Type">
        <Select value={f.type} onChange={(e) => set({ type: e.target.value })} options={INTERVIEW_TYPES} />
      </Field>
      <Field label="Interviewer">
        <Select value={f.interviewer} onChange={(e) => set({ interviewer: e.target.value })} options={INTERVIEWERS} />
      </Field>
      <div className="form-grid">
        <Field label="Interview Date" required error={errors.date}>
          <Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} error={errors.date} />
        </Field>
        <Field label="Interview Time" required error={errors.time}>
          <Input type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} error={errors.time} />
        </Field>
      </div>
      <Field label="Interview Mode">
        <Select value={f.mode} onChange={(e) => set({ mode: e.target.value })} options={INTERVIEW_MODES} />
      </Field>
      {f.mode === 'Online' && (
        <Field label="Meeting Link" required error={errors.link}>
          <Input value={f.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://meet.example.com/…" error={errors.link} />
        </Field>
      )}
      {f.mode === 'In-Person' && (
        <Field label="Location" required error={errors.location}>
          <Input value={f.location} onChange={(e) => set({ location: e.target.value })} placeholder="Office, floor, room" error={errors.location} />
        </Field>
      )}
      <Field label="Notes">
        <Textarea rows={4} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Agenda, focus areas, panel notes…" />
      </Field>
    </Modal>
  );
}
