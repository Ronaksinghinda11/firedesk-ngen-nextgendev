import axios from 'axios';
import { uploadApi } from '@/lib/api';

const API_BASE_URL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:5000/api';
const SAMS_BASE = `${API_BASE_URL}/sams`;
const SAMS_ADMIN_BASE = `${API_BASE_URL}/sams/admin`;

// Get auth token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// =================== TYPES ===================

export interface IncidentType {
  id: string;
  typeName: string;
  typeCode?: string;
  description?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  subtypes?: IncidentSubtype[];
}

export interface IncidentSubtype {
  id: string;
  incidentTypeId: string;
  subtypeName: string;
  subtypeCode?: string;
  description?: string;
  isActive: boolean;
  incidentType?: IncidentType;
  createdAt: string;
  updatedAt: string;
}

export interface CapaStepDefinition {
  id: string;
  stepNumber: number;
  stepName: string;
  stepCode?: string;
  stepDescription?: string;
  isDocumentRequired: boolean;
  isApprovalRequired: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  incidentNumber: string;
  incidentSubtypeId: string;
  plantId: string;
  buildingId?: string;
  floorId?: string;
  incidentDate: string;
  description: string;
  impact?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Team Assigned' | 'In Progress' | 'Pending Approval' | 'Closed' | 'Rejected';
  currentCapaStep: number;
  teamCreatorId?: string;
  teamLeaderId?: string;
  documentsData?: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  subtype?: IncidentSubtype;
  plant?: any;
  building?: any;
  floor?: any;
  creator?: { id: string; name: string; email: string };
  teamCreator?: { id: string; name: string; email: string };
  teamLeader?: { id: string; name: string; email: string };
  assignments?: IncidentAssignment[];
  capaSteps?: IncidentCapaStep[];
  activities?: IncidentActivity[];
}

