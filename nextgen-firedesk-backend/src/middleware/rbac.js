/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides role checking functionality for routes
 */

/**
 * Middleware to require specific role(s)
 * @param {Array<string>} allowedRoles - Array of role names that are allowed
 * @returns {Function} Express middleware function
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Handle both role.name (from auth middleware) and direct role string
        const userRole = req.user.role?.name || req.user.role || req.user.user_type;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};

/**
 * Middleware to check if user is an admin
 */
const requireAdmin = (req, res, next) => {
    return requireRole(['Admin'])(req, res, next);
};

/**
 * Middleware to check if user is admin or manager
 */
const requireAdminOrManager = (req, res, next) => {
    return requireRole(['Admin', 'Manager'])(req, res, next);
};

module.exports = {
    requireRole,
    requireAdmin,
    requireAdminOrManager
};
