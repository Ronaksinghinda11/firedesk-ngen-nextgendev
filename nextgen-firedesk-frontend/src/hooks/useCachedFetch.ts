import { useState, useEffect, useRef, useCallback } from 'react';

interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

interface UseCachedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic hook: fetch + localStorage cache + polling + AbortController.
 *
 * - On mount, check localStorage for cached data.
 * - If cache exists and age < staleTimeMs → use cache, skip initial fetch.
 * - Fetch with AbortController; store result in localStorage with timestamp.
 * - If pollIntervalMs → setInterval refetch, clear on unmount.
 * - loading: true only on FIRST load (no cache), false on subsequent polls.
 * - On error keeps showing last good data.
 */
export function useCachedFetch<T>(
  url: string,
  cacheKey: string,
  staleTimeMs: number,
  pollIntervalMs?: number,
): UseCachedFetchResult<T> {
  const [data, setData] = useState<T | null>(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const entry: CachedEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.timestamp < staleTimeMs) {
          return entry.data;
        }
      }
    } catch {
      /* corrupted cache – ignore */
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    // Only true when there's no cached data at all
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const entry: CachedEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.timestamp < staleTimeMs) {
          return false;
        }
      }
    } catch {
      /* ignore */
    }
    return true;
  });

  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const firstLoadDone = useRef(data !== null);

  const doFetch = useCallback(async () => {
    // Check cache freshness before hitting the network
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const entry: CachedEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.timestamp < staleTimeMs) {
          if (mountedRef.current) {
            setData(entry.data);
            setLoading(false);
            firstLoadDone.current = true;
          }
          return;
        }
      }
    } catch {
      /* ignore */
    }

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      const payload: T = json.data ?? json;

      if (mountedRef.current) {
        setData(payload);
        setError(null);
        firstLoadDone.current = true;
        setLoading(false);

        // Persist to localStorage
        const entry: CachedEntry<T> = { data: payload, timestamp: Date.now() };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch {
          /* quota exceeded – ignore */
        }
      }
    } catch (err: unknown) {
      if ((err as DOMException)?.name === 'AbortError') return;
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Fetch failed');
        // Keep showing last good data
        if (!firstLoadDone.current) setLoading(false);
      }
    }
  }, [url, cacheKey, staleTimeMs]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    doFetch();

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [doFetch]);

  // Polling
  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs <= 0) return;

    const id = setInterval(() => {
      doFetch();
    }, pollIntervalMs);

    return () => {
      clearInterval(id);
    };
  }, [doFetch, pollIntervalMs]);

  return { data, loading, error, refetch: doFetch };
}

export default useCachedFetch;