export interface IncidentAssignment {
  id: string;
  incidentId: string;
  userId: string;
  role?: string;
  assignedBy: string;
  assignedAt: string;
  isActive: boolean;
  assignedUser?: {
    id: string;
    name: string;
    email: string;
  };
  externalPersonName?: string;
  externalPersonEmail?: string;
  assigner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface IncidentCapaStep {
  id: string;
  incidentId: string;
  capaStepDefinitionId: string;
  stepNumber: number;
  stepName?: string;
  stepDescription?: string;
  isDocumentRequired: boolean;
  isApprovalRequired: boolean;
  stepResponse?: string;
  documentsData?: any;
  status: 'Not Started' | 'In Progress' | 'Pending Approval' | 'Approved' | 'Rejected';
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  definition?: CapaStepDefinition;
  submitter?: { id: string; name: string; email: string };
  approver?: { id: string; name: string; email: string };
  rejector?: { id: string; name: string; email: string };
}

export interface IncidentActivity {
  id: string;
  incidentId: string;
  action: string;
  description?: string;
  performedBy: string;
  metadata?: any;
  createdAt: string;
  performer?: {
    id: string;
    name: string;
    email: string;
  };
}

// =================== LOOKUP APIs (No special permissions required - any authenticated user) ===================

export const lookupApi = {
  getIncidentTypes: async (params?: { isActive?: boolean }) => {
    const response = await axios.get(`${SAMS_BASE}/lookup/incident-type`, {
      headers: getAuthHeaders(),
      params
    });
    return response.data;
  },

  getIncidentSubtypes: async (params?: { isActive?: boolean; incidentTypeId?: string }) => {
    const response = await axios.get(`${SAMS_BASE}/lookup/incident-subtype`, {
      headers: getAuthHeaders(),
      params
    });
    return response.data;
  },

  getCapaSteps: async (params?: { isActive?: boolean }) => {
    const response = await axios.get(`${SAMS_BASE}/lookup/capa-step`, {
      headers: getAuthHeaders(),
      params
    });
    return response.data;
  }
};

// =================== ADMIN APIs: INCIDENT TYPES ===================

export const incidentTypeApi = {
  getAll: async (params?: { isActive?: boolean }) => {
    const response = await axios.get(`${SAMS_ADMIN_BASE}/incident-type`, {
      headers: getAuthHeaders(),
      params
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axios.get(`${SAMS_ADMIN_BASE}/incident-type/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  create: async (data: Partial<IncidentType>) => {
    const response = await axios.post(`${SAMS_ADMIN_BASE}/incident-type`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  update: async (id: string, data: Partial<IncidentType>) => {
    const response = await axios.put(`${SAMS_ADMIN_BASE}/incident-type/${id}`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axios.delete(`${SAMS_ADMIN_BASE}/incident-type/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

// =================== ADMIN APIs: INCIDENT SUBTYPES ===================

export const incidentSubtypeApi = {
  getAll: async (params?: { isActive?: boolean; incidentTypeId?: string }) => {
    const response = await axios.get(`${SAMS_ADMIN_BASE}/incident-subtype`, {
      headers: getAuthHeaders(),
      params
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axios.get(`${SAMS_ADMIN_BASE}/incident-subtype/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  create: async (data: Partial<IncidentSubtype>) => {
    const response = await axios.post(`${SAMS_ADMIN_BASE}/incident-subtype`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  update: async (id: string, data: Partial<IncidentSubtype>) => {
    const response = await axios.put(`${SAMS_ADMIN_BASE}/incident-subtype/${id}`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axios.delete(`${SAMS_ADMIN_BASE}/incident-subtype/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

// =================== ADMIN APIs: CAPA STEP DEFINITIONS ===================

export const capaStepApi = {
  getAll: async (params?: { isActive?: boolean }) => {
    const response = await axios.get(`${SAMS_ADMIN_BASE}/capa-step`, {
      headers: getAuthHeaders(),
      params
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axios.get(`${SAMS_ADMIN_BASE}/capa-step/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  create: async (data: Partial<CapaStepDefinition>) => {
    const response = await axios.post(`${SAMS_ADMIN_BASE}/capa-step`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  update: async (id: string, data: Partial<CapaStepDefinition>) => {
    const response = await axios.put(`${SAMS_ADMIN_BASE}/capa-step/${id}`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axios.delete(`${SAMS_ADMIN_BASE}/capa-step/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  reorder: async (steps: Array<{ id: string; stepNumber: number }>) => {
    const response = await axios.put(`${SAMS_ADMIN_BASE}/capa-step-reorder`, { steps }, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

// =================== INCIDENT APIs ===================

export const incidentApi = {
  getAll: async (params?: {
    plantId?: string;
    severity?: string;
    status?: string;
    incidentSubtypeId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await axios.get(`${SAMS_BASE}/incident`, {
      headers: getAuthHeaders(),
      params
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axios.get(`${SAMS_BASE}/incident/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  create: async (data: Partial<Incident>) => {
    const response = await axios.post(`${SAMS_BASE}/incident`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  update: async (id: string, data: Partial<Incident>) => {
    const response = await axios.put(`${SAMS_BASE}/incident/${id}`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axios.delete(`${SAMS_BASE}/incident/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Team assignment
  getAvailableMembers: async (incidentId: string) => {
    const response = await axios.get(`${SAMS_BASE}/incident/${incidentId}/available-members`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  assignTeam: async (incidentId: string, data: { teamMemberIds: string[]; teamLeaderId?: string }) => {
    const response = await axios.post(`${SAMS_BASE}/incident/${incidentId}/assign-team`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // CAPA workflow
  submitCapaStep: async (incidentId: string, stepId: string, data: { stepResponse: string; documentsData?: any }) => {
    const response = await axios.put(`${SAMS_BASE}/incident/${incidentId}/capa-step/${stepId}/submit`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  reviewCapaStep: async (incidentId: string, stepId: string, data: { approved: boolean; rejectionReason?: string }) => {
    const response = await axios.put(`${SAMS_BASE}/incident/${incidentId}/capa-step/${stepId}/review`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Timeline
  getTimeline: async (incidentId: string) => {
    const response = await axios.get(`${SAMS_BASE}/incident/${incidentId}/timeline`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // My incidents
  getMyIncidents: async () => {
    const response = await axios.get(`${SAMS_BASE}/my-incidents`, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

// Backward compatibility exports
// These APIs are now consolidated into incidentApi but kept for existing code
export const userApi = {
  getMyIncidents: incidentApi.getMyIncidents,
  getIncidentById: incidentApi.getById,
  createIncident: incidentApi.create,
  submitCapaStep: incidentApi.submitCapaStep,
  checkTeamLeaderStatus: async () => {
    // Placeholder for team leader status check
    // This should be implemented based on your requirements
    return { data: { isTeamLeader: false } };
  }
};

export const managerApi = {
  ...incidentApi,
  getMyIncidents: incidentApi.getMyIncidents,
};

export const adminApi = {
  ...incidentApi,
};

// Legacy API names - redirect to new names
// incidentCategoryApi -> incidentTypeApi (renamed from Category to Type)
export const incidentCategoryApi = incidentTypeApi;

// Placeholder type exports for legacy code
export interface IncidentCategory extends IncidentType { }
export interface Training {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
export interface Audit {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
export interface DashboardStats {
  totalIncidents: number;
  openIncidents: number;
  closedIncidents: number;
}
export interface PendingApproval {
  id: string;
  incidentId: string;
  stepName: string;
  submittedAt: string;
}

// Placeholder APIs for features not yet implemented
// These will return empty data to prevent errors
export const auditApi = {
  getAll: async () => ({ data: [], success: true, message: 'Audits feature coming soon' }),
  getById: async (id: string) => ({ data: null, success: true, message: 'Audit not found' }),
  create: async (data: any) => ({ data: null, success: true, message: 'Feature coming soon' }),
  update: async (id: string, data: any) => ({ data: null, success: true, message: 'Feature coming soon' }),
  delete: async (id: string) => ({ data: null, success: true, message: 'Feature coming soon' }),
};

export const trainingApi = {
  getAll: async () => ({ data: [], success: true, message: 'Trainings feature coming soon' }),
  getById: async (id: string) => ({ data: null, success: true, message: 'Training not found' }),
  create: async (data: any) => ({ data: null, success: true, message: 'Feature coming soon' }),
  update: async (id: string, data: any) => ({ data: null, success: true, message: 'Feature coming soon' }),
  delete: async (id: string) => ({ data: null, success: true, message: 'Feature coming soon' }),
};

export default {
  lookupApi,
  incidentTypeApi,
  incidentSubtypeApi,
  capaStepApi,
  incidentApi,
  userApi,
  managerApi,
  adminApi,
  auditApi,
  trainingApi,
  incidentCategoryApi, // Legacy name
  uploadApi
};

export { uploadApi };
