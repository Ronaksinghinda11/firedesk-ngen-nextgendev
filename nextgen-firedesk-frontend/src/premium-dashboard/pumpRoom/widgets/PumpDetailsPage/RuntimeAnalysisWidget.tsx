import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { pumpRoomApi } from "@/services/api/dashboardApi";
import ColorfulBarChart from "../../charts/ColorfulBarChart";
import ColorfulLineChart from "../../charts/ColorfulLineChart";
import Card3D from "@/premium-dashboard/components/Card3D";
import { useKnowMore } from "../../contexts/KnowMoreContext";
import { cn } from "@/lib/utils";

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

interface RuntimeAnalysisWidgetProps {
    widgetControls?: React.ReactNode;
}

const RuntimeAnalysisWidget: React.FC<RuntimeAnalysisWidgetProps> = ({ widgetControls }) => {
    const { iotNumber, selectedAsset } = useKnowMore();
    const [runTimeTab, setRunTimeTab] = useState<TimeframeTab>("Day");
    const [chartType, setChartType] = useState<ChartType>("bar");
    const [runtimeData, setRuntimeData] = useState<RuntimeDataPoint[]>([]);
    const [average, setAverage] = useState<string>("0 Hrs");
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchRuntimeData = async () => {
            if (!selectedAsset) return;

            setLoading(true);
            setRuntimeData([]);
            setAverage("0 Hrs");

            try {
                const response: RuntimeResponse = await pumpRoomApi.getPumpRuntimeData({
                    selectedAsset,
                    timeframe: runTimeTab,
                });

                if (response) {
                    setRuntimeData(response.data || []);
                    setAverage(response.average || "0 Hrs");
                }
            } catch (error) {
                console.error("Error fetching runtime data:", error);
                setRuntimeData([]);
                setAverage("0 Hrs");
            } finally {
                setLoading(false);
            }
        };

        fetchRuntimeData();
    }, [selectedAsset, runTimeTab]);

    const tabs: TimeframeTab[] = ["Day", "Week", "Month"];

    return (
        <Card3D className="h-full flex flex-col p-3 shadow-lg border-t-2 border-t-primary border-x border-b border-border/40">
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/20">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                            <BarChart3 className="w-4 h-4 text-primary" strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Run Time Analysis</h3>
                            <p className="text-[10px] text-muted-foreground">Power status history</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                            <div className="text-lg font-black text-primary">{average}</div>
                            <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-tight">Average of the {runTimeTab}</div>
                        </div>
                        {widgetControls}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between mb-3">
                    {/* Timeframe Tabs */}
                    <div className="flex gap-1.5">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setRunTimeTab(tab)}
                                className={cn(
                                    "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all",
                                    runTimeTab === tab
                                        ? "bg-gradient-to-r from-primary to-orange-600 text-white shadow-sm"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Chart Type Selector */}
                    <select
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value as ChartType)}
                        className="px-2 py-1 text-[10px] font-semibold bg-card border border-border/40 rounded-lg hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                    >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                    </select>
                </div>

                {/* Chart Container */}
                <div className="flex-1 min-h-0">
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
        </Card3D>
    );
};

export default RuntimeAnalysisWidget;
