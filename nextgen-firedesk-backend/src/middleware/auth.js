/**
 * Auth Middleware - JWT token verification with full permission loading
 */
const { jwt_service } = require('../services');
const { User, Role, Permission } = require('../models/user-management');

const auth = async (req, res, next) => {
    try {
        // Allow OPTIONS requests for CORS preflight
        if (req.method === 'OPTIONS') {
            return next();
        }

        // Get access token from cookie or header
        const accessToken =
            req.cookies?.accessToken ||
            req.header('Authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return next({
                status: 401,
                message: 'Unauthorized - No token provided'
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt_service.verifyAccessToken(accessToken);
        } catch (error) {
            return next({
                status: 401,
                message: 'Unauthorized - Invalid or expired token'
            });
        }

        // Get user ID from token
        const userId = decoded.id || decoded._id;

        // Full user load with Role and Permissions
        const user = await User.findByPk(userId, {
            attributes: ['id', 'status', 'name', 'email', 'phone', 'role_id'],
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'description', 'is_default'],
                include: [{
                    model: Permission,
                    as: 'permissions',
                    attributes: ['id', 'entity_name', 'action_name'],
                    through: { attributes: [] } // Exclude junction table fields
                }]
            }]
        });

        if (!user) {
            return next({
                status: 404,
                message: 'User not found'
            });
        }

        // Check if user is active
        if (user.status && user.status.toLowerCase() === 'inactive') {
            return next({
                status: 403,
                message: 'User account is inactive'
            });
        }

        // Transform permissions into the structure expected by permission_check.js
        // Expected: user.role.permissions.entities = { [entity]: { actions: { [action]: true } } }
        let permissionsStructure = { entities: {} };

        if (user.role && user.role.permissions && Array.isArray(user.role.permissions)) {
            console.log(`[AUTH] Loading ${user.role.permissions.length} permissions for role ${user.role.name}`);

            user.role.permissions.forEach(perm => {
                const entity = perm.entity_name;
                const action = perm.action_name;

                if (!permissionsStructure.entities[entity]) {
                    permissionsStructure.entities[entity] = { actions: {} };
                }
                permissionsStructure.entities[entity].actions[action] = true;
            });

            console.log(`[AUTH] Permission entities loaded:`, Object.keys(permissionsStructure.entities));
        } else {
            console.log(`[AUTH] WARNING: No permissions array found for role ${user.role?.name || 'unknown'}`);
            console.log(`[AUTH] user.role exists:`, !!user.role);
            console.log(`[AUTH] user.role.permissions exists:`, !!user.role?.permissions);
            console.log(`[AUTH] user.role.permissions is array:`, Array.isArray(user.role?.permissions));
        }

        // Build final user object for req.user
        const userDto = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            status: user.status,
            role_id: user.role_id,
            role: user.role ? {
                id: user.role.id,
                name: user.role.name,
                description: user.role.description,
                is_default: user.role.is_default,
                permissions: permissionsStructure // The transformed structure
            } : null,
            user_type: user.role?.name?.toLowerCase() || 'user',
            userType: user.role?.name?.toLowerCase() || 'user' // Add camelCase alias for compatibility
        };

        req.user = userDto;

        next();
    } catch (error) {
        return next(error);
    }
};

module.exports = auth;