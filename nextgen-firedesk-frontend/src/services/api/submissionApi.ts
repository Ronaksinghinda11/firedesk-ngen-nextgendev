import { api } from '@/lib/api';
import { ServiceForm } from './serviceFormApi';

const API_BASE_URL = '/api'; // Use relative path as base URL is handled by api client

// Types
export interface ServiceResponse {
  id: string;
  submissionId: string;
  questionId: string;
  selectedConditionId?: string;
  responseSeverity?: string;
  responsePriorityScore?: number;
  responseHealthImpact?: string;
  textResponse?: string;
  numericResponse?: number;
  booleanResponse?: boolean;
  dateResponse?: string;
  photoUrls?: string[];
  signatureUrl?: string;
  technicianNotes?: string;
  answeredAt: string;
  answeredBy: string;
}

export interface ServiceSubmission {
  id: string;
  submissionNumber: string;
  assetId: string;
  scheduleId?: string;
  formId: string;
  frequencyId: string;
  submittedBy?: string;
  plantId?: string;
  managerId?: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'REJECTED' | 'APPROVED';
  scheduledDate: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  approvalRemarks?: string;
  calculatedHealthStatus?: string;
  calculatedPriorityScore?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  asset?: Record<string, unknown>;
  form?: ServiceForm;
  frequency?: Record<string, unknown>;
  technician?: Record<string, unknown>;
  responses?: ServiceResponse[];
}

export interface SubmitServiceFormData {
  assetId: string;
  formId: string;
  frequencyId: string;
  scheduleId?: string;
  scheduledDate: string;
  responses: {
    questionId: string;
    selectedConditionId?: string;
    textResponse?: string;
    numericResponse?: number;
    booleanResponse?: boolean;
    dateResponse?: string;
    photoUrls?: string[];
    signatureUrl?: string;
    technicianNotes?: string;
  }[];
}

export interface FormForSubmission {
  asset: {
    id: string;
    assetId: string;
    building: string;
    location: string;
    type: string;
    model: string;
    currentHealthStatus: string;
  };
  form: ServiceForm;
}

export interface SubmissionSummary {
  submission: ServiceSubmission;
  healthSummary: {
    status: string;
    priorityScore: number;
    criticalCount: number;
    requiresAttention: boolean;
  };
}

// Service Submission API
export const submissionApi = {
  // Get form for submission (filtered by frequency)
  getFormForSubmission: async (assetId: string, frequencyId: string): Promise<FormForSubmission> => {
    const response = await api.get<{ data: FormForSubmission }>(`${API_BASE_URL}/service-submission/form/${assetId}/${frequencyId}`);
    return response.data;
  },

  // Submit service form
  submit: async (data: SubmitServiceFormData): Promise<SubmissionSummary> => {
    const response = await api.post<{ data: SubmissionSummary }>(`${API_BASE_URL}/service-submission`, data);
    return response.data;
  },

  // Get submission by ID
  getById: async (id: string): Promise<ServiceSubmission> => {
    const response = await api.get<{ data: ServiceSubmission }>(`${API_BASE_URL}/service-submission/${id}`);
    return response.data;
  },

  // Get my submissions (technician)
  getMySubmissions: async (filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ServiceSubmission[]> => {
    const response = await api.get<{ data: ServiceSubmission[] }>(`${API_BASE_URL}/service-submission/my/all`, { params: filters });
    return response.data;
  },

  // Get PENDING approvals (manager)
  getPendingApprovals: async (filters?: { plantId?: string }): Promise<ServiceSubmission[]> => {
    const response = await api.get<{ data: ServiceSubmission[] }>(`${API_BASE_URL}/service-submission/PENDING/approvals`, { params: filters });
    return response.data;
  },

  // Update approval status (manager)
  updateApprovalStatus: async (
    id: string,
    data: {
      approvalStatus: 'APPROVED' | 'REJECTED';
      approvalRemarks?: string;
    }
  ): Promise<ServiceSubmission> => {
    const response = await api.put<{ data: ServiceSubmission }>(`${API_BASE_URL}/service-submission/${id}/approval`, data);
    return response.data;
  },

  // Get asset service history
  getAssetHistory: async (assetId: string, limit?: number): Promise<ServiceSubmission[]> => {
    const response = await api.get<{ data: ServiceSubmission[] }>(`${API_BASE_URL}/service-submission/asset/${assetId}/history`, {
      params: { limit },
    });
    return response.data;
  },
};

export default submissionApi;
