/**
 * Dashboard Type Definitions
 * Core types for Premium Dashboard
 */

// ============================================================================
// Filter Types
// ============================================================================

export interface DashboardFilters {
  serviceType?: 'maintenance' | 'inspection' | 'testing';
  startDate: string;
  endDate: string;
  plantId?: string;
  categoryId?: string;
  buildingId?: string;
  building?: string;
  granularity?: 'day' | 'week' | 'month';
  productId?: string;
  type?: string;
  capacity?: string;
}

// ============================================================================
// System Health Types
// ============================================================================

export interface SystemHealthData {
  totalAssets?: number;
  breakdown?: {
    healthy?: number;
    attentionRequired?: number;
    notWorking?: number;
  };
  services?: {
    completed?: number;
    PENDING?: number;
    scheduled?: number;
    total?: number;
  };
  criticalAlerts?: number;
  trends?: {
    health: number;
    period: string;
  };
}

// ============================================================================
// Task Types
// ============================================================================

export interface TasksOverviewData {
  totalTasks?: number;
  serviceTypeBreakdown?: {
    inspection?: number;
    testing?: number;
    maintenance?: number;
  };
  completedTasks?: number;
  inProgressTasks?: number;
  PENDINGTasks?: number;
  lapsedTasks?: number;
  waitingApprovalTasks?: number;
  rejectedTasks?: number;
  overdueTasks?: number;
  overdueTaskBuckets?: {
    next3Days?: number;
    next4to7Days?: number;
    moreThan7Days?: number;
  };
  taskCompletionEfficiency?: number;
  statusBreakdown?: Record<string, number>;
  technicianPerformance?: Array<{
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
  recentActivity?: Array<{
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
  // Legacy field name for backwards compatibility
  recentActivities?: Array<{
    id: string;
    assetName?: string;
    taskType?: string;
    technicianName?: string;
    dueDate?: string;
    status?: string;
  }>;
}

// ============================================================================
// Hydrostatic Test Types
// ============================================================================

export interface HydrostaticTestData {
  chartData?: Array<{
    displayMonth?: string;
    month?: string;
    count?: number;
  }>;
  totalScheduled?: number;
  totalCompleted?: number;
  testCompletionEfficiency?: number;
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

// ============================================================================
// Refill Status Types
// ============================================================================

export interface RefillStatusData {
  chartData?: Array<{
    displayMonth?: string;
    month?: string;
    completed?: number;
    total?: number;
    refilled?: number;
    PENDING?: number;
  }>;
  totalRefilled?: number;
  totalPending?: number;
  refillRate?: number;
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

// ============================================================================
// Asset Distribution Types
// ============================================================================

export interface AssetDistributionData {
  totalAssets?: number;
  distributionByBuilding?: Record<string, any>;
  distributionByType?: Record<string, any>;
}

// ============================================================================
// Maintenance Types
// ============================================================================

export interface MaintenanceSummaryData {
  totalMaintenance?: number;
  completedMaintenance?: number;
  scheduledMaintenance?: number;
  inProgressMaintenance?: number;
  maintenanceEfficiency?: number;
  delayRate?: number;
  slaCompliance?: number;
  overdueTasks?: number;
  overdueTimeline?: Array<{
    date: string;
    count: number;
    thisMonth?: number;
    lastMonth?: number;
  }>;
  categoryBreakdown?: Array<{
    category: string;
    total: number;
    completed: number;
    efficiency: number;
    delayRate: number;
  }>;
  serviceTypeBreakdown?: Record<string, any>;
  recentActivities?: Array<{
    id: string;
    assetName?: string;
    serviceType?: string;
    status?: string;
    completedDate?: string;
    technician?: string;
  }>;
}

// ============================================================================
// Combined Dashboard Data
// ============================================================================

export interface DashboardData {
  systemHealth?: SystemHealthData;
  tasksOverview?: TasksOverviewData;
  hydrostaticTests?: HydrostaticTestData;
  refillStatus?: RefillStatusData;
  assetDistribution?: AssetDistributionData;
  maintenanceSummary?: MaintenanceSummaryData;
}

// ============================================================================
// Widget Types
// ============================================================================

export type WidgetId =
  | 'system-overview'
  | 'task-overview'
  | 'performance-metrics'
  | 'hydrostatic-test'
  | 'refill-status'
  | 'asset-distribution'
  | 'maintenance-overview'
  | 'pump-performance'
  | 'pump-support-system'
  | 'pump-trends'
  | 'technician-performance';

export interface WidgetDefinition {
  id: WidgetId;
  name: string;
  description: string;
  icon: any; // Lucide icon component
  category: 'metrics' | 'charts' | 'tables';
  defaultVisible: boolean;
  requiresCategory?: string; // e.g., "Fire Extinguisher"
  roles: Array<'admin' | 'manager'>;
}

export interface WidgetLayout {
  id: WidgetId;
  visible: boolean;
  order: number;
}

export interface DashboardLayout {
  userId?: string;
  role: 'admin' | 'manager';
  widgets: WidgetLayout[];
  lastModified: string;
}

// ============================================================================
// Component Props
// ============================================================================

export interface BaseWidgetProps {
  data: DashboardData;
  loading: boolean;
  filters?: DashboardFilters;
}

export interface WidgetContainerProps {
  id: WidgetId;
  title: string;
  onRemove?: () => void;
  className?: string;
  children: React.ReactNode;
}
