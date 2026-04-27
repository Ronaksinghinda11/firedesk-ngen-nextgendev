import React from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface PriorityScoreIndicatorProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const getScoreConfig = (score: number) => {
  if (score >= 90) {
    return {
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Critical Priority',
      severity: 'CRITICAL',
    };
  } else if (score >= 70) {
    return {
      color: 'bg-orange-500',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      label: 'High Priority',
      severity: 'HIGH',
    };
  } else if (score >= 40) {
    return {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: 'Medium Priority',
      severity: 'MEDIUM',
    };
  } else if (score >= 20) {
    return {
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Low Priority',
      severity: 'LOW',
    };
  } else {
    return {
      color: 'bg-gray-500',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      label: 'Minimal Priority',
      severity: 'INFO',
    };
  }
};

const PriorityScoreIndicator: React.FC<PriorityScoreIndicatorProps> = ({
  score,
  showLabel = true,
  size = 'md',
}) => {
  const config = getScoreConfig(score);
  const normalizedScore = Math.min(Math.max(score, 0), 100);

  const sizeClasses = {
    sm: {
      container: 'text-xs',
      bar: 'h-1.5',
      icon: 'h-3 w-3',
      score: 'text-sm',
    },
    md: {
      container: 'text-sm',
      bar: 'h-2',
      icon: 'h-4 w-4',
      score: 'text-base',
    },
    lg: {
      container: 'text-base',
      bar: 'h-3',
      icon: 'h-5 w-5',
      score: 'text-lg',
    },
  };

  return (
    <div className={`${sizeClasses[size].container}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            {normalizedScore >= 70 && (
              <AlertTriangle className={`${sizeClasses[size].icon} ${config.textColor}`} />
            )}
            {normalizedScore < 70 && (
              <TrendingUp className={`${sizeClasses[size].icon} ${config.textColor}`} />
            )}
            <span className={`font-medium ${config.textColor}`}>{config.label}</span>
          </div>
          <span className={`font-bold ${config.textColor} ${sizeClasses[size].score}`}>
            {normalizedScore}
          </span>
        </div>
      )}

      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size].bar}`}>
        <div
          className={`${config.color} ${sizeClasses[size].bar} rounded-full transition-all duration-300`}
          style={{ width: `${normalizedScore}%` }}
        />
      </div>

      {!showLabel && (
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs ${config.textColor}`}>Priority</span>
          <span className={`text-xs font-semibold ${config.textColor}`}>{normalizedScore}/100</span>
        </div>
      )}
    </div>
  );
};

export default PriorityScoreIndicator;
