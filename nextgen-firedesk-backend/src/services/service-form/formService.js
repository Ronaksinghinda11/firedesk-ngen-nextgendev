/**
 * Form Service
 * Business logic for form generation from questions
 */

const { sequelize } = require('../../../config/config');
const { Op } = require('sequelize');
const {
    Form,
    FormSection,
    FormQuestion,
    Question,
    QuestionCondition
} = require('../../models/service-form');
const Category = require('../../models/master-data/category');
const Product = require('../../models/master-data/product');
const Plant = require('../../models/plants/Plant');
const Condition = require('../../models/master-data/ConditionMaster');
const InspectionFrequency = require('../../models/service-form/InspectionFrequency');
const { generateCode, ensureUniqueCode } = require('../../utils/codeGenerator');
const questionService = require('./questionService');
const auditService = require('../audit/audit_service');

class FormService {
    /**
     * Create a new form by selecting existing questions
     */
    async createForm(formData, userId) {
        const transaction = await sequelize.transaction();
        let committed = false;

        try {
            // Generate unique form code
            let formCode = formData.form_code;
            if (!formCode) {
                const prefix = generateCode('FORM' + Date.now().toString().slice(-6));
                const checkExists = async (code) => {
                    const existing = await Form.findOne({ where: { form_code: code } });
                    return !!existing;
                };
                formCode = await ensureUniqueCode(prefix, checkExists);
            }

            // Create the form
            const form = await Form.create({
                form_code: formCode,
                service_name: formData.service_name,
                service_type: formData.service_type || 'Inspection', // Default to Inspection
                category_id: formData.category_id || null,
                product_id: formData.product_id || null,
                plant_id: formData.plant_id || null,
                status: 'Active',
                created_by: userId
            }, { transaction });

            // Create sections and link questions
            if (formData.sections && formData.sections.length > 0) {
                for (const sectionData of formData.sections) {
                    const section = await FormSection.create({
                        form_id: form.id,
                        section_name: sectionData.section_name,
                        section_order: sectionData.section_order,
                        description: sectionData.description || null,
                        is_mandatory: sectionData.is_mandatory || false
                    }, { transaction });

                    // Link questions to section
                    if (sectionData.question_ids && sectionData.question_ids.length > 0) {
                        for (let i = 0; i < sectionData.question_ids.length; i++) {
                            await FormQuestion.create({
                                form_id: form.id,
                                question_id: sectionData.question_ids[i],
                                section_id: section.id,
                                question_order: i + 1,
                                is_mandatory_override: sectionData.mandatory_overrides?.[i] || null
                            }, { transaction });
                        }
                    }

                    // Handle nested question objects (new creation flow)
                    if (sectionData.questions && sectionData.questions.length > 0) {
                        await this._processSectionQuestions(
                            sectionData.questions,
                            form.id,
                            section.id,
                            userId,
                            transaction
                        );
                    }
                }
            } else if (formData.question_ids && formData.question_ids.length > 0) {
                // Simple form without sections - create default section
                const defaultSection = await FormSection.create({
                    form_id: form.id,
                    section_name: 'Main',
                    section_order: 1,
                    is_mandatory: true
                }, { transaction });

                for (let i = 0; i < formData.question_ids.length; i++) {
                    await FormQuestion.create({
                        form_id: form.id,
                        question_id: formData.question_ids[i],
                        section_id: defaultSection.id,
                        question_order: i + 1
                    }, { transaction });
                }
            }

            await transaction.commit();
            committed = true;

            // Audit Log
            try {
                await auditService.log({
                    entityType: 'form',
                    entityId: form.id,
                    entityName: form.service_name,
                    action: 'CREATE',
                    user: userId ? { id: userId } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for createForm:', error.message);
            }

            // Fetch complete form with associations
            return await this.getFormById(form.id);
        } catch (error) {
            if (!committed) {
                await transaction.rollback();
            }
            throw error;
        }
    }

    /**
     * Get all forms with optional filters
     */
    async getAllForms(filters = {}) {
        const where = {};

        if (filters.status) {
            where.status = filters.status;
        } else {
            where.status = 'Active';
        }

        if (filters.category_id) {
            where.category_id = filters.category_id;
        }

        if (filters.product_id) {
            where.product_id = filters.product_id;
        }

        if (filters.plant_id) {
            where.plant_id = filters.plant_id;
        }

        const forms = await Form.findAll({
            where,
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'category_name']
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'product_name']
                },
                {
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', 'plant_name']
                },
                {
                    model: InspectionFrequency,
                    as: 'frequency',
                    attributes: ['id', 'frequency_code', 'frequency_name', 'interval_days']
                },
                {
                    model: FormSection,
                    as: 'sections',
                    include: [{
                        model: FormQuestion,
                        as: 'formQuestions',
                        include: [{
                            model: Question,
                            as: 'question',
                            attributes: ['id', 'question_text', 'question_code', 'answer_type']
                        }]
                    }]
                }
            ],
            order: [
                ['created_at', 'DESC'],
                [{ model: FormSection, as: 'sections' }, 'section_order', 'ASC'],
                [{ model: FormSection, as: 'sections' }, { model: FormQuestion, as: 'formQuestions' }, 'question_order', 'ASC']
            ]
        });

        return forms;
    }

    /**
     * Get a single form by ID with all associations
     */
    async getFormById(formId) {
        const form = await Form.findByPk(formId, {
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'category_name']
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'product_name']
                },
                {
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', 'plant_name']
                },
                {
                    model: FormSection,
                    as: 'sections',
                    include: [{
                        model: FormQuestion,
                        as: 'formQuestions',
                        include: [{
                            model: Question,
                            as: 'question',
                            include: [
                                {
                                    model: Condition,
                                    as: 'conditions',
                                    through: {
                                        attributes: ['display_order', 'is_active']
                                    }
                                },
                                {
                                    model: InspectionFrequency,
                                    as: 'frequencies',
                                    through: { attributes: [] }
                                }
                            ]
                        }]
                    }]
                }
            ],
            order: [
                [{ model: FormSection, as: 'sections' }, 'section_order', 'ASC'],
                [{ model: FormSection, as: 'sections' }, { model: FormQuestion, as: 'formQuestions' }, 'question_order', 'ASC']
            ]
        });

        if (!form) {
            throw new Error('Form not found');
        }

        return form;
    }

    /**
     * Get forms by category
     */
    async getFormsByCategory(categoryId, filters = {}) {
        const where = {
            category_id: categoryId,
            status: 'Active'
        };

        // Strict plant isolation
        if (filters.plant_id) {
            where.plant_id = filters.plant_id;
        } else {
            where.plant_id = null;
        }

        const forms = await Form.findAll({
            where,
            include: [
                {
                    model: FormSection,
                    as: 'sections',
                    include: [{
                        model: FormQuestion,
                        as: 'formQuestions',
                        include: [{
                            model: Question,
                            as: 'question'
                        }]
                    }]
                }
            ],
            order: [
                ['created_at', 'DESC'],
                [{ model: FormSection, as: 'sections' }, 'section_order', 'ASC']
            ]
        });

        return forms;
    }

    /**
     * Update a form
     */
    async updateForm(formId, formData, userId) {
        const transaction = await sequelize.transaction();
        let committed = false;

        try {
            const form = await Form.findByPk(formId);
            if (!form) {
                throw new Error('Form not found');
            }

            // Update form fields
            await form.update({
                service_name: formData.service_name ?? form.service_name,
                category_id: formData.category_id ?? form.category_id,
                product_id: formData.product_id ?? form.product_id,
                plant_id: formData.plant_id ?? form.plant_id,
                status: formData.status ?? form.status
            }, { transaction });

            // Update sections and questions if provided
            if (formData.sections !== undefined) {
                // Remove existing sections and questions
                await FormQuestion.destroy({
                    where: { form_id: formId },
                    transaction
                });
                await FormSection.destroy({
                    where: { form_id: formId },
                    transaction
                });

                // Create new sections and questions
                for (const sectionData of formData.sections) {
                    const section = await FormSection.create({
                        form_id: formId,
                        section_name: sectionData.section_name,
                        section_order: sectionData.section_order,
                        description: sectionData.description || null,
                        is_mandatory: sectionData.is_mandatory || false
                    }, { transaction });

                    if (sectionData.question_ids && sectionData.question_ids.length > 0) {
                        for (let i = 0; i < sectionData.question_ids.length; i++) {
                            await FormQuestion.create({
                                form_id: formId,
                                question_id: sectionData.question_ids[i],
                                section_id: section.id,
                                question_order: i + 1,
                                is_mandatory_override: sectionData.mandatory_overrides?.[i] || null
                            }, { transaction });
                        }
                    }

                    // Handle nested question objects (new creation flow)
                    if (sectionData.questions && sectionData.questions.length > 0) {
                        await this._processSectionQuestions(
                            sectionData.questions,
                            formId,
                            section.id,
                            userId,
                            transaction
                        );
                    }
                }
            }

            await transaction.commit();
            committed = true;

            // Audit Log — keep this, but don't return here so post-update checks run below
            try {
                await auditService.log({
                    entityType: 'form',
                    entityId: formId,
                    entityName: form.service_name,
                    action: 'UPDATE',
                    user: userId ? { id: userId } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for updateForm:', error.message);
            }

        } catch (error) {
            if (!committed) {
                await transaction.rollback();
            }
            throw error;
        }

        // Post-update check: If form has no questions, delete it (soft delete)
        const updatedForm = await this.getFormById(formId);
        const questionCount = updatedForm.sections.reduce((count, section) =>
            count + (section.formQuestions ? section.formQuestions.length : 0), 0);

        if (questionCount === 0) {
            console.log(`[Auto-Delete] Form ${formId} has 0 questions after update. Deleting...`);
            await this.deleteForm(formId);
            // Return the form but ensure status is Inactive
            updatedForm.status = 'Inactive';
            return updatedForm;
        }

        return updatedForm;
    }

    /**
     * Delete (soft delete) a form and cancel related future services
     */
    async deleteForm(formId) {
        const form = await Form.findByPk(formId);
        if (!form) {
            throw new Error('Form not found');
        }

        // Cancel all future services using this form
        const schedulerService = require('../scheduler/schedulerService');
        const cancelResult = await schedulerService.cancelServicesForForm(formId, 'Form deleted');
        console.log(`Cancelled ${cancelResult.cancelledCount} services for form ${formId}`);

        await form.update({ status: 'Inactive' });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'form',
                entityId: formId,
                entityName: form.service_name,
                action: 'ARCHIVE',
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for deleteForm:', error.message);
        }

        return {
            message: 'Form deleted successfully',
            cancelledServices: cancelResult.cancelledCount
        };
    }

    /**
     * Auto-generate a form based on criteria
     * Creates a form by selecting all questions that match the given category/product/frequency
     */
    async generateFormFromCriteria(criteria, userId) {
        const { category_id, product_id, frequency_id, service_name, plant_id } = criteria;

        // Get questions matching the criteria
        const questions = await questionService.getQuestionsByCriteria({
            category_id,
            product_id,
            frequency_id,
            plant_id
        });

        if (questions.length === 0) {
            throw new Error('No questions found matching the criteria');
        }

        // Group questions by question_type for sections
        const groupedQuestions = this._groupQuestionsByType(questions);

        // Determine dominant service type
        const types = new Set(Object.keys(groupedQuestions));
        let serviceType = 'Inspection';
        if (types.has('maintenance')) {
            serviceType = 'Maintenance';
        } else if (types.has('testing')) {
            serviceType = 'Testing';
        } else if (types.has('inspection')) {
            serviceType = 'Inspection';
        }

        // Build form data
        const formData = {
            service_name: service_name || `Auto-generated form for ${category_id}`,
            service_type: serviceType,
            category_id,
            product_id,
            plant_id,
            sections: []
        };

        let sectionOrder = 1;
        for (const [questionType, typeQuestions] of Object.entries(groupedQuestions)) {
            formData.sections.push({
                section_name: this._formatSectionName(questionType),
                section_order: sectionOrder++,
                is_mandatory: true,
                question_ids: typeQuestions.map(q => q.id)
            });
        }

        return await this.createForm(formData, userId);
    }

    /**
     * Sync form questions - populate form with questions matching its criteria AND service type
     * Only syncs questions whose question_type matches the form's service_type
     */
    async syncFormQuestions(formId) {
        const form = await Form.findByPk(formId, {
            include: [{ model: FormSection, as: 'sections' }]
        });

        if (!form) {
            throw new Error('Form not found');
        }

        // Get matching questions based on form's category, product, and frequency
        const allQuestions = await questionService.getQuestionsByCriteria({
            category_id: form.category_id,
            product_id: form.product_id,
            frequency_id: form.frequency_id,
            plant_id: form.plant_id
        });

        // Filter questions by form's service_type
        const formServiceType = (form.service_type || 'Inspection').toLowerCase();
        const questions = allQuestions.filter(q => {
            // STRICT MATCHING: Only include questions that explicitly match the service type
            // e.g. "Inspection" form only gets "Inspection" questions
            const questionServiceType = (q.service_type || '').toLowerCase();
            return questionServiceType === formServiceType;
        });

        if (questions.length === 0) {
            console.log(`⚠️ No matching ${formServiceType} questions found for form ${form.service_name}. Deleting form...`);
            await this.deleteForm(formId);
            return { synced: 0, message: `No matching ${formServiceType} questions found. Form deleted.` };
        }

        const transaction = await sequelize.transaction();

        try {
            // Clear existing sections and questions
            for (const section of (form.sections || [])) {
                await FormQuestion.destroy({
                    where: { section_id: section.id },
                    transaction
                });
            }
            await FormSection.destroy({
                where: { form_id: formId },
                transaction
            });

            // Create single section for this service type
            const sectionName = this._formatSectionName(formServiceType);
            const section = await FormSection.create({
                form_id: formId,
                section_name: sectionName,
                section_order: 1,
                is_mandatory: true
            }, { transaction });

            // Link questions to this section
            for (let i = 0; i < questions.length; i++) {
                await FormQuestion.create({
                    form_id: formId,
                    section_id: section.id,
                    question_id: questions[i].id,
                    question_order: i + 1,
                    is_mandatory_override: questions[i].is_mandatory ? true : null
                }, { transaction });
            }

            await transaction.commit();

            console.log(`✅ Synced ${questions.length} ${formServiceType} questions to form ${form.service_name}`);
            return { synced: questions.length, sections: 1, message: `Synced ${questions.length} ${formServiceType} questions` };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Sync all forms - populate all forms with matching questions
     */
    async syncAllForms() {
        const forms = await Form.findAll({ where: { status: 'Active' } });
        const results = [];

        for (const form of forms) {
            try {
                const result = await this.syncFormQuestions(form.id);
                results.push({ formId: form.id, formName: form.service_name, ...result });
            } catch (error) {
                results.push({ formId: form.id, formName: form.service_name, synced: 0, error: error.message });
            }
        }

        return results;
    }

    /**
     * Get form for submission (optimized for mobile)
     */
    async getFormForSubmission(formId, frequencyId = null) {
        const form = await this.getFormById(formId);

        // If frequency is specified, filter questions by frequency
        if (frequencyId) {
            form.sections = form.sections.map(section => {
                section.formQuestions = section.formQuestions.filter(fq => {
                    const question = fq.question;
                    if (!question.frequencies || question.frequencies.length === 0) {
                        return true; // No frequency restriction
                    }
                    return question.frequencies.some(f => f.id === frequencyId);
                });
                return section;
            }).filter(section => section.formQuestions.length > 0);
        }

        return form;
    }

    /**
     * Auto-generate forms for each service type (inspection, testing, maintenance)
     * Form name format: {serviceType}_{category}_{product}_{frequency}
     * Creates SEPARATE forms for each service type AND frequency
     */
    async autoGenerateFormIfNotExists(criteria, userId) {
        const { category_id, product_id, frequency_id, plant_id, service_type } = criteria;

        // If a specific service_type is provided, generate only that form
        if (service_type) {
            return this._generateSingleForm(criteria, userId);
        }

        // Otherwise, generate forms for all service types that have matching questions
        const forms = await this.autoGenerateFormsForAllServiceTypes(criteria, userId);
        return forms[0]; // Return first form for backwards compatibility
    }

    /**
     * Generate forms for ALL service types (inspection, testing, maintenance)
     * that have matching questions for the given criteria
     */
    async autoGenerateFormsForAllServiceTypes(criteria, userId) {
        const { category_id, product_id, frequency_id, plant_id } = criteria;
        const serviceTypes = ['inspection', 'testing', 'maintenance'];
        const generatedForms = [];

        // Get all questions matching the criteria
        const allQuestions = await questionService.getQuestionsByCriteria({
            category_id,
            product_id,
            frequency_id,
            plant_id
        });

        // Group questions by service type
        const questionsByType = this._groupQuestionsByType(allQuestions);

        // Generate a form for each service type that has questions
        for (const serviceType of serviceTypes) {
            const typeQuestions = questionsByType[serviceType] || [];

            if (typeQuestions.length === 0) {
                continue; // Skip service types with no questions
            }

            try {
                const form = await this._generateSingleForm({
                    category_id,
                    product_id,
                    frequency_id,
                    plant_id,
                    service_type: serviceType
                }, userId, typeQuestions);

                if (form) {
                    generatedForms.push(form);
                }
            } catch (error) {
                console.log(`Form for ${serviceType} may already exist:`, error.message);
            }
        }

        return generatedForms;
    }

    /**
     * Generate a single form for a specific service type
     * @private
     */
    async _generateSingleForm(criteria, userId, preloadedQuestions = null) {
        const { category_id, product_id, frequency_id, plant_id, service_type } = criteria;
        const normalizedServiceType = (service_type || 'inspection').toLowerCase();

        // Build where clause - form is unique by service_type + category + product + frequency + plant
        const whereClause = {
            category_id,
            product_id,
            service_type: this._capitalizeServiceType(normalizedServiceType),
            status: 'Active'
        };

        if (frequency_id) {
            whereClause.frequency_id = frequency_id;
        }

        // Strict plant isolation: always filter by plant_id (including null)
        if (plant_id) {
            whereClause.plant_id = plant_id;
        } else {
            whereClause.plant_id = null;
        }

        // Check if form already exists for this exact combination
        const existingForm = await Form.findOne({ where: whereClause });

        if (existingForm) {
            return existingForm;
        }

        // Fetch names for the form title
        const [category, product, frequency] = await Promise.all([
            Category.findByPk(category_id, { attributes: ['category_name'] }),
            Product.findByPk(product_id, { attributes: ['product_name'] }),
            frequency_id ? InspectionFrequency.findByPk(frequency_id, { attributes: ['frequency_code', 'frequency_name'] }) : null
        ]);

        const categoryName = category?.category_name || 'Unknown';
        const productName = product?.product_name || 'Unknown';
        const frequencyCode = frequency?.frequency_code || 'ALL';
        const frequencyName = frequency?.frequency_name || 'All Frequencies';

        // Generate form name: {ServiceType}_{Category}_{Product}_{Frequency}
        const capitalizedType = this._capitalizeServiceType(normalizedServiceType);
        const formName = `${capitalizedType}_${categoryName}_${productName}_${frequencyCode}`;

        // Generate unique form code
        const formCode = `FORM-${normalizedServiceType.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-8)}`;

        // Get questions if not preloaded
        let questions = preloadedQuestions;
        if (!questions) {
            const allQuestions = await questionService.getQuestionsByCriteria({
                category_id,
                product_id,
                frequency_id,
                plant_id
            });
            // Filter by service type (STRICT MATCHING)
            questions = allQuestions.filter(q =>
                (q.service_type || '').toLowerCase() === normalizedServiceType
            );
        }

        // Create the form
        const form = await Form.create({
            form_code: formCode,
            service_name: formName,
            service_type: capitalizedType,
            category_id,
            product_id,
            frequency_id: frequency_id || null,
            plant_id: plant_id || null,
            status: 'Active',
            created_by: userId
        });

        // Create section with matching questions
        if (questions.length > 0) {
            const section = await FormSection.create({
                form_id: form.id,
                section_name: `${capitalizedType} Questions`,
                section_order: 1,
                is_mandatory: true
            });

            for (let i = 0; i < questions.length; i++) {
                await FormQuestion.create({
                    form_id: form.id,
                    section_id: section.id,
                    question_id: questions[i].id,
                    question_order: i + 1,
                    is_required: questions[i].is_mandatory
                });
            }
        }

        console.log(`✅ Auto-generated form: ${formName} with ${questions.length} questions`);

        // Trigger service generation for this new form (async, non-blocking)
        const schedulerService = require('../scheduler/schedulerService');
        schedulerService.generateServicesForNewForm(form)
            .then(result => {
                if (result.success && result.servicesGenerated > 0) {
                    console.log(`📥 Auto-generated ${result.servicesGenerated} services for new form ${formName}`);
                }
            })
            .catch(err => {
                console.error(`Error generating services for new form ${formName}:`, err.message);
            });

        return form;
    }

    /**
     * Capitalize service type for display
     * @private
     */
    _capitalizeServiceType(type) {
        const typeMap = {
            'inspection': 'Inspection',
            'testing': 'Testing',
            'maintenance': 'Maintenance',
            'general': 'General'
        };
        return typeMap[type.toLowerCase()] || 'Inspection';
    }

    // ============ Private Helper Methods ============

    /**
     * Group questions by their service_type
     */
    _groupQuestionsByType(questions) {
        const groups = {};

        for (const question of questions) {
            // Use service_type for grouping
            // If service_type is null/empty, we can either skip it or group it under 'general' or 'other'
            // Given the requirement for strict matching, we should probably only group valid types
            const type = (question.service_type || 'general').toLowerCase();

            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(question);
        }

        return groups;
    }

    /**
     * Format section name from question type
     */
    _formatSectionName(questionType) {
        const names = {
            'inspection': 'Inspection Questions',
            'testing': 'Testing Questions',
            'maintenance': 'Maintenance Questions',
            'general': 'General Questions'
        };
        return names[questionType] || 'Questions';
    }

    /**
     * Delete forms that have no questions
     * This is a maintenance/cleanup function
     */
    async deleteEmptyForms() {
        try {
            // Find all forms that have no questions
            const allForms = await Form.findAll({
                attributes: ['id', 'form_code', 'service_name']
            });

            let deletedCount = 0;
            const deletedForms = [];

            for (const form of allForms) {
                const questionCount = await FormQuestion.count({
                    where: { form_id: form.id }
                });

                if (questionCount === 0) {
                    // Delete form sections first
                    await FormSection.destroy({
                        where: { form_id: form.id }
                    });

                    // Delete the form
                    await Form.destroy({
                        where: { id: form.id }
                    });

                    deletedForms.push({
                        id: form.id,
                        form_code: form.form_code,
                        service_name: form.service_name
                    });
                    deletedCount++;
                    console.log(`Deleted empty form: ${form.form_code} (${form.id})`);
                }
            }

            return {
                message: `Deleted ${deletedCount} empty forms`,
                deletedCount,
                deletedForms
            };
        } catch (error) {
            console.error('Error deleting empty forms:', error);
            throw error;
        }
    }

    /**
     * Process questions for a section (both linking existing and creating new)
     * @private
     */
    async _processSectionQuestions(questionsData, formId, sectionId, userId, transaction) {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        for (const qData of questionsData) {
            let questionId = null;

            // Check if existing question (has valid UUID)
            if (qData.tempId && uuidPattern.test(qData.tempId)) {
                questionId = qData.tempId;
            } else if (qData.id && uuidPattern.test(qData.id)) {
                questionId = qData.id;
            } else {
                // Create New Question
                const questionType = (qData.questionType || 'INSPECTION').toLowerCase();
                const serviceType = this._mapToServiceType(questionType);

                // Generate code if missing
                let questionCode = qData.questionCode;
                if (!questionCode) {
                    const prefix = 'Q-' + (questionType.substring(0, 3).toUpperCase());
                    questionCode = generateCode(prefix + Date.now().toString().slice(-6));
                }

                const newQuestion = await Question.create({
                    question_text: qData.questionText,
                    question_code: questionCode,
                    question_type: questionType,
                    service_type: serviceType,
                    answer_type: qData.answerType || 'BOOLEAN', // Default to BOOLEAN per current frontend logic
                    is_mandatory: qData.isMandatory,
                    requires_photo: qData.requiresPhoto,
                    requires_notes: qData.requiresNotes,
                    help_text: qData.helpText,
                    created_by: userId || formId.created_by, // Fallback if userId missing (should be passed)
                    status: 'Active'
                }, { transaction });

                questionId = newQuestion.id;

                // Handle Conditions
                if (qData.conditions && qData.conditions.length > 0) {
                    for (const cond of qData.conditions) {
                        if (cond.conditionMasterId) {
                            await QuestionCondition.create({
                                question_id: questionId,
                                condition_id: cond.conditionMasterId,
                                condition_source: cond.conditionSource || 'MASTER',
                                display_order: cond.displayOrder || 1,
                                is_active: true
                            }, { transaction });
                        }
                        // Note: Custom conditions handling would go here if backend supports creating separate ConditionMaster on the fly
                    }
                }
            }

            // Link to Section
            await FormQuestion.create({
                form_id: formId,
                section_id: sectionId,
                question_id: questionId,
                question_order: qData.questionOrder,
                is_mandatory_override: null // Can be enhanced to support overrides from payload
            }, { transaction });
        }
    }

    /**
     * Map question type to service type
     */
    _mapToServiceType(questionType) {
        const map = {
            'inspection': 'inspection',
            'testing': 'testing',
            'maintenance': 'maintenance',

        };
        return map[questionType.toLowerCase()] || 'other';
    }
    /**
     * Check if a form has any questions
     */
    async formHasQuestions(formId) {
        const count = await FormQuestion.count({
            where: { form_id: formId }
        });
        return count > 0;
    }
}

module.exports = new FormService();
