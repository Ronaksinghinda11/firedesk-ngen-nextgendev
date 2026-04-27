const Joi = require("joi");
const productService = require("../../services/master-data/productService");

// UUID pattern for PostgreSQL
const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const productController = {
    async create(req, res, next) {
        const createProductSchema = Joi.object({
            category_id: Joi.string().pattern(uuidPattern).required(),
            product_name: Joi.string().required(),
            test_frequency: Joi.string()
                .valid(
                    "One Year",
                    "Two Years",
                    "Three Years",
                    "Five Years",
                    "Ten Years"
                )
                .optional()
                .allow(null),
            variants: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        subType: Joi.array().items(Joi.string()).optional(),
                        description: Joi.string().allow('', null).optional(),
                        image: Joi.string().allow('', null).optional(),
                    })
                )
                .optional()
                .default([]),
            image: Joi.string().allow('', null).optional(),
            status: Joi.string().valid("Active", "Deactive").optional(),
        });

        const { error } = createProductSchema.validate(req.body);
        if (error) return next(error);

        try {
            const product = await productService.createProduct(req.body, req.user); // Pass user

            return res.status(200).json({
                success: true,
                product,
                message: "Product created successfully"
            });
        } catch (err) {
            if (err.message === 'Category not found') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            if (err.message === 'Test Frequency is required for this category') {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if (err.message.includes('already exists')) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            return next(err);
        }
    },

    async getAllActive(req, res, next) {
        try {
            const products = await productService.getAllProducts({ ...req.query, status: 'Active' }, req.user);
            return res.json({ success: true, count: products.length, data: products });
        } catch (error) {
            return next(error);
        }
    },

    async getAll(req, res, next) {
        try {
            const products = await productService.getAllProducts(req.query, req.user);
            return res.json({ products, success: true });
        } catch (error) {
            return next(error);
        }
    },

    async getByCategory(req, res, next) {
        try {
            const products = await productService.getProductsByCategory(req.params.categoryId);
            return res.json({ products });
        } catch (error) {
            return next(error);
        }
    },

    async getById(req, res, next) {
        try {
            const product = await productService.getProductById(req.params.id);
            return res.json({
                success: true,
                product
            });
        } catch (error) {
            if (error.message === 'Product not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return next(error);
        }
    },

    async update(req, res, next) {
        const updateSchema = Joi.object({
            category_id: Joi.string().pattern(uuidPattern).required(),
            product_name: Joi.string().required(),
            status: Joi.string().valid("Active", "Deactive").required(),
            test_frequency: Joi.string()
                .valid(
                    "One Year",
                    "Two Years",
                    "Three Years",
                    "Five Years",
                    "Ten Years"
                )
                .optional()
                .allow(null),
            variants: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        subType: Joi.array().items(Joi.string()).optional(),
                        description: Joi.string().allow('', null).optional(),
                        image: Joi.string().allow('', null).optional(),
                    })
                )
                .optional()
                .default([]),
            image: Joi.string().allow('', null).optional(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) return next(error);

        try {
            const product = await productService.updateProduct(req.params.id, req.body, req.user); // Pass user

            return res.json({
                success: true,
                product,
                message: "Product updated successfully"
            });
        } catch (err) {
            if (err.message === 'Product not found' || err.message === 'Category not found') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            if (err.message === 'Test Frequency is required for this category') {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if (err.message.includes('already exists')) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            return next(err);
        }
    },

    async delete(req, res, next) {
        try {
            const result = await productService.deleteProduct(req.params.id, req.user); // Pass user
            return res.json({ success: true, message: result.message });
        } catch (error) {
            if (error.message === 'Product not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('Cannot delete product')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return next(error);
        }
    },

    async getTypesSubtypes(req, res, next) {
        try {
            const result = await productService.getTypesSubtypes();
            return res.json({
                success: true,
                types: result.types,
                subTypes: result.subTypes
            });
        } catch (error) {
            return next(error);
        }
    },

    async getVariantsByProductId(req, res, next) {
        try {
            const variants = await productService.getVariantsByProductId(req.params.productId);
            return res.json({
                success: true,
                variants
            });
        } catch (error) {
            if (error.message === 'Product not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return next(error);
        }
    },

    async getTypesSubtypesByProductId(req, res, next) {
        try {
            const result = await productService.getTypesSubtypesByProductId(req.params.productId);
            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            if (error.message === 'Product not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return next(error);
        }
    },

    async bulkCreate(req, res, next) {
        // Accept both 'products' and 'records' format for compatibility with import modal
        const productsData = req.body.products || req.body.records;

        if (!productsData || !Array.isArray(productsData) || productsData.length === 0) {
            return next({ status: 400, message: 'products or records array is required' });
        }

        try {
            // All business logic (normalization, category resolution, variants) is in service
            const results = await productService.bulkImportProducts(productsData);

            const allSucceeded = results.errors.length === 0;
            const statusCode = allSucceeded ? 200 : 207;

            return res.status(statusCode).json({
                success: allSucceeded,
                imported: results.success,
                message: allSucceeded
                    ? `${results.success} product(s) created successfully`
                    : `${results.success} succeeded, ${results.errors.length} failed`,
                errors: results.errors.length > 0 ? results.errors : undefined,
                results
            });
        } catch (err) {
            return next(err);
        }
    },
};

module.exports = productController;