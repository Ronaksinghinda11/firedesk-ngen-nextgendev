/**
 * Manager Service Form API
 * Handles API calls for viewing and approving/rejecting service form submissions
 */

import { api } from '@/lib/api';

const API_BASE_URL = '/manager';
const API_BASE = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';

export const managerServiceFormApi = {
  /**
   * Get service form view with submitted answers
   */
  async getServiceFormView(serviceId: string): Promise<any> {
    const response = await api.get(`${API_BASE_URL}/services/${serviceId}/form-view`);
    return response;
  },

  /**
   * Get service form definition
   */
  async getFormById(formId: string): Promise<any> {
    const response = await api.get(`/service-forms/forms/${formId}`);
    return response;
  },

  /**
   * Get service submission as PDF for preview
   * @param serviceId - The service submission ID
   * @returns Object with blobUrl for iframe preview and blob for download
   */
  async getSubmissionPDF(serviceId: string): Promise<{ blobUrl: string; blob: Blob }> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE}/api/manager/form/submission/${serviceId}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Check if the response is JSON (error message)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json().catch(() => ({ message: 'Failed to generate PDF' }));
        throw new Error(error.message || 'Failed to generate PDF');
      }
      throw new Error('Failed to generate PDF');
    }

    const blob = await response.blob();
    // Ensure the blob has the correct PDF MIME type
    const pdfBlob = blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(pdfBlob);
    return { blobUrl, blob: pdfBlob };
  },

  /**
   * Download PDF from blob URL
   * @param blobUrl - The blob URL to download from
   * @param filename - The filename for the download
   */
  downloadFromUrl(blobUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Download service submission as PDF with answers (legacy - auto downloads)
   * @param serviceId - The service submission ID
   */
  async downloadSubmissionPDF(serviceId: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE}/api/manager/form/submission/${serviceId}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service-submission-${serviceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Download blank service form template as PDF for a specific frequency
   * @param formId - The service form ID
   * @param frequency - The inspection frequency (daily, weekly, etc.)
   */
  async downloadPDF(formId: string, frequency: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE}/api/form/${formId}/pdf/${frequency}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service-form-${formId}-${frequency}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Get service form PDF preview
   */
  async getPDFPreview(formId: string, frequency: string): Promise<{ blobUrl: string; filename: string }> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE}/service-forms/forms/${formId}/pdf-preview?frequency=${frequency}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate PDF');
    }

    const blob = await response.blob();
    const pdfBlob = blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });

    const blobUrl = window.URL.createObjectURL(pdfBlob);
    return { blobUrl, filename: `service-form-${formId}-${frequency}.pdf` };
  },

  /**
   * Get all service forms for manager (with filters)
   */
  async getAll(filters?: any): Promise<any> {
    const response = await api.get(`/service-forms/forms`, { params: filters });
    return response;
  },

  /**
   * Create a new service form
   */
  async create(data: any): Promise<any> {
    const response = await api.post(`/service-forms/forms`, data);
    return response;
  },

  /**
   * Update an existing service form
   */
  async update(formId: string, data: any): Promise<any> {
    const response = await api.put(`/service-forms/forms/${formId}`, data);
    return response;
  },

  /**
   * Delete a service form
   */
  async delete(formId: string): Promise<any> {
    const response = await api.delete(`/service-forms/forms/${formId}`);
    return response;
  },

  /**
   * Approve a service submission
   */
  async approveService(serviceId: string, remarks?: string): Promise<any> {
    const response = await api.post(`${API_BASE_URL}/services/${serviceId}/approve`, {
      remarks: remarks || ''
    });
    return response;
  },

  /**
   * Reject a service submission
   */
  async rejectService(serviceId: string, remarks: string): Promise<any> {
    const response = await api.post(`${API_BASE_URL}/services/${serviceId}/reject`, {
      remarks
    });
    return response;
  }
};

export default managerServiceFormApi;
