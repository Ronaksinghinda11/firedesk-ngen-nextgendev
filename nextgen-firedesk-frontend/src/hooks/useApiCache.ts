import { useMemo, useCallback, useRef } from 'react';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    filters: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useApiCache<T>() {
    const cache = useRef<Map<string, CacheEntry<T>>>(new Map());

    const getCacheKey = useCallback((filters: any): string => {
        return JSON.stringify(filters);
    }, []);

    const get = useCallback((filters: any): T | null => {
        const key = getCacheKey(filters);
        const entry = cache.current.get(key);

        if (!entry) return null;

        // Check if cache is expired
        if (Date.now() - entry.timestamp > CACHE_DURATION) {
            cache.current.delete(key);
            return null;
        }

        console.log('[useApiCache] Cache hit for filters:', filters);
        return entry.data;
    }, [getCacheKey]);

    const set = useCallback((filters: any, data: T) => {
        const key = getCacheKey(filters);
        cache.current.set(key, {
            data,
            timestamp: Date.now(),
            filters: key,
        });
        console.log('[useApiCache] Cached data for filters:', filters);
    }, [getCacheKey]);

    const clear = useCallback(() => {
        cache.current.clear();
        console.log('[useApiCache] Cache cleared');
    }, []);

    const clearOldEntries = useCallback(() => {
        const now = Date.now();
        for (const [key, entry] of cache.current.entries()) {
            if (now - entry.timestamp > CACHE_DURATION) {
                cache.current.delete(key);
            }
        }
    }, []);

    return { get, set, clear, clearOldEntries };
}
