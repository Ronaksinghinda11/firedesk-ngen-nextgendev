const Joi = require("joi");
const industryService = require("../../services/master-data/industryService");

const industryController = {
    async create(req, res, next) {
        const schema = Joi.object({
            industry_name: Joi.string().required(),
            industry_code: Joi.string().optional(), // Optional, will auto-generate if not provided
            status: Joi.string().valid("Active", "Inactive").optional()
        });

        const { error } = schema.validate(req.body);
        if (error) return next(error);

        try {
            const industryData = {
                ...req.body,
                created_by: req.user?.id
            };

            const industry = await industryService.createIndustry(industryData, req.user);

            return res.status(201).json({
                success: true,
                industry,
                message: "Industry created successfully"
            });
        } catch (err) {
            if (err.message === 'Industry name already exists') {
                return next({ status: 400, message: err.message });
            }
            if (err.message === 'Industry code already exists') {
                return next({ status: 400, message: err.message });
            }
            return next(err);
        }
    },

    async getAll(req, res, next) {
        try {
            const result = await industryService.getAllIndustries(req.query);
            return res.json({
                allIndustry: result.industries,
                pagination: result.pagination
            });
        } catch (err) {
            return next(err);
        }
    },

    async getAllActive(req, res, next) {
        try {
            console.log('🔍 getAllActive called');
            const industries = await industryService.getActiveIndustries();
            console.log('📊 Industries from service:', industries.length, industries);
            const response = {
                industries,
                allIndustry: industries,
                success: true
            };
            console.log('📤 Response being sent:', JSON.stringify(response).substring(0, 200));
            return res.json(response);
        } catch (err) {
            console.error('❌ Error in getAllActive:', err);
            return next(err);
        }
    },

    async getById(req, res, next) {
        const schema = Joi.object({ id: Joi.string().required() });
        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const industry = await industryService.getIndustryById(req.params.id);
            return res.json({
                success: true,
                industry
            });
        } catch (err) {
            if (err.message === 'Industry not found') {
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
            industry_name: Joi.string().optional(),
            industry_code: Joi.string().optional(),
            status: Joi.string().valid("Active", "Inactive").optional()
        });
        const { error: bodyError } = bodySchema.validate(req.body);
        if (bodyError) return next(bodyError);

        try {
            const industry = await industryService.updateIndustry(req.params.id, req.body, req.user);

            return res.json({
                success: true,
                industry,
                message: "Industry updated successfully"
            });
        } catch (err) {
            if (err.message === 'Industry not found') {
                return next({ status: 404, message: err.message });
            }
            if (err.message === 'Industry name already exists') {
                return next({ status: 400, message: err.message });
            }
            if (err.message === 'Industry code already exists') {
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
            const result = await industryService.deleteIndustry(req.params.id, req.user);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (err) {
            if (err.message === 'Industry not found') {
                return next({ status: 404, message: err.message });
            }
            if (err.message.includes('Cannot delete industry')) {
                return next({ status: 400, message: err.message });
            }
            console.error('Delete industry error:', err);
            return next({
                status: 500,
                message: "Failed to archive industry."
            });
        }
    },

    async hardDelete(req, res, next) {
        const schema = Joi.object({ id: Joi.string().required() });
        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const result = await industryService.hardDeleteIndustry(req.params.id);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (err) {
            if (err.message === 'Industry not found') {
                return next({ status: 404, message: err.message });
            }
            if (err.message.includes('Cannot delete industry')) {
                return next({ status: 400, message: err.message });
            }
            console.error('Hard delete industry error:', err);
            return next({
                status: 500,
                message: "Failed to permanently delete industry."
            });
        }
    },

    async restore(req, res, next) {
        try {
            const { id } = req.params;
            const result = await industryService.restoreIndustry(id, req.user);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (err) {
            if (err.message === 'Industry not found') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            return next(err);
        }
    },

    // BULK IMPORT
    async bulkImport(req, res, next) {
        const records = req.body.records;

        if (!records || !Array.isArray(records) || records.length === 0) {
            return next({ status: 400, message: 'records array is required' });
        }

        try {
            // All business logic (normalization, creation) is in service
            const results = await industryService.bulkImportIndustries(records, req.user?.id);

            return res.status(200).json({
                success: true,
                imported: results.imported,
                errors: results.errors.length > 0 ? results.errors : undefined,
                message: `Imported ${results.imported} industries${results.errors.length > 0 ? ` with ${results.errors.length} errors` : ''}`
            });
        } catch (err) {
            return next(err);
        }
    }
};

module.exports = industryController;