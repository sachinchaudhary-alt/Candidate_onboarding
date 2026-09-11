import { Card, InfoList } from '../../components/common/Card.jsx';
import { DEMO_USERS, ROLE_META, ROLES } from '../../constants/roles.js';

export default function ProfilePage({ role }) {
  const user = DEMO_USERS[role];
  const meta = ROLE_META[role];
  return (
    <div className="page-body" style={{ maxWidth: 640 }}>
      <h1 className="page-title mb-4">Profile</h1>
      <Card>
        <div className="row gap-4 mb-4">
          <span className="avatar" style={{ width: 56, height: 56, fontSize: 18 }}>
            {user.initials}
          </span>
          <div>
            <div className="section-title">{user.name}</div>
            <div className="text-secondary text-small">{meta.label}</div>
          </div>
        </div>
        <InfoList
          items={[
            { label: 'User ID', value: user.id },
            { label: 'Role', value: meta.label },
            { label: 'Access', value: role === ROLES.TA ? 'Applications, Interviews, Documents, Offers' : 'Offers, Documents, Employees' },
            { label: 'Responsibilities', value: meta.description },
          ]}
        />
      </Card>
    </div>
  );
}
