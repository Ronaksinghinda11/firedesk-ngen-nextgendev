import React from 'react';
import { Fuel, Droplets, Battery, Gauge, LucideIcon } from 'lucide-react';
import { CircularGauge, SemiCircularGauge, BatteryIcon, PressureGauge } from '@/components/gauges/CustomGauges';
import { cn } from '@/lib/utils';

interface SupportSystemCardProps {
    title: string;
    type: 'diesel' | 'water' | 'battery' | 'pressure';
    capacity: number;
    present: number;
    required: number;
    unit: string;
    percentage?: number; // Optional: pre-calculated percentage
    className?: string;
}

/**
 * Support System Status Card Component
 * Displays diesel, water, battery, or pressure status with custom gauges
 */
export const SupportSystemCard: React.FC<SupportSystemCardProps> = ({
    title,
    type,
    capacity,
    present,
    required,
    unit,
    percentage: providedPercentage,
    className
}) => {
    // Use provided percentage or calculate from capacity/present
    const percentage = providedPercentage !== undefined
        ? providedPercentage
        : (capacity > 0 ? (present / capacity) * 100 : 0);

    const getIcon = (): LucideIcon => {
        switch (type) {
            case 'diesel': return Fuel;
            case 'water': return Droplets;
            case 'battery': return Battery;
            case 'pressure': return Gauge;
        }
    };

    const Icon = getIcon();

    const getStatusColor = (percent: number) => {
        if (percent > 75) return 'text-green-600';
        if (percent > 50) return 'text-amber-600';
        return 'text-red-600';
    };

    const getStatusText = (percent: number) => {
        if (percent > 75) return 'Satisfactory';
        if (percent > 50) return 'Needs Attention';
        return 'Critical';
    };

    const renderGauge = () => {
        switch (type) {
            case 'diesel':
                return <SemiCircularGauge percentage={percentage} label="D" />;
            case 'water':
                return <CircularGauge percentage={percentage} color="#3b82f6" />;
            case 'battery':
                return <BatteryIcon percentage={percentage} />;
            case 'pressure':
                return <PressureGauge percentage={percentage} />;
        }
    };

    return (
        <div className={cn(
            "p-6 rounded-xl border-2 border-border/40 bg-gradient-to-br from-card to-card/80",
            "hover:border-primary/30 hover:shadow-xl transition-all duration-300 shadow-md",
            className
        )}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-border/30">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-bold text-foreground">{title}</h3>
            </div>

            {/* Gauge Visualization */}
            <div className="flex justify-center mb-5">
                {renderGauge()}
            </div>

            {/* Status Details */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                    <span className="text-xs font-semibold text-muted-foreground">Status</span>
                    <span className={cn(
                        "text-xs font-bold px-3 py-1 rounded-lg",
                        percentage > 75 ? "bg-green-500/10 text-green-700" :
                            percentage > 50 ? "bg-amber-500/10 text-amber-700" :
                                "bg-red-500/10 text-red-700"
                    )}>
                        {getStatusText(percentage)}
                    </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                    <span className="text-xs font-semibold text-muted-foreground">Capacity</span>
                    <span className="text-xs font-bold text-foreground">{capacity.toFixed(2)} {unit}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                    <span className="text-xs font-semibold text-muted-foreground">Present</span>
                    <span className="text-xs font-bold text-foreground">{present.toFixed(2)} {unit}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                    <span className="text-xs font-semibold text-muted-foreground">Required</span>
                    <span className="text-xs font-bold text-foreground">{required.toFixed(2)} {unit}</span>
                </div>
            </div>
        </div>
    );
};
