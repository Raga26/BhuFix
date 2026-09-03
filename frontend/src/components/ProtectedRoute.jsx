import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { can } from '../lib/access';

export function ProtectedRoute({ children, roles, permission, allow }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !can(user, permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (typeof allow === 'function' && !allow(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
