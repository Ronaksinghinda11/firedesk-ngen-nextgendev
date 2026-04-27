/**
 * Calendar API Service (Manager)
 * Handles all calendar and service-related API calls for manager role
 */

import { api } from '@/lib/api';

const API_BASE_URL = '/api/manager/calendar';
const DEFAULT_PAGE_SIZE = 10;

type ServiceListResponse = {
  success?: boolean;
  services?: ServiceSubmission[];
  data?: ServiceSubmission[];
  total?: number;
  limit?: number;
  offset?: number;
  pagination?: { total?: number; limit?: number; offset?: number; page?: number; totalPages?: number };
};

type FilterParams = {
  assetIds?: string[];
  serviceTypes?: string[];
  frequencies?: string[];
  categories?: string[];
  products?: string[];
  subTypes?: string[];
};

/**
 * Helper to add filter params to request - only adds non-empty arrays as comma-separated strings
 */
const addFilterParams = (params: Record<string, any>, filters?: FilterParams) => {
  if (filters?.assetIds?.length) params.assetIds = filters.assetIds.join(',');
  if (filters?.serviceTypes?.length) params.serviceTypes = filters.serviceTypes.join(',');
  if (filters?.frequencies?.length) params.frequencies = filters.frequencies.join(',');
  if (filters?.categories?.length) params.categories = filters.categories.join(',');
  if (filters?.products?.length) params.products = filters.products.join(',');
  if (filters?.subTypes?.length) params.subTypes = filters.subTypes.join(',');
};

const normalizeServiceList = (res: ServiceListResponse) => {
  const services = res.services ?? res.data ?? [];
  const total =
    res.total ??
    res.pagination?.total ??
    services.length ??
    0;

  return {
    ...res,
    services,
    total,
  };
};

export interface ServiceSubmission {
  id: string;
  submissionNumber: string;
  scheduledDate: string;
  status: string;
  approvalStatus?: string;
  inspectionType?: string;
  frequency: {
    id: string | null;
    frequencyName: string;
    frequencyCode?: string | null;
  };
  technicianId?: string;
  asset: {
    id: string;
    assetCode: string;
    location: string;
    building?: { id: string; buildingName: string };
    category?: { id: string; categoryName: string };
    product?: { id: string; productName: string };
  };
  inspectionFrequency?: {
    id: string;
    frequencyName: string;
  };
  plant: {
    id: string;
    plantName: string;
    plantCode?: string;
  };
  form?: {
    id: string;
    serviceName: string;
    formCode: string;
    inspectionType?: string;
  };
  technician?: {
    id: string;
    technicianCode: string;
    technicianType: string;
    name?: string;
    email?: string;
    avatar?: string;
    user?: {
      name?: string;
      email?: string;
    };
  };
  submitter?: {
    id: string;
    technicianCode?: string;
    technicianType?: string;
    user?: {
      name?: string;
      email?: string;
    };
  };
  assignedTechnicians?: Array<{
    id: string;
    technicianCode?: string;
    technicianType?: string;
    name?: string;
    email?: string;
    profilePic?: string;
    status: string;
    assignedAt: string;
  }>;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  totalPriorityScore?: number;
  calculatedHealthStatus?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  approvalRemarks?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface TicketSubmission {
  id: string;
  ticketCode: string;
  taskName: string;
  taskDescription?: string;
  targetDate: string;
  ticketCategory: string;
  completedStatus: string;
  technicianId?: string;
  asset: {
    id: string;
    assetCode: string;
    location: string;
    category?: { id: string; categoryName: string };
    building?: { id: string; buildingName: string };
  };
  plant?: {
    id: string;
    plantName: string;
    plantCode?: string;
  };
  technician?: {
    id: string;
    technicianCode: string;
    technicianType: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  latestResponse?: any;
  createdAt: string;
}

export interface CalendarDayCount {
  date: string;
  serviceCount: number;
  ticketCount: number;
  statusBreakdown: Record<string, number>;
}

export interface CalendarEvent {
  date: string;
  serviceDatas: ServiceSubmission[];
  tickets: TicketSubmission[];
}

export interface ServiceStatistics {
  services: {
    completed: number;
    due: number;
    lapsed: number;
    cancelled: number;
    rejected: number;
    PENDINGApproval: number;
  };
  tickets: {
    PENDING: number;
    waitingApproval: number;
    completed: number;
  };
}

export interface EligibleTechnician {
  id: string;
  technicianCode: string;
  technicianType: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export const calendarApi = {
  /**
   * Get combined calendar dashboard (counts + statistics) in one call
   */
  async getCalendarDashboard(
    month: number,
    year: number,
    plantId?: string
  ) {
    const params: Record<string, any> = { month, year };
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }

    const response = await api.get<{
      success: boolean;
      counts: CalendarDayCount[];
      statistics: ServiceStatistics;
    }>(`${API_BASE_URL}/dashboard`, { params });

    return response;
  },

  /**
   * Get lightweight calendar counts per date (for month grid)
   */
  async getCalendarCounts(
    month: number,
    year: number,
    plantId?: string
  ) {
    const params: Record<string, any> = { month, year };
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }

    const response = await api.get<{
      success: boolean;
      counts: CalendarDayCount[];
    }>(`${API_BASE_URL}/counts`, { params });

    return response;
  },

  /**
   * Get calendar events for a specific month and year
   */
  /**
   * Get calendar events for a specific month and year
   */
  async getCalendarEvents(
    month: number,
    year: number,
    plantId?: string,
    filters?: FilterParams
  ) {
    const params: Record<string, any> = { month, year };
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }
    addFilterParams(params, filters);

    const response = await api.get<{
      success: boolean;
      events: CalendarEvent[];
    }>(`${API_BASE_URL}/events`, { params });

    return response;
  },

