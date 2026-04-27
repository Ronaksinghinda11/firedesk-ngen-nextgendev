import { api } from '@/lib/api';
import type {
  Ticket,
  TicketFormData,
  TicketDropdownData,
  Asset,
  TicketApiResponse,
  SingleTicketApiResponse,
  TicketCreateResponse,
  AssetsApiResponse,
} from '@/types/ticket.types';

const API_BASE_URL = '/api/manager'; // Manager-specific ticket endpoints

// Ticket API
export const ticketApi = {
  /**
   * Get dropdown data for ticket form (plants, categories, technicians)
   */
  getDropdownData: async (): Promise<TicketDropdownData> => {
    const response = await api.get<TicketDropdownData>(`${API_BASE_URL}/tickets/dropdown-data`);
    return response.data || response;
  },

  /**
   * Get assets by plant and category
   */
  getAssets: async (plantId: string, categoryId: string): Promise<Asset[]> => {
    const response = await api.get<AssetsApiResponse>(`${API_BASE_URL}/tickets/assets`, {
      params: { plantId, categoryId },
    });
    return response.data?.assets || response.assets || [];
  },

  /**
   * Get all tickets
   * @param plantId - Optional plant ID to filter tickets
   * @param status - Optional status to filter tickets
   */
  getAll: async (plantId?: string | null, status?: string | null): Promise<Ticket[]> => {
    const params: Record<string, string> = {};
    if (plantId && plantId !== 'all') {
      params.plantId = plantId;
    }
    if (status && status !== 'all') {
      params.status = status;
    }
    const response = await api.get<TicketApiResponse>(`${API_BASE_URL}/tickets`, { params });
    return response.data?.tickets || response.tickets || [];
  },

  /**
   * Get single ticket by ID
   */
  getById: async (id: string): Promise<Ticket> => {
    const response = await api.get<SingleTicketApiResponse>(`${API_BASE_URL}/tickets/${id}`);
    return response.data?.ticket || response.ticket;
  },

  /**
   * Create new ticket
   */
  create: async (data: TicketFormData): Promise<Ticket> => {
    const response = await api.post<TicketCreateResponse>(`${API_BASE_URL}/tickets`, data);
    return response.data?.ticket || response.ticket;
  },

  /**
   * Update ticket
   */
  update: async (id: string, data: Partial<TicketFormData>): Promise<Ticket> => {
    const response = await api.put<TicketCreateResponse>(`${API_BASE_URL}/tickets/${id}`, data);
    return response.data?.ticket || response.ticket;
  },

  /**
   * Delete ticket
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`${API_BASE_URL}/tickets/${id}`);
  },

  /**
   * Approve a ticket
   */
  approve: async (id: string, comment?: string): Promise<Ticket> => {
    const response = await api.put<TicketCreateResponse>(
      `${API_BASE_URL}/tickets/${id}/approve`,
      { comment }
    );
    return response.data?.ticket || response.ticket;
  },

  /**
   * Reject a ticket
   */
  reject: async (id: string, comment: string): Promise<Ticket> => {
    const response = await api.put<TicketCreateResponse>(
      `${API_BASE_URL}/tickets/${id}/reject`,
      { comment }
    );
    return response.data?.ticket || response.ticket;
  },
};

export default ticketApi;
