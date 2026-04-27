import React from 'react';
import { Calendar, Building2, FileText } from 'lucide-react';

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  reportPeriod?: string;
  plantName?: string;
  serviceType?: string;
  generatedOn?: string;
}

/**
 * ReportHeader Component
 *
 * Displays report title and metadata
 * Orange/Slate theme styling
 *
 * @example
 * <ReportHeader
 *   title="Inspection Report"
 *   subtitle="Fire Extinguishers"
 *   reportPeriod="Jan 1, 2024 - Jan 31, 2024"
 *   plantName="Plant A"
 * />
 */
export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subtitle,
  reportPeriod,
  plantName,
  serviceType,
  generatedOn
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* Title Section */}
      <div className="border-b-2 border-orange-500 pb-4 mb-4">
        <h1 className="text-2xl font-bold text-slate-700">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>

      {/* Metadata Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
        {reportPeriod && (
          <div className="flex items-start gap-2">
            <Calendar className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-0.5">Report Period</p>
              <p className="text-sm text-slate-700">{reportPeriod}</p>
            </div>
          </div>
        )}

        {plantName && (
          <div className="flex items-start gap-2">
            <Building2 className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-0.5">Plant</p>
              <p className="text-sm text-slate-700">{plantName}</p>
            </div>
          </div>
        )}

        {serviceType && (
          <div className="flex items-start gap-2">
            <FileText className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-0.5">Service Type</p>
              <p className="text-sm text-slate-700">{serviceType}</p>
            </div>
          </div>
        )}

        {generatedOn && (
          <div className="flex items-start gap-2">
            <FileText className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-0.5">Generated On</p>
              <p className="text-sm text-slate-700">{generatedOn}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportHeader;
