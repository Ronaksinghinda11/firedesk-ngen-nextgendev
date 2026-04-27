/**
 * usePermissions Hook
 * Provides permission checking utilities for the authenticated user
 */

import { useAuth } from "@/contexts/AuthContext";
import { Entity, Action, PermissionLevel } from "@/types/permissions";

export const usePermissions = () => {
  const { user } = useAuth();

  /**
   * Check if user has permission for a specific action on an entity
   */
  const hasPermission = (entity: Entity, action: Action): boolean => {
    if (!user) {
      console.log(`[usePermissions] No user loaded`);
      return false;
    }

    if (!user.role) {
      console.log(`[usePermissions] No role on user. User:`, user);
      return false;
    }

    if (!user.role.permissions) {
      console.log(`[usePermissions] No permissions on role. Role:`, user.role);
      return false;
    }

    if (!user.role.permissions.entities) {
      console.log(
        `[usePermissions] No entities on permissions. Permissions:`,
        user.role.permissions,
      );
      return false;
    }

    const entityPermission = user.role.permissions.entities[entity];

    if (!entityPermission) {
      console.log(
        `[usePermissions] Entity '${entity}' not found in permissions. Available:`,
        Object.keys(user.role.permissions.entities),
      );
      return false;
    }

    // Check if the specific action is allowed
    const allowed = entityPermission.actions?.[action] === true;
    console.log(`[usePermissions] ${entity}.${action} = ${allowed}`);
    return allowed;
  };

  /**
   * Check if user can READ an entity (at minimum)
   */
  const canView = (entity: Entity): boolean => {
    return hasPermission(entity, Action.READ);
  };

  /**
   * Check if user can CREATE an entity
   */
  const canCreate = (entity: Entity): boolean => {
    return hasPermission(entity, Action.CREATE);
  };

  /**
   * Check if user can UPDATE an entity
   */
  const canUpdate = (entity: Entity): boolean => {
    return hasPermission(entity, Action.UPDATE);
  };

  /**
   * Check if user can DELETE an entity
   */
  const canDelete = (entity: Entity): boolean => {
    return hasPermission(entity, Action.DELETE);
  };

  /**
   * Check if user can ASSIGN an entity
   */
  const canAssign = (entity: Entity): boolean => {
    return hasPermission(entity, Action.ASSIGN);
  };

  /**
   * Check if user can EXPORT an entity
   */
  const canExport = (entity: Entity): boolean => {
    return hasPermission(entity, Action.EXPORT);
  };

  /**
   * Get the permission level for an entity
   */
  const getPermissionLevel = (entity: Entity): PermissionLevel | null => {
    if (!user || !user.role) {
      return null;
    }

    const entityPermission = user.role.permissions?.entities?.[entity];
    return entityPermission?.level || null;
  };

  /**
   * Check if user has any access to an entity (any permission level above NONE)
   * Falls back to checking raw actions if level is not set — guards against
   * any entity missing from the backend ENTITY_MAP (e.g. a newly added entity).
   */
  const hasAnyAccess = (entity: Entity): boolean => {
    if (!user || !user.role) return false;

    const entityPermission = user.role.permissions?.entities?.[entity];
    if (!entityPermission) return false;

    // Primary check: use the derived level field (set by UserDTO._transform_permissions)
    const level = entityPermission.level;
    if (level && level !== PermissionLevel.NONE) return true;

    // Fallback: if level is missing or 'none', check if any action is explicitly true.
    // This protects against newly-added entities that aren't yet in the backend ENTITY_MAP.
    if (entityPermission.actions) {
      return Object.values(entityPermission.actions).some((v) => v === true);
    }

    return false;
  };

  /**
   * Get all entities the user has access to
   */
  const getAccessibleEntities = (): Entity[] => {
    if (!user || !user.role) {
      return [];
    }

    const entities = user.role.permissions?.entities || {};
    return Object.keys(entities).filter((entity) =>
      hasAnyAccess(entity as Entity),
    ) as Entity[];
  };

  /**
   * Alias for hasAnyAccess - check if user has any access to an entity
   * Used by PermissionGuard components
   */
  const hasAnyPermission = (entity: Entity): boolean => {
    return hasAnyAccess(entity);
  };

  /**
   * Check if user has ANY of the specified permissions (OR logic)
   */
  const hasAnyOf = (
    checks: Array<{ entity: Entity; action: Action }>,
  ): boolean => {
    if (!user || !user.role) {
      return false;
    }
    return checks.some((check) => hasPermission(check.entity, check.action));
  };

  /**
   * Check if user has ALL of the specified permissions (AND logic)
   */
  const hasAllOf = (
    checks: Array<{ entity: Entity; action: Action }>,
  ): boolean => {
    if (!user || !user.role) {
      return false;
    }
    return checks.every((check) => hasPermission(check.entity, check.action));
  };

  /**
   * Check if current user is an admin
   */
  const isAdmin = (): boolean => {
    return user?.userType === "admin";
  };

  /**
   * Check if current user is a manager
   */
  const isManager = (): boolean => {
    return user?.userType === "manager";
  };

  /**
   * Check if current user is a technician
   */
  const isTechnician = (): boolean => {
    return user?.userType === "technician";
  };

  /**
   * Get all permissions for the current user's role
   * Returns the permissions.entities object or empty object if no permissions
   */
  const getAllPermissions = (): Record<string, any> => {
    if (!user || !user.role || !user.role.permissions) {
      return {};
    }
    return user.role.permissions.entities || {};
  };

  return {
    hasPermission,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canAssign,
    canExport,
    getPermissionLevel,
    hasAnyAccess,
    hasAnyPermission, // Alias for hasAnyAccess
    getAccessibleEntities,
    getAllPermissions,
    hasAnyOf,
    hasAllOf,
    isAdmin,
    isManager,
    isTechnician,
    user,
  };
};
