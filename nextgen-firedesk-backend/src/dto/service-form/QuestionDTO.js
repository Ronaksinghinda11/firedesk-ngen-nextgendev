/**
 * Question DTO
 * Data transformation for question API responses
 */

class QuestionDTO {
    constructor(question) {
        this.id = question.id;
        this.questionText = question.question_text;
        this.questionCode = question.question_code;
        this.answerType = question.answer_type;
        this.questionType = question.question_type;
        this.serviceType = question.service_type;
        this.isMandatory = question.is_mandatory;
        this.requiresPhoto = question.requires_photo;
        this.requiresNotes = question.requires_notes;
        this.helpText = question.help_text;
        this.displayCondition = question.display_condition;
        this.status = question.status;
        this.createdAt = question.created_at;
        this.updatedAt = question.updated_at;

        // Transform associations
        if (question.categories) {
            this.categories = question.categories.map(cat => ({
                id: cat.id,
                name: cat.category_name,
                status: cat.status
            }));
        }

        if (question.products) {
            this.products = question.products.map(prod => ({
                id: prod.id,
                name: prod.product_name,
                status: prod.status
            }));
        }

        if (question.frequencies) {
            this.frequencies = question.frequencies.map(freq => ({
                id: freq.id,
                code: freq.frequency_code,
                name: freq.frequency_name,
                intervalDays: freq.interval_days
            }));
        }

        if (question.conditions) {
            this.conditions = question.conditions.map(cond => ({
                id: cond.id,
                name: cond.name,
                severityLevel: cond.severity_level,
                priorityScore: cond.priority_score,
                healthImpact: cond.health_impact,
                displayOrder: cond.QuestionCondition?.display_order,
                isActive: cond.QuestionCondition?.is_active,
                conditionSource: cond.QuestionCondition?.condition_source
            }));
        }
    }

    static fromModel(question) {
        return new QuestionDTO(question);
    }

    static fromModelArray(questions) {
        return questions.map(question => new QuestionDTO(question));
    }
}

module.exports = QuestionDTO;
