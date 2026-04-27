import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Entity, Action } from '@/types/permissions';
import { usePermissions } from '@/hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireManager?: boolean;
  requireTechnician?: boolean;
  allowedRoles?: ('admin' | 'manager' | 'technician' | 'observer')[];
  requireEntity?: Entity;
  requireAction?: Action;
  allowCustomRoles?: boolean; // New prop to allow users with custom roles if they have dashboard permission
}

export const ProtectedRoute = ({
  children,
  requireAdmin,
  requireManager,
  requireTechnician,
  allowedRoles,
  requireEntity,
  requireAction,
  allowCustomRoles = false
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    const loginPath = requireTechnician ? '/technician/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check specific entity/action permission requirement
  if (requireEntity && requireAction) {
    const hasRequiredPermission = hasPermission(requireEntity, requireAction);
    if (!hasRequiredPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check specific role requirements
  if (requireAdmin && user.userType !== 'admin') {
    // Allow custom roles if they have admin-level permissions
    if (allowCustomRoles && requireEntity && requireAction) {
      const hasRequiredPermission = hasPermission(requireEntity, requireAction);
      if (!hasRequiredPermission) {
        return <Navigate to="/unauthorized" replace />;
      }
    } else {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (requireManager && user.userType !== 'manager') {
    // Allow custom roles if they have dashboard permission
    if (allowCustomRoles && hasAnyPermission(Entity.DASHBOARD)) {
      // Custom roles with dashboard permission can access manager routes
    } else {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (requireTechnician && user.userType !== 'technician') {
    // Allow custom roles if they have dashboard permission
    if (allowCustomRoles && hasAnyPermission(Entity.DASHBOARD)) {
      // Custom roles with dashboard permission can access technician routes
    } else {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check allowed roles array
  if (allowedRoles && !allowedRoles.includes(user.userType as any)) {
    // Allow custom roles if allowCustomRoles is true and they have dashboard permission
    if (allowCustomRoles && hasAnyPermission(Entity.DASHBOARD)) {
      // Custom roles with dashboard permission can proceed
    } else {
      return <Navigate to="/unauthorized" replace />;
    }
  }
   if (requireTechnician && user.userType !== 'technician') {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
};
