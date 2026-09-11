import Icon from './Icon.jsx';
import { Badge } from './Badge.jsx';
import { DOC_STATUS_META } from '../../constants/statuses.js';
import { formatDate } from '../../utils/format.js';

export default function DocumentCard({ doc, actions }) {
  const m = DOC_STATUS_META[doc.status];
  return (
    <div className="dcard">
      <div className="dcard__top">
        <span className="dcard__icon"><Icon name="FileText" size={16} /></span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="dcard__name">{doc.label}</div>
          <div className="dcard__meta">
            {doc.fileName ? `${doc.fileName}${doc.uploadedAt ? ` · ${formatDate(doc.uploadedAt)}` : ''}` : 'Not uploaded'}
          </div>
        </div>
      </div>
      <div className="row between">
        <Badge tone={m.tone} icon={m.icon}>{m.label}</Badge>
        {actions && <div className="dcard__actions">{actions}</div>}
      </div>
    </div>
  );
}
