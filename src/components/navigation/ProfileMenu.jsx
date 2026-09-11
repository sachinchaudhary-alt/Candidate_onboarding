import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon.jsx';
import { ConfirmDialog } from '../common/Modal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { ROLES, ROLE_META, DEMO_USERS } from '../../constants/roles.js';
import { TA_TEAM } from '../../constants/taTeam.js';
import { initialsOf } from '../../utils/format.js';

const ROLE_ORDER = [ROLES.CANDIDATE, ROLES.TA, ROLES.HR];
const ROLE_TITLE = {
  [ROLES.CANDIDATE]: 'Candidate',
  [ROLES.TA]: 'Talent Acquisition',
  [ROLES.HR]: 'Human Resources',
};

/* Top-right account button shared by all three portals. Opens a menu to jump
   between the Candidate / TA / HR views (the demo is one flow across roles) and
   to restart the demo. `links` adds portal-specific rows above the switcher. */
export default function ProfileMenu({ role, links = [] }) {
  const navigate = useNavigate();
  const { setRole, startGuidedDemo, taIdentity, setTaIdentity } = useApp();
  const [open, setOpen] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const ref = useRef(null);
  const isTA = role === ROLES.TA;
  const user = isTA
    ? { name: taIdentity, initials: initialsOf(taIdentity) }
    : DEMO_USERS[role] || DEMO_USERS[ROLES.CANDIDATE];

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const go = (to) => { setOpen(false); navigate(to); };
  const switchTo = (r) => { setOpen(false); setRole(r); navigate(ROLE_META[r].home); };
  const actAs = (name) => { setOpen(false); setTaIdentity(name); };
  const restart = () => { setConfirmRestart(true); };
  const confirmRestartNow = () => { setConfirmRestart(false); setOpen(false); startGuidedDemo(); setRole(ROLES.CANDIDATE); navigate('/candidate/jobs'); };
  const signOut = () => { setOpen(false); setRole(null); navigate('/'); };

  return (
    <div className="profilemenu" ref={ref}>
      <button
        type="button"
        className="profilemenu__btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user.name}
      >
        <span className="ta-avatar-sq">{user.initials}</span>
        <span className="profilemenu__who">
          <span className="profilemenu__name">{user.name}</span>
          <span className="profilemenu__role">{ROLE_TITLE[role]}</span>
        </span>
        <Icon name="ChevronDown" size={14} />
      </button>

      {open && (
        <div className="profilemenu__panel" role="menu">
          <div className="profilemenu__head">
            <span className="ta-avatar-sq">{user.initials}</span>
            <span className="profilemenu__id">
              <strong>{user.name}</strong>
              <span>{ROLE_TITLE[role]}</span>
            </span>
          </div>

          {links.map((l) => (
            <button key={l.to} type="button" className="profilemenu__item" onClick={() => go(l.to)} role="menuitem">
              <Icon name={l.icon} size={15} /> {l.label}
            </button>
          ))}

          {isTA && (
            <>
              <div className="profilemenu__sep">Acting as</div>
              {TA_TEAM.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="profilemenu__item"
                  onClick={() => actAs(name)}
                  role="menuitem"
                  aria-current={name === taIdentity}
                >
                  <Icon name={name === taIdentity ? 'CheckCircle2' : 'User'} size={15} /> {name}
                </button>
              ))}
            </>
          )}

          <div className="profilemenu__sep">Switch view</div>
          {ROLE_ORDER.filter((r) => r !== role).map((r) => (
            <button key={r} type="button" className="profilemenu__item" onClick={() => switchTo(r)} role="menuitem">
              <Icon name="RefreshCw" size={15} /> {ROLE_META[r].label}
            </button>
          ))}

          <div className="profilemenu__sep" />
          <button type="button" className="profilemenu__item" onClick={restart} role="menuitem">
            <Icon name="RotateCcw" size={15} /> Restart demo
          </button>
          <button type="button" className="profilemenu__item" onClick={signOut} role="menuitem">
            <Icon name="LogOut" size={15} /> Sign out
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        onConfirm={confirmRestartNow}
        title="Restart the demo?"
        message="This wipes all current data and rebuilds a fresh guided-demo seed. This can't be undone."
        confirmLabel="Restart demo"
        tone="danger"
      />
    </div>
  );
}
