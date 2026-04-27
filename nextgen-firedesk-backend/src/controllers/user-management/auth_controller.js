/**
 * Auth Controller - Handles authentication requests
 * Thin controller: validation only, delegates to auth_service
 */
const Joi = require('joi');
const { auth_service } = require('../../services');

/**
 * Login - Authenticate user
 * POST /auth/login
 */
const login = async (req, res, next) => {
    try {
        const schema = Joi.object({
            email: Joi.string().required().messages({
                'any.required': 'Email or phone is required',
                'string.empty': 'Email or phone is required'
            }),
            password: Joi.string().required().messages({
                'any.required': 'Password is required',
                'string.empty': 'Password is required'
            })
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const { email, password } = value;
        const result = await auth_service.authenticate(email, password);

        // Set cookies
        res.cookie('accessToken', result.access_token, {
            maxAge: 1000 * 60 * 60 * 24, // 1 day
            httpOnly: true,
            sameSite: 'None',
            secure: true
        });

        res.cookie('refreshToken', result.refresh_token, {
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
            httpOnly: true,
            sameSite: 'None',
            secure: true
        });

        // DEBUG: Log what we're sending in the response
        console.log('[AUTH CONTROLLER] Sending login response with permissions:',
            result.user?.role?.permissions?.entities ? Object.keys(result.user.role.permissions.entities) : 'NO ENTITIES');

        return res.json({
            success: true,
            message: 'Login successful',
            user: result.user,
            access_token: result.access_token,
            auth: true
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Refresh Token
 * POST /auth/refresh
 */
const refresh = async (req, res, next) => {
    try {
        const refresh_token = req.cookies?.refreshToken || req.body.refresh_token;

        const result = await auth_service.refresh_tokens(refresh_token);

        // Set new cookies
        res.cookie('accessToken', result.access_token, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
            sameSite: 'None',
            secure: true
        });

        res.cookie('refreshToken', result.refresh_token, {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
            sameSite: 'None',
            secure: true
        });

        return res.json({
            success: true,
            message: 'Token refreshed',
            user: result.user,
            access_token: result.access_token
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Logout
 * POST /auth/logout
 */
const logout = async (req, res, next) => {
    try {
        if (req.user?.id) {
            await auth_service.logout(req.user.id);
        }

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        return res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get current user profile
 * GET /auth/me
 */
const get_profile = async (req, res, next) => {
    try {
        const user = await auth_service.get_profile(req.user.id);

        return res.json({
            success: true,
            user
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Change password
 * POST /auth/change-password
 */
const change_password = async (req, res, next) => {
    try {
        const schema = Joi.object({
            current_password: Joi.string().required().messages({
                'any.required': 'Current password is required'
            }),
            new_password: Joi.string().min(6).required().messages({
                'string.min': 'New password must be at least 6 characters',
                'any.required': 'New password is required'
            }),
            confirm_password: Joi.string().valid(Joi.ref('new_password')).required().messages({
                'any.only': 'Passwords do not match',
                'any.required': 'Confirm password is required'
            })
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        await auth_service.change_password(
            req.user.id,
            value.current_password,
            value.new_password
        );

        return res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Signup - Register new user
 * POST /auth/signup
 */
const signup = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string().min(2).max(100).required().messages({
                'string.min': 'Name must be at least 2 characters',
                'any.required': 'Name is required'
            }),
            email: Joi.string().email().required().messages({
                'string.email': 'Invalid email format',
                'any.required': 'Email is required'
            }),
            phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional().messages({
                'string.pattern.base': 'Invalid Indian phone number'
            }),
            password: Joi.string().min(6).required().messages({
                'string.min': 'Password must be at least 6 characters',
                'any.required': 'Password is required'
            }),
            confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({
                'any.only': 'Passwords do not match',
                'any.required': 'Confirm password is required'
            })
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const result = await auth_service.signup(value);

        // Set cookies
        res.cookie('accessToken', result.access_token, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
            sameSite: 'None',
            secure: true
        });

        res.cookie('refreshToken', result.refresh_token, {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
            sameSite: 'None',
            secure: true
        });

        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: result.user,
            access_token: result.access_token
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Update Profile
 * PUT /auth/profile
 */
const update_profile = async (req, res, next) => {
    try {
        const schema = Joi.object({
            // CamelCase or snake_case inputs? Frontend sends whatever
            name: Joi.string().optional(),
            displayName: Joi.string().optional().allow(''),
            display_name: Joi.string().optional().allow(''),
            phone: Joi.string().optional().allow(''),
            email: Joi.string().email().optional(), // Admin might send it but we rely on token user usually. Frontend sends for display.

            // Passwords
            currentPassword: Joi.string().optional().allow(''),
            newPassword: Joi.string().min(6).optional().allow(''),

            // Image (Base64)
            profile: Joi.string().optional().allow(''),
            profile_pic: Joi.string().optional().allow(''),

            // Ignored fields
            userType: Joi.any().optional()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return next({ status: 400, message: error.details[0].message });

        const updateData = {
            name: value.name,
            display_name: value.displayName || value.display_name,
            phone: value.phone,
            profile_pic: value.profile || value.profile_pic,
            current_password: value.currentPassword,
            new_password: value.newPassword
        };

        const updatedUser = await auth_service.update_profile(req.user.id, updateData);

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser,
            admin: updatedUser // For compatibility with frontend expecting response.admin
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    login,
    signup,
    refresh,
    logout,
    get_profile,
    change_password,
    update_profile
};

