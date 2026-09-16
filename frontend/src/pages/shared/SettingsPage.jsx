import { Card } from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function SettingsPage() {
  const { refresh, data } = useApp();
  const toast = useToast();

  return (
    <div className="page-body" style={{ maxWidth: 720 }}>
      <h1 className="page-title mb-4">Settings</h1>
      <Card title="Backend data">
        <p className="text-secondary text-small mb-4">
          All workflow state lives in the backend (SAP CAP + SQLite) — there is no local demo data. You currently
          have {data.applications.length} applications, {data.offers.length} offers and {data.employees.length} employee records.
        </p>
        <Button
          variant="secondary"
          icon="RefreshCw"
          onClick={() => { refresh(); toast.success('Refreshed from the backend.'); }}
        >
          Refresh from backend
        </Button>
      </Card>

      <Card title="Appearance" className="mt-4">
        <p className="text-secondary text-small">
          The interface follows the enterprise blue design system (SAP-inspired). Theme customisation is out of scope for this
          prototype phase.
        </p>
      </Card>
    </div>
  );
}
