import { useState, useRef, useEffect } from "react";
import {
    Activity,
    Battery,
    ChartArea,
    CheckCircle,
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
import { Tooltip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Card3D from "../../components/Card3D";

// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

interface Product {
    productName: string;
    variants: Array<{
        type: string;
        image: string;
    }>;
}

interface Asset {
    _id: string;
    id: string;
    product: Product;
    assetId: string;
    building: string;
    location: string;
    type: string;
    healthStatus: string;
}

interface PumpIotData {
    AS1?: number;
    AS2?: number;
    AS3?: number;
    TS1?: number;
    TS2?: number;
    TS3?: number;
    PS1?: number;
    PS2?: number;
    PS3?: number;
    WLS?: number;
    DLS?: number;
    PLS?: number;
    WTP?: number;
    OPR?: number;
    BCH?: number;
    [key: string]: any;
}

interface PumpPerformanceProps {
    assets: Asset[];
    pumpIotData: PumpIotData;
    timestamp: string;
}

// -----------------------------------------------------
// COMPONENT
// -----------------------------------------------------

const PumpPerformance: React.FC<PumpPerformanceProps> = ({
    assets,
    pumpIotData,
    timestamp,
}) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [cardsPerView, setCardsPerView] = useState<number>(3);
    const [touchStart, setTouchStart] = useState<number>(0);
    const [touchEnd, setTouchEnd] = useState<number>(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const updateCardsPerView = () => {
            if (window.innerWidth < 768) {
                setCardsPerView(1); // Mobile: 1 card
            } else if (window.innerWidth < 1024) {
                setCardsPerView(2); // Tablet: 2 cards
            } else {
                setCardsPerView(3); // Desktop: 3 cards
            }
        };

        updateCardsPerView();
        window.addEventListener("resize", updateCardsPerView);
        return () => window.removeEventListener("resize", updateCardsPerView);
    }, []);

    const maxIndex = Math.max(0, assets.length - cardsPerView);

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

    // Touch handlers for swipe functionality
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe) {
            nextSlide();
        } else if (isRightSwipe) {
            prevSlide();
        }
    };

    return (
        <Card3D className="p-8 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                        <Activity className="h-6 w-6 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Pump Performance</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Monitor each pump's live condition, operational mode, and key maintenance insights
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                    <span className="text-xs text-muted-foreground">
                        Last Updated: <span className="font-semibold text-foreground">{new Date(timestamp).toLocaleString()}</span>
                    </span>
                </div>
            </div>


            {/* Navigation Controls */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                        Showing {currentIndex + 1} - {Math.min(currentIndex + cardsPerView, assets.length)} of {assets.length} pumps
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={prevSlide}
                        disabled={currentIndex === 0}
                        className={`p-2 rounded-lg transition-all duration-200 ${currentIndex === 0
                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                            : "bg-card border border-border hover:bg-accent hover:text-accent-foreground shadow-sm"
                            }`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-foreground px-3 py-1 rounded-lg bg-muted/50">
                        {currentIndex + 1} / {maxIndex + 1}
                    </span>
                    <button
                        onClick={nextSlide}
                        disabled={currentIndex >= maxIndex}
                        className={`p-2 rounded-lg transition-all duration-200 ${currentIndex >= maxIndex
                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                            : "bg-card border border-border hover:bg-accent hover:text-accent-foreground shadow-sm"
                            }`}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>


            {/* Pump Cards Slider */}
            <div
                className="relative overflow-hidden mt-3"
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
                    {assets.map((asset, index) => {
                        const productName = asset?.product?.productName?.toString()?.toUpperCase() || "NA";


                        const iotNumber =
                            productName === "ELECTRIC DRIVEN"
                                ? 2
                                : productName === "JOCKEY PUMP"
                                    ? 1
                                    : productName === "DIESEL DRIVEN"
                                        ? 3
                                        : 1;

                        let AS: keyof PumpIotData = "AS1";
                        let TS: keyof PumpIotData = "TS1";
                        let PS: keyof PumpIotData = "PS1";

                        if (iotNumber === 2) {
                            AS = "AS2";
                            TS = "TS2";
                            PS = "PS2";
                        } else if (iotNumber === 3) {
                            AS = "AS3";
                            TS = "TS3";
                            PS = "PS3";
                        }

                        const isDieselEngine = productName === "DIESEL DRIVEN";

                        const needAttention =
                            pumpIotData[PS] === 1 ||
                            pumpIotData[AS] === 1 ||
                            pumpIotData[TS] === 1 ||
                            (isDieselEngine &&
                                (pumpIotData?.WTP === 0 ||
                                    pumpIotData?.OPR === 0 ||
                                    pumpIotData?.BCH === 0));

                        const tooltipContent = (
                            <div className="flex flex-col gap-1 text-sm">
                                <p
                                    className={
                                        pumpIotData[PS] === 1 ? "text-red-500" : "text-gray-500"
                                    }
                                >
                                    Condition:{" "}
                                    {pumpIotData[PS] === 1
                                        ? "ON"
                                        : pumpIotData[PS] === 0
                                            ? "OFF"
                                            : "-"}
                                </p>

                                <p
                                    className={
                                        pumpIotData[AS] === 1 ? "text-gray-500" : "text-red-500"
                                    }
                                >
                                    Status:{" "}
                                    {pumpIotData[AS] === 1
                                        ? "Auto"
                                        : pumpIotData[AS] === 0
                                            ? "Manual"
                                            : "-"}
                                </p>

                                {!isDieselEngine && (
                                    <p
                                        className={
                                            pumpIotData[TS] === 1 ? "text-gray-500" : "text-red-500"
                                        }
                                    >
                                        Trip Status:{" "}
                                        {pumpIotData[TS] === 1
                                            ? "Auto"
                                            : pumpIotData[TS] === 0
                                                ? "Manual"
                                                : "-"}
                                    </p>
                                )}

                                {isDieselEngine && (
                                    <>
                                        <p
                                            className={
                                                pumpIotData?.BCH === 1 ? "text-gray-500" : "text-red-500"
                                            }
                                        >
                                            Battery Charging:{" "}
                                            {pumpIotData?.BCH === 1
                                                ? "Normal"
                                                : pumpIotData?.BCH === 0
                                                    ? "Fault"
                                                    : "-"}
                                        </p>
                                        <p
                                            className={
                                                pumpIotData?.WTP === 1 ? "text-gray-500" : "text-red-500"
                                            }
                                        >
                                            Water Temp:{" "}
                                            {pumpIotData?.WTP === 1
                                                ? "Normal"
                                                : pumpIotData?.WTP === 0
                                                    ? "Fault"
                                                    : "-"}
                                        </p>
                                        <p
                                            className={
                                                pumpIotData?.OPR === 1 ? "text-gray-500" : "text-red-500"
                                            }
                                        >
                                            Eng. Oil Pressure:{" "}
                                            {pumpIotData?.OPR === 1
                                                ? "Normal"
                                                : pumpIotData?.OPR === 0
                                                    ? "Fault"
                                                    : "-"}
                                        </p>
                                    </>
                                )}
                            </div>
                        );

                        return (
                            <div
                                key={index}
                                className="flex-shrink-0 bg-card rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow duration-200 p-4 flex flex-col"
                                style={{
                                    width:
                                        cardsPerView === 1
                                            ? "calc(100% - 21px)"
                                            : cardsPerView === 2
                                                ? "calc(50% - 21px)"
                                                : "calc(33.333% - 21px)",
                                }}
                            >
                                <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border">
                                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                        <img
                                            src={
                                                asset?.product?.variants.find(
                                                    (p) => p?.type === asset?.type
                                                )?.image
                                            }
                                            alt=""
                                            className="w-8 h-8"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="mb-1 text-sm font-semibold text-foreground">
                                            {asset?.product?.productName}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="truncate">{asset?.assetId}</span>
                                            <span className="truncate border-l border-border pl-2">
                                                {asset?.building?.toUpperCase()}-{asset?.location?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">Health Status</span>
                                        <div
                                            className={`flex items-center gap-1 px-2 py-1 rounded-5 ${needAttention ? "bg-[#FFEBEB]" : "bg-[#ECFDF5]"
                                                }`}
                                        >
                                            {!needAttention && (
                                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-[#047857]" />
                                            )}
                                            {needAttention && (
                                                <Tooltip
                                                    title={tooltipContent}
                                                    arrow
                                                    enterTouchDelay={0}
                                                    componentsProps={{
                                                        tooltip: {
                                                            sx: {
                                                                bgcolor: "white",
                                                                color: "black",
                                                                boxShadow: 2,
                                                                fontSize: 13,
                                                                borderRadius: 1,
                                                                maxWidth: 300,
                                                            },
                                                        },
                                                        arrow: {
                                                            sx: {
                                                                color: "white",
                                                            },
                                                        },
                                                    }}
                                                >
                                                    <div className="cursor-pointer">
                                                        <TriangleAlert className="w-4 h-4 md:w-5 md:h-5 text-[#B91C1C]" />
                                                    </div>
                                                </Tooltip>
                                            )}
                                            <span
                                                className={`text-[10px] md:text-sm font-medium ${needAttention ? "text-[#B91C1C]" : "text-[#047857]"
                                                    }`}
                                            >
                                                {needAttention ? "Needs Attention" : "Healthy"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">Conditions</span>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-sm font-medium ${pumpIotData[PS] === 1
                                                    ? "bg-[#B45309] text-white"
                                                    : pumpIotData[PS] === 0
                                                        ? "bg-[#047857] text-white"
                                                        : "bg-gray-100 text-black"
                                                    }`}
                                            >
                                                {pumpIotData[PS] === 1
                                                    ? "ON"
                                                    : pumpIotData[PS] === 0
                                                        ? "OFF"
                                                        : "-"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-b-1 border-[#E3E3E3] pb-4">
                                        <span className="text-sm font-semibold">Mode</span>
                                        <div className="flex items-center gap-1 bg-[#F9F9F9] p-1 rounded-5">
                                            {pumpIotData[AS] === 0 ? (
                                                <Play className="h-4 w-4" strokeWidth={1.5} />
                                            ) : pumpIotData[AS] === 1 ? (
                                                <Wrench className="h-4 w-4" strokeWidth={1.5} />
                                            ) : (
                                                "-"
                                            )}
                                            <span className="text-xs md:text-sm text-black">
                                                {pumpIotData[AS] === 0
                                                    ? "Auto"
                                                    : pumpIotData[AS] === 1
                                                        ? "Manual"
                                                        : "-"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Fixed height */}
                                <div className="mb-4 md:mb-6 flex-1">
                                    <div className="space-y-2 md:space-y-3 min-h-[100px] md:min-h-[100px]">
                                        {!isDieselEngine ? (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            <ChartArea className="w-5 h-5 text-[#727272]" />
                                                        </span>
                                                        <span className="text-sm text-[#727272]">
                                                            Trip Condition
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-xs md:text-sm font-medium ${pumpIotData[TS] === 0
                                                                ? "text-black"
                                                                : "text-[#B91C1C]"
                                                                }`}
                                                        >
                                                            {pumpIotData[TS] === 0
                                                                ? "Normal"
                                                                : pumpIotData[TS] === 1
                                                                    ? "Fault"
                                                                    : "-"}
                                                        </span>
                                                        <span>
                                                            {pumpIotData?.[TS] === 1 ? (
                                                                <OctagonAlert
                                                                    className="w-5 h-5 text-[#B91C1C]"
                                                                    strokeWidth={1.5}
                                                                />
                                                            ) : (
                                                                ""
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Empty placeholders to maintain consistent height */}
                                                <div className="h-[6px] md:h-[6px]"></div>
                                                <div className="h-[6px] md:h-[6px]"></div>
                                                <div className="h-[6px] md:h-[6px]"></div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            <ChartArea className="w-5 h-5 text-[#727272]" />
                                                        </span>
                                                        <span className="text-sm text-[#727272]">
                                                            Trip Condition
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-xs md:text-sm font-medium ${pumpIotData[TS] === 0
                                                                ? "text-black"
                                                                : "text-[#B91C1C]"
                                                                }`}
                                                        >
                                                            {pumpIotData[TS] === 0
                                                                ? "Normal"
                                                                : pumpIotData[TS] === 1
                                                                    ? "Fault"
                                                                    : "-"}
                                                        </span>
                                                        <span>
                                                            {pumpIotData?.[TS] === 1 ? (
                                                                <OctagonAlert
                                                                    className="w-5 h-5 text-[#B91C1C]"
                                                                    strokeWidth={1.5}
                                                                />
                                                            ) : (
                                                                ""
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            <Battery className="w-5 h-5 text-[#727272]" />
                                                        </span>
                                                        <span className="text-sm text-[#727272]">
                                                            Battery Charger
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-xs md:text-sm font-medium ${pumpIotData?.BCH === 1
                                                                ? "text-black"
                                                                : "text-[#B91C1C]"
                                                                }`}
                                                        >
                                                            {pumpIotData?.BCH === 1
                                                                ? "Normal"
                                                                : pumpIotData?.BCH === 0
                                                                    ? "Fault"
                                                                    : "-"}
                                                        </span>
                                                        <span>
                                                            {pumpIotData?.BCH === 0 ? (
                                                                <OctagonAlert
                                                                    className="w-5 h-5 text-[#B91C1C]"
                                                                    strokeWidth={1.5}
                                                                />
                                                            ) : (
                                                                ""
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            <ThermometerSun className="w-5 h-5 text-[#727272]" />
                                                        </span>
                                                        <span className="text-sm text-[#727272]">
                                                            Water Temperature
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-xs md:text-sm font-medium ${pumpIotData?.WTP === 1
                                                                ? "text-black"
                                                                : "text-[#B91C1C]"
                                                                }`}
                                                        >
                                                            {pumpIotData?.WTP === 1
                                                                ? "Normal"
                                                                : pumpIotData?.WTP === 0
                                                                    ? "Fault"
                                                                    : "-"}
                                                        </span>
                                                        <span>
                                                            {pumpIotData?.WTP === 0 ? (
                                                                <OctagonAlert
                                                                    className="w-5 h-5 text-[#B91C1C]"
                                                                    strokeWidth={1.5}
                                                                />
                                                            ) : (
                                                                ""
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            <Gauge className="w-5 h-5 text-[#727272]" />
                                                        </span>
                                                        <span className="text-sm text-[#727272]">
                                                            Oil Pressure
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-xs md:text-sm font-medium ${pumpIotData?.OPR === 1
                                                                ? "text-black"
                                                                : "text-[#B91C1C]"
                                                                }`}
                                                        >
                                                            {pumpIotData?.OPR === 1
                                                                ? "Normal"
                                                                : pumpIotData?.OPR === 0
                                                                    ? "Fault"
                                                                    : "-"}
                                                        </span>
                                                        <span>
                                                            {pumpIotData?.OPR === 0 ? (
                                                                <OctagonAlert
                                                                    className="w-5 h-5 text-[#B91C1C]"
                                                                    strokeWidth={1.5}
                                                                />
                                                            ) : (
                                                                ""
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Empty placeholder to maintain consistent height with non-diesel pumps */}
                                                <div className="h-[15px] md:h-[15px]"></div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Know More Section - now always at the bottom */}
                                <div className="flex justify-center pt-4 border-t border-border mt-auto">
                                    <button
                                        onClick={() =>
                                            navigate(`/manager/pump-product-details/${asset.id}`, {
                                                state: { assets, pumpIotData, timestamp },
                                            })
                                        }
                                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-orange-600 rounded-lg hover:shadow-md transition-all duration-200 hover:scale-105"
                                    >
                                        <span>View Details</span>
                                        <MoveRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div >
                        );
                    })}
                </div >
            </div >

            {/* Pagination Dots */}
            < div className="flex justify-center mt-6 gap-2" >
                {
                    Array.from({ length: maxIndex + 1 }, (_, index) => (
                        <button
                            key={index}
                            onClick={() => scrollToIndex(index)}
                            className={`w-2 h-2 rounded transition-all duration-200 ${index === currentIndex
                                ? "bg-[#FD9134] w-6"
                                : "bg-gray-300 hover:bg-gray-400"
                                }`}
                        />
                    ))
                }
            </div >
        </Card3D>
    );
};

export default PumpPerformance;