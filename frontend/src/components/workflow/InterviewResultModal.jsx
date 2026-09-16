import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { Field, Textarea } from '../common/Field.jsx';
import { ROUND_STATUS } from '../../constants/statuses.js';

const OPTIONS = [
  { value: ROUND_STATUS.PASS, label: 'Selected' },
  { value: ROUND_STATUS.FAIL, label: 'Not Selected' },
  { value: ROUND_STATUS.HOLD, label: 'On Hold' },
];

export default function InterviewResultModal({ open, onClose, interview, onSave }) {
  const [result, setResult] = useState(ROUND_STATUS.PASS);
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    if (!comments.trim()) {
      setError('Please add a short remark.');
      return;
    }
    // Remarks always go to the candidate — shareComments is always true.
    onSave({ result, comments: comments.trim(), shareComments: true });
    setResult(ROUND_STATUS.PASS);
    setComments('');
    setError('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Interview Result — Round ${interview?.round} (${interview?.type})`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="Save" onClick={save}>Save Result</Button>
        </>
      }
    >
      <Field label="Result">
        <div className="radio-group--row">
          {OPTIONS.map((o) => (
            <label className={`radio-card${result === o.value ? ' radio-card--active' : ''}`} key={o.value}>
              <input type="radio" name="result" checked={result === o.value} onChange={() => setResult(o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Interview remarks" required error={error}>
        <Textarea rows={5} value={comments} onChange={(e) => setComments(e.target.value)} error={error} placeholder="Strengths, concerns, recommendation…" />
        <span className="ta-cell-sub">These remarks are shared with the candidate and queued to email them (email sending isn't wired up yet).</span>
      </Field>
    </Modal>
  );
}
