import Icon from '../common/Icon.jsx';
import { APP_STATUS, PIPELINE_STAGES, stageIndexForStatus, statusMeta } from '../../constants/statuses.js';
import { formatDate } from '../../utils/format.js';

const STAGE_ACTIVITY = {
  application: ['application'],
  ta_review: ['review', 'approve', 'return', 'reject'],
  interview: ['interview'],
  documents: ['documents'],
  offer: ['offer'],
  onboarding: ['onboarding'],
};

export default function RecruitmentTimeline({ application, activities = [] }) {
  const rejected = application.status === APP_STATUS.REJECTED;
  const cur = Math.max(0, stageIndexForStatus(application.status));

  return (
    <div className="rtimeline">
      {PIPELINE_STAGES.map((s, i) => {
        const state = rejected ? (i === 0 ? 'done' : 'pending') : i < cur ? 'done' : i === cur ? 'current' : 'pending';
        const evt = activities
          .filter((a) => (STAGE_ACTIVITY[s.key] || []).includes(a.type))
          .sort((a, b) => new Date(a.at) - new Date(b.at))[0];
        return (
          <div key={s.key} className={`rtl rtl--${state}`}>
            <div className="rtl__node">
              {state === 'done' ? (
                <Icon name="Check" size={14} />
              ) : state === 'current' ? (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
              ) : (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              )}
            </div>
            <div className="rtl__body">
              <div className="rtl__title">{s.label}</div>
              <div className="rtl__meta">
                {state === 'current' && !rejected
                  ? statusMeta(application.status).label
                  : state === 'done'
                  ? 'Completed'
                  : 'Upcoming'}
                {evt && ` · ${formatDate(evt.at)}`}
              </div>
              {evt?.description && state !== 'pending' && <div className="rtl__note">{evt.description}</div>}
            </div>
          </div>
        );
      })}
      {rejected && (
        <div className="rtl rtl--current">
          <div className="rtl__node" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)', background: 'var(--color-error-tint)' }}>
            <Icon name="XCircle" size={14} />
          </div>
          <div className="rtl__body">
            <div className="rtl__title" style={{ color: 'var(--color-error)' }}>Application Closed</div>
            <div className="rtl__note">{application.rejectReason || 'Not taken forward.'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
