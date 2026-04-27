const Product = require('../../models/master-data/product');
const { Category, PlantCategory, Asset } = require('../../models');
const { Op } = require('sequelize');
const { generateCode, ensureUniqueCode } = require('../../utils/codeGenerator');
const { getManagerCategoryIds } = require('../../utils/dataScoping');
const auditService = require('../../services/audit/audit_service');

class ProductService {
    /**
     * Get all products with optional filtering
     */
    async getAllProducts(filters = {}, user = null) {
        const { plantId, status } = filters;

        let whereClause = {};

        if (status) {
            whereClause.status = status;
        }
        let categoryIds = [];

        // Manager sees only products from their assigned categories
        if (user && user.userType === 'manager') {
            categoryIds = await getManagerCategoryIds(user.id);

            if (categoryIds.length === 0) {
                console.log('⚠️ No categories found for manager');
                return [];
            }

            // If plantId filter is also provided, narrow down further
            if (plantId && plantId !== 'all') {
                console.log('🏭 Product filter applied for plantId:', plantId);

                const plantCategories = await PlantCategory.findAll({
                    where: {
                        plant_id: plantId,
                        category_id: { [Op.in]: categoryIds }
                    },
                    attributes: ['category_id']
                });

                categoryIds = plantCategories.map(pc => pc.category_id);
            }

            whereClause.category_id = { [Op.in]: categoryIds };
        }
        // Admin with plantId filter
        else if (plantId && plantId !== 'all') {
            console.log('🏭 Product filter applied for plantId:', plantId);

            const plantCategories = await PlantCategory.findAll({
                where: { plant_id: plantId },
                attributes: ['category_id']
            });

            categoryIds = plantCategories.map(pc => pc.category_id);

            if (categoryIds.length > 0) {
                whereClause.category_id = { [Op.in]: categoryIds };
            } else {
                console.log('⚠️ No categories found for plantId:', plantId);
                return [];
            }
        }

        const products = await Product.findAll({
            where: whereClause,
            attributes: ['id', 'product_name', 'category_id', 'test_frequency', 'variants', 'image', 'status', 'product_code', 'created_at', 'updated_at'],
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['category_name', 'id']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return products;
    }

    /**
     * Get products by category
     */
    async getProductsByCategory(categoryId) {
        const products = await Product.findAll({
            where: {
                category_id: categoryId,
                status: "Active",
            },
            attributes: ['product_name', 'id', 'test_frequency', 'variants', 'image', 'product_code']
        });

        return products;
    }

    /**
     * Get product by ID
     */
    async getProductById(productId) {
        const product = await Product.findByPk(productId, {
            attributes: ['id', 'product_name', 'category_id', 'test_frequency', 'variants', 'image', 'status', 'product_code', 'created_at', 'updated_at'],
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['category_name', 'id', 'test_frequency_required']
                }
            ]
        });

        if (!product) {
            throw new Error('Product not found');
        }

        return product;
    }

