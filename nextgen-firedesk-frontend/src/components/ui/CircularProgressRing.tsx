import React from 'react';

interface CircularProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CircularProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  className = '',
}: CircularProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  const strokeColor =
    value >= 90 ? '#16a34a' : value >= 70 ? '#f97316' : '#dc2626';

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute font-bold"
        style={{
          color: strokeColor,
          fontSize: `${Math.max(10, size * 0.26)}px`
        }}
      >
        {Math.round(value)}%
      </span>
    </div>
  );
}

export default CircularProgressRing;
