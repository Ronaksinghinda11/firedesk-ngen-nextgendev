import { useState, useRef, useEffect } from "react";
import {
    Activity,
    Battery,
    ChartArea,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Gauge,
    MoveRight,
    OctagonAlert,
    Play,
    ThermometerSun,
    TriangleAlert,
    Wrench,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tooltip } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { usePumpRoomData } from "../../contexts/PumpRoomDataContext";
import Card3D from "../../components/Card3D";
import { cn } from "@/lib/utils";

// Premium Dashboard Color Scheme
const COLORS = {
    primary: 'hsl(24, 95%, 53%)',
    success: 'hsl(142, 76%, 36%)',
    destructive: 'hsl(0, 84.2%, 60.2%)',
    warning: 'hsl(38, 92%, 50%)',
};

interface PumpPerformanceWidgetProps {
    widgetSize?: number;
}

const PumpPerformanceWidget: React.FC<PumpPerformanceWidgetProps> = ({ widgetSize = 12 }) => {
    const { assets, assetData, timestamp, isLoading, error, categoryId } = usePumpRoomData();

    // Filter to show only mapped assets
    // First, get all mapped assets
    const allMappedAssets = assets.filter(asset => assetData[asset.asset_code]);

    const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

    // Get unique devices from mapped assets
    const availableDevices = Array.from(new Set(
        allMappedAssets
            .map(asset => assetData[asset.asset_code]?.deviceId)
            .filter(Boolean)
    )) as string[];

    // Set default device
    useEffect(() => {
        if (!selectedDevice && availableDevices.length > 0) {
            setSelectedDevice(availableDevices[0]);
        }
    }, [availableDevices, selectedDevice]);

    // Filter assets by selected device
    const mappedAssets = selectedDevice
        ? allMappedAssets.filter(asset => assetData[asset.asset_code]?.deviceId === selectedDevice)
        : [];

    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [cardsPerView, setCardsPerView] = useState<number>(3);
    const [touchStart, setTouchStart] = useState<number>(0);
    const [touchEnd, setTouchEnd] = useState<number>(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();
    const location = useLocation();

    // Detect if user is in admin or manager context
    const roleBasePath = location.pathname.startsWith('/admin') ? '/admin' : '/manager';

    useEffect(() => {
        const updateCardsPerView = () => {
            // Priority 1: widgetSize
            if (widgetSize <= 4) {
                setCardsPerView(1);
            } else if (widgetSize <= 8) {
                setCardsPerView(2);
            } else {
                // FALLBACK to original window-based logic if widgetSize is default or large
                if (window.innerWidth < 768) {
                    setCardsPerView(1);
                } else if (window.innerWidth < 1024) {
                    setCardsPerView(2);
                } else {
                    setCardsPerView(3);
                }
            }
        };

        updateCardsPerView();
        window.addEventListener("resize", updateCardsPerView);
        return () => window.removeEventListener("resize", updateCardsPerView);
    }, [widgetSize]);

    const maxIndex = Math.max(0, mappedAssets.length - cardsPerView);

    const scrollToIndex = (index: number) => setCurrentIndex(index);
    const nextSlide = () => scrollToIndex(Math.min(currentIndex + 1, maxIndex));
    const prevSlide = () => scrollToIndex(Math.max(currentIndex - 1, 0));

    const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
    const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (distance > 50) nextSlide();
        else if (distance < -50) prevSlide();
    };

    if (isLoading) {
        return (
            <Card3D>
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Loading pump performance data...
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

    return (
        <Card3D className="p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground leading-tight">Pump Performance</h2>
                        {widgetSize > 4 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Monitor live condition, operational mode, and maintenance insights
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
            </div>

            {/* Cards Container */}
            <div className="relative">
                {/* Navigation Arrows */}
                {assets.length > cardsPerView && (
                    <>
                        <button
                            disabled={currentIndex === 0}
                            onClick={prevSlide}
                            className={cn(
                                "absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-card shadow-lg border-2 border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all",
                                currentIndex === 0 && "opacity-30 cursor-not-allowed"
                            )}
                        >
                            <ChevronLeft className="h-5 w-5 text-primary" />
                        </button>
                        <button
                            disabled={currentIndex >= maxIndex}
                            onClick={nextSlide}
                            className={cn(
                                "absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-card shadow-lg border-2 border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all",
                                currentIndex >= maxIndex && "opacity-30 cursor-not-allowed"
                            )}
                        >
                            <ChevronRight className="h-5 w-5 text-primary" />
                        </button>
                    </>
                )}

                {/* Carousel Container */}
                <div
                    ref={scrollRef}
                    className="overflow-hidden px-8"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div
                        className="flex gap-4 transition-transform duration-300 ease-in-out"
                        style={{ transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)` }}
                    >
                        {mappedAssets.map((asset, index) => {
                            const mapping = assetData[asset.asset_code];
                            const iotData = mapping?.liveData || {};

                            // Use dataKey mapping: AS1=Jockey, AS2=Electric, AS3=Diesel
                            const isDieselEngine = mapping?.dataKey === "AS3";

                            // Pump needs attention if: Manual (powerStatus=0), Tripped (tripStatus=0), or diesel issues
                            const needAttention = iotData.powerStatus === 0 || iotData.tripStatus === 0 ||
                                (isDieselEngine && (iotData?.waterTemperature === 0 || iotData?.oilPressure === 0 || iotData?.batteryCharger === 0));

                            const status = iotData.status === 0 ? "ON" : iotData.status === 1 ? "OFF" : "-";

                            const tooltipContent = (
                                <div className="flex flex-col gap-1 text-xs">
                                    <p className={iotData.status === 0 ? "text-success" : "text-muted-foreground"}>
                                        Condition: {status}
                                    </p>
                                    <p className={iotData.powerStatus === 1 ? "text-success" : "text-muted-foreground"}>
                                        Mode: {iotData.powerStatus === 1 ? "Auto" : iotData.powerStatus === 0 ? "Manual" : "-"}
                                    </p>
                                    {!isDieselEngine && (
                                        <p className={iotData.tripStatus === 1 ? "text-muted-foreground" : "text-destructive"}>
                                            Trip: {iotData.tripStatus === 1 ? "Normal" : iotData.tripStatus === 0 ? "Fault" : "-"}
                                        </p>
                                    )}
                                    {isDieselEngine && (
                                        <>
                                            <p className={iotData?.batteryCharger === 1 ? "text-muted-foreground" : "text-destructive"}>
                                                Battery: {iotData?.batteryCharger === 1 ? "Normal" : iotData?.batteryCharger === 0 ? "Fault" : "-"}
                                            </p>
                                            <p className={iotData?.waterTemperature === 1 ? "text-muted-foreground" : "text-destructive"}>
                                                Water Temp: {iotData?.waterTemperature === 1 ? "Normal" : iotData?.waterTemperature === 0 ? "Fault" : "-"}
                                            </p>
                                            <p className={iotData?.oilPressure === 1 ? "text-muted-foreground" : "text-destructive"}>
                                                Oil Pressure: {iotData?.oilPressure === 1 ? "Normal" : iotData?.oilPressure === 0 ? "Fault" : "-"}
                                            </p>
                                        </>
                                    )}
                                </div>
                            );

                            return (
                                <div
                                    key={index}
                                    className="flex-shrink-0 bg-card rounded-lg border-2 border-border/40 hover:border-primary/30 hover:shadow-xl transition-all duration-300 p-3 flex flex-col shadow-md"
                                    style={{
                                        width: cardsPerView === 1 ? "calc(100% - 16px)" : cardsPerView === 2 ? "calc(50% - 16px)" : "calc(33.333% - 16px)",
                                    }}
                                >
                                    {/* Card Header */}
                                    <div className="flex items-start gap-2 mb-3 pb-2.5 border-b-2 border-border/20 bg-gradient-to-r from-muted/30 to-transparent -mx-3 -mt-3 px-3 pt-3 rounded-t-lg">
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center border-2 border-primary/20 shadow-sm">
                                            <Activity className="w-6 h-6 text-primary" strokeWidth={2} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-foreground mb-0.5">{asset?.product?.product_name}</p>
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                <span className="font-semibold bg-muted/50 px-1.5 py-0.5 rounded">{asset?.asset_code}</span>
                                                <span className="border-l-2 border-border/50 pl-1.5 font-medium">
                                                    {asset?.building?.toUpperCase()}-{asset?.location?.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Section */}
                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                            <span className="text-[10px] font-semibold text-foreground">Health Status</span>
                                            <div
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border-2 shadow-sm",
                                                    needAttention
                                                        ? "bg-gradient-to-r from-destructive/15 to-destructive/10 border-destructive/30 text-destructive"
                                                        : "bg-gradient-to-r from-green-500/15 to-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
                                                )}
                                            >
                                                {!needAttention && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                {needAttention && (
                                                    <Tooltip
                                                        title={tooltipContent}
                                                        arrow
                                                        enterTouchDelay={0}
                                                        componentsProps={{
                                                            tooltip: { sx: { bgcolor: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", boxShadow: 2 } },
                                                            arrow: { sx: { color: "hsl(var(--popover))" } },
                                                        }}
                                                    >
                                                        <TriangleAlert className="w-3.5 h-3.5 cursor-pointer" />
                                                    </Tooltip>
                                                )}
                                                <span>{needAttention ? "Needs Attention" : "Healthy"}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                            <span className="text-[10px] font-semibold text-foreground">Condition</span>
                                            <span
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs font-bold border-2 shadow-sm",
                                                    iotData.status === 0
                                                        ? "bg-gradient-to-r from-green-500/15 to-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
                                                        : iotData.status === 1
                                                            ? "bg-gradient-to-r from-gray-500/15 to-gray-500/10 border-gray-500/30 text-gray-700 dark:text-gray-400"
                                                            : "bg-muted/50 border-border/50 text-muted-foreground"
                                                )}
                                            >
                                                {status}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border-2 border-primary/20">
                                            <span className="text-[10px] font-semibold text-foreground">Mode</span>
                                            <div className="flex items-center gap-1 bg-card/80 px-2 py-0.5 rounded border-2 border-border/30 shadow-sm">
                                                {iotData.powerStatus === 1 ? (
                                                    <Play className="h-3 w-3 text-primary" strokeWidth={2.5} />
                                                ) : iotData.powerStatus === 0 ? (
                                                    <Wrench className="h-3 w-3 text-muted-foreground" strokeWidth={2.5} />
                                                ) : "-"}
                                                <span className="text-[10px] font-bold text-foreground">
                                                    {iotData.powerStatus === 1 ? "Auto" : iotData.powerStatus === 0 ? "Manual" : "-"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Diagnostic Section */}
                                    <div className="mb-3 flex-1 space-y-1.5">
                                        {!isDieselEngine ? (
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-muted/40 to-muted/20 border-2 border-border/30">
                                                <div className="flex items-center gap-1.5">
                                                    <ChartArea className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-[10px] font-semibold text-foreground">Trip</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", iotData.tripStatus === 1 ? "text-green-700 bg-green-500/10" : "text-destructive bg-destructive/10")}>
                                                        {iotData.tripStatus === 1 ? "Normal" : iotData.tripStatus === 0 ? "Fault" : "-"}
                                                    </span>
                                                    {iotData.tripStatus === 0 && <OctagonAlert className="w-3 h-3 text-destructive" />}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {[
                                                    { icon: ChartArea, label: "Trip", value: iotData.tripStatus, key: "trip" },
                                                    { icon: Battery, label: "Battery", value: iotData?.batteryCharger, key: "battery" },
                                                    { icon: ThermometerSun, label: "Water Temp", value: iotData?.waterTemperature, key: "water" },
                                                    { icon: Gauge, label: "Oil Pressure", value: iotData?.oilPressure, key: "oil" },
                                                ].map(({ icon: Icon, label, value, key }) => (
                                                    <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-muted/40 to-muted/20 border-2 border-border/30">
                                                        <div className="flex items-center gap-1.5">
                                                            <Icon className="w-3.5 h-3.5 text-primary" />
                                                            <span className="text-[10px] font-semibold text-foreground">{label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", value === 1 ? "text-green-700 bg-green-500/10" : "text-destructive bg-destructive/10")}>
                                                                {value === 1 ? "Normal" : value === 0 ? "Fault" : "-"}
                                                            </span>
                                                            {value === 0 && <OctagonAlert className="w-3 h-3 text-destructive" />}
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>

                                    {/* Action Button - FIXED: Now passes assetData array instead of pumpIotData */}
                                    <button
                                        className="mt-auto w-full py-1.5 px-2.5 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-500 text-white rounded font-semibold text-[10px] shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1"
                                        onClick={() => navigate(`${roleBasePath}/pump-product-details/${asset.id}`, {
                                            state: { assets: mappedAssets, assetData: Object.values(assetData), timestamp, categoryId }
                                        })}
                                    >
                                        <span>View Details</span>
                                        <MoveRight className="w-3 h-3" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Pagination Dots */}
                {mappedAssets.length > cardsPerView && (
                    <div className="flex justify-center gap-2 mt-4">
                        {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => scrollToIndex(index)}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    currentIndex === index
                                        ? "bg-primary w-6"
                                        : "bg-border hover:bg-primary/30"
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Card3D >
    );
};

export default PumpPerformanceWidget;
