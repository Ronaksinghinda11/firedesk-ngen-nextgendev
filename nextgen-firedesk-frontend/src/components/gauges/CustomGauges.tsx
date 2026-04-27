import React from 'react';

interface CircularGaugeProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
    showPercentage?: boolean;
}

/**
 * Circular gauge component for water storage (47% style from design)
 * Uses SVG to create a circular progress indicator
 */
export const CircularGauge: React.FC<CircularGaugeProps> = ({
    percentage,
    size = 120,
    strokeWidth = 10,
    color,
    backgroundColor = '#e5e7eb',
    showPercentage = true
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    // Determine color based on percentage if not provided
    const fillColor = color || (
        percentage > 75 ? '#3b82f6' : // Blue for good
            percentage > 50 ? '#f59e0b' : // Orange for warning
                '#ef4444' // Red for critical
    );

    // Scale font size based on gauge size
    const fontSize = size < 80 ? 'text-sm' : size < 100 ? 'text-lg' : 'text-2xl';

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={backgroundColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={fillColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
            </svg>
            {showPercentage && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`${fontSize} font-bold text-foreground`}>{Math.round(percentage)}%</span>
                </div>
            )}
        </div>
    );
};

interface SemiCircularGaugeProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    label?: string;
    showLabel?: boolean;
}

/**
 * Semi-circular gauge component for diesel storage (speedometer style)
 * Like a speedometer with indicator
 */
export const SemiCircularGauge: React.FC<SemiCircularGaugeProps> = ({
    percentage,
    size = 140,
    strokeWidth = 12,
    label = 'D',
    showLabel = true
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    // Determine color based on percentage
    const getColor = (percent: number) => {
        if (percent > 75) return '#22c55e'; // Green
        if (percent > 50) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const fillColor = getColor(percentage);

    // Calculate needle angle (from -90deg to 90deg based on percentage)
    const needleAngle = -90 + (percentage / 100) * 180;

    // Scale font sizes based on gauge size
    const labelSize = size < 90 ? 'text-xl' : size < 120 ? 'text-2xl' : 'text-3xl';
    const percentSize = size < 90 ? 'text-sm' : size < 120 ? 'text-base' : 'text-lg';

    return (
        <div className="relative inline-flex flex-col items-center">
            <svg width={size} height={size / 2 + 20} className="overflow-visible">
                {/* Background arc */}
                <path
                    d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                    stroke="#e5e7eb"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress arc */}
                <path
                    d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                    stroke={fillColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
                {/* Needle */}
                <line
                    x1={size / 2}
                    y1={size / 2}
                    x2={size / 2}
                    y2={strokeWidth + 5}
                    stroke={fillColor}
                    strokeWidth={3}
                    strokeLinecap="round"
                    transform={`rotate(${needleAngle} ${size / 2} ${size / 2})`}
                    className="transition-all duration-500 ease-out"
                />
                {/* Center dot */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={6}
                    fill={fillColor}
                />
            </svg>
            {showLabel && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/4">
                    <span className={`${labelSize} font-bold text-muted-foreground`}>{label}</span>
                </div>
            )}
            <div className="mt-1">
                <span className={`${percentSize} font-bold text-foreground`}>{Math.round(percentage)}%</span>
            </div>
        </div>
    );
};

interface BatteryIconProps {
    percentage: number;
    size?: number;
    showValue?: boolean;
}

/**
 * Battery icon with fill level indicator
 * Green background for good status
 */
export const BatteryIcon: React.FC<BatteryIconProps> = ({
    percentage,
    size = 100,
    showValue = true
}) => {
    const getColor = (percent: number) => {
        if (percent > 75) return '#22c55e'; // Green
        if (percent > 50) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const fillColor = getColor(percentage);
    const fillHeight = (percentage / 100) * 60; // Max fill height is 60 (battery body height)

    return (
        <div className="relative inline-flex flex-col items-center">
            <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
                {/* Battery terminal */}
                <rect
                    x="40"
                    y="10"
                    width="20"
                    height="8"
                    rx="2"
                    fill="currentColor"
                    className="text-muted-foreground"
                />
                {/* Battery body outline */}
                <rect
                    x="20"
                    y="18"
                    width="60"
                    height="70"
                    rx="6"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-muted-foreground"
                />
                {/* Battery fill */}
                <rect
                    x="25"
                    y={88 - fillHeight}
                    width="50"
                    height={fillHeight}
                    rx="3"
                    fill={fillColor}
                    className="transition-all duration-500 ease-out"
                />
            </svg>
            {showValue && (
                <div className="mt-2">
                    <span className="text-lg font-bold text-foreground">{Math.round(percentage)}%</span>
                </div>
            )}
        </div>
    );
};

interface PressureGaugeProps {
    percentage: number;
    size?: number;
}

/**
 * Pressure gauge with needle indicator
 * Similar to analog pressure meter
 */
export const PressureGauge: React.FC<PressureGaugeProps> = ({
    percentage,
    size = 120
}) => {
    const radius = size / 2 - 10;

    const getColor = (percent: number) => {
        if (percent > 75) return '#22c55e'; // Green
        if (percent > 50) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const fillColor = getColor(percentage);

    // Calculate needle angle (from -135deg to 135deg based on percentage)
    const needleAngle = -135 + (percentage / 100) * 270;

    // Generate tick marks
    const ticks = [];
    for (let i = 0; i <= 10; i++) {
        const angle = -135 + (i / 10) * 270;
        const angleRad = (angle * Math.PI) / 180;
        const x1 = size / 2 + (radius - 15) * Math.cos(angleRad);
        const y1 = size / 2 + (radius - 15) * Math.sin(angleRad);
        const x2 = size / 2 + (radius - 5) * Math.cos(angleRad);
        const y2 = size / 2 + (radius - 5) * Math.sin(angleRad);

        ticks.push(
            <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={i * 10 <= percentage ? fillColor : '#e5e7eb'}
                strokeWidth={2}
                strokeLinecap="round"
            />
        );
    }

    return (
        <div className="relative inline-flex flex-col items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Outer circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#e5e7eb"
                    strokeWidth={2}
                    fill="none"
                />
                {/* Tick marks */}
                {ticks}
                {/* Needle */}
                <line
                    x1={size / 2}
                    y1={size / 2}
                    x2={size / 2}
                    y2={20}
                    stroke={fillColor}
                    strokeWidth={3}
                    strokeLinecap="round"
                    transform={`rotate(${needleAngle} ${size / 2} ${size / 2})`}
                    className="transition-all duration-500 ease-out"
                />
                {/* Center circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={8}
                    fill={fillColor}
                />
                {/* Percentage text */}
                <text
                    x={size / 2}
                    y={size / 2 + 30}
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="bold"
                    fill="currentColor"
                    className="text-foreground"
                >
                    {Math.round(percentage)}%
                </text>
            </svg>
        </div>
    );
};