    /**
     * Create product
     */
    /**
     * Create product
     */
    async createProduct(productData, user = null, options = {}) {
        const { category_id, product_name, test_frequency, variants, image, status } = productData;

        // Fetch category to check if test_frequency is required
        const category = await Category.findByPk(category_id);
        if (!category) {
            throw new Error('Category not found');
        }

        // Conditional validation: if category requires test frequency, ensure it's provided
        if (category.test_frequency_required && !test_frequency) {
            throw new Error('Test Frequency is required for this category');
        }

        // Check for duplicate product name
        const existingProduct = await Product.findOne({
            where: { product_name }
        });

        if (existingProduct) {
            if (options.mergeIfExists) {
                console.log(`[ProductService] Product "${product_name}" exists. Merging variants...`);

                // Merge variants
                const currentVariants = existingProduct.variants || [];
                const newVariants = variants || [];

                // Deep copy to avoid reference issues
                const mergedVariants = JSON.parse(JSON.stringify(currentVariants));

                newVariants.forEach(newVar => {
                    const existingVar = mergedVariants.find(v => v.type === newVar.type);
                    if (existingVar) {
                        // add unique subtypes
                        if (newVar.subType && Array.isArray(newVar.subType)) {
                            newVar.subType.forEach(sub => {
                                if (!existingVar.subType.includes(sub)) {
                                    existingVar.subType.push(sub);
                                }
                            });
                        }
                    } else {
                        mergedVariants.push(newVar);
                    }
                });

                // Update product (also update frequency/image if provided and currently null/empty)
                const updateData = { variants: mergedVariants };
                if (!existingProduct.image && image) updateData.image = image;
                if (!existingProduct.test_frequency && test_frequency) updateData.test_frequency = test_frequency;

                await existingProduct.update(updateData);
                console.log(`[ProductService] Merged variants for "${product_name}":`, JSON.stringify(mergedVariants, null, 2));
                return existingProduct;
            } else {
                throw new Error(`A product with the name "${product_name}" already exists. Please use a different name.`);
            }
        }

        // Auto-generate product code from name
        const baseCode = generateCode(product_name);
        const product_code = await ensureUniqueCode(baseCode, async (code) => {
            const existing = await Product.findOne({ where: { product_code: code } });
            return !!existing;
        });

        console.log('[ProductService] Creating product with variants:', JSON.stringify(variants, null, 2));

        const product = await Product.create({
            category_id,
            product_name,
            product_code,
            test_frequency: test_frequency || null,
            variants: variants || [],
            image: image || null,
            status: status || "Active",
        });

        console.log('[ProductService] Product created. Stored variants:', JSON.stringify(product.variants, null, 2));

        // Audit Log
        if (!options.skipAudit) {
            try {
                await auditService.log({
                    entityType: 'product',
                    entityId: product.id,
                    entityName: product.product_name,
                    action: 'CREATE',
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for createProduct:', error.message);
            }
        }

        return product;
    }

    /**
     * Update product
     */
    /**
     * Update product
     */
    async updateProduct(productId, productData, user = null) {
        const { category_id, product_name, test_frequency, variants, image, status } = productData;

        // Check if product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        const oldValues = product.toJSON();

        // Fetch category to check if test_frequency is required
        const category = await Category.findByPk(category_id);
        if (!category) {
            throw new Error('Category not found');
        }

        // Conditional validation: if category requires test frequency, ensure it's provided
        if (category.test_frequency_required && !test_frequency) {
            throw new Error('Test Frequency is required for this category');
        }

        // Check for duplicate product name (excluding current product)
        if (product_name && product_name !== product.product_name) {
            const existingProduct = await Product.findOne({
                where: {
                    product_name,
                    id: { [Op.ne]: productId }
                }
            });

            if (existingProduct) {
                throw new Error(`A product with the name "${product_name}" already exists. Please use a different name.`);
            }

            // Auto-generate new code if name changed
            const baseCode = generateCode(product_name);
            const product_code = await ensureUniqueCode(baseCode, async (code) => {
                const existing = await Product.findOne({
                    where: {
                        product_code: code,
                        id: { [Op.ne]: productId }
                    }
                });
                return !!existing;
            });

            await Product.update(
                {
                    category_id,
                    product_name,
                    product_code,
                    test_frequency: test_frequency || null,
                    variants: variants || [],
                    image: image || null,
                    status,
                },
                { where: { id: productId } }
            );
        } else {
            await Product.update(
                {
                    category_id,
                    test_frequency: test_frequency || null,
                    variants: variants || [],
                    image: image || null,
                    status,
                },
                { where: { id: productId } }
            );
        }

        // Return updated product
        const updatedProduct = await Product.findByPk(productId, {
            attributes: ['id', 'product_name', 'category_id', 'test_frequency', 'variants', 'image', 'status', 'product_code', 'created_at', 'updated_at'],
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['category_name', 'id']
                }
            ]
        });

        // Audit Log
        try {
            const changes = auditService.calculateChanges(oldValues, updatedProduct.toJSON());
            if (changes) {
                await auditService.log({
                    entityType: 'product',
                    entityId: productId,
                    entityName: updatedProduct.product_name,
                    action: 'UPDATE',
                    changes,
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            }
        } catch (error) {
            console.error('Audit log failed for updateProduct:', error.message);
        }

        return updatedProduct;
    }

    /**
     * Delete product and associated forms (but not questions)
     */
    /**
     * Delete product
     */
    async deleteProduct(productId, user = null) {
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        // Capture name before delete for audit
        const productName = product.product_name;

        // Delete associated forms (not questions - questions are shared across forms)
        const { Form, FormQuestion, FormSection } = require('../../models/service-form');

        // Find forms associated with this product
        const formsToDelete = await Form.findAll({
            where: { product_id: productId },
            attributes: ['id']
        });
        const formIds = formsToDelete.map(f => f.id);

        if (formIds.length > 0) {
            // Delete form_questions associations (not the questions themselves)
            await FormQuestion.destroy({
                where: { form_id: formIds }
            });

            // Delete form sections
            await FormSection.destroy({
                where: { form_id: formIds }
            });

            // Delete the forms
            await Form.destroy({
                where: { product_id: productId }
            });

            console.log(`Deleted ${formIds.length} forms associated with product ${productId}`);
        }

        // Remove product from question associations (QuestionProduct)
        const { QuestionProduct } = require('../../models/service-form');
        await QuestionProduct.destroy({
            where: { product_id: productId }
        });

        // Now delete the product
        await Product.destroy({ where: { id: productId } });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'product',
                entityId: productId,
                entityName: productName,
                action: 'DELETE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui',
                metadata: { formsDeleted: formIds.length }
            });
        } catch (error) {
            console.error('Audit log failed for deleteProduct:', error.message);
        }

