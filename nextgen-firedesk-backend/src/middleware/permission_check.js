/**
 * Permission Check Middleware
 * Provides middleware functions to protect routes with granular permissions
 */

/**
 * Check if a user has a specific permission for an entity
 * @param {Object} user - User object with role and permissions populated
 * @param {string} entity - Entity name (e.g., 'users', 'plants')
 * @param {string} action - Action name (e.g., 'create', 'read', 'update', 'delete')
 * @returns {boolean}
 */
function hasPermission(user, entity, action) {
    // NOTE: No automatic admin bypass - all users must have permissions assigned
    // This ensures Admin can be restricted if needed

    // Check if user has a role with permissions loaded
    if (!user.role || !user.role.permissions || !user.role.permissions.entities) {
        console.log(`[RBAC] Permission denied for ${entity}.${action}: No permissions loaded for user ${user.id}`);
        return false;
    }

    const entityPermission = user.role.permissions.entities[entity];

    if (!entityPermission) {
        console.log(`[RBAC] Permission denied: Entity '${entity}' not in user permissions`);
        return false;
    }

    // Check if the action is allowed
    const allowed = entityPermission.actions && entityPermission.actions[action] === true;

    if (!allowed) {
        console.log(`[RBAC] Permission denied: ${entity}.${action} = false for role ${user.role.name}`);
    }

    return allowed;
}

/**
 * Middleware factory to check if user has permission for an entity/action
 * @param {string} entity - Entity name (from ENTITIES constant)
 * @param {string} action - Action name (from ACTIONS constant)
 * @returns {Function} Express middleware
 */
function requirePermission(entity, action) {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check permission
        const hasAccess = hasPermission(req.user, entity, action);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: `You don't have permission to ${action} ${entity}`,
                requiredPermission: { entity, action }
            });
        }

        // Permission granted, proceed
        next();
    };
}

/**
 * Middleware to check multiple permissions (OR logic)
 * User needs at least ONE of the specified permissions
 */
function requireAnyPermission(permissions) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user has at least one of the permissions
        const hasAny = permissions.some(({ entity, action }) =>
            hasPermission(req.user, entity, action)
        );

        if (!hasAny) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                requiredPermissions: permissions
            });
        }

        next();
    };
}

/**
 * Middleware to check admin access
 */
function requireAdmin() {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userType = req.user.user_type || req.user.userType;
        const roleName = req.user.role?.name;

        if (userType !== 'admin' && userType !== 'Admin' &&
            roleName !== 'Admin' && roleName !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        next();
    };
}

module.exports = {
    hasPermission,
    requirePermission,
    requireAnyPermission,
    requireAdmin
};