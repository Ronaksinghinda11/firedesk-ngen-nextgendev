import { useState, useEffect } from "react";
import { pumpRoomApi } from "@/services/api/dashboardApi";
import AutoManualStatusChart from "../../charts/AutoManualStatusChart";

// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

type TimeframeTab = "Day" | "Week" | "Month";

interface AutoManualStatusDataPoint {
    label: string;
    status: string; // "Auto" or "Manual"
}

interface AutoManualDurationDataPoint {
    label: string;
    autoHours: number;
    manualHours: number;
}

interface AutoManualStatusResponse {
    data: AutoManualStatusDataPoint[];
}

interface AutoManualDurationResponse {
    data: AutoManualDurationDataPoint[];
}

interface AutoManualAnalysisProps {
    iotNumber: number;
    selectedAsset: string;
    height?: number;
    onHeightChange?: (height: number) => void;
}

interface TabButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

// -----------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium border-none transition-all duration-200 ${isActive
            ? "bg-orange-500 text-white shadow-sm"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
        style={{ borderRadius: "20px" }}
    >
        {label}
    </button>
);

// -----------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------

const AutoManualAnalysis: React.FC<AutoManualAnalysisProps> = ({
    iotNumber,
    selectedAsset,
    height = 500,
}) => {
    const [autoManualTab, setAutoManualTab] = useState<TimeframeTab>("Day");
    const [autoManualStatusData, setAutoManualStatusData] = useState<AutoManualStatusDataPoint[]>([]);
    const [autoManualDurationData, setAutoManualDurationData] = useState<AutoManualDurationDataPoint[]>([]);
    const [autoManualLoading, setAutoManualLoading] = useState<boolean>(false);
    const [autoManualDurationLoading, setAutoManualDurationLoading] = useState<boolean>(false);

    // Fetch Auto Manual Status Data
    useEffect(() => {
        const fetchAutoManualStatusData = async () => {
            if (!iotNumber || !selectedAsset) return;

            setAutoManualLoading(true);
            setAutoManualStatusData([]);

            try {
                const response: AutoManualStatusResponse = await pumpRoomApi.getPumpAutoManualStatusData({
                    iotNumber,
                    selectedAsset,
                    timeframe: autoManualTab,
                });

                if (response?.data) {
                    setAutoManualStatusData(response.data || []);
                }
            } catch (error) {
                console.error("Error fetching auto manual status data:", error);
                setAutoManualStatusData([]);
            } finally {
                setAutoManualLoading(false);
            }
        };

        fetchAutoManualStatusData();
    }, [iotNumber, selectedAsset, autoManualTab]);

    // Fetch Auto Manual Duration Data
    useEffect(() => {
        const fetchAutoManualDurationData = async () => {
            if (!iotNumber || !selectedAsset) return;

            setAutoManualDurationLoading(true);
            setAutoManualDurationData([]);

            try {
                const response: AutoManualDurationResponse = await pumpRoomApi.getPumpAutoManualDurationData({
                    iotNumber,
                    selectedAsset,
                    timeframe: autoManualTab,
                });
                console.log("Auto Manual Duration Data:", response);
                if (response?.data) {
                    setAutoManualDurationData(response.data || []);
                }
            } catch (error) {
                console.error("Error fetching auto manual duration data:", error);
                setAutoManualDurationData([]);
            } finally {
                setAutoManualDurationLoading(false);
            }
        };

        fetchAutoManualDurationData();
    }, [iotNumber, selectedAsset, autoManualTab]);

    const tabs: TimeframeTab[] = ["Day", "Week", "Month"];

    return (
        <div
            className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 w-full"
            style={{ height: `${height}px`, display: "flex", flexDirection: "column" }}
        >
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-xl font-bold text-gray-800 mb-1">
                        Auto vs Manual & Status Trends
                    </p>
                    <p className="text-gray-600">Pump Operation Mode Analysis</p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-4 h-2 rounded-full"
                            style={{ backgroundColor: "#10b981" }}
                        ></div>
                        <span className="text-sm text-gray-700">Auto</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div
                            className="w-4 h-2 rounded-full"
                            style={{ backgroundColor: "#3b82f6" }}
                        ></div>
                        <span className="text-sm text-gray-700">Manual</span>
                    </div>
                </div>
            </div>

            {/* Tab Buttons */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex gap-2 w-fit">
                    {tabs.map((tab) => (
                        <TabButton
                            key={tab}
                            label={tab}
                            isActive={autoManualTab === tab}
                            onClick={() => setAutoManualTab(tab)}
                        />
                    ))}
                </div>
            </div>

            {/* Chart Container */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <AutoManualStatusChart
                    key={`auto-manual-${selectedAsset}-${autoManualTab}`}
                    statusData={autoManualStatusData}
                    durationData={autoManualDurationData}
                    loading={autoManualLoading || autoManualDurationLoading}
                    iotNumber={iotNumber}
                />
            </div>
        </div>
    );
};

export default AutoManualAnalysis;