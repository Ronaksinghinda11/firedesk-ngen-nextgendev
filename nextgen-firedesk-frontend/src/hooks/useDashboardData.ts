import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '@/services/api/dashboardApi';
import { useApiCache } from './useApiCache';
import type {
    SystemHealthData,
    HydrostaticTestData,
    RefillStatusData,
    AssetDistributionData,
    // TasksOverviewData,
    MaintenanceSummaryData
} from '@/services/api/dashboardApi';

// OPTIMIZATION NOTE:
// - getSystemHealth() is NOT called here — it's called by useSystemHealthData hook (used by SystemOverview).
//   PremiumDashboard passes systemHealthData into SystemOverview via data={{ ...dashboardData, systemHealth: systemHealthData }}.
// - getAssetDistribution() is NOT called here — the AssetDistribution widget calls getAllAssetsForFiltering() directly.
//   The old call was wasted (response stored but never consumed by any widget).

export interface DashboardFilters {
    plantId?: string;
    startDate?: string;
    endDate?: string;
    building?: string;
    buildingId?: string;
    categoryId?: string;
    serviceType?: string;
    granularity?: 'day' | 'week' | 'month';
    productId?: string;
    type?: string;
    capacity?: string;
}

export interface DashboardData {
    systemHealth: SystemHealthData | null;
    hydrostaticTests: HydrostaticTestData | null;
    refillStatus: RefillStatusData | null;
    assetDistribution: AssetDistributionData | null;
    // tasksOverview: TasksOverviewData | null;
    maintenanceSummary: MaintenanceSummaryData | null;
}

export interface LoadingStates {
    systemHealth: boolean;
    hydrostaticTests: boolean;
    refillStatus: boolean;
    assetDistribution: boolean;
    maintenanceSummary: boolean;
    technicianPerformance: boolean;
    global: boolean;
}

// Helper: Check if category needs hydrostatic/refill data (only Fire Extinguisher category)
// Note: Using categoryId check - Fire Extinguisher categoryId is typically 'fac0334b-3720-416e-b5d9-f8f9ba14764c'
// but we use a name-based check for reliability
function shouldFetchHydrostaticRefill(categoryId: string): boolean {
    // This will be true for Fire Extinguisher category
    // You can add the actual categoryId here if you know it
    // For now, we'll fetch for all categories and let the widgets handle display logic
    // TODO: Update with actual Fire Extinguisher categoryId check
    return categoryId === 'fac0334b-3720-416e-b5d9-f8f9ba14764c'; // Fire Extinguisher ID
}

export function useDashboardData(filters: DashboardFilters) {
    // Initialize caching
    const cache = useApiCache<any>();

    const [data, setData] = useState<DashboardData>({
        systemHealth: null,
        hydrostaticTests: null,
        refillStatus: null,
        assetDistribution: null,
        maintenanceSummary: null,
    });

    const [loadingStates, setLoadingStates] = useState<LoadingStates>({
        systemHealth: true,
        hydrostaticTests: true,
        refillStatus: true,
        assetDistribution: true,
        maintenanceSummary: true,
        technicianPerformance: true,
        global: true,
    });

    const [error, setError] = useState<string | null>(null);

    const loadDashboardData = useCallback(async () => {
        // Guard: Don't fetch if critical filters are missing
        if (!filters.plantId || filters.plantId === '') {
            console.log('[useDashboard Data] Skipping dashboard data fetch - no plantId');
            return;
        }

        // Check cache first
        const cachedData = cache.get(filters);
        if (cachedData) {
            console.log('[useDashboardData] Using cached data');
            setData(cachedData);
            setLoadingStates({
                systemHealth: false,
                hydrostaticTests: false,
                refillStatus: false,
                assetDistribution: false,
                maintenanceSummary: false,
                technicianPerformance: false,
                global: false,
            });
            return;
        }

        // Reset loading states to true
        // Note: systemHealth and assetDistribution are NOT fetched here (see optimization note above)
        setLoadingStates(prev => ({
            ...prev,
            systemHealth: false,         // Fetched by useSystemHealthData hook, not here
            hydrostaticTests: true,
            refillStatus: true,
            assetDistribution: false,    // AssetDistribution widget fetches its own data via getAllAssetsForFiltering
            maintenanceSummary: true,
            technicianPerformance: true,
            global: true,
        }));
        setError(null);

        console.log('[useDashboardData] Loading dashboard data with filters:', filters);

        // Hydrostatic and Refill are ONLY for Fire Extinguishers
        // For other categories, resolve immediately to avoid unnecessary API calls
        const fetchHydrostatic = filters.categoryId && shouldFetchHydrostaticRefill(filters.categoryId)
            ? dashboardApi.getHydrostaticTests({
                ...filters,
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                granularity: 'month' as const
            })
                .then(res => {
                    setData(prev => ({ ...prev, hydrostaticTests: res }));
                    setLoadingStates(prev => ({ ...prev, hydrostaticTests: false }));
                })
                .catch(err => {
                    console.error('getHydrostaticTests error:', err);
                    setLoadingStates(prev => ({ ...prev, hydrostaticTests: false }));
                })
            : Promise.resolve().then(() => {
                setData(prev => ({ ...prev, hydrostaticTests: null }));
                setLoadingStates(prev => ({ ...prev, hydrostaticTests: false }));
            });

        // Refill is ONLY for Fire Extinguishers
        const fetchRefill = filters.categoryId && shouldFetchHydrostaticRefill(filters.categoryId)
            ? dashboardApi.getRefillStatus({
                ...filters,
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                granularity: 'month' as const
            })
                .then(res => {
                    setData(prev => ({ ...prev, refillStatus: res }));
                    setLoadingStates(prev => ({ ...prev, refillStatus: false }));
                })
                .catch(err => {
                    console.error('getRefillStatus error:', err);
                    setLoadingStates(prev => ({ ...prev, refillStatus: false }));
                })
            : Promise.resolve().then(() => {
                setData(prev => ({ ...prev, refillStatus: null }));
                setLoadingStates(prev => ({ ...prev, refillStatus: false }));
            });

        const fetchMaintenance = dashboardApi.getMaintenanceSummary({ ...filters, serviceType: filters.serviceType || 'maintenance' })
            .then(res => {
                setData(prev => ({ ...prev, maintenanceSummary: res }));
                setLoadingStates(prev => ({ ...prev, maintenanceSummary: false }));
            })
            .catch(err => {
                console.error('getMaintenanceSummary error:', err);
                setLoadingStates(prev => ({ ...prev, maintenanceSummary: false }));
            });

        // OPTIMIZED: Reduced from 5 to max 3 API calls per filter change
        // - getSystemHealth removed (handled by useSystemHealthData hook)
        // - getAssetDistribution removed (AssetDistribution widget fetches its own data)

        console.log('[useDashboardData] Loading dashboard data in parallel (optimized: max 3 calls)');

        try {
            await Promise.allSettled([
                fetchHydrostatic,
                fetchRefill,
                fetchMaintenance
            ]);
            console.log('[useDashboardData] ✅ All data loaded');

        } catch (error) {
            console.error('[useDashboardData] Error during batched loading:', error);
        }

        // Store successful data in cache
        setData(currentData => {
            cache.set(filters, currentData);
            return currentData;
        });

        setLoadingStates(prev => ({ ...prev, global: false }));

    }, [filters, cache]);

    // Trigger data load when filters change
    useEffect(() => {
        // Only load if we have a valid plantId
        if (filters.plantId && filters.plantId !== '') {
            loadDashboardData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.plantId, filters.categoryId, filters.buildingId, filters.startDate, filters.endDate, filters.serviceType, filters.productId, filters.type, filters.capacity]);

    const refresh = useCallback(() => {
        // Clear cache to force fresh data fetch
        cache.clear();
        console.log('[useDashboardData] Cache cleared - forcing fresh data fetch');
        return loadDashboardData();
    }, [loadDashboardData, cache]);

    return {
        data,
        loading: loadingStates.global, // Backward compatibility
        loadingStates,
        error,
        refresh,
    };
}
