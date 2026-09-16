import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes.jsx';
import ToastContainer from './components/common/ToastContainer.jsx';
import { useApp } from './context/AppContext.jsx';
import { ROLES } from './constants/roles.js';

/** Dev/demo helper: /any?as=ta|hr|candidate sets the role and strips the param. */
function RoleFromQuery() {
  const { role, setRole } = useApp();
  const [sp, setSp] = useSearchParams();
  useEffect(() => {
    const as = sp.get('as');
    if (as && Object.values(ROLES).includes(as)) {
      if (role !== as) setRole(as);
      sp.delete('as');
      setSp(sp, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);
  return null;
}

export default function App() {
  return (
    <>
      <RoleFromQuery />
      <AppRoutes />
      <ToastContainer />
    </>
  );
}