  /**
   * Get service statistics
   */
  async getServiceStatistics(plantId?: string) {
    const params: any = {};
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }

    const response = await api.get<{
      success: boolean;
      stats: ServiceStatistics;
    }>(`${API_BASE_URL}/statistics`, { params });

    return response;
  },

  /**
   * Get completed services
   */
  async getCompletedServices(
    plantId?: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    filters?: FilterParams
  ) {
    const params: Record<string, any> = { page, limit };
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }
    addFilterParams(params, filters);

    const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/completed`, { params });
    return normalizeServiceList(response);
  },

  /**
   * Get services due (upcoming)
   */
  async getServicesDue(
    plantId?: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    filters?: FilterParams
  ) {
    const params: Record<string, any> = { page, limit };
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }
    addFilterParams(params, filters);

    const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/due`, { params });
    return normalizeServiceList(response);
  },

  /**
   * Get lapsed services (overdue)
   */
  async getLapsedServices(
    plantId?: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    filters?: FilterParams
  ) {
    const params: Record<string, any> = { page, limit };
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }
    addFilterParams(params, filters);

    const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/lapsed`, { params });
    return normalizeServiceList(response);
  },

  /**
   * Get cancelled services
   */
  async getCancelledServices(
    plantId?: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    filters?: FilterParams
  ) {
    const params: Record<string, any> = { page, limit };
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }
    addFilterParams(params, filters);

    const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/cancelled`, { params });
    return normalizeServiceList(response);
  },

  /**
   * Get rejected services
   */
  async getRejectedServices(
    plantId?: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    filters?: FilterParams
  ) {
    const params: Record<string, any> = { page, limit };
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }
    addFilterParams(params, filters);

    const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/rejected`, { params });
    return normalizeServiceList(response);
  },

  /**
   * Get PENDING approval services
   */
  async getPendingApprovalServices(
    plantId?: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    filters?: FilterParams
  ) {
    const params: Record<string, any> = { page, limit };
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }
    addFilterParams(params, filters);

    const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/PENDING-approval`, { params });
    return normalizeServiceList(response);
  },

  /**
   * Get unassigned services
   */
  async getUnassignedServices(plantId?: string, page = 1, limit = DEFAULT_PAGE_SIZE) {
    const params: any = { page, limit };
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }

    const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/unassigned`, { params });
    return normalizeServiceList(response);
  },

  /**
   * Get eligible technicians for a service
   */
  async getEligibleTechnicians(serviceId: string) {
    const response = await api.get<{
      success: boolean;
      technicians: EligibleTechnician[];
    }>(`${API_BASE_URL}/eligible-technicians/${serviceId}`);

    return response;
  },

  /**
   * Approve a service
   */
  async approveService(serviceId: string, remarks?: string) {
    const response = await api.post<{
      success: boolean;
      message: string;
      service: ServiceSubmission;
    }>(`${API_BASE_URL}/approve-service/${serviceId}`, { remarks });

    return response;
  },

  /**
   * Reject a service
   */
  async rejectService(serviceId: string, remarks: string) {
    const response = await api.post<{
      success: boolean;
      message: string;
      service: ServiceSubmission;
    }>(`${API_BASE_URL}/reject-service/${serviceId}`, { remarks });

    return response;
  },

  /**
   * Assign a technician to a specific service
   */
  async assignTechnician(serviceId: string, technicianId: string) {
    const response = await api.put<{
      success: boolean;
      message: string;
      service: ServiceSubmission;
    }>(`${API_BASE_URL}/assign-technician/${serviceId}`, { technicianId });

    return response;
  },

  /**
   * Assign technician to a ticket
   */
  async assignTicketTechnician(ticketId: string, technicianId: string) {
    const response = await api.put<{
      success: boolean;
      message: string;
      ticket: any;
    }>(`${API_BASE_URL}/assign-ticket-technician/${ticketId}`, { technicianId });

    return response;
  },

  /**
   * Assign technicians to all services in the next week
   */
  async assignTechniciansForWeek() {
    const response = await api.post<{
      success: boolean;
      message: string;
      assigned: number;
      failed: number;
      assignments: Array<{
        serviceId: string;
        submissionNumber: string;
        technicianId: string;
        technicianName: string;
      }>;
      failures: Array<{
        serviceId: string;
        submissionNumber: string;
        reason: string;
      }>;
    }>(`${API_BASE_URL}/assign-technicians-weekly`, {});

    return response;
  }
};
