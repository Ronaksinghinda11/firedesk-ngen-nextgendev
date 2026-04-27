import { useState, useEffect } from "react";
import { pumpRoomApi } from "@/services/api/dashboardApi";
import ColorfulBarChart from "../../charts/ColorfulBarChart";
import ColorfulLineChart from "../../charts/ColorfulLineChart";
;


// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

type TimeframeTab = "Day" | "Week" | "Month";
type ChartType = "bar" | "line";

interface RuntimeDataPoint {
    label: string;
    runtime: number;
    [key: string]: any;
}

interface RuntimeResponse {
    data: RuntimeDataPoint[];
    average: string;
    pumpType: string;
}

interface RunTimeAnalysisProps {
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

const RunTimeAnalysis: React.FC<RunTimeAnalysisProps> = ({
    iotNumber,
    selectedAsset,
    height = 500,
}) => {
    const [runTimeTab, setRunTimeTab] = useState<TimeframeTab>("Day");
    const [chartType, setChartType] = useState<ChartType>("bar");
    const [runtimeData, setRuntimeData] = useState<RuntimeDataPoint[]>([]);
    const [average, setAverage] = useState<string>("0 Hrs");
    const [pumpType, setPumpType] = useState<string>("Pump");
    const [loading, setLoading] = useState<boolean>(false);

    // Fetch Runtime Data
    useEffect(() => {
        const fetchRuntimeData = async () => {
            if (!iotNumber || !selectedAsset) return;

            setLoading(true);
            setRuntimeData([]);
            setAverage("0 Hrs");

            try {
                const response: RuntimeResponse = await pumpRoomApi.getPumpRuntimeData({
                    iotNumber,
                    selectedAsset,
                    timeframe: runTimeTab,
                });

                if (response) {
                    setRuntimeData(response.data || []);
                    setAverage(response.average || "0 Hrs");
                    setPumpType(response.pumpType || "Pump");
                }
            } catch (error) {
                console.error("Error fetching runtime data:", error);
                setRuntimeData([]);
                setAverage("0 Hrs");
                setPumpType("Pump");
            } finally {
                setLoading(false);
            }
        };

        fetchRuntimeData();
    }, [iotNumber, selectedAsset, runTimeTab]);

    const tabs: TimeframeTab[] = ["Day", "Week", "Month"];

    const handleChartTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setChartType(e.target.value as ChartType);
    };

    return (
        <div
            className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 w-full"
            style={{ height: `${height}px`, display: "flex", flexDirection: "column" }}
        >
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6 py-2">
                <div>
                    <p className="text-xl font-bold text-gray-800 mb-1">Run Time Analysis</p>
                    <p className="text-gray-600">Power Status History Analysis</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">{average}</div>
                    <div className="text-sm text-gray-500">Average Runtime</div>
                </div>
            </div>

            {/* Controls Section */}
            <div className="flex items-center justify-between mb-8">
                {/* Timeframe Tabs */}
                <div className="flex gap-2 w-fit">
                    {tabs.map((tab) => (
                        <TabButton
                            key={tab}
                            label={tab}
                            isActive={runTimeTab === tab}
                            onClick={() => setRunTimeTab(tab)}
                        />
                    ))}
                </div>

                {/* Chart Type Selector */}
                <div className="relative">
                    <select
                        value={chartType}
                        onChange={handleChartTypeChange}
                        className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                    </select>
                </div>
            </div>

            {/* Chart Container */}
            <div style={{ flex: 1, minHeight: 0 }}>
                {chartType === "bar" ? (
                    <ColorfulBarChart
                        key={`bar-${iotNumber}-${selectedAsset}-${runTimeTab}`}
                        data={runtimeData}
                        iotNumber={iotNumber}
                        loading={loading}
                        yAxisLabel="h"
                        xAxisData="runtime"
                        yAxisData="label"
                    />
                ) : (
                    <ColorfulLineChart
                        key={`line-${iotNumber}-${selectedAsset}-${runTimeTab}`}
                        data={runtimeData}
                        iotNumber={iotNumber}
                        loading={loading}
                        yAxisLabel="h"
                        xAxisData="runtime"
                        yAxisData="label"
                    />
                )}
            </div>
        </div>
    );
};

export default RunTimeAnalysis;