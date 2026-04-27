/**
 * Admin Authorization Middleware
 * Checks if the authenticated user has admin privileges
 */

const adminAuth = (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user has admin role
        const userRole = req.user.role?.name || req.user.userType || req.user.roleId;

        // Allow if user is Admin or has admin-level access
        if (userRole === 'Admin' || userRole === 'admin' || req.user.isAdmin === true) {
            return next();
        }

        // Also check if user has specific admin permission
        const permissions = req.user.permissions || [];
        const hasAdminAccess = permissions.some(p =>
            p.entity === 'admin' ||
            p.action === 'manage_all' ||
            p.entity === 'users' && p.action === 'manage'
        );

        if (hasAdminAccess) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    } catch (error) {
        console.error('Admin auth error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authorization check failed',
            error: error.message
        });
    }
};

module.exports = adminAuth;
