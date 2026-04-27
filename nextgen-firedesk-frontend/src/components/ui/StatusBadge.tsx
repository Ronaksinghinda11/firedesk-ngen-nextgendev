import React from 'react';

type BadgeStatus = 'READY' | 'WARNING' | 'CRITICAL' | 'ATTENTION' | 'EXPIRING_SOON';

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
}

const STATUS_STYLES: Record<BadgeStatus, string> = {
  READY: 'bg-green-100 text-green-700 border-green-200',
  WARNING: 'bg-orange-100 text-orange-700 border-orange-200',
  ATTENTION: 'bg-orange-100 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  EXPIRING_SOON: 'bg-orange-100 text-orange-700 border-orange-200',
};

const DEFAULT_LABELS: Record<BadgeStatus, string> = {
  READY: 'READY',
  WARNING: 'WARNING',
  ATTENTION: 'ATTENTION',
  CRITICAL: 'CRITICAL',
  EXPIRING_SOON: 'Expiring Soon',
};

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status]} ${className}`}
    >
      {label ?? DEFAULT_LABELS[status]}
    </span>
  );
}

export default StatusBadge;
