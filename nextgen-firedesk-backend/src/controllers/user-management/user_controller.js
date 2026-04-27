/**
 * User Controller - Handles user management requests
 * Thin controller: validation only, delegates to user_service
 */
const Joi = require('joi');
const { user_service } = require('../../services');

/**
 * Get all users
 * GET /users
 */
const get_all = async (req, res, next) => {
    try {
        const filters = {
            plant_id: req.query.plant_id || req.query.plantId,
            status: req.query.status
        };

        const users = await user_service.get_all(filters);

        return res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get user by ID
 * GET /users/:id
 */
const get_by_id = async (req, res, next) => {
    try {
        const user = await user_service.get_by_id(req.params.id);

        return res.json({
            success: true,
            user
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Create user
 * POST /users
 */
const create = async (req, res, next) => {
    try {
        // Accept both camelCase (from frontend) and snake_case field names
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
            // Accept both roleId (camelCase from frontend) and role_id (snake_case)
            role_id: Joi.string().uuid(),
            roleId: Joi.string().uuid(),
            status: Joi.string().valid('active', 'inactive', 'Active', 'Inactive').default('Active'),
            // Manager fields - accept both cases
            plant_ids: Joi.array().items(Joi.string().uuid()),
            plantIds: Joi.array().items(Joi.string().uuid()),
            // Technician fields - accept both cases
            plant_id: Joi.string().uuid().allow(null),
            plantId: Joi.string().uuid().allow(null),
            manager_ids: Joi.array().items(Joi.string().uuid()),
            managerIds: Joi.array().items(Joi.string().uuid()),
            manager_id: Joi.string().uuid().allow(null),
            managerId: Joi.string().uuid().allow(null),
            category_ids: Joi.array().items(Joi.string().uuid()),
            categoryIds: Joi.array().items(Joi.string().uuid()),
            category_id: Joi.string().uuid().allow(null),
            categoryId: Joi.string().uuid().allow(null),
            plant_manager_pairs: Joi.array().items(Joi.object({
                plant_id: Joi.string().uuid(),
                plantId: Joi.string().uuid(),
                manager_id: Joi.string().uuid().allow(null),
                managerId: Joi.string().uuid().allow(null)
            })),
            plantManagerPairs: Joi.array().items(Joi.object({
                plant_id: Joi.string().uuid(),
                plantId: Joi.string().uuid(),
                manager_id: Joi.string().uuid().allow(null),
                managerId: Joi.string().uuid().allow(null)
            })),
            technician_type: Joi.string().valid('In House', 'Third Party').default('In House'),
            technicianType: Joi.string().valid('In House', 'Third Party').default('In House'),
            experience: Joi.string().allow('', null),
            specialization: Joi.string().allow('', null),
            vendor_id: Joi.string().uuid().allow(null),
            vendorId: Joi.string().uuid().allow(null)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        // Normalize to snake_case for service
        const normalizedData = {
            name: value.name,
            email: value.email,
            phone: value.phone,
            password: value.password,
            role_id: value.role_id || value.roleId,
            status: value.status,
            plant_ids: value.plant_ids || value.plantIds,
            plant_id: value.plant_id || value.plantId,
            manager_ids: value.manager_ids || value.managerIds,
            manager_id: value.manager_id || value.managerId,
            category_ids: value.category_ids || value.categoryIds,
            category_id: value.category_id || value.categoryId,
            plant_manager_pairs: value.plant_manager_pairs || value.plantManagerPairs,
            technician_type: value.technician_type || value.technicianType,
            experience: value.experience,
            specialization: value.specialization,
            vendor_id: value.vendor_id || value.vendorId
        };

        // Validate role_id is present (required)
        if (!normalizedData.role_id) {
            return next({ status: 400, message: 'Role is required' });
        }

        const user = await user_service.create(normalizedData, req.user);

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            user
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Update user
 * PUT /users/:id
 */
const update = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string(),
            email: Joi.string().email(),
            phone: Joi.string().allow('', null),
            status: Joi.string().valid('active', 'inactive', 'Active', 'Inactive')
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const user = await user_service.update(req.params.id, value, req.user);

        return res.json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Update user role
 * PUT /users/:id/role
 */
const update_role = async (req, res, next) => {
    try {
        // Accept both camelCase and snake_case
        const schema = Joi.object({
            role_id: Joi.string().uuid(),
            roleId: Joi.string().uuid()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const role_id = value.role_id || value.roleId;
        if (!role_id) {
            return next({ status: 400, message: 'Role ID is required' });
        }

        const user = await user_service.update_role(
            req.params.id,
            role_id,
            req.user
        );

        return res.json({
            success: true,
            message: 'Role updated successfully',
            user
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Get user avatar image
 * @route GET /users/:id/avatar
 */
const get_avatar = async (req, res, next) => {
    try {
        const { id } = req.params;
        const avatarBase64 = await user_service.get_avatar(id);

        if (!avatarBase64) {
            return res.status(404).send('Avatar not found');
        }

        // Extract content type and base64 data
        // Format: data:image/png;base64,iVBOR...
        const matches = avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (!matches || matches.length !== 3) {
            // Fallback if not formatted correctly or just raw base64
            const img = Buffer.from(avatarBase64, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png', // Default
                'Content-Length': img.length
            });
            return res.end(img);
        }

        const contentType = matches[1];
        const data = matches[2];
        const img = Buffer.from(data, 'base64');

        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': img.length
        });
        res.end(img);

    } catch (error) {
        next(error);
    }
};

/**
 * Delete user
 * DELETE /users/:id
 */
const delete_user = async (req, res, next) => {
    try {
        await user_service.delete(req.params.id, req.user);

        return res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Restore user
 * POST /users/:id/restore
 */
const restore = async (req, res, next) => {
    try {
        await user_service.restore(req.params.id, req.user);

        return res.json({
            success: true,
            message: 'User restored successfully'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Check phone availability
 * POST /users/check-phone
 */
const check_phone = async (req, res, next) => {
    try {
        const schema = Joi.object({
            phone: Joi.string().required(),
            exclude_user_id: Joi.string().uuid().allow(null)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const result = await user_service.check_phone(
            value.phone,
            value.exclude_user_id
        );

        return res.json({
            success: true,
            ...result
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Update manager data (frontend compatibility)
 * PUT /admin/users/:id/manager-data
 */
const update_manager_data = async (req, res, next) => {
    try {
        const { plantIds } = req.body;

        await user_service.update_manager_data(req.params.id, {
            plant_ids: plantIds
        }, req.user);

        return res.json({
            success: true,
            message: 'Manager data updated successfully'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Update technician data (frontend compatibility)
 * PUT /admin/users/:id/technician-data
 */
const update_technician_data = async (req, res, next) => {
    try {
        // Backend handles both camelCase (from frontend) and internal logic
        // Just pass the body directly to service, let service normalize/validate
        await user_service.update_technician_data(req.params.id, req.body, req.user);

        return res.json({
            success: true,
            message: 'Technician data updated successfully'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Bulk import users
 * POST /users/bulk-import
 */
const bulk_import = async (req, res, next) => {
    try {
        const schema = Joi.object({
            records: Joi.array().items(
                Joi.object({
                    name: Joi.string().required(),
                    email: Joi.string().email().required(),
                    phone: Joi.string().allow('', null),
                    password: Joi.string().min(6).required(),
                    role: Joi.string().allow('', null),
                    role_id: Joi.string().uuid().allow('', null),
                    roleId: Joi.string().uuid().allow('', null),
                    status: Joi.string().valid('active', 'inactive', 'Active', 'Inactive').default('Active')
                }).unknown(true)
            ).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return next({ status: 400, message: error.details[0].message });
        }

        const { records } = value;
        const results = await user_service.bulkImportUsers(records, req.user);

        return res.status(200).json({
            success: true,
            imported: results.imported,
            errors: results.errors,
            message: `Successfully imported ${results.imported} users${results.errors.length > 0 ? ` with ${results.errors.length} errors` : ''}`
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
    update_role,
    get_avatar,
    delete_user,
    restore,
    check_phone,
    update_manager_data,
    update_technician_data,
    bulk_import
};
