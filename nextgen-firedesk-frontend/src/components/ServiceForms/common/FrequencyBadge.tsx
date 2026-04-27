import React from 'react';

interface Frequency {
  code: string;
  name: string;
}

interface FrequencyBadgeProps {
  // Accept either a frequency object OR individual props
  frequency?: Frequency;
  frequencyName?: string;
  frequencyCode?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline';
}

const frequencyColors: Record<string, string> = {
  DAILY: 'bg-red-100 text-red-800 border-red-200',
  WEEKLY: 'bg-blue-100 text-blue-800 border-blue-200',
  FORTNIGHTLY: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  MONTHLY: 'bg-green-100 text-green-800 border-green-200',
  QUARTERLY: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HALF_YEARLY: 'bg-orange-100 text-orange-800 border-orange-200',
  YEARLY: 'bg-purple-100 text-purple-800 border-purple-200',
};

const FrequencyBadge: React.FC<FrequencyBadgeProps> = ({
  frequency,
  frequencyName,
  frequencyCode,
  size = 'md',
  variant = 'default',
}) => {
  // If frequency object is provided, use it; otherwise use individual props
  const name = frequency?.name || frequencyName || '';
  const code = frequency?.code || frequencyCode || '';

  const colorClass = code
    ? frequencyColors[code] || 'bg-gray-100 text-gray-800 border-gray-200'
    : 'bg-gray-100 text-gray-800 border-gray-200';

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const baseClasses = `inline-flex items-center justify-center rounded-full font-medium ${sizeClasses[size]}`;
  const variantClasses = variant === 'outline' ? 'border-2 bg-transparent' : '';

  return (
    <span className={`${baseClasses} ${colorClass} ${variantClasses}`}>
      {name}
    </span>
  );
};

export default FrequencyBadge;
