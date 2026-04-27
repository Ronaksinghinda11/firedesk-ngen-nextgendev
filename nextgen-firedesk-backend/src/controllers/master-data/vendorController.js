const Joi = require("joi");
const vendorService = require("../../services/master-data/vendorService");

const vendorController = {
    async create(req, res, next) {
        const schema = Joi.object({
            vendor_name: Joi.string().required(),
            vendor_code: Joi.string().optional(), // Optional, will auto-generate if not provided
            address: Joi.string().allow('', null).optional(),
            country: Joi.string().allow('', null).optional(),
            state: Joi.string().allow('', null).optional(),
            city: Joi.string().allow('', null).optional(),
            zipcode: Joi.string().allow('', null).optional(),
            contact_name: Joi.string().allow('', null).optional(),
            email: Joi.string().email().allow('', null).optional(),
            phone_no: Joi.string().allow('', null).optional(),
            status: Joi.string().valid("Active", "Inactive").optional()
        });

        const { error } = schema.validate(req.body);
        if (error) return next(error);

        try {
            const vendorData = {
                ...req.body,
                created_by: req.user?.id
            };

            const vendor = await vendorService.createVendor(vendorData, req.user);

            return res.status(201).json({
                success: true,
                vendor,
                message: "Vendor created successfully"
            });
        } catch (err) {
            if (err.message === 'Vendor name already exists') {
                return next({ status: 400, message: err.message });
            }
            if (err.message === 'Email already exists') {
                return next({ status: 400, message: err.message });
            }
            if (err.message === 'Vendor code already exists') {
                return next({ status: 400, message: err.message });
            }
            return next(err);
        }
    },

    async getAll(req, res, next) {
        try {
            const result = await vendorService.getAllVendors(req.query);
            return res.json({
                success: true,
                vendors: result.vendors,
                pagination: result.pagination
            });
        } catch (err) {
            return next(err);
        }
    },

    async getAllActive(req, res, next) {
        try {
            const vendors = await vendorService.getActiveVendors();
            return res.json({
                success: true,
                vendors
            });
        } catch (err) {
            return next(err);
        }
    },

    async getById(req, res, next) {
        const schema = Joi.object({ id: Joi.string().required() });
        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const vendor = await vendorService.getVendorById(req.params.id);
            return res.json({
                success: true,
                vendor
            });
        } catch (err) {
            if (err.message === 'Vendor not found') {
                return next({ status: 404, message: err.message });
            }
            return next(err);
        }
    },

    async update(req, res, next) {
        // Validate URL parameter
        const paramSchema = Joi.object({
            id: Joi.string().required()
        });
        const { error: paramError } = paramSchema.validate(req.params);
        if (paramError) return next(paramError);

        // Validate request body
        const bodySchema = Joi.object({
            vendor_name: Joi.string().optional(),
            vendor_code: Joi.string().optional(),
            address: Joi.string().allow('', null).optional(),
            country: Joi.string().allow('', null).optional(),
            state: Joi.string().allow('', null).optional(),
            city: Joi.string().allow('', null).optional(),
            zipcode: Joi.string().allow('', null).optional(),
            contact_name: Joi.string().allow('', null).optional(),
            email: Joi.string().email().allow('', null).optional(),
            phone_no: Joi.string().allow('', null).optional(),
            status: Joi.string().valid("Active", "Inactive").optional()
        });
        const { error: bodyError } = bodySchema.validate(req.body);
        if (bodyError) return next(bodyError);

        try {
            const vendor = await vendorService.updateVendor(req.params.id, req.body, req.user);

            return res.json({
                success: true,
                vendor,
                message: "Vendor updated successfully"
            });
        } catch (err) {
            if (err.message === 'Vendor not found') {
                return next({ status: 404, message: err.message });
            }
            if (err.message === 'Vendor name already exists') {
                return next({ status: 400, message: err.message });
            }
            if (err.message === 'Email already exists') {
                return next({ status: 400, message: err.message });
            }
            if (err.message === 'Vendor code already exists') {
                return next({ status: 400, message: err.message });
            }
            return next(err);
        }
    },

    async delete(req, res, next) {
        const schema = Joi.object({ id: Joi.string().required() });
        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const result = await vendorService.deleteVendor(req.params.id, req.user);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (err) {
            if (err.message === 'Vendor not found') {
                return next({ status: 404, message: err.message });
            }
            if (err.message.includes('Cannot delete vendor')) {
                return next({ status: 400, message: err.message });
            }
            console.error('Delete vendor error:', err);
            return next({
                status: 500,
                message: "Failed to archive vendor."
            });
        }
    },

    // Hard delete (permanent)
    async hardDelete(req, res, next) {
        const schema = Joi.object({ id: Joi.string().required() });
        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const result = await vendorService.hardDeleteVendor(req.params.id);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (err) {
            if (err.message === 'Vendor not found') {
                return next({ status: 404, message: err.message });
            }
            if (err.message.includes('Cannot delete vendor')) {
                return next({ status: 400, message: err.message });
            }
            console.error('Hard delete vendor error:', err);
            return next({
                status: 500,
                message: "Failed to permanently delete vendor."
            });
        }
    },

    // Restore an archived vendor
    async restore(req, res, next) {
        const schema = Joi.object({ id: Joi.string().required() });
        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const { id } = req.params;
            const result = await vendorService.restoreVendor(id);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (err) {
            if (err.message === 'Vendor not found') {
                return next({ status: 404, message: err.message });
            }
            // You might have other domain-specific errors from service
            return next(err);
        }
    },

    // BULK IMPORT
    async bulkImport(req, res, next) {
        const schema = Joi.object({
            records: Joi.array().items(
                Joi.object({
                    vendor_name: Joi.string().required(),
                    vendor_code: Joi.string().optional(),
                    address: Joi.string().allow('', null).optional(),
                    country: Joi.string().allow('', null).optional(),
                    state: Joi.string().allow('', null).optional(),
                    city: Joi.string().allow('', null).optional(),
                    zipcode: Joi.string().allow('', null).optional(),
                    contact_name: Joi.string().allow('', null).optional(),
                    email: Joi.string().email().allow('', null).optional(),
                    phone_no: Joi.string().allow('', null).optional(),
                    status: Joi.string().valid("Active", "Inactive").optional()
                }).unknown(true) // allow extra fields per record if present
            ).min(1).required()
        });

        const { error } = schema.validate(req.body);
        if (error) return next(error);

        try {
            // All business logic (normalization, creation) should be in service
            const results = await vendorService.bulkImportVendors(req.body.records, req.user?.id);

            return res.status(200).json({
                success: true,
                imported: results.imported,
                errors: results.errors && results.errors.length > 0 ? results.errors : undefined,
                message: `Imported ${results.imported} vendors${results.errors && results.errors.length > 0 ? ` with ${results.errors.length} errors` : ''}`
            });
        } catch (err) {
            return next(err);
        }
    }
};

module.exports = vendorController;
