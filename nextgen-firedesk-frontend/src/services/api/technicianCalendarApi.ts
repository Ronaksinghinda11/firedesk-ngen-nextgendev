import { api } from '@/lib/api';

const API_BASE_URL = '/technician';

// Types
export interface Asset {
  id: string;
  assetId?: string;
  assetCode: string;
  location: string;
  buildingId?: string;
  category?: { id: string; categoryName: string };
  product?: { id: string; productName: string };
  building?: { id: string; buildingName: string };
  plant?: {
    id: string;
    plantName: string;
    plantCode?: string;
  };
}

export interface Form {
  id: string;
  serviceName: string;
  formCode: string;
  serviceType?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ServiceSubmission {
  id: string;
  type: 'service';
  submissionNumber: string;
  scheduledDate: string;
  status: string;
  approvalStatus?: string;
  inspectionType?: string;
  frequency: {
    id: string | null;
    frequencyName: string;
    frequencyCode?: string | null;
  };
  qrVerified?: boolean;
  asset: Asset;
  plant?: {
    id: string;
    plantName: string;
    plantCode?: string;
  };
  form: Form;
  inspectionFrequency?: {
    id: string;
    frequencyName: string;
  };
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
}

export interface TicketSubmission {
  id: string;
  type: 'ticket';
  ticketCode: string;
  taskName: string;
  taskDescription?: string;
  targetDate: string;
  completedStatus: 'Pending' | 'Rejected' | 'Waiting for approval' | 'Completed';
  ticketCategory?: string;
  asset?: Asset;
  plant?: {
    id: string;
    plantName: string;
    plantCode?: string;
  };
  createdBy?: User;
  latestResponse?: any;
  createdAt: string;
}

export interface CalendarDate {
  date: string;
  serviceDatas: ServiceSubmission[];
  tickets: TicketSubmission[];
}

export interface CalendarStatistics {
  services: {
    due: number;
    lapsed: number;
    upcoming: number;
    completed: number;
    submitted: number;
    cancelled: number;
    total: number;
  };
  tickets: {
    PENDING: number;
    waitingApproval: number;
    completed: number;
    rejected: number;
    total: number;
  };
}

/**
 * Technician Calendar API
 * Fetches calendar events (services and tickets) for the logged-in technician
 */
export const technicianCalendarApi = {
  /**
   * Get calendar events for a specific month
   * @param month - Month number (1-12)
   * @param year - Year number
   */
  async getCalendarEvents(month: number, year: number) {
    const response = await api.get<{ success: boolean; data: CalendarDate[] }>(
      `${API_BASE_URL}/calendar/events`,
      {
        params: { month, year }
      }
    );
    return response.data;
  },

  /**
   * Get statistics for technician's calendar
   */
  async getStatistics() {
    const response = await api.get<{ success: boolean; data: CalendarStatistics }>(
      `${API_BASE_URL}/calendar/statistics`
    );
    return response.data;
  },

  /**
   * Get technician's assigned plants for report filtering
   */
  async getMyPlants(): Promise<{ id: string; plantName: string; address?: string }[]> {
    const response = await api.get<{ success: boolean; plants: { id: string; plantName: string; address?: string }[] }>(
      `${API_BASE_URL}/performance-report/plants`
    );
    return response.plants || [];
  },

  /**
   * Generate Performance Report PDF
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @param plantId - Optional plant ID filter
   * @returns Blob URL for PDF preview
   */
  async generatePerformanceReportPDF(startDate: string, endDate: string, plantId?: string): Promise<{ blobUrl: string; filename: string }> {
    const token = localStorage.getItem('accessToken');
    const apiBase = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001/api';
    let url = `${apiBase}/technician/performance-report/pdf?startDate=${startDate}&endDate=${endDate}`;
    if (plantId) {
      url += `&plantId=${plantId}`;
    }
    const response = await fetch(
      url,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const error = await response.json().catch(() => ({ message: 'Failed to generate PDF' }));
        throw new Error(error.message || 'Failed to generate PDF');
      }
      throw new Error('Failed to generate PDF');
    }

    const blob = await response.blob();
    const pdfBlob = blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(pdfBlob);
    const filename = `Performance_Report_${startDate}_to_${endDate}.pdf`;

    return { blobUrl, filename };
  }
};

