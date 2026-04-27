import { api } from '@/lib/api';

// Types
export interface Question {
    id: string;
    question_text: string;
    question_code: string;
    answer_type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select' | 'condition';
    question_type: 'inspection' | 'testing' | 'maintenance' | 'general';
    service_type?: 'inspection' | 'testing' | 'maintenance';
    is_mandatory: boolean;
    requires_photo: boolean;
    requires_notes: boolean;
    help_text?: string;
    status: 'Active' | 'Inactive';
    created_at: string;
    updated_at: string;
    // Relations
    categories?: { id: string; category_name: string }[];
    products?: { id: string; product_name: string }[];
    frequencies?: { id: string; frequency_name: string; frequency_code: string }[];
    conditions?: any[];
    plant_id?: string;
    standards?: string;
}

export interface CreateQuestionDto {
    question_text: string;
    answer_type: string;
    question_type?: string;
    service_type?: string;
    is_mandatory?: boolean;
    requires_photo?: boolean;
    requires_notes?: boolean;
    help_text?: string;
    category_ids: string[];
    product_ids: string[];
    frequency_ids: string[];
    // Support full condition objects for creation
    conditions?: {
        condition_id: string;
        condition_source?: string;
        display_order?: number;
        is_active?: boolean;
    }[];
    // Keep condition_ids for simple association if needed, though 'conditions' is preferred by controller
    condition_ids?: string[];
}

export interface BulkCreateQuestionsDto {
    questions: CreateQuestionDto[];
}

export interface BulkUpdateQuestionsDto {
    questions: (Partial<CreateQuestionDto> & { id: string })[];
}

export const questionApi = {
    getAll: async (params?: { categoryId?: string; productId?: string; search?: string }) => {
        return api.get<{ success: boolean; data: Question[] }>('/service-forms/questions', { params });
    },

    getById: async (id: string) => {
        return api.get<{ success: boolean; data: Question }>(`/service-forms/questions/${id}`);
    },

    create: async (data: CreateQuestionDto) => {
        return api.post<{ success: boolean; data: Question }>('/service-forms/questions', data);
    },

    update: async (id: string, data: Partial<CreateQuestionDto>) => {
        return api.put<{ success: boolean; data: Question }>(`/service-forms/questions/${id}`, data);
    },

    delete: async (id: string) => {
        return api.delete<{ success: boolean }>(`/service-forms/questions/${id}`);
    },

    // Bulk create
    bulkCreate: async (data: BulkCreateQuestionsDto) => {
        return api.post<{ success: boolean; data: Question[]; count: number }>('/service-forms/questions/bulk', data);
    },

    // Bulk update
    bulkUpdate: async (data: BulkUpdateQuestionsDto) => {
        return api.put<{ success: boolean; message: string; results: any[] }>('/service-forms/questions/bulk', data);
    },

    // Export questions as CSV
    exportQuestions: async (filters?: { plant_id?: string; category_id?: string; service_type?: string }) => {
        const response = await api.get('/service-forms/questions/export', {
            params: filters,
            responseType: 'blob'
        });
        return response;
    },

    // Export questions as PDF
    exportPdf: async (data: { questionIds: string[]; paperSize?: string; orientation?: string }) => {
        const response = await api.post('/service-forms/questions/export-pdf', data, {
            responseType: 'blob'
        });
        return response;
    },

    // Download blank import template
    downloadTemplate: async () => {
        const response = await api.get('/service-forms/questions/template', {
            responseType: 'blob'
        });
        return response;
    },

    // Import questions from CSV file
    importQuestions: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<{
            success: boolean;
            message: string;
            imported: { question_code: string; question_text: string }[];
            failed: { question_text: string; error: string }[];
            validationErrors: { row: number; error: string; data: any }[];
        }>('/service-forms/questions/import', formData);
    }
};
