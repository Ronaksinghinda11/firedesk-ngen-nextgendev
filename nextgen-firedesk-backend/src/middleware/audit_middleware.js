/**
 * Audit Middleware
 * Express middleware to capture audit context and attach to request
 * 
 * Usage: Add after auth middleware in app.js
 * 
 * app.use(auditMiddleware);
 */

/**
 * Middleware to attach audit context to request
 * Makes user info and request metadata available for audit logging
 */
const auditMiddleware = (req, res, next) => {
    // Attach audit helper to request
    req.audit = {
        // Source detection
        source: detectSource(req),

        // User information (from auth middleware)
        user: req.user ? {
            id: req.user.id,
            name: req.user.name,
            type: getUserType(req.user)
        } : null,

        // Network metadata
        metadata: {
            ip_address: getClientIp(req),
            user_agent: req.get('user-agent') || null,
            endpoint: `${req.method} ${req.path}`,
            request_id: req.id || req.headers['x-request-id'] || null
        }
    };

    next();
};

/**
 * Detect source of request
 * @param {Object} req - Express request
 * @returns {string} 'ui' | 'api' | 'scheduler' | 'system'
 */
function detectSource(req) {
    // Check custom header
    const customSource = req.get('x-source');
    if (customSource) return customSource;

    // Check token type
    const authHeader = req.get('authorization');
    if (authHeader) {
        if (authHeader.startsWith('Bearer ')) return 'api';
    }

    // Check user agent
    const userAgent = req.get('user-agent') || '';
    if (userAgent.includes('scheduler') || userAgent.includes('cron')) return 'scheduler';
    if (userAgent.includes('system') || userAgent.includes('internal')) return 'system';

    // Default to UI
    return 'ui';
}

/**
 * Extract user type from user object
 * @param {Object} user - User from auth middleware
 * @returns {string} 'admin' | 'manager' | 'technician' | 'system'
 */
function getUserType(user) {
    if (!user || !user.role) return 'system';

    const roleName = user.role.name?.toLowerCase() || '';

    if (roleName === 'admin') return 'admin';
    if (roleName === 'manager') return 'manager';
    if (roleName === 'technician') return 'technician';

    return 'user';
}

/**
 * Get client IP address (handle proxies)
 * @param {Object} req - Express request
 * @returns {string} IP address
 */
function getClientIp(req) {
    // Check for proxy headers
    const forwarded = req.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = req.get('x-real-ip');
    if (realIp) return realIp;

    // Fallback to direct connection IP
    return req.ip || req.connection?.remoteAddress || 'unknown';
}

module.exports = auditMiddleware;
