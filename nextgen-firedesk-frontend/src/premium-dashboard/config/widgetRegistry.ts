/**
 * Widget Registry
 * Defines all available widgets and their configurations
 */

import {
  Activity,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Package,
  BarChart3,
  Wrench,
  Gauge,
  ChartNoAxesCombined,
} from 'lucide-react';
import { WidgetDefinition, WidgetId } from '../types/dashboard.types';

/**
 * Keywords that identify a "Pump Room" category regardless of exact naming.
 * Matches: 'Pump Room', 'pump room', 'Fire Fighting Pumps', 'Fire Pump',
 *          'Firefighting Pump', 'Pumps', etc.
 * To support a new naming convention, just add a keyword here.
 */
export const PUMP_ROOM_KEYWORDS = [
  'pump room',
  'fire fighting pump',
  'firefighting pump',
  'fire pump',
  'pump',
];

export function isPumpRoomCategory(categoryName: string | null | undefined): boolean {
  if (!categoryName) return false;
  const lower = categoryName.toLowerCase();
  return PUMP_ROOM_KEYWORDS.some((kw) => lower.includes(kw));
}

export const WIDGET_REGISTRY: Record<WidgetId, WidgetDefinition> = {
  'system-overview': {
    id: 'system-overview',
    name: 'System Overview',
    description: 'Overall system health, alerts, and status breakdown',
    icon: Activity,
    category: 'metrics',
    defaultVisible: true,
    roles: ['admin', 'manager'],
  },
  'task-overview': {
    id: 'task-overview',
    name: 'Task Overview',
    description: 'Task status, technician performance, and distribution',
    icon: ClipboardCheck,
    category: 'charts',
    defaultVisible: true,
    roles: ['admin', 'manager'],
  },
  // 'performance-metrics': {
  //   id: 'performance-metrics',
  //   name: 'Performance Metrics',
  //   description: 'Key performance indicators and efficiency metrics',
  //   icon: TrendingUp,
  //   category: 'metrics',
  //   defaultVisible: true,
  //   roles: ['admin', 'manager'],
  // },
  'hydrostatic-test': {
    id: 'hydrostatic-test',
    name: 'Hydrostatic Test Overview',
    description: 'HP test completion, trends, and upcoming tests',
    icon: AlertTriangle,
    category: 'charts',
    defaultVisible: false,
    requiresCategory: 'Fire Extinguisher',
    roles: ['admin', 'manager'],
  },
  'refill-status': {
    id: 'refill-status',
    name: 'Refill Status Summary',
    description: 'Refill completion rate and cylinder status',
    icon: Package,
    category: 'charts',
    defaultVisible: false,
    requiresCategory: 'Fire Extinguisher',
    roles: ['admin', 'manager'],
  },
  'asset-distribution': {
    id: 'asset-distribution',
    name: 'Asset Distribution',
    description: 'Asset distribution by building and type',
    icon: BarChart3,
    category: 'charts',
    defaultVisible: false,
    roles: ['admin', 'manager'],
  },
  'maintenance-overview': {
    id: 'maintenance-overview',
    name: 'Maintenance Overview',
    description: 'Maintenance summary, schedule, and activities',
    icon: Wrench,
    category: 'tables',
    defaultVisible: false,
    roles: ['admin', 'manager'],
  },
  'pump-performance': {
    id: 'pump-performance',
    name: 'Pump Performance',
    description: 'Monitor each pump\'s live condition, operational mode, and maintenance insights',
    icon: Activity,
    category: 'charts',
    defaultVisible: true,
    requiresCategory: 'pump', // matched via isPumpRoomCategory — see widgetRegistry helpers
    roles: ['admin', 'manager'],
  },
  'pump-support-system': {
    id: 'pump-support-system',
    name: 'Support System Status',
    description: 'Storage levels and system health monitoring for diesel, water, battery, and pressure',
    icon: Gauge,
    category: 'metrics',
    defaultVisible: true,
    requiresCategory: 'pump', // matched via isPumpRoomCategory — see widgetRegistry helpers
    roles: ['admin', 'manager'],
  },
  'pump-trends': {
    id: 'pump-trends',
    name: 'Trends & Performance',
    description: 'Real-time and historical insights into fluid levels and system pressure',
    icon: ChartNoAxesCombined,
    category: 'charts',
    defaultVisible: true,
    requiresCategory: 'pump', // matched via isPumpRoomCategory — see widgetRegistry helpers
    roles: ['admin', 'manager'],
  },
  'technician-performance': {
    id: 'technician-performance',
    name: 'Technician Performance',
    description: 'Individual technician efficiency, ratings, and task completion metrics',
    icon: Activity,
    category: 'metrics',
    defaultVisible: true,
    roles: ['admin', 'manager'],
  },
};

/**
 * Get default visible widgets for a role
 */
export function getDefaultWidgets(role: 'admin' | 'manager'): WidgetId[] {
  return Object.values(WIDGET_REGISTRY)
    .filter((widget) => widget.defaultVisible && widget.roles.includes(role))
    .map((widget) => widget.id);
}

/**
 * Get available widgets for a role and category
 */
export function getAvailableWidgets(
  role: 'admin' | 'manager',
  categoryName?: string | null
): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter((widget) => {
    // Check role
    if (!widget.roles.includes(role)) return false;

    // Check category requirement
    if (widget.requiresCategory) {
      if (!categoryName) return false;
      // Pump widgets use isPumpRoomCategory for flexible name matching
      if (widget.requiresCategory === 'pump') {
        return isPumpRoomCategory(categoryName);
      }
      // Other category widgets (e.g. Fire Extinguisher) use substring match
      return categoryName.toLowerCase().includes(widget.requiresCategory.toLowerCase());
    }

    return true;
  });
}

/**
 * Check if a widget is available for the current context
 */
export function isWidgetAvailable(
  widgetId: WidgetId,
  role: 'admin' | 'manager',
  categoryName?: string | null
): boolean {
  const widget = WIDGET_REGISTRY[widgetId];
  if (!widget) return false;

  // Check role
  if (!widget.roles.includes(role)) return false;

  // Check category requirement
  if (widget.requiresCategory) {
    if (!categoryName) return false;
    // Pump widgets use isPumpRoomCategory for flexible name matching
    if (widget.requiresCategory === 'pump') {
      return isPumpRoomCategory(categoryName);
    }
    // Other category widgets (e.g. Fire Extinguisher) use substring match
    return categoryName.toLowerCase().includes(widget.requiresCategory.toLowerCase());
  }

  return true;
}