        return {
            message: 'Product deleted successfully',
            formsDeleted: formIds.length
        };
    }

    /**
     * Get types and subtypes from all product variants
     */
    async getTypesSubtypes() {
        const products = await Product.findAll({
            attributes: ['variants'],
            where: { status: "Active" }
        });

        const typesSet = new Set();
        const subTypesSet = new Set();

        products.forEach(product => {
            if (product.variants && Array.isArray(product.variants)) {
                product.variants.forEach(variant => {
                    if (variant.type) {
                        typesSet.add(variant.type);
                    }
                    if (variant.subType && Array.isArray(variant.subType)) {
                        variant.subType.forEach(subType => {
                            if (subType) {
                                subTypesSet.add(subType);
                            }
                        });
                    }
                });
            }
        });

        return {
            types: Array.from(typesSet).sort(),
            subTypes: Array.from(subTypesSet).sort()
        };
    }

    /**
     * Get variants by product ID
     */
    async getVariantsByProductId(productId) {
        const product = await Product.findByPk(productId, {
            attributes: ['id', 'product_name', 'variants']
        });

        if (!product) {
            throw new Error('Product not found');
        }

        return product.variants || [];
    }

    /**
     * Get types and subtypes for a specific product
     */
    async getTypesSubtypesByProductId(productId) {
        const product = await Product.findByPk(productId, {
            attributes: ['variants'],
            where: { status: "Active" }
        });

        if (!product) {
            throw new Error('Product not found');
        }

        const typesSet = new Set();
        const subTypesMap = {}; // Map type to its subtypes
        const allSubTypes = new Set();

        if (product.variants && Array.isArray(product.variants)) {
            product.variants.forEach(variant => {
                if (variant.type) {
                    typesSet.add(variant.type);

                    // Initialize subtypes array for this type if not exists
                    if (!subTypesMap[variant.type]) {
                        subTypesMap[variant.type] = [];
                    }

                    // Add subtypes for this type
                    if (variant.subType && Array.isArray(variant.subType)) {
                        variant.subType.forEach(subType => {
                            if (subType && !subTypesMap[variant.type].includes(subType)) {
                                subTypesMap[variant.type].push(subType);
                                allSubTypes.add(subType);
                            }
                        });
                    }
                }
            });
        }

        return {
            types: Array.from(typesSet).sort(),
            subTypesMap: subTypesMap,
            allSubTypes: Array.from(allSubTypes).sort()
        };
    }

    /**
     * Bulk create products (internal use - expects already validated data)
     * @param {Array} productsData - Array of validated product objects with category_id
     * @returns {Object} - Results with created products and errors
     */
    /**
     * Bulk create products
     * @param {Array} productsData - Array of product objects
     * @param {Object} user - User context
     * @returns {Object} - Results with created products and errors
     */
    async bulkCreateProducts(productsData, user = null) {
        const results = {
            success: [],
            errors: []
        };

        const createdProducts = [];

        for (let i = 0; i < productsData.length; i++) {
            const productData = productsData[i];
            try {
                // Pass skipAudit: true to avoid individual logs
                // checkAndMerge logic handles duplicates by updating them
                const product = await this.createProduct(productData, user, {
                    skipAudit: true,
                    mergeIfExists: true
                });
                results.success.push({
                    index: i,
                    product_name: product.product_name,
                    id: product.id
                });
                createdProducts.push(product);
            } catch (error) {
                results.errors.push({
                    index: i,
                    product_name: productData.product_name || 'Unknown',
                    error: error.message
                });
            }
        }

        // Bulk Audit Log
        if (createdProducts.length > 0) {
            try {
                const auditLogs = createdProducts.map(product => ({
                    entityType: 'product',
                    entityId: product.id,
                    entityName: product.product_name,
                    action: 'CREATE',
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                }));

                auditService.logBulk(auditLogs);
            } catch (error) {
                console.error('Audit log failed for bulkCreateProducts:', error.message);
            }
        }

        return results;
    }

    /**
     * Bulk import products from raw records (handles normalization and category resolution)
     * @param {Array} rawRecords - Raw records from import (may have various field name formats)
     * @returns {Object} - Results with imported count and errors
     */
    async bulkImportProducts(rawRecords) {
        const categoryService = require('./categoryService');

        // Pre-fetch all categories for name-to-ID resolution
        let allCategories = [];
        try {
            allCategories = await categoryService.getActiveCategories();
        } catch (e) {
            console.log('[ProductService] Could not load categories:', e.message);
        }

        // Helper to get field value from various name formats (handles asterisks from templates)
        const getField = (record, ...keys) => {
            for (const key of keys) {
                if (record[key] !== undefined) return record[key];
                if (record[key + ' *'] !== undefined) return record[key + ' *'];
                if (record[key + '*'] !== undefined) return record[key + '*'];
            }
            return undefined;
        };

        const validProducts = [];
        const validationErrors = [];

        for (let i = 0; i < rawRecords.length; i++) {
            const rawRecord = rawRecords[i];

            // Normalize field names
            const record = {
                product_name: getField(rawRecord, 'product_name', 'productName', 'Product Name', 'product name'),
                category_id: getField(rawRecord, 'category_id', 'categoryId'),
                category: getField(rawRecord, 'category', 'Category'),
                test_frequency: getField(rawRecord, 'test_frequency', 'testFrequency', 'Test Frequency', 'test frequency'),
                type: getField(rawRecord, 'type', 'Type'),
                sub_type: getField(rawRecord, 'sub_type', 'subType', 'Sub Type', 'sub type'),
                variants: rawRecord.variants,
                image: rawRecord.image,
                status: getField(rawRecord, 'status', 'Status') || 'Active',
            };

            // Validate required field
            if (!record.product_name) {
                validationErrors.push({ row: i + 1, error: 'Product name is required', data: record });
                continue;
            }

            // Resolve category name to ID if needed
            if (!record.category_id && record.category) {
                const categoryName = record.category.trim().toLowerCase();
                const matchedCategory = allCategories.find(c =>
                    (c.category_name || c.categoryName || '').toLowerCase() === categoryName
                );
                if (matchedCategory) {
                    record.category_id = matchedCategory.id;
                } else {
                    validationErrors.push({
                        row: i + 1,
                        error: `Category "${record.category}" not found`,
                        data: record
                    });
                    continue;
                }
            }

            if (!record.category_id) {
                validationErrors.push({ row: i + 1, error: 'Category is required', data: record });
                continue;
            }

            // Build variants from type/sub_type if provided
            if (record.type && !record.variants?.length) {
                record.variants = [{
                    type: record.type,
                    subType: record.sub_type ? [record.sub_type] : []
                }];
            }

            validProducts.push(record);
        }

        // Create products
        const results = await this.bulkCreateProducts(validProducts);

        return {
            success: results.success.length,
            errors: [...validationErrors, ...results.errors],
            validationErrors,
            creationErrors: results.errors,
            created: results.success
        };
    }
}

module.exports = new ProductService();