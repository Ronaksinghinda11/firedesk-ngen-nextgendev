import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Droplets,
    Fuel,
    Gauge,
    ChartNoAxesCombined,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import TrendCard from "../../pumpRoom/components/Trend";
import { pumpRoomApi } from "@/services/api/dashboardApi";
import { usePumpRoomData } from "../../contexts/PumpRoomDataContext";
import Card3D from "../../components/Card3D";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type TimeframeTab = "Day" | "Week" | "Last 30 Days";

interface ActiveTab {
    waterLevel: TimeframeTab;
    dieselLevel: TimeframeTab;
    headerPressure: TimeframeTab;
}

interface TrendHistory {
    date: string;
    data: number | string;
    timestamp?: string;
    value?: number;
    [key: string]: any;
}

interface WaterLevelTrend {
    avgWLS?: number;
    WLSHistory?: TrendHistory[];
    deviceId?: string;
}

interface DieselLevelTrend {
    avgDLS?: number;
    DLSHistory?: TrendHistory[];
    deviceId?: string;
}

interface HeaderPressureTrend {
    avgPLS?: number;
    PLSHistory?: TrendHistory[];
    headerPressureUnit?: string;
    deviceId?: string;
}

interface TrendsPerformanceWidgetProps {
    plantId: string;
    categoryId: string;
    widgetSize?: number;
}

