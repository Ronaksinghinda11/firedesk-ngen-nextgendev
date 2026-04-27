import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Wrench, Archive, Ban } from 'lucide-react';

interface HealthStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const healthConfig: Record<string, {
  color: string;
  bgColor: string;
  icon: React.ElementType;
  label: string;
}> = {
  'Healthy': {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
    label: 'Healthy',
  },
  'Need Attention': {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: AlertCircle,
    label: 'Need Attention',
  },
  'AttentionRequired': {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: AlertCircle,
    label: 'Need Attention',
  },
  'Not Working': {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: XCircle,
    label: 'Not Working',
  },
  'NotWorking': {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: XCircle,
    label: 'Not Working',
  },
  'Under Maintenance': {
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: Wrench,
    label: 'Under Maintenance',
  },
  'Inventory': {
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: Archive,
    label: 'Inventory',
  },
  'De-Active': {
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: Ban,
    label: 'Deactivated',
  },
};

const HealthStatusBadge: React.FC<HealthStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const config = healthConfig[status] || {
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: AlertCircle,
    label: status,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: { badge: 'px-2 py-0.5 text-xs', icon: 'h-3 w-3' },
    md: { badge: 'px-3 py-1 text-sm', icon: 'h-4 w-4' },
    lg: { badge: 'px-4 py-1.5 text-base', icon: 'h-5 w-5' },
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bgColor} ${config.color} ${sizeClasses[size].badge}`}
    >
      {showIcon && <Icon className={sizeClasses[size].icon} />}
      {config.label}
    </span>
  );
};

export default HealthStatusBadge;
