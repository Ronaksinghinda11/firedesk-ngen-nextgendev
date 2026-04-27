import React from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import PriorityScoreIndicator from './PriorityScoreIndicator';

interface ConditionCardProps {
  condition: {
    id: string;
    conditionName: string;
    conditionCode?: string;
    severityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    priorityScore: number;
    healthImpact?: string;
    recommendedAction?: string;
    requiresImmediateAction?: boolean;
  };
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
}

const ConditionCard: React.FC<ConditionCardProps> = ({
  condition,
  onClick,
  selected = false,
  compact = false,
}) => {
  const baseClasses = `
    border rounded-lg p-4 transition-all duration-200
    ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
    ${selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 bg-white hover:border-gray-300'}
  `;

  if (compact) {
    return (
      <div className={baseClasses} onClick={onClick}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{condition.conditionName}</h4>
              {condition.requiresImmediateAction && (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
            </div>
            {condition.conditionCode && (
              <p className="text-xs text-gray-500">{condition.conditionCode}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={condition.severityLevel} size="sm" showIcon={false} />
            <span className="text-sm font-semibold text-gray-700">{condition.priorityScore}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg text-gray-900">{condition.conditionName}</h3>
            {condition.requiresImmediateAction && (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
          </div>
          {condition.conditionCode && (
            <p className="text-sm text-gray-500 font-mono">{condition.conditionCode}</p>
          )}
        </div>
        <SeverityBadge severity={condition.severityLevel} size="md" />
      </div>

      <div className="mb-3">
        <PriorityScoreIndicator score={condition.priorityScore} showLabel={true} size="md" />
      </div>

      {condition.healthImpact && (
        <div className="mb-3">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Health Impact
          </label>
          <p className="text-sm text-gray-800 mt-1">{condition.healthImpact}</p>
        </div>
      )}

      {condition.recommendedAction && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Recommended Action
              </label>
              <p className="text-sm text-gray-700 mt-1">{condition.recommendedAction}</p>
            </div>
          </div>
        </div>
      )}

      {condition.requiresImmediateAction && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">Requires Immediate Action</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionCard;
