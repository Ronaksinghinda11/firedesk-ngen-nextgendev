// BM Ticket API Service
import { api } from '@/lib/api';

export interface BMTicket {
  id: string;
  ticket_code: string;
  ticket_type: string;
  maintenance_type: 'BREAKDOWN' | 'COMPLIANCE';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  bm_state: string;
  bm_metadata: {
    issue_type?: string;
    severity?: string;
    problem_description?: string;
    root_cause?: string;
    action_type?: string;
    work_description?: string;
    start_time?: string;
    end_time?: string;
    downtime_minutes?: number;
    test_status?: string;
    system_restored?: boolean;
    before_photos?: string[];
    after_photos?: string[];
    technician_name?: string;
    final_remarks?: string;
    supervisor_approval?: string;
    supervisor_remarks?: string;
    spare_parts?: any[];
  };
  asset_id: string;
  asset?: any;
  plant_id: string;
  technician_id?: string;
  task_name: string;
  task_description: string;
  acknowledged_at?: string;
  sla_deadline?: string;
  sla_breached: boolean;
  total_spare_cost?: number;
  created_at: string;
  slaStatus?: {
    status: 'NOT_STARTED' | 'ON_TRACK' | 'WARNING' | 'CRITICAL' | 'BREACHED';
    remaining?: number;
    remainingHours?: number;
    overdueHours?: number;
  };
  allowedTransitions?: string[];
  spareConsumptions?: any[];
  stateTransitions?: any[];
}

export interface BMIssueType {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface SpareConsumption {
  id: string;
  asset_id: string;
  ticket_id: string;
  spare_id: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  used_at: string;
  remarks?: string;
  spare?: any;
  ticket?: any;
  usedBy?: any;
}

export const bmTicketApi = {
  // Create BM ticket
  async createBMTicket(data: any): Promise<BMTicket> {
    const response = await api.post('/bm-tickets', data);
    return response.ticket;
  },

  // List BM tickets
  async listBMTickets(filters?: any): Promise<BMTicket[]> {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/bm-tickets?${params}`);
    return response.tickets;
  },

  // Get BM ticket detail
  async getBMTicket(id: string): Promise<BMTicket> {
    const response = await api.get(`/bm-tickets/${id}`);
    return response.ticket;
  },

  // Assign to technician
  async assignBMTicket(id: string, technician_id: string): Promise<BMTicket> {
    const response = await api.put(`/bm-tickets/${id}/assign`, { technician_id });
    return response.ticket;
  },

  // Transition state
  async transitionState(id: string, next_state: string, bm_metadata?: any): Promise<BMTicket> {
    const response = await api.post(`/bm-tickets/${id}/transition`, {
      next_state,
      bm_metadata
    });
    return response.ticket;
  },

  // Update metadata
  async updateMetadata(id: string, metadata: any): Promise<BMTicket> {
    const response = await api.put(`/bm-tickets/${id}/metadata`, metadata);
    return response.ticket;
  },

  // Attach spares
  async attachSpares(id: string, spares: any[]): Promise<SpareConsumption[]> {
    const response = await api.post(`/bm-tickets/${id}/spares`, { spares });
    return response.consumptions;
  },

  // Get asset spare history
  async getAssetSpareHistory(assetId: string, filters?: any): Promise<{
    consumptions: SpareConsumption[];
    summary: any;
  }> {
    const params = filters ? `?${new URLSearchParams(filters)}` : '';
    const response = await api.get(`/assets/${assetId}/spare-history${params}`);
    return {
      consumptions: response.consumptions,
      summary: response.summary
    };
  },

  // Get issue types
  async getIssueTypes(): Promise<BMIssueType[]> {
    const response = await api.get('/bm-tickets/issue-types');
    return response.issueTypes;
  },

  // Get dashboard stats
  async getDashboardStats(filters?: any): Promise<any> {
    const params = filters ? `?${new URLSearchParams(filters)}` : '';
    const response = await api.get(`/bm-tickets/dashboard${params}`);
    return response.stats;
  },

  // Check SLA
  async checkSLA(id: string): Promise<any> {
    const response = await api.post(`/bm-tickets/${id}/check-sla`);
    return response.sla_check;
  }
};
