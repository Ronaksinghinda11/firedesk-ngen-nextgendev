import React from 'react';
import {
    AlertTriangle,
    CheckCircle,
    Fuel,
    Droplets,
    Battery,
    Gauge,
    ChartNoAxesCombined,
    LucideIcon,
} from "lucide-react";
import Card3D from "../../components/Card3D";

// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

interface StatusInfo {
    color: 'red' | 'yellow' | 'green';
    message: string;
}

interface ColorClasses {
    bg: string;
    stroke: string;
    text: string;
}

interface StatusClasses {
    text: string;
    bg: string;
    icon: LucideIcon;
}

interface CircularProgressProps {
    percentage: number;
    statusColor: 'red' | 'yellow' | 'green';
    children: React.ReactNode;
}

interface StatusCardProps {
    title: string;
    icon: LucideIcon;
    display: React.ReactNode;
    status: string;
    capacity: string;
    present: string;
    required: string;
    progress: number;
    statusColor: 'red' | 'yellow' | 'green';
}

interface PumpData {
    dieselStorage: number;
    mainWaterStorage: number;
    headerPressure: number;
    pressureUnit: string;
}

interface PumpIotData {
    DLS?: number;
    WLS?: number;
    BAT1?: number;
    PLS?: number;
    [key: string]: any;
}

interface SupportSystemStatusProps {
    pumpData: PumpData;
    pumpIotData: PumpIotData;
    timestamp: string;
}

// -----------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------

const CircularProgress: React.FC<CircularProgressProps> = ({
    percentage,
    statusColor,
    children
}) => {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getColorClasses = (): ColorClasses => {
        switch (statusColor) {
            case 'red':
                return { bg: 'text-[#FFEBEB]', stroke: 'text-[#B91C1C]', text: 'text-[#B91C1C]' };
            case 'yellow':
                return { bg: 'text-[#FEF3C7]', stroke: 'text-[#D97706]', text: 'text-[#D97706]' };
            default:
                return { bg: 'text-[#ECFDF5]', stroke: 'text-[#047857]', text: 'text-[#047857]' };
        }
    };

    const colors = getColorClasses();

    return (
        <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 50 50">
                <circle
                    cx="25"
                    cy="25"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className={colors.bg}
                />
                <circle
                    cx="25"
                    cy="25"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={colors.stroke}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-center font-bold ${colors.text}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const StatusCard: React.FC<StatusCardProps> = ({
    title,
    icon: Icon,
    display,
    status,
    capacity,
    present,
    required,
    progress,
    statusColor,
}) => {
    const getStatusClasses = (): StatusClasses => {
        switch (statusColor) {
            case 'red':
                return { text: 'text-[#B91C1C]', bg: 'bg-[#FFEBEB]', icon: AlertTriangle };
            case 'yellow':
                return { text: 'text-[#D97706]', bg: 'bg-[#FEF3C7]', icon: AlertTriangle };
            default:
                return { text: 'text-[#047857]', bg: 'bg-[#ECFDF5]', icon: CheckCircle };
        }
    };

    const statusClasses = getStatusClasses();
    const StatusIcon = statusClasses.icon;

    return (
        <div className="p-4 rounded-xl border border-border bg-card shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="flex mb-4">
                <CircularProgress percentage={progress} statusColor={statusColor}>
                    {display}
                </CircularProgress>
            </div>

            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-muted">
                    <Icon className="w-5 h-5 text-foreground" />
                </div>
                <p className="font-semibold text-base text-foreground">{title}</p>
            </div>

            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <span className={`text-sm font-medium ${statusClasses.text} ${statusClasses.bg} flex gap-2 px-3 py-1.5 rounded-full`}>
                    <StatusIcon className={`w-4 h-4 ${statusClasses.text}`} /> {status}
                </span>
            </div>

            <div className="space-y-2 text-muted-foreground">
                <div className="flex justify-between">
                    <span className="text-sm">Capacity:</span>
                    <span className="font-semibold text-sm text-foreground">{capacity}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm">Present:</span>
                    <span className="font-semibold text-sm text-foreground">{present}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm">Required:</span>
                    <span className="font-semibold text-sm text-foreground">{required}</span>
                </div>
            </div>
        </div>
    );
};

// -----------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------

const SupportSystemStatus: React.FC<SupportSystemStatusProps> = ({
    pumpData,
    pumpIotData,
    timestamp,
}) => {
    const getStatusInfo = (percentage: number): StatusInfo => {
        if (percentage <= 50) return { color: 'red', message: 'Critical' };
        if (percentage <= 75) return { color: 'yellow', message: 'Needs Attention' };
        return { color: 'green', message: 'Satisfactory' };
    };

    const getBatteryStatusInfo = (voltage: number): StatusInfo => {
        const percentage = (voltage / 12) * 100;
        if (percentage <= 50) return { color: 'red', message: 'Critical' };
        if (percentage <= 75) return { color: 'yellow', message: 'Needs Attention' };
        return { color: 'green', message: 'Satisfactory' };
    };

    const getPressureStatusInfo = (current: number, target: number): StatusInfo => {
        const percentage = target > 0 ? (current / target) * 100 : 0;
        if (percentage <= 50) return { color: 'red', message: 'Critical' };
        if (percentage <= 75) return { color: 'yellow', message: 'Needs Attention' };
        return { color: 'green', message: 'Satisfactory' };
    };

    console.log('This is for debug only : ', pumpIotData);

    return (
        <Card3D className="p-8 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
            <div className="w-full mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                            <ChartNoAxesCombined className="h-6 w-6 text-primary" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Support System Status</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Stay informed on storage levels and system health to prevent outages
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                        <span className="text-xs text-muted-foreground">
                            Last Updated: <span className="font-semibold text-foreground">{new Date(timestamp).toLocaleString()}</span>
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatusCard
                        title="Diesel Storage"
                        icon={Fuel}
                        display={
                            <div className="text-2xl font-medium">
                                {Math.round(
                                    ((pumpIotData?.DLS ?? 0) / pumpData?.dieselStorage) * 100
                                ) || 0}
                                %
                            </div>
                        }
                        status={getStatusInfo(((pumpIotData?.DLS ?? 0) / pumpData?.dieselStorage) * 100 || 0).message}
                        capacity={`${pumpData?.dieselStorage} Ltrs`}
                        present={`${pumpIotData?.DLS ?? 0} Ltrs`}
                        required={`${pumpData?.dieselStorage * 0.75} Ltrs`}
                        progress={((pumpIotData?.DLS ?? 0) / pumpData?.dieselStorage) * 100 || 0}
                        statusColor={getStatusInfo(((pumpIotData?.DLS ?? 0) / pumpData?.dieselStorage) * 100 || 0).color}
                    />
                    <StatusCard
                        title="Water Storage"
                        icon={Droplets}
                        display={
                            <div className="text-2xl font-medium">
                                {Math.round(
                                    ((pumpIotData?.WLS ?? 0) / pumpData?.mainWaterStorage) * 100
                                ) || 0}
                                %
                            </div>
                        }
                        status={getStatusInfo(((pumpIotData?.WLS ?? 0) / pumpData?.mainWaterStorage) * 100 || 0).message}
                        capacity={`${pumpData?.mainWaterStorage} Ltrs`}
                        present={`${pumpIotData?.WLS ?? 0} Ltrs`}
                        required={`${pumpData?.mainWaterStorage * 0.75} Ltrs`}
                        progress={
                            ((pumpIotData?.WLS ?? 0) / pumpData?.mainWaterStorage) * 100 || 0
                        }
                        statusColor={getStatusInfo(((pumpIotData?.WLS ?? 0) / pumpData?.mainWaterStorage) * 100 || 0).color}
                    />
                    <StatusCard
                        title="Battery Status"
                        icon={Battery}
                        display={
                            <div className="text-2xl font-medium">
                                {Math.round(
                                    ((pumpIotData?.BAT1 ?? 0) / 12) * 100
                                ) || 0}
                                %
                            </div>
                        }
                        status={getBatteryStatusInfo(pumpIotData?.BAT1 || 0).message}
                        capacity="12 V"
                        present={`${pumpIotData?.BAT1 ?? 0} V`}
                        required="12 V"
                        progress={((pumpIotData?.BAT1 ?? 0) / 12) * 100 || 0}
                        statusColor={getBatteryStatusInfo(pumpIotData?.BAT1 || 0).color}
                    />
                    <StatusCard
                        title="Header Pressure"
                        icon={Gauge}
                        display={
                            <div className="text-2xl font-medium">
                                {Math.round(
                                    ((pumpIotData?.PLS ?? 0) / pumpData?.headerPressure) * 100
                                ) || 0}
                                %
                            </div>
                        }
                        status={getPressureStatusInfo(pumpIotData?.PLS || 0, pumpData?.headerPressure || 0).message}
                        capacity={pumpData?.headerPressure + " " + pumpData?.pressureUnit}
                        present={`${pumpIotData?.PLS
                            ? pumpIotData?.PLS + " " + pumpData?.pressureUnit
                            : 0
                            }`}
                        required={pumpData?.headerPressure + " " + pumpData?.pressureUnit}
                        progress={((pumpIotData?.PLS ?? 0) / pumpData?.headerPressure) * 100 || 0}
                        statusColor={getPressureStatusInfo(pumpIotData?.PLS || 0, pumpData?.headerPressure || 0).color}
                    />
                </div>
            </div>
        </Card3D>
    );
};

export default SupportSystemStatus;