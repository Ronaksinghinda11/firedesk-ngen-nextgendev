/**
 * Dashboard API Service
 * 
 * Centralized API calls for dashboard analytics
 */

import { api } from '@/lib/api';

export interface SystemHealthData {
    totalAssets: number;
    healthScore: number;
    failureImpactScore: number;
    assetReadiness: number;
    serviceComplianceRate: number;
    criticalAlerts: number;
    breakdown: {
        healthy: number;
        attentionRequired: number;
        notWorking: number;
    };
    trends: {
        health: number;
        period: string;
    };
    services: {
        total: number;
        completed: number;
        PENDING: number;
        scheduled?: number;
    };
}

export interface HydrostaticTestData {
    totalScheduled: number;
    totalCompleted: number;
    testCompletionEfficiency: number;
    delayIndex: number;
    chartData: Array<{
        name?: string;
        month: string;
        count?: number;
        scheduled?: number;
        completed?: number;
        displayMonth: string;
    }>;
    summary: {
        upcoming: number;
        overdue: number;
    };
    filterOptions?: {
        buildings: string[];
        locations: string[];
        products: { id: string; name: string }[];
        types: string[];
        subTypes: string[];
        hpStatuses: string[];
        manufacturers: { id: string; name: string }[];
        capacities: string[];
    };
}

export interface RefillStatusData {
    totalScheduled: number;
    totalCompleted: number;
    refillRate: number;
    cylinderUsageEfficiency: number;
    chartData: Array<{
        name?: string;
        month: string;
        completed: number;
        scheduled?: number;
        total: number;
        displayMonth: string;
    }>;
    summary: {
        totalAssets: number;
        totalCapacity: number;
        avgRefillsPerAsset: number;
    };
    filterOptions?: {
        buildings: string[];
        locations: string[];
        products: { id: string; name: string }[];
        types: string[];
        subTypes: string[];
        refillStatuses: string[];
        manufacturers: { id: string; name: string }[];
        capacities: string[];
    };
}

export interface AssetDistributionData {
    totalAssets: number;
    avgAgeingScore: number;
    avgConditionIndex: number;
    avgLifecycleRemaining: number;
    distributionByBuilding: Record<string, any>;
    distributionByType: Record<string, any>;
    ageGroups: {
        new: number;
        moderate: number;
        old: number;
    };
}

export interface TasksOverviewData {
    totalTasks: number;
    completedTasks: number;
    PENDINGTasks: number;
    inProgressTasks?: number;
    lapsedTasks?: number;
    waitingApprovalTasks?: number;
    rejectedTasks?: number;
    overdueTasks: number;
    overdueTaskBuckets?: {
        next3Days: number;
        next4to7Days: number;
        moreThan7Days: number;
    };
    taskCompletionEfficiency: number;
    productivityScore: number;
    overdueTaskSeverity: number;
    avgCompletionDays: number;
    serviceTypeBreakdown?: {
        maintenance: number;
        inspection: number;
        testing: number;
    };
    technicianPerformance: Array<{
        technicianId: string;
        name: string;
        performanceScore: number;
        completedTasks: number;
        totalTasks: number;
        PENDINGTasks?: number;
        overdueTasks?: number;
        onTimePercentage: number;
        efficiency?: number;
        rating?: number;
    }>;
    recentActivity: Array<{
        id: string;
        status: string;
        createdAt: string;
        scheduledDate?: string;
        technician: string;
        assetId?: string;
        assetTag?: string;
        assetType?: string;
        building?: string;
        serviceType?: string;
    }>;
}

export interface MaintenanceSummaryData {
    totalMaintenance: number;
    completedMaintenance: number;
    scheduledMaintenance: number;
    inProgressMaintenance: number;
    maintenanceEfficiency: number;
    delayRate: number;
    slaCompliance: number;
    categoryBreakdown: Array<{
        category: string;
        total: number;
        completed: number;
        efficiency: number;
        delayRate: number;
    }>;
    serviceTypeBreakdown: Record<string, any>;
    overdueTimeline?: Array<{
        date: string;
        thisMonth: number;
        lastMonth: number;
        count: number;
    }>;
    overdueTasks?: number;
}

export interface TechnicianPerformanceData {
    technicianPerformance: Array<{
        technicianId: string;
        name: string;
        performanceScore: number;
        completedTasks: number;
        totalTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        onTimePercentage: number;
        efficiency: number;
        rating: number;
    }>;
}

export interface TaskDistributionData {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    lapsedTasks: number;
    waitingApprovalTasks: number;
    rejectedTasks: number;
    overdueTasks: number;
    overdueTaskBuckets: {
        last3Days: number;
        last4to7Days: number;
        moreThan7Days: number;
    };
    taskCompletionEfficiency: number;
    productivityScore: number;
    overdueTaskSeverity: number;
    avgCompletionDays: number;
    serviceTypeBreakdown: {
        maintenance: number;
        inspection: number;
        testing: number;
    };
    recentActivity: Array<{
        id: string;
        status: string;
        createdAt: string;
        scheduledDate: string;
        technician: string;
        assetId: string;
        assetTag: string;
        assetType: string;
        building: string;
        serviceType: string;
    }>;
}

interface PumpIotDeviceResponse {
    success: boolean;
    message?: string;
    data: {
        pumpIotDeviceId: string | null;
    };
    error?: string;
}

interface PumpDashboardResponse {
    status: number;
    data: {
        plantData: {
            dieselStorage: number;
            headerPressure: number;
            mainWaterStorage: number;
            pressureUnit: string;
        };
        totalPumpAssets: number;
        totalPumpHealthyAssets: number;
        assets: Array<{
            id: string;
            productId: string;
            assetId: string;
            building: string;
            location: string;
            healthStatus: string;
            type: string;
            product: {
                productName: string;
                variants: any;
            };
        }>;
        lapsedServiceCount: number;
        totalServiceCount: number;
    };
}

interface ServiceDoneBy {
    name: string;
}

interface LastServiceActivity {
    date: string;
    serviceDoneBy: ServiceDoneBy | null;
}

interface LastFiveServiceActivity {
    assetsId: Array<{ assetId: string }>;
    serviceDoneBy: ServiceDoneBy | null;
    date: string;
    completedStatus: string;
}

interface ServiceTypeCount {
    _id: string;
    count: number;
}

interface CompletedStatusCount {
    _id: string;
    count: number;
}

interface PendingByRange {
    _id: string;
    count: number;
}

interface PumpKnowMoreResponse {
    totalOnHours: string;
    ageString: string;
    lastServiceActivity: LastServiceActivity | null;
    lastFiveServiceActivity: LastFiveServiceActivity[];
    serviceTypeCount: ServiceTypeCount[];
    completedStatusCount: CompletedStatusCount[];
    PENDINGByRange: PendingByRange[];
}

interface TrendHistoryItem {
    date: string;
    data: number | string;
}

interface WaterLevelTrendResponse {
    WLSHistory: TrendHistoryItem[];
    avgWLS: number;
    maxWLS: number;
    startDate: string;
    endDate: string;
}

interface DieselLevelTrendResponse {
    DLSHistory: TrendHistoryItem[];
    avgDLS: number;
    maxDLS: number;
    startDate: string;
    endDate: string;
}

interface HeaderPressureTrendResponse {
    PLSHistory: TrendHistoryItem[];
    avgPLS: number;
    maxPLS: number;
    headerPressureUnit: string | null;
    startDate: string;
    endDate: string;
}

type TrendTimeframe = "Day" | "Week" | "Last 30 Days";

interface TrendRequestParams {
    plantId: string;
    categoryId: string;
    timeframe: TrendTimeframe;
}

export interface AutoManualStatusDataPoint {
    timestamp: string;
    status: number;
    [key: string]: any;
}


