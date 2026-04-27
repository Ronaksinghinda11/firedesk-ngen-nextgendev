import React, { useState, useRef, useEffect } from "react";
import {
    Droplets,
    Fuel,
    Gauge,
    ChartNoAxesCombined,
    RefreshCw,
    Dot,
} from "lucide-react";
import Card3D from "../../components/Card3D";

import TrendCard from "./Trend";
import { pumpRoomApi } from "@/services/api/dashboardApi";

// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

type TimeframeTab = "Day" | "Week" | "Last 30 Days";

interface ActiveTab {
    waterLevel: TimeframeTab;
    dieselLevel: TimeframeTab;
    headerPressure: TimeframeTab;
}

interface TrendHistory {
    date?: string;
    timestamp?: string;
    value: number;
    [key: string]: any;
}

interface WaterLevelTrend {
    avgWLS?: number;
    WLSHistory?: TrendHistory[];
}

interface DieselLevelTrend {
    avgDLS?: number;
    DLSHistory?: TrendHistory[];
}

interface HeaderPressureTrend {
    avgPLS?: number;
    PLSHistory?: TrendHistory[];
    headerPressureUnit?: string;
}

interface TrendsPerformanceProps {
    timestamp: string;
    plantId: string;
    categoryId: string;
    lastWaterLevel: number;
    lastDieselLevel: number;
    lastHeaderPressureLevel: string;
}

// -----------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------

