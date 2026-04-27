/**
 * PermissionGuard Component
 * Conditionally renders children based on user permissions
 */

import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Entity, Action } from '../types/permissions';

interface PermissionGuardProps {
  entity: Entity;
  action: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that only renders children if user has the specified permission
 *
 * @example
 * <PermissionGuard entity={Entity.USERS} action={Action.CREATE}>
 *   <Button>Create User</Button>
 * </PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  entity,
  action,
  children,
  fallback = null
}) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(entity, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface EntityAccessGuardProps {
  entity: Entity;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that checks if user has any access to an entity
 *
 * @example
 * <EntityAccessGuard entity={Entity.PLANTS}>
 *   <PlantsSection />
 * </EntityAccessGuard>
 */
export const EntityAccessGuard: React.FC<EntityAccessGuardProps> = ({
  entity,
  children,
  fallback = null
}) => {
  const { hasAnyPermission, user } = usePermissions();

  // Debug logging
  console.log(`🛡️ EntityAccessGuard for ${entity}:`, {
    hasAccess: hasAnyPermission(entity),
    userLoaded: !!user,
    userRole: user?.role?.name,
    entityPermission: user?.role?.permissions?.entities?.[entity]
  });

  if (!hasAnyPermission(entity)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AnyPermissionGuardProps {
  checks: Array<{ entity: Entity; action: Action }>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that renders if user has ANY of the specified permissions (OR logic)
 *
 * @example
 * <AnyPermissionGuard checks={[
 *   { entity: Entity.USERS, action: Action.READ },
 *   { entity: Entity.MANAGERS, action: Action.READ }
 * ]}>
 *   <UserManagementSection />
 * </AnyPermissionGuard>
 */
export const AnyPermissionGuard: React.FC<AnyPermissionGuardProps> = ({
  checks,
  children,
  fallback = null
}) => {
  const { hasAnyOf } = usePermissions();

  if (!hasAnyOf(checks)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AllPermissionsGuardProps {
  checks: Array<{ entity: Entity; action: Action }>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that renders if user has ALL of the specified permissions (AND logic)
 *
 * @example
 * <AllPermissionsGuard checks={[
 *   { entity: Entity.USERS, action: Action.UPDATE },
 *   { entity: Entity.ROLES, action: Action.READ }
 * ]}>
 *   <ComplexOperationButton />
 * </AllPermissionsGuard>
 */
export const AllPermissionsGuard: React.FC<AllPermissionsGuardProps> = ({
  checks,
  children,
  fallback = null
}) => {
  const { hasAllOf } = usePermissions();

  if (!hasAllOf(checks)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that only renders for admin users
 *
 * @example
 * <AdminGuard>
 *   <AdminOnlyFeature />
 * </AdminGuard>
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({
  children,
  fallback = null
}) => {
  const { isAdmin } = usePermissions();

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface RoleGuardProps {
  allowedRoles: Array<'admin' | 'manager' | 'technician'>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that renders if user has one of the allowed roles
 *
 * @example
 * <RoleGuard allowedRoles={['admin', 'manager']}>
 *   <ManagementFeature />
 * </RoleGuard>
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback = null
}) => {
  const { user } = usePermissions();

  if (!user || !allowedRoles.includes(user.userType)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
