/**
 * Service Submission Controller
 * Endpoints for service submissions and answers
 */

const Joi = require("joi");
const serviceSubmissionService = require("../../services/service-form/serviceSubmissionService");

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const serviceSubmissionController = {
    /**
     * Create a new service submission
     * POST /submissions
     */
    async create(req, res, next) {
        const createSubmissionSchema = Joi.object({
            asset_id: Joi.string().pattern(uuidPattern).required(),
            form_id: Joi.string().pattern(uuidPattern).required(),
            plant_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            schedule_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            frequency_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            technician_id: Joi.string().pattern(uuidPattern).required(),
            manager_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            frequency: Joi.string().optional().allow(null),
            inspection_type: Joi.string().valid('Inspection', 'Testing', 'Maintenance').optional().allow(null),
            scheduled_date: Joi.date().optional().allow(null)
        });

        const { error, value } = createSubmissionSchema.validate(req.body);
        if (error) return next(error);

        try {
            const submission = await serviceSubmissionService.createSubmission(value, req.user.id);

            return res.status(201).json({
                success: true,
                message: "Service submission created successfully",
                data: submission
            });
        } catch (error) {
            if (error.message === 'Asset not found' || error.message === 'Form not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Get submission by ID
     * GET /submissions/:id
     */
    async getById(req, res, next) {
        const getByIdSchema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = getByIdSchema.validate(req.params);
        if (error) return next(error);

        try {
            const submission = await serviceSubmissionService.getSubmissionById(req.params.id);

            return res.json({
                success: true,
                data: submission
            });
        } catch (error) {
            if (error.message === 'Submission not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Get service submission view with structured response for admin/manager display
     * GET /submissions/:id/view
     */
    async getSubmissionView(req, res, next) {
        const schema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const viewData = await serviceSubmissionService.getServiceSubmissionView(req.params.id);

            return res.json({
                success: true,
                data: viewData
            });
        } catch (error) {
            if (error.message === 'Submission not found') {
                return next({ status: 404, message: 'Service form not found' });
            }
            return next(error);
        }
    },

    /**
     * Get all submissions with filters
     * GET /submissions
     */
    async getAll(req, res, next) {
        try {
            const { status, plant_id, technician_id, asset_id, from_date, to_date, limit } = req.query;

            const filters = {
                ...(status && { status }),
                ...(plant_id && { plant_id }),
                ...(technician_id && { technician_id }),
                ...(asset_id && { asset_id }),
                ...(from_date && to_date && { from_date, to_date }),
                ...(limit && { limit: parseInt(limit) })
            };

            const submissions = await serviceSubmissionService.getSubmissions(filters);

            return res.json({
                success: true,
                count: submissions.length,
                data: submissions
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Save an answer to a question
     * PUT /submissions/:id/answer
     */
    async saveAnswer(req, res, next) {
        const paramsSchema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const answerSchema = Joi.object({
            question_id: Joi.string().pattern(uuidPattern).required(),
            // Answer values - use appropriate field based on question type
            text_value: Joi.string().optional().allow('', null),
            numeric_value: Joi.number().optional().allow(null),
            boolean_value: Joi.boolean().optional().allow(null),
            date_value: Joi.date().optional().allow(null),
            json_value: Joi.object().optional().allow(null),
            // Condition selection
            selected_condition_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            // Media
            photo_urls: Joi.array().items(Joi.string()).optional().allow(null),
            signature_url: Joi.string().optional().allow('', null),
            notes: Joi.string().optional().allow('', null)
        });

        const { error: paramsError } = paramsSchema.validate(req.params);
        if (paramsError) return next(paramsError);

        const { error: bodyError, value } = answerSchema.validate(req.body);
        if (bodyError) return next(bodyError);

        try {
            // Get technician ID from user (assuming user has technician association)
            const technicianId = req.user.technician_id || req.user.id;

            const answer = await serviceSubmissionService.saveAnswer(
                req.params.id,
                value,
                technicianId
            );

            return res.json({
                success: true,
                message: "Answer saved successfully",
                data: answer
            });
        } catch (error) {
            if (error.message === 'Submission not found' || error.message === 'Question not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Submit the service (mark as completed)
     * POST /submissions/:id/submit
     */
    async submit(req, res, next) {
        const submitSchema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = submitSchema.validate(req.params);
        if (error) return next(error);

        try {
            const technicianId = req.user.technician_id || req.user.id;

            const submission = await serviceSubmissionService.submitService(
                req.params.id,
                technicianId
            );

            return res.json({
                success: true,
                message: "Service submitted successfully",
                data: submission
            });
        } catch (error) {
            if (error.message === 'Submission not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Get form structure for submission
     * GET /submissions/:id/form
     */
    async getFormForSubmission(req, res, next) {
        const schema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            // First get the submission to get the form_id
            const submission = await serviceSubmissionService.getSubmissionById(req.params.id);

            const { frequency_id } = req.query;
            const form = await serviceSubmissionService.getFormForSubmission(
                submission.form_id,
                frequency_id || submission.frequency_id
            );

            return res.json({
                success: true,
                data: form
            });
        } catch (error) {
            if (error.message === 'Submission not found' || error.message === 'Form not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Get submission PDF with answers
     * GET /submissions/:id/pdf
     */
    async getSubmissionPDF(req, res, next) {
        const schema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const pdfService = require('../../services/service-form/pdfService');

            // Get the submission view data (includes service, form, and answers)
            const viewData = await serviceSubmissionService.getServiceSubmissionView(req.params.id);

            // Map the view data structure to what the PDF service expects
            // The service view provides submittedBy as { id, name, email }
            // But PDF template expects { user: { name, email } }
            const serviceData = {
                ...viewData.service,
                asset: viewData.service.asset,
                frequency: viewData.service.frequency,
                // Restructure submittedBy to nest name/email in user object
                submittedBy: viewData.service.submittedBy ? {
                    id: viewData.service.submittedBy.id,
                    user: {
                        name: viewData.service.submittedBy.name,
                        email: viewData.service.submittedBy.email
                    }
                } : null,
                // Alias for backward compatibility
                technician: viewData.service.submittedBy ? {
                    id: viewData.service.submittedBy.id,
                    user: {
                        name: viewData.service.submittedBy.name,
                        email: viewData.service.submittedBy.email
                    }
                } : null
            };

            const formData = viewData.form;
            const sections = viewData.form.sections;

            // Generate PDF
            const pdfBuffer = await pdfService.generateSubmissionPDF(serviceData, formData, sections);

            // Ensure we have a proper buffer
            const finalBuffer = Buffer.from(pdfBuffer);

            // Set response headers
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="service-submission-${req.params.id}.pdf"`,
                'Content-Length': finalBuffer.length
            });

            return res.send(finalBuffer);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            if (error.message === 'Submission not found') {
                return next({ status: 404, message: 'Service submission not found' });
            }
            return next(error);
        }
    }
};

module.exports = serviceSubmissionController;
