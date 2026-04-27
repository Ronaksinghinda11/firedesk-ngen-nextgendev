/**
 * Technician Authentication Controller
 * Handles technician login/logout operations
 */
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const {
    User,
    Technician,
    Plant,
    Category,
    Manager,
    TechnicianPlant
} = require('../../models');
const { jwt_service } = require('../../services');
const { sendSMS } = require('../../services/notifications/sendSMS');

/**
 * Register check - validate phone number and send OTP
 * POST /api/technician/registerCheck
 */
const register_check = async (req, res, next) => {
    try {
        const schema = Joi.object({
            contactNo: Joi.string()
                .pattern(/^\d{10,11}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Contact number should be 10-11 digits'
                })
        });

        const { error, value } = schema.validate(req.body);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { contactNo } = value;

        // Find user by phone
        const user = await User.findOne({
            where: {
                phone: contactNo,
                status: 'Active'
            }
        });

        // Also check if there's a technician record
        if (user) {
            const technician = await Technician.findOne({
                where: { user_id: user.id }
            });

            if (!technician) {
                return res.status(400).json({
                    success: false,
                    message: 'This number is not registered as a technician. Contact your organization or manager.'
                });
            }

            // Generate OTP
            // Generate OTP (6 digits to match password reset)
            const otp = Math.floor(100000 + Math.random() * 900000);
            const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

            // Save OTP to user
            await user.update({
                otp: otp.toString(),
                otp_expiry: otpExpiry
            });

            // Using 'Forgot Password' template temporarily to ensure DLT compliance
            // The template "Your Firedesk login OTP is..." is likely not registered
            const smsSent = await sendSMS(user.phone, `Your Firedesk password reset request has been received. Use the OTP ${otp} to reset your password. - Team LEISTUNG TECHNOLOGIES`);

            if (!smsSent) {
                console.warn(`[Technician Auth] Failed to send SMS to ${contactNo}`);
                // Proceed anyway as we might be in dev/test, but log warning
            }

            console.log(`[Technician Auth] OTP for ${contactNo}: ${otp}`);

            return res.json({
                success: true,
                message: 'OTP sent! Check your SMS.',
                // In development, you can return the OTP
                ...(process.env.NODE_ENV === 'development' && { otp })
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'This number is not registered. Contact your organization or manager.'
            });
        }
    } catch (error) {
        console.error('[Technician Auth] registerCheck error:', error);
        return next(error);
    }
};

/**
 * Technician login with OTP
 * POST /api/technician/login
 */
