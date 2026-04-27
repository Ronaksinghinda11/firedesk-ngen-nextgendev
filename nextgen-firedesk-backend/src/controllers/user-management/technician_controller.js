/**
 * Technician Controller - Handles technician management requests
 * Thin controller: validation only, delegates to technician_service
 */
const Joi = require('joi');
const { technician_service, user_service } = require('../../services');

/**
 * Get all technicians
 * GET /technicians
 * If user is a manager, only returns technicians assigned to their plants
 */
const get_all = async (req, res, next) => {
    try {
        const filters = {
            plant_id: req.query.plant_id || req.query.plantId,
            user_type: req.user?.user_type || req.user?.userType,
            user_id: req.user?.id,
            status: req.query.status // Add status filter for archive functionality
        };

        // If manager, restrict to their assigned plants
        if (req.managerPlantIds && req.managerPlantIds.length > 0) {
            filters.allowedPlantIds = req.managerPlantIds;
            console.log(`[TechnicianController] Manager restricted to plants: ${req.managerPlantIds.join(', ')}`);
        }

        const technicians = await technician_service.get_all(filters);

        return res.json({
            success: true,
            count: technicians.length,
            technicians
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get technician by ID
 * GET /technicians/:id
 */
const get_by_id = async (req, res, next) => {
    try {
        const technician = await technician_service.get_by_id(req.params.id);

        return res.json({
            success: true,
            technician
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Create technician
 * POST /technicians
 */
const create = async (req, res, next) => {
    try {
        const base_schema = {
            name: Joi.string().required().messages({
                'any.required': 'Name is required'
            }),
            email: Joi.string().email().required().messages({
                'string.email': 'Please provide a valid email',
                'any.required': 'Email is required'
            }),
            phone: Joi.string().allow('', null),
            password: Joi.string().min(6).allow('', null),
            role_id: Joi.string().uuid().required().messages({
                'any.required': 'Role is required'
            }),
            technician_type: Joi.string().valid('In House', 'Third Party').required().messages({
                'any.required': 'Technician type is required'
            }),
            experience: Joi.string().allow('', null),
            specialization: Joi.string().allow('', null),
            status: Joi.string().valid('active', 'inactive', 'Active', 'Inactive').default('active')
        };

        // In House: single plant, multiple managers, multiple categories
        const in_house_schema = Joi.object({
            ...base_schema,
            technician_type: Joi.string().valid('In House').required(),
            plant_id: Joi.string().uuid().required().messages({
                'any.required': 'Plant is required for In House technicians'
            }),
            manager_ids: Joi.array().items(Joi.string().uuid()),
            manager_id: Joi.string().uuid().allow(null),
            category_ids: Joi.array().items(Joi.string().uuid()),
            category_id: Joi.string().uuid().allow(null)
        });

        // Third Party: multiple plants, M:M managers via plant_manager_pairs, multiple categories
        const third_party_schema = Joi.object({
            ...base_schema,
            technician_type: Joi.string().valid('Third Party').required(),
            plant_ids: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
                'array.min': 'At least one plant is required for Third Party technicians'
            }),
            plant_manager_pairs: Joi.array().items(Joi.object({
                plant_id: Joi.string().uuid().required(),
                manager_id: Joi.string().uuid().allow(null)
            })),
            manager_ids: Joi.array().items(Joi.string().uuid()),
            category_ids: Joi.array().items(Joi.string().uuid()),
            category_id: Joi.string().uuid().allow(null),
            vendor_id: Joi.string().uuid().allow(null)
        });

        // Choose schema based on technician_type
        const technician_type = req.body.technician_type || 'In House';
        const schema = technician_type === 'Third Party' ? third_party_schema : in_house_schema;

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const technician = await technician_service.create(value, req.user.id);

        return res.status(201).json({
            success: true,
            message: 'Technician created successfully',
            technician
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Update technician
 * PUT /technicians/:id
 */
const update = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string(),
            email: Joi.string().email(),
            phone: Joi.string().allow('', null),
            role_id: Joi.string().uuid(),
            technician_type: Joi.string().valid('In House', 'Third Party'),
            experience: Joi.string().allow('', null),
            specialization: Joi.string().allow('', null),
            status: Joi.string().valid('active', 'inactive', 'Active', 'Inactive'),
            plant_id: Joi.string().uuid().allow(null),
            plant_ids: Joi.array().items(Joi.string().uuid()),
            plant_manager_pairs: Joi.array().items(Joi.object({
                plant_id: Joi.string().uuid().required(),
                manager_id: Joi.string().uuid().allow(null)
            })),
            manager_ids: Joi.array().items(Joi.string().uuid()),
            manager_id: Joi.string().uuid().allow(null),
            category_ids: Joi.array().items(Joi.string().uuid()),
            category_id: Joi.string().uuid().allow(null),
            vendor_id: Joi.string().uuid().allow(null)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const technician = await technician_service.update(req.params.id, value);

        return res.json({
            success: true,
            message: 'Technician updated successfully',
            technician
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Delete technician
 * DELETE /technicians/:id
 */
const delete_technician = async (req, res, next) => {
    try {
        await technician_service.delete(req.params.id);

        return res.json({
            success: true,
            message: 'Technician deleted successfully'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Restore technician (set status to Active)
 * POST /technicians/:id/restore
 */
const restore = async (req, res, next) => {
    try {
        const technician = await technician_service.update(req.params.id, { status: 'Active' });

        return res.json({
            success: true,
            message: 'Technician restored successfully',
            technician
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
    delete_technician,
    restore
};
