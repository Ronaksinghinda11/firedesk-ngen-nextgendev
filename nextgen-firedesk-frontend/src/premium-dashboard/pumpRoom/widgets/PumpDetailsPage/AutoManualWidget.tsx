import React, { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { pumpRoomApi, AutoManualStatusDataPoint } from "@/services/api/dashboardApi";
import DailyTimelineChart from "@/premium-dashboard/pumpRoom/charts/DailyTimelineChart";
import Card3D from "@/premium-dashboard/components/Card3D";
import { useKnowMore } from "../../contexts/KnowMoreContext";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";

interface AutoManualWidgetProps {
    widgetControls?: React.ReactNode;
}

const AutoManualWidget: React.FC<AutoManualWidgetProps> = ({ widgetControls }) => {
    const { iotNumber, selectedAsset } = useKnowMore();
    const [autoManualStatusData, setAutoManualStatusData] = useState<AutoManualStatusDataPoint[]>([]);
    const [autoManualLoading, setAutoManualLoading] = useState<boolean>(false);

    // Default range: Last 7 days
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 6),
        to: new Date(),
    });

    useEffect(() => {
        const fetchAutoManualStatusData = async () => {
            if (!selectedAsset || !dateRange?.from || !dateRange?.to) return;

            setAutoManualLoading(true);
            setAutoManualStatusData([]);

            try {
                const response: { data: any[] } = await pumpRoomApi.getPumpAutoManualStatusData({
                    selectedAsset,
                    startDate: dateRange.from.toISOString(),
                    endDate: dateRange.to.toISOString(),
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
                        <h3 className="text-sm font-bold text-foreground">Auto vs Manual</h3>
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
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-[8px] font-medium text-muted-foreground">Auto</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            <span className="text-[8px] font-medium text-muted-foreground">Manual</span>
                        </div>
                    </div>
                </div>

                {/* Chart Container */}
                <div className="flex-1 min-h-0 w-full overflow-y-auto pr-2">
                    {autoManualLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : autoManualStatusData.length > 0 && dateRange?.from && dateRange?.to ? (
                        <DailyTimelineChart
                            data={autoManualStatusData}
                            dateRange={{ from: dateRange.from, to: dateRange.to }}
                            config={{
                                dataKey: 'powerStatus',  // Changed from 'status' - showing Auto/Manual (AS), not ON/OFF (PS)
                                valueMap: {
                                    1: { color: '#3B82F6', label: 'Auto' },    // Blue - AS=1 means Auto
                                    0: { color: '#6b7280', label: 'Manual' }   // Gray - AS=0 means Manual
                                }
                            }}
                            yAxisFormatter={(val) => (val === 1 ? 'Auto' : val === 0 ? 'Manual' : '')}
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

export default AutoManualWidget;
