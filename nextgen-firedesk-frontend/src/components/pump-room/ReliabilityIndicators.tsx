import React from 'react';
import { Zap, Battery, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReliabilityIndicatorsProps {
    power: string;
    batteryHealth: string;
    engineOilPressure: string;
    waterTemperature: string;
    batteryCharging: string;
    className?: string;
}

/**
 * Reliability Indicators Component
 * Shows power, battery & reliability status for diesel pump engine
 */
export const ReliabilityIndicators: React.FC<ReliabilityIndicatorsProps> = ({
    power,
    batteryHealth,
    engineOilPressure,
    waterTemperature,
    batteryCharging,
    className
}) => {
    const getStatusColor = (status: string) => {
        const normalized = status.toLowerCase();
        if (normalized === 'normal' || normalized === 'good') return 'text-green-600 bg-green-50';
        if (normalized === 'warning') return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };

    const indicators = [
        {
            icon: Zap,
            label: 'Engine Oil Pressure',
            value: engineOilPressure,
        },
        {
            icon: Activity,
            label: 'Water Temperature',
            value: waterTemperature,
        },
        {
            icon: Battery,
            label: 'Battery Charging',
            value: batteryCharging,
        },
        {
            icon: Battery,
            label: 'Battery Health',
            value: batteryHealth,
        },
    ];

    return (
        <div className={cn("space-y-4", className)}>
            <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Power, Battery & Reliability
            </h3>

            <div className="grid grid-cols-2 gap-3">
                {indicators.map((indicator, index) => {
                    const Icon = indicator.icon;
                    return (
                        <div
                            key={index}
                            className="p-4 rounded-xl border-2 border-border/40 bg-gradient-to-br from-card to-card/80 hover:border-primary/30 transition-all duration-300"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                                    <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground">
                                    {indicator.label}
                                </span>
                            </div>
                            <div className={cn(
                                "px-3 py-2 rounded-lg font-bold text-sm text-center",
                                getStatusColor(indicator.value)
                            )}>
                                {indicator.value}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
