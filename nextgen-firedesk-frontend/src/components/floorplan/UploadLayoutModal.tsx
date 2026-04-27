import React, { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { layoutApi } from '@/lib/api';

interface UploadLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  floorData: {
    plantId: string;
    buildingId: string;
    floorId: string;
    wingId?: string;
    plantName: string;
    buildingName: string;
    floorName: string;
    wingName?: string;
  };
}

export const UploadLayoutModal: React.FC<UploadLayoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  floorData,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [layoutType, setLayoutType] = useState<string>('floorplan');
  const [health, setHealth] = useState<string>('good');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type (SVG or PDF only)
    const allowedExtensions = ['.svg', '.pdf'];
    const ext = '.' + (selectedFile.name.split('.').pop() || '').toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setError('Please upload an SVG or PDF file');
      return;
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 20MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await layoutApi.uploadLayout({
        plantId: floorData.plantId,
        buildingId: floorData.buildingId,
        floorId: floorData.floorId,
        wingId: floorData.wingId,
        layoutType,
        health,
        layoutFile: file,
      });

      if (response.success) {
        onSuccess();
        handleClose();
      } else {
        setError(response.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload layout');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setLayoutType('floorplan');
    setHealth('good');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-900">
            Upload Floor Layout
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={uploading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Floor Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Floor Details
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><span className="font-medium">Plant:</span> {floorData.plantName}</p>
              <p><span className="font-medium">Building:</span> {floorData.buildingName}</p>
              <p><span className="font-medium">Floor:</span> {floorData.floorName}</p>
              {floorData.wingName && (
                <p><span className="font-medium">Wing:</span> {floorData.wingName}</p>
              )}
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center
              transition-colors cursor-pointer
              ${dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
              }
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && document.getElementById('fileInput')?.click()}
          >
            <input
              id="fileInput"
              type="file"
              accept=".svg,.pdf"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={uploading}
            />

            {file ? (
              <div className="space-y-2">
                <CheckCircle className="mx-auto text-green-500" size={48} />
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={uploading}
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto text-gray-400" size={48} />
                <p className="text-sm font-medium text-gray-900">
                  Drop your layout file here or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Supported formats: SVG, PDF (Max 20MB)
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Layout'}
          </button>
        </div>
      </div>
    </div>

  );
};