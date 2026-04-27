/**
 * useChartPreferences Hook
 * Manages chart type preferences with localStorage persistence
 */

import { useState, useCallback, useEffect } from 'react';
import type { ChartType } from '../components/ChartTypeSwitcher';

interface ChartPreferences {
    [widgetId: string]: ChartType;
}

const DEFAULT_CHART_TYPE: ChartType = 'bar';

export function useChartPreferences(userId?: string, role?: string) {
    const storageKey = `chartPreferences_${userId || 'guest'}_${role || 'user'}`;

    const [preferences, setPreferences] = useState<ChartPreferences>(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading chart preferences:', error);
            return {};
        }
    });

    // Save preferences to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(preferences));
        } catch (error) {
            console.error('Error saving chart preferences:', error);
        }
    }, [preferences, storageKey]);

    const getChartType = useCallback(
        (widgetId: string): ChartType => {
            return preferences[widgetId] || DEFAULT_CHART_TYPE;
        },
        [preferences]
    );

    const setChartType = useCallback(
        (widgetId: string, chartType: ChartType) => {
            setPreferences((prev) => ({
                ...prev,
                [widgetId]: chartType,
            }));
        },
        []
    );

    const resetChartType = useCallback(
        (widgetId: string) => {
            setPreferences((prev) => {
                const updated = { ...prev };
                delete updated[widgetId];
                return updated;
            });
        },
        []
    );

    const resetAllPreferences = useCallback(() => {
        setPreferences({});
    }, []);

    return {
        getChartType,
        setChartType,
        resetChartType,
        resetAllPreferences,
    };
}
