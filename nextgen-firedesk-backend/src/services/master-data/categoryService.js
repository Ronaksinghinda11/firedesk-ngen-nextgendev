const Category = require('../../models/master-data/category');
const { Plant, Product, Asset } = require('../../models/index');
const { Op } = require('sequelize');
const { generateCode, ensureUniqueCode } = require('../../utils/codeGenerator');
const { getManagerPlantIds } = require('../../utils/dataScoping');
const auditService = require('../../services/audit/audit_service');

class CategoryService {
    /**
     * Get all categories with optional filtering
     */
    async getAllCategories(filters = {}, user = null) {
        const { plantId, includePlants } = filters;

        // Build includes array
        const includes = [
            // Note: Form and SpecDefinition models are not yet implemented
            // TODO: Add these associations when models are completed
        ];

        // Manager sees only categories from their assigned plants
        if (user && user.userType === 'manager') {
            const managerPlantIds = await getManagerPlantIds(user.id);

            if (managerPlantIds.length === 0) {
                console.log('⚠️ No plants found for manager');
                return [];
            }

            // If plantId filter is also provided, validate it's in manager's plants
            if (plantId && plantId !== 'all') {
                if (!managerPlantIds.includes(plantId)) {
                    console.log('⚠️ Manager does not have access to plantId:', plantId);
                    return [];
                }

                console.log('🏭 Category filter applied for manager plantId:', plantId);
                includes.push({
                    model: Plant,
                    as: 'plants',
                    where: { id: plantId },
                    attributes: includePlants === 'true' ? ['id', 'plant_name'] : [],
                    through: { attributes: [] },
                    required: true
                });
            } else {
                // Show all categories from manager's plants
                console.log('🌿 Filtering categories by manager plants:', managerPlantIds);
                includes.push({
                    model: Plant,
                    as: 'plants',
                    where: { id: managerPlantIds },
                    attributes: includePlants === 'true' ? ['id', 'plant_name'] : [],
                    through: { attributes: [] },
                    required: true
                });
            }
        }
        // Admin - show all categories (no plant filtering) unless specified
        else {
            // Categories are master data and not plant-specific
            // Admin users see all categories regardless of plant associations
            console.log('👑 Admin user - showing all categories');

            // Allow admins to filter by plant if they want
            if (plantId && plantId !== 'all') {
                console.log('🏭 Admin filtering categories by plantId:', plantId);
                includes.push({
                    model: Plant,
                    as: 'plants',
                    where: { id: plantId },
                    attributes: includePlants === 'true' ? ['id', 'plant_name'] : [],
                    through: { attributes: [] },
                    required: true
                });
            } else if (includePlants === 'true') {
                // Only include plant associations if explicitly requested (and no specific plant filter)
                console.log('🌿 Including plant associations in category response');
                includes.push({
                    model: Plant,
                    as: 'plants',
                    attributes: ['id', 'plant_name'],
                    through: { attributes: [] },
                    required: false  // Non-required join - categories without plants will still show
                });
            }
        }

        const categories = await Category.findAll({
            include: includes,
            order: [['created_at', 'DESC']]
        });

        console.log(`📦 Retrieved ${categories.length} categories`);
        return categories;
    }

    /**
     * Get active categories with optional filtering
     */
    async getActiveCategories(filters = {}, user = null) {
        const { availableForForm, plantId } = filters;

        const whereClause = { status: "Active" };

        if (availableForForm === 'true') {
            whereClause.form_id = null;
        }

        // Build includes array for plant filtering
        const includes = [];

        // If plantId is provided, filter by plant
        if (plantId && plantId !== 'all') {
            includes.push({
                model: Plant,
                as: 'plants',
                where: { id: plantId },
                attributes: [],
                through: { attributes: [] },
                required: true
            });
        }

        // If user is a manager, filter by their plants
        if (user && user.userType === 'manager') {
            const managerPlantIds = await getManagerPlantIds(user.id);
            if (managerPlantIds.length === 0) {
                return [];
            }

            // If plantId is also provided, validate it's in manager's plants
            if (plantId && plantId !== 'all') {
                if (!managerPlantIds.includes(plantId)) {
                    return [];
                }
            } else {
                // Otherwise filter by all manager's plants
                includes.push({
                    model: Plant,
                    as: 'plants',
                    where: { id: managerPlantIds },
                    attributes: [],
                    through: { attributes: [] },
                    required: true
                });
            }
        }

        const activeCategories = await Category.findAll({
            where: whereClause,
            include: includes,
            order: [['created_at', 'DESC']]
        });

        return activeCategories;
    }

    /**
     * Get category by ID
     */
    async getCategoryById(categoryId) {
        const category = await Category.findByPk(categoryId, {
            include: []
        });

        if (!category) {
            throw new Error('Category not found');
        }

        return category;
    }

