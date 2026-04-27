/**
 * Dashboard Resolver Utility
 * Determines the appropriate dashboard route based on user type and permissions
 */

import { Entity, PermissionLevel } from '../types/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  userType: 'admin' | 'manager' | 'technician' | 'observer' | string;
  role?: {
    id: string;
    name: string;
    permissions: {
      entities: {
        [key: string]: {
          level: PermissionLevel;
          actions: {
            create: boolean;
            read: boolean;
            update: boolean;
            delete: boolean;
            assign: boolean;
            export?: boolean;
          };
        };
      };
    };
  };
}

/**
 * Resolves the appropriate dashboard route for a user based on their role and permissions
 * @param user - The authenticated user object
 * @returns The dashboard route path
 */
export function resolveDashboardRoute(user: User | null): string {
  if (!user) {
    return '/login';
  }

  // Admin always goes to admin dashboard
  if (user.userType === 'admin') {
    return '/admin';
  }

  // Manager goes to manager dashboard - but check if it's a REAL manager or a custom role with manager userType
  if (user.userType === 'manager') {
    // Check if this is a custom role with manager userType by checking the role name
    const roleName = user.role?.name?.toLowerCase();
    const isRealManager = roleName === 'manager' || !user.role?.name;

    if (isRealManager) {
      const hasDashboardAccess = checkDashboardPermission(user);
      return hasDashboardAccess ? '/manager' : '/dashboard';
    } else {
      // This is a custom role with manager userType - route to /dashboard
      return '/dashboard';
    }
  }

  // Technician goes to technician dashboard (if exists) or dynamic dashboard
  if (user.userType === 'technician') {
    return '/technician';
  }

  // For custom roles, check permissions and route to appropriate dashboard
  return resolveCustomRoleDashboard(user);
}

/**
 * Check if user has dashboard access permission
 */
function checkDashboardPermission(user: User): boolean {
  if (!user.role?.permissions?.entities) {
    return false;
  }

  const dashboardPermission = user.role.permissions.entities[Entity.DASHBOARD];

  if (!dashboardPermission) {
    return false;
  }

  // User has dashboard access if permission level is not NONE
  return dashboardPermission.level !== PermissionLevel.NONE;
}

/**
 * Resolve dashboard for custom roles based on their permissions
 * Custom roles always go to /dashboard, not /manager or /admin
 */
function resolveCustomRoleDashboard(user: User): string {
  if (!user.role?.permissions?.entities) {
    return '/dashboard';
  }

  // Check if user has dashboard entity permission
  const hasDashboardAccess = checkDashboardPermission(user);

  if (hasDashboardAccess) {
    // Custom roles always go to /dashboard regardless of which entities they have access to
    return '/dashboard';
  }

  // Default to dynamic dashboard
  return '/dashboard';
}

/**
 * Get available menu items based on user permissions
 */
export function getAvailableMenuItems(user: User | null): string[] {
  if (!user) {
    return [];
  }

  // Admin has access to all menu items
  if (user.userType === 'admin') {
    return [
      'overview',
      'plants',
      'assets',
      'managers',
      'technicians',
      'users',
      'roles',
      'categories',
      'products',
      'service-forms',
      'activities',
      'reports'
    ];
  }

  if (!user.role?.permissions?.entities) {
    return [];
  }

  const menuItems: string[] = [];
  const entities = user.role.permissions.entities;

  // Map entities to menu items
  if (entities[Entity.DASHBOARD]?.level !== PermissionLevel.NONE) {
    menuItems.push('dashboard');
  }

  if (entities[Entity.PLANTS]?.level !== PermissionLevel.NONE) {
    menuItems.push('plants');
  }

  if (entities[Entity.ASSETS]?.level !== PermissionLevel.NONE) {
    menuItems.push('assets');
  }

  if (entities[Entity.MANAGERS]?.level !== PermissionLevel.NONE) {
    menuItems.push('managers');
  }

  if (entities[Entity.TECHNICIANS]?.level !== PermissionLevel.NONE) {
    menuItems.push('technicians');
  }

  if (entities[Entity.USERS]?.level !== PermissionLevel.NONE) {
    menuItems.push('users');
  }

  if (entities[Entity.ROLES]?.level !== PermissionLevel.NONE) {
    menuItems.push('roles');
  }

  if (entities[Entity.CATEGORIES]?.level !== PermissionLevel.NONE) {
    menuItems.push('categories');
  }

  if (entities[Entity.SERVICE_FORMS]?.level !== PermissionLevel.NONE) {
    menuItems.push('service-forms');
  }

  if (entities[Entity.TICKETS]?.level !== PermissionLevel.NONE) {
    menuItems.push('tickets');
  }

  if (entities[Entity.AUDITS]?.level !== PermissionLevel.NONE) {
    menuItems.push('audits');
  }

  if (entities[Entity.REPORTS]?.level !== PermissionLevel.NONE) {
    menuItems.push('reports');
  }

  if (entities[Entity.ARCHIVE]?.level !== PermissionLevel.NONE) {
    menuItems.push('archive');
  }

  return menuItems;
}

/**
 * Check if user has access to a specific route
 */
export function hasRouteAccess(user: User | null, route: string): boolean {
  if (!user) {
    return false;
  }

  // Admin has access to all routes
  if (user.userType === 'admin') {
    return true;
  }

  // Check standard user types
  if (route.startsWith('/admin')) {
    return user.userType === 'admin';
  }

  if (route.startsWith('/manager')) {
    return user.userType === 'manager' || user.userType === 'admin';
  }

  if (route.startsWith('/technician')) {
    return user.userType === 'technician' || user.userType === 'admin';
  }

  // For dynamic dashboard, check dashboard permission
  if (route === '/dashboard') {
    return checkDashboardPermission(user);
  }

  return true;
}
