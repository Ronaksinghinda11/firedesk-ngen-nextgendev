/**
 * Form DTO
 * Data transformation for form API responses
 */

class FormDTO {
    constructor(form) {
        this.id = form.id;
        this.formCode = form.form_code;
        this.serviceName = form.service_name;
        this.serviceType = form.service_type;
        this.status = form.status;
        this.createdAt = form.created_at;
        this.updatedAt = form.updated_at;

        // Category info
        if (form.category) {
            this.category = {
                id: form.category.id,
                name: form.category.category_name
            };
        }

        // Product info
        if (form.product) {
            this.product = {
                id: form.product.id,
                name: form.product.product_name
            };
        }

        // Plant info
        if (form.plant) {
            this.plant = {
                id: form.plant.id,
                name: form.plant.name
            };
        }

        // Sections with questions
        if (form.sections) {
            this.sections = form.sections.map(section => ({
                id: section.id,
                sectionName: section.section_name,
                sectionOrder: section.section_order,
                description: section.description,
                isMandatory: section.is_mandatory,
                questions: section.formQuestions?.map(fq => ({
                    id: fq.question.id,
                    questionText: fq.question.question_text,
                    questionCode: fq.question.question_code,
                    answerType: fq.question.answer_type,
                    questionType: fq.question.question_type,
                    isMandatory: fq.is_mandatory_override ?? fq.question.is_mandatory,
                    requiresPhoto: fq.question.requires_photo,
                    requiresNotes: fq.question.requires_notes,
                    helpText: fq.question.help_text,
                    questionOrder: fq.question_order,
                    // Map frequencies to applicableFrequencies (frequency codes)
                    applicableFrequencies: fq.question.frequencies?.map(f => f.frequency_code) || [],
                    conditions: fq.question.conditions?.map(c => ({
                        id: c.id,
                        conditionName: c.condition_name,
                        conditionCode: c.condition_code,
                        severityLevel: c.severity_level,
                        priorityScore: c.priority_score,
                        healthImpact: c.health_impact,
                        displayOrder: c.QuestionCondition?.display_order,
                        isActive: c.QuestionCondition?.is_active,
                        // For master conditions reference
                        conditionSource: 'MASTER',
                        masterCondition: {
                            conditionName: c.condition_name,
                            severityLevel: c.severity_level
                        }
                    })) || []
                })) || []
            }));
        }

        // Question count
        this.questionCount = this.sections?.reduce(
            (sum, section) => sum + (section.questions?.length || 0),
            0
        ) || 0;
    }

    static fromModel(form) {
        return new FormDTO(form);
    }

    static fromModelArray(forms) {
        return forms.map(form => new FormDTO(form));
    }
}

module.exports = FormDTO;
