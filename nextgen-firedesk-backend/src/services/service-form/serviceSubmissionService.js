/**
 * Service Submission Service
 * Business logic for service submissions and answers
 */

const { sequelize } = require('../../../config/config');
const { Op } = require('sequelize');
const {
    ServiceSubmission,
    ServiceAnswer,
    Form,
    FormSection,
    FormQuestion,
    Question,
    QuestionCondition
} = require('../../models/service-form');
const Asset = require('../../models/assets/Asset');
const Plant = require('../../models/plants/Plant');
const Condition = require('../../models/master-data/ConditionMaster');
const Technician = require('../../models/user-management/technician');
const InspectionFrequency = require('../../models/service-form/InspectionFrequency');
const { generateCode, ensureUniqueCode } = require('../../utils/codeGenerator');
const { notify_service_completed, notify_service_approved, notify_service_rejected } = require('../notifications/notificationService');

// Lazy-load complianceScoreService to avoid circular dependency
let complianceScoreService = null;
const getComplianceScoreService = () => {
    if (!complianceScoreService) {
        complianceScoreService = require('../assets/complianceScoreService');
    }
    return complianceScoreService;
};

class ServiceSubmissionService {
    /**
     * Create a new service submission
     */
    async createSubmission(submissionData, userId) {
        const transaction = await sequelize.transaction();

        try {
            // Generate unique submission number
            let submissionNumber = `SVC-${Date.now()}`;

            // Validate asset exists
            const asset = await Asset.findByPk(submissionData.asset_id);
            if (!asset) {
                throw new Error('Asset not found');
            }

            // Validate form exists
            const form = await Form.findByPk(submissionData.form_id);
            if (!form) {
                throw new Error('Form not found');
            }

            // Create the submission
            const submission = await ServiceSubmission.create({
                submission_number: submissionNumber,
                asset_id: submissionData.asset_id,
                plant_id: submissionData.plant_id || asset.plant_id,
                form_id: submissionData.form_id,
                schedule_id: submissionData.schedule_id || null,
                frequency_id: submissionData.frequency_id || null,
                technician_id: submissionData.technician_id,
                manager_id: submissionData.manager_id || null,
                frequency: submissionData.frequency || null,
                inspection_type: submissionData.inspection_type || null,
                scheduled_date: submissionData.scheduled_date || null,
                status: 'draft',
                created_by: userId
            }, { transaction });

            await transaction.commit();

            // Update next_service_date on asset if this submission has a future scheduled_date
            if (submission.asset_id && submissionData.scheduled_date) {
                try {
                    const scheduledDate = new Date(submissionData.scheduled_date);
                    if (scheduledDate >= new Date()) {
                        const nextService = await ServiceSubmission.findOne({
                            where: {
                                asset_id: submission.asset_id,
                                scheduled_date: { [Op.gte]: new Date() },
                                status: { [Op.notIn]: ['approved', 'rejected', 'cancelled'] }
                            },
                            order: [['scheduled_date', 'ASC']],
                            attributes: ['scheduled_date']
                        });
                        if (nextService) {
                            await Asset.update(
                                { next_service_date: nextService.scheduled_date },
                                { where: { id: submission.asset_id } }
                            );
                        }
                    }
                } catch (e) {
                    console.error('[createSubmission] Failed to update next_service_date:', e.message);
                }
            }

            return await this.getSubmissionById(submission.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Get submission by ID with all associations
     */
    async getSubmissionById(submissionId) {
        const Building = require('../../models/plants/Building');

        const submission = await ServiceSubmission.findByPk(submissionId, {
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location', 'building_id'],
                    include: [{
                        model: Building,
                        as: 'building',
                        attributes: ['id', 'building_name']
                    }]
                },
                {
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', 'plant_name']
                },
                {
                    model: Form,
                    as: 'form',
                    include: [{
                        model: FormSection,
                        as: 'sections',
                        include: [{
                            model: FormQuestion,
                            as: 'formQuestions',
                            include: [{
                                model: Question,
                                as: 'question',
                                include: [{
                                    model: Condition,
                                    as: 'conditions',
                                    through: { attributes: ['display_order', 'is_active'] }
                                }]
                            }]
                        }]
                    }]
                },
                {
                    model: Technician,
                    as: 'technician',
                    attributes: ['id'],
                    include: [{
                        model: require('../../models/user-management/user'),
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }]
                },
                {
                    model: Technician,
                    as: 'submitter',
                    attributes: ['id'],
                    include: [{
                        model: require('../../models/user-management/user'),
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }]
                },
                {
                    model: ServiceAnswer,
                    as: 'answers',
                    include: [
                        {
                            model: Question,
                            as: 'question',
                            attributes: ['id', 'question_text', 'question_code', 'answer_type', 'question_type']
                        },
                        {
                            model: Condition,
                            as: 'selectedCondition',
                            attributes: ['id', 'condition_code', 'condition_name', 'severity_level', 'priority_score']
                        }
                    ]
                },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency',
                    attributes: ['id', 'frequency_code', 'frequency_name']
                },
                {
                    model: require('../../models/service-form').ServiceTechnician,
                    as: 'serviceTechnicians',
                    include: [{
                        model: Technician,
                        as: 'technician',
                        attributes: ['id'],
                        include: [{
                            model: require('../../models/user-management/user'),
                            as: 'user',
                            attributes: ['id', 'name', 'email']
                        }]
                    }]
                }
            ],
            order: [
                [{ model: Form, as: 'form' }, { model: FormSection, as: 'sections' }, 'section_order', 'ASC'],
                [{ model: Form, as: 'form' }, { model: FormSection, as: 'sections' }, { model: FormQuestion, as: 'formQuestions' }, 'question_order', 'ASC']
            ]
        });

        if (!submission) {
            throw new Error('Submission not found');
        }

        return submission;
    }

