const Joi = require("joi");
const categoryService = require("../../services/master-data/categoryService");
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const categoryController = {
    // CREATE CATEGORY
    async create(req, res, next) {
        const createCategorySchema = Joi.object({
            category_name: Joi.string().required(),
            test_frequency_required: Joi.boolean().optional(),
            status: Joi.string().valid("Active", "Inactive").optional()
        });

        const { error } = createCategorySchema.validate(req.body);
        if (error) return next(error);

        try {
            const categoryData = {
                ...req.body,
                created_by: req.user.id
            };

            const category = await categoryService.createCategory(categoryData, req.user);

            return res.status(201).json({
                success: true,
                category,
                message: "Category created successfully"
            });
        } catch (error) {
            if (error.message === 'Form not found') {
                return next({ status: 404, message: error.message });
            }
            if (error.message === 'Category name already exists') {
                return next({ status: 400, message: error.message });
            }
            return next(error);
        }
    },

    // GET ALL CATEGORIES
    async getAll(req, res, next) {
        try {
            const allCategory = await categoryService.getAllCategories(req.query, req.user);
            return res.json({ allCategory });
        } catch (error) {
            return next(error);
        }
    },

    // GET ACTIVE CATEGORIES
    async getActiveCategories(req, res, next) {
        try {
            console.log('🔍 getActiveCategories called with query:', req.query);
            const categories = await categoryService.getActiveCategories(req.query, req.user);
            console.log('📊 Categories from service:', categories.length, categories.map(c => c.category_name));
            const response = {
                categories,
                activeCategories: categories,
                allCategory: categories,
                success: true
            };
            console.log('📤 Response being sent:', JSON.stringify(response).substring(0, 200));
            return res.json(response);
        } catch (error) {
            console.error('❌ Error in getActiveCategories:', error);
            return next(error);
        }
    },

    // GET CATEGORY BY ID
    async getById(req, res, next) {
        const getByIdSchema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = getByIdSchema.validate(req.params);
        if (error) return next(error);

        try {
            const category = await categoryService.getCategoryById(req.params.id);
            return res.json({
                success: true,
                category
            });
        } catch (error) {
            if (error.message === 'Category not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    // UPDATE CATEGORY
    async update(req, res, next) {
        const updateCategorySchema = Joi.object({
            category_name: Joi.string().optional(),
            test_frequency_required: Joi.boolean().optional(),
            status: Joi.string().valid("Active", "Inactive").required(),
        });

        const { error } = updateCategorySchema.validate(req.body);
        if (error) return next(error);

        try {
            const category = await categoryService.updateCategory(req.params.id, req.body, req.user);

            return res.json({
                success: true,
                category,
                message: "Category updated successfully"
            });
        } catch (error) {
            if (error.message === 'Category not found') {
                return next({ status: 404, message: error.message });
            }
            if (error.message === 'Form not found') {
                return next({ status: 404, message: error.message });
            }
            if (error.message === 'Category name already exists') {
                return next({ status: 400, message: error.message });
            }
            return next(error);
        }
    },

    // DELETE CATEGORY
    async delete(req, res, next) {
        const deleteSchema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = deleteSchema.validate(req.params);
        if (error) return next(error);

        try {
            const result = await categoryService.deleteCategory(req.params.id, req.user);
            return res.json({ success: true, message: result.message });
        } catch (error) {
            if (error.message === 'Category not found') {
                return next({ status: 404, message: error.message });
            }
            if (error.message.includes('Cannot delete category')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return next(error);
        }
    },

    // BULK IMPORT CATEGORIES
    async bulkImport(req, res, next) {
        const records = req.body.records;

        if (!records || !Array.isArray(records) || records.length === 0) {
            return next({ status: 400, message: 'records array is required' });
        }

        try {
            // All business logic (normalization, boolean conversion) is in service
            const results = await categoryService.bulkImportCategories(records, req.user.id);

            return res.status(200).json({
                success: true,
                imported: results.imported,
                errors: results.errors.length > 0 ? results.errors : undefined,
                message: `Successfully imported ${results.imported} categories${results.errors.length > 0 ? ` with ${results.errors.length} errors` : ''}`
            });
        } catch (error) {
            return next(error);
        }
    }
};

module.exports = categoryController;