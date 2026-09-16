import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { Field, Select } from '../common/Field.jsx';
import { TA_TEAM } from '../../constants/taTeam.js';

/* TA Head picks which TA a self-sourced (or existing) lead goes to. The
   select-then-click-Assign gesture is the confirm step for this action. */
export default function AssignTAModal({ open, name, initialTA = '', onClose, onAssign }) {
  const [ta, setTa] = useState(TA_TEAM[0]);

  useEffect(() => {
    if (open) setTa(initialTA || TA_TEAM[0]);
  }, [open, initialTA]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign to TA — ${name || ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onAssign(ta); onClose(); }}>Assign</Button>
        </>
      }
    >
      <Field label="Talent Acquisition owner" hint="This TA will own the candidate going forward.">
        <Select value={ta} onChange={(e) => setTa(e.target.value)} options={TA_TEAM} />
      </Field>
    </Modal>
  );
}
