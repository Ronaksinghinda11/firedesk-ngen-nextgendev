import { api } from './api';

export interface Service {
    id: string;
    submissionNumber?: string;
    status: string;
    scheduledDate: string;
    inspectionType: string;
    startedAt?: string;
    submittedAt?: string;
    completedAt?: string;
    approvalRemarks?: string;
    approvedBy?: string;
    approvedAt?: string;
    asset: {
        id: string;
        assetId: string;
        asset_code?: string;
        location: string;
        building: string | { id: string; building_name: string };
        floor?: string;
        plant: {
            id: string;
            plantName: string;
            address_line1?: string;
        };
    };
    form?: {
        id: string;
        serviceName: string;
        formCode: string;
    };
    frequency?: {
        id: string;
        frequencyName: string;
    };
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

export interface Ticket {
    id: string;
    ticketId: string;
    taskName: string;
    taskDescription?: string;
    targetDate: string;
    completedStatus: string;
    ticketType?: string;
    plant?: {
        id: string;
        plantName: string;
    };
    asset?: {
        id: string;
        assetId: string;
    };
    category?: {
        id: string;
        categoryName: string;
    };
}

export interface CalendarEvent {
    date: string;
    serviceDatas: Service[];
    tickets: Ticket[];
}

export interface Statistics {
    serviceDue: number;
    serviceLapsed: number;
    serviceUpcoming: number;
    serviceCompleted: number;
    serviceCancelled: number;
    serviceRejected: number;
    totalServices: number;
    ticketsPending: number;
    ticketsCompleted: number;
}

export interface QRCodeData {
    asset_id: string;      // Contains UUID (not asset_code) - used for verification
    plant_id?: string;     // Contains UUID - used for verification and display
    category?: string;     // Optional - just for display
}

export interface AssetServicesResponse {
    asset: {
        id: string;
        assetId: string;
        location: string;
        building: string;
        plant: {
            id: string;
            plantName: string;
            address?: string;
        };
        category?: {
            id: string;
            name: string;
        };
    };
    services: Service[];
    servicesCount: number;
}

export interface QRVerificationResponse {
    verified: boolean;
    scannedAssetId: string;
    expectedAssetId: string;
    service: {
        id: string;
        status: string;
        scheduledDate: string;
    };
}

export interface OverrideStatusResponse {
    serviceId: string;
    qrVerified: boolean;
    overrideRequested: boolean;
    overrideStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    overrideReason: string | null;
    canProceed: boolean;
}

export const dashboardService = {
    // Services
    async getMyServices(page: number = 1, limit: number = 10) {
        const response = await api.get(`/technician/my-services?page=${page}&limit=${limit}`);
        return response.data;
    },

    async getDueServices(page: number = 1, limit: number = 10) {
        const response = await api.get(`/technician/my-services/due?page=${page}&limit=${limit}`);
        return response.data;
    },

    async getLapsedServices(page: number = 1, limit: number = 10) {
        const response = await api.get(`/technician/my-services/lapsed?page=${page}&limit=${limit}`);
        return response.data;
    },

    async getUpcomingServices(page: number = 1, limit: number = 10) {
        const response = await api.get(`/technician/my-services/upcoming?page=${page}&limit=${limit}`);
        return response.data;
    },

    async getCompletedServices(page: number = 1, limit: number = 10) {
        const response = await api.get(`/technician/my-services/completed?page=${page}&limit=${limit}`);
        return response.data;
    },

    async getRejectedServices(page: number = 1, limit: number = 10) {
        const response = await api.get(`/technician/my-services/rejected?page=${page}&limit=${limit}`);
        return response.data;
    },

    async getServiceById(id: string) {
        const response = await api.get(`/technician/my-services/${id}`);
        return response.data;
    },

    async getAssignedIncidents() {
        const response = await api.get('/sams/technician/my-assigned-incidents');
        return response.data;
    },

    // Tickets
    async getMyTickets() {
        const response = await api.get('/technician/my-assigned-tickets');
        return response.data;
    },

    async getTicketById(id: string) {
        const response = await api.get(`/technician/tickets/${id}`);
        return response.data;
    },

    async submitTicket(ticketId: string, data: { comment: string; isFixed: boolean }) {
        const response = await api.post(`/technician/tickets/${ticketId}/submit`, data);
        return response.data;
    },

    async addTicketComment(ticketId: string, comment: string) {
        const response = await api.post(`/technician/tickets/${ticketId}/comments`, { comment });
        return response.data;
    },

    // Calendar
    async getCalendarEvents(month: number, year: number) {
        const response = await api.get(`/technician/calendar/events?month=${month}&year=${year}`);
        return response.data;
    },

    async getStatistics() {
        const response = await api.get('/technician/calendar/statistics');
        return response.data;
    },

    // Profile & Plants
    async getMyProfile(userId: string) {
        const response = await api.get(`/technician/my-profile/${userId}`);
        return response.data;
    },

    async getMyPlants() {
        const response = await api.get('/technician/my-assigned-plant');
        return response.data;
    },

    async getMyCategoryAssets() {
        const response = await api.get('/technician/my-category-assets');
        return response.data;
    },

    async getMyAssets(page: number = 1, limit: number = 10) {
        const response = await api.get(`/technician/my-assets?page=${page}&limit=${limit}`);
        return response.data;
    },

    // Team Leader
    async checkIsTeamLeader() {
        const response = await api.get('/sams/user/is-team-leader');
        return response.data;
    },

    // QR Code Scanning
    /**
     * Get all services for a specific asset (by assetId from QR code)
     * Returns today's services assigned to the technician for that asset
     */
    async getServicesByAsset(assetId: string): Promise<{ success: boolean; data: AssetServicesResponse }> {
        // URL encode the assetId in case it contains special characters
        const encodedAssetId = encodeURIComponent(assetId);
        console.log('[API] getServicesByAsset:', assetId, '-> encoded:', encodedAssetId);
        const response = await api.get(`/technician/services/by-asset/${encodedAssetId}`);
        return response.data;
    },

    /**
     * Verify QR code matches the service's assigned asset
     * Call this when technician tries to start a service
     */
    async verifyServiceQR(serviceId: string, qrData: QRCodeData): Promise<{ success: boolean; data: QRVerificationResponse }> {
        const response = await api.post(`/technician/services/${serviceId}/verify-qr`, qrData);
        return response.data;
    },

    /**
     * Request manager override when QR verification fails
     */
    async requestOverride(serviceId: string, reason: string): Promise<{ success: boolean; message: string; data: any }> {
        const response = await api.post(`/technician/services/${serviceId}/request-override`, { reason });
        return response.data;
    },

    /**
     * Check override status for a service
     */
    async getOverrideStatus(serviceId: string): Promise<{ success: boolean; data: OverrideStatusResponse }> {
        const response = await api.get(`/technician/services/${serviceId}/override-status`);
        return response.data;
    },

    // Notifications
    async getNotifications(page: number = 1, limit: number = 20) {
        const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
        return response.data;
    },

    async markNotificationAsRead(id: string) {
        const response = await api.post(`/notifications/${id}/read`);
        return response.data;
    }
};
