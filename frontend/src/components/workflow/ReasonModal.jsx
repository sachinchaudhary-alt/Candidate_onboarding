import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { Field, Textarea } from '../common/Field.jsx';

export default function ReasonModal({ open, onClose, title, label = 'Reason', confirmLabel = 'Submit', tone = 'primary', onSubmit }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!reason.trim()) {
      setError('Please provide a reason.');
      return;
    }
    onSubmit(reason.trim());
    setReason('');
    setError('');
  };

  const close = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant={tone} onClick={submit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Field label={label} required error={error}>
        <Textarea
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={error}
          placeholder="Provide clear details the candidate or team can act on…"
        />
      </Field>
    </Modal>
  );
}
