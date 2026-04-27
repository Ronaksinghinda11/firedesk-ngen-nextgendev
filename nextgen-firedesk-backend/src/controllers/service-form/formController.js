/**
 * Form Controller
 * Endpoints for form generation from questions
 */

const Joi = require("joi");
const formService = require("../../services/service-form/formService");
const FormDTO = require("../../dto/service-form/FormDTO");
const pdfService = require("../../services/service-form/pdfService");

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const formController = {
    /**
     * Create a new form by selecting existing questions
     * POST /forms
     */
    async create(req, res, next) {
        const sectionSchema = Joi.object({
            section_name: Joi.string().required(),
            section_order: Joi.number().integer().min(1).required(),
            description: Joi.string().optional().allow('', null),
            is_mandatory: Joi.boolean().optional().default(false),
            question_ids: Joi.array().items(
                Joi.string().pattern(uuidPattern)
            ).min(1).optional(),
            questions: Joi.array().items(Joi.object({
                tempId: Joi.string().optional(),
                questionText: Joi.string().required(),
                questionCode: Joi.string().optional().allow('', null),
                questionOrder: Joi.number().integer().optional(),
                questionType: Joi.string().valid('INSPECTION', 'TESTING', 'MAINTENANCE').required(),
                applicableFrequencies: Joi.array().items(Joi.string()).required(),
                answerType: Joi.string().required(),
                isMandatory: Joi.boolean().required(),
                requiresPhoto: Joi.boolean().required(),
                requiresNotes: Joi.boolean().required(),
                helpText: Joi.string().optional().allow('', null),
                conditions: Joi.array().items(Joi.object()).optional()
            })).optional(),
            mandatory_overrides: Joi.array().items(
                Joi.boolean().allow(null)
            ).optional()
        });

        const createFormSchema = Joi.object({
            service_name: Joi.string().required(),
            form_code: Joi.string().max(100).optional().allow('', null),
            service_type: Joi.string().valid('INSPECTION', 'TESTING', 'MAINTENANCE').optional(),
            category_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            product_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            plant_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            // Either sections with questions OR flat question_ids
            sections: Joi.array().items(sectionSchema).optional(),
            question_ids: Joi.array().items(
                Joi.string().pattern(uuidPattern)
            ).optional()
        }).or('sections', 'question_ids');

        const { error, value } = createFormSchema.validate(req.body);
        if (error) return next(error);

        try {
            const form = await formService.createForm(value, req.user.id);

            return res.status(201).json({
                success: true,
                message: "Form created successfully",
                data: form
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get all forms with optional filters
     * GET /forms
     */
    async getAll(req, res, next) {
        try {
            const { status, category_id, product_id, plant_id } = req.query;

            const filters = {
                ...(status && { status }),
                ...(category_id && { category_id }),
                ...(product_id && { product_id }),
                ...(plant_id && { plant_id })
            };

            const forms = await formService.getAllForms(filters);

            return res.json({
                success: true,
                count: forms.length,
                data: forms
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get a single form by ID
     * GET /forms/:id
     */
    async getById(req, res, next) {
        const getByIdSchema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = getByIdSchema.validate(req.params);
        if (error) return next(error);

        try {
            const form = await formService.getFormById(req.params.id);

            return res.json({
                success: true,
                data: FormDTO.fromModel(form)
            });
        } catch (error) {
            if (error.message === 'Form not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Get forms by category
     * GET /forms/category/:categoryId
     */
    async getByCategory(req, res, next) {
        const schema = Joi.object({
            categoryId: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const forms = await formService.getFormsByCategory(
                req.params.categoryId,
                req.query
            );

            return res.json({
                success: true,
                count: forms.length,
                data: forms
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Update a form
     * PUT /forms/:id
     */
    async update(req, res, next) {
        const sectionSchema = Joi.object({
            section_name: Joi.string().required(),
            section_order: Joi.number().integer().min(1).required(),
            description: Joi.string().optional().allow('', null),
            is_mandatory: Joi.boolean().optional(),
            question_ids: Joi.array().items(
                Joi.string().pattern(uuidPattern)
            ).min(1).optional(),
            questions: Joi.array().items(Joi.object().unknown(true)).optional(),
            mandatory_overrides: Joi.array().items(
                Joi.boolean().allow(null)
            ).optional()
        });

        const updateFormSchema = Joi.object({
            service_name: Joi.string().optional(),
            category_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            product_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            plant_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            service_type: Joi.string().valid('INSPECTION', 'TESTING', 'MAINTENANCE').optional(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
            sections: Joi.array().items(sectionSchema).optional()
        });

        const { error, value } = updateFormSchema.validate(req.body);
        if (error) return next(error);

        try {
            const form = await formService.updateForm(req.params.id, value, req.user.id);

            return res.json({
                success: true,
                message: "Form updated successfully",
                data: form
            });
        } catch (error) {
            if (error.message === 'Form not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Delete a form (soft delete)
     * DELETE /forms/:id
     */
    async delete(req, res, next) {
        const deleteSchema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = deleteSchema.validate(req.params);
        if (error) return next(error);

        try {
            const result = await formService.deleteForm(req.params.id);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            if (error.message === 'Form not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Auto-generate form from criteria
     * POST /forms/generate
     */
    async generateFromCriteria(req, res, next) {
        const generateSchema = Joi.object({
            category_id: Joi.string().pattern(uuidPattern).required(),
            product_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            frequency_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            plant_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            service_name: Joi.string().optional()
        });

        const { error, value } = generateSchema.validate(req.body);
        if (error) return next(error);

        try {
            const form = await formService.generateFormFromCriteria(value, req.user.id);

            return res.status(201).json({
                success: true,
                message: "Form generated successfully",
                data: form
            });
        } catch (error) {
            if (error.message === 'No questions found matching the criteria') {
                return next({ status: 400, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Get form for submission (filtered by frequency if specified)
     * GET /forms/:id/for-submission
     */
    async getFormForSubmission(req, res, next) {
        const schema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const { frequency_id } = req.query;
            const form = await formService.getFormForSubmission(
                req.params.id,
                frequency_id
            );

            return res.json({
                success: true,
                data: form
            });
        } catch (error) {
            if (error.message === 'Form not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Sync form questions - populate form with matching questions
     * POST /forms/:id/sync
     */
    async syncQuestions(req, res, next) {
        const schema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const result = await formService.syncFormQuestions(req.params.id);

            return res.json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error) {
            if (error.message === 'Form not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Sync all forms with matching questions
     * POST /forms/sync-all
     */
    async syncAllQuestions(req, res, next) {
        try {
            const results = await formService.syncAllForms();

            return res.json({
                success: true,
                message: `Synced ${results.length} forms`,
                data: results
            });
        } catch (error) {
            return next(error);
        }
    },
    /**
     * Get PDF preview of the form
     * GET /forms/:id/pdf-preview
     */
    async getPDFPreview(req, res, next) {
        const schema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const { frequency } = req.query; // Optional: filter by frequency (e.g., 'WEEKLY')

            // Get full form details
            const form = await formService.getFormById(req.params.id);
            const formDTO = FormDTO.fromModel(form);

            // Determine frequency to use
            // If query param provided, use it. Otherwise use form's default frequency if available
            let targetFrequency = frequency;
            if (!targetFrequency && formDTO.frequency) {
                targetFrequency = formDTO.frequency.frequencyCode || formDTO.frequency.frequency_code; // Handle potential different DTO formats
            }

            // If still no frequency, default to 'WEEKLY' or throw error?
            // For now let's default to 'WEEKLY' if generic, or maybe we should require it
            if (!targetFrequency) {
                targetFrequency = 'WEEKLY'; // Default fall back
            }

            const pdfBuffer = await pdfService.generateServiceFormPDF(formDTO, targetFrequency);

            // Ensure we have a proper buffer (Puppeteer might return Uint8Array)
            const finalBuffer = Buffer.from(pdfBuffer);

            // Sanitize filename for legacy clients (ASCII only)
            const sanitizedServiceName = formDTO.serviceName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
            const legacyFilename = `${sanitizedServiceName}-${targetFrequency}.pdf`;

            // RFC 6266: Encode filename for modern browsers (supports UTF-8)
            const encodedServiceName = encodeURIComponent(formDTO.serviceName);
            const utf8Filename = `${encodedServiceName}-${targetFrequency}.pdf`;

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${legacyFilename}"; filename*=UTF-8''${utf8Filename}`,
                'Content-Length': finalBuffer.length
            });

            return res.send(finalBuffer);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            if (error.message === 'Form not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Cleanup empty forms (forms with no questions)
     * @route POST /service-forms/forms/cleanup-empty
     */
    async cleanupEmptyForms(req, res, next) {
        try {
            const result = await formService.deleteEmptyForms();
            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    deletedCount: result.deletedCount,
                    deletedForms: result.deletedForms
                }
            });
        } catch (error) {
            console.error('Cleanup empty forms error:', error);
            return next(error);
        }
    }
};

module.exports = formController;
