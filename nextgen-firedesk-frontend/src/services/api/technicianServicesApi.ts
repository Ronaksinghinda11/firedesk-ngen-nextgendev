/**
 * Technician Services API
 * Handles API calls for technician's assigned service submissions
 */

import { api } from '@/lib/api';

const API_BASE_URL = '/technician';

// Types
export interface ServiceSubmission {
  id: string;
  submissionNumber: string;
  scheduledDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'REJECTED' | 'APPROVED';
  inspectionType: 'Inspection' | 'Testing' | 'Maintenance';
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  asset?: {
    id: string;
    assetId: string;
    location?: string;
    building?: {
      id: string;
      building_name: string;
    };
    floor?: string;
    plant?: {
      id: string;
      plantName: string;
      location?: string;
    };
  };
  form?: {
    id: string;
    serviceName: string;
    formCode: string;
    description?: string;
  };
  frequency?: {
    id: string;
    frequencyName: string;
    intervalDays?: number;
  };
  technician?: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface ServicesResponse {
  success: boolean;
  data: ServiceSubmission[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore?: boolean;
  };
}

export interface ServiceDetailResponse {
  success: boolean;
  data: ServiceSubmission;
}

export const technicianServicesApi = {
  /**
   * Get all assigned services
   */
  async getMyAssignedServices(page = 1, limit = 50): Promise<ServicesResponse> {
    const response = await api.get<ServicesResponse>(`${API_BASE_URL}/my-services`, {
      params: { page, limit }
    });
    return response;
  },

  /**
   * Get services due (today or overdue)
   */
  async getMyServicesDue(page = 1, limit = 50): Promise<ServicesResponse> {
    const response = await api.get<ServicesResponse>(`${API_BASE_URL}/my-services/due`, {
      params: { page, limit }
    });
    return response;
  },

  /**
   * Get upcoming services
   */
  async getMyUpcomingServices(page = 1, limit = 50): Promise<ServicesResponse> {
    const response = await api.get<ServicesResponse>(`${API_BASE_URL}/my-services/upcoming`, {
      params: { page, limit }
    });
    return response;
  },

  /**
   * Get completed services
   */
  async getMyCompletedServices(page = 1, limit = 50): Promise<ServicesResponse> {
    const response = await api.get<ServicesResponse>(`${API_BASE_URL}/my-services/completed`, {
      params: { page, limit }
    });
    return response;
  },

  /**
   * Get lapsed services
   */
  async getMyLapsedServices(page = 1, limit = 50): Promise<ServicesResponse> {
    const response = await api.get<ServicesResponse>(`${API_BASE_URL}/my-services/lapsed`, {
      params: { page, limit }
    });
    return response;
  },

  /**
   * Get service details by ID
   */
  async getMyServiceById(id: string): Promise<ServiceDetailResponse> {
    const response = await api.get<ServiceDetailResponse>(`${API_BASE_URL}/my-services/${id}`);
    return response;
  },

  /**
   * Get service form with filtered questions
   */
  async getServiceForm(serviceId: string): Promise<any> {
    const response = await api.get(`${API_BASE_URL}/services/${serviceId}/form`);
    return response;
  },

  /**
   * Submit service form answers
   */
  async submitServiceForm(serviceId: string, answers: any[]): Promise<any> {
    const response = await api.post(`${API_BASE_URL}/services/${serviceId}/submit`, { answers });
    return response;
  },

  /**
   * Start a service (mark as IN_PROGRESS)
   */
  async startService(serviceId: string): Promise<any> {
    const response = await api.patch(`${API_BASE_URL}/services/${serviceId}/start`, {});
    return response;
  }
};

export default technicianServicesApi;

