/**
 * Password Controller - Handles password reset requests
 * Thin controller: validation only, delegates to password_service
 */
const Joi = require('joi');
const { password_service } = require('../../services');

/**
 * Forgot Password - Send OTP
 * POST /auth/forgot-password
 */
const forgot_password = async (req, res, next) => {
    try {
        const schema = Joi.object({
            email: Joi.string().email().required().messages({
                'string.email': 'Please provide a valid email address',
                'any.required': 'Email is required'
            })
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const result = await password_service.forgot_password(value.email);

        return res.json({
            success: true,
            message: result.message,
            email: value.email, // Return email from input since service might not return it
            phone_mask: result.phone_mask,
            ...(result.test_mode && { otp: result.otp, test_mode: true })
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Verify OTP
 * POST /auth/verify-otp
 */
const verify_otp = async (req, res, next) => {
    try {
        const schema = Joi.object({
            email: Joi.string().email().required().messages({
                'string.email': 'Please provide a valid email address',
                'any.required': 'Email is required'
            }),
            otp: Joi.string().length(6).required().messages({
                'string.length': 'OTP must be 6 digits',
                'any.required': 'OTP is required'
            })
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const result = await password_service.verify_otp(value.email, value.otp);

        return res.json({
            success: true,
            message: 'OTP verified successfully',
            email: result.email
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Reset Password
 * POST /auth/reset-password
 */
const reset_password = async (req, res, next) => {
    try {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            otp: Joi.string().length(6).required(),
            new_password: Joi.string().min(6).required().messages({
                'string.min': 'Password must be at least 6 characters'
            }),
            confirm_password: Joi.string().valid(Joi.ref('new_password')).required().messages({
                'any.only': 'Passwords do not match'
            })
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        await password_service.reset_password(
            value.email,
            value.otp,
            value.new_password
        );

        return res.json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    forgot_password,
    verify_otp,
    reset_password
};
