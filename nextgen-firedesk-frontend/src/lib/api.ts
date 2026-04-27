// API base URL - update this to your backend URL
const API_BASE_URL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:5000/api';

// API client with token handling
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = localStorage.getItem('accessToken');

    // Don't set Content-Type for FormData - browser will set it with boundary
    const isFormData = options.body instanceof FormData;

    const headers: HeadersInit = {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    });

    if (response.status === 401 && !endpoint.includes('/login')) {
      // Try to refresh token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the original request
        return this.request<T>(endpoint, options);
      } else {
        // Redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      const errorObj: any = new Error(error.message || 'Request failed');
      errorObj.response = { data: error };
      errorObj.status = response.status;
      throw errorObj;
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async get<T>(endpoint: string, options?: { params?: Record<string, any>; responseType?: 'json' | 'blob' }): Promise<T> {
    let url = endpoint;
    if (options?.params) {
      const params = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url = `${endpoint}?${queryString}`;
      }
    }

    // Handle blob response type differently
    if (options?.responseType === 'blob') {
      return this.requestBlob(url, 'GET') as unknown as T;
    }

    return this.request<T>(url, { method: 'GET' });
  }

  private async requestBlob(endpoint: string, method: string = 'GET', body?: any): Promise<Blob> {
    const accessToken = localStorage.getItem('accessToken');

    const isFormData = body instanceof FormData;
    const headers: HeadersInit = {
      ...(!isFormData && body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers,
      credentials: 'include',
      ...(body && { body }),
    });

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.requestBlob(endpoint, method, body);
      } else {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
    }

    if (!response.ok) {
      // For non-OK responses, try to parse as JSON for error message
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        const errorObj: any = new Error(error.message || 'Request failed');
        errorObj.response = { data: error };
        errorObj.status = response.status;
        throw errorObj;
      } else {
        const errorObj: any = new Error('Request failed');
        errorObj.response = { data: { message: 'Failed to load resource' } };
        errorObj.status = response.status;
        throw errorObj;
      }
    }

    // Get the blob and ensure it has the correct MIME type
    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // If the blob doesn't have the correct type, create a new one with the correct type
    if (blob.type !== contentType) {
      return new Blob([blob], { type: contentType });
    }

    return blob;
  }

  async post<T>(endpoint: string, data?: unknown, options?: { responseType?: 'json' | 'blob' }): Promise<T> {
    // Handle FormData directly, otherwise stringify
    const body = data instanceof FormData ? data : (data !== undefined ? JSON.stringify(data) : undefined);

    if (options?.responseType === 'blob') {
      return this.requestBlob(endpoint, 'POST', body) as unknown as T;
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    // Handle FormData directly, otherwise stringify
    const body = data instanceof FormData ? data : JSON.stringify(data);

    return this.request<T>(endpoint, {
      method: 'PUT',
      body,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    // Handle FormData directly, otherwise stringify
    const body = data instanceof FormData ? data : JSON.stringify(data);

    return this.request<T>(endpoint, {
      method: 'PATCH',
      body,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);

import type { Layout, CreateLayoutDto, UpdateLayoutDto } from '@/models/organization/Layout';

// Floorplan Hierarchy API - get plants with buildings and floors
export const floorplanHierarchyApi = {
  getHierarchy: () => {
    return api.get<{ success: boolean; data: any[] }>('/floorplan-hierarchy');
  },
};

// Layout API - handles layout structure (floorplans)
export const layoutApi = {
  // Get all layouts
  getAll: (params?: { plantId?: string; buildingId?: string; floorId?: string; wingId?: string }) => {
    return api.get<{ success: boolean; data: Layout[] }>('/layout', { params });
  },

  // Get layout by ID
  getById: (id: string) => {
    return api.get<{ success: boolean; data: Layout }>(`/layout/${id}`);
  },

  // Create new layout
  create: (data: CreateLayoutDto) => {
    return api.post<{ success: boolean; message: string; data: Layout }>('/layout', data);
  },

  // Update layout
  update: (id: string, data: UpdateLayoutDto) => {
    return api.put<{ success: boolean; message: string; data: Layout }>(`/layout/${id}`, data);
  },

  // Delete layout
  delete: (id: string) => {
    return api.delete<{ success: boolean; message: string }>(`/layout/${id}`);
  },

  // Upload layout file
  uploadLayout: (data: {
    plantId: string;
    buildingId: string;
    floorId: string;
    wingId?: string;
    layoutType?: string;
    health?: string;
    layoutFile: File;
  }) => {
    const formData = new FormData();
    formData.append('plantId', data.plantId);
    formData.append('buildingId', data.buildingId);
    formData.append('floorId', data.floorId);

    if (data.wingId) {
      formData.append('wingId', data.wingId);
    }

    formData.append('layoutType', data.layoutType || 'floorplan');
    formData.append('health', data.health || 'good');
    formData.append('layoutFile', data.layoutFile);

    return api.post<{ success: boolean; data: Layout; message: string }>(
      '/layout/upload',
      formData
    );
  },

  // NEW: Get layout by floor ID (one-to-one relationship)
  getByFloorId: (floorId: string) => {
    return api.get<{ success: boolean; data: Layout | null }>(`/layout/floor/${floorId}`);
  },

  // NEW: Get all layouts for a plant
  getByPlantId: (plantId: string) => {
    return api.get<{ success: boolean; data: Layout[] }>(`/layout/plant/${plantId}`);
  },
};

// For backwards compatibility - floorplanAssetApi is an alias to layoutApi
// This allows existing code to work without changes
export const floorplanAssetApi = layoutApi;

// Export Layout and related types
export type { Layout, Building, Floor, Wing } from '@/models/organization/Layout';

// Export FloorplanAsset type as alias to Layout for compatibility
export type FloorplanAsset = Layout;

// Asset API - handles database assets
export interface AssetFromDB {
  id: string;
  assetId?: string;
  plantId: string;
  buildingId?: string;
  floorId?: string;
  building: string;
  location: string;
  productCategoryId: string;
  productId: string;
  manufacturerId?: string;
  manufacturingDate: string;
  installDate: string;
  healthStatus: 'NotWorking' | 'AttentionRequired' | 'Healthy' | 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';
  status: 'Warranty' | 'AMC' | 'In-House' | 'Deactive';
  tag?: string;
  qrCodeUrl?: string;
  floorplanX?: number;
  floorplanY?: number;
  // Geo location fields
  lat?: string;
  long?: string;
  // Technical specifications (from Asset table)
  type?: string;
  subType?: string;
  capacity?: number;
  capacityUnit?: string;
  model?: string;
  slNo?: string;
  // HP Test dates
  lastHPTestDate?: string;
  nextHPTestDueDate?: string;
  // Service tracking fields (legacy - from Asset table directly)
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  // Scheduler data with service frequencies
  schedulerData?: {
    inspectionFrequency?: string;
    testingFrequency?: string;
    maintenanceFrequency?: string;
  };
  // Service dates from ServiceSubmissions table
  serviceDates?: {
    lastServiceDates: {
      inspection?: string;
      testing?: string;
      maintenance?: string;
    };
    nextServiceDates: {
      inspection?: string;
      testing?: string;
      maintenance?: string;
    };
  };
  // Plant association with service frequency
  plant?: { id: string; plantName: string };
  category?: { id: string; categoryName: string; serviceFrequency?: { inspection?: string; testing?: string; maintenance?: string } };
  product?: { id: string; productName: string };
  manufacturer?: { id: string; name: string };
  specValues?: Array<{
    id: string;
    assetId: string;
    specDefinitionId: string;
    value: string;
    specDefinition?: {
      id: string;
      label: string;
      fieldType: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export const assetApi = {
  // Get all assets
  getAll: () => {
    return api.get<{ success: boolean; count: number; data: AssetFromDB[] }>('/assets');
  },

  // Get assets by floor ID (for floorplan)
  getByFloor: (floorId: string) => {
    return api.get<{ success: boolean; count: number; data: AssetFromDB[] }>(`/assets/by-floor/${floorId}`);
  },

  // Get asset by ID
  getById: (id: string) => {
    return api.get<{ success: boolean; data: AssetFromDB }>(`/assets/${id}`);
  },

  // Update asset (general update, allows null for coordinates)
  update: (id: string, data: Partial<AssetFromDB>) => {
    return api.put<{ success: boolean; message: string; data: AssetFromDB }>(`/assets/${id}`, data);
  },

  // Update asset floorplan position
  updateFloorplanPosition: (id: string, data: { floorplanX: number; floorplanY: number; buildingId?: string; floorId?: string }) => {
    return api.put<{ success: boolean; message: string; data: AssetFromDB }>(`/assets/${id}/floorplan`, data);
  },

  // Remove asset from floorplan by deleting the AssetFloorplanPosition record
  removeFromFloorplan: (id: string) => {
    return api.delete<{ success: boolean; message: string }>(`/assets/${id}/floorplan`);
  },
};

// Premium Manager Dashboard API Types
export interface DashboardSystemHealth {
  healthy: number;
  needsAttention: number;
  critical: number;
  totalAssets: number;
}

export interface DashboardServiceSummary {
  completed: number;
  PENDING: number;
  scheduled: number;
  total: number;
}

export interface DashboardTestAnalytics {
  date: string;
  scheduled: number;
  completed: number;
  type?: string;
}

export interface DashboardRefillAnalytics {
  date: string;
  scheduled: number;
  completed: number;
  type?: string;
}

export interface DashboardAssetDistribution {
  type: string;
  count: number;
  capacity?: string;
  condition?: string;
}

export interface DashboardTaskOverview {
  totalTasks: number;
  inspection: number;
  testing: number;
  maintenance: number;
  taskStatus: {
    completed: number;
    inProgress: number;
    PENDING: number;
    overdue: number;
  };
  overdueTasks: {
    threeDays: number;
    sevenDays: number;
    moreThanSeven: number;
  };
}

export interface DashboardTechnicianPerformance {
  technicianId: string;
  technicianName: string;
  completed: number;
  waiting: number;
  rejected: number;
}

export interface DashboardMaintenanceOverview {
  completedTasks: number;
  PENDINGTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  overdueTimeline: Array<{
    date: string;
    count: number;
  }>;
}

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
}

// Premium Manager Dashboard API
export const dashboardApi = {
  // System Overview
  getSystemHealth: (plantIds?: string[]) => {
    return api.get<{ success: boolean; data: DashboardSystemHealth }>('/dashboard/system-health', {
      params: plantIds ? { plantIds: plantIds.join(',') } : undefined,
    });
  },

  getServiceSummary: (plantIds?: string[], period?: 'day' | 'week' | 'month') => {
    return api.get<{ success: boolean; data: DashboardServiceSummary }>('/dashboard/service-summary', {
      params: {
        ...(plantIds && { plantIds: plantIds.join(',') }),
        ...(period && { period }),
      },
    });
  },

  getCriticalAlerts: (plantIds?: string[]) => {
    return api.get<{ success: boolean; data: number }>('/dashboard/critical-alerts', {
      params: plantIds ? { plantIds: plantIds.join(',') } : undefined,
    });
  },

  // Test & Refill Analytics
  getTestAnalytics: (params: {
    plantIds?: string[];
    buildingId?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
    assetType?: string;
  }) => {
    return api.get<{ success: boolean; data: DashboardTestAnalytics[] }>('/dashboard/test-analytics', {
      params: {
        ...(params.plantIds && { plantIds: params.plantIds.join(',') }),
        ...(params.buildingId && { buildingId: params.buildingId }),
        ...(params.startDate && { startDate: params.startDate }),
        ...(params.endDate && { endDate: params.endDate }),
        ...(params.groupBy && { groupBy: params.groupBy }),
        ...(params.assetType && { assetType: params.assetType }),
      },
    });
  },

  getRefillAnalytics: (params: {
    plantIds?: string[];
    buildingId?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
    assetType?: string;
  }) => {
    return api.get<{ success: boolean; data: DashboardRefillAnalytics[] }>('/dashboard/refill-analytics', {
      params: {
        ...(params.plantIds && { plantIds: params.plantIds.join(',') }),
        ...(params.buildingId && { buildingId: params.buildingId }),
        ...(params.startDate && { startDate: params.startDate }),
        ...(params.endDate && { endDate: params.endDate }),
        ...(params.groupBy && { groupBy: params.groupBy }),
        ...(params.assetType && { assetType: params.assetType }),
      },
    });
  },

  // Asset Distribution
  getAssetDistribution: (params: {
    plantIds?: string[];
    buildingId?: string;
    location?: string;
    productId?: string;
    assetType?: string;
    capacity?: string;
    condition?: string;
    ageRange?: string;
  }) => {
    return api.get<{ success: boolean; data: DashboardAssetDistribution[] }>('/dashboard/asset-distribution', {
      params: {
        ...(params.plantIds && { plantIds: params.plantIds.join(',') }),
        ...(params.buildingId && { buildingId: params.buildingId }),
        ...(params.location && { location: params.location }),
        ...(params.productId && { productId: params.productId }),
        ...(params.assetType && { assetType: params.assetType }),
        ...(params.capacity && { capacity: params.capacity }),
        ...(params.condition && { condition: params.condition }),
        ...(params.ageRange && { ageRange: params.ageRange }),
      },
    });
  },

  // Task Overview
  getTaskOverview: (plantIds?: string[]) => {
    return api.get<{ success: boolean; data: DashboardTaskOverview }>('/dashboard/task-overview', {
      params: plantIds ? { plantIds: plantIds.join(',') } : undefined,
    });
  },

  getTechnicianPerformance: (plantIds?: string[]) => {
    return api.get<{ success: boolean; data: DashboardTechnicianPerformance[] }>('/dashboard/technician-performance', {
      params: plantIds ? { plantIds: plantIds.join(',') } : undefined,
    });
  },

  // Maintenance Overview
  getMaintenanceOverview: (params: {
    plantIds?: string[];
    type?: 'maintenance' | 'inspection' | 'testing';
    startDate?: string;
    endDate?: string;
  }) => {
    return api.get<{ success: boolean; data: DashboardMaintenanceOverview }>('/dashboard/maintenance-overview', {
      params: {
        ...(params.plantIds && { plantIds: params.plantIds.join(',') }),
        ...(params.type && { type: params.type }),
        ...(params.startDate && { startDate: params.startDate }),
        ...(params.endDate && { endDate: params.endDate }),
      },
    });
  },

  // Notifications
  getNotifications: (limit?: number) => {
    return api.get<{ success: boolean; data: DashboardNotification[]; unreadCount: number }>('/dashboard/notifications', {
      params: limit ? { limit } : undefined,
    });
  },

  markNotificationRead: (notificationId: string) => {
    return api.put<{ success: boolean; message: string }>(`/dashboard/notifications/${notificationId}/read`, {});
  },

  markAllNotificationsRead: () => {
    return api.put<{ success: boolean; message: string }>('/dashboard/notifications/read-all', {});
  },
};

// ============================================================================
// NOTIFICATION SYSTEM API
// ============================================================================

// Notification Types from database model
export type NotificationType =
  | 'ASSET_ALERT'
  | 'SERVICE_DUE'
  | 'HP_TEST_DUE'
  | 'TICKET_ASSIGNED'
  | 'TICKET_UPDATED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_ASSIGNED'
  | 'CAPA_INITIATED'
  | 'CAPA_STEP_ACTION'
  | 'AUDIT_SCHEDULED'
  | 'AUDIT_REMINDER'
  | 'TRAINING_SCHEDULED'
  | 'SYSTEM_ALERT'
  | 'GENERAL';

export type NotificationCategory = 'ALERT' | 'WARNING' | 'INFO' | 'SUCCESS' | 'REMAINDER';
export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
  user_id: string;
  action_url?: string;
  is_actionable: boolean;
  action_taken: boolean;
  is_read: boolean;
  read_at?: string;
  sent_at?: string;
  expires_at?: string;
  triggered_by?: string;
  notification_source: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationCounts {
  alert: number;
  warning: number;
  info: number;
  success: number;
  reminder: number;
  unread: number;
  critical: number;
  total: number;
}

// Notification API
export const notificationApi = {
  // Get notifications with filters
  getNotifications: (params?: {
    category?: NotificationCategory;
    type?: NotificationType;
    priority?: NotificationPriority;
    is_read?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    return api.get<{
      success: boolean;
      data: Notification[];
      total: number;
      limit: number;
      offset: number;
    }>('/notifications', { params });
  },

  // Get notification counts by category
  getCounts: () => {
    return api.get<{
      success: boolean;
      data: NotificationCounts;
    }>('/notifications/counts');
  },

  // Get single notification
  getById: (id: string) => {
    return api.get<{
      success: boolean;
      data: Notification;
    }>(`/notifications/${id}`);
  },

  // Mark notification as read
  markAsRead: (id: string) => {
    return api.post<{
      success: boolean;
      message: string;
      data: Notification;
    }>(`/notifications/${id}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: () => {
    return api.post<{
      success: boolean;
      message: string;
      updated: number;
    }>('/notifications/read-all');
  },

  // Mark action as taken
  markActionTaken: (id: string) => {
    return api.post<{
      success: boolean;
      message: string;
      data: Notification;
    }>(`/notifications/${id}/action`);
  },

  // Delete notification
  delete: (id: string) => {
    return api.delete<{
      success: boolean;
      message: string;
    }>(`/notifications/${id}`);
  },

  // Create notification (admin/system use)
  create: (data: {
    type: NotificationType;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    title: string;
    message: string;
    user_id: string;
    related_entity_type?: string;
    related_entity_id?: string;
    action_url?: string;
    is_actionable?: boolean;
  }) => {
    return api.post<{
      success: boolean;
      message: string;
      data: Notification;
    }>('/notifications', data);
  },
};

// Legacy Alert types for backward compatibility
export interface Alert {
  id: string;
  type: 'critical' | 'reminder' | 'warning' | 'info';
  title: string;
  message: string;
  read: boolean;
  userId: string;
  plantId?: string;
  categoryId?: string;
  assetId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  plant?: {
    id: string;
    plantName: string;
  };
  category?: {
    id: string;
    categoryName: string;
  };
  asset?: {
    id: string;
    assetId: string;
  };
}

export interface AlertCounts {
  critical: number;
  reminder: number;
  warning: number;
  info: number;
  unread: number;
  total: number;
}

// Legacy Alert API - now uses new notification endpoints
export const alertApi = {
  // Get alerts - maps to new notification API
  getAlerts: async (params?: {
    type?: 'critical' | 'reminder' | 'warning' | 'info';
    read?: boolean;
    limit?: number;
    offset?: number;
    plantId?: string;
  }) => {
    // Map old type to new category
    const categoryMap: Record<string, NotificationCategory> = {
      critical: 'ALERT',
      reminder: 'REMAINDER',
      warning: 'WARNING',
      info: 'INFO'
    };

    const response = await notificationApi.getNotifications({
      category: params?.type ? categoryMap[params.type] : undefined,
      is_read: params?.read,
      limit: params?.limit,
      offset: params?.offset
    });

    // Transform to legacy format
    const alerts: Alert[] = response.data.map((n: Notification) => ({
      id: n.id,
      type: n.category === 'ALERT' ? 'critical' :
        n.category === 'REMAINDER' ? 'reminder' :
          n.category === 'WARNING' ? 'warning' : 'info',
      title: n.title,
      message: n.message,
      read: n.is_read,
      userId: n.user_id,
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }));

    return {
      success: true,
      data: alerts,
      total: response.total,
      limit: response.limit,
      offset: response.offset
    };
  },

  // Get alert counts
  getAlertCounts: async () => {
    const response = await notificationApi.getCounts();
    return {
      success: true,
      data: {
        critical: response.data.critical,
        reminder: response.data.reminder,
        warning: response.data.warning,
        info: response.data.info,
        unread: response.data.unread,
        total: response.data.total
      }
    };
  },

  // Mark alert as read
  markAsRead: (alertId: string) => {
    return notificationApi.markAsRead(alertId);
  },

  // Mark all as read
  markAllAsRead: () => {
    return notificationApi.markAllAsRead();
  },
};

// Generic Upload API
export const uploadApi = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return api.post<{
      success: boolean;
      message: string;
      data: {
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        url: string;
      };
    }>('/upload', formData);
  }
};