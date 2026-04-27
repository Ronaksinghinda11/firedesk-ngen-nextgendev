/**
 * useWidgetSize Hook
 * Manages widget size preferences with localStorage persistence
 */

import { useCallback } from 'react';
import type { WidgetSize } from '../utils/widgetSizeUtils';

const STORAGE_KEY = 'dashboard-widget-sizes';

interface WidgetSizePreferences {
    [key: string]: WidgetSize; // key format: userId-role-widgetId
}

export function useWidgetSize(userId?: string, role: 'admin' | 'manager' = 'admin') {
    const getStorageKey = useCallback(
        (widgetId: string) => {
            return `${userId || 'default'}-${role}-${widgetId}`;
        },
        [userId, role]
    );

    const getWidgetSize = useCallback(
        (widgetId: string, defaultSize: WidgetSize = 'half'): WidgetSize => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (!stored) return defaultSize;

                const preferences: WidgetSizePreferences = JSON.parse(stored);
                const key = getStorageKey(widgetId);
                return preferences[key] || defaultSize;
            } catch (error) {
                console.error('Error reading widget size preferences:', error);
                return defaultSize;
            }
        },
        [getStorageKey]
    );

    const setWidgetSize = useCallback(
        (widgetId: string, size: WidgetSize) => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                const preferences: WidgetSizePreferences = stored ? JSON.parse(stored) : {};

                const key = getStorageKey(widgetId);
                preferences[key] = size;

                localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
            } catch (error) {
                console.error('Error saving widget size preference:', error);
            }
        },
        [getStorageKey]
    );

    return {
        getWidgetSize,
        setWidgetSize,
    };
}