const TrendsPerformance: React.FC<TrendsPerformanceProps> = ({
    timestamp,
    plantId,
    categoryId,
    lastWaterLevel,
    lastDieselLevel,
    lastHeaderPressureLevel,
}) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>({
        waterLevel: "Day",
        dieselLevel: "Day",
        headerPressure: "Day",
    });
    const [headerPressureTrend, setHeaderPressureTrend] = useState<HeaderPressureTrend>({});
    const [dieselLevelTrend, setDieselLevelTrend] = useState<DieselLevelTrend>({});
    const [waterLevelTrend, setWaterLevelTrend] = useState<WaterLevelTrend>({});

    // Slider state
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [cardsPerView, setCardsPerView] = useState<number>(1);
    const touchStart = useRef<number>(0);
    const touchEnd = useRef<number>(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateCardsPerView = () => {
            if (window.innerWidth < 768) {
                setCardsPerView(1); // Mobile: 1 card
            } else if (window.innerWidth < 1024) {
                setCardsPerView(1); // Tablet: 1 card
            } else {
                setCardsPerView(1); // Desktop: 1 card
            }
        };

        updateCardsPerView();
        window.addEventListener("resize", updateCardsPerView);
        return () => window.removeEventListener("resize", updateCardsPerView);
    }, []);

    useEffect(() => {
        callWaterLevelTrendApi();
    }, [activeTab.waterLevel, plantId, categoryId]);

    useEffect(() => {
        callDieselLevelTrendApi();
    }, [activeTab.dieselLevel, plantId, categoryId]);

    useEffect(() => {
        callHeaderPressureTrendApi();
    }, [activeTab.headerPressure, plantId, categoryId]);

    useEffect(() => {
        callWaterLevelTrendApi();
        callDieselLevelTrendApi();
        callHeaderPressureTrendApi();
    }, [plantId, categoryId]);

    const callWaterLevelTrendApi = async () => {
        try {
            const data = {
                plantId,
                categoryId,
                timeframe: activeTab.waterLevel,
            };
            const response = await pumpRoomApi.getWaterLevelTrend(data);
            setWaterLevelTrend(response.data || {});
        } catch (error) {
            console.error("Error fetching water level trend:", error);
            setWaterLevelTrend({});
        }
    };

    const callDieselLevelTrendApi = async () => {
        try {
            const data = {
                plantId,
                categoryId,
                timeframe: activeTab.dieselLevel,
            };
            const response = await pumpRoomApi.getDieselLevelTrend(data);
            setDieselLevelTrend(response.data || {});
        } catch (error) {
            console.error("Error fetching diesel level trend:", error);
            setDieselLevelTrend({});
        }
    };

    const callHeaderPressureTrendApi = async () => {
        try {
            const data = {
                plantId,
                categoryId,
                timeframe: activeTab.headerPressure,
            };
            const response = await pumpRoomApi.getHeaderPressureTrend(data);
            setHeaderPressureTrend(response.data || {});
        } catch (error) {
            console.error("Error fetching header pressure trend:", error);
            setHeaderPressureTrend({});
        }
    };

    const maxIndex = Math.max(0, 3 - cardsPerView);

    const handleTabChange = (trendType: keyof ActiveTab, tab: TimeframeTab) => {
        setActiveTab((prev) => ({
            ...prev,
            [trendType]: tab,
        }));
    };

    const scrollToIndex = (index: number) => {
        setCurrentIndex(index);
    };

    const nextSlide = () => {
        const newIndex = Math.min(currentIndex + 1, maxIndex);
        scrollToIndex(newIndex);
    };

    const prevSlide = () => {
        const newIndex = Math.max(currentIndex - 1, 0);
        scrollToIndex(newIndex);
    };

    // Touch handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;

        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe) {
            nextSlide();
        } else if (isRightSwipe) {
            prevSlide();
        }

        // Reset values
        touchStart.current = 0;
        touchEnd.current = 0;
    };

    return (
        <Card3D className="p-8 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                        <ChartNoAxesCombined className="h-6 w-6 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Trends & Performance</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Get real-time and historical insights into fluid levels and system pressure
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                    <span className="text-xs text-muted-foreground">
                        Last Updated: <span className="font-semibold text-foreground">{new Date(timestamp).toLocaleString()}</span>
                    </span>
                </div>
            </div>

            {/* Cards Slider */}
            <div
                className="relative overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    ref={scrollRef}
                    className="flex gap-4 md:gap-6 transition-transform duration-500 ease-in-out"
                    style={{
                        transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
                    }}
                >
                    <div
                        key={8}
                        className="flex-shrink-0"
                        style={{
                            width:
                                cardsPerView === 1
                                    ? "calc(100% - 21px)"
                                    : cardsPerView === 2
                                        ? "calc(50% - 21px)"
                                        : "calc(100% - 21px)",
                        }}
                    >
                        <TrendCard
                            yLable="Water Level"
                            title="Water Level Trend"
                            icon={Droplets}
                            iconImage="/waterleveltrend.png"
                            avgValue={
                                waterLevelTrend?.avgWLS != null
                                    ? `${waterLevelTrend.avgWLS} Liters`
                                    : "--"
                            }
                            trend={waterLevelTrend?.WLSHistory}
                            trendType="waterLevel"
                            chartColor="red"
                            gradientId={1}
                            minLine={1}
                            lastRecorded={`${lastWaterLevel} Liters`}
                            chartType="trend.chartType"
                            activeTab={activeTab}
                            handleTabChange={(trendType, tab) => handleTabChange(trendType, tab)}
                            unit="L"
                        />
                    </div>

                    <div
                        key={7}
                        className="flex-shrink-0"
                        style={{
                            width:
                                cardsPerView === 1
                                    ? "calc(100% - 21px)"
                                    : cardsPerView === 2
                                        ? "calc(50% - 21px)"
                                        : "calc(100% - 21px)",
                        }}
                    >
                        <TrendCard
                            yLable="Diesel Level"
                            title="Diesel Level Trends"
                            icon={Fuel}
                            iconImage="/dieselleveltrends.png"
                            avgValue={
                                dieselLevelTrend?.avgDLS
                                    ? `${dieselLevelTrend?.avgDLS} Liters`
                                    : "--"
                            }
                            trend={dieselLevelTrend?.DLSHistory}
                            lastRecorded={`${lastDieselLevel} Liters`}
                            trendType="dieselLevel"
                            chartColor="red"
                            gradientId={1}
                            minLine={1}
                            chartType="trend.chartType"
                            activeTab={activeTab}
                            handleTabChange={(trendType, tab) => handleTabChange(trendType, tab)}
                            unit="L"
                        />
                    </div>
                    <div
                        key={9}
                        className="flex-shrink-0"
                        style={{
                            width:
                                cardsPerView === 1
                                    ? "calc(100% - 21px)"
                                    : cardsPerView === 2
                                        ? "calc(50% - 21px)"
                                        : "calc(100% - 21px)",
                        }}
                    >
                        <TrendCard
                            yLable="Header Pressure"
                            title="Header Pressure Trends"
                            icon={Gauge}
                            iconImage="/headerpressuretrends.png"
                            avgValue={
                                headerPressureTrend?.avgPLS
                                    ? `${headerPressureTrend.avgPLS} Bar`
                                    : "--"
                            }
                            lastRecorded={lastHeaderPressureLevel}
                            trend={headerPressureTrend?.PLSHistory}
                            trendType="headerPressure"
                            chartColor="blue"
                            gradientId={1}
                            minLine={1}
                            chartType="trend.chartType"
                            activeTab={activeTab}
                            handleTabChange={(trendType, tab) => handleTabChange(trendType, tab)}
                            unit="Bar"
                        />
                    </div>
                </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center mt-6 gap-2">
                {Array.from({ length: maxIndex + 1 }, (_, index) => (
                    <button
                        key={index}
                        onClick={() => scrollToIndex(index)}
                        className={`w-2 h-2 rounded transition-all duration-200 ${index === currentIndex
                            ? "bg-[#FD9134] w-6"
                            : "bg-gray-300 hover:bg-gray-400"
                            }`}
                    />
                ))}
            </div>
        </Card3D>
    );
};

export default TrendsPerformance;