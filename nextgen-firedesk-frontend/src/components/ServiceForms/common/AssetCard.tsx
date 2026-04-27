import React from 'react';
import { Building2, MapPin, Package, Wrench, Calendar } from 'lucide-react';
import HealthStatusBadge from './HealthStatusBadge';
import PriorityScoreIndicator from './PriorityScoreIndicator';

interface AssetCardProps {
  asset: {
    id: string;
    assetId: string;
    building?: string;
    location?: string;
    type?: string;
    model?: string;
    healthStatus?: string;
    currentPriorityScore?: number;
    lastInspectionDate?: string;
    nextInspectionDue?: string;
    lat?: string;
    long?: string;
  };
  onClick?: () => void;
  selected?: boolean;
  showHealthStatus?: boolean;
  showPriorityScore?: boolean;
  showInspectionDates?: boolean;
  showGeoLocation?: boolean;
  compact?: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  onClick,
  selected = false,
  showHealthStatus = true,
  showPriorityScore = false,
  showInspectionDates = false,
  showGeoLocation = true,
  compact = false,
}) => {
  const baseClasses = `
    border rounded-lg p-4 transition-all duration-200
    ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
    ${selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 bg-white hover:border-gray-300'}
  `;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (compact) {
    return (
      <div className={baseClasses} onClick={onClick}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{asset.assetId}</h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
              {asset.building && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {asset.building}
                </span>
              )}
              {asset.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {asset.location}
                </span>
              )}
            </div>
          </div>
          {showHealthStatus && asset.healthStatus && (
            <HealthStatusBadge status={asset.healthStatus} size="sm" showIcon={false} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900">{asset.assetId}</h3>
          <div className="flex flex-wrap gap-2 mt-1">
            {asset.type && (
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                {asset.type}
              </span>
            )}
            {asset.model && (
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5" />
                {asset.model}
              </span>
            )}
          </div>
        </div>
        {showHealthStatus && asset.healthStatus && (
          <HealthStatusBadge status={asset.healthStatus} size="md" />
        )}
      </div>

      {/* Location Info */}
      <div className="space-y-2 mb-3">
        {asset.building && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Building:</span>
            <span>{asset.building}</span>
          </div>
        )}
        {asset.location && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Location:</span>
            <span>{asset.location}</span>
          </div>
        )}
        {showGeoLocation && asset.lat && asset.long && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Geo Location:</span>
            <span>Lat: {asset.lat}, Long: {asset.long}</span>
          </div>
        )}
      </div>

      {/* Priority Score */}
      {showPriorityScore && asset.currentPriorityScore !== undefined && (
        <div className="mb-3">
          <PriorityScoreIndicator
            score={asset.currentPriorityScore}
            showLabel={true}
            size="sm"
          />
        </div>
      )}

      {/* Inspection Dates */}
      {showInspectionDates && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Last Inspection
                </label>
              </div>
              <p className="text-sm text-gray-800">{formatDate(asset.lastInspectionDate)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Next Due
                </label>
              </div>
              <p
                className={`text-sm font-medium ${
                  asset.nextInspectionDue &&
                  new Date(asset.nextInspectionDue) < new Date()
                    ? 'text-red-600'
                    : 'text-gray-800'
                }`}
              >
                {formatDate(asset.nextInspectionDue)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetCard;
