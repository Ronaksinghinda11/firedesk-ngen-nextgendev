
import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { format, addDays, startOfDay, endOfDay, isSameDay, differenceInDays, isToday } from 'date-fns';

interface DataPoint {
    timestamp: string;
    [key: string]: any;
}

interface DailyTimelineChartProps {
    data: DataPoint[];
    dateRange: { from: Date; to: Date };
    config: {
        dataKey: string;
        // Map value (e.g. 0, 1) to specific color and label
        valueMap: Record<number, { color: string; label: string }>;
    };
    height?: number;
    yAxisFormatter?: (value: any) => string;
}

const DailyTimelineChart: React.FC<DailyTimelineChartProps> = ({
    data,
    dateRange,
    config,
    yAxisFormatter,
}) => {
    // 1. Process data into daily chunks with separate series for each value
    const dailyData = useMemo(() => {
        if (!dateRange.from || !dateRange.to) return [];

        const days: { date: Date; points: any[] }[] = [];
        let currentDate = startOfDay(dateRange.from);
        const endDate = endOfDay(dateRange.to);
        const now = new Date();

        // Initial state tracking
        let currentState = 0;

        // Find initial state
        if (data.length > 0) {
            currentState = data[0][config.dataKey];
        }

        // Values to track (from config)
        const trackedValues = Object.keys(config.valueMap).map(Number);

        let dataIndex = 0;

        while (currentDate <= endDate) {
            // Skip future days entirely — no data to show
            if (startOfDay(currentDate) > startOfDay(now)) {
                currentDate = addDays(currentDate, 1);
                continue;
            }

            const dayStart = currentDate.getTime();
            const dayEnd = endOfDay(currentDate).getTime();
            const dayPoints: any[] = [];

            // Helper to push a point for a specific series with a specific value
            // seriesVal: The "key" or series we are adding to (e.g. 1 for Green series)
            // plottingVal: The actual Y-value to plot (e.g. 0 if we are drawing the vertical start)
            const pushSpecific = (time: number, seriesVal: number, plottingVal: number) => {
                const point: any = { timestamp: time, normalizedTime: time - dayStart };
                // Initialize all tracked values to null so they don't draw
                trackedValues.forEach(v => point[`val_${v}`] = null);
                // Set the specific series value
                point[`val_${seriesVal}`] = plottingVal;
                dayPoints.push(point);
            };

            // Initial point for the day
            pushSpecific(dayStart, currentState, currentState);

            // Collect all points for this day
            while (dataIndex < data.length) {
                const pointTime = new Date(data[dataIndex].timestamp).getTime();

                if (pointTime > dayEnd) break;

                if (pointTime >= dayStart) {
                    const nextVal = data[dataIndex][config.dataKey];

                    if (nextVal !== currentState) {
                        // 1. Close the current segment at the transition time
                        pushSpecific(pointTime, currentState, currentState);

                        // 2. Start the NEXT segment with a vertical connector
                        // We add a point to the *next* series, but at the *current* Y-level
                        // This makes the vertical line take the color of the NEW state (Leading Edge coloring)
                        pushSpecific(pointTime, nextVal, currentState);

                        // 3. Complete the vertical by moving to the new Y-level
                        pushSpecific(pointTime, nextVal, nextVal);

                        currentState = nextVal;
                    }
                }
                dataIndex++;
            }

            // End of Day point — for today, stop at current time instead of end of day
            const isCurrentDay = isToday(currentDate);
            const dayEndPoint = isCurrentDay ? Math.min(now.getTime(), dayEnd) : dayEnd;
            pushSpecific(dayEndPoint, currentState, currentState);

            days.push({
                date: new Date(currentDate),
                points: dayPoints
            });

            currentDate = addDays(currentDate, 1);
        }

        return days;
    }, [data, dateRange, config]);

    // Generate X-Axis ticks (every 1 hour)
    const xTicks = Array.from({ length: 25 }, (_, i) => i * 60 * 60 * 1000);

    // Get status labels from config
    const statusLabels = Object.entries(config.valueMap).map(([val, settings]) => settings.label);

    return (
        <div className="w-full flex flex-col select-none border border-border/30 rounded-lg overflow-hidden">
            {/* Sticky X-Axis Header */}
            <div className="flex bg-muted/40 border-b border-border/30 sticky top-0 z-20">
                <div className="w-14 flex-shrink-0 px-2 py-1.5 text-[8px] font-bold text-muted-foreground uppercase border-r border-border/30">
                    Date
                </div>
                <div className="flex-1 flex">
                    {Array.from({ length: 24 }, (_, i) => (
                        <div
                            key={i}
                            className="flex-1 text-center text-[7px] font-medium text-muted-foreground py-1.5 border-r border-border/10 last:border-r-0"
                        >
                            {i}
                        </div>
                    ))}
                </div>
                <div className="w-14 flex-shrink-0 px-1 py-1.5 text-[7px] font-bold text-muted-foreground uppercase text-center border-l border-border/30">
                    Mode
                </div>
            </div>

            {/* Scrollable Chart Rows with Fixed Height */}
            <div className="max-h-[280px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                {dailyData.map((day, index) => {
                    // Determine what status to show for this day based on majority status
                    const lastPoint = day.points[day.points.length - 1];
                    const currentVal = Object.entries(lastPoint || {}).find(([k, v]) => k.startsWith('val_') && v !== null);
                    const statusKey = currentVal ? currentVal[0].replace('val_', '') : '0';
                    const statusConfig = config.valueMap[Number(statusKey)];

                    return (
                        <div key={index} className="flex flex-row items-center border-b border-border/20 last:border-0 h-[32px] hover:bg-muted/10 transition-colors">
                            {/* Date Label */}
                            <div className="w-14 flex-shrink-0 text-[9px] font-semibold text-foreground px-2 text-left bg-background border-r border-border/20">
                                {format(day.date, 'MMM dd')}
                            </div>

                            {/* Chart Area */}
                            <div className="flex-1 h-[36px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={day.points}
                                        margin={{ top: 4, right: 10, left: 0, bottom: 4 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                        <ReferenceLine y={1} stroke="#e5e7eb" strokeDasharray="2 2" />
                                        <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="2 2" />

                                        <XAxis
                                            dataKey="normalizedTime"
                                            type="number"
                                            domain={[0, 24 * 60 * 60 * 1000]}
                                            hide={true}
                                            ticks={xTicks}
                                        />
                                        <YAxis type="number" domain={[-0.2, 1.2]} hide />

                                        <Tooltip
                                            cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const p = payload.find(p => p.value !== null);
                                                    if (!p) return null;

                                                    const val = p.dataKey?.toString().replace('val_', '');
                                                    const configVal = config.valueMap[Number(val)];

                                                    const data = payload[0].payload;
                                                    const actualTime = new Date(day.date.getTime() + data.normalizedTime);

                                                    return (
                                                        <div className="bg-card/95 backdrop-blur-sm px-2.5 py-1.5 border border-border shadow-lg rounded-lg text-[10px] z-50">
                                                            <div className="font-semibold text-foreground">{format(actualTime, 'HH:mm:ss')}</div>
                                                            <div style={{ color: configVal?.color }} className="font-bold">
                                                                {configVal?.label}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />

                                        {Object.entries(config.valueMap).map(([val, settings]) => (
                                            <Line
                                                key={val}
                                                type="linear"
                                                dataKey={`val_${val}`}
                                                stroke={settings.color}
                                                strokeWidth={2.5}
                                                dot={false}
                                                activeDot={{ r: 3, strokeWidth: 0 }}
                                                connectNulls={false}
                                                isAnimationActive={false}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Z-Axis: Scale labels (Auto=top/1, Manual=bottom/0) */}
                            <div
                                className="w-14 flex-shrink-0 flex flex-col justify-between items-center bg-muted/10 border-l border-border/20 h-full py-1"
                            >
                                {/* Top = value 1 (Auto) */}
                                <span
                                    className="text-[7px] font-bold uppercase"
                                    style={{ color: config.valueMap[1]?.color || '#3B82F6' }}
                                >
                                    {config.valueMap[1]?.label || 'Auto'}
                                </span>
                                {/* Bottom = value 0 (Manual) */}
                                <span
                                    className="text-[7px] font-bold uppercase"
                                    style={{ color: config.valueMap[0]?.color || '#6b7280' }}
                                >
                                    {config.valueMap[0]?.label || 'Manual'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Sticky X-Axis Footer */}
            <div className="flex bg-muted/40 border-t border-border/30 sticky bottom-0 z-20">
                <div className="w-14 flex-shrink-0 px-1 py-1 text-[7px] text-muted-foreground border-r border-border/30">
                    Hrs →
                </div>
                <div className="flex-1 flex">
                    {Array.from({ length: 24 }, (_, i) => (
                        <div
                            key={i}
                            className="flex-1 text-center text-[7px] font-medium text-muted-foreground py-1 border-r border-border/10 last:border-r-0"
                        >
                            {i}
                        </div>
                    ))}
                </div>
                <div className="w-14 flex-shrink-0 border-l border-border/30" />
            </div>
        </div>
    );
};

export default DailyTimelineChart;
