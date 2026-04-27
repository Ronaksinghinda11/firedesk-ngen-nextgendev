/**
 * Audit API Service
 * 
 * Centralized API calls for audit/history functionality
 */

import { api } from '@/lib/api';

// ============== Types ==============

export interface AuditLogEntry {
    id: string;
    entity_type: string;
    entity_id: string | null;
    entity_name: string | null;
    action: string;
    action_description: string | null;
    user_id: string | null;
    user_name: string;
    user_type: string;
    changes: Record<string, { old: any; new: any }> | null;
    field_name: string | null;
    old_value: string | null;
    new_value: string | null;
    old_value_display: string | null;
    new_value_display: string | null;
    context_id: string | null;
    source: string;
    related_entity_type: string | null;
    related_entity_id: string | null;
    related_entity_name: string | null;
    metadata: Record<string, any> | null;
    ip_address: string | null;
    user_agent: string | null;
    request_id: string | null;
    created_at: string;
}

export interface AuditHistoryResponse {
    success: boolean;
    data: {
        rows: AuditLogEntry[];
        count: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export interface AuditFilters {
    startDate?: string;
    endDate?: string;
    actions?: string[];
    userId?: string;
    limit?: number;
    offset?: number;
}

// ============== API Functions ==============

export const auditApi = {
    /**
     * Get history for a specific entity
     */
    getEntityHistory: async (
        entityType: string,
        entityId: string,
        filters?: AuditFilters
    ): Promise<AuditHistoryResponse> => {
        const params: Record<string, any> = {};

        if (filters?.startDate) params.startDate = filters.startDate;
        if (filters?.endDate) params.endDate = filters.endDate;
        if (filters?.actions?.length) params.actions = filters.actions.join(',');
        if (filters?.userId) params.userId = filters.userId;
        if (filters?.limit) params.limit = filters.limit;
        if (filters?.offset) params.offset = filters.offset;

        return api.get<AuditHistoryResponse>(`/audit/entity/${entityType}/${entityId}`, { params });
    },

    /**
     * Get history for an entire module (all entities of a type)
     */
    getModuleHistory: async (
        entityType: string,
        filters?: AuditFilters
    ): Promise<AuditHistoryResponse> => {
        const params: Record<string, any> = {};

        if (filters?.startDate) params.startDate = filters.startDate;
        if (filters?.endDate) params.endDate = filters.endDate;
        if (filters?.actions?.length) params.actions = filters.actions.join(',');
        if (filters?.userId) params.userId = filters.userId;
        if (filters?.limit) params.limit = filters.limit;
        if (filters?.offset) params.offset = filters.offset;

        return api.get<AuditHistoryResponse>(`/audit/module/${entityType}`, { params });
    },

    /**
     * Get activity for a specific user
     */
    getUserActivity: async (
        userId: string,
        filters?: AuditFilters
    ): Promise<AuditHistoryResponse> => {
        const params: Record<string, any> = {};

        if (filters?.startDate) params.startDate = filters.startDate;
        if (filters?.endDate) params.endDate = filters.endDate;
        if (filters?.limit) params.limit = filters.limit;
        if (filters?.offset) params.offset = filters.offset;

        return api.get<AuditHistoryResponse>(`/audit/user/${userId}`, { params });
    },

    /**
     * Get grouped changes by context ID
     */
    getGroupedChanges: async (contextId: string): Promise<{ success: boolean; data: AuditLogEntry[] }> => {
        return api.get<{ success: boolean; data: AuditLogEntry[] }>(`/audit/context/${contextId}`);
    },
};

export default auditApi;
