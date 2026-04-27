import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, SystemHealthData } from '@/services/api/dashboardApi';

export interface SystemOverviewFilters {
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
}

export function useSystemHealthData(filters: SystemOverviewFilters = {}) {
    const [data, setData] = useState<SystemHealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        // Guard: Don't fetch if plantId is missing
        if (!filters.plantId || filters.plantId === '') {
            console.log('[useSystemHealthData] Skipping fetch - no plantId');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            console.log('[useSystemHealthData] Fetching system health with filters:', filters);

            const systemHealth = await dashboardApi.getSystemHealth(filters).catch((err) => {
                console.error('getSystemHealth error:', err);
                return null;
            });

            setData(systemHealth);
        } catch (err) {
            console.error('System health data loading error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load system health data');
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(filters)]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const refresh = useCallback(() => {
        return loadData();
    }, [loadData]);

    return {
        data,
        loading,
        error,
        refresh,
    };
}
