import React, { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { pumpRoomApi } from "@/services/api/dashboardApi";
import DailyTimelineChart from "@/premium-dashboard/pumpRoom/charts/DailyTimelineChart";
import Card3D from "@/premium-dashboard/components/Card3D";
import { useKnowMore } from "../../contexts/KnowMoreContext";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";

interface ConditionDataPoint {
    timestamp: string;
    powerStatus: number;
    tripStatus: number;
}

interface ConditionLogWidgetProps {
    widgetControls?: React.ReactNode;
}

const ConditionLogWidget: React.FC<ConditionLogWidgetProps> = ({ widgetControls }) => {
    const { iotNumber, selectedAsset } = useKnowMore();
    const [conditionData, setConditionData] = useState<ConditionDataPoint[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Default range: Last 7 days
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 6),
        to: new Date(),
    });

    useEffect(() => {
        const fetchConditionData = async () => {
            if (!selectedAsset || !dateRange?.from || !dateRange?.to) return;

            setLoading(true);
            setConditionData([]);

            try {
                const response: { data: ConditionDataPoint[] } = await pumpRoomApi.getPumpConditionLogData({
                    selectedAsset,
                    startDate: dateRange.from.toISOString(),
                    endDate: dateRange.to.toISOString(),
                });

                if (response) {
                    setConditionData(response.data || []);
                }
            } catch (error) {
                console.error("Error fetching condition data:", error);
                setConditionData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchConditionData();
    }, [selectedAsset, dateRange]);

    return (
        <Card3D className="h-full flex flex-col p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
            <div className="flex flex-col h-full">
                {/* Header with Date Picker */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <Activity className="w-5 h-5 text-primary" strokeWidth={2} />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Condition Log</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <DateRangePicker
                            date={dateRange}
                            onDateChange={setDateRange}
                            className="scale-90 origin-right mr-4"
                        />
                        {widgetControls}
                    </div>
                </div>

                {/* Compact row with legend */}
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-600"></div>
                            <span className="text-[8px] font-medium text-muted-foreground">On</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-[8px] font-medium text-muted-foreground">Off</span>
                        </div>
                    </div>
                </div>

                {/* Chart Container */}
                <div className="flex-1 min-h-0 w-full overflow-y-auto pr-2">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : conditionData.length > 0 && dateRange?.from && dateRange?.to ? (
                        <DailyTimelineChart
                            data={conditionData}
                            dateRange={{ from: dateRange.from, to: dateRange.to }}
                            config={{
                                dataKey: 'status',  // Changed from 'powerStatus' - showing ON/OFF (PS), not Auto/Manual (AS)
                                valueMap: {
                                    0: { color: '#16a34a', label: 'On' },  // Green - PS=0 means ON
                                    1: { color: '#ef4444', label: 'Off' }  // Red - PS=1 means OFF
                                }
                            }}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            No data available for the selected range
                        </div>
                    )}
                </div>
            </div>
        </Card3D>
    );
};

export default ConditionLogWidget;
