/**
 * Middlewares Index
 */
const auth = require('./auth');
const { requirePermission, requireAnyPermission, requireAdmin, hasPermission } = require('./permission_check');

module.exports = {
    auth,
    requirePermission,
    requireAnyPermission,
    requireAdmin,
    hasPermission
};
