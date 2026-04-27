import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Clock, Droplets, Zap, Activity, Fan } from 'lucide-react';
import { PumpRoomDataProvider, usePumpRoomData } from '@/premium-dashboard/contexts/PumpRoomDataContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SemiCircularGauge, CircularGauge, BatteryIcon, PressureGauge } from '@/components/gauges/CustomGauges';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { totalmem } from 'os';
import { notificationApi } from '@/lib/api';

const pumpRoomImage = '/Pump room.jpeg';

/**
 * Linear Gauge Component (Triangular with color gradient)
 */
const LinearGauge: React.FC<{
    value: number;
    max: number;
    unit?: string;
}> = ({ value, max, unit = 'L' }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    // Generate scale labels
    const scaleLabels = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max];

    return (
        <div className="w-full px-1">
            <div className="relative h-12 mb-1">
                {/* Gradient Background - Triangular shape */}
                <svg viewBox="0 0 200 40" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="25%" stopColor="#f97316" />
                            <stop offset="50%" stopColor="#eab308" />
                            <stop offset="75%" stopColor="#84cc16" />
                            <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                        <clipPath id="triangleClip">
                            <polygon points="0,40 200,0 200,40" />
                        </clipPath>
                    </defs>
                    {/* Triangular gradient bar */}
                    <rect
                        x="0"
                        y="0"
                        width="200"
                        height="40"
                        fill="url(#gaugeGradient)"
                        clipPath="url(#triangleClip)"
                    />
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((pos) => (
                        <line
                            key={pos}
                            x1={pos * 2}
                            y1="0"
                            x2={pos * 2}
                            y2="40"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="1"
                        />
                    ))}
                </svg>

                {/* Pointer Arrow */}
                <div
                    className="absolute top-0 flex flex-col items-center transition-all duration-300"
                    style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
                >
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-slate-600" />
                </div>
            </div>

            {/* Scale labels */}
            <div className="flex justify-between text-[8px] text-slate-500 px-0.5">
                {scaleLabels.map((label, idx) => (
                    <span key={idx}>{label}</span>
                ))}
            </div>

        </div>
    );
};


/**
 * Water Tank Gauge Component (Circular with water fill effect)
 */
const WaterTankGauge: React.FC<{
    percentage: number;
    size?: number;
}> = ({ percentage, size = 80 }) => {
    const safePercentage = Math.min(100, Math.max(0, percentage));
    // Calculate water fill height (bottom to top)
    const fillHeight = (safePercentage / 100) * size;
    const fillY = size - fillHeight;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
                <defs>
                    {/* Water gradient */}
                    <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                    {/* Clip path for circular container */}
                    <clipPath id="tankClip">
                        <circle cx={size / 2} cy={size / 2} r={size / 2 - 3} />
                    </clipPath>
                </defs>

                {/* Outer ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={size / 2 - 2}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                />

                {/* Water fill */}
                <g clipPath="url(#tankClip)">
                    {/* Water rectangle */}
                    <rect
                        x="0"
                        y={fillY}
                        width={size}
                        height={fillHeight + 5}
                        fill="url(#waterGradient)"
                    />
                    {/* Wave effect at top of water */}
                    <path
                        d={`M 0 ${fillY} 
                           Q ${size * 0.15} ${fillY - 3} ${size * 0.25} ${fillY}
                           Q ${size * 0.35} ${fillY + 3} ${size * 0.5} ${fillY}
                           Q ${size * 0.65} ${fillY - 3} ${size * 0.75} ${fillY}
                           Q ${size * 0.85} ${fillY + 3} ${size} ${fillY}
                           L ${size} ${size} L 0 ${size} Z`}
                        fill="url(#waterGradient)"
                        opacity="0.9"
                    />
                </g>

                {/* Inner white highlight arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={size / 2 - 6}
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="1"
                />
            </svg>

            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-700">{Math.round(safePercentage)}%</span>
            </div>
        </div>
    );
};

/**
 * Speedometer Gauge Component (Semi-circular with uniform arc)
 */
const SpeedometerGauge: React.FC<{
    value: number;
    max: number;
    unit?: string;
    size?: number;
}> = ({ value, max, unit = 'Bar', size = 140 }) => {
    const safeValue = Math.min(max, Math.max(0, value));
    const percentage = (safeValue / max) * 100;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 20;
    const arcWidth = 12;

    // Needle angle: 180 (left) to 0 (right)
    const needleAngle = 180 - (percentage / 100) * 180;
    const needleRad = (needleAngle * Math.PI) / 180;
    const needleLength = radius - 8;

    // Create arc path - sweeps from left to right (180° to 0°)
    const createArcPath = (r: number) => {
        const x1 = cx - r; // Left point
        const y1 = cy;
        const x2 = cx + r; // Right point
        const y2 = cy;
        return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
    };

    // Scale labels
    const labelCount = 5;
    const labels = Array.from({ length: labelCount + 1 }, (_, i) => {
        const angle = 180 - (i / labelCount) * 180;
        const rad = (angle * Math.PI) / 180;
        const labelRadius = radius + 18;
        return {
            text: ((i / labelCount) * max).toFixed(1),
            x: cx + labelRadius * Math.cos(rad),
            y: cy - labelRadius * Math.sin(rad),
        };
    });

    return (
        <div className="relative flex flex-col items-center" style={{ width: size, height: size * 0.6 }}>
            <svg viewBox={`0 0 ${size} ${size * 0.6}`} className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="gaugeArcGradient" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="25%" stopColor="#22c55e" />
                        <stop offset="50%" stopColor="#84cc16" />
                        <stop offset="75%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#f87171" />
                    </linearGradient>
                </defs>

                {/* Background arc (gray) */}
                <path
                    d={createArcPath(radius)}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={arcWidth + 4}
                    strokeLinecap="round"
                />

                {/* Colored arc with gradient */}
                <path
                    d={createArcPath(radius)}
                    fill="none"
                    stroke="url(#gaugeArcGradient)"
                    strokeWidth={arcWidth}
                    strokeLinecap="round"
                />

                {/* Scale labels */}
                {labels.map((label, i) => (
                    <text
                        key={i}
                        x={label.x}
                        y={label.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-[8px] fill-slate-500 font-medium"
                    >
                        {label.text}
                    </text>
                ))}

                {/* Needle */}
                <line
                    x1={cx}
                    y1={cy}
                    x2={cx + needleLength * Math.cos(needleRad)}
                    y2={cy - needleLength * Math.sin(needleRad)}
                    stroke="#1e293b"
                    strokeWidth="3"
                    strokeLinecap="round"
                />

                {/* Center circle */}
                <circle cx={cx} cy={cy} r="6" fill="#1e293b" />
                <circle cx={cx} cy={cy} r="3" fill="#94a3b8" />
            </svg>

        </div>
    );
};


/**
 * Support System Card Component
 */
const SupportCard: React.FC<{
    title: string;
    type: 'diesel' | 'water' | 'battery' | 'pressure';
    capacity: number;
    present: number | string;
    unit: string;
    percentage: number;
}> = ({ title, type, capacity, present, unit, percentage }) => {
    const renderGauge = () => {
        const safePercentage = Math.min(100, Math.max(0, percentage));
        switch (type) {
            case 'diesel':
                return <LinearGauge value={typeof present === 'number' ? present : 0} max={capacity} unit={unit} />;
            case 'water':
                return <WaterTankGauge percentage={safePercentage} size={70} />;
            case 'battery':
                return <BatteryIcon percentage={safePercentage} size={55} showValue={false} />;
            case 'pressure':
                return <SpeedometerGauge value={typeof present === 'number' ? present : 0} max={(Number(capacity) || 0) + 10} unit={unit} size={130} />;
        }
    };

    // Unified layout for all types


    const isCritical = (type === 'diesel' && percentage < 20) ||
        (type === 'water' && percentage < 20) ||
        (type === 'battery' && percentage < 20) ||
        (type === 'pressure' && Number(present) < 4); // Pressure < 4 bar

    const isWarning = (type === 'diesel' && percentage < 40 && percentage >= 20) ||
        (type === 'water' && percentage < 40 && percentage >= 20) ||
        (type === 'battery' && percentage < 40 && percentage >= 20) ||
        (type === 'pressure' && Number(present) < 6 && Number(present) >= 4);

    const alertClass = isCritical ? 'bg-red-50 border-4 animate-border-pulse-red' : isWarning ? 'bg-orange-50 border-4 animate-border-pulse-orange' : 'bg-white';

    return (
        <div className={cn(
            "h-full rounded-xl border border-gray-200 shadow-sm p-3 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 group",
            alertClass
        )}>
            <h3 className={cn(
                "text-[10px] font-bold uppercase tracking-wider text-center mb-2 transition-colors",
                (isCritical || isWarning) ? "text-gray-600" : "text-gray-400 group-hover:text-orange-500"
            )}>{title}</h3>

            <div className="flex-1 flex items-center justify-center py-1">
                {renderGauge()}
            </div>

            <div className="grid grid-cols-2 gap-3 text-[9px] border-t border-gray-50 pt-2.5 mt-1 w-full">
                <div className="flex flex-col border-r border-gray-50 pr-2">
                    <span className="text-gray-400 uppercase tracking-wide text-[8px] mb-0.5">Required</span>
                    <div className="flex items-baseline gap-0.5">
                        <span className="font-bold text-gray-700 text-xs">{Number(capacity).toFixed(title === 'Diesel Storage' ? 0 : 2)}</span>
                        <span className="text-[8px] text-gray-400 font-medium">{unit}</span>
                    </div>
                </div>
                <div className="flex flex-col pl-1">
                    <span className="text-gray-400 uppercase tracking-wide text-[8px] mb-0.5 text-right">Current</span>
                    <div className="flex items-baseline gap-0.5 justify-end">
                        <span className={cn(
                            "font-bold text-sm",
                            type === 'diesel' && percentage < 30 ? "text-red-500" :
                                type === 'water' && percentage < 50 ? "text-blue-500" :
                                    type === 'battery' && percentage < 20 ? "text-red-500" :
                                        type === 'pressure' && percentage < 50 ? "text-amber-500" :
                                            "text-gray-900"
                        )}>{typeof present === 'number' ? Number(present).toFixed(title === 'Diesel Storage' ? 0 : 2) : present}</span>
                        <span className="text-[8px] text-gray-500 font-medium">{typeof present === 'number' ? unit : ''}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Reliability Item Component
 */
const ReliabilityItem: React.FC<{ icon: React.ReactNode; label: string; status: string }> = ({ icon, label, status }) => {
    const isGood = status === 'Normal' || status === 'Good';
    return (
        <div className={cn(
            "p-1 rounded-lg border flex items-center gap-2 h-[42px]",
            isGood ? "border-green-500/30 bg-green-50" : "border-red-500/30 bg-red-50 animate-pulse-slow"
        )}>
            <div className={isGood ? "text-blue-600" : "text-red-600"}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[9px] font-semibold text-gray-700 leading-none truncate">{label}</div>
                <div className={cn(
                    "text-[10px] font-bold mt-0.5 leading-none",
                    isGood ? "text-green-700" : "text-red-700"
                )}>{status}</div>
            </div>
        </div>
    );
};

/**
 * Pump Availability Card Component
 */
const PumpCard: React.FC<{
    name: string;
    mode: string;
    status: 'ON' | 'OFF';
    capacity: number;
    hours: string;
    isReady: boolean;
    hasFault: boolean;
    icon: React.ReactNode;
}> = ({ name, mode, status, capacity, hours, isReady, hasFault, icon }) => {
    const bgColor = isReady ? 'bg-green-50 border-green-500/30' : 'bg-red-50 border-red-500/30';
    const iconBg = isReady ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

    return (
        <div className={cn("p-3 rounded-xl border h-[200px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-md", bgColor)}>

            {/* Header: Name & Ready Status */}
            <div className="flex items-start justify-between z-10">
                <span className="text-[11px] font-bold text-gray-900 uppercase tracking-tight">{name}</span>
                <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 rounded-full",
                    isReady ? "bg-green-600 text-white" : "bg-red-600 text-white"
                )}>
                    {isReady ? 'READY' : 'NOT READY'}
                </span>
            </div>

            {/* Center: Animated Icon */}
            <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 opacity-10 scale-150">
                {/* Background decoration */}
            </div>

            <div className="flex-1 flex items-center justify-center py-2 z-10">
                <div className={cn(
                    "p-3 rounded-full transition-all duration-600 mb-2 relative",
                    iconBg,
                    isReady ? "ring-4 ring-green-400/30 ring-offset-2 animate-pulse-slow" : "ring-4 ring-red-400/30 ring-offset-2"
                )}>
                    <div className={!isReady ? "animate-bounce" : ""}>
                        {icon}
                    </div>
                </div>
            </div>

            {/* Footer: Stats Vertical List */}
            <div className="flex flex-col gap-1 text-[9px] z-10 bg-white/40 p-2 rounded-lg backdrop-blur-[1px]">
                <div className="flex justify-between items-center border-b border-gray-200/50 pb-1">
                    <span className="text-gray-500">Mode</span>
                    <span className="font-bold text-gray-800">{mode}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200/50 pb-1">
                    <span className="text-gray-500">Status</span>
                    <span className={cn("font-bold", status === 'ON' ? "text-green-600" : "text-gray-800")}>{status}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200/50 pb-1">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-bold text-gray-800">{capacity} LPM</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                    <span className="text-gray-500">Run Hours</span>
                    <span className="font-bold text-gray-800">{hours}</span>
                </div>
            </div>
        </div>
    );
};

/**
 * Main Pump Room Summary Content
 */
const PumpRoomSummaryContent: React.FC<{
    plants: any[];
    selectedPlant: string;
    onPlantChange: (plantId: string) => void;
}> = ({ plants, selectedPlant, onPlantChange }) => {
    const { deviceData, deviceIds, deviceMappings, pumpData, timestamp, refetchPumpDataForDevice } = usePumpRoomData();
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [lastAutoStart, setLastAutoStart] = useState<Date | null>(null);

    // Auto-select first device whenever device list changes
    useEffect(() => {
        if (deviceIds && deviceIds.length > 0) {
            // If currently selected device is not in the new list, pick the first one
            if (!selectedDevice || !deviceIds.includes(selectedDevice)) {
                setSelectedDevice(deviceIds[0]);
            }
        } else {
            setSelectedDevice('');
        }
    }, [deviceIds, selectedDevice]);

    // Refetch pump data when user changes device selection
    useEffect(() => {
        if (selectedDevice) {
            console.log('[PumpRoomSummary] Device changed, refetching capacity data for:', selectedDevice);
            refetchPumpDataForDevice(selectedDevice);
        }
    }, [selectedDevice]); // Only when selectedDevice changes (not on initial load)

    // Notifications State & Fetch
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                console.log('[PumpRoomSummary NOTIF] Starting fetch check...');
                console.log('[PumpRoomSummary NOTIF] - plants.length:', plants.length);
                console.log('[PumpRoomSummary NOTIF] - selectedDevice:', selectedDevice);

                if (plants.length > 0) {
                    console.log('[PumpRoomSummary NOTIF] Fetching via notificationApi...');

                    const response = await notificationApi.getNotifications({
                        limit: 50,
                        is_read: false
                    });

                    console.log('[PumpRoomSummary NOTIF] Response received:', response);
                    console.log('[PumpRoomSummary NOTIF] Total notifications:', response.data?.length || 0);

                    // Filter for pump room related notifications (IOT_DEVICE source)
                    // Include both 'asset' (pump-specific) and 'device' (room-level) notifications
                    let pumpNotifs = (response.data || []).filter((n: any) =>
                        n.notification_source === 'IOT_DEVICE' &&
                        (n.related_entity_type === 'asset' || n.related_entity_type === 'device')
                    );

                    console.log('[PumpRoomSummary NOTIF] After IOT filter:', pumpNotifs.length);

                    // Further filter by selected device's assets if device is selected
                    if (selectedDevice && deviceMappings.length > 0) {
                        // Get asset IDs for the selected device
                        const deviceAssetIds = deviceMappings
                            .filter(m => m.device_id === selectedDevice)
                            .map(m => m.asset?.id)
                            .filter(id => id); // Remove undefined

                        console.log('[PumpRoomSummary NOTIF] Device asset IDs:', deviceAssetIds);

                        // Filter: include asset notifications for this device OR device-level notifications (which have null entity_id)
                        pumpNotifs = pumpNotifs.filter((n: any) =>
                            (n.related_entity_type === 'asset' && deviceAssetIds.includes(n.related_entity_id)) ||
                            (n.related_entity_type === 'device') // Device-level notifications have null entity_id
                        );

                        console.log('[PumpRoomSummary NOTIF] After device filter:', pumpNotifs.length);
                    }

                    console.log('[PumpRoomSummary NOTIF] Final notifications:', pumpNotifs);
                    setNotifications(pumpNotifs);
                } else {
                    console.log('[PumpRoomSummary NOTIF] Skipping fetch - no plants loaded');
                }
            } catch (e) {
                console.error("[PumpRoomSummary NOTIF] Exception during fetch:", e);
            }
        };

        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [selectedPlant, selectedDevice, plants, deviceMappings]);

    const alarmCounts = {
        major: notifications.filter(n => !n.is_read && n.priority === 'CRITICAL').length,
        high: notifications.filter(n => !n.is_read && n.priority === 'HIGH').length,
        low: notifications.filter(n => !n.is_read && (n.priority === 'MEDIUM' || n.priority === 'LOW')).length
    };

    const iotData = deviceData[selectedDevice] || {};

    // Calculate percentages
    const dieselPercentage = pumpData?.dieselStorage ? ((iotData.DLS || 0) / pumpData.dieselStorage) * 100 : 0;
    const waterPercentage = pumpData?.mainWaterStorage ? ((iotData.WLS || 0) / ((pumpData.mainWaterStorage || 1) / 1000)) * 100 : 0;
    const batteryPercentage = 100; // Hardcoded to healthy as requested
    const pressurePercentage = pumpData?.headerPressure ? ((iotData.PLS || 0) / pumpData.headerPressure) * 100 : 0;

    // Calculate run hours from historical data
    const calculateRunHours = (pumpKey: string): string => {
        // Get the currently selected device history
        const device = deviceData[selectedDevice];
        const currentStatus = Number(iotData[pumpKey]); // 0 = ON, 1 = OFF

        // If data is completely missing, return default
        if (isNaN(currentStatus)) {
            return '--';
        }

        const history = device?.history?.[pumpKey] || [];

        // If currently ON (PS=0), calculate time from last state change to now
        if (currentStatus === 0) {
            // Need history to calculate duration
            if (!history || history.length === 0) {
                return 'Running';
            }
            // Find last OFF to ON transition
            const sortedHistory = [...history].sort((a, b) =>
                new Date(b.date || b.timestamp).getTime() - new Date(a.date || a.timestamp).getTime()
            );

            // Find the most recent transition from 1 to 0 (OFF to ON)
            let startTime: Date | null = null;

            for (let i = 0; i < sortedHistory.length - 1; i++) {
                const currentVal = Number(sortedHistory[i].data);
                const prevVal = Number(sortedHistory[i + 1].data);

                // OFF(1) to ON(0) transition (looking backwards in time)
                // i is newer (ON=0), i+1 is older (OFF=1)
                if (currentVal === 0 && prevVal === 1) {
                    startTime = new Date(sortedHistory[i].date || sortedHistory[i].timestamp);
                    break;
                }
            }

            // Fallback: If no transition found, but we have history and it's currently ON (0),
            // assume it's been running since the oldest record we have.
            if (!startTime && sortedHistory.length > 0) {
                const oldest = sortedHistory[sortedHistory.length - 1];
                const oldestVal = Number(oldest.data);
                if (oldestVal === 0) {
                    startTime = new Date(oldest.date || oldest.timestamp);
                }
            }

            if (startTime) {
                const runtimeMs = Date.now() - startTime.getTime();
                const hours = Math.floor(runtimeMs / (1000 * 60 * 60));
                const minutes = Math.floor((runtimeMs % (1000 * 60 * 60)) / (1000 * 60));
                return `${hours}h ${minutes}m`;
            }
        } else {
            // If currently OFF, show last runtime
            const sortedHistory = [...history].sort((a, b) =>
                new Date(b.date || b.timestamp).getTime() - new Date(a.date || a.timestamp).getTime()
            );

            // Find the most recent OFF transition and previous ON transition
            let offTime: Date | null = null;
            let onTime: Date | null = null;

            for (let i = 0; i < sortedHistory.length; i++) {
                const val = Number(sortedHistory[i].data);
                if (val === 1 && !offTime) {
                    offTime = new Date(sortedHistory[i].date || sortedHistory[i].timestamp);
                } else if (val === 0 && offTime && !onTime) {
                    onTime = new Date(sortedHistory[i].date || sortedHistory[i].timestamp);
                    break;
                }
            }

            if (offTime && onTime) {
                const runtimeMs = offTime.getTime() - onTime.getTime();
                const hours = Math.floor(runtimeMs / (1000 * 60 * 60));
                const minutes = Math.floor((runtimeMs % (1000 * 60 * 60)) / (1000 * 60));
                return `${hours}h ${minutes}m (Last)`;
            }

            return 'Idle';
        }

        return '0h 0m';
    };

    // Use pre-computed lastAutoStartDate from backend (computed server-side from full history)
    useEffect(() => {
        // Don't clear during transitions — only update when we have actual device data
        if (!selectedDevice) return; // No device selected yet (initial load)

        const device = deviceData[selectedDevice];
        if (!device) return; // Device data not loaded yet — keep previous value instead of flashing "No Data"

        if (device.lastAutoStartDate) {
            setLastAutoStart(new Date(device.lastAutoStartDate));
        } else {
            // Device data exists but no auto-start found — actually show "No Data"
            setLastAutoStart(null);
        }
    }, [deviceData, selectedDevice]);

    // Helper function to get capacity for a pump by its data_key
    const getCapacityForPump = (dataKey: string, fallback: number): number => {
        if (!pumpData?.assetCapacities || !pumpData?.dataKeyToAssetCode) {
            return fallback;
        }
        const assetCode = pumpData.dataKeyToAssetCode[dataKey];
        if (!assetCode) return fallback;
        return pumpData.assetCapacities[assetCode] || fallback;
    };

    // Pump data with dynamic capacity from pumpData
    const pumps = [
        {
            name: 'Electric Pump',
            mode: iotData.AS2 === 1 ? 'Auto' : 'Manual',
            status: (iotData.PS2 === 0 ? 'ON' : 'OFF') as 'ON' | 'OFF',
            capacity: getCapacityForPump('AS2', 0), // Look up via mapping
            hours: calculateRunHours('PS2'),
            isReady: iotData.AS2 === 1 && iotData.TS2 === 1,
            hasFault: iotData.TS2 === 0,
            icon: <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500" />
        },
        {
            name: 'Diesel Pump',
            mode: iotData.AS3 === 1 ? 'Auto' : 'Manual',
            status: (iotData.PS3 === 0 ? 'ON' : 'OFF') as 'ON' | 'OFF',
            capacity: getCapacityForPump('AS3', 0), // Look up via mapping
            hours: calculateRunHours('PS3'),
            isReady: iotData.AS3 === 1,
            hasFault: false,
            icon: <Droplets className="h-6 w-6 text-blue-500 fill-blue-500" />
        },
        {
            name: 'Jockey Pump',
            mode: iotData.AS1 === 1 ? 'Auto' : 'Manual',
            status: (iotData.PS1 === 0 ? 'ON' : 'OFF') as 'ON' | 'OFF',
            capacity: getCapacityForPump('AS1', 0), // Look up via mapping
            hours: calculateRunHours('PS1'),
            isReady: iotData.AS1 === 1 && iotData.TS1 === 1,
            hasFault: iotData.TS1 === 0,
            icon: <Activity className="h-6 w-6 text-red-500" />
        },
    ];

    // Calculate Fire Readiness dynamically
    // Check system parameters (engine oil pressure, water temp, battery charging)
    const systemParametersFault = (iotData.OPR === 0 || iotData.WTP === 0 || iotData.BCH === 0);

    // Check support system status based on SupportCard logic (critical or warning)
    const dieselCritical = dieselPercentage < 20;
    const dieselWarning = dieselPercentage < 40 && dieselPercentage >= 20;
    const waterCritical = waterPercentage < 20;
    const waterWarning = waterPercentage < 40 && waterPercentage >= 20;
    const batteryCritical = batteryPercentage < 20;
    const batteryWarning = batteryPercentage < 40 && batteryPercentage >= 20;
    const pressureCritical = (iotData.PLS || 0) < 7;
    const pressureWarning = (iotData.PLS || 0) < 10 && (iotData.PLS || 0) >= 7;

    const supportSystemIssue = dieselCritical || dieselWarning || waterCritical || waterWarning ||
        batteryCritical || batteryWarning || pressureCritical || pressureWarning;

    // Check battery health in Power, Battery & Reliability section
    const batteryHealthLow = false; // Hardcoded to healthy as requested

    // Check if any pump is not ready
    const anyPumpNotReady = pumps.some(p => !p.isReady);

    // Fire readiness: READY only if all conditions are good
    const fireReadiness = (!systemParametersFault && !supportSystemIssue && !batteryHealthLow && !anyPumpNotReady)
        ? 'READY'
        : 'NEEDS ATTENTION';

    // Calculate Water Sufficiency using formula: 0.8 * (WLS * 1000 / capacity)
    // Use electric or diesel pump capacity (whichever is available)
    const electricCapacity = getCapacityForPump('AS2', 500);
    const dieselCapacity = getCapacityForPump('AS3', 600);
    const mainPumpCapacity = dieselCapacity !== 500 ? dieselCapacity : electricCapacity; // Prefer electric if found
    const waterSufficiency = Math.round(0.8 * ((iotData.WLS || 0) * 1000 / mainPumpCapacity));

    const readyPumps = pumps.filter(p => p.isReady).length;

    const activeLowAlarms = 0;
    const activeHighAlarms = (iotData.TS1 === 0 || iotData.TS2 === 0 || iotData.TS3 === 0) ? 1 : 0;

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-white">
            <div className="w-full h-full flex flex-col">
                {/* Header - Responsive */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-3 py-2 border-b flex-shrink-0 gap-2">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-orange-600 flex-shrink-0">
                                <Droplets className="h-5 w-5 text-white" />
                            </div>
                            <h1 className="text-lg md:text-xl font-bold text-gray-900">FireDesk iPRM Dashboard</h1>
                        </div>

                        {/* Plant & Device Selection */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Select value={selectedPlant} onValueChange={onPlantChange}>
                                <SelectTrigger className="flex-1 md:w-48 h-8 text-xs bg-gray-50 border-gray-200">
                                    <SelectValue placeholder="Select Plant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plants.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.plant_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {deviceIds && deviceIds.length > 0 && (
                                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                                    <SelectTrigger className="flex-1 md:w-40 h-8 text-xs bg-gray-50 border-gray-200">
                                        <SelectValue placeholder="Device" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {deviceIds.map(id => (
                                            <SelectItem key={id} value={id}>{id}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-between w-full md:w-auto gap-3">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-semibold text-green-600">Live</span>
                        </div>
                        <div className="text-xs text-gray-600">
                            Last Updated: <span className="font-semibold text-gray-900">
                                {(() => {
                                    const deviceTimestamp = deviceData[selectedDevice]?.timestamp || timestamp;
                                    return deviceTimestamp ? new Date(deviceTimestamp).toLocaleTimeString() : '--:--:--';
                                })()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body - Remaining Height */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
                    {!deviceIds || deviceIds.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <AlertTriangle className="h-12 w-12 mb-2 text-amber-500" />
                            <h3 className="text-lg font-semibold text-gray-800">No Pump Room Assets Found</h3>
                            <p className="text-sm">The selected plant does not have any pump room devices configured.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-4 relative min-h-full">
                            {/* Left Column - ~25% width */}
                            <div className="w-full lg:w-1/4 flex flex-col gap-2 lg:sticky lg:top-0 lg:h-[calc(100vh-90px)]">
                                {/* Pump Room Image - ~35% of left column height */}
                                <div className="h-[200px] lg:h-[35%] flex-shrink-0">
                                    <img
                                        src={pumpRoomImage}
                                        alt="Pump Room"
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                </div>

                                {/* Issues & Alerts - ~65% of left column height */}
                                <div className="flex-1 border border-gray-200 rounded-lg p-2 flex flex-col lg:min-h-0 bg-white">
                                    <div className="flex items-center justify-between flex-shrink-0 mb-2">
                                        <h3 className="text-xs font-bold text-gray-800">Issues & Alerts</h3>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
                                            {notifications.length} Active
                                        </span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar">
                                        <div className="flex flex-col gap-2">
                                            {notifications.length === 0 ? (
                                                <div className="flex items-center gap-1.5 p-2 rounded bg-green-50 border border-green-200 text-green-700 h-fit">
                                                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                                    <span className="text-[10px] font-semibold whitespace-nowrap">System operational</span>
                                                </div>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <div key={notif.id} className="p-2 rounded bg-red-50 border border-red-100 flex gap-2 w-full flex-shrink-0">
                                                        <div className="mt-0.5 flex-shrink-0">
                                                            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col">
                                                            <div className="flex items-start justify-between mb-0.5">
                                                                <span className="text-[10px] font-bold text-gray-900 line-clamp-2">{notif.title}</span>
                                                            </div>
                                                            <span className="text-[9px] text-gray-500 whitespace-nowrap mb-1">
                                                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }).replace('about ', '')}
                                                            </span>
                                                        </div>
                                                        <div className="text-[9px] text-gray-600 line-clamp-2 leading-tight flex-1">
                                                            {notif.message}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - ~75% width */}
                            <div className="w-full lg:w-3/4 flex flex-col gap-2 min-w-0">
                                {/* Section 1: Top Status Summary - Height ~80px */}
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:h-[80px]">
                                    {/* Fire Readiness - Dynamic based on system health */}
                                    <div className={cn(
                                        "rounded-xl border flex flex-col items-center justify-center p-1 shadow-sm",
                                        fireReadiness === 'READY'
                                            ? "border-green-200 bg-green-50"
                                            : "border-red-200 bg-red-50"
                                    )}>
                                        <div className={cn(
                                            "text-[9px] font-bold tracking-wide uppercase mb-0.5",
                                            fireReadiness === 'READY' ? "text-green-700" : "text-red-700"
                                        )}>FIRE READINESS</div>
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border",
                                            fireReadiness === 'READY'
                                                ? "bg-green-100/50 border-green-200"
                                                : "bg-red-100/50 border-red-200"
                                        )}>
                                            {fireReadiness === 'READY' ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                            ) : (
                                                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                                            )}
                                            <span className={cn(
                                                "text-xs font-bold",
                                                fireReadiness === 'READY' ? "text-green-700" : "text-red-700"
                                            )}>{fireReadiness}</span>
                                        </div>
                                    </div>

                                    {/* Pump Status */}
                                    <div className="rounded-xl border border-gray-100 bg-white flex flex-col items-center justify-center p-1 shadow-sm">
                                        <div className="text-[9px] font-bold text-gray-500 tracking-wide uppercase mb-0;">PUMP STATUS</div>
                                        <div className="text-xl font-bold text-gray-900 leading-none">{readyPumps} / 3</div>
                                        <div className="text-[9px] text-gray-400">Pumps Available</div>
                                    </div>

                                    {/* Water Sufficiency */}
                                    <div className="rounded-xl border border-gray-100 bg-white flex flex-col items-center justify-center p-1 shadow-sm">
                                        <div className="text-[9px] font-bold text-gray-500 tracking-wide uppercase mb-0;">WATER SUFFICIENCY</div>
                                        <div className="text-xl font-bold text-blue-600 leading-none">{waterSufficiency} min</div>
                                        <div className="text-[9px] text-gray-400">at max demand</div>
                                    </div>

                                    {/* Active Alarms */}
                                    <div className="rounded-xl border border-gray-100 bg-white flex flex-col items-center justify-center p-1 shadow-sm">
                                        <div className="text-[9px] font-bold text-gray-500 tracking-wide uppercase mb-0.5">ACTIVE ALARMS</div>
                                        <div className="flex items-center gap-2 w-full justify-center">
                                            {/* Major */}
                                            <div className="flex flex-col items-center px-1">
                                                <span className="text-lg font-bold text-red-600 leading-none">{alarmCounts.major}</span>
                                                <span className="text-[8px] font-medium text-gray-500 uppercase">Major</span>
                                            </div>
                                            <div className="w-px h-5 bg-gray-100"></div>
                                            {/* High */}
                                            <div className="flex flex-col items-center px-1">
                                                <span className="text-lg font-bold text-orange-600 leading-none">{alarmCounts.high}</span>
                                                <span className="text-[8px] font-medium text-gray-500 uppercase">High</span>
                                            </div>
                                            <div className="w-px h-5 bg-gray-100"></div>
                                            {/* Low */}
                                            <div className="flex flex-col items-center px-1">
                                                <span className="text-lg font-bold text-yellow-600 leading-none">{alarmCounts.low}</span>
                                                <span className="text-[8px] font-medium text-gray-500 uppercase">Low</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Last Auto-Start */}
                                    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col items-center">
                                        <div className="flex items-start gap-2">
                                            {/* Clock Icon */}

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-row justify-center items-center gap-2">
                                                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />

                                                    <div className="text-[12px] font-semibold text-gray-500 tracking-wide uppercase mb-1">
                                                        LAST AUTO-START
                                                    </div>
                                                </div>

                                                {lastAutoStart ? (
                                                    <>
                                                        <div className="text-sm font-bold text-gray-900 mb-0.5 text-center">
                                                            {format(lastAutoStart, 'dd MMM yyyy')}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mb-1.5 text-center">
                                                            {format(lastAutoStart, 'HH:mm:ss')}
                                                        </div>
                                                        <div className="flex items-center gap-1 justify-center ">
                                                            <CheckCircle2 className="h-3 w-3 text-green-600 " />
                                                            <span className="text-[10px] font-medium text-green-600 ">Success</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="text-sm font-bold text-gray-400 mb-0.5">
                                                            No data
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            --:--:--
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Support System Status - Height ~190px (Flexible) */}
                                <div className="flex flex-col h-auto min-h-[190px] bg-white rounded-xl border border-gray-100 p-2 shadow-sm lg:mt-6 mt-2">
                                    <h2 className="text-[10px] font-bold text-gray-900 uppercase tracking-wide mb-2 flex-shrink-0">Support System Status</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 flex-1 min-h-0">
                                        <SupportCard
                                            title="Diesel Storage"
                                            type="diesel"
                                            capacity={pumpData?.dieselStorage || 0}
                                            present={iotData.DLS || 0}
                                            unit="Ltrs"
                                            percentage={dieselPercentage}
                                        />
                                        <SupportCard
                                            title="Water Storage"
                                            type="water"
                                            capacity={(pumpData?.mainWaterStorage || 1) / 1000}
                                            present={iotData.WLS || 0}
                                            unit="kL"
                                            percentage={waterPercentage}
                                        />
                                        <SupportCard
                                            title="Battery Status"
                                            type="battery"
                                            capacity={12}
                                            present="Healthy"
                                            unit=""
                                            percentage={100}
                                        />
                                        <SupportCard
                                            title="Header Pressure"
                                            type="pressure"
                                            capacity={pumpData?.headerPressure || 0}
                                            present={iotData.PLS || 0}
                                            unit={pumpData?.pressureUnit || 'bar'}
                                            percentage={pressurePercentage}
                                        />
                                    </div>
                                </div>

                                {/* Section 3 & 4: Split Layout - Power & Reliability (Left) + Pump Availability (Right) */}
                                <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 mt-2 pb-4">
                                    {/* Left: Power, Battery & Reliability (Aligned with first column) */}
                                    <div className="xl:col-span-1 flex flex-col gap-2 bg-white rounded-xl border border-gray-100 p-2 shadow-sm">
                                        <h2 className="text-[10px] font-bold text-gray-900 uppercase tracking-wide mb-2">POWER, BATTERY & RELIABILITY</h2>
                                        <div className="flex flex-col gap-2 pr-1">
                                            <ReliabilityItem
                                                icon={<Droplets className="h-4 w-4" />}
                                                label="ENGINE OIL PRESSURE"
                                                status={iotData.OPR === 1 ? 'Normal' : 'Low'}
                                            />
                                            <ReliabilityItem
                                                icon={<Droplets className="h-4 w-4" />}
                                                label="WATER TEMPERATURE"
                                                status={iotData.WTP === 1 ? 'Normal' : 'High'}
                                            />
                                            <ReliabilityItem
                                                icon={<CheckCircle2 className="h-4 w-4" />}
                                                label="BATTERY CHARGING"
                                                status={iotData.BCH === 1 ? 'Normal' : 'Fault'}
                                            />
                                            <ReliabilityItem
                                                icon={<CheckCircle2 className="h-4 w-4" />}
                                                label="BATTERY HEALTH"
                                                status={'Good'}
                                            />
                                        </div>
                                    </div>

                                    {/* Right: Pump Availability (Aligned with remaining 3 columns) */}
                                    <div className="xl:col-span-3 flex flex-col min-w-0 gap-2 bg-white rounded-xl border border-gray-100 p-2 shadow-sm">
                                        <h2 className="text-[10px] font-bold text-gray-900 uppercase tracking-wide mb-2">PUMP AVAILABILITY</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {pumps.map((pump, idx) => (
                                                <PumpCard key={idx} {...pump} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

/**
 * Main Page Wrapper with Context
 */
export const PumpRoomSummary: React.FC = () => {
    const [plants, setPlants] = useState<any[]>([]);
    const [selectedPlant, setSelectedPlant] = useState<string>('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { getPlantsWithPumpRoom } = await import('@/services/pumpRoomService');
                const result = await getPlantsWithPumpRoom();

                if (result.plants && result.plants.length > 0 && result.category_id) {
                    setPlants(result.plants);
                    if (!selectedPlant) {
                        setSelectedPlant(result.plants[0].id);
                    }
                    setCategoryId(result.category_id);
                }
            } catch (error) {
                console.error('[PumpRoomSummary] Error fetching initial data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Loading pump room data...</p>
                </div>
            </div>
        );
    }

    if (!selectedPlant || !categoryId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md">
                    <div className="bg-amber-50 p-3 rounded-full w-fit mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Pump Room Plants Found</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        There are no plants configured with pump room assets or the necessary category data is missing.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <PumpRoomDataProvider selectedPlant={selectedPlant} categoryId={categoryId}>
            <PumpRoomSummaryContent
                plants={plants}
                selectedPlant={selectedPlant}
                onPlantChange={setSelectedPlant}
            />
        </PumpRoomDataProvider>
    );
};