    /**
     * Save or update an answer
     */
    async saveAnswer(submissionId, answerData, technicianId) {
        const transaction = await sequelize.transaction();

        try {
            // Verify submission exists
            const submission = await ServiceSubmission.findByPk(submissionId);
            if (!submission) {
                throw new Error('Submission not found');
            }

            // Verify question exists
            const question = await Question.findByPk(answerData.question_id);
            if (!question) {
                throw new Error('Question not found');
            }

            // Get condition details if condition is selected
            let conditionDetails = {};
            if (answerData.selected_condition_id) {
                const condition = await Condition.findByPk(answerData.selected_condition_id);
                if (condition) {
                    conditionDetails = {
                        condition_code: condition.code,
                        condition_name: condition.name,
                        severity_level: condition.severity_level,
                        priority_score: condition.priority_score,
                        health_impact: condition.health_impact
                    };
                }
            }

            // Check if answer already exists for this question
            const existingAnswer = await ServiceAnswer.findOne({
                where: {
                    submission_id: submissionId,
                    question_id: answerData.question_id
                }
            });

            let answer;
            if (existingAnswer) {
                // Update existing answer
                await existingAnswer.update({
                    text_value: answerData.text_value ?? existingAnswer.text_value,
                    numeric_value: answerData.numeric_value ?? existingAnswer.numeric_value,
                    boolean_value: answerData.boolean_value ?? existingAnswer.boolean_value,
                    date_value: answerData.date_value ?? existingAnswer.date_value,
                    json_value: answerData.json_value ?? existingAnswer.json_value,
                    selected_condition_id: answerData.selected_condition_id ?? existingAnswer.selected_condition_id,
                    ...conditionDetails,
                    photo_urls: answerData.photo_urls ?? existingAnswer.photo_urls,
                    signature_url: answerData.signature_url ?? existingAnswer.signature_url,
                    notes: answerData.notes ?? existingAnswer.notes,
                    answered_at: new Date()
                }, { transaction });
                answer = existingAnswer;
            } else {
                // Create new answer
                answer = await ServiceAnswer.create({
                    submission_id: submissionId,
                    question_id: answerData.question_id,
                    text_value: answerData.text_value || null,
                    numeric_value: answerData.numeric_value || null,
                    boolean_value: answerData.boolean_value || null,
                    date_value: answerData.date_value || null,
                    json_value: answerData.json_value || null,
                    selected_condition_id: answerData.selected_condition_id || null,
                    ...conditionDetails,
                    photo_urls: answerData.photo_urls || null,
                    signature_url: answerData.signature_url || null,
                    notes: answerData.notes || null,
                    answered_by: technicianId,
                    answered_at: new Date()
                }, { transaction });
            }

            // Update submission status if needed
            if (submission.status === 'draft') {
                await submission.update({
                    status: 'in_progress',
                    started_at: submission.started_at || new Date()
                }, { transaction });
            }

            await transaction.commit();

            return await ServiceAnswer.findByPk(answer.id, {
                include: [
                    { model: Question, as: 'question' },
                    { model: Condition, as: 'selectedCondition' }
                ]
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Submit the service (mark as completed)
     * Enforces waiting period: 50% of the frequency duration after the last completion
     * for the same asset + inspection_type + frequency.
     */
    async validateServiceSubmissionTiming(submission) {
        if (!submission.asset_id || !submission.inspection_type || !submission.frequency_id) {
            return;
        }

        const FREQUENCY_DAYS = {
            'daily': 1,
            'weekly': 7,
            'fortnightly': 14,
            'monthly': 30,
            'bi-monthly': 60,
            'quarterly': 90,
            'half-yearly': 180,
            'semi-annually': 180,
            'annually': 365,
            'yearly': 365,
        };

        const frequencyName = submission.inspectionFrequency?.frequency_name?.toLowerCase() || '';
        const freqDays = FREQUENCY_DAYS[frequencyName] || 30; // default to monthly

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ─── 1. End of Submission Window Check ───
        if (submission.scheduled_date) {
            const scheduledDate = new Date(submission.scheduled_date);
            scheduledDate.setHours(0, 0, 0, 0);

            const windowEndDate = new Date(scheduledDate);
            windowEndDate.setDate(windowEndDate.getDate() + freqDays);

            if (today > windowEndDate) {
                const formattedDate = windowEndDate.toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                });
                throw new Error(
                    `Submission window has closed. The allowed period for this service ended on ${formattedDate}.`
                );
            }
        }

        // ─── 2. Waiting Period Check ───
        const waitingDays = Math.ceil(freqDays * 0.5);

        // Find the most recent completed/submitted/approved submission
        const previousCompletion = await ServiceSubmission.findOne({
            where: {
                id: { [Op.ne]: submission.id },
                asset_id: submission.asset_id,
                inspection_type: submission.inspection_type,
                frequency_id: submission.frequency_id,
                status: { [Op.in]: ['submitted', 'approved', 'completed'] },
                completed_at: { [Op.ne]: null },
            },
            order: [['completed_at', 'DESC']],
            attributes: ['id', 'completed_at'],
        });

        if (previousCompletion && previousCompletion.completed_at) {
            const completedDate = new Date(previousCompletion.completed_at);
            const waitingEndDate = new Date(completedDate);
            waitingEndDate.setDate(waitingEndDate.getDate() + waitingDays);

            waitingEndDate.setHours(0, 0, 0, 0);

            if (today < waitingEndDate) {
                const formattedDate = waitingEndDate.toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                });
                throw new Error(
                    `Cannot submit service during the waiting period. ` +
                    `The previous service was completed on ${completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. ` +
                    `Next allowed submission date: ${formattedDate}`
                );
            }
        }
    }

    async submitService(submissionId, technicianId) {
        const transaction = await sequelize.transaction();

        try {
            const submission = await ServiceSubmission.findByPk(submissionId, {
                include: [
                    { model: ServiceAnswer, as: 'answers' },
                    {
                        model: Form,
                        as: 'form',
                        include: [{
                            model: FormQuestion,
                            as: 'formQuestions'
                        }]
                    },
                    {
                        model: InspectionFrequency,
                        as: 'inspectionFrequency',
                        attributes: ['id', 'frequency_name']
                    }
                ]
            });

            if (!submission) {
                throw new Error('Submission not found');
            }

            // ─── Validate Timing (Waiting Period & Window Expiry) ───
            await this.validateServiceSubmissionTiming(submission);

            // Calculate metrics from answers
            const metrics = this._calculateMetrics(submission.answers);

            // Update submission
            await submission.update({
                status: 'submitted',
                submitted_by: technicianId,
                submitted_at: new Date(),
                completed_at: new Date(),
                critical_count: metrics.critical_count,
                high_count: metrics.high_count,
                medium_count: metrics.medium_count,
                low_count: metrics.low_count,
                total_priority_score: metrics.total_priority_score,
                calculated_health_status: metrics.calculated_health_status,
                calculated_priority_score: metrics.calculated_priority_score
            }, { transaction });

            await transaction.commit();

            // Send notification for service completion
            const updatedSubmission = await this.getSubmissionById(submissionId);
            try {
                await notify_service_completed(updatedSubmission, technicianId);
            } catch (notifError) {
                console.error('Failed to send service completion notification:', notifError);
            }

            return updatedSubmission;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Get submissions with filters
     */
    async getSubmissions(filters = {}) {
        const where = {};

        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.plant_id) {
            where.plant_id = filters.plant_id;
        }
        if (filters.technician_id) {
            where.technician_id = filters.technician_id;
        }
        if (filters.asset_id) {
            where.asset_id = filters.asset_id;
        }
        if (filters.from_date && filters.to_date) {
            where.scheduled_date = {
                [Op.between]: [filters.from_date, filters.to_date]
            };
        }

        const submissions = await ServiceSubmission.findAll({
            where,
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code']
                },
                {
                    model: Form,
                    as: 'form',
                    attributes: ['id', 'service_name', 'form_code']
                },
                {
                    model: Technician,
                    as: 'technician',
                    include: [{
                        model: require('../../models/user-management/user'),
                        as: 'user',
                        attributes: ['name', 'email']
                    }]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: filters.limit || 50
        });

        return submissions;
    }

    /**
     * Get form structure for submission
     */
    async getFormForSubmission(formId, frequencyId = null) {
        const formService = require('./formService');
        return await formService.getFormForSubmission(formId, frequencyId);
    }

    // ============ Private Helper Methods ============

    /**
     * Calculate metrics from answers (boolean compliance model)
     */
    _calculateMetrics(answers) {
        const metrics = {
            critical_count: 0,
            high_count: 0,
            medium_count: 0,
            low_count: 0,
            compliant_count: 0,
            non_compliant_count: 0,
            na_count: 0,
            total_priority_score: 0,
            calculated_health_status: 'HEALTHY',
            calculated_priority_score: 0
        };

        if (!answers || answers.length === 0) {
            return metrics;
        }

        let answeredCount = 0; // Exclude NA answers from scoring

        for (const answer of answers) {
            // Boolean compliance model - track compliance status
            if (answer.compliance_status) {
                switch (answer.compliance_status.toUpperCase()) {
                    case 'COMPLIANT':
                        metrics.compliant_count++;
                        answeredCount++;
                        // Compliant answers contribute 0 priority (INFO condition)
                        break;
                    case 'NON_COMPLIANT':
                        metrics.non_compliant_count++;
                        answeredCount++;
                        // Non-compliant answers use linked condition's priority
                        if (answer.priority_score) {
                            metrics.total_priority_score += answer.priority_score;
                        }
                        break;
                    case 'NA':
                        metrics.na_count++;
                        // NA answers don't affect scoring
                        break;
                }
            }

            // Track severity counts (for non-compliant answers)
            if (answer.severity_level && answer.compliance_status !== 'COMPLIANT') {
                switch (answer.severity_level.toUpperCase()) {
                    case 'CRITICAL':
                        metrics.critical_count++;
                        break;
                    case 'HIGH':
                        metrics.high_count++;
                        break;
                    case 'MEDIUM':
                        metrics.medium_count++;
                        break;
                    case 'LOW':
                        metrics.low_count++;
                        break;
                }
            }
        }

        // Calculate compliance rate
        const compliance_rate = answeredCount > 0
            ? metrics.compliant_count / answeredCount
            : 1.0;

        // Calculate overall health status based on compliance
        if (metrics.critical_count > 0) {
            metrics.calculated_health_status = 'NOT_WORKING';
        } else if (compliance_rate < 0.70 || metrics.high_count > 0) {
            // Less than 70% compliant or any HIGH severity issues
            metrics.calculated_health_status = 'NEEDS_ATTENTION';
        } else if (metrics.medium_count > 2) {
            // Multiple medium issues
            metrics.calculated_health_status = 'NEEDS_ATTENTION';
        } else {
            metrics.calculated_health_status = 'HEALTHY';
        }

        // Calculate average priority score (only from answered questions)
        metrics.calculated_priority_score = answeredCount > 0
            ? Math.round(metrics.total_priority_score / answeredCount)
            : 0;

        return metrics;
    }

    /**
     * Get service submission view with structured response for frontend
     * Matches the expected format with hasAnswers, service, form (with answers), and statistics
     */
    async getServiceSubmissionView(submissionId) {
        const submission = await this.getSubmissionById(submissionId);

        if (!submission) {
            throw new Error('Submission not found');
        }

        // Check if service has been submitted (has answers)
        const hasAnswers = ['submitted', 'approved', 'rejected', 'completed', 'in_progress'].includes(submission.status?.toLowerCase());

        // Build answers map by question_id
        const answersMap = {};
        if (submission.answers) {
            submission.answers.forEach(answer => {
                // Format answer value based on compliance status
                let displayValue = '';
                if (answer.compliance_status) {
                    // Boolean compliance model
                    switch (answer.compliance_status) {
                        case 'COMPLIANT':
                            displayValue = 'YES - Compliant';
                            break;
                        case 'NON_COMPLIANT':
                            displayValue = 'NO - Non-Compliant';
                            break;
                        case 'NA':
                            displayValue = 'N/A - Not Applicable';
                            break;
                        default:
                            displayValue = answer.compliance_status;
                    }
                } else {
                    // Legacy model - use raw value
                    displayValue = answer.text_value || answer.numeric_value || answer.boolean_value || answer.json_value;
                }

                answersMap[answer.question_id] = {
                    id: answer.id,
                    answerValue: displayValue,
                    complianceStatus: answer.compliance_status,
                    notes: answer.notes,
                    photoUrls: answer.photo_urls,
                    photoBase64: answer.photo_urls && answer.photo_urls.length > 0 ? answer.photo_urls[0] : null,
                    selectedCondition: answer.selectedCondition ? {
                        id: answer.selectedCondition.id,
                        conditionCode: answer.selectedCondition.condition_code,
                        conditionName: answer.selectedCondition.condition_name,
                        severityLevel: answer.selectedCondition.severity_level,
                        priorityScore: answer.selectedCondition.priority_score
                    } : null,
                    answeredAt: answer.created_at
                };

            });
        }

        // Build structured form with answers embedded
        const formWithAnswers = submission.form ? {
            id: submission.form.id,
            serviceName: submission.form.service_name,
            serviceType: submission.form.service_type,
            formCode: submission.form.form_code,
            description: submission.form.description,
            sections: (submission.form.sections || []).map(section => ({
                id: section.id,
                sectionName: section.section_name,
                sectionOrder: section.section_order,
                description: section.description,
                isMandatory: section.is_mandatory,
                questions: (section.formQuestions || []).map(fq => {
                    const question = fq.question;
                    return {
                        id: fq.id,
                        questionId: question?.id,
                        questionText: question?.question_text,
                        questionCode: question?.question_code,
                        questionOrder: fq.question_order,
                        answerType: question?.answer_type,
                        isMandatory: fq.is_mandatory,
                        requiresPhoto: question?.requires_photo,
                        requiresNotes: question?.requires_notes,
                        helpText: question?.help_text,
                        conditions: (question?.conditions || []).map(c => ({
                            id: c.id,
                            conditionName: c.condition_name,
                            conditionCode: c.condition_code,
                            severityLevel: c.severity_level,
                            priorityScore: c.priority_score
                        })),
                        answer: answersMap[question?.id] || null
                    };
                })
            }))
        } : (submission.answers && submission.answers.length > 0 ? {
            id: submission.form_id,
            serviceName: 'Deleted Service Form',
            formCode: 'DELETED',
            description: 'This form template has been deleted. Showing historical answers.',
            sections: []
        } : null);

        // Check for orphaned answers (questions that were answered but later removed from the form)
        // OR if the entire form was deleted
        if (formWithAnswers && submission.answers && submission.answers.length > 0) {
            const formQuestionIds = new Set();

            // Collect all question IDs currently on the form
            if (formWithAnswers.sections) {
                formWithAnswers.sections.forEach(section => {
                    if (section.questions) {
                        section.questions.forEach(q => {
                            if (q.questionId) formQuestionIds.add(q.questionId);
                        });
                    }
                });
            }

            // Find answers whose questions are missing from the form
            const orphanedAnswers = submission.answers.filter(a => a.question_id && !formQuestionIds.has(a.question_id));

            if (orphanedAnswers.length > 0) {
                const orphanedQuestions = orphanedAnswers.map(answer => {
                    const question = answer.question;
                    return {
                        id: `orphaned-${answer.question_id}`, // temporary ID
                        questionId: answer.question_id,
                        questionText: question?.question_text || 'Unknown Question (Deleted)',
                        questionCode: question?.question_code,
                        questionOrder: 9999,
                        answerType: question?.answer_type || question?.question_type,
                        isMandatory: false,
                        requiresPhoto: false,
                        requiresNotes: false,
                        helpText: 'This question has been removed from the current form version.',
                        conditions: [], // No conditions available for deleted questions
                        answer: answersMap[answer.question_id] || null
                    };
                });

                // Add a special section for these questions
                formWithAnswers.sections.push({
                    id: 'section-archived',
                    sectionName: 'Archived / Removed Questions',
                    sectionOrder: 9999,
                    description: 'Questions that were answered were subsequently removed from the form.',
                    isMandatory: false,
                    questions: orphanedQuestions
                });
            }
        }

        // Calculate statistics
        const answers = submission.answers || [];
        const statistics = {
            totalQuestions: formWithAnswers ?
                formWithAnswers.sections.reduce((sum, s) => sum + s.questions.length, 0) : 0,
            answeredQuestions: answers.length,
            questionsWithPhotos: answers.filter(a => a.photo_urls && a.photo_urls.length > 0).length,
            questionsWithNotes: answers.filter(a => a.notes).length
        };

        return {
            hasAnswers,
            service: {
                id: submission.id,
                submissionNumber: submission.submission_number,
                status: submission.status,
                scheduledDate: submission.scheduled_date,
                inspectionType: submission.inspection_type,
                startedAt: submission.started_at,
                submittedAt: submission.submitted_at,
                completedAt: submission.completed_at,
                approvalStatus: submission.approval_status,
                approvedAt: submission.approved_at,
                approvalRemarks: submission.approval_remarks,
                asset: submission.asset ? {
                    id: submission.asset.id,
                    assetId: submission.asset.asset_code,
                    assetCode: submission.asset.asset_code,
                    location: submission.asset.location,
                    building: submission.asset.building?.building_name || null,
                    buildingId: submission.asset.building_id
                } : null,
                plant: submission.plant ? {
                    id: submission.plant.id,
                    plantName: submission.plant.plant_name
                } : null,
                frequency: submission.inspectionFrequency ? {
                    id: submission.inspectionFrequency.id,
                    frequencyName: submission.inspectionFrequency.frequency_name,
                    frequencyCode: submission.inspectionFrequency.frequency_code
                } : null,
                submittedBy: (submission.submitter || submission.technician) ? {
                    id: (submission.submitter || submission.technician).id,
                    name: (submission.submitter || submission.technician).user?.name,
                    email: (submission.submitter || submission.technician).user?.email
                } : null,
                technician: submission.technician ? {
                    id: submission.technician.id,
                    name: submission.technician.user?.name,
                    email: submission.technician.user?.email
                } : null,
                // Get assigned technicians from the serviceTechnicians if available
                assignedTechnicians: submission.serviceTechnicians ?
                    submission.serviceTechnicians.map(st => ({
                        id: st.technician?.id || st.technician_id,
                        name: st.technician?.user?.name || 'Unknown',
                        email: st.technician?.user?.email
                    })) : (submission.technician ? [{
                        id: submission.technician.id,
                        name: submission.technician.user?.name,
                        email: submission.technician.user?.email
                    }] : [])
            },
            form: formWithAnswers,
            statistics
        };
    }

    /**
     * Approve a service submission
     * @param {string} submissionId - Submission ID
     * @param {string} managerId - Manager who is approving
     * @param {string} remarks - Optional approval remarks
     * @returns {Promise<Object>} Updated submission
     */
    async approveSubmission(submissionId, managerId, remarks = null) {
        const transaction = await sequelize.transaction();

        try {
            const submission = await this.getSubmissionById(submissionId);

            if (!submission) {
                throw new Error('Submission not found');
            }

            if (submission.status !== 'submitted') {
                throw new Error('Only submitted services can be approved');
            }

            await submission.update({
                approval_status: 'approved',
                approved_by: managerId,
                approved_at: new Date(),
                approval_remarks: remarks,
                status: 'approved' // Update main status too
            }, { transaction });

            await transaction.commit();

            // Send notification
            const updatedSubmission = await this.getSubmissionById(submissionId);
            try {
                await notify_service_approved(updatedSubmission, managerId);
            } catch (notifError) {
                console.error('Failed to send approval notification:', notifError);
            }

            // Recalculate compliance score for the asset (fire-and-forget, non-blocking)
            if (updatedSubmission.asset_id) {
                getComplianceScoreService().updateComplianceScore(updatedSubmission.asset_id)
                    .then(score => {
                        console.log(`📊 Updated compliance score for asset ${updatedSubmission.asset_id} after service approval: ${score}%`);
                    })
                    .catch(scoreError => {
                        console.error('⚠️ Error recalculating compliance score after service approval:', scoreError.message);
                    });
            }

            return updatedSubmission;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Reject a service submission
     * @param {string} submissionId - Submission ID
     * @param {string} managerId - Manager who is rejecting
     * @param {string} remarks - Rejection remarks (required)
     * @returns {Promise<Object>} Updated submission
     */
    async rejectSubmission(submissionId, managerId, remarks) {
        const transaction = await sequelize.transaction();

        try {
            if (!remarks || remarks.trim() === '') {
                throw new Error('Rejection remarks are required');
            }

            const submission = await this.getSubmissionById(submissionId);

            if (!submission) {
                throw new Error('Submission not found');
            }

            if (submission.status !== 'submitted') {
                throw new Error('Only submitted services can be rejected');
            }

            await submission.update({
                approval_status: 'rejected',
                approved_by: managerId,
                approved_at: new Date(),
                approval_remarks: remarks,
                status: 'rejected' // Update main status too
            }, { transaction });

            await transaction.commit();

            // Send notification
            const updatedSubmission = await this.getSubmissionById(submissionId);
            try {
                await notify_service_rejected(updatedSubmission, managerId, remarks);
            } catch (notifError) {
                console.error('Failed to send rejection notification:', notifError);
            }

            return updatedSubmission;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new ServiceSubmissionService();
