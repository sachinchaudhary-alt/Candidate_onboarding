import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { Field, Input } from '../common/Field.jsx';

/* HR picks the team a person will work in — used both when completing a
   candidate's joining and when editing an existing employee's role.
   Free text, with a few common roles as one-tap suggestions. */
const SUGGESTIONS = ['TA', 'SAP ABAP', 'BTP Developer', 'Sales', 'Support', 'Finance'];

export default function AssignRoleModal({
  open,
  name,
  initialRole = '',
  title,
  hint = 'Type the team or role this person will work in.',
  confirmLabel = 'Save role',
  onClose,
  onSave,
}) {
  const [role, setRole] = useState('');

  // Reset to the starting value every time the modal opens.
  useEffect(() => {
    if (open) setRole(initialRole || '');
  }, [open, initialRole]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || `Assign team role — ${name || ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(role.trim()); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    >
      <Field label="Team role" hint={hint}>
        <Input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. SAP ABAP, BTP Developer, Sales"
          autoFocus
        />
      </Field>

      <div className="assign-role__chips">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`assign-role__chip${role.trim() === s ? ' is-on' : ''}`}
            onClick={() => setRole(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </Modal>
  );
}
