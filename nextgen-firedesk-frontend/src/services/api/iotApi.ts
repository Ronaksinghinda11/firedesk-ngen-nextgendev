/**
 * IoT Device API Service
 * 
 * API calls for IoT device management and device-to-asset mapping
 */

import { api } from '@/lib/api';

/**
 * IoT Device to Asset Mapping Interface
 */
export interface IoTDeviceMapping {
    id: string;
    device_id: string;
    asset_code: string;
    category_id: string;
    plant_id: string;
    data_key?: string | null;
    created_at: string;
    updated_at: string;

    // Associations (included when fetched from backend)
    asset?: {
        id: string;
        assetCode: string;
        assetId: string;
        type: string;
        healthStatus: string;
        building?: string;
        location?: string;
    };
    category?: {
        id: string;
        categoryName: string;
    };
    plant?: {
        id: string;
        plantName: string;
    };
}

/**
 * Request payload for creating a new device mapping
 */
export interface CreateMappingRequest {
    device_id: string;
    asset_code: string;
    category_id: string;
    plant_id: string;
    data_key?: string | null;
}

/**
 * Response from POST /api/iot/data endpoint
 */
export interface IoTDataResponse {
    message: string;
    device_id: string;
    category: string;
    assets_mapped: number;
}

/**
 * Device Mapping Summary Response
 * Used by IoT Setup page for validation
 */
export interface DeviceMappingSummary {
    device_id: string;
    mappings: Array<{
        data_key: string;
        asset_code: string;
        asset_id: string;
        asset_name: string;
        mapping_id: string;
    }>;
    available_keys: string[];
    usage_count: number;
    total_ports: number;
}

/**
 * IoT API Service
 */
export const iotApi = {
    /**
     * Get all device mappings for a specific plant and category
     * Used by dashboard to fetch device list for subscription
     * 
     * GET /api/iot/devices/by-plant/:plantId/:categoryId
     */
    getDevicesByPlantCategory: async (
        plantId: string,
        categoryId: string
    ): Promise<IoTDeviceMapping[]> => {
        try {
            const response = await api.get<IoTDeviceMapping[]>(
                `/iot/devices/by-plant/${plantId}/${categoryId}`
            );
            return response;
        } catch (error) {
            console.error('[IoT API] Error fetching devices by plant/category:', error);
            throw error;
        }
    },

    /**
     * Get latest IoT data for all devices in a plant/category
     * Used for initial data load
     */
    getLatestDeviceData: async (plantId: string, categoryId: string) => {
        const response: any = await api.get(`/iot/devices/latest/${plantId}/${categoryId}`);
        return response.devices || {};
    },

    /**
     * Create a new device-to-asset mapping
     * Used by IoT Setup page
     * 
     * POST /api/iot/mapping
     */
    createMapping: async (
        data: CreateMappingRequest
    ): Promise<{ message: string; mapping: IoTDeviceMapping }> => {
        try {
            const response = await api.post<{ message: string; mapping: IoTDeviceMapping }>(
                '/iot/mapping',
                data
            );
            return response;
        } catch (error) {
            console.error('[IoT API] Error creating mapping:', error);
            throw error;
        }
    },

    /**
     * Update an existing device-to-asset mapping
     * Used by IoT Setup page
     * 
     * PUT /api/iot/mapping/:id
     */
    updateMapping: async (
        id: string,
        data: Partial<CreateMappingRequest>
    ): Promise<{ message: string; mapping: IoTDeviceMapping }> => {
        try {
            const response = await api.put<{ message: string; mapping: IoTDeviceMapping }>(
                `/iot/mapping/${id}`,
                data
            );
            return response;
        } catch (error) {
            console.error('[IoT API] Error updating mapping:', error);
            throw error;
        }
    },

    /**
     * Delete a device-to-asset mapping
     * Used by IoT Setup page
     * 
     * DELETE /api/iot/mapping/:id
     */
    deleteMapping: async (id: string): Promise<{ message: string }> => {
        try {
            const response = await api.delete<{ message: string }>(`/iot/mapping/${id}`);
            return response;
        } catch (error) {
            console.error('[IoT API] Error deleting mapping:', error);
            throw error;
        }
    },

    /**
     * Get all mappings for a specific device
     * Useful for debugging or device detail pages
     * 
     * Note: This is a helper that filters the results from getDevicesByPlantCategory
     */
    getMappingsByDevice: async (
        deviceId: string,
        plantId: string,
        categoryId: string
    ): Promise<IoTDeviceMapping[]> => {
        try {
            const allMappings = await iotApi.getDevicesByPlantCategory(plantId, categoryId);
            return allMappings.filter(m => m.device_id === deviceId);
        } catch (error) {
            console.error('[IoT API] Error fetching mappings by device:', error);
            throw error;
        }
    },

    /**
     * Get device mappings summary with port usage
     * Used by IoT Setup page to show which ports are available
     * 
     * GET /api/iot/device-mappings-summary
     */
    getDeviceMappingsSummary: async (
        plantId?: string,
        categoryId?: string
    ): Promise<{ devices: DeviceMappingSummary[] }> => {
        try {
            const params = new URLSearchParams();
            if (plantId) params.append('plantId', plantId);
            if (categoryId) params.append('categoryId', categoryId);

            const response = await api.get<{ devices: DeviceMappingSummary[] }>(
                `/iot/device-mappings-summary?${params.toString()}`
            );
            return response;
        } catch (error) {
            console.error('[IoT API] Error fetching device mappings summary:', error);
            throw error;
        }
    },
};

export default iotApi;
