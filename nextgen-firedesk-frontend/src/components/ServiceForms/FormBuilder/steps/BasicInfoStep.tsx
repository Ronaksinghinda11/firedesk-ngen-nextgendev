import React from 'react';
import { FileText, Code, AlignLeft, FolderTree } from 'lucide-react';

interface BasicInfoStepProps {
  data: {
    serviceName: string;
    formCode: string;
    description: string;
    categoryId: string;
    serviceType?: string;
  };
  onChange: (data: any) => void;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
        <p className="text-gray-600">
          Provide the basic details for your service form
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FileText className="h-4 w-4" />
            Service Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.serviceName}
            onChange={(e) => onChange({ ...data, serviceName: e.target.value })}
            className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Fire Extinguisher Inspection"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            This will be the display name of the service form
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Code className="h-4 w-4" />
            Form Code (Optional)
          </label>
          <input
            type="text"
            value={data.formCode}
            onChange={(e) => onChange({ ...data, formCode: e.target.value })}
            className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., FORM_FE_INSP"
          />
          <p className="mt-1 text-sm text-gray-500">
            Optional unique identifier for the form (auto-generated if not provided)
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FolderTree className="h-4 w-4" />
            Service Type <span className="text-red-500">*</span>
          </label>
          <select
            value={data.serviceType || 'INSPECTION'}
            onChange={(e) => onChange({ ...data, serviceType: e.target.value })}
            className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            required
          >
            <option value="INSPECTION">Inspection</option>
            <option value="TESTING">Testing</option>
            <option value="MAINTENANCE">Maintenance</option>

          </select>
          <p className="mt-1 text-sm text-gray-500">
            This determines the type of questions available for this form
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <AlignLeft className="h-4 w-4" />
            Description (Optional)
          </label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe the purpose and scope of this service form"
            rows={4}
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FolderTree className="h-4 w-4" />
            Category ID (Optional)
          </label>
          <input
            type="text"
            value={data.categoryId}
            onChange={(e) => onChange({ ...data, categoryId: e.target.value })}
            className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Category UUID (if linking to a specific product category)"
          />
          <p className="mt-1 text-sm text-gray-500">
            Link this form to a specific product category
          </p>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Choose a clear, descriptive name that technicians will easily
          recognize. This will help them select the correct form when performing inspections.
        </p>
      </div>
    </div>
  );
};

export default BasicInfoStep;
