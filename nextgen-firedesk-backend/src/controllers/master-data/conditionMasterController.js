const Joi = require("joi");
const conditionService = require("../../services/master-data/conditionService");

const conditionMasterController = {
    // CREATE
    async create(req, res, next) {
        const schema = Joi.object({
            condition_code: Joi.string().max(100).optional(), // Optional, will auto-generate if not provided
            condition_name: Joi.string().max(255).required(),
            severity_level: Joi.string().valid("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO").required(),
            priority_score: Joi.number().integer().min(0).max(100).required(),
            health_impact: Joi.string().valid("Healthy", "Need Attention", "Not Working", "Inventory", "Under Maintenance", "De-Active").required(),
            recommended_action: Joi.string().allow("", null),
            requires_immediate_action: Joi.boolean().default(false),
            is_active: Joi.boolean().default(true)
        });

        const { error, value } = schema.validate(req.body);
        if (error) return next(error);

        try {
            const conditionData = {
                ...value,
                created_by: req.user?.id
            };

            const condition = await conditionService.createCondition(conditionData, req.user);

            return res.status(201).json({
                success: true,
                message: "Condition master created successfully",
                data: condition
            });
        } catch (err) {
            if (err.message === 'Condition with this code already exists') {
                return res.status(409).json({
                    success: false,
                    message: err.message
                });
            }
            return next(err);
        }
    },

    // GET ALL
    async getAll(req, res, next) {
        try {
            const { isActive, severityLevel, healthImpact, ...otherFilters } = req.query;

            // Convert query params to snake_case for service
            const filters = {
                ...otherFilters,
                is_active: isActive !== undefined ? isActive === "true" : undefined,
                severity_level: severityLevel,
                health_impact: healthImpact
            };

            const result = await conditionService.getAllConditions(filters);

            return res.json({
                success: true,
                count: result.conditions.length,
                data: result.conditions,
                pagination: result.pagination
            });
        } catch (err) {
            return next(err);
        }
    },

    // GET ACTIVE (for form builder)
    async getAllActive(req, res, next) {
        try {
            const conditions = await conditionService.getActiveConditions();

            return res.json({
                success: true,
                count: conditions.length,
                data: conditions
            });
        } catch (err) {
            return next(err);
        }
    },

    // GET BY ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const condition = await conditionService.getConditionById(id);

            return res.json({
                success: true,
                data: condition
            });
        } catch (err) {
            if (err.message === 'Condition not found') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            return next(err);
        }
    },

    // GET BY SEVERITY
    async getBySeverity(req, res, next) {
        try {
            const { severity } = req.params;
            const conditions = await conditionService.getConditionsBySeverity(severity);

            return res.json({
                success: true,
                count: conditions.length,
                data: conditions
            });
        } catch (err) {
            if (err.message === 'Invalid severity level') {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            return next(err);
        }
    },

    // UPDATE
    async update(req, res, next) {
        const schema = Joi.object({
            condition_code: Joi.string().max(100),
            condition_name: Joi.string().max(255),
            severity_level: Joi.string().valid("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"),
            priority_score: Joi.number().integer().min(0).max(100),
            health_impact: Joi.string().valid("Healthy", "Need Attention", "Not Working", "Inventory", "Under Maintenance", "De-Active"),
            recommended_action: Joi.string().allow("", null),
            requires_immediate_action: Joi.boolean(),
            is_active: Joi.boolean()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return next(error);

        try {
            const { id } = req.params;
            const condition = await conditionService.updateCondition(id, value, req.user);

            return res.json({
                success: true,
                message: "Condition master updated successfully",
                data: condition
            });
        } catch (err) {
            if (err.message === 'Condition not found') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            if (err.message === 'Condition code already exists') {
                return res.status(409).json({
                    success: false,
                    message: err.message
                });
            }
            return next(err);
        }
    },

    // DELETE (soft delete)
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const result = await conditionService.deleteCondition(id, req.user);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (err) {
            if (err.message === 'Condition not found') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            return next(err);
        }
    },

    // PERMANENT DELETE
    async hardDelete(req, res, next) {
        try {
            const { id } = req.params;
            const result = await conditionService.hardDeleteCondition(id);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (err) {
            if (err.message === 'Condition not found') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            return next(err);
        }
    },

    // RESTORE (reactivate)
    async restore(req, res, next) {
        try {
            const { id } = req.params;
            const result = await conditionService.restoreCondition(id);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (err) {
            if (err.message === 'Condition not found') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            return next(err);
        }
    },

    // BULK CREATE
    async bulkCreate(req, res, next) {
        // Accept both 'conditions' and 'records' format for compatibility with import modal
        const records = req.body.conditions || req.body.records;

        if (!records || !Array.isArray(records) || records.length === 0) {
            return next({ status: 400, message: 'conditions or records array is required' });
        }

        try {
            // All business logic (normalization, creation) is in service
            const results = await conditionService.bulkImportConditions(records, req.user);

            const allSucceeded = results.errors.length === 0;
            const statusCode = allSucceeded ? 200 : 207;

            return res.status(statusCode).json({
                success: allSucceeded,
                imported: results.imported,
                message: allSucceeded
                    ? `${results.imported} condition(s) created successfully`
                    : `${results.imported} succeeded, ${results.errors.length} failed`,
                errors: results.errors.length > 0 ? results.errors : undefined,
                results
            });
        } catch (err) {
            return next(err);
        }
    }
};

module.exports = conditionMasterController;