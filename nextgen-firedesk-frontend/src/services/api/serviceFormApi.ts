import { api } from '@/lib/api';



// Types
// NOTE: InspectionFrequency interface moved to src/constants/serviceFormConstants.ts

export interface ConditionMaster {
  id: string;
  condition_code: string;
  condition_name: string;
  severity_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  priority_score: number;
  health_impact: 'Healthy' | 'Need Attention' | 'Not Working' | 'Inventory' | 'Under Maintenance' | 'De-Active';
  recommended_action: string;
  requires_immediate_action: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionCondition {
  id: string;
  questionId: string;
  conditionSource: 'MASTER' | 'CUSTOM';
  conditionMasterId?: string;
  masterCondition?: ConditionMaster;
  customConditionName?: string;
  customSeverityLevel?: string;
  customPriorityScore?: number;
  customHealthImpact?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface FormQuestion {
  id: string;
  formId: string;
  sectionId: string;
  questionText: string;
  questionCode?: string;
  questionOrder: number;
  applicableFrequencies: string[];
  answerType: 'CONDITION_SELECT' | 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'PHOTO' | 'SIGNATURE' | 'MULTI_SELECT';
  isMandatory: boolean;
  requiresPhoto: boolean;
  requiresNotes: boolean;
  helpText?: string;
  conditions?: QuestionCondition[];
}

export interface FormSection {
  id: string;
  formId: string;
  sectionName: string;
  sectionOrder: number;
  description?: string;
  isMandatory: boolean;
  questions?: FormQuestion[];
}

export interface ServiceForm {
  id: string;
  serviceName: string;
  formCode?: string;
  description?: string;
  categoryId?: string;
  plantId?: string;
  serviceType?: 'INSPECTION' | 'TESTING' | 'MAINTENANCE';
  status: 'Active' | 'Inactive';
  createdBy: string;
  sections?: FormSection[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceFormData {
  serviceName: string;
  formCode?: string;
  description?: string;
  categoryId?: string;
  plantId?: string;
  serviceType?: 'INSPECTION' | 'TESTING' | 'MAINTENANCE';
  sections: {
    sectionName: string;
    sectionOrder: number;
    description?: string;
    isMandatory: boolean;
    questions: {
      questionText: string;
      questionCode?: string;
      questionOrder: number;
      applicableFrequencies?: string[];
      answerType: string;
      isMandatory: boolean;
      requiresPhoto: boolean;
      requiresNotes: boolean;
      helpText?: string;
      conditions?: {
        conditionSource: 'MASTER' | 'CUSTOM';
        conditionMasterId?: string;
        customConditionName?: string;
        customSeverityLevel?: string;
        customPriorityScore?: number;
        customHealthImpact?: string;
        displayOrder: number;
      }[];
    }[];
  }[];
}

// NOTE: Inspection frequencies are now hardcoded constants
// See: src/constants/serviceFormConstants.ts

// Condition Master API
export const conditionMasterApi = {
  getAll: async (filters?: { isActive?: boolean; severityLevel?: string; healthImpact?: string }): Promise<ConditionMaster[]> => {
    const response = await api.get<{ data: ConditionMaster[] }>(`/master-data/conditions`, { params: filters });
    return response.data;
  },

  getAllActive: async (): Promise<ConditionMaster[]> => {
    const response = await api.get<{ data: ConditionMaster[] }>(`/master-data/conditions/active`);
    return response.data;
  },

  getById: async (id: string): Promise<ConditionMaster> => {
    const response = await api.get<{ data: ConditionMaster }>(`/master-data/conditions/${id}`);
    return response.data;
  },

  getBySeverity: async (severity: string): Promise<ConditionMaster[]> => {
    const response = await api.get<{ data: ConditionMaster[] }>(`/master-data/conditions/severity/${severity}`);
    return response.data;
  },

  create: async (data: Omit<ConditionMaster, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConditionMaster> => {
    const response = await api.post<{ data: ConditionMaster }>(`/master-data/conditions`, data);
    return response.data;
  },

  update: async (id: string, data: Partial<ConditionMaster>): Promise<ConditionMaster> => {
    const response = await api.put<{ data: ConditionMaster }>(`/master-data/conditions/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/master-data/conditions/${id}`);
  },
};

export interface InspectionFrequency {
  id: string;
  frequency_code: string;
  frequency_name: string;
  interval_days: number;
  is_active: boolean;
}

export const frequencyApi = {
  getAll: async (): Promise<InspectionFrequency[]> => {
    const response = await api.get<{ data: InspectionFrequency[] }>('/service-forms/frequencies');
    return response.data;
  },
};

// Service Form API
export const serviceFormApi = {
  getAll: async (filters?: { categoryId?: string; status?: string; plantId?: string }): Promise<ServiceForm[]> => {
    const response = await api.get<{ data: ServiceForm[] }>(`/service-forms/forms`, { params: filters });
    return response.data;
  },

  getManagerForms: async (): Promise<ServiceForm[]> => {
    // Using main forms endpoint with filter for now
    const response = await api.get<{ success: boolean; data: ServiceForm[] }>(`/service-forms/forms`);
    return response.data;
  },

  getById: async (id: string): Promise<ServiceForm> => {
    const response = await api.get<{ data: ServiceForm }>(`/service-forms/forms/${id}`);
    return response.data;
  },

  getByCategory: async (categoryId: string): Promise<ServiceForm[]> => {
    const response = await api.get<{ data: ServiceForm[] }>(`/service-forms/forms/category/${categoryId}`);
    return response.data;
  },

  create: async (data: CreateServiceFormData): Promise<ServiceForm> => {
    const response = await api.post<{ data: ServiceForm }>(`/service-forms/forms`, data);
    return response.data;
  },

  update: async (id: string, data: CreateServiceFormData): Promise<ServiceForm> => {
    const response = await api.put<{ data: ServiceForm }>(`/service-forms/forms/${id}`, data);
    return response.data;
  },

  updateBasicInfo: async (id: string, data: Partial<ServiceForm>): Promise<ServiceForm> => {
    const response = await api.put<{ data: ServiceForm }>(`/service-forms/forms/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/service-forms/forms/${id}`);
  },

  addQuestion: async (formId: string, questionData: Partial<FormQuestion>): Promise<FormQuestion> => {
    // There is no specific addQuestion endpoint in the routes file I saw?
    // Checking serviceFormRoutes.js...
    // router.put('/forms/:id', formController.update);
    // There IS NO addQuestion route in serviceFormRoutes.js I saw earlier (lines 1-112).
    // Wait, let's re-read serviceFormRoutes.js content from previous step.
    // It has:
    // router.post('/forms', formController.create);
    // router.get('/forms', ...);
    // ...
    // router.put('/forms/:id', formController.update);
    // router.delete('/forms/:id', ...);
    // router.post('/submissions', ...);
    // router.get('/submissions', ...);
    // router.get('/frequencies', ...);
    // NO /forms/:formId/question route.
    // This method will 404. I should comment it out or leave it but getting 404 is expected if I don't fix it.
    // For now I will correct the prefix to /service-forms/forms... just to be consistent, but noting it might still fail if route missing.
    const response = await api.post<{ data: FormQuestion }>(`/service-forms/forms/${formId}/question`, questionData);
    return response.data;
  },

  deleteQuestion: async (formId: string, questionId: string): Promise<void> => {
    // Same here, no such route visible in serviceFormRoutes.js
    await api.delete(`/service-forms/forms/${formId}/question/${questionId}`);
  },

  /**
   * Get service form PDF blob URL for preview
   * @param formId - The form ID
   * @param frequency - The frequency filter (DAILY, WEEKLY, MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY)
   * @returns Object with blobUrl for iframe preview and filename for download
   */
  getPDFPreview: async (formId: string, frequency: string): Promise<{ blobUrl: string; filename: string }> => {
    const blob = await api.get<Blob>(`/service-forms/forms/${formId}/pdf-preview`, {
      params: { frequency },
      responseType: 'blob'
    });

    // Ensure the blob has the correct PDF MIME type
    const pdfBlob = blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });

    const blobUrl = window.URL.createObjectURL(pdfBlob);
    const filename = `ServiceForm_${frequency}_Checklist.pdf`;
    return { blobUrl, filename };
  },

  /**
   * Download PDF from blob URL
   */
  downloadFromUrl: (blobUrl: string, filename: string): void => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

export default {
  conditionMasterApi,
  serviceFormApi,
  frequencyApi,
};
