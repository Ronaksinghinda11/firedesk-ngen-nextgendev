/**
 * Manager Controller - Handles manager management requests
 * Thin controller: validation only, delegates to manager_service
 */
const Joi = require('joi');
const { manager_service, user_service } = require('../../services');

/**
 * Get all managers
 * GET /managers
 */
const get_all = async (req, res, next) => {
    try {
        const filters = {
            plant_id: req.query.plant_id || req.query.plantId
        };

        const managers = await manager_service.get_all(filters);

        return res.json({
            success: true,
            count: managers.length,
            managers
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get manager by ID
 * GET /managers/:id
 */
const get_by_id = async (req, res, next) => {
    try {
        const manager = await manager_service.get_by_id(req.params.id);

        return res.json({
            success: true,
            manager
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Create manager (creates both user and manager records)
 * POST /managers
 */
const create = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string().required().messages({
                'any.required': 'Name is required'
            }),
            email: Joi.string().email().required().messages({
                'string.email': 'Please provide a valid email',
                'any.required': 'Email is required'
            }),
            phone: Joi.string().allow('', null),
            password: Joi.string().min(6).required().messages({
                'string.min': 'Password must be at least 6 characters',
                'any.required': 'Password is required'
            }),
            role_id: Joi.string().uuid().required().messages({
                'any.required': 'Role is required'
            }),
            plant_ids: Joi.array().items(Joi.string().uuid()).default([]),
            status: Joi.string().valid('active', 'inactive', 'Active', 'Inactive').default('active')
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        // Use user_service.create which handles manager creation
        const user = await user_service.create(value, req.user.id);

        return res.status(201).json({
            success: true,
            message: 'Manager created successfully',
            manager: user
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Update manager data (plant associations)
 * PUT /managers/:id
 */
const update = async (req, res, next) => {
    try {
        const schema = Joi.object({
            plant_ids: Joi.array().items(Joi.string().uuid())
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        // Get manager to find user_id
        const manager = await manager_service.get_by_id(req.params.id);
        const updated = await manager_service.update_data(manager.user_id, value);

        return res.json({
            success: true,
            message: 'Manager updated successfully',
            manager: updated
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Update manager status
 * PUT /managers/:id/status
 */
const update_status = async (req, res, next) => {
    try {
        const schema = Joi.object({
            status: Joi.string().valid('active', 'inactive', 'Active', 'Inactive').required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const manager = await manager_service.update_status(req.params.id, value.status);

        return res.json({
            success: true,
            message: 'Status updated successfully',
            manager
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Delete manager
 * DELETE /managers/:id
 */
const delete_manager = async (req, res, next) => {
    try {
        await manager_service.delete(req.params.id);

        return res.json({
            success: true,
            message: 'Manager deleted successfully'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get assigned plants for the logged-in manager
 * GET /managers/me/plants
 */
const get_assigned_plants = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Delegate business logic to service
        const plants = await manager_service.get_assigned_plants_with_details(userId);

        return res.json({
            success: true,
            count: plants.length,
            plants
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    get_all,
    get_by_id,
    create,
    update,
    update_status,
    update_status,
    delete_manager,
    get_assigned_plants
};
