import { api } from '@/lib/api';

const API_BASE = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';

export const adminServiceFormApi = {
    /**
     * Get service form view with submitted answers (Admin View)
     */
    async getServiceSubmissionView(serviceId: string): Promise<any> {
        const response = await api.get(`/service-forms/submissions/${serviceId}/view`);
        return response;
    },

    /**
     * Get PDF blob URL for preview
     * @param serviceId - The service submission ID
     * @returns Object with blobUrl for iframe preview
     */
    async getSubmissionPDF(serviceId: string): Promise<{ blobUrl: string; blob: Blob }> {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE}/service-forms/submissions/${serviceId}/pdf`, {
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
     * Revoke blob URL to free memory
     */
    revokeUrl(url: string): void {
        window.URL.revokeObjectURL(url);
    }
};

export default adminServiceFormApi;
