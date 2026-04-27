import { api } from '@/lib/api';

const API_BASE_URL = '/calendar';
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
        assetId?: string;
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
    plant?: {
        id: string;
        plantName: string;
        plantCode?: string;
    };
    form?: {
        id: string;
        serviceName: string;
        formCode: string;
        inspectionType?: string;
        serviceType?: string;
    };
    technician?: {
        id: string;
        technicianCode: string;
        technicianType: string;
        name?: string;
        email?: string;
        avatar?: string;
        profilePic?: string;
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
    cancelledReason?: string;
    completedAt?: string;
}

export interface Ticket {
    id: string;
    ticketId?: string;
    ticketCode: string;
    taskName: string;
    taskDescription?: string;
    targetDate: string;
    completedStatus: string;
    ticketCategory?: string;
    technicianId?: string;
    asset?: {
        id: string;
        assetId?: string;
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
        technicianType?: string;
        name?: string;
        email?: string;
        profilePic?: string;
        user?: {
            name?: string;
            email?: string;
        };
    };
    createdBy?: {
        id: string;
        name: string;
        email: string;
    };
    latestResponse?: any;
    createdAt?: string;
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
    tickets: Ticket[];
}

export interface ServiceStatistics {
    services: {
        completed: number;
        due: number;
        lapsed: number;
        cancelled: number;
        PENDINGApproval: number;
    };
    tickets: {
        PENDING: number;
        waitingApproval: number;
        completed: number;
    };
}

export const adminCalendarApi = {
    // Get combined calendar dashboard (counts + statistics) in one call
    getCalendarDashboard: async (month: number, year: number, plantId?: string | null) => {
        const params: any = { month, year };
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

    // Get lightweight calendar counts per date (for month grid)
    getCalendarCounts: async (month: number, year: number, plantId?: string | null) => {
        const params: any = { month, year };
        if (plantId && plantId !== 'all') {
            params.plantId = plantId;
        }
        const response = await api.get<{
            success: boolean;
            counts: CalendarDayCount[];
        }>(`${API_BASE_URL}/counts`, { params });
        return response;
    },

    // Get calendar events
    getCalendarEvents: async (month: number, year: number, plantId?: string | null) => {
        const params: any = { month, year };
        if (plantId && plantId !== 'all') {
            params.plantId = plantId;
        }
        const response = await api.get<{
            success: boolean;
            events: CalendarEvent[];
        }>(`${API_BASE_URL}/events`, { params });
        return response;
    },

    // Get service statistics
    getServiceStatistics: async (plantId?: string | null) => {
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

    // Get completed services
    getCompletedServices: async (plantId?: string | null, page = 1, limit = DEFAULT_PAGE_SIZE) => {
        const params: any = { page, limit };
        if (plantId && plantId !== 'all') {
            params.plantId = plantId;
        }
        const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/completed`, { params });
        return normalizeServiceList(response);
    },

    // Get services due
    getServicesDue: async (plantId?: string | null, page = 1, limit = DEFAULT_PAGE_SIZE) => {
        const params: any = { page, limit };
        if (plantId && plantId !== 'all') {
            params.plantId = plantId;
        }
        const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/due`, { params });
        return normalizeServiceList(response);
    },

    // Get lapsed services
    getLapsedServices: async (plantId?: string | null, page = 1, limit = DEFAULT_PAGE_SIZE) => {
        const params: any = { page, limit };
        if (plantId && plantId !== 'all') {
            params.plantId = plantId;
        }
        const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/lapsed`, { params });
        return normalizeServiceList(response);
    },

    // Get cancelled services
    getCancelledServices: async (plantId?: string | null, page = 1, limit = DEFAULT_PAGE_SIZE) => {
        const params: any = { page, limit };
        if (plantId && plantId !== 'all') {
            params.plantId = plantId;
        }
        const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/cancelled`, { params });
        return normalizeServiceList(response);
    },

    // Get rejected services
    getRejectedServices: async (plantId?: string | null, page = 1, limit = DEFAULT_PAGE_SIZE) => {
        const params: any = { page, limit };
        if (plantId && plantId !== 'all') {
            params.plantId = plantId;
        }
        const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/rejected`, { params });
        return normalizeServiceList(response);
    },

    // Get PENDING approval services
    getPendingApprovalServices: async (plantId?: string | null, page = 1, limit = DEFAULT_PAGE_SIZE) => {
        const params: any = { page, limit };
        if (plantId && plantId !== 'all') {
            params.plantId = plantId;
        }
        const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/PENDING-approval`, { params });
        return normalizeServiceList(response);
    },

    // Get unassigned services
    getUnassignedServices: async (plantId?: string | null, page = 1, limit = DEFAULT_PAGE_SIZE) => {
        const params: any = { page, limit };
        if (plantId && plantId !== 'all') {
            params.plantId = plantId;
        }
        const response = await api.get<ServiceListResponse>(`${API_BASE_URL}/services/unassigned`, { params });
        return normalizeServiceList(response);
    }
};
