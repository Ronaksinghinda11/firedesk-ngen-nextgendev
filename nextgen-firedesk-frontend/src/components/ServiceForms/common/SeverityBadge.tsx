import React from 'react';
import { AlertTriangle, AlertCircle, Info, MinusCircle } from 'lucide-react';

interface SeverityBadgeProps {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const severityConfig = {
  CRITICAL: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: AlertTriangle,
    label: 'Critical',
  },
  HIGH: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: AlertCircle,
    label: 'High',
  },
  MEDIUM: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    icon: MinusCircle,
    label: 'Medium',
  },
  LOW: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: Info,
    label: 'Low',
  },
  INFO: {
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: Info,
    label: 'Info',
  },
};

const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  showIcon = true,
}) => {
  const config = severityConfig[severity];
  const Icon = config.icon;

  const sizeClasses = {
    sm: { badge: 'px-2 py-0.5 text-xs', icon: 'h-3 w-3' },
    md: { badge: 'px-3 py-1 text-sm', icon: 'h-4 w-4' },
    lg: { badge: 'px-4 py-1.5 text-base', icon: 'h-5 w-5' },
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold border ${config.bgColor} ${config.color} ${config.borderColor} ${sizeClasses[size].badge}`}
    >
      {showIcon && <Icon className={sizeClasses[size].icon} />}
      {config.label}
    </span>
  );
};

export default SeverityBadge;