    /**
     * Create new category
     */
    async createCategory(categoryData, user) {
        const { category_name, test_frequency_required, status, created_by } = categoryData;

        // Note: Form validation skipped - FireSafetyForm model not yet implemented
        // TODO: Add form validation when FireSafetyForm model is completed

        // Check if category name already exists
        const existingCategory = await Category.findOne({
            where: { category_name }
        });

        if (existingCategory) {
            throw new Error('Category name already exists');
        }

        // Auto-generate category code from name
        const baseCode = generateCode(category_name);
        const category_code = await ensureUniqueCode(baseCode, async (code) => {
            const existing = await Category.findOne({ where: { category_code: code } });
            return !!existing;
        });

        // Create category
        const newCategory = await Category.create({
            category_name,
            category_code,
            test_frequency_required: test_frequency_required !== undefined ? test_frequency_required : false,
            status: status || "Active",
            created_by
        });

        // Return created category with associations
        const categoryWithAssociations = await Category.findByPk(newCategory.id, {
            include: []
        });

        // Audit Log (Fire and Forget)
        try {
            await auditService.log({
                entityType: 'category',
                entityId: newCategory.id,
                entityName: newCategory.category_name,
                action: 'CREATE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for createCategory:', error.message);
        }

        return categoryWithAssociations;
    }

    /**
     * Update category
     */
    async updateCategory(categoryId, categoryData, user) {
        const { category_name, test_frequency_required, status } = categoryData;

        // Check if category exists
        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new Error('Category not found');
        }

        // Capture old values for audit
        const oldValues = category.toJSON();

        // Note: Form validation skipped - FireSafetyForm model not yet implemented
        // TODO: Add form validation when FireSafetyForm model is completed

        // Check for duplicate category name
        if (category_name && category_name !== category.category_name) {
            const existingCategory = await Category.findOne({
                where: {
                    category_name,
                    id: { [Op.ne]: categoryId }
                }
            });

            if (existingCategory) {
                throw new Error('Category name already exists');
            }

            // Auto-generate new code if name changed
            const baseCode = generateCode(category_name);
            const category_code = await ensureUniqueCode(baseCode, async (code) => {
                const existing = await Category.findOne({
                    where: {
                        category_code: code,
                        id: { [Op.ne]: categoryId }
                    }
                });
                return !!existing;
            });

            const updateData = { category_name, category_code, status };
            if (test_frequency_required !== undefined) {
                updateData.test_frequency_required = test_frequency_required;
            }

            await Category.update(updateData, { where: { id: categoryId } });
        } else {
            const updateData = { status };
            if (test_frequency_required !== undefined) {
                updateData.test_frequency_required = test_frequency_required;
            }

            await Category.update(updateData, { where: { id: categoryId } });
        }

        // Return updated category
        const updatedCategory = await Category.findByPk(categoryId, {
            include: []
        });

        // Audit Log (Fire and Forget)
        try {
            const changes = auditService.calculateChanges(oldValues, updatedCategory.toJSON());
            if (changes) {
                await auditService.log({
                    entityType: 'category',
                    entityId: categoryId,
                    entityName: updatedCategory.category_name,
                    action: 'UPDATE',
                    changes,
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            }
        } catch (error) {
            console.error('Audit log failed for updateCategory:', error.message);
        }

        return updatedCategory;
    }

    /**
     * Delete category and associated forms (but not questions)
     */
    async deleteCategory(categoryId, user) {
        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new Error('Category not found');
        }

        // Capture name before delete for audit
        const categoryName = category.category_name;

        // Check if there are any products associated with this category
        const associatedProducts = await Product.count({
            where: { category_id: categoryId }
        });

        if (associatedProducts > 0) {
            throw new Error(`Cannot delete category. There are ${associatedProducts} product(s) associated with this category. Please delete or reassign the products first.`);
        }

        // Delete associated forms (not questions - questions are shared across forms)
        const { Form, FormQuestion, FormSection } = require('../../models/service-form');

        // Find forms associated with this category
        const formsToDelete = await Form.findAll({
            where: { category_id: categoryId },
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
                where: { category_id: categoryId }
            });

            console.log(`Deleted ${formIds.length} forms associated with category ${categoryId}`);
        }

        // Remove category from question associations (QuestionCategory)
        const { QuestionCategory } = require('../../models/service-form');
        await QuestionCategory.destroy({
            where: { category_id: categoryId }
        });

        // Now delete the category
        await Category.destroy({ where: { id: categoryId } });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'category',
                entityId: categoryId,
                entityName: categoryName,
                action: 'DELETE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui',
                metadata: { formsDeleted: formIds.length }
            });
        } catch (error) {
            console.error('Audit log failed for deleteCategory:', error.message);
        }

        return {
            message: 'Category deleted successfully',
            formsDeleted: formIds.length
        };
    }

    /**
     * Bulk import categories from raw records
     * @param {Array} rawRecords - Raw records from import
     * @param {string} createdBy - User ID who is creating
     * @returns {Object} - Results with imported count and errors
     */
    async bulkImportCategories(rawRecords, createdBy) {
        const results = { imported: 0, errors: [] };

        // Helper to get field value from various name formats
        const getField = (record, ...keys) => {
            for (const key of keys) {
                if (record[key] !== undefined) return record[key];
                if (record[key + ' *'] !== undefined) return record[key + ' *'];
            }
            return undefined;
        };

        for (let i = 0; i < rawRecords.length; i++) {
            try {
                const record = rawRecords[i];

                // Normalize field names
                const categoryName = getField(record, 'category_name', 'categoryName', 'Category Name', 'category name');
                let testFreqRequired = getField(record, 'test_frequency_required', 'testFrequencyRequired', 'Test Frequency Required');

                if (!categoryName) {
                    results.errors.push({ row: i + 1, data: record, error: 'Category name is required' });
                    continue;
                }

                // Convert test_frequency_required to boolean
                if (typeof testFreqRequired === 'string') {
                    testFreqRequired = ['true', 'yes', '1'].includes(testFreqRequired.toLowerCase());
                } else if (testFreqRequired === null || testFreqRequired === undefined) {
                    testFreqRequired = false;
                }

                const categoryData = {
                    category_name: categoryName,
                    test_frequency_required: testFreqRequired,
                    created_by: createdBy
                };

                await this.createCategory(categoryData);
                results.imported++;
            } catch (err) {
                results.errors.push({ row: i + 1, data: rawRecords[i], error: err.message });
            }
        }

        return results;
    }
}

module.exports = new CategoryService();