import { useState, useEffect } from "react";
import { pumpRoomApi } from "@/services/api/dashboardApi"; import ColorfulBarChart from "../../charts/ColorfulBarChart";
;


// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

type TimeframeTab = "Day" | "Week" | "Month";

interface ConditionDataPoint {
    label: string;
    status: string;
    tripStatus?: string;
    [key: string]: any;
}

interface ConditionLogResponse {
    data: ConditionDataPoint[];
    pumpType: string;
}

interface ConditionLogProps {
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

const ConditionLog: React.FC<ConditionLogProps> = ({
    iotNumber,
    selectedAsset,
    height = 500,
}) => {
    const [conditionTab, setConditionTab] = useState<TimeframeTab>("Day");
    const [conditionData, setConditionData] = useState<ConditionDataPoint[]>([]);
    const [pumpType, setPumpType] = useState<string>("Pump");
    const [loading, setLoading] = useState<boolean>(false);

    // Fetch Condition Data
    useEffect(() => {
        const fetchConditionData = async () => {
            if (!iotNumber || !selectedAsset) return;

            setLoading(true);
            setConditionData([]);

            try {
                const response: ConditionLogResponse = await pumpRoomApi.getPumpConditionLogData({
                    iotNumber,
                    selectedAsset,
                    timeframe: conditionTab,
                });

                if (response) {
                    setConditionData(response.data || []);
                    setPumpType(response.pumpType || "Pump");
                }
            } catch (error) {
                console.error("Error fetching condition data:", error);
                setConditionData([]);
                setPumpType("Pump");
            } finally {
                setLoading(false);
            }
        };

        fetchConditionData();
    }, [iotNumber, selectedAsset, conditionTab]);

    const tabs: TimeframeTab[] = ["Day", "Week", "Month"];

    return (
        <div
            className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 w-full"
            style={{ height: `${height}px`, display: "flex", flexDirection: "column" }}
        >
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-xl font-bold text-gray-800 mb-1">Condition Log</p>
                    <p className="text-gray-600">ON/OFF and Trip Status Over Time</p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">ON</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">OFF</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">TRIPPED</span>
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
                            isActive={conditionTab === tab}
                            onClick={() => setConditionTab(tab)}
                        />
                    ))}
                </div>
            </div>

            {/* Chart Container */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <ColorfulBarChart
                    key={`condition-bar-${iotNumber}-${selectedAsset}-${conditionTab}`}
                    data={conditionData}
                    iotNumber={iotNumber}
                    loading={loading}
                    yAxisLabel=""
                    xAxisData="status"
                    yAxisData="label"
                    categoricalYAxis={true}
                    disableHover={true}
                />
            </div>
        </div>
    );
};

export default ConditionLog;