import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TAHeader from '../../components/ta/TAHeader.jsx';
import Card from '../../components/ta/Card.jsx';
import StatBar from '../../components/ta/StatBar.jsx';
import Toolbar from '../../components/ta/Toolbar.jsx';
import EmptyState from '../../components/ta/EmptyState.jsx';
import Icon from '../../components/common/Icon.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { APP_STATUS } from '../../constants/statuses.js';
import { collapseDocActivity } from '../../utils/activity.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);

const SCOPE_TYPES = {
  hr: ['onboarding', 'documents', 'offer'],
  ta: ['application', 'review', 'approve', 'return', 'reject', 'interview', 'documents', 'offer', 'onboarding'],
};

const WHEN = {
  today: { label: 'Today', days: 1 },
  week: { label: 'Last 7 days', days: 7 },
  month: { label: 'Last 30 days', days: 30 },
};

/* Pick a vivid icon + colour from the wording of the event, so the feed reads
   at a glance (green = went well, red = blocked, violet = joining). */
function eventMeta(title = '') {
  const t = title.toLowerCase();
  if (t.includes('reject') || t.includes('return') || t.includes('fail')) return { icon: 'XCircle', tone: 'red' };
  if (t.includes('handed over') || t.includes('handover')) return { icon: 'Send', tone: 'violet' };
  if (t.includes('verif') || t.includes('accepted') || t.includes('approved') || t.includes('passed') || t.includes('completed')) return { icon: 'CheckCircle2', tone: 'green' };
  if (t.includes('joining') || t.includes('employee') || t.includes('onboarded')) return { icon: 'Rocket', tone: 'violet' };
  if (t.includes('offer')) return { icon: 'FileCheck', tone: 'blue' };
  if (t.includes('document')) return { icon: 'Files', tone: 'teal' };
  if (t.includes('submitted') || t.includes('upload') || t.includes('applied')) return { icon: 'Upload', tone: 'blue' };
  if (t.includes('interview') || t.includes('scheduled')) return { icon: 'CalendarDays', tone: 'amber' };
  return { icon: 'CircleDot', tone: 'grey' };
}

function dayBucket(dateStr) {
  const start = (x) => { const d = new Date(x); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const diff = Math.round((start(Date.now()) - start(dateStr)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long' });
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const shortTime = (d) =>
  new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase();

export default function ActivityFeed({ base = '/hr', scope = 'hr' }) {
  const navigate = useNavigate();
  const { data, getApplication } = useApp();
  const [type, setType] = useState('all');
  const [when, setWhen] = useState('all');
  const [actor, setActor] = useState('all');

  const scopeTypes = SCOPE_TYPES[scope] || SCOPE_TYPES.ta;
  const apps = data.applications || [];

  const all = useMemo(
    () =>
      (data.activities || [])
        .filter((a) => scopeTypes.includes(a.type))
        .map((a) => {
          const app = getApplication(a.applicationId);
          return { ...a, candidate: app ? `${app.personal.firstName} ${app.personal.lastName}` : '' };
        }),
    [data.activities, scopeTypes, getApplication]
  );

  const actors = useMemo(
    () => [...new Set(all.map((a) => a.actor).filter(Boolean))].sort(),
    [all]
  );

  const items = useMemo(
    () =>
      all.filter((a) => {
        if (type !== 'all' && a.type !== type) return false;
        if (actor !== 'all' && a.actor !== actor) return false;
        if (when !== 'all' && new Date(a.at).getTime() < Date.now() - WHEN[when].days * 86400000) return false;
        return true;
      }),
    [all, type, actor, when]
  );

  const groups = useMemo(() => {
    const out = [];
    items.forEach((it) => {
      const key = dayBucket(it.at);
      let g = out.find((x) => x.key === key);
      if (!g) { g = { key, items: [] }; out.push(g); }
      g.items.push(it);
    });
    out.forEach((g) => { g.items = collapseDocActivity(g.items); });
    return out;
  }, [items]);

  const last7 = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return all.filter((a) => new Date(a.at).getTime() >= cutoff).length;
  }, [all]);

  const stats = scope === 'hr'
    ? [
        { icon: 'Activity', accent: 'blue', label: 'Events this week', value: last7 },
        { icon: 'ClipboardCheck', accent: 'amber', label: 'Awaiting verification', value: apps.filter((a) => a.status === APP_STATUS.HR_VERIFICATION).length },
        { icon: 'FileCheck', accent: 'teal', label: 'Offers awaiting reply', value: apps.filter((a) => a.status === APP_STATUS.OFFER_ISSUED).length },
        { icon: 'Rocket', accent: 'green', label: 'Onboarded', value: (data.employees || []).length },
      ]
    : [{ icon: 'Activity', accent: 'blue', label: 'Events this week', value: last7 }];

  const chips = [
    type !== 'all' && { key: 'type', label: cap(type), onRemove: () => setType('all') },
    when !== 'all' && { key: 'when', label: WHEN[when].label, onRemove: () => setWhen('all') },
    actor !== 'all' && { key: 'actor', label: actor, onRemove: () => setActor('all') },
  ].filter(Boolean);

  const clearAll = () => { setType('all'); setWhen('all'); setActor('all'); };

  const open = (it) => {
    const app = getApplication(it.applicationId);
    navigate(app ? `${base}/candidates/${app.candidateId}` : `${base}/candidates`);
  };

  const isHr = scope === 'hr';

  return (
    <>
      <TAHeader
        title={isHr ? 'Onboarding Activity' : 'Activity'}
        subtitle={isHr ? 'Documents, offers and joining — everything happening across your candidates.' : 'Every recorded action across recruitment and onboarding.'}
      />

      <StatBar items={stats} />

      <Toolbar
        filters={[
          { label: 'Type', value: type, onChange: setType, options: scopeTypes.map((s) => ({ value: s, label: cap(s) })) },
          { label: 'When', value: when, onChange: setWhen, options: Object.entries(WHEN).map(([value, w]) => ({ value, label: w.label })) },
          { label: 'Person', value: actor, onChange: setActor, options: actors.map((p) => ({ value: p, label: p })) },
        ]}
        chips={chips}
        onClearAll={chips.length ? clearAll : undefined}
      />

      {items.length === 0 ? (
        <Card><EmptyState icon="History" title="No activity found" message="Try clearing the filters." /></Card>
      ) : (
        <Card>
          {groups.map((g) => (
            <div className="act-day" key={g.key}>
              <div className="act-day__label">{g.key}<span className="act-day__count">{g.items.length}</span></div>
              <div className="act-feed">
                {g.items.map((it, i) => {
                  const m = eventMeta(it.title);
                  const showActor = it.actor && it.actor !== it.candidate;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className="act-feed__item act-feed__item--link"
                      style={{ animationDelay: `${Math.min(i, 10) * 22}ms` }}
                      onClick={() => open(it)}
                    >
                      <span className={`act-feed__icon act-feed__icon--${m.tone}`}><Icon name={m.icon} size={15} /></span>
                      <div className="act-feed__body">
                        <div className="act-feed__head">
                          <span className="act-feed__title">
                            {it.title}
                            {it.candidate && <span className="act-feed__cand"> · {it.candidate}</span>}
                          </span>
                          <span className="act-feed__when">{shortTime(it.at)}</span>
                        </div>
                        <div className="act-feed__desc">
                          {it.description}
                          {showActor && <span className="act-feed__actor"> · by {it.actor}</span>}
                        </div>
                      </div>
                      <Icon name="ChevronRight" size={16} className="act-feed__go" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
