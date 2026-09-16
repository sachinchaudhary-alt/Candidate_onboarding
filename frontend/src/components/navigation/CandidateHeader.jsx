import { NavLink } from 'react-router-dom';
import ProfileMenu from './ProfileMenu.jsx';
import { ROLES } from '../../constants/roles.js';
import logo from '../../assets/ccentrik-logo.png';

const navClass = ({ isActive }) => (isActive ? 'active' : undefined);

export default function CandidateHeader() {
  return (
    <header className="cx-header">
      <div className="cx-header__inner">
        <div className="cx-brand">
          <img className="cx-brand__logo" src={logo} alt="Ccentrik" />
          <span className="cx-brand__sub">Careers</span>
        </div>

        <nav className="cx-nav">
          <NavLink to="/candidate/jobs" className={navClass}>Jobs</NavLink>
          <NavLink to="/candidate/application" className={navClass}>My Application</NavLink>
        </nav>

        <div className="cx-header__right">
          <ProfileMenu
            role={ROLES.CANDIDATE}
            links={[
              { label: 'My Profile', icon: 'UserRound', to: '/candidate/profile' },
              { label: 'My Application', icon: 'ClipboardList', to: '/candidate/application' },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
