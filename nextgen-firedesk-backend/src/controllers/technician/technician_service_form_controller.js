/**
 * Technician Service Form Controller
 * Handles dynamic service form operations for technicians
 */
const Joi = require('joi');
const { Op } = require('sequelize');
const { sequelize } = require('../../../config/config');
const serviceSubmissionService = require('../../services/service-form/serviceSubmissionService');
const {
    ServiceSubmission,
    Form,
    FormQuestion,
    FormSection,
    ServiceAnswer,
    InspectionFrequency,
    Asset,
    Plant,
    Building,
    Technician,
    User,
    Condition,
    ServiceTechnician,
    Question,
    QuestionCondition
} = require('../../models');

/**
 * Get service form with filtered questions based on inspection type and frequency
 * GET /api/technician/services/:serviceId/form
 */
const get_service_form = async (req, res, next) => {
    try {
        const { serviceId } = req.params;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Check if service is assigned to this technician OR if they submitted it
        // First check strict assignment
        let assignment = await ServiceTechnician.findOne({
            where: {
                service_id: serviceId,
                technician_id: technician.id
            }
        });

        // If not assigned, check if they are the submitter (for completed/history view)
        if (!assignment) {
            const submission = await ServiceSubmission.findOne({
                where: { id: serviceId, submitted_by: technician.id },
                attributes: ['id']
            });
            if (submission) {
                assignment = true; // Authorized
            }
        }

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        // Get service with form
        const service = await ServiceSubmission.findOne({
            where: { id: serviceId },
            include: [
                {
                    model: Form,
                    as: 'form'
                },
                {
                    model: Asset,
                    as: 'asset',
                    include: [
                        { model: Plant, as: 'plant' },
                        { model: Building, as: 'building' }
                    ]
                },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency'
                }
            ]
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        if (!service.form) {
            return res.status(404).json({
                success: false,
                message: 'No form associated with this service'
            });
        }

        // Get filtered questions based on inspection type and frequency
        const questionWhere = {
            form_id: service.form.id
        };

        // Filter by inspection type if the form supports it
        if (service.inspection_type) {
            questionWhere[Op.or] = [
                { inspection_type: { [Op.iLike]: `%${service.inspection_type}%` } },
                { inspection_type: null },
                { inspection_type: '' }
            ];
        }

        // Filter by frequency if applicable
        if (service.frequency_id) {
            questionWhere[Op.or] = [
                ...(questionWhere[Op.or] || []),
                { frequency_id: service.frequency_id },
                { frequency_id: null }
            ];
        }

        const questions = await FormQuestion.findAll({
            where: { form_id: service.form.id },
            include: [
                {
                    model: Question,
                    as: 'question',
                    include: [
                        {
                            model: QuestionCondition,
                            as: 'questionConditions',
                            required: false,
                            include: [
                                {
                                    model: Condition,
                                    as: 'condition'
                                }
                            ]
                        }
                    ]
                },
                {
                    model: FormSection,
                    as: 'section',
                    required: false
                }
            ],
            order: [['question_order', 'ASC'], ['created_at', 'ASC']]
        });

        // Get existing answers if any
        const existingAnswers = await ServiceAnswer.findAll({
            where: { submission_id: serviceId }
        });

        const answersMap = existingAnswers.reduce((acc, answer) => {
            acc[answer.question_id] = answer;
            return acc;
        }, {});

        // Group questions by section
        const sectionsMap = {};
        questions.forEach(fq => {
            const q = fq.question;
            if (!q) return;

            const sectionId = fq.section_id || 'default';
            if (!sectionsMap[sectionId]) {
                sectionsMap[sectionId] = {
                    id: sectionId,
                    sectionName: fq.section?.section_name || 'General',
                    sectionOrder: fq.section?.section_order || 0,
                    description: fq.section?.description || null,
                    isMandatory: fq.section?.is_mandatory || false,
                    questions: []
                };
            }

            // Extract conditions from questionConditions
            const conditions = q.questionConditions?.map(qc => qc.condition).filter(Boolean) || [];

            sectionsMap[sectionId].questions.push({
                id: q.id,  // Use Question ID, not FormQuestion ID
                formQuestionId: fq.id,  // Keep FormQuestion ID for reference
                questionText: q.question_text,
                questionCode: q.question_code || '',
                questionOrder: fq.question_order,
                answerType: q.question_type,
                isMandatory: fq.is_mandatory_override !== null ? fq.is_mandatory_override : q.is_mandatory,
                requiresPhoto: q.requires_photo,
                requiresNotes: q.requires_notes,
                helpText: q.help_text || null,
                // Return first condition to auto-apply on NON_COMPLIANT
                defaultCondition: conditions.length > 0 ? {
                    id: conditions[0].id,
                    conditionName: conditions[0].condition_name,
                    severityLevel: conditions[0].severity_level,
                    priorityScore: conditions[0].priority_score,
                    healthImpact: conditions[0].health_impact
                } : null,
                answer: answersMap[q.id] ? {
                    id: answersMap[q.id].id,
                    complianceStatus: answersMap[q.id].compliance_status,
                    answerValue: answersMap[q.id].boolean_value !== null ? answersMap[q.id].boolean_value.toString() :
                        (answersMap[q.id].text_value || answersMap[q.id].numeric_value ||
                            answersMap[q.id].date_value || JSON.stringify(answersMap[q.id].json_value) || ''),
                    selectedConditionId: answersMap[q.id].selected_condition_id,
                    nonComplianceConditionId: answersMap[q.id].non_compliance_condition_id,
                    notes: answersMap[q.id].notes || '',
                    photoBase64: answersMap[q.id].photo_urls && answersMap[q.id].photo_urls.length > 0 ? answersMap[q.id].photo_urls[0] : null,
                    answeredAt: answersMap[q.id].answered_at
                } : null
            });
        });

        // Convert sections map to array and sort
        const sections = Object.values(sectionsMap).sort((a, b) => a.sectionOrder - b.sectionOrder);

        return res.json({
            success: true,
            data: {
                service: {
                    id: service.id,
                    submissionNumber: service.submission_number,
                    status: service.status,
                    inspectionType: service.inspection_type,
                    scheduledDate: service.scheduled_date,
                    startedAt: service.started_at,
                    submittedAt: service.submitted_at,
                    completedAt: service.completed_at,
                    approvalStatus: service.approval_status,
                    approvalRemarks: service.approval_remarks,
                    approvedAt: service.approved_at,
                    asset: service.asset ? {
                        id: service.asset.id,
                        asset_code: service.asset.asset_code,
                        location: service.asset.location,
                        building: service.asset.building ? service.asset.building.building_name : null,
                        lat: service.asset.lat,
                        long: service.asset.long,
                        latLongRemark: service.asset.lat_long_remark,
                        plant: service.asset.plant ? {
                            id: service.asset.plant.id,
                            plantName: service.asset.plant.plant_name
                        } : null
                    } : null,
                    form: {
                        id: service.form.id,
                        serviceName: service.form.service_name,
                        formCode: service.form.form_code,
                        description: service.form.description
                    },
                    frequency: service.inspectionFrequency ? {
                        id: service.inspectionFrequency.id,
                        frequencyName: service.inspectionFrequency.frequency_name,
                        frequencyCode: service.inspectionFrequency.frequency_code
                    } : null
                },
                form: {
                    id: service.form.id,
                    serviceName: service.form.service_name,
                    formCode: service.form.form_code,
                    description: service.form.description,
                    sections: sections
                }
            }
        });
    } catch (error) {
        console.error('[Service Form] Error fetching form:', error);
        return next(error);
    }
};

/**
 * Submit service form answers
 * POST /api/technician/services/:serviceId/submit
 * Body: { answers: [{ formQuestionId, answerValue, notes?, photoBase64? }] }
 */
const submit_service_form = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { serviceId } = req.params;
        const schema = Joi.object({
            answers: Joi.array().items(Joi.object({
                questionId: Joi.string().uuid().required(),
                complianceStatus: Joi.string().valid('COMPLIANT', 'NON_COMPLIANT', 'NA').required(),
                nonComplianceConditionId: Joi.string().uuid().allow(null),
                notes: Joi.string().allow('', null),
                photoBase64: Joi.string().allow('', null)
            })).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            await transaction.rollback();
            return next({ status: 400, message: error.details[0].message });
        }

        const { answers } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Check if service is assigned to this technician
        const assignment = await ServiceTechnician.findOne({
            where: {
                service_id: serviceId,
                technician_id: technician.id
            }
        });

        if (!assignment) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        const service = await ServiceSubmission.findOne({
            where: { id: serviceId },
            include: [
                { model: Form, as: 'form' },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency',
                    attributes: ['id', 'frequency_name']
                }
            ]
        });

        if (!service) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        // Validate timing before submission
        try {
            await serviceSubmissionService.validateServiceSubmissionTiming(service);
        } catch (error) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Validate service status
        if (!['PENDING', 'IN_PROGRESS', 'REJECTED'].includes(service.status.toUpperCase())) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Service has already been submitted or completed'
            });
        }

        // Get required questions
        const requiredQuestions = await FormQuestion.findAll({
            where: {
                form_id: service.form.id
            },
            include: [
                {
                    model: Question,
                    as: 'question',
                    where: {
                        is_mandatory: true
                    }
                }
            ]
        });

        const answeredQuestionIds = answers.map(a => a.questionId);
        const missingRequired = requiredQuestions.filter(
            fq => !answeredQuestionIds.includes(fq.question.id)
        );

        if (missingRequired.length > 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Missing required answers for: ${missingRequired.map(q => q.question?.question_text).join(', ')}`
            });
        }

        // Delete existing answers
        await ServiceAnswer.destroy({
            where: { submission_id: serviceId },
            transaction
        });

        // Get INFO condition ID for compliant answers
        const [infoCondition] = await sequelize.query(
            `SELECT id, condition_code, condition_name, severity_level, priority_score, health_impact 
             FROM conditions WHERE condition_code = 'COMPLIANT_OK' LIMIT 1`,
            { transaction, type: sequelize.QueryTypes.SELECT }
        );

        if (!infoCondition) {
            await transaction.rollback();
            return res.status(500).json({
                success: false,
                message: 'System error: INFO condition not found. Please run migration.'
            });
        }

        // Create new answers
        for (const answer of answers) {
            let photoUrls = null;

            // Handle photo upload if provided
            if (answer.photoBase64) {
                const photoUrl = answer.photoBase64.startsWith('data:')
                    ? answer.photoBase64
                    : `data:image/jpeg;base64,${answer.photoBase64}`;
                photoUrls = [photoUrl];
            }

            // Determine condition based on compliance status
            let selectedConditionId = null;
            let conditionCode = null;
            let conditionName = null;
            let severityLevel = null;
            let priorityScore = 0;
            let healthImpact = null;
            let nonComplianceConditionId = null;

            if (answer.complianceStatus === 'COMPLIANT') {
                // Compliant answers use INFO condition (priority 0)
                selectedConditionId = infoCondition.id;
                conditionCode = infoCondition.condition_code;
                conditionName = infoCondition.condition_name;
                severityLevel = infoCondition.severity_level;
                priorityScore = 0;
                healthImpact = infoCondition.health_impact;
            } else if (answer.complianceStatus === 'NON_COMPLIANT') {
                // Non-compliant answers use provided condition ID or auto-fetch from question's default condition
                let conditionIdToUse = answer.nonComplianceConditionId;

                // If no condition ID provided, fetch the question's default condition
                if (!conditionIdToUse) {
                    const [defaultCondition] = await sequelize.query(
                        `SELECT c.id, c.condition_code, c.condition_name, c.severity_level, c.priority_score, c.health_impact 
                         FROM question_conditions qc
                         JOIN conditions c ON c.id = qc.condition_id
                         WHERE qc.question_id = $1 
                         ORDER BY c.priority_score DESC
                         LIMIT 1`,
                        { bind: [answer.questionId], transaction, type: sequelize.QueryTypes.SELECT }
                    );

                    if (defaultCondition) {
                        conditionIdToUse = defaultCondition.id;
                        console.log(`  📋 Auto-assigned default condition for question ${answer.questionId}: ${defaultCondition.condition_name} (${defaultCondition.severity_level})`);
                    }
                }

                if (conditionIdToUse) {
                    const [linkedCondition] = await sequelize.query(
                        `SELECT id, condition_code, condition_name, severity_level, priority_score, health_impact 
                         FROM conditions WHERE id = $1 LIMIT 1`,
                        { bind: [conditionIdToUse], transaction, type: sequelize.QueryTypes.SELECT }
                    );

                    if (linkedCondition) {
                        selectedConditionId = linkedCondition.id;
                        conditionCode = linkedCondition.condition_code;
                        conditionName = linkedCondition.condition_name;
                        severityLevel = linkedCondition.severity_level;
                        priorityScore = linkedCondition.priority_score;
                        healthImpact = linkedCondition.health_impact;
                        nonComplianceConditionId = linkedCondition.id;
                    }
                }
            }
            // NA answers have no condition

            await ServiceAnswer.create({
                submission_id: serviceId,
                question_id: answer.questionId,
                boolean_value: answer.complianceStatus === 'COMPLIANT' ? true :
                    answer.complianceStatus === 'NON_COMPLIANT' ? false : null,
                compliance_status: answer.complianceStatus,
                selected_condition_id: selectedConditionId,
                non_compliance_condition_id: nonComplianceConditionId,
                condition_code: conditionCode,
                condition_name: conditionName,
                severity_level: severityLevel,
                priority_score: priorityScore,
                health_impact: healthImpact,
                notes: answer.notes || null,
                photo_urls: photoUrls,
                answered_by: technician.id,
                answered_at: new Date()
            }, { transaction });
        }

        // Update service status and capture submitting technician
        await service.update({
            status: 'SUBMITTED',
            submitted_at: new Date(),
            submitted_by: technician.id  // Capture the technician who actually submitted
        }, { transaction });

        await transaction.commit();

        // Calculate health score if applicable
        try {
            const healthService = require('../../services/service-form/health_calculation_service');
            if (healthService && typeof healthService.calculate_health_score === 'function') {
                await healthService.calculate_health_score(serviceId);
            }
        } catch (healthError) {
            console.warn('[Service Form] Health calculation skipped:', healthError.message);
        }

        return res.json({
            success: true,
            message: 'Service form submitted successfully',
            service: {
                id: service.id,
                status: 'SUBMITTED',
                submittedAt: new Date()
            }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('[Service Form] Error submitting form:', error);
        return next(error);
    }
};

/**
 * Start a service (mark as IN_PROGRESS)
 * PATCH /api/technician/services/:serviceId/start
 */
const start_service = async (req, res, next) => {
    try {
        const { serviceId } = req.params;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Check if service is assigned to this technician
        const assignment = await ServiceTechnician.findOne({
            where: {
                service_id: serviceId,
                technician_id: technician.id
            }
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        const service = await ServiceSubmission.findOne({
            where: { id: serviceId },
            include: [
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency',
                    attributes: ['id', 'frequency_name']
                }
            ]
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        // Validate timing before starting
        try {
            await serviceSubmissionService.validateServiceSubmissionTiming(service);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (!['PENDING', 'REJECTED'].includes(service.status.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: `Cannot start service with status: ${service.status}`
            });
        }

        const updateData = {
            status: 'IN_PROGRESS',
            started_at: new Date()
        };

        // Clear old approval fields when restarting a rejected service
        if (service.status.toUpperCase() === 'REJECTED') {
            updateData.approval_status = null;
            updateData.approval_remarks = null;
            updateData.approved_at = null;
        }

        await service.update(updateData);

        return res.json({
            success: true,
            message: 'Service started successfully',
            service: {
                id: service.id,
                status: 'IN_PROGRESS',
                startedAt: service.started_at
            }
        });
    } catch (error) {
        console.error('[Service Form] Error starting service:', error);
        return next(error);
    }
};

module.exports = {
    get_service_form,
    submit_service_form,
    start_service
};
