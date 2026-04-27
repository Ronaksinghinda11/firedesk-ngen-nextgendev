import React, { useState, useEffect, useRef } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Fuel,
    Droplets,
    Battery,
    Gauge,
    LucideIcon,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { usePumpRoomData } from "../../contexts/PumpRoomDataContext";
import Card3D from "../../components/Card3D";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Premium Dashboard Color Scheme
const COLORS = {
    success: 'hsl(142, 76%, 36%)',
    destructive: 'hsl(0, 84.2%, 60.2%)',
    warning: 'hsl(38, 92%, 50%)',
};

interface StatusInfo {
    color: 'red' | 'yellow' | 'green';
    message: string;
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

// Circular Progress Component
const CircularProgress: React.FC<CircularProgressProps> = ({ percentage, statusColor, children }) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getColorClass = () => {
        switch (statusColor) {
            case 'red': return 'stroke-destructive';
            case 'yellow': return 'stroke-amber-500';
            default: return 'stroke-green-600';
        }
    };

    const getBgClass = () => {
        switch (statusColor) {
            case 'red': return 'stroke-destructive/10';
            case 'yellow': return 'stroke-amber-500/10';
            default: return 'stroke-green-600/10';
        }
    };

    return (
        <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    className={getBgClass()}
                    strokeWidth="5"
                    fill="none"
                />
                <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    className={getColorClass()}
                    strokeWidth="5"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                {children}
            </div>
        </div>
    );
};

// Status Card Component
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
    const StatusIcon = statusColor === 'green' ? CheckCircle2 : AlertTriangle;

    return (
        <div className="p-5 rounded-xl border-2 border-border/30 bg-gradient-to-br from-card to-card/50 hover:border-primary/20 hover:shadow-xl transition-all duration-300 shadow-lg h-full">
            <div className="flex justify-center mb-5">
                <CircularProgress percentage={progress} statusColor={statusColor}>
                    {display}
                </CircularProgress>
            </div>

            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b-2 border-border/20">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-bold text-foreground">{title}</h3>
            </div>

            <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <span className="text-xs font-semibold text-foreground">Status</span>
                    <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold",
                        statusColor === 'green' ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive"
                    )}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{status}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <span className="text-xs font-semibold text-foreground">Capacity</span>
                    <span className="text-xs font-bold text-foreground">{capacity}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <span className="text-xs font-semibold text-foreground">Present</span>
                    <span className="text-xs font-bold text-foreground">{present}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <span className="text-xs font-semibold text-foreground">Required</span>
                    <span className="text-xs font-bold text-foreground">{required}</span>
                </div>
            </div>
        </div>
    );
};

// Main Widget Component
interface SupportSystemStatusWidgetProps {
    widgetSize?: number;
}

const SupportSystemStatusWidget: React.FC<SupportSystemStatusWidgetProps> = ({ widgetSize = 12 }) => {
    const { pumpData, deviceData, deviceIds, timestamp, isLoading, error } = usePumpRoomData();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [cardsPerView, setCardsPerView] = useState(4);
    const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Set default device
    useEffect(() => {
        if (!selectedDevice && deviceIds && deviceIds.length > 0) {
            setSelectedDevice(deviceIds[0]);
        }
    }, [deviceIds, selectedDevice]);

    // Update cards per view based on widget size
    // At Half width (6): show 2 cards side by side with scroll
    // At 1/3 width (4): show 1 card with scroll
    // At Full width (12): show all 4 cards
    useEffect(() => {
        if (widgetSize <= 4) {
            setCardsPerView(1);
        } else if (widgetSize <= 6) {
            setCardsPerView(2);
        } else {
            setCardsPerView(4);
        }
    }, [widgetSize]);

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

    const nextCard = () => {
        const maxIndex = 4 - cardsPerView;
        setCurrentIndex((prev) => Math.min(prev + cardsPerView, maxIndex));
    };

    const prevCard = () => {
        setCurrentIndex((prev) => Math.max(prev - cardsPerView, 0));
    };

    if (isLoading) {
        return (
            <Card3D>
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Loading support system status...
                </div>
            </Card3D>
        );
    }

    if (error) {
        return (
            <Card3D>
                <div className="flex items-center justify-center h-64 text-destructive">
                    Error: {error}
                </div>
            </Card3D>
        );
    }

    // Generate cards for ALL devices or SELECTED device
    const filteredDeviceIds = selectedDevice ? [selectedDevice] : [];

    const cards = !filteredDeviceIds || filteredDeviceIds.length === 0 ? [] : filteredDeviceIds.flatMap((deviceId) => {
        const iotData = deviceData[deviceId] || {};

        return [
            <StatusCard
                key={`${deviceId}-diesel`}
                title={`Diesel Storage`}
                icon={Fuel}
                display={
                    <div className="text-center">
                        <div className="text-2xl font-black text-foreground">
                            {Math.round(((iotData?.DLS ?? 0) / (pumpData?.dieselStorage || 1)) * 100) || 0}%
                        </div>
                    </div>
                }
                status={getStatusInfo(((iotData?.DLS ?? 0) / (pumpData?.dieselStorage || 1)) * 100 || 0).message}
                capacity={`${pumpData?.dieselStorage || 0} Ltrs`}
                present={`${iotData?.DLS ?? 0} Ltrs`}
                required={`${Math.round((pumpData?.dieselStorage || 0) * 0.75)} Ltrs`}
                progress={((iotData?.DLS ?? 0) / (pumpData?.dieselStorage || 1)) * 100 || 0}
                statusColor={getStatusInfo(((iotData?.DLS ?? 0) / (pumpData?.dieselStorage || 1)) * 100 || 0).color}
            />,
            <StatusCard
                key={`${deviceId}-water`}
                title={`Water Storage`}
                icon={Droplets}
                display={
                    <div className="text-center">
                        <div className="text-2xl font-black text-foreground">
                            {Math.round(((iotData?.WLS ?? 0) / ((pumpData?.mainWaterStorage || 1) / 1000)) * 100) || 0}%
                        </div>
                    </div>
                }
                status={getStatusInfo(((iotData?.WLS ?? 0) / ((pumpData?.mainWaterStorage || 1) / 1000)) * 100 || 0).message}
                capacity={`${((pumpData?.mainWaterStorage || 0) / 1000).toFixed(2)} kL`}
                present={`${(iotData?.WLS ?? 0).toFixed(2)} kL`}
                required={`${(((pumpData?.mainWaterStorage || 0) / 1000) * 0.75).toFixed(2)} kL`}
                progress={((iotData?.WLS ?? 0) / ((pumpData?.mainWaterStorage || 1) / 1000)) * 100 || 0}
                statusColor={getStatusInfo(((iotData?.WLS ?? 0) / ((pumpData?.mainWaterStorage || 1) / 1000)) * 100 || 0).color}
            />,
            <StatusCard
                key={`${deviceId}-battery`}
                title={`Battery Status`}
                icon={Battery}
                display={
                    <div className="text-center">
                        <div className="text-2xl font-black text-foreground">
                            {Math.round(((iotData?.BAT1 ?? 0) / 12) * 100) || 0}%
                        </div>
                    </div>
                }
                status={getBatteryStatusInfo(iotData?.BAT1 || 0).message}
                capacity="12 V"
                present={`${iotData?.BAT1 ?? 0} V`}
                required="12 V"
                progress={((iotData?.BAT1 ?? 0) / 12) * 100 || 0}
                statusColor={getBatteryStatusInfo(iotData?.BAT1 || 0).color}
            />,
            <StatusCard
                key={`${deviceId}-pressure`}
                title={`Header Pressure`}
                icon={Gauge}
                display={
                    <div className="text-center">
                        <div className="text-2xl font-black text-foreground">
                            {Math.round(((iotData?.PLS ?? 0) / (pumpData?.headerPressure || 1)) * 100) || 0}%
                        </div>
                    </div>
                }
                status={getPressureStatusInfo(iotData?.PLS || 0, pumpData?.headerPressure || 0).message}
                capacity={`${pumpData?.headerPressure || 0} ${pumpData?.pressureUnit || ''}`}
                present={`${iotData?.PLS ?? 0} ${pumpData?.pressureUnit || ''}`}
                required={`${((pumpData?.headerPressure || 0) * 0.75).toFixed(2)} ${pumpData?.pressureUnit || ''}`}
                progress={((iotData?.PLS ?? 0) / (pumpData?.headerPressure || 1)) * 100 || 0}
                statusColor={getPressureStatusInfo(iotData?.PLS || 0, pumpData?.headerPressure || 0).color}
            />,
        ];
    });

    return (
        <Card3D className="p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Gauge className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground leading-tight">Support System Status</h2>
                        {widgetSize > 4 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Monitor storage levels and system health to prevent outages
                            </p>
                        )}
                    </div>
                </div>
                {widgetSize <= 6 ? (
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={prevCard}>
                            <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-[10px] font-medium w-3 text-center">
                            {Math.floor(currentIndex / cardsPerView) + 1}
                        </span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={nextCard}>
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        {/* Device Selector */}
                        {deviceIds && deviceIds.length > 1 && (
                            <Select
                                value={selectedDevice || ""}
                                onValueChange={setSelectedDevice}
                            >
                                <SelectTrigger className="w-[160px] h-9 text-sm font-bold">
                                    <SelectValue placeholder="Select Device" />
                                </SelectTrigger>
                                <SelectContent>
                                    {deviceIds.map(device => (
                                        <SelectItem key={device} value={device} className="text-sm font-semibold">
                                            {device}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {deviceIds && deviceIds.length === 1 && selectedDevice && (
                            <div className="text-sm font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-primary/15 to-primary/10 text-primary">
                                Device: {selectedDevice}
                            </div>
                        )}
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                            <span className="text-xs text-muted-foreground">
                                Last Updated: <span className="font-semibold text-foreground">
                                    {(() => {
                                        if (!timestamp) return 'N/A';
                                        const date = new Date(timestamp);
                                        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
                                    })()}
                                </span>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Content: Carousel (small/half) or Grid (large) */}
            {widgetSize <= 6 ? (
                <div className={cn(
                    "grid gap-4",
                    widgetSize <= 4 ? "grid-cols-1" : "grid-cols-2"
                )}>
                    {cards.slice(currentIndex, currentIndex + cardsPerView)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cards}
                </div>
            )}
        </Card3D>
    );
};

export default SupportSystemStatusWidget;
