import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';

export default function RoleRoute({ allow, children }) {
  const { role } = useApp();
  if (!role) return <Navigate to="/" replace />;
  if (allow && role !== allow) {
    const home = role === 'ta' ? '/ta' : role === 'hr' ? '/hr' : '/candidate';
    return <Navigate to={home} replace />;
  }
  return children;
}