const TrendsPerformanceWidget: React.FC<TrendsPerformanceWidgetProps> = ({
    plantId,
    categoryId,
    widgetSize = 12
}) => {
    const { pumpIotData, pumpData, timestamp, isLoading: contextLoading, error: contextError, deviceMappings } = usePumpRoomData();
    const [activeTab, setActiveTab] = useState<ActiveTab>({
        waterLevel: "Day",
        dieselLevel: "Day",
        headerPressure: "Day",
    });
    const [headerPressureTrend, setHeaderPressureTrend] = useState<HeaderPressureTrend>({});
    const [dieselLevelTrend, setDieselLevelTrend] = useState<DieselLevelTrend>({});
    const [waterLevelTrend, setWaterLevelTrend] = useState<WaterLevelTrend>({});
    const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

    const [currentCardIndex, setCurrentCardIndex] = useState(0);

    // Extract unique devices from mappings
    const availableDevices = useMemo(() => {
        if (!deviceMappings || deviceMappings.length === 0) return [];
        const uniqueDevices = new Map<string, string>();
        deviceMappings.forEach(mapping => {
            if (mapping.device_id && !uniqueDevices.has(mapping.device_id)) {
                uniqueDevices.set(mapping.device_id, mapping.device_id);
            }
        });
        return Array.from(uniqueDevices.keys());
    }, [deviceMappings]);

    // Set default device when devices load
    useEffect(() => {
        if (!selectedDevice && availableDevices.length > 0) {
            setSelectedDevice(availableDevices[0]);
        }
    }, [availableDevices, selectedDevice]);

    const nextCard = () => {
        setCurrentCardIndex((prev) => (prev + 1) % 3);
    };

    const prevCard = () => {
        setCurrentCardIndex((prev) => (prev - 1 + 3) % 3);
    };

    useEffect(() => {
        if (selectedDevice) {
            callWaterLevelTrendApi();
        }
    }, [activeTab.waterLevel, plantId, categoryId, selectedDevice]);

    useEffect(() => {
        if (selectedDevice) {
            callDieselLevelTrendApi();
        }
    }, [activeTab.dieselLevel, plantId, categoryId, selectedDevice]);

    useEffect(() => {
        if (selectedDevice) {
            callHeaderPressureTrendApi();
        }
    }, [activeTab.headerPressure, plantId, categoryId, selectedDevice]);

    const callWaterLevelTrendApi = async () => {
        try {
            const data = { plantId, categoryId, timeframe: activeTab.waterLevel, deviceId: selectedDevice };
            const response = await pumpRoomApi.getWaterLevelTrend(data);
            console.log('Water Level Trend Response:', response);
            setWaterLevelTrend(response as WaterLevelTrend || {});
        } catch (error) {
            console.error("Error fetching water level trend:", error);
            setWaterLevelTrend({});
        }
    };

    const callDieselLevelTrendApi = async () => {
        try {
            const data = { plantId, categoryId, timeframe: activeTab.dieselLevel, deviceId: selectedDevice };
            const response = await pumpRoomApi.getDieselLevelTrend(data);
            console.log('Diesel Level Trend Response:', response);
            setDieselLevelTrend(response as DieselLevelTrend || {});
        } catch (error) {
            console.error("Error fetching diesel level trend:", error);
            setDieselLevelTrend({});
        }
    };

    const callHeaderPressureTrendApi = async () => {
        try {
            const data = { plantId, categoryId, timeframe: activeTab.headerPressure, deviceId: selectedDevice };
            const response = await pumpRoomApi.getHeaderPressureTrend(data);
            console.log('Header Pressure Trend Response:', response);
            setHeaderPressureTrend(response as HeaderPressureTrend || {});
        } catch (error) {
            console.error("Error fetching header pressure trend:", error);
            setHeaderPressureTrend({});
        }
    };

    const handleTabChange = (trendType: keyof ActiveTab, tab: TimeframeTab) => {
        setActiveTab((prev) => ({ ...prev, [trendType]: tab }));
    };

    if (contextLoading) {
        return (
            <Card3D>
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Loading trends & performance data...
                </div>
            </Card3D>
        );
    }

    if (contextError) {
        return (
            <Card3D>
                <div className="flex items-center justify-center h-64 text-destructive">
                    Error: {contextError}
                </div>
            </Card3D>
        );
    }

    // Get last recorded values from trend history (device-specific) or fallback to pumpIotData
    const getLastValue = (history: TrendHistory[] | undefined, fallback: number) => {
        if (history && history.length > 0) {
            const lastItem = history[history.length - 1];
            return typeof lastItem.data === 'number' ? lastItem.data : (lastItem.value ?? fallback);
        }
        return fallback;
    };

    const lastWaterLevel = getLastValue(waterLevelTrend?.WLSHistory, pumpIotData?.WLS || 0);
    const lastDieselLevel = getLastValue(dieselLevelTrend?.DLSHistory, pumpIotData?.DLS || 0);
    const lastHeaderPressureLevel = getLastValue(headerPressureTrend?.PLSHistory, pumpIotData?.PLS || 0);

    // Capacity Constants - Dynamic from pumpData with USER provided fallbacks
    const WATER_CAPACITY = pumpData?.mainWaterStorage ? (pumpData.mainWaterStorage / 1000) : 300; // kL
    const DIESEL_CAPACITY = pumpData?.dieselStorage || 200; // L
    const PRESSURE_CAPACITY = pumpData?.headerPressure || 8.50; // Bar

    // Calculate minimum levels (75% of capacity)
    const waterMinLevel = pumpData?.mainWaterStorage ? ((pumpData.mainWaterStorage / 1000) * 0.75) : 0;
    const dieselMinLevel = pumpData?.dieselStorage ? (pumpData.dieselStorage * 0.75) : 0;
    const pressureMinLevel = pumpData?.headerPressure ? (pumpData.headerPressure * 0.75) : 0; // 75% of target pressure

    const cards = [
        <TrendCard
            key="water"
            yLable="Water Level"
            title="Water Level Trend"
            icon={Droplets}
            iconImage="/waterleveltrend.png"
            avgValue={
                waterLevelTrend?.WLSHistory && waterLevelTrend.WLSHistory.length > 0 && waterLevelTrend.avgWLS != null
                    ? `${waterLevelTrend.avgWLS} kL`
                    : lastWaterLevel > 0
                        ? `${lastWaterLevel} kL`
                        : "--"
            }
            lastRecorded={`${lastWaterLevel || 0} kL`}
            trend={waterLevelTrend?.WLSHistory || []}
            trendType="waterLevel"
            chartColor="blue"
            gradientId={1}
            minLine={waterMinLevel}
            maxDomain={WATER_CAPACITY}
            chartType="trend.chartType"
            activeTab={activeTab}
            handleTabChange={(trendType, tab) => handleTabChange(trendType, tab)}
            unit="kL"
        />,
        <TrendCard
            key="diesel"
            yLable="Diesel Level"
            title="Diesel Level Trends"
            icon={Fuel}
            iconImage="/dieselleveltrend.png"
            avgValue={
                dieselLevelTrend?.DLSHistory && dieselLevelTrend.DLSHistory.length > 0 && dieselLevelTrend.avgDLS != null
                    ? `${dieselLevelTrend.avgDLS} L`
                    : lastDieselLevel > 0
                        ? `${lastDieselLevel} L`
                        : "--"
            }
            lastRecorded={`${lastDieselLevel || 0} L`}
            trend={dieselLevelTrend?.DLSHistory || []}
            trendType="dieselLevel"
            chartColor="orange"
            gradientId={2}
            minLine={dieselMinLevel}
            maxDomain={DIESEL_CAPACITY}
            chartType="trend.chartType"
            activeTab={activeTab}
            handleTabChange={(trendType, tab) => handleTabChange(trendType, tab)}
            unit="L"
        />,
        <TrendCard
            key="pressure"
            yLable="Header Pressure"
            title="Header Pressure Trends"
            icon={Gauge}
            iconImage="/headerpressureleveltrend.png"
            avgValue={
                headerPressureTrend?.PLSHistory && headerPressureTrend.PLSHistory.length > 0 && headerPressureTrend.avgPLS != null
                    ? `${headerPressureTrend.avgPLS} Bar`
                    : lastHeaderPressureLevel > 0
                        ? `${lastHeaderPressureLevel} Bar`
                        : "--"
            }
            lastRecorded={`${lastHeaderPressureLevel || 0} Bar`}
            trend={headerPressureTrend?.PLSHistory || []}
            trendType="headerPressure"
            chartColor="purple"
            gradientId={3}
            minLine={pressureMinLevel}
            maxDomain={PRESSURE_CAPACITY}
            chartType="trend.chartType"
            activeTab={activeTab}
            handleTabChange={(trendType, tab) => handleTabChange(trendType, tab)}
            unit="Bar"
        />
    ];

    return (
        <Card3D className="p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <ChartNoAxesCombined className="h-5 w-5 text-primary" strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground leading-tight">Trends & Performance</h2>
                        {widgetSize > 4 && (
                            <p className="text-[10px] text-muted-foreground leading-tight">
                                Analyze historical trends and patterns
                            </p>
                        )}
                    </div>
                </div>
                {widgetSize > 4 && (
                    <div className="flex items-center gap-2">
                        {/* Device Selector */}
                        {availableDevices.length > 1 && (
                            <Select
                                value={selectedDevice || ""}
                                onValueChange={setSelectedDevice}
                            >
                                <SelectTrigger className="w-[160px] h-9 text-sm font-bold">
                                    <SelectValue placeholder="Select Device" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableDevices.map(device => (
                                        <SelectItem key={device} value={device} className="text-sm font-semibold">
                                            {device}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {availableDevices.length === 1 && selectedDevice && (
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
                {widgetSize <= 4 && (
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={prevCard}>
                            <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-[10px] font-medium w-3 text-center">
                            {currentCardIndex + 1}
                        </span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={nextCard}>
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Content: Carousel (small) or Grid (large) */}
            {widgetSize <= 4 ? (
                <div className="w-full">
                    {cards[currentCardIndex]}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {cards}
                </div>
            )}
        </Card3D>
    );
};

export default TrendsPerformanceWidget;