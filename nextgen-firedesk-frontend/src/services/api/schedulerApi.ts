/**
 * Scheduler API Service
 * Handles all scheduler-related API calls
 */

import { api } from '@/lib/api';

export interface Scheduler {
    id: string;
    plant_id: string;
    category_id: string;
    schedule_start_date: string;
    schedule_end_date: string;
    inspection_frequency: string | null;
    testing_frequency: string | null;
    maintenance_frequency: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    plant?: {
        id: string;
        plant_code: string;
        plant_name: string;
    };
    category?: {
        id: string;
        category_name: string;
    };
}

export interface CreateSchedulerDto {
    plant_id: string;
    category_id: string;
    schedule_start_date: string;
    schedule_end_date: string;
    inspection_frequency?: string;
    testing_frequency?: string;
    maintenance_frequency?: string;
}

export interface UpdateSchedulerDto {
    schedule_start_date?: string;
    schedule_end_date?: string;
    inspection_frequency?: string;
    testing_frequency?: string;
    maintenance_frequency?: string;
    is_active?: boolean;
}

export interface BulkSchedulerDto {
    id?: string;
    category_id: string;
    schedule_start_date: string;
    schedule_end_date: string;
    inspection_frequency?: string;
    testing_frequency?: string;
    maintenance_frequency?: string;
}

export interface GenerationResult {
    success: boolean;
    totalAssets?: number;
    totalServices?: number;
    message?: string;
    error?: string;
}

export interface SchedulerResponse {
    success: boolean;
    data: Scheduler;
    generationResult?: GenerationResult;
    updateResult?: {
        success: boolean;
        servicesDeleted?: number;
        servicesCancelled?: number;
        servicesGenerated?: number;
        message?: string;
    };
}

export interface BulkSaveResponse {
    success: boolean;
    message: string;
    data: {
        created: Array<{ id: string; category_id: string; servicesGenerated: number }>;
        updated: Array<{ id: string; category_id: string; updateResult: any }>;
        deleted: Array<{ id: string; category_id: string; servicesCancelled: number }>;
        errors: Array<{ schedulerData?: any; id?: string; action?: string; error: string }>;
    };
}

export const schedulerApi = {
    /**
     * Get all schedulers
     */
    getAll: async (): Promise<Scheduler[]> => {
        const response = await api.get<{ success: boolean; data: Scheduler[] }>('/schedulers');
        return response.data || [];
    },

    /**
     * Get schedulers for a specific plant
     */
    getByPlant: async (plantId: string): Promise<Scheduler[]> => {
        const response = await api.get<{ success: boolean; data: Scheduler[] }>(`/schedulers/plant/${plantId}`);
        return response.data || [];
    },

    /**
     * Get a single scheduler by ID
     */
    getById: async (id: string): Promise<Scheduler> => {
        const response = await api.get<{ success: boolean; data: Scheduler }>(`/schedulers/${id}`);
        return response.data;
    },

    /**
     * Create a new scheduler
     */
    create: async (data: CreateSchedulerDto): Promise<SchedulerResponse> => {
        return api.post<SchedulerResponse>('/schedulers', data);
    },

    /**
     * Update a scheduler
     */
    update: async (id: string, data: UpdateSchedulerDto): Promise<SchedulerResponse> => {
        return api.put<SchedulerResponse>(`/schedulers/${id}`, data);
    },

    /**
     * Delete a scheduler
     */
    delete: async (id: string): Promise<{ success: boolean }> => {
        return api.delete<{ success: boolean }>(`/schedulers/${id}`);
    },

    /**
     * Bulk save schedulers for a plant
     */
    bulkSave: async (plantId: string, schedulers: BulkSchedulerDto[]): Promise<BulkSaveResponse> => {
        return api.post<BulkSaveResponse>('/schedulers/bulk', {
            plant_id: plantId,
            schedulers
        });
    },

    /**
     * Generate services for a scheduler
     */
    generateServices: async (id: string): Promise<GenerationResult> => {
        const response = await api.post<{ success: boolean; data: GenerationResult }>(`/schedulers/${id}/generate-services`, {});
        return response.data;
    },

    /**
     * Generate services for all schedulers in a plant
     */
    generateServicesForPlant: async (plantId: string): Promise<GenerationResult> => {
        const response = await api.post<{ success: boolean; data: GenerationResult }>(`/schedulers/plant/${plantId}/generate-services`, {});
        return response.data;
    }
};

export default schedulerApi;
