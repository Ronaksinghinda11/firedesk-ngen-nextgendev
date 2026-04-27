/**
 * Role Controller - Handles role management requests
 * Thin controller: validation only, delegates to role_service
 */
const Joi = require('joi');
const { role_service } = require('../../services');

/**
 * Get all roles
 * GET /roles
 */
const get_all = async (req, res, next) => {
    try {
        const roles = await role_service.get_all();

        return res.json({
            success: true,
            count: roles.length,
            roles
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get role by ID
 * GET /roles/:id
 */
const get_by_id = async (req, res, next) => {
    try {
        const role = await role_service.get_by_id(req.params.id);

        return res.json({
            success: true,
            role
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Create role
 * POST /roles
 */
const create = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string().max(100).required().messages({
                'any.required': 'Role name is required',
                'string.max': 'Role name must be 100 characters or less'
            }),
            description: Joi.string().max(500).allow('', null),
            permissions: Joi.object().optional()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const role = await role_service.create(value, req.user);

        return res.status(201).json({
            success: true,
            message: 'Role created successfully',
            role
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Update role
 * PUT /roles/:id
 */
const update = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string().max(100),
            description: Joi.string().max(500).allow('', null),
            permissions: Joi.object().optional() // Allow frontend permission structure
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const role = await role_service.update(req.params.id, value, req.user);

        return res.json({
            success: true,
            message: 'Role updated successfully',
            role
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Delete role
 * DELETE /roles/:id
 */
const delete_role = async (req, res, next) => {
    try {
        await role_service.delete(req.params.id, req.user);

        return res.json({
            success: true,
            message: 'Role deleted successfully'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Assign permissions to role
 * PUT /roles/:id/permissions
 */
const assign_permissions = async (req, res, next) => {
    try {
        const schema = Joi.object({
            permission_ids: Joi.array().items(Joi.string().uuid()).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const role = await role_service.assign_permissions(
            req.params.id,
            value.permission_ids,
            req.user
        );

        return res.json({
            success: true,
            message: 'Permissions assigned successfully',
            role
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
    delete_role,
    assign_permissions
};
