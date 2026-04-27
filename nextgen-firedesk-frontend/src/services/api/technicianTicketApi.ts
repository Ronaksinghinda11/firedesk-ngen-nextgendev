import { api } from "@/lib/api";

export interface TicketResponse {
  id: string;
  ticketId: string;
  userId: string;
  comment: string;
  responseType: "submission" | "rejection" | "comment";
  isFixed?: boolean | null;
  photoUrls?: string[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Ticket {
  id: string;
  ticketId: string;
  taskName: string;
  taskDescription?: string;
  targetDate: string;
  completedStatus:
    | "Pending"
    | "In Progress"
    | "Waiting for spare"
    | "Waiting for approval"
    | "Completed"
    | "Rejected";
  ticketCategory: string;
  asset?: {
    id: string;
    assetId: string;
    location?: string;
    plant?: {
      id: string;
      plantName: string;
    };
  };
  category?: {
    id: string;
    categoryName: string;
  };
  building?: {
    id: string;
    buildingName: string;
  };
  responses?: TicketResponse[];
  createdAt: string;
  updatedAt: string;
  steps?: TicketStep[];
  priority?: string;
  totalCost?: number;
}

export interface ChecklistQuestion {
  id: string;
  question_text: string;
  question_order: number;
  is_mandatory: boolean;
  answers?: ChecklistAnswer[];
}

export interface ChecklistAnswer {
  id: string;
  question_id: string;
  step_id: string;
  answer: boolean | null;
  remarks?: string;
  answered_at?: string;
  answeredBy?: { id: string; name: string };
}

export interface StepApproval {
  id: string;
  status: "pending" | "approved" | "rejected";
  approval_round: number;
  approver_role?: string;
  remarks?: string;
  requested_at: string;
  acted_at?: string;
  requestedBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string };
}

export interface TicketStep {
  id: string;
  ticket_id: string;
  step_number: number;
  title?: string;
  description?: string;
  role_label?: string;
  target_date: string;
  assigned_technician_id?: string;
  requires_approval: boolean;
  has_checklist: boolean;
  status:
    | "pending"
    | "in_progress"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "completed";
  started_at?: string;
  completed_at?: string;
  rejection_count: number;
  technician_notes?: string;
  assignedTechnician?: { id: string; name: string; email: string };
  checklistQuestions?: ChecklistQuestion[];
  approvals?: StepApproval[];
}

export const technicianTicketApi = {
  /**
   * Get all tickets assigned to the logged-in technician
   * Backend returns: { success, count, tickets }
   */
  async getMyTickets(): Promise<{
    success: boolean;
    count: number;
    tickets: Ticket[];
  }> {
    const response = await api.get<{
      success: boolean;
      count: number;
      tickets: Ticket[];
    }>("/technician/tickets");
    return response;
  },

  /**
   * Get a single ticket by ID
   */
  async getTicketById(id: string): Promise<{ success: boolean; data: Ticket }> {
    const response = await api.get<{ success: boolean; data: Ticket }>(
      `/technician/tickets/${id}`,
    );
    return response;
  },

  /**
   * Start working on a ticket
   */
  async startTicket(
    id: string,
  ): Promise<{ success: boolean; message: string; data: Ticket }> {
    const response = await api.patch<{
      success: boolean;
      message: string;
      data: Ticket;
    }>(`/technician/tickets/${id}/start`, {});
    return response;
  },

  /**
   * Submit a ticket as completed with a comment, fixed status, and photos
   */
  async submitTicket(
    id: string,
    comment: string,
    isFixed: boolean,
    photoUrls: string[] = [],
  ): Promise<{ success: boolean; message: string; data: Ticket }> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: Ticket;
    }>(`/technician/tickets/${id}/submit`, { comment, isFixed, photoUrls });
    return response;
  },

  /**
   * Add a comment to a ticket
   */
  async addComment(
    id: string,
    comment: string,
  ): Promise<{ success: boolean; message: string; data: TicketResponse }> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: TicketResponse;
    }>(`/technician/tickets/${id}/comments`, { comment });
    return response;
  },

  /**
   * Start a workflow step
   */
  async startStep(taskId: string) {
    return api.post(`/tickets/tasks/${taskId}/start`, {});
  },

  /**
   * Submit a workflow step as completed
   */
  async submitStep(taskId: string, notes?: string) {
    return api.post(`/tickets/tasks/${taskId}/submit`, { notes });
  },

  /**
   * Save checklist answers for a step
   */
  async saveChecklist(
    taskId: string,
    answers: Array<{ question_id: string; answer: boolean; remarks?: string }>,
  ) {
    return api.post(`/tickets/tasks/${taskId}/checklist`, { answers });
  },

  // BM Maintenance
  async getBMIssueTypes() {
    return api.get('/tickets/bm/issue-types');
  },
  async getBMTicketDetail(ticketId: string) {
    return api.get(`/tickets/${ticketId}/bm`);
  },
  async transitionBMState(ticketId: string, payload: { nextState: string, bm_metadata?: any }) {
    return api.put(`/tickets/${ticketId}/bm/transition`, payload);
  },
  async attachBMSpares(ticketId: string, spares: Array<{ spare_id: string, quantity: number, remarks?: string }>) {
    return api.post(`/tickets/${ticketId}/bm/spares`, { spares });
  },
  async getAssetSpareHistory(assetId: string) {
    return api.get(`/tickets/asset/${assetId}/bm-spares`);
  }
};
