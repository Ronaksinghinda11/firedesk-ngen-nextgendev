import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import axios from 'axios';

interface ExportPdfButtonProps {
  endpoint: string;
  filters: Record<string, any>;
  filename?: string;
  label?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * ExportPdfButton Component
 *
 * Button that triggers PDF generation and download
 * Uses blob-based preview for smooth UX
 *
 * @example
 * <ExportPdfButton
 *   endpoint="/api/reports/service/pdf"
 *   filters={{ serviceType: 'Inspection', startDate, endDate }}
 *   filename="inspection_report.pdf"
 * />
 */
export const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({
  endpoint,
  filters,
  filename = 'report.pdf',
  label = 'Export PDF',
  className = '',
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      // Make request to backend
      const response = await axios.post(endpoint, filters, {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Convert to Blob
      const blob = new Blob([response.data], { type: 'application/pdf' });

      // Create object URL
      const url = window.URL.createObjectURL(blob);

      // Open in new window
      const newWindow = window.open(url, '_blank');

      if (!newWindow) {
        // Fallback: trigger download if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      onSuccess?.();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      onError?.(error as Error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-md
        bg-orange-500 hover:bg-orange-600 text-white font-medium
        disabled:bg-gray-400 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

export default ExportPdfButton;
