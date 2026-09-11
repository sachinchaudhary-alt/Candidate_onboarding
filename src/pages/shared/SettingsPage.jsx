import { useState } from 'react';
import { Card } from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import { ConfirmDialog } from '../../components/common/Modal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function SettingsPage() {
  const { resetDemo, data } = useApp();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="page-body" style={{ maxWidth: 720 }}>
      <h1 className="page-title mb-4">Settings</h1>
      <Card title="Prototype data">
        <p className="text-secondary text-small mb-4">
          This frontend prototype keeps all workflow state in your browser's local storage — there is no backend. You currently
          have {data.applications.length} applications, {data.offers.length} offers and {data.employees.length} employee records.
        </p>
        <Button variant="danger" icon="RotateCcw" onClick={() => setConfirm(true)}>
          Reset demo data
        </Button>
      </Card>

      <Card title="Appearance" className="mt-4">
        <p className="text-secondary text-small">
          The interface follows the enterprise blue design system (SAP-inspired). Theme customisation is out of scope for this
          prototype phase.
        </p>
      </Card>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset all demo data?"
        message="Every application, interview, document, offer and employee record will be restored to the original seed data."
        confirmLabel="Reset data"
        tone="danger"
        onConfirm={() => {
          resetDemo();
          setConfirm(false);
          toast.success('Demo data reset to defaults.');
        }}
      />
    </div>
  );
}
