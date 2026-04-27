import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface PdfViewerProps {
  pdfBlob: Blob | null;
  onClose: () => void;
  title?: string;
}

/**
 * PdfViewer Component
 *
 * Modal viewer for PDF blobs using iframe
 * Displays PDF inline with close button
 *
 * @example
 * <PdfViewer
 *   pdfBlob={blob}
 *   onClose={() => setBlob(null)}
 *   title="Inspection Report"
 * />
 */
export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfBlob,
  onClose,
  title = 'PDF Report'
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pdfBlob) {
      try {
        // Ensure the blob has the correct PDF MIME type
        const pdfBlobWithType = pdfBlob.type === 'application/pdf'
          ? pdfBlob
          : new Blob([pdfBlob], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(pdfBlobWithType);
        setPdfUrl(url);
        setLoading(false);

        // Cleanup
        return () => {
          window.URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Error creating PDF URL:', err);
        setError(true);
        setLoading(false);
      }
    }
  }, [pdfBlob]);

  if (!pdfBlob) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-11/12 h-5/6 bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                <p className="text-slate-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-slate-600">Failed to load PDF</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {pdfUrl && !error && (
            <object
              data={`${pdfUrl}#toolbar=1&navpanes=0`}
              type="application/pdf"
              className="w-full h-full border-0"
              title={title}
            >
              <embed
                src={`${pdfUrl}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className="w-full h-full"
              />
            </object>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
