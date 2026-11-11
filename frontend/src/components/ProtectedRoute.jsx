import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  let user;
  try { user = JSON.parse(localStorage.getItem('user')); } catch { user = null; }
  if (!token || !['Student', 'Professor'].includes(user?.role)) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={user.role === 'Professor' ? '/professor-dashboard' : '/courses'} replace />;
  return children;
}
