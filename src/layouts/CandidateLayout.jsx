import { Outlet, useLocation } from 'react-router-dom';
import CandidateHeader from '../components/navigation/CandidateHeader.jsx';

export default function CandidateLayout() {
  const { pathname } = useLocation();
  return (
    <div className="cx">
      <CandidateHeader />
      <main className="cx-main route-view" key={pathname}>
        <Outlet />
      </main>
      <footer className="cx-footer">
        <div className="cx-footer__inner">© 2026 Ccentrik · Recruitment &amp; Onboarding</div>
      </footer>
    </div>
  );
}