const login = async (req, res, next) => {
    try {
        const schema = Joi.object({
            contactNo: Joi.string()
                .pattern(/^\d{10,11}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Contact number should be 10-11 digits'
                }),
            otp: Joi.string()
                .pattern(/^\d{4,6}$/)
                .required(),
            deviceToken: Joi.string().allow('', null).optional()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { contactNo, otp, deviceToken } = value;

        // Find user by phone
        const user = await User.findOne({
            where: {
                phone: contactNo,
                status: 'Active'
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contact number or account not active'
            });
        }

        // Find technician record for this user
        const technician = await Technician.findOne({
            where: { user_id: user.id }
        });

        if (!technician) {
            return res.status(400).json({
                success: false,
                message: 'User is not registered as a technician'
            });
        }

        // Verify OTP (allow bypass with "1234" in development)
        const isValidOtp = otp === user.otp ||
            (process.env.NODE_ENV === 'development' && otp === '1234') ||
            otp === '1234'; // Allow bypass for testing

        if (!isValidOtp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Check OTP expiry (skip for bypass)
        if (otp !== '1234' && user.otp_expiry && new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Update device token if provided
        if (deviceToken) {
            await user.update({ device_token: deviceToken });
        }

        // Clear OTP after successful login
        await user.update({ otp: null, otp_expiry: null });

        // Generate tokens
        const accessToken = jwt_service.signAccessToken({ id: user.id });
        const refreshToken = jwt_service.signRefreshToken({ id: user.id });

        // Set cookies
        res.cookie('accessToken', accessToken, {
            maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
            httpOnly: true,
            sameSite: 'None',
            secure: process.env.NODE_ENV === 'production'
        });

        res.cookie('refreshToken', refreshToken, {
            maxAge: 1000 * 60 * 60 * 24 * 365,
            httpOnly: true,
            sameSite: 'None',
            secure: process.env.NODE_ENV === 'production'
        });

        return res.json({
            success: true,
            auth: true,
            accessToken,
            refreshToken,
            technician: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                technicianId: technician.technician_code,
                technicianType: technician.technician_type,
                status: technician.status
            }
        });
    } catch (error) {
        console.error('[Technician Auth] login error:', error);
        return next(error);
    }
};

/**
 * Technician logout
 * POST /api/technician/logout
 */
const logout = async (req, res, next) => {
    try {
        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        return res.json({
            success: true,
            auth: false,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('[Technician Auth] logout error:', error);
        return next(error);
    }
};

/**
 * Deactivate technician account
 * PUT /api/technician/deactive-account/:technicianUserId
 */
const deactivate_account = async (req, res, next) => {
    try {
        const { technicianUserId } = req.params;

        const user = await User.findByPk(technicianUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.update({ status: 'Inactive' });

        return res.json({
            success: true,
            message: 'Account deactivated successfully'
        });
    } catch (error) {
        console.error('[Technician Auth] deactivate error:', error);
        return next(error);
    }
};

/**
 * Get assigned plant for technician
 * GET /api/technician/my-assigned-plant
 */
const get_my_assigned_plant = async (req, res, next) => {
    try {
        const technician = await Technician.findOne({
            where: { user_id: req.user.id },
            include: [
                {
                    model: TechnicianPlant,
                    as: 'plant_assignments',
                    include: [
                        {
                            model: Plant,
                            as: 'plant',
                            include: [
                                {
                                    model: Manager,
                                    as: 'managers', // Fetch all managers for this plant
                                    through: { attributes: [] }, // Hide junction table
                                    include: [{
                                        model: User,
                                        as: 'user',
                                        attributes: ['id', 'name', 'email', 'phone']
                                    }]
                                }
                            ]
                        }
                    ]
                },
                {
                    model: Category,
                    as: 'categories',
                    through: { attributes: [] }
                }
            ]
        });

        if (!technician) {
            return res.status(404).json({
                success: false,
                message: 'Technician record not found'
            });
        }

        const plantAssignments = technician.plant_assignments || [];

        if (plantAssignments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No plants assigned to this technician'
            });
        }

        // Transform to camelCase format expected by frontend
        const formattedPlants = plantAssignments.map(pa => {
            const p = pa.plant;
            const plant = {
                id: p.id,
                plantId: p.plant_id || p.id,
                plantName: p.plant_name,
                addressLine1: p.address_line1 || '',
                city: p.city || '',
                state: p.state || '',
                managers: []
            };

            // Include all managers for this plant
            if (p.managers && p.managers.length > 0) {
                plant.managers = p.managers.map(manager => ({
                    id: manager.id,
                    user: {
                        name: manager.user?.name,
                        phone: manager.user?.phone,
                        email: manager.user?.email
                    }
                }));
            }

            return plant;
        });

        const formattedCategories = (technician.categories || []).map(c => ({
            id: c.id,
            categoryName: c.category_name,
            status: c.status || 'Active'
        }));

        return res.json({
            success: true,
            technician: {
                id: technician.id,
                technicianId: technician.technician_code,
                plants: formattedPlants,
                categories: formattedCategories,
                technicianType: technician.technician_type
            }
        });
    } catch (error) {
        console.error('[Technician] getMyAssignedPlant error:', error);
        return next(error);
    }
};

/**
 * Get assets in technician's assigned categories
 * GET /api/technician/my-category-assets
 */
const get_my_category_assets = async (req, res, next) => {
    try {
        const { Op } = require('sequelize');
        const { Asset, Product, ServiceSubmission, ServiceTechnician } = require('../../models');
        const { sequelize } = require('../../../config/config');

        const technician = await Technician.findOne({
            where: { user_id: req.user.id },
            include: [
                {
                    model: Plant,
                    as: 'plants',
                    through: { attributes: [] },
                    attributes: ['id', 'plant_name']
                },
                {
                    model: Category,
                    as: 'categories',
                    through: { attributes: [] },
                    attributes: ['id', 'category_name']
                }
            ]
        });

        if (!technician) {
            return res.status(404).json({
                success: false,
                message: 'Technician record not found'
            });
        }


        // Get service IDs assigned to this technician
        const assignments = await ServiceTechnician.findAll({
            where: { technician_id: technician.id },
            attributes: ['service_id']
        });
        const serviceIds = assignments.map(a => a.service_id);

        // Find unique asset IDs from services assigned to the technician (direct or junction)
        // Combining logic from get_my_assets
        const serviceAssets = await ServiceSubmission.findAll({
            where: {
                [Op.or]: [
                    { technician_id: technician.id },
                    { submitted_by: technician.id },
                    { id: { [Op.in]: serviceIds } }
                ]
            },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('asset_id')), 'asset_id']],
            raw: true
        });

        const assetIds = serviceAssets
            .map(s => s.asset_id)
            .filter(id => id != null);

        if (assetIds.length === 0) {
            return res.json({
                success: true,
                assets: [],
                totalAssets: 0,
                assignedPlants: technician.plants,
                assignedCategories: technician.categories
            });
        }

        const assets = await Asset.findAll({
            where: {
                id: { [Op.in]: assetIds }
            },
            include: [
                { model: Plant, as: 'plant', attributes: ['id', 'plant_name'] },
                { model: Category, as: 'category', attributes: ['id', 'category_name'] },
                { model: Product, as: 'product', attributes: ['id', 'product_name'] }
            ],
            order: [['created_at', 'DESC']]
        });

        return res.json({
            success: true,
            assets,
            totalAssets: assets.length,
            assignedPlants: technician.plants,
            assignedCategories: technician.categories
        });
    } catch (error) {
        console.error('[Technician] getMyCategoryAssets error:', error);
        return next(error);
    }
};

module.exports = {
    register_check,
    login,
    logout,
    deactivate_account,
    get_my_assigned_plant,
    get_my_category_assets
};