export const dashboardApi = {
    /**
     * Helper to clean parameters (remove undefined/null/empty strings)
     */
    cleanParams: (params: Record<string, any> = {}) => {
        const cleaned: Record<string, any> = {};
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '' && value !== 'undefined' && value !== 'null') {
                cleaned[key] = value;
            }
        });
        return cleaned;
    },

    /**
     * Get system health overview
     */
    getSystemHealth: async (filters?: {
        plantId?: string;
        startDate?: string;
        endDate?: string;
        building?: string;
        buildingId?: string;
        categoryId?: string;
        productId?: string;
        type?: string;
        capacity?: string;
        granularity?: 'day' | 'week' | 'month';
    }): Promise<SystemHealthData> => {
        // Strict parameter selection
        const params = dashboardApi.cleanParams({
            plantId: filters?.plantId,
            startDate: filters?.startDate,
            endDate: filters?.endDate,
            building: filters?.building,
            buildingId: filters?.buildingId,
            categoryId: filters?.categoryId,
            productId: filters?.productId,
            type: filters?.type,
            capacity: filters?.capacity,
            granularity: filters?.granularity
        });
        const response = await api.get('/dashboard/system/health', { params });
        return response as SystemHealthData;
    },

    /**
     * Get hydrostatic test overview
     */
    getHydrostaticTests: async (filters?: {
        plantId?: string;
        building?: string;
        buildingId?: string;
        location?: string;
        categoryId?: string;
        productId?: string;
        type?: string;
        subType?: string;
        hpStatus?: string;
        capacity?: string;
        startDate?: string;
        endDate?: string;
        groupBy?: 'building' | 'location' | 'product' | 'type' | 'subType' | 'hpStatus' | 'month';
        granularity?: 'day' | 'week' | 'month';
    }): Promise<HydrostaticTestData> => {
        const params = dashboardApi.cleanParams({
            plantId: filters?.plantId,
            building: filters?.building,
            buildingId: filters?.buildingId,
            location: filters?.location,
            categoryId: filters?.categoryId,
            productId: filters?.productId,
            type: filters?.type,
            subType: filters?.subType,
            hpStatus: filters?.hpStatus,
            capacity: filters?.capacity,
            startDate: filters?.startDate,
            endDate: filters?.endDate,
            groupBy: filters?.groupBy,
            granularity: filters?.granularity
        });
        const response = await api.get('/dashboard/tests/hydrostatic', { params });
        return response as HydrostaticTestData;
    },

    /**
     * Get refill status summary
     */
    getRefillStatus: async (filters?: {
        plantId?: string;
        building?: string;
        buildingId?: string;
        location?: string;
        categoryId?: string;
        productId?: string;
        type?: string;
        subType?: string;
        refillStatus?: string;
        capacity?: string;
        startDate?: string;
        endDate?: string;
        groupBy?: 'building' | 'location' | 'product' | 'type' | 'subType' | 'refillStatus' | 'month';
        granularity?: 'day' | 'week' | 'month';
    }): Promise<RefillStatusData> => {
        const params = dashboardApi.cleanParams({
            plantId: filters?.plantId,
            building: filters?.building,
            buildingId: filters?.buildingId,
            location: filters?.location,
            categoryId: filters?.categoryId,
            productId: filters?.productId,
            type: filters?.type,
            subType: filters?.subType,
            refillStatus: filters?.refillStatus,
            capacity: filters?.capacity,
            startDate: filters?.startDate,
            endDate: filters?.endDate,
            groupBy: filters?.groupBy,
            granularity: filters?.granularity
        });
        const response = await api.get('/dashboard/refill/status', { params });
        return response as RefillStatusData;
    },

    /**
     * Get asset distribution
     */
    getAssetDistribution: async (filters?: {
        plantId?: string;
        categoryId?: string;
        building?: string;
        floor?: string;
        status?: string;
        healthStatus?: string;
        productId?: string;
        type?: string;
        capacity?: string;
    }): Promise<AssetDistributionData> => {
        const params = dashboardApi.cleanParams({
            plantId: filters?.plantId,
            categoryId: filters?.categoryId,
            building: filters?.building,
            floor: filters?.floor,
            status: filters?.status,
            healthStatus: filters?.healthStatus,
            productId: filters?.productId,
            type: filters?.type,
            capacity: filters?.capacity
        });
        const response = await api.get('/dashboard/assets/distribution', { params });
        return response as AssetDistributionData;
    },

    /**
     * Get tasks overview
     */
    getTasksOverview: async (filters?: {
        plantId?: string;
        buildingId?: string;
        categoryId?: string;
        productId?: string;
        type?: string;
        capacity?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<TasksOverviewData> => {
        const params = dashboardApi.cleanParams({
            plantId: filters?.plantId,
            buildingId: filters?.buildingId,
            categoryId: filters?.categoryId,
            productId: filters?.productId,
            type: filters?.type,
            capacity: filters?.capacity,
            startDate: filters?.startDate,
            endDate: filters?.endDate
        });
        const response = await api.get('/dashboard/tasks/overview', { params });
        return response as TasksOverviewData;
    },

    /**
     * Get maintenance summary
     */
    getMaintenanceSummary: async (filters?: {
        plantId?: string;
        categoryId?: string;
        serviceType?: string;
        productId?: string;
        type?: string;
        capacity?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<MaintenanceSummaryData> => {
        const params = dashboardApi.cleanParams({
            plantId: filters?.plantId,
            categoryId: filters?.categoryId,
            serviceType: filters?.serviceType,
            productId: filters?.productId,
            type: filters?.type,
            capacity: filters?.capacity,
            startDate: filters?.startDate,
            endDate: filters?.endDate
        });
        const response = await api.get('/dashboard/maintenance/summary', { params });
        return response as MaintenanceSummaryData;
    },

    /**
     * Get technician performance metrics (separated for performance)
     */
    getTechnicianPerformance: async (filters?: {
        plantId?: string;
        buildingId?: string;
        categoryId?: string;
        productId?: string;
        type?: string;
        capacity?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<TechnicianPerformanceData> => {
        const params = dashboardApi.cleanParams({
            plantId: filters?.plantId,
            buildingId: filters?.buildingId,
            categoryId: filters?.categoryId,
            productId: filters?.productId,
            type: filters?.type,
            capacity: filters?.capacity,
            startDate: filters?.startDate,
            endDate: filters?.endDate
        });
        const response = await api.get('/dashboard/technician/performance', { params });
        return response as TechnicianPerformanceData;
    },

    /**
     * Get task distribution and statistics (separated for performance)
     */
    getTaskDistribution: async (filters?: {
        plantId?: string;
        buildingId?: string;
        categoryId?: string;
        productId?: string;
        type?: string;
        capacity?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<TaskDistributionData> => {
        const params = dashboardApi.cleanParams({
            plantId: filters?.plantId,
            buildingId: filters?.buildingId,
            categoryId: filters?.categoryId,
            productId: filters?.productId,
            type: filters?.type,
            capacity: filters?.capacity,
            startDate: filters?.startDate,
            endDate: filters?.endDate
        });
        const response = await api.get('/dashboard/tasks/distribution', { params });
        return response as TaskDistributionData;
    },

    /**
     * Get categories available in a specific plant (dynamic filter)
     */
    getCategoriesByPlant: async (plantId?: string): Promise<Array<{ id: string; categoryName: string }>> => {
        if (!plantId || plantId === 'all') {
            return [];
        }
        const response = await api.post('/dashboard/get-categories-by-plant', {
            plantId
        });
        return response as Array<{ id: string; categoryName: string }>;
    },

    /**
     * Get products by plant and category (dynamic filter)
     */
    getProductsByPlantAndCategory: async (plantId?: string, categoryId?: string): Promise<Array<{ _id: string; productName: string }>> => {
        console.log('[API] getProductsByPlantAndCategory called with:', { plantId, categoryId });
        if (!plantId || !categoryId || plantId === 'all' || categoryId === 'all') {
            console.log('[API] Returning empty array - invalid parameters');
            return [];
        }
        const response = await api.post('/dashboard/get-products-by-plant-and-category', {
            plantId,
            categoryId
        });
        console.log('[API] getProductsByPlantAndCategory response:', response);
        return response as Array<{ _id: string; productName: string }>;
    },

    /**
     * Get types by plant and category (dynamic filter)
     */
    getTypesByPlantAndCategory: async (plantId?: string, categoryId?: string): Promise<string[]> => {
        console.log('[API] getTypesByPlantAndCategory called with:', { plantId, categoryId });
        if (!plantId || !categoryId || plantId === 'all' || categoryId === 'all') {
            console.log('[API] Returning empty array - invalid parameters');
            return [];
        }
        const response = await api.post('/dashboard/get-types-by-plant-and-category', {
            plantId,
            categoryId
        });
        console.log('[API] getTypesByPlantAndCategory response:', response);
        return response as string[];
    },

    /**
     * Get capacities by plant and category (dynamic filter)
     */
    getCapacitiesByPlantAndCategory: async (plantId?: string, categoryId?: string): Promise<string[]> => {
        console.log('[API] getCapacitiesByPlantAndCategory called with:', { plantId, categoryId });
        if (!plantId || !categoryId || plantId === 'all' || categoryId === 'all') {
            console.log('[API] Returning empty array - invalid parameters');
            return [];
        }
        const response = await api.post('/dashboard/get-capacitys-by-plant-and-category', {
            plantId,
            categoryId
        });
        console.log('[API] getCapacitiesByPlantAndCategory response:', response);
        return response as string[];
    },

    /**
     * Get locations by building (dynamic filter - cascades from building)
     */
    getLocationsByBuilding: async (plantId?: string, buildingId?: string): Promise<Array<{ id: string; locationName: string }>> => {
        console.log('[API] getLocationsByBuilding called with:', { plantId, buildingId });
        if (!plantId || !buildingId || plantId === 'all' || buildingId === 'all') {
            console.log('[API] Returning empty array - invalid parameters');
            return [];
        }
        const response = await api.post('/dashboard/get-locations-by-building', {
            plantId,
            buildingId
        });
        console.log('[API] getLocationsByBuilding response:', response);
        return response as Array<{ id: string; locationName: string }>;

    },

    /**
     * Get subtypes by type (dynamic filter - cascades from type)
     */
    getSubTypesByType: async (plantId?: string, categoryId?: string, type?: string): Promise<string[]> => {
        console.log('[API] getSubTypesByType called with:', { plantId, categoryId, type });
        if (!plantId || !categoryId || !type || plantId === 'all' || categoryId === 'all' || type === 'all') {
            console.log('[API] Returning empty array - invalid parameters');
            return [];
        }
        const response = await api.post('/dashboard/get-subtypes-by-type', {
            plantId,
            categoryId,
            type
        });
        console.log('[API] getSubTypesByType response:', response);
        return response as string[];
    },

    /**
     * Get manufacturers by category (dynamic filter)
     */
    getManufacturersByCategory: async (plantId?: string, categoryId?: string): Promise<string[]> => {
        console.log('[API] getManufacturersByCategory called with:', { plantId, categoryId });
        if (!plantId || !categoryId || plantId === 'all' || categoryId === 'all') {
            console.log('[API] Returning empty array - invalid parameters');
            return [];
        }
        const response = await api.post('/dashboard/get-manufacturers-by-category', {
            plantId,
            categoryId
        });
        console.log('[API] getManufacturersByCategory response:', response);
        return response as string[];
    },

    /**
     * Get all assets for filtering (client-side cascading)
     */
    getAllAssetsForFiltering: async (plantId?: string, categoryId?: string): Promise<{ assets: any[], categoryName: string | null }> => {
        console.log('[API] getAllAssetsForFiltering called with:', { plantId, categoryId });
        if (!plantId || !categoryId || plantId === 'all' || categoryId === 'all') {
            console.log('[API] Returning empty response - invalid parameters');
            return { assets: [], categoryName: null };
        }
        const response = await api.post('/dashboard/get-all-assets-for-filtering', {
            plantId,
            categoryId
        });
        console.log('[API] getAllAssetsForFiltering response:', response);
        return response as { assets: any[], categoryName: string | null };
    },
    /**
     * Generate maintenance report PDF
     */
    generateReport: async (params: {
        startDate: string;
        endDate: string;
        columns?: string;
        plantId?: string;
        categoryId?: string;
        serviceType?: string;
        buildingId?: string;
    }): Promise<Blob> => {
        const apiUrl = (import.meta as any).env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
        const token = localStorage.getItem('accessToken');

        // Use the centralized cleaner
        const cleanParams = dashboardApi.cleanParams(params);

        const response = await fetch(`${apiUrl}/dashboard/reports/maintenance?${new URLSearchParams(cleanParams)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            // Try to get error details from response
            let errorMessage = `Failed to generate report (${response.status})`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch {
                errorMessage = `${errorMessage}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        return response.blob();
    },

    /**
     * Generate HP Test Report PDF
     */
    generateHPTestReport: async (params: { startDate: string; endDate: string; plantId?: string; plantIds?: string; categoryId?: string; buildings?: string; columns?: string }): Promise<Blob> => {
        const apiUrl = (import.meta as any).env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
        const token = localStorage.getItem('accessToken');
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null && v !== '')
        );
        const response = await fetch(`${apiUrl}/dashboard/reports/hp-test?${new URLSearchParams(cleanParams as any)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to generate HP test report');
        return response.blob();
    },

    /**
     * Generate Refill Status Report PDF
     */
    generateRefillReport: async (params: { startDate: string; endDate: string; plantId?: string; plantIds?: string; categoryId?: string; columns?: string }): Promise<Blob> => {
        const apiUrl = (import.meta as any).env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
        const token = localStorage.getItem('accessToken');
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null && v !== '')
        );
        const response = await fetch(`${apiUrl}/dashboard/reports/refill?${new URLSearchParams(cleanParams as any)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to generate refill report');
        return response.blob();
    },

    /**
     * Generate Service Report PDF (Maintenance, Inspection, or Testing)
     */
    generateServiceReport: async (params: { startDate: string; endDate: string; inspectionType: string; plantId?: string; plantIds?: string; categoryId?: string; columns?: string }): Promise<Blob> => {
        const apiUrl = (import.meta as any).env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
        const token = localStorage.getItem('accessToken');
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null && v !== '')
        );
        const response = await fetch(`${apiUrl}/dashboard/reports/service?${new URLSearchParams(cleanParams as any)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to generate service report');
        return response.blob();
    },

    /**
     * Get admin stats (Aggregated counts)
     */
    getAdminStats: async (): Promise<any> => {
        try {
            const endpoints = [
                api.get('/master-data/industries', { params: { limit: 1 } }),
                api.get('/master-data/categories', { params: { limit: 1 } }),
                api.get('/master-data/products', { params: { limit: 1 } }),
                api.get('/plants', { params: { limit: 1 } }),
                api.get('/assets', { params: { limit: 1 } }),
                api.get('/users', { params: { limit: 1 } }), // Users
                api.get('/managers', { params: { limit: 1 } }), // Managers
                api.get('/technicians', { params: { limit: 1 } }), // Technicians
                api.get('/service-forms/forms', { params: { limit: 1 } }),
                api.get('/roles', { params: { limit: 1 } }),
                api.get('/floorplan-hierarchy').catch(() => ({ data: [] })), // Floorplan hierarchy
                api.get('/api/manager/tickets').catch(() => ({ tickets: [] })), // Tickets
            ];

            const results = await Promise.allSettled(endpoints);

            const getCount = (result: PromiseSettledResult<any>) => {
                if (result.status === 'rejected') return 0;
                const data = result.value;
                if (data.pagination?.total !== undefined) return data.pagination.total;
                if (data.total !== undefined) return data.total;
                if (data.count !== undefined) return data.count;

                // Handle different array structures
                if (data.allCategory && Array.isArray(data.allCategory)) return data.allCategory.length;
                if (data.products && Array.isArray(data.products)) return data.products.length;
                if (data.floorplans && Array.isArray(data.floorplans)) return data.floorplans.length;
                if (data.tickets && Array.isArray(data.tickets)) return data.tickets.length;
                if (data.data && Array.isArray(data.data)) return data.data.length;

                if (Array.isArray(data)) return data.length;
                return 0;
            };

            // Special handler for floorplan hierarchy - count floors with layouts
            const getFloorplanCount = (result: PromiseSettledResult<any>) => {
                if (result.status === 'rejected') return 0;
                const data = result.value;
                const plants = data.data || data || [];
                if (!Array.isArray(plants)) return 0;

                let floorplanCount = 0;
                plants.forEach((plant: any) => {
                    const buildings = plant.buildings || [];
                    buildings.forEach((building: any) => {
                        const floors = building.floors || [];
                        floors.forEach((floor: any) => {
                            if (floor.hasFloorplan || floor.layoutId) {
                                floorplanCount++;
                            }
                        });
                    });
                });
                return floorplanCount;
            };

            return {
                success: true,
                totalIndustries: getCount(results[0]),
                totalCategories: getCount(results[1]),
                totalProducts: getCount(results[2]),
                totalPlants: getCount(results[3]),
                totalAssets: getCount(results[4]),
                totalUsers: getCount(results[5]),
                totalManagers: getCount(results[6]),
                totalTechnicians: getCount(results[7]),
                totalForms: getCount(results[8]),
                totalRoles: getCount(results[9]),
                totalFloorplans: getFloorplanCount(results[10]),
                totalTickets: getCount(results[11]),
            };
        } catch (error) {
            console.error("Error fetching admin stats:", error);
            return { success: false, error };
        }
    },

    /**
     * Get recent system activities (Mock/Aggregated)
     */
    getRecentActivities: async (limit: number = 5): Promise<any> => {
        try {
            return {
                success: true,
                activities: []
            };
        } catch (error) {
            return { success: false, activities: [] };
        }
    },

    /**
     * Get system status (Client-side check)
     */
    getSystemStatus: async (): Promise<any> => {
        try {
            await api.get('/auth/me'); // Lightweight check
            return {
                success: true,
                status: {
                    system: { status: 'operational', message: 'All systems operational', lastChecked: new Date().toISOString() },
                    database: { status: 'operational', message: 'Database connected', lastChecked: new Date().toISOString() },
                    api: { status: 'operational', message: 'API validation successful', lastChecked: new Date().toISOString() }
                }
            };
        } catch (error) {
            return {
                success: true,
                status: {
                    system: { status: 'degraded', message: 'System connectivity issues', lastChecked: new Date().toISOString() },
                    database: { status: 'unknown', message: 'Connection verification failed', lastChecked: new Date().toISOString() },
                    api: { status: 'error', message: 'API unreachable', lastChecked: new Date().toISOString() }
                }
            };
        }
    },
};

export const pumpRoomApi = {
    /**
     * Get IoT device ID for a specific plant
     */
    getPumpIotDeviceIdByPlant: async (plantId: string): Promise<PumpIotDeviceResponse> => {
        return api.get<PumpIotDeviceResponse>(`/dashboard/get-pump-iot-device-id-by-plant/${plantId}`);
    },

    /**
     * Get pump dashboard data including plant data and assets
     */

    getPumpDashboardData: async (params: { plantId: string; categoryId: string; deviceCode?: string }): Promise<PumpDashboardResponse> => {
        const data = await api.post<any>('/dashboard/get-pump-dashboard-data', {
            plantId: params.plantId,
            categoryId: params.categoryId,
            ...(params.deviceCode && { deviceCode: params.deviceCode })
        });

        return {
            status: 200, // api.post returns data directly, assuming 200 if no throw
            data,
        };
    },

    /**
     * Get pump room data (alias for getPumpDashboardData for backward compatibility)
     */
    getPumpRoomData: async (plantId: string, categoryId: string, deviceCode?: string) => {
        console.log('[API] getPumpRoomData called with deviceCode:', deviceCode);
        return await pumpRoomApi.getPumpDashboardData({ plantId, categoryId, deviceCode });
    },

    getPumpConditionLogData: async (params: {
        selectedAsset: string;
        timeframe?: 'Day' | 'Week' | 'Month';
        startDate?: string;
        endDate?: string;
    }) => {
        return api.post('/dashboard/pump/condition-log', params);
    },

    /**
     * Get pump runtime data
     */
    getPumpRuntimeData: async (params: {
        selectedAsset: string;
        timeframe: 'Day' | 'Week' | 'Month';
    }) => {
        return api.post('/dashboard/pump/runtime-data', params);
    },

    /**
     * Get pump auto/manual status data
     */
    getPumpAutoManualStatusData: async (params: {
        selectedAsset: string;
        timeframe?: 'Day' | 'Week' | 'Month';
        startDate?: string;
        endDate?: string;
    }) => {
        return api.post('/dashboard/pump/auto-manual-status', params);
    },

    /**
     * Get pump auto/manual duration data
     */
    getPumpAutoManualDurationData: async (params: {
        selectedAsset: string;
        timeframe: 'Day' | 'Week' | 'Month';
    }) => {
        return api.post('/dashboard/pump/auto-manual-duration', params);
    },
    getPumpKnowMoreData: async (params: {
        assetId: string;
    }): Promise<PumpKnowMoreResponse> => {
        return api.post<PumpKnowMoreResponse>('/dashboard/pump/know-more', params);
    },
    getWaterLevelTrend: async (params: TrendRequestParams): Promise<WaterLevelTrendResponse> => {
        return api.post<WaterLevelTrendResponse>('/dashboard/pump/water-level-trend', params);
    },

    /**
     * Get diesel level trend data (DLS - Diesel Level Sensor)
     */
    getDieselLevelTrend: async (params: TrendRequestParams): Promise<DieselLevelTrendResponse> => {
        return api.post<DieselLevelTrendResponse>('/dashboard/pump/diesel-level-trend', params);
    },

    /**
     * Get header pressure trend data (PLS - Pressure Level Sensor)
     */
    getHeaderPressureTrend: async (params: TrendRequestParams): Promise<HeaderPressureTrendResponse> => {
        return api.post<HeaderPressureTrendResponse>('/dashboard/pump/header-pressure-trend', params);
    },
};
