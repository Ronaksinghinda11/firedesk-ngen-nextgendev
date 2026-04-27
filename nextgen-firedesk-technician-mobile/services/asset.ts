import { api } from './api';

export interface AssignedAsset {
    id?: string;
    _id?: string;
    assetId: string;
    building?: string;
    location?: string;
    plant?: {
        id?: string;
        plantName?: string;
    };
    plantId?: {
        id?: string;
        plantName?: string;
    };
    status?: string; // Contract status: Warranty/AMC/In-House/Deactive
    healthStatus?: string; // Healthy/Need Attention/etc
    floor?: string | { floorName: string; floor_name?: string };
    wing?: string | { wingName: string; wing_name?: string };
    maintenanceStatus?: string;

    // Type & Specs
    type?: string;
    subType?: string;
    capacity?: string;
    capacityUnit?: string;
    specValues?: Array<{
        id: string;
        value?: string;
        unit?: string;
        specDefinition?: {
            label?: string;
        };
    }>;

    // Product & Manufacturer
    model?: string;
    slNo?: string;
    manufacturer?: {
        name: string;
    };
    createdAt?: string;
    updatedAt?: string;

    // Timeline
    manufacturingDate?: string;
    installDate?: string;
    warrantyEndDate?: string;
    lifespanYears?: number;

    // Schedule
    lastHPTestDate?: string | string[];
    nextHPTestDueDate?: string;
    testFrequencyMonths?: number;
    lastRefillDate?: string | string[];
    nextRefillDate?: string;

    // AMC
    amcStartDate?: string;
    amcEndDate?: string;

    serviceDates?: {
        nextServiceDates?: {
            inspection?: string | null;
            testing?: string | null;
            maintenance?: string | null;
        };
        lastServiceDates?: {
            inspection?: string | null;
            testing?: string | null;
            maintenance?: string | null;
        };
    };
    tag?: string;
    qrCodeUrl?: string;

    documents?: Array<{
        id?: string;
        description?: string;
        documentUrl?: string;
        document_url?: string;
    }>;
}

export interface AssignedAssetsResponse {
    myAssets: AssignedAsset[];
    pagination?: {
        currentPage?: number;
        totalPages?: number;
        totalAssets?: number;
    };
    success?: boolean;
}

export const assetService = {
    async verifyAsset(qrCodeId: string) {
        return api.get(`/technician/get-assets-details-by-scanner-id/${qrCodeId}`);
    },

    async getAssetDetails(assetId: string) {
        const response = await api.post(`/technician/asset-detail/${assetId}`);
        return response.data;
    },

    async getMyCategoryAssets() {
        const response = await api.get('/technician/my-category-assets');
        return response.data;
    },

    async getMyAssets(page: number = 1, limit: number = 10): Promise<AssignedAssetsResponse> {
        const response = await api.get(`/technician/my-assets?page=${page}&limit=${limit}`);
        return response.data;
    }
};
