/**
 * Permission Controller - Handles permission management requests
 * Thin controller: validation only, delegates to permission_service
 */
const Joi = require('joi');
const { permission_service } = require('../../services');
const { ENTITIES, ACTIONS, ENTITY_LABELS, PERMISSION_LEVEL_LABELS } = require('../../utils/permission_constants');

/**
 * Get all permissions
 * GET /permissions
 */
const get_all = async (req, res, next) => {
    try {
        const permissions = await permission_service.get_all();

        return res.json({
            success: true,
            count: permissions.length,
            permissions
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get permissions grouped by entity
 * GET /permissions/grouped
 */
const get_grouped = async (req, res, next) => {
    try {
        const grouped = await permission_service.get_grouped_by_entity();

        return res.json({
            success: true,
            permissions: grouped,
            entities: ENTITY_LABELS,
            levels: PERMISSION_LEVEL_LABELS
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get permission by ID
 * GET /permissions/:id
 */
const get_by_id = async (req, res, next) => {
    try {
        const permission = await permission_service.get_by_id(req.params.id);

        return res.json({
            success: true,
            permission
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get permissions for a role
 * GET /permissions/role/:role_id
 */
const get_by_role = async (req, res, next) => {
    try {
        const permissions = await permission_service.get_by_role(req.params.role_id);

        return res.json({
            success: true,
            count: permissions.length,
            permissions
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Create permission
 * POST /permissions
 */
const create = async (req, res, next) => {
    try {
        const schema = Joi.object({
            entity_name: Joi.string().valid(...Object.values(ENTITIES)).required().messages({
                'any.required': 'Entity name is required',
                'any.only': 'Invalid entity name'
            }),
            action_name: Joi.string().valid(...Object.values(ACTIONS)).required().messages({
                'any.required': 'Action name is required',
                'any.only': 'Invalid action name'
            })
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const permission = await permission_service.create(value);

        return res.status(201).json({
            success: true,
            message: 'Permission created successfully',
            permission
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Create multiple permissions for an entity
 * POST /permissions/entity
 */
const create_for_entity = async (req, res, next) => {
    try {
        const schema = Joi.object({
            entity_name: Joi.string().valid(...Object.values(ENTITIES)).required(),
            actions: Joi.array().items(
                Joi.string().valid(...Object.values(ACTIONS))
            ).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const permissions = await permission_service.create_for_entity(
            value.entity_name,
            value.actions
        );

        return res.status(201).json({
            success: true,
            message: 'Permissions created successfully',
            permissions
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Delete permission
 * DELETE /permissions/:id
 */
const delete_permission = async (req, res, next) => {
    try {
        await permission_service.delete(req.params.id);

        return res.json({
            success: true,
            message: 'Permission deleted successfully'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Sync default permissions
 * POST /permissions/sync
 */
const sync_defaults = async (req, res, next) => {
    try {
        await permission_service.sync_defaults(ENTITIES, ACTIONS);

        const permissions = await permission_service.get_all();

        return res.json({
            success: true,
            message: 'Default permissions synced successfully',
            count: permissions.length,
            permissions
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get available entities and actions (for UI dropdowns)
 * GET /permissions/constants
 */
const get_constants = async (req, res, next) => {
    try {
        return res.json({
            success: true,
            entities: ENTITIES,
            entity_labels: ENTITY_LABELS,
            actions: ACTIONS,
            permission_levels: PERMISSION_LEVEL_LABELS
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    get_all,
    get_grouped,
    get_by_id,
    get_by_role,
    create,
    create_for_entity,
    delete_permission,
    sync_defaults,
    get_constants
};
