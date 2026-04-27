export type TicketCategory =
  | 'Installation'
  | 'Breakdown Maintenance'
  | 'Refill / HP Test'
  | 'General';

export interface TicketDropdownData {
    plants: { id: string; plantName: string; categoryIds?: string[] }[];
    categories: { id: string; categoryName: string }[];
    technicians: { id: string; name: string; email: string; plantIds: string[] }[];
}

export interface TicketFormData {
    plantId: string;
    categoryId: string;
    assetId: string;
    buildingId?: string;
    technicianId?: string;
    taskName: string;
    taskDescription?: string;
    targetDate: string;
    ticketCategory: TicketCategory;
    inventoryAssetId?: string;
    floorId?: string;
    wingId?: string;
    location?: string;
    completedStatus?: 'Pending' | 'In Progress' | 'Waiting for approval' | 'Completed' | 'Rejected';
}

export interface Asset {
    id: string;
    assetId: string;
    buildingId?: string;
    buildingRef?: {
        id: string;
        buildingName: string;
    };
}

export interface TicketResponse {
    id: string;
    userId: string;
    comment: string;
    responseType: 'submission' | 'rejection' | 'comment';
    isFixed?: boolean | null;
    photoUrls?: string[];
    createdAt: string;
    updatedAt: string;
    user?: {
        id: string;
        name: string;
        email?: string;
    };
    respondingTechnician?: {
        user: {
            name: string;
        };
    };
}

export interface Ticket {
    id: string;
    ticketId: string;
    plantId?: string;
    assetId?: string;
    categoryId?: string;
    technicianId?: string;
    taskName: string;
    taskDescription?: string;
    targetDate: string;
    ticketCategory: string;
    inventoryAssetId?: string;
    floorId?: string;
    wingId?: string;
    location?: string;
    totalSpareCost?: number;
    completedStatus: 'Pending' | 'In Progress' | 'Waiting for approval' | 'Completed' | 'Rejected';
    createdAt: string;
    updatedAt: string;
    plant?: {
        id: string;
        plantName: string;
    };
    asset?: {
        id: string;
        assetId: string;
        building?: {
            id: string;
            buildingName: string;
        };
    };
    inventoryAsset?: {
        id: string;
        assetCode: string;
        manufacturer: string;
        model?: string;
        status: string;
    };
    building?: {
        id: string;
        buildingName: string;
    };
    technician?: {
        id: string;
        name: string;
        email: string;
    };
    category?: {
        id: string;
        categoryName: string;
    };
    responses?: TicketResponse[];
}

export interface TicketApiResponse {
    tickets: Ticket[];
}

export interface SingleTicketApiResponse {
    ticket: Ticket;
}

export interface TicketCreateResponse {
    success: boolean;
    message: string;
    ticket: Ticket;
}

export interface AssetsApiResponse {
    assets: Asset[];
}
