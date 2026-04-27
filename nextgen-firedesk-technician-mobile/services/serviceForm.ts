import { api } from './api';

export interface QuestionCondition {
    id: string;
    conditionName: string;
    severityLevel: string;
    priorityScore: number;
    healthImpact: string;
    displayOrder: number;
}

export interface SubmittedAnswer {
    id: string;
    answerValue: string;
    notes?: string;
    photoBase64?: string;
    answeredAt?: string;
}

export interface FormQuestion {
    id: string;
    questionText: string;
    questionCode: string;
    questionOrder: number;
    answerType: 'CONDITION_SELECT' | 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'PHOTO' | 'SIGNATURE' | 'MULTI_SELECT';
    isMandatory: boolean;
    requiresPhoto: boolean;
    requiresNotes: boolean;
    helpText?: string;
    conditions?: QuestionCondition[];
    answer?: SubmittedAnswer | null; // Submitted answer for read-only view
}

export interface FormSection {
    id: string;
    sectionName: string;
    sectionOrder: number;
    description?: string;
    isMandatory: boolean;
    questions: FormQuestion[];
}

export interface ServiceFormData {
    isReadOnly?: boolean; // Flag to indicate if form is read-only (completed/submitted)
    service: {
        id: string;
        submissionNumber: string;
        status: string;
        scheduledDate: string;
        inspectionType: string;
        startedAt?: string;
        submittedAt?: string;
        completedAt?: string;
        qrVerified?: boolean;
        approvalStatus?: string;
        approvalRemarks?: string;
        approvedAt?: string;
        asset: {
            id: string;
            asset_code: string;
            location?: string;
            building?: string;
            lat?: string;
            long?: string;
            latLongRemark?: string;
            plant?: {
                id: string;
                plantName: string;
            };
        };
        frequency?: {
            id: string;
            frequencyName: string;
            frequencyCode: string;
        };
    };
    form: {
        id: string;
        serviceName: string;
        formCode: string;
        description?: string;
        sections: FormSection[];
    };
}

export interface QuestionAnswer {
    formQuestionId: string;
    answerValue: string;
    notes?: string;
    photoBase64?: string;
}

export const serviceFormService = {
    async getServiceForm(serviceId: string): Promise<{ success: boolean; data: ServiceFormData }> {
        const response = await api.get(`/technician/services/${serviceId}/form`);
        return response.data;
    },

    async submitServiceForm(serviceId: string, answers: QuestionAnswer[]) {
        const formattedAnswers = answers.map(a => {
            let complianceStatus = 'COMPLIANT';
            let nonComplianceConditionId = null;

            // Map values to compliance status
            // 'true' -> COMPLIANT
            // 'NA' -> NA
            // UUID (Condition ID) -> NON_COMPLIANT with ID
            if (a.answerValue === 'true') {
                complianceStatus = 'COMPLIANT';
            } else if (a.answerValue === 'NA') {
                complianceStatus = 'NA';
            } else if (a.answerValue && a.answerValue !== 'false' && a.answerValue.length > 10) {
                // Assuming any other long string is a condition UUID
                complianceStatus = 'NON_COMPLIANT';
                nonComplianceConditionId = a.answerValue;
            } else if (a.answerValue === 'false') {
                // False without condition selected yet
                complianceStatus = 'NON_COMPLIANT';
            }

            return {
                questionId: a.formQuestionId,
                complianceStatus,
                nonComplianceConditionId,
                notes: a.notes || null,
                photoBase64: a.photoBase64 || null
            };
        });

        const response = await api.post(`/technician/services/${serviceId}/submit`, { answers: formattedAnswers });
        return response.data;
    },

    async startService(serviceId: string) {
        const response = await api.patch(`/technician/services/${serviceId}/start`);
        return response.data;
    }
};
