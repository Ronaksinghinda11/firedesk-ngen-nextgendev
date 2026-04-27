import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PumpData {
    name: string;
    mode: string;
    status: 'ON' | 'OFF';
    flow: number;
    runHours: number;
    healthStatus?: number;
    tripStatus?: number;
    powerStatus?: number;
}

interface PumpAvailabilityCardProps {
    pump: PumpData;
    className?: string;
}

/**
 * Pump Availability Card Component
 * Shows individual pump status, mode, flow, and run hours
 */
export const PumpAvailabilityCard: React.FC<PumpAvailabilityCardProps> = ({
    pump,
    className
}) => {
    const isReady = pump.status === 'ON' && pump.tripStatus === 0;
    const hasIssue = pump.tripStatus === 1 || pump.powerStatus === 1;

    const getStatusIcon = () => {
        if (hasIssue) return <AlertTriangle className="h-5 w-5" />;
        if (isReady) return <CheckCircle2 className="h-5 w-5" />;
        return <XCircle className="h-5 w-5" />;
    };

    const getStatusColor = () => {
        if (hasIssue) return 'border-red-500/50 bg-red-50/50';
        if (isReady) return 'border-green-500/50 bg-green-50/50';
        return 'border-gray-300 bg-gray-50/50';
    };

    const getStatusTextColor = () => {
        if (hasIssue) return 'text-red-700';
        if (isReady) return 'text-green-700';
        return 'text-gray-600';
    };

    const getStatusText = () => {
        if (hasIssue) return 'ISSUE DETECTED';
        if (isReady) return 'READY';
        return 'NOT READY';
    };

    return (
        <div className={cn(
            "flex-shrink-0 bg-card rounded-xl border-2 transition-all duration-300 p-4 shadow-md",
            getStatusColor(),
            "hover:shadow-xl",
            className
        )}>
            {/* Header with Pump Name and Status Icon */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" strokeWidth={2} />
                    <h4 className="text-sm font-bold text-foreground">{pump.name}</h4>
                </div>
                <div className={cn("flex items-center gap-1", getStatusTextColor())}>
                    {getStatusIcon()}
                </div>
            </div>

            {/* Status Badge */}
            <div className="mb-3">
                <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold",
                    hasIssue ? "bg-red-500/20 text-red-700" :
                        isReady ? "bg-green-500/20 text-green-700" :
                            "bg-gray-500/20 text-gray-700"
                )}>
                    <span className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        hasIssue ? "bg-red-600" :
                            isReady ? "bg-green-600" :
                                "bg-gray-600"
                    )} />
                    {getStatusText()}
                </span>
            </div>

            {/* Trip Fault Detection */}
            {hasIssue && (
                <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-semibold text-red-700">
                            {pump.tripStatus === 1 ? 'Trip Fault Detected' : 'Power Issue'}
                        </span>
                    </div>
                </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-muted/40">
                    <div className="text-xs font-semibold text-muted-foreground mb-0.5">Mode</div>
                    <div className="text-sm font-bold text-foreground">{pump.mode}</div>
                </div>

                <div className="p-2 rounded-lg bg-muted/40">
                    <div className="text-xs font-semibold text-muted-foreground mb-0.5">Status</div>
                    <div className={cn(
                        "text-sm font-bold",
                        pump.status === 'ON' ? 'text-green-600' : 'text-gray-600'
                    )}>
                        {pump.status}
                    </div>
                </div>

                <div className="p-2 rounded-lg bg-muted/40">
                    <div className="text-xs font-semibold text-muted-foreground mb-0.5">Flow</div>
                    <div className="text-sm font-bold text-foreground">{pump.flow} LPM</div>
                </div>

                <div className="p-2 rounded-lg bg-muted/40">
                    <div className="text-xs font-semibold text-muted-foreground mb-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Hours
                    </div>
                    <div className="text-sm font-bold text-foreground">
                        {pump.runHours.toLocaleString()} hrs
                    </div>
                </div>
            </div>
        </div>
    );
};
