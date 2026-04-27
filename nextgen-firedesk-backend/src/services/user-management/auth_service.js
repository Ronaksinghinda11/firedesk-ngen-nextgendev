/**
 * Auth Service - Handles authentication business logic
 */
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Role, RefreshToken, Permission } = require('../../models/user-management');
const JWTService = require('../jwt_service');
const { UserDTO } = require('../../dto');

class AuthService {
    /**
     * Authenticate user with email/phone and password
     * @param {string} login_id - Email or phone
     * @param {string} password - User password
     * @returns {Promise<{user: UserDTO, access_token: string, refresh_token: string}>}
     */
    async authenticate(login_id, password) {
        // Find user by email or phone
        // Find user by email or phone
        // Find user by email or phone (fetch role but NOT permissions yet to avoid hanging)
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: login_id },
                    { phone: login_id }
                ]
            },
            attributes: { exclude: ['profile_pic'] },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'description', 'is_default']
            }]
        });

        // Fetch permissions in a separate query if needed
        if (user && user.role) {
            const roleWithPermissions = await Role.findByPk(user.role.id, {
                include: [{
                    model: Permission,
                    as: 'permissions',
                    through: { attributes: [] }
                }]
            });

            if (roleWithPermissions && roleWithPermissions.permissions) {
                // Set permissions on both dataValues and directly for compatibility
                user.role.dataValues.permissions = roleWithPermissions.permissions;
                // Also set directly on the model for UserDTO access
                user.role.permissions = roleWithPermissions.permissions;

                // DEBUG: Log that permissions were loaded
                console.log(`[AUTH SERVICE] Loaded ${roleWithPermissions.permissions.length} permissions for role ${user.role.name}`);
            } else {
                user.role.dataValues.permissions = [];
                user.role.permissions = [];
                console.log(`[AUTH SERVICE] No permissions found for role ${user.role.name}`);
            }
        }


        if (!user) {
            throw { status: 401, message: "Invalid credentials" };
        }

        // Check if user is active
        if (user.status && user.status.toLowerCase() === 'inactive') {
            throw { status: 403, message: "Your account is inactive. Please contact support." };
        }

        // Verify password
        const is_valid = await bcrypt.compare(password, user.password);
        if (!is_valid) {
            throw { status: 401, message: "Invalid credentials" };
        }

        // Create DTO with transformed permissions
        const userDto = new UserDTO(user);

        // DEBUG: Log what UserDTO returns
        console.log('[AUTH SERVICE] UserDTO created:', {
            id: userDto.id,
            name: userDto.name,
            role_id: userDto.role_id,
            role_name: userDto.role?.name,
            has_permissions: !!userDto.role?.permissions,
            permissions_entities: userDto.role?.permissions?.entities ? Object.keys(userDto.role.permissions.entities) : 'NONE'
        });

        // Generate tokens with role/permissions embedded
        const access_token = JWTService.signAccessToken({
            id: user.id,
            role: userDto.role  // Contains transformed permissions from DB
        }, '1d');
        const refresh_token = JWTService.signRefreshToken({ id: user.id }, '7d');

        // Store refresh token
        await RefreshToken.upsert({
            user_id: user.id,
            token: refresh_token
        });

        return {
            user: userDto,
            access_token,
            refresh_token
        };
    }

    /**
     * Refresh access token using refresh token
     * @param {string} refresh_token - Refresh token
     * @returns {Promise<{access_token: string, refresh_token: string}>}
     */
    async refresh_tokens(refresh_token) {
        if (!refresh_token) {
            throw { status: 401, message: "Refresh token required" };
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = JWTService.verifyRefreshToken(refresh_token);
        } catch (error) {
            throw { status: 401, message: "Invalid or expired refresh token" };
        }

        // Check if token exists in database
        const stored_token = await RefreshToken.findOne({
            where: {
                user_id: decoded.id,
                token: refresh_token
            }
        });

        if (!stored_token) {
            throw { status: 401, message: "Invalid refresh token" };
        }

        // Get user with role and permissions
        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['profile_pic'] },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'description', 'is_default'],
                include: [{
                    model: Permission,
                    as: 'permissions',
                    through: { attributes: [] }
                }]
            }]
        });

        if (!user) {
            throw { status: 401, message: "User not found" };
        }

        if (user.status && user.status.toLowerCase() === 'inactive') {
            throw { status: 403, message: "Your account is inactive" };
        }

        // Create DTO with transformed permissions
        const userDto = new UserDTO(user);

        // Generate new tokens with role/permissions embedded
        const new_access_token = JWTService.signAccessToken({
            id: user.id,
            role: userDto.role  // Contains transformed permissions from DB
        }, '1d');
        const new_refresh_token = JWTService.signRefreshToken({ id: user.id }, '7d');

        // Update refresh token
        await RefreshToken.update(
            { token: new_refresh_token },
            { where: { user_id: user.id } }
        );

        return {
            user: userDto,
            access_token: new_access_token,
            refresh_token: new_refresh_token
        };
    }

    /**
     * Logout user by removing refresh token
     * @param {string} user_id - User ID
     */
    async logout(user_id) {
        await RefreshToken.destroy({
            where: { user_id }
        });
    }

    /**
     * Get current user profile
     * @param {string} user_id - User ID
     * @returns {Promise<UserDTO>}
     */
    async get_profile(user_id) {
        const user = await User.findByPk(user_id, {
            attributes: { exclude: ['profile_pic'] },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'description', 'is_default'],
                include: [{
                    model: Permission,
                    as: 'permissions',
                    through: { attributes: [] }
                }]
            }]
        });

        if (!user) {
            throw { status: 404, message: "User not found" };
        }

        // Ensure permissions are directly accessible on role (not just in dataValues)
        if (user.role && user.role.dataValues.permissions) {
            user.role.permissions = user.role.dataValues.permissions;
            console.log(`[AUTH SERVICE] get_profile: Loaded ${user.role.permissions.length} permissions for role ${user.role.name}`);
        }

        return new UserDTO(user);
    }

    /**
     * Update user password
     * @param {string} user_id - User ID
     * @param {string} current_password - Current password
     * @param {string} new_password - New password
     */
    async change_password(user_id, current_password, new_password) {
        const user = await User.findByPk(user_id);

        if (!user) {
            throw { status: 404, message: "User not found" };
        }

        // Verify current password
        const is_valid = await bcrypt.compare(current_password, user.password);
        if (!is_valid) {
            throw { status: 400, message: "Current password is incorrect" };
        }

        // Hash new password
        const hashed_password = await bcrypt.hash(new_password, 10);

        // Update password
        await User.update(
            { password: hashed_password },
            { where: { id: user_id } }
        );
    }

    /**
     * Update user profile
     * @param {string} user_id - User ID
     * @param {Object} data - Update data
     * @returns {Promise<UserDTO>}
     */
    async update_profile(user_id, data) {
        const user = await User.findByPk(user_id);
        if (!user) throw { status: 404, message: "User not found" };

        const { name, phone, display_name, profile_pic, current_password, new_password } = data;

        // Handle password change if requested
        if (new_password) {
            if (!current_password) {
                throw { status: 400, message: "Current password is required to set new password" };
            }
            const is_valid = await bcrypt.compare(current_password, user.password);
            if (!is_valid) {
                throw { status: 400, message: "Current password is incorrect" };
            }
            user.password = await bcrypt.hash(new_password, 10);
        }

        // Update other fields
        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone; // allow clearing?
        if (display_name) user.display_name = display_name;
        if (profile_pic !== undefined) user.profile_pic = profile_pic;

        await user.save();

        // Reload to get associations if needed, or just return basic
        return new UserDTO(user);
    }

    /**
     * Register a new user (public signup)
     * @param {Object} data - User registration data
     * @returns {Promise<{user: UserDTO, access_token: string, refresh_token: string}>}
     */
    async signup(data) {
        const { name, email, phone, password } = data;

        // Check if email already exists
        const existing_email = await User.findOne({ where: { email } });
        if (existing_email) {
            throw { status: 400, message: "Email already registered" };
        }

        // Check if phone already exists
        if (phone) {
            const existing_phone = await User.findOne({ where: { phone } });
            if (existing_phone) {
                throw { status: 400, message: "Phone number already registered" };
            }
        }

        // Get default role (or create one if none exists)
        let default_role = await Role.findOne({ where: { is_default: true } });
        if (!default_role) {
            // Try to find 'User' role
            default_role = await Role.findOne({
                where: { name: { [Op.iLike]: 'user' } }
            });
        }

        // Hash password
        const hashed_password = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            name,
            email,
            phone,
            password: hashed_password,
            role_id: default_role?.id || null,
            status: 'Active'
        });

        // Reload with role
        await user.reload({
            attributes: { exclude: ['profile_pic'] },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'description', 'is_default']
            }]
        });

        // Generate tokens
        const access_token = JWTService.signAccessToken({ id: user.id }, '1d');
        const refresh_token = JWTService.signRefreshToken({ id: user.id }, '7d');

        // Store refresh token
        await RefreshToken.upsert({
            user_id: user.id,
            token: refresh_token
        });

        return {
            user: new UserDTO(user),
            access_token,
            refresh_token
        };
    }
}

module.exports = new AuthService();