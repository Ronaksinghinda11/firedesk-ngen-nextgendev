/**
 * useWidgetLayout Hook
 * Manages widget visibility and order state with localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { WidgetId } from '../types/dashboard.types';
import { getDefaultWidgets } from '../config/widgetRegistry';

interface WidgetLayoutState {
  [key: string]: boolean;
}

// Default widget order
const DEFAULT_WIDGET_ORDER = [
  'system-overview',
  'task-overview',
  'technician-performance',
  'hydrostatic-test',
  'refill-status',
  'asset-distribution',
  'maintenance-overview',
  'pump-performance',
  'pump-support-system',
  'pump-trends',
];

/**
 * Custom hook for managing widget layout with persistence
 * @param userId - Current user ID
 * @param role - User role (admin or manager)
 * @returns { visibleWidgets, widgetOrder, toggleWidget, reorderWidgets, resetToDefaults }
 */
export function useWidgetLayout(
  userId: string | undefined,
  role: 'admin' | 'manager'
) {
  const storageKey = `dashboard-layout-${userId || 'default'}-${role}`;
  const orderStorageKey = `dashboard-order-${userId || 'default'}-${role}`;

  // Initialize with default widgets
  const getInitialState = (): WidgetLayoutState => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure new widgets are included
          return {
            'system-overview': true,
            'task-overview': true,
            'technician-performance': true,
            'hydrostatic-test': false,
            'refill-status': false,
            'asset-distribution': false,
            'maintenance-overview': false,
            'pump-performance': true,
            'pump-support-system': true,
            'pump-trends': true,
            ...parsed,
          };
        }
      } catch (error) {
        console.error('Failed to load widget layout from localStorage:', error);
      }
    }

    // Default state: show default widgets
    const initialState: WidgetLayoutState = {
      'system-overview': true,
      'task-overview': true,
      'technician-performance': true,
      'hydrostatic-test': false,
      'refill-status': false,
      'asset-distribution': false,
      'maintenance-overview': false,
      'pump-performance': true,
      'pump-support-system': true,
      'pump-trends': true,
    };

    return initialState;
  };

  // Initialize widget order
  const getInitialOrder = (): string[] => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(orderStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure new widgets are included
          const newWidgets = DEFAULT_WIDGET_ORDER.filter(w => !parsed.includes(w));
          return [...parsed, ...newWidgets];
        }
      } catch (error) {
        console.error('Failed to load widget order from localStorage:', error);
      }
    }
    return [...DEFAULT_WIDGET_ORDER];
  };

  // ... inside useWidgetLayout
  const sizeStorageKey = `dashboard-sizes-${userId || 'default'}-${role}`;

  const getInitialSizes = (): Record<string, number> => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(sizeStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_SIZES, ...parsed };
        }
      } catch (error) {
        console.error('Failed to load widget sizes:', error);
      }
    }
    return DEFAULT_SIZES;
  };

  const [visibleWidgets, setVisibleWidgets] = useState<WidgetLayoutState>(getInitialState);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(getInitialOrder);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, number>>(getInitialSizes);

  // Save sizes
  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      localStorage.setItem(sizeStorageKey, JSON.stringify(widgetSizes));
    }
  }, [widgetSizes, sizeStorageKey, userId]);

  // Persist state changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      localStorage.setItem(storageKey, JSON.stringify(visibleWidgets));
    }
  }, [visibleWidgets, storageKey, userId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      localStorage.setItem(orderStorageKey, JSON.stringify(widgetOrder));
    }
  }, [widgetOrder, orderStorageKey, userId]);

  // Toggle widget visibility
  const toggleWidget = useCallback((widgetId: WidgetId) => {
    setVisibleWidgets(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId],
    }));
  }, []);

  // Reorder widgets
  const reorderWidgets = useCallback((newOrder: string[]) => {
    setWidgetOrder(newOrder);
  }, []);

  // Update widget size
  const updateWidgetSize = useCallback((widgetId: string, size: number) => {
    setWidgetSizes(prev => ({
      ...prev,
      [widgetId]: size
    }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaultState = getInitialState();
    setVisibleWidgets(defaultState);
    setWidgetOrder([...DEFAULT_WIDGET_ORDER]);
    setWidgetSizes(DEFAULT_SIZES);

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(orderStorageKey);
      localStorage.removeItem(sizeStorageKey);
    }
  }, [storageKey, orderStorageKey, sizeStorageKey]);

  return {
    visibleWidgets,
    widgetOrder,
    widgetSizes,
    toggleWidget,
    reorderWidgets,
    updateWidgetSize,
    resetToDefaults,
  };
}

const DEFAULT_SIZES: Record<string, number> = {
  'system-overview': 12,
  'task-overview': 12,
  'technician-performance': 12,
  'hydrostatic-test': 12,
  'refill-status': 12,
  'asset-distribution': 12,
  'maintenance-overview': 12,
  'pump-performance': 12,
  'pump-support-system': 12,
  'pump-trends': 12,
};
