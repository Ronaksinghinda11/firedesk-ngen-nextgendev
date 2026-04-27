/**
 * Question Bulk Service
 * Handles bulk import/export operations for questions
 */

const { Parser } = require('json2csv');
const { sequelize } = require('../../../config/config');
const { Op } = require('sequelize');

// Models
const {
    Question,
    QuestionCategory,
    QuestionProduct,
    QuestionFrequency,
    QuestionCondition
} = require('../../models/service-form');
const Category = require('../../models/master-data/category');
const Product = require('../../models/master-data/product');
const Condition = require('../../models/master-data/ConditionMaster');
const InspectionFrequency = require('../../models/service-form/InspectionFrequency');
const Plant = require('../../models/plants/Plant');

// Services
const questionService = require('./questionService');
const { generateCode, ensureUniqueCode } = require('../../utils/codeGenerator');
const auditService = require('../audit/audit_service');

class QuestionBulkService {
    /**
     * Export questions as CSV
     * @param {Object} filters - Optional filters (plant_id, category_id, etc.)
     * @returns {string} CSV string
     */
    async exportQuestions(filters = {}) {
        // Get all questions with associations
        const questions = await questionService.getAllQuestions(filters);

        if (questions.length === 0) {
            return this._generateCSVFromData([]);
        }

        // Transform questions to export format (names instead of IDs)
        const exportData = await Promise.all(questions.map(async (q) => {
            const questionData = q.toJSON ? q.toJSON() : q;

            // Get plant name
            let plantName = '';
            if (questionData.plant_id) {
                const plant = await Plant.findByPk(questionData.plant_id);
                plantName = plant?.plant_name || '';
            }

            // Get category names
            const categoryNames = (questionData.categories || [])
                .map(c => c.category_name || c.categoryName)
                .filter(Boolean)
                .join(', ');

            // Get product names
            const productNames = (questionData.products || [])
                .map(p => p.product_name || p.productName)
                .filter(Boolean)
                .join(', ');

            // Get frequency names
            const frequencyNames = (questionData.frequencies || [])
                .map(f => f.frequency_name || f.frequencyName)
                .filter(Boolean)
                .join(', ');

            // Get condition names
            const conditionNames = (questionData.conditions || [])
                .map(c => c.condition_name || c.conditionName ||
                    c.condition?.condition_name || c.condition?.conditionName)
                .filter(Boolean)
                .join(', ');

            return {
                question_code: questionData.question_code || '',
                question_text: questionData.question_text || '',
                answer_type: questionData.answer_type || '',
                service_type: questionData.service_type || '',
                plant_name: plantName,
                categories: categoryNames,
                products: productNames,
                frequencies: frequencyNames,
                is_mandatory: questionData.is_mandatory ? 'TRUE' : 'FALSE',
                requires_photo: questionData.requires_photo ? 'TRUE' : 'FALSE',
                requires_notes: questionData.requires_notes ? 'TRUE' : 'FALSE',
                help_text: questionData.help_text || '',
                standards: questionData.standards || '',
                conditions: conditionNames
            };
        }));

        return this._generateCSVFromData(exportData);
    }

    /**
     * Generate blank import template
     * @returns {string} CSV template with headers and sample row
     */
    generateTemplate() {
        const sampleData = [{
            question_code: '(auto-generated if blank)',
            question_text: 'Is the fire extinguisher accessible?',
            answer_type: 'boolean',
            service_type: 'inspection',
            plant_name: 'Plant Name Here',
            categories: 'Fire Extinguishers',
            products: 'ABC Powder',
            frequencies: 'Weekly, Monthly',
            is_mandatory: 'TRUE',
            requires_photo: 'FALSE',
            requires_notes: 'FALSE',
            help_text: 'Check if extinguisher is easily accessible',
            standards: 'NFPA 10',
            conditions: 'Good, Fair, Poor'
        }];

        return this._generateCSVFromData(sampleData);
    }

    /**
     * Parse CSV content to rows
     * @param {string} csvContent - Raw CSV string
     * @returns {Object[]} Parsed rows
     */
    parseCSV(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV must have a header row and at least one data row');
        }

