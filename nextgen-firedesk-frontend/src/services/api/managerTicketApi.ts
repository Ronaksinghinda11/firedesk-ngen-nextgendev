import { api } from '@/lib/api';

export interface CreateTicketPayload {
  plantId: string;
  categoryId: string;
  assetId?: string;
  inventoryAssetId?: string;
  buildingId?: string;
  floorId?: string;
  wingId?: string;
  location?: string;
  technicianId?: string;
  taskName: string;
  taskDescription?: string;
  targetDate: string;
  ticketCategory: 'Installation' | 'Breakdown Maintenance' | 'Refill / HP Test' | 'General';
  maintenance_type?: 'BREAKDOWN' | 'COMPLIANCE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tasks?: TaskPayload[];
}

export interface TaskPayload {
  task_number?: number;
  title?: string;
  description?: string;
  role_label?: string;
  target_date: string;
  assigned_technician_id?: string;
  requires_approval: boolean;
  has_checklist: boolean;
  checklist_questions?: Array<{
    question_text: string;
    question_order?: number;
    is_mandatory?: boolean;
  }>;
}

export interface ConsumeInventoryItem {
  item_type: 'asset' | 'spare';
  item_id: string;
  quantity: number;
  unit_cost?: number;
  item_name?: string;
  task_id?: string;
  notes?: string;
}

export const managerTicketApi = {
  getTickets: (params?: Record<string, any>) =>
    api.get('/tickets', { params }),

  getTicketById: (id: string) =>
    api.get(`/tickets/${id}`),

  createTicket: (data: CreateTicketPayload) =>
    api.post('/tickets', data),

  updateTicket: (id: string, data: Partial<CreateTicketPayload>) =>
    api.put(`/tickets/${id}`, data),

  deleteTicket: (id: string) =>
    api.delete(`/tickets/${id}`),

  approveTicket: (id: string, comment?: string) =>
    api.put(`/tickets/${id}/approve`, { comment }),

  rejectTicket: (id: string, comment: string) =>
    api.put(`/tickets/${id}/reject`, { comment }),

  getDropdownData: (plantId?: string) =>
    api.get('/tickets/dropdown-data', {
      params: plantId ? { plantId } : undefined,
    }),

  getAssets: (plantId: string, categoryId: string) =>
    api.get('/tickets/assets', { params: { plantId, categoryId } }),

  getInventoryAssets: (plantId: string, categoryId?: string) =>
    api.get('/tickets/inventory-assets', { params: { plantId, categoryId } }),

  getBuildings: (plantId: string) =>
    api.get('/tickets/buildings', { params: { plantId } }),

  getFloors: (buildingId: string) =>
    api.get('/tickets/floors', { params: { buildingId } }),

  getWings: (floorId: string) =>
    api.get('/tickets/wings', { params: { floorId } }),

  // Tasks
  getTasks: (ticketId: string) =>
    api.get(`/tickets/${ticketId}/tasks`),

  upsertTasks: (ticketId: string, tasks: TaskPayload[]) =>
    api.post(`/tickets/${ticketId}/tasks`, { tasks }),

  updateTask: (taskId: string, data: Partial<TaskPayload>) =>
    api.put(`/tickets/tasks/${taskId}`, data),

  assignTechnician: (taskId: string, technicianId: string | null) =>
    api.post(`/tickets/tasks/${taskId}/assign`, {
      technician_id: technicianId,
    }),

  startTask: (taskId: string) =>
    api.post(`/tickets/tasks/${taskId}/start`, {}),

  submitTask: (taskId: string, notes?: string) =>
    api.post(`/tickets/tasks/${taskId}/submit`, { notes }),

  approveTask: (taskId: string, remarks?: string) =>
    api.post(`/tickets/tasks/${taskId}/approve`, { remarks }),

  rejectTask: (taskId: string, remarks: string) =>
    api.post(`/tickets/tasks/${taskId}/reject`, { remarks }),

  saveChecklist: (
    taskId: string,
    answers: Array<{ question_id: string; answer: boolean; remarks?: string }>,
  ) => api.post(`/tickets/tasks/${taskId}/checklist`, { answers }),

  // Inventory
  consumeInventory: (ticketId: string, items: ConsumeInventoryItem[]) =>
    api.post(`/tickets/${ticketId}/consume-inventory`, { items }),

  getInventoryUsage: (ticketId: string) =>
    api.get(`/tickets/${ticketId}/inventory-usage`),

  // BM Maintenance
  getBMIssueTypes: () =>
    api.get('/tickets/bm/issue-types'),
    
  getBMTicketDetail: (ticketId: string) =>
    api.get(`/tickets/${ticketId}/bm`),

  transitionBMState: (ticketId: string, payload: { nextState: string, bm_metadata?: any }) =>
    api.put(`/tickets/${ticketId}/bm/transition`, payload),

  attachBMSpares: (ticketId: string, spares: Array<{ spare_id: string, quantity: number, unit_cost?: number, remarks?: string }>) =>
    api.post(`/tickets/${ticketId}/bm/spares`, { spares }),

  getAssetSpareHistory: (assetId: string) =>
    api.get(`/tickets/asset/${assetId}/bm-spares`),

  // Spare requests (BM Maintenance)
  requestSpares: (ticketId: string, items: Array<{ item_id: string; quantity: number; item_name?: string; notes?: string; item_type?: string }>) =>
    api.post(`/tickets/${ticketId}/request-spares`, { items: items.map(i => ({ ...i, item_type: i.item_type || 'spare' })) }),

  getPendingSpareRequests: () =>
    api.get('/tickets/spares/pending-requests'),

  processSpareRequest: (usageId: string, status: 'approved' | 'rejected') =>
    api.post(`/tickets/spares/process/${usageId}`, { status }),

  getInventorySpares: (params?: Record<string, any>) =>
    api.get('/tickets/available-spares', { params }),

  // Update BM metadata (form save without state transition)
  updateBMMetadata: (ticketId: string, metadata: Record<string, any>) =>
    api.put(`/tickets/${ticketId}`, { bm_metadata: metadata }),

  updateRefillMetadata: (ticketId: string, metadata: Record<string, any>) =>
    api.put(`/tickets/${ticketId}`, { refill_metadata: metadata }),
};