        const headers = this._parseCSVLine(lines[0]);
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this._parseCSVLine(lines[i]);
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim().toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
            });
            row._rowNumber = i + 1; // For error reporting
            rows.push(row);
        }

        return rows;
    }

    /**
     * Validate import data and resolve names to IDs
     * @param {Object[]} rows - Parsed CSV rows
     * @param {string} userId - User ID for creating new conditions
     * @returns {Object} { valid: [], errors: [] }
     */
    async validateImportData(rows, userId) {
        const validRows = [];
        const errors = [];

        // Pre-fetch existing questions by code for upsert logic
        const codesToCheck = rows
            .map(r => r.question_code)
            .filter(c => c && c.trim() !== '')
            .map(c => c.trim().toLowerCase());

        console.log('🔍 Import Debug - Codes to check count:', codesToCheck.length);
        if (codesToCheck.length > 0) console.log('🔍 Import Debug - Sample codes:', codesToCheck.slice(0, 5));

        const existingByCode = new Map();
        if (codesToCheck.length > 0) {
            const existingQuestions = await Question.findAll({
                where: sequelize.where(
                    sequelize.fn('lower', sequelize.col('question_code')),
                    { [Op.in]: codesToCheck }
                ),
                attributes: ['id', 'question_code', 'plant_id'],
                include: [
                    {
                        model: Category,
                        as: 'categories',
                        through: { attributes: [] },
                        attributes: ['id']
                    },
                    {
                        model: InspectionFrequency,
                        as: 'frequencies',
                        through: { attributes: [] },
                        attributes: ['id']
                    },
                    {
                        model: Product,
                        as: 'products',
                        through: { attributes: [] },
                        attributes: ['id']
                    }
                ]
            });

            console.log('🔍 Import Debug - Found existing questions (DB):', existingQuestions.length);

            existingQuestions.forEach(q => {
                existingByCode.set(q.question_code.toLowerCase(), q);
            });
            console.log('🔍 Import Debug - Existing map size:', existingByCode.size);
        }

        for (const row of rows) {
            try {
                // Check if existing
                const existingQuestion = row.question_code ?
                    existingByCode.get(row.question_code.toLowerCase().trim()) : null;

                if (row.question_code && !existingQuestion) {
                    // console.log('🔍 Import Debug - New Question (not found in DB):', row.question_code);
                }

                const validated = await this._validateAndResolveRow(row, userId, existingQuestion);
                validRows.push(validated);
            } catch (error) {
                console.error(`❌ Import Debug - Row ${row._rowNumber} Error:`, row.question_code, error.message);
                errors.push({
                    row: row._rowNumber,
                    error: error.message,
                    data: row
                });
            }
        }

        return { valid: validRows, errors };
    }

    /**
     * Import validated questions
     * @param {Object[]} validRows - Validated data rows
     * @param {string} userId - User ID performing import
     * @returns {Object} { success: [], failed: [] }
     */
    async importQuestions(validRows, user) {
        // Accept either full user object or just userId for backward compatibility
        const userId = user?.id || user;
        const userObj = typeof user === 'object' && user !== null ? user : null;

        const success = [];
        const failed = [];

        for (const row of validRows) {
            const transaction = await sequelize.transaction();
            try {
                // If we have a question code, try to find existing to update
                let question = null;
                if (row.question_code) {
                    // Normalize code to handle case-sensitivity issues
                    row.question_code = row.question_code.trim().toUpperCase();

                    question = await Question.findOne({
                        where: { question_code: row.question_code },
                        transaction
                    });
                }

                // Track whether this is a create or update for the audit log
                let isNewQuestion = false;
                let importChanges = null;

                if (question) {
                    // Snapshot old values before update for audit diff
                    const oldValues = question.toJSON();

                    // Update existing
                    await question.update({
                        question_text: row.question_text,
                        answer_type: row.answer_type,
                        service_type: row.service_type,
                        question_type: row.question_type,
                        is_mandatory: row.is_mandatory,
                        requires_photo: row.requires_photo,
                        requires_notes: row.requires_notes,
                        help_text: row.help_text,
                        standards: row.standards,
                        plant_id: row.plant_id,
                        updated_by: userId
                    }, { transaction });

                    // Calculate changes for audit
                    importChanges = auditService.calculateChanges(oldValues, question.toJSON());
                } else {
                    // Create new
                    isNewQuestion = true;
                    // Generate code if missing
                    if (!row.question_code) {
                        const baseCode = generateCode('QN_' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100));
                        row.question_code = await ensureUniqueCode(baseCode, async (code) => {
                            return !!await Question.findOne({ where: { question_code: code }, transaction });
                        });
                    }

                    question = await Question.create({
                        question_code: row.question_code,
                        question_text: row.question_text,
                        answer_type: row.answer_type,
                        service_type: row.service_type,
                        question_type: row.question_type,
                        is_mandatory: row.is_mandatory,
                        requires_photo: row.requires_photo,
                        requires_notes: row.requires_notes,
                        help_text: row.help_text,
                        standards: row.standards,
                        plant_id: row.plant_id,

                        status: 'Active',
                        created_by: userId,
                        updated_by: userId
                    }, { transaction });
                }

                // Update Associations
                // Snapshot old associations for audit diff (only for updates)
                let oldFreqNames = null, oldCatNames = null, oldProdNames = null, oldCondNames = null;
                if (!isNewQuestion) {
                    if (row.frequency_ids) {
                        const oldFreqs = await question.getFrequencies({ transaction });
                        oldFreqNames = oldFreqs.map(f => f.frequency_name).sort().join(', ') || null;
                    }
                    if (row.category_ids) {
                        const oldCats = await question.getCategories({ transaction });
                        oldCatNames = oldCats.map(c => c.category_name).sort().join(', ') || null;
                    }
                    if (row.product_ids) {
                        const oldProds = await question.getProducts({ transaction });
                        oldProdNames = oldProds.map(p => p.product_name).sort().join(', ') || null;
                    }
                    if (row.conditions && row.conditions.length > 0) {
                        const oldConds = await question.getConditions({ transaction });
                        oldCondNames = oldConds.map(c => c.condition_name).sort().join(', ') || null;
                    }
                }

                if (row.category_ids) {
                    await question.setCategories(row.category_ids, { transaction });
                }
                if (row.product_ids) {
                    await question.setProducts(row.product_ids, { transaction });
                }
                if (row.frequency_ids) {
                    await question.setFrequencies(row.frequency_ids, { transaction });
                }
                if (row.conditions && row.conditions.length > 0) {
                    // Replace conditions
                    await QuestionCondition.destroy({
                        where: { question_id: question.id },
                        transaction
                    });

                    const conditionsData = row.conditions.map(c => ({
                        question_id: question.id,
                        condition_id: c.condition_id,
                        display_order: c.display_order,
                        is_active: c.is_active !== undefined ? c.is_active : true
                    }));

                    await QuestionCondition.bulkCreate(conditionsData, { transaction });
                }

                // Diff associations after update
                if (!isNewQuestion) {
                    if (!importChanges) importChanges = {};

                    if (row.frequency_ids) {
                        const newFreqs = await question.getFrequencies({ transaction });
                        const newFreqNames = newFreqs.map(f => f.frequency_name).sort().join(', ') || null;
                        if (oldFreqNames !== newFreqNames) {
                            importChanges.frequencies = { old: oldFreqNames, new: newFreqNames };
                        }
                    }
                    if (row.category_ids) {
                        const newCats = await question.getCategories({ transaction });
                        const newCatNames = newCats.map(c => c.category_name).sort().join(', ') || null;
                        if (oldCatNames !== newCatNames) {
                            importChanges.categories = { old: oldCatNames, new: newCatNames };
                        }
                    }
                    if (row.product_ids) {
                        const newProds = await question.getProducts({ transaction });
                        const newProdNames = newProds.map(p => p.product_name).sort().join(', ') || null;
                        if (oldProdNames !== newProdNames) {
                            importChanges.products = { old: oldProdNames, new: newProdNames };
                        }
                    }
                    if (row.conditions && row.conditions.length > 0) {
                        const newConds = await question.getConditions({ transaction });
                        const newCondNames = newConds.map(c => c.condition_name).sort().join(', ') || null;
                        if (oldCondNames !== newCondNames) {
                            importChanges.conditions = { old: oldCondNames, new: newCondNames };
                        }
                    }

                    // If only association changes and importChanges was null before, check if we have any
                    if (Object.keys(importChanges).length === 0) importChanges = null;
                }

                await transaction.commit();

                // Audit Log — record each question create/update from import
                try {
                    const auditUser = userObj
                        ? { id: userObj.id, name: userObj.name, type: userObj.userType }
                        : { id: userId };

                    // Skip update audit if nothing actually changed
                    if (!isNewQuestion && !importChanges) {
                        // No changes detected, skip audit
                    } else {
                        await auditService.log({
                            entityType: 'question',
                            entityId: question.id,
                            entityName: question.question_code || question.question_text,
                            action: isNewQuestion ? 'CREATE' : 'UPDATE',
                            changes: importChanges,
                            user: auditUser,
                            source: 'import'
                        });
                    }
                } catch (auditError) {
                    console.error('Audit log failed for question import:', auditError.message);
                }

                success.push({ question, row });
            } catch (error) {
                await transaction.rollback();
                console.error('Import error for row:', row, error);
                failed.push({
                    row,
                    error: error.message
                });
            }
        }

        // Auto-generate forms for all successfully imported questions
        try {
            const formService = require('./formService');
            const { Form } = require('../../models/service-form');
            const formCombinations = new Map();
            const formIdsToSync = new Set();

            for (const { row } of success) {
                const categories = row.category_ids || [];
                const products = row.product_ids || [];
                const frequencies = row.frequency_ids || [];
                const plantId = row.plant_id || null;

                for (const categoryId of categories) {
                    for (const productId of products) {
                        for (const frequencyId of frequencies) {
                            const key = `${categoryId}_${productId}_${frequencyId}_${plantId || 'global'}`;
                            if (!formCombinations.has(key)) {
                                formCombinations.set(key, {
                                    category_id: categoryId,
                                    product_id: productId,
                                    frequency_id: frequencyId,
                                    plant_id: plantId
                                });
                            }
                        }
                    }
                }
            }

            // Generate/find forms for each unique combination
            for (const [key, combo] of formCombinations) {
                try {
                    const form = await formService.autoGenerateFormIfNotExists(combo, userId);
                    if (form?.id) {
                        formIdsToSync.add(form.id);
                    }
                } catch (error) {
                    console.log(`Bulk import - form for ${key} may already exist:`, error.message);
                    const existingForm = await Form.findOne({
                        where: {
                            category_id: combo.category_id,
                            product_id: combo.product_id,
                            frequency_id: combo.frequency_id,
                            status: 'Active',
                            ...(combo.plant_id && { plant_id: combo.plant_id })
                        }
                    });
                    if (existingForm) {
                        formIdsToSync.add(existingForm.id);
                    }
                }
            }

            // Sync forms in background
            if (formIdsToSync.size > 0) {
                const formIds = [...formIdsToSync];
                console.log(`📥 Bulk import: scheduling ${formIds.length} forms for background sync...`);
                setImmediate(async () => {
                    const formService = require('./formService');
                    for (const formId of formIds) {
                        try {
                            await formService.syncFormQuestions(formId);
                        } catch (err) {
                            console.log(`Failed to sync form ${formId}:`, err.message);
                        }
                    }
                    console.log(`✅ Bulk import: background sync completed for ${formIds.length} forms`);
                });
            }

            console.log(`✅ Bulk import: ${formCombinations.size} form combinations processed`);
        } catch (error) {
            console.log('Error in form generation after bulk import:', error.message);
            // Don't fail the import if form generation fails
        }

        return { success: success.map(s => s.question), failed };
    }

    async _validateAndResolveRow(row, userId, existingQuestion = null) {
        const errors = [];

        // Required field validation - ONLY if not existing (CREATE mode)
        // For UPDATE, we assume existing fields are valid, and we only validate WHAT IS PROVIDED
        if (!existingQuestion) {
            if (!row.question_text?.trim()) errors.push('question_text is required');
            if (!row.answer_type?.trim()) errors.push('answer_type is required');
            if (!row.service_type?.trim()) errors.push('service_type is required');
            if (!row.plant_name?.trim()) errors.push('plant_name is required');
            if (!row.categories?.trim()) errors.push('categories is required');
            if (!row.products?.trim()) errors.push('products is required');
            if (!row.frequencies?.trim()) errors.push('frequencies is required');
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }

        // --- RESOLUTION PHASE ---

        // Resolve plant
        let plant_id = null;
        if (row.plant_name?.trim()) {
            const plant = await Plant.findOne({
                where: { plant_name: { [Op.iLike]: row.plant_name.trim() } }
            });
            if (!plant && !existingQuestion) { // Only strict error on create
                throw new Error(`Plant not found: ${row.plant_name}`);
            }
            if (plant) plant_id = plant.id;
        } else if (!existingQuestion) {
            // Already caught by required check above, but for safety
            throw new Error('plant_name is required');
        }

        // Resolve categories
        const categoryIds = [];
        if (row.categories?.trim()) {
            const categoryNames = row.categories.split(',').map(c => c.trim()).filter(Boolean);
            for (const name of categoryNames) {
                const category = await Category.findOne({
                    where: { category_name: { [Op.iLike]: name } }
                });
                if (!category && !existingQuestion) {
                    throw new Error(`Category not found: ${name}`);
                }
                if (category) categoryIds.push(category.id);
            }
        }

        // Resolve products
        let productIds = [];
        const productsStr = row.products?.trim();

        if (productsStr && productsStr.toUpperCase() === 'ALL') {
            // Case 1: "ALL" specified - fetch all active products for the resolved categories
            // Note: This requires categories to be present in the row/resolved
            const effectiveCategoryIds = categoryIds.length > 0 ? categoryIds :
                (existingQuestion && existingQuestion.categories ? existingQuestion.categories.map(c => c.id) : []);

            if (effectiveCategoryIds.length > 0) {
                const allProducts = await Product.findAll({
                    where: {
                        category_id: { [Op.in]: effectiveCategoryIds },
                        status: 'Active'
                    },
                    attributes: ['id']
                });
                productIds = allProducts.map(p => p.id);
            } else if (!existingQuestion) {
                // If creating new and no categories resolved, we can't resolve "ALL" products contextually
                // But this should be caught by "categories is required" check later or earlier if we enforce it
            }
        } else if (productsStr) {
            // Case 2: Comma-separated list of product names
            const productNames = productsStr.split(',').map(p => p.trim()).filter(Boolean);
            // Optimization: if we have categoryIds, restrict search (omitted for brevity/flexibility)
            for (const name of productNames) {
                const product = await Product.findOne({
                    where: { product_name: { [Op.iLike]: name } }
                });
                if (!product && !existingQuestion) {
                    // Start lenient check if category provided
                    throw new Error(`Product not found: ${name}`);
                }
                if (product) productIds.push(product.id);
            }
        }

        // Resolve frequencies
        const frequencyIds = [];
        if (row.frequencies?.trim()) {
            const frequencyNames = row.frequencies.split(',').map(f => f.trim()).filter(Boolean);
            for (const name of frequencyNames) {
                const frequency = await InspectionFrequency.findOne({
                    where: { frequency_name: { [Op.iLike]: name } }
                });
                if (!frequency && !existingQuestion) {
                    throw new Error(`Frequency not found: ${name}`);
                }
                if (frequency) frequencyIds.push(frequency.id);
            }
        }

        // Resolve or create conditions (only if answer_type is 'condition')
        const conditions = [];
        if (row.answer_type?.toLowerCase() === 'condition' && row.conditions?.trim()) {
            const conditionNames = row.conditions.split(',').map(c => c.trim()).filter(Boolean);
            for (let i = 0; i < conditionNames.length; i++) {
                const condition = await this.findOrCreateCondition(conditionNames[i], userId);
                conditions.push({
                    condition_id: condition.id,
                    display_order: i + 1,
                    is_active: true
                });
            }
        }

        // Build validated data object
        // Use defaults or nulls carefully to avoid overwriting existing data with empty values during partial update
        const result = {
            question_code: row.question_code?.trim() || null,
            is_mandatory: row.is_mandatory !== undefined && row.is_mandatory !== '' ? String(row.is_mandatory).toUpperCase() === 'TRUE' : undefined,
            requires_photo: row.requires_photo !== undefined && row.requires_photo !== '' ? String(row.requires_photo).toUpperCase() === 'TRUE' : undefined,
            requires_notes: row.requires_notes !== undefined && row.requires_notes !== '' ? String(row.requires_notes).toUpperCase() === 'TRUE' : undefined,
        };

        if (row.question_text?.trim()) result.question_text = row.question_text.trim();
        // Keep original casing or standardize to what frontend expects, some parts use lowercase some Capitalized
        // Based on QuestionsPage.tsx: row.serviceType = ... charAt(0).toUpperCase() ... so backend usually sends lowercase snake_case or whatever
        // But let's stick to what was input if it looks valid
        if (row.answer_type?.trim()) result.answer_type = row.answer_type.trim();
        if (row.service_type?.trim()) result.service_type = row.service_type.trim();
        if (row.help_text?.trim()) result.help_text = row.help_text.trim();
        if (row.standards?.trim()) result.standards = row.standards.trim();

        // Associations (only include if resolved)
        // Associations (only include if resolved or fall back to existing for updates)
        if (plant_id) {
            result.plant_id = plant_id;
        } else if (existingQuestion && existingQuestion.plant_id) {
            result.plant_id = existingQuestion.plant_id;
        }

        if (categoryIds.length > 0) {
            result.category_ids = categoryIds;
        } else if (existingQuestion && existingQuestion.categories && existingQuestion.categories.length > 0) {
            result.category_ids = existingQuestion.categories.map(c => c.id);
        }

        if (productIds.length > 0) {
            result.product_ids = productIds;
        } else if (!productsStr && existingQuestion && existingQuestion.products && existingQuestion.products.length > 0) {
            // Only fallback if products column was COMPLETELY empty/missing. 
            // If user provided validated products but result was empty (unlikely), we respect that?
            // Actually, productsStr check is safer to know "user didn't provide input".
            result.product_ids = existingQuestion.products.map(p => p.id);
        } else if (productIds.length > 0) {
            // Redundant check but just to be clear: favor refined productIds if they exist
            result.product_ids = productIds;
        }

        if (frequencyIds.length > 0) {
            result.frequency_ids = frequencyIds;
        } else if (existingQuestion && existingQuestion.frequencies && existingQuestion.frequencies.length > 0) {
            result.frequency_ids = existingQuestion.frequencies.map(f => f.id);
        }
        if (conditions.length > 0) result.conditions = conditions;

        return result;
    }

    async _generateConditionCode(name) {
        // Generate code from name (e.g., "Good Condition" -> "GOOD_CONDITION")
        const baseCode = name
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 20);

        // Ensure uniqueness
        let code = baseCode;
        let counter = 1;

        while (true) {
            const existing = await Condition.findOne({
                where: { condition_code: code }
            });
            if (!existing) break;
            code = `${baseCode}_${counter}`;
            counter++;
        }

        return code;
    }

    /**
     * Helper to generate CSV string from data array
     */
    _generateCSVFromData(data) {
        if (!data || data.length === 0) {
            return '';
        }
        try {
            const json2csvParser = new Parser();
            return json2csvParser.parse(data);
        } catch (err) {
            console.error('Error generating CSV:', err);
            throw new Error('Failed to generate CSV data');
        }
    }

    /**
     * Helper to parse a single CSV line handling quotes
     */
    _parseCSVLine(text) {
        if (!text) return [];
        // Split by comma, ignoring commas inside double quotes
        const matches = text.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!matches) return [];

        return matches.map(val => {
            val = val.trim();
            // Remove surrounding quotes if present
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
                // Unescape double quotes
                val = val.replace(/""/g, '"');
            }
            return val;
        });
    }

    /**
     * Find or create a condition by name
     */
    async findOrCreateCondition(name, userId) {
        if (!name) return null;

        let condition = await Condition.findOne({
            where: { condition_name: { [Op.iLike]: name } }
        });

        if (!condition) {
            const code = await this._generateConditionCode(name);
            condition = await Condition.create({
                condition_name: name,
                condition_code: code,
                status: 'ACTIVE',
                created_by: userId
            });
        }
        return condition;
    }
}

module.exports = new QuestionBulkService();
