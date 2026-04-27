import React, { useMemo, useState } from "react";
import { CloseFullscreen } from "@mui/icons-material";
import { Box, IconButton, Modal, Typography } from "@mui/material";
import { ExpandIcon, LucideIcon } from "lucide-react";
import moment from "moment";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
} from "recharts";
import { isArray } from "lodash";

// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

type TimeframeTab = "Day" | "Week" | "Last 30 Days";

interface ActiveTab {
    waterLevel: TimeframeTab;
    dieselLevel: TimeframeTab;
    headerPressure: TimeframeTab;
}

interface TrendDataPoint {
    date: string | Date;
    data: number | string;
    [key: string]: any;
}

interface ChartDataPoint {
    date: string | Date;
    value: number;
}

interface TrendCardProps {
    title: string;
    icon: LucideIcon;
    iconImage?: string;
    avgValue: string;
    trend?: TrendDataPoint[];
    trendType: keyof ActiveTab;
    yLable?: string;
    chartColor?: string;
    gradientId?: number;
    minLine?: number;
    lastRecorded: string;
    chartType?: string;
    handleTabChange: (trendType: keyof ActiveTab, tab: TimeframeTab) => void;
    activeTab: ActiveTab;
    unit?: string;
    maxDomain?: number;
}

interface WeekObj {
    [key: number]: number[];
}

interface DayObj {
    [key: string]: number[];
}

// Color scheme mapping
const colorSchemes: { [key: string]: { stroke: string; fill: string; bg: string; border: string } } = {
    blue: {
        stroke: 'hsl(200, 98%, 50%)',    // Sky Blue
        fill: 'hsl(200, 98%, 50%)',
        bg: 'hsl(200, 98%, 95%)',
        border: 'hsl(200, 98%, 80%)',
    },
    orange: {
        stroke: 'hsl(24, 95%, 53%)',     // Flame Orange
        fill: 'hsl(24, 95%, 53%)',
        bg: 'hsl(24, 95%, 95%)',
        border: 'hsl(24, 95%, 80%)',
    },
    purple: {
        stroke: 'hsl(270, 70%, 55%)',    // Purple
        fill: 'hsl(270, 70%, 55%)',
        bg: 'hsl(270, 70%, 95%)',
        border: 'hsl(270, 70%, 80%)',
    },
    green: {
        stroke: 'hsl(142, 76%, 36%)',    // Green
        fill: 'hsl(142, 76%, 36%)',
        bg: 'hsl(142, 76%, 95%)',
        border: 'hsl(142, 76%, 80%)',
    },
    red: {
        stroke: 'hsl(0, 84%, 60%)',      // Red
        fill: 'hsl(0, 84%, 60%)',
        bg: 'hsl(0, 84%, 95%)',
        border: 'hsl(0, 84%, 80%)',
    },
};

// -----------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------

/**
 * Generate fallback data points when historical data is empty
 * Creates a flat line showing the current value across the timeframe
 */
const generateFallbackData = (
    activeTab: ActiveTab,
    trendType: keyof ActiveTab,
    lastRecordedValue: number
): ChartDataPoint[] => {
    const timeframe = activeTab[trendType];

    if (timeframe === "Day") {
        // Generate hourly data points for the past 24 hours
        const data: ChartDataPoint[] = [];
        for (let i = 23; i >= 0; i--) {
            data.push({
                date: moment().subtract(i, 'hours').format("hh:mm A"),
                value: lastRecordedValue
            });
        }
        return data;
    } else if (timeframe === "Week") {
        // Generate daily data points for the past 7 days
        const weekMap = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
        return weekMap.map((day) => ({
            date: day,
            value: lastRecordedValue
        }));
    } else {
        // Last 30 Days - Generate daily data points
        const data: ChartDataPoint[] = [];
        for (let i = 29; i >= 0; i--) {
            data.push({
                date: moment().subtract(i, 'days').format("MMM-DD"),
                value: lastRecordedValue
            });
        }
        return data;
    }
};

const getChartData = (
    activeTab: ActiveTab,
    trendType: keyof ActiveTab,
    trend?: TrendDataPoint[],
    isExpanded?: boolean,
    lastRecordedValue?: number
): ChartDataPoint[] => {
    const trendData: ChartDataPoint[] = (trend || []).map((item) => ({
        date: new Date(item.date),
        value: Math.round(Number(item.data) * 100) / 100,
    }));

    // If no historical data and we have a last recorded value, generate fallback data
    if (trendData.length === 0 && lastRecordedValue !== undefined && lastRecordedValue !== null) {
        return generateFallbackData(activeTab, trendType, lastRecordedValue);
    }

    // fallback value for gap-filling in week/month views
    const fallback = lastRecordedValue ?? 0;

    // Apply the same filtering logic for both expanded and non-expanded views
    if (activeTab[trendType] === "Week") {
        const weekData = getDayAverages(trendData, fallback);
        if (isExpanded) {
            return weekData;
        }
        return weekData;
    } else if (activeTab[trendType] === "Last 30 Days") {
        const monthData = getLast30DaysAverageList(trendData, fallback);
        if (isExpanded) {
            return monthData.map((item) => ({
                ...item,
                date: moment(item.date, "MMM-DD").format("MMM DD"),
            }));
        }
        return monthData;
    } else {
        // Day tab - show hours
        if (isExpanded) {
            return trendData.map((item) => ({
                ...item,
                date: moment(item.date).format("DD MMM, hh:mm A"),
            }));
        }
        return trendData.map((item) => ({
            ...item,
            date: moment(item.date).format("hh:mm A"),
        }));
    }
};

function getDayAverages(dataArray: ChartDataPoint[] = [], fallbackValue: number = 0): ChartDataPoint[] {
    const weekMap = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
    const weekObj: WeekObj = {};

    dataArray.forEach((data) => {
        const day = moment(data.date).day();
        if (isArray(weekObj[day])) {
            weekObj[day].push(data.value);
        } else {
            weekObj[day] = [data.value];
        }
    });

    const result = weekMap.map((item, index) => {
        if (weekObj[index] && weekObj[index].length > 0) {
            const total = weekObj[index].reduce((acc, curItem) => {
                acc = acc + curItem;
                return acc;
            }, 0);
            return {
                date: weekMap[index],
                value: Math.round((total / weekObj[index].length) * 100) / 100,
            };
        } else {
            // Use last recorded value instead of 0 for days with no data
            return {
                date: weekMap[index],
                value: fallbackValue,
            };
        }
    });

    return result;
}

function getLast30DaysAverageList(dataArray: ChartDataPoint[] = [], fallbackValue: number = 0): ChartDataPoint[] {
    const dayObj: DayObj = {};
    const last30DaysArr: ChartDataPoint[] = [];

    for (let i = 0; i < 30; i++) {
        last30DaysArr.push({
            date: moment().subtract(29 - i, "days").format("MMM-DD"),
            value: fallbackValue, // Use last recorded value instead of 0 for days with no data
        });
    }

    dataArray.forEach((data) => {
        const day = moment(data.date).format("MMM-DD");
        if (isArray(dayObj[day])) {
            dayObj[day].push(data.value);
        } else {
            dayObj[day] = [data.value];
        }
    });

    const result = last30DaysArr.map((item) => {
        if (dayObj[item.date as string] && dayObj[item.date as string].length > 0) {
            const total = dayObj[item.date as string].reduce((acc, curVal) => {
                acc = acc + curVal;
                return acc;
            }, 0);
            item.value = Math.round((total / dayObj[item.date as string].length) * 100) / 100;
        }
        return item;
    });

    return result;
}
/**
 * Calculates a "nice" Y-axis domain and tick set based on data and reference lines.
 * Snaps to multiples of 1, 2, 2.5, 5, or 10 for professional look.
 */
const calculateNiceDomain = (
    data: ChartDataPoint[],
    minLine: number,
    maxDomain?: number
): { max: number; ticks: number[] } => {
    const values = data.map((d) => (typeof d.value === "number" ? d.value : 0));
    const dataMax = Math.max(...values, 0);

    // If a fixed maxDomain is provided, use it. Otherwise, calculate a dynamic one.
    let effectiveMax: number;
    if (maxDomain && maxDomain > 0) {
        effectiveMax = maxDomain;
    } else {
        // Ensure the reference line (minLine) is also visible
        effectiveMax = Math.max(dataMax, minLine) * 1.05; // 5% buffer
    }

    let niceMax: number;

    if (maxDomain && maxDomain > 0) {
        // If fixed max is provided:
        // 1. If data is within capacity, use capacity exactly (the "fixed" look)
        // 2. If data exceeds capacity, use dynamic scaling to fit it
        if (dataMax <= maxDomain && minLine <= maxDomain) {
            niceMax = maxDomain;
        } else {
            const bufferMax = Math.max(dataMax, minLine) * 1.05;
            const magnitude = Math.pow(10, Math.floor(Math.log10(bufferMax)));
            const fraction = bufferMax / magnitude;
            let niceFraction;
            if (fraction <= 1) niceFraction = 1;
            else if (fraction <= 2) niceFraction = 2;
            else if (fraction <= 2.5) niceFraction = 2.5;
            else if (fraction <= 5) niceFraction = 5;
            else niceFraction = 10;
            niceMax = niceFraction * magnitude;
        }
    } else {
        // Fully dynamic scaling
        const effectiveMax = Math.max(dataMax, minLine) * 1.05;
        const magnitude = Math.pow(10, Math.floor(Math.log10(effectiveMax)));
        const fraction = effectiveMax / magnitude;
        let niceFraction;
        if (fraction <= 1) niceFraction = 1;
        else if (fraction <= 2) niceFraction = 2;
        else if (fraction <= 2.5) niceFraction = 2.5;
        else if (fraction <= 5) niceFraction = 5;
        else niceFraction = 10;
        niceMax = niceFraction * magnitude;
    }

    // Generate 5 evenly spaced ticks
    const step = niceMax / 4;
    const ticks = [
        niceMax,
        niceMax - step,
        niceMax - step * 2,
        niceMax - step * 3,
        0,
    ].map((v) => Math.round(v * 10) / 10);

    return { max: niceMax, ticks };
};

// -----------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------

const TrendCard: React.FC<TrendCardProps> = ({
    title,
    icon: Icon,
    iconImage,
    avgValue,
    trend,
    trendType,
    yLable,
    chartColor = "blue",
    gradientId = 1,
    lastRecorded,
    handleTabChange,
    activeTab,
    minLine = 0,
    unit = "L",
    maxDomain,
}) => {
    const [expanded, setExpanded] = useState<boolean>(false);

    const chartData = useMemo(
        () => {
            // Parse the lastRecorded value (e.g., "224 kL" -> 224)
            const lastValue = parseFloat(lastRecorded) || 0;
            return getChartData(activeTab, trendType, trend, expanded, lastValue);
        },
        [expanded, trend, trendType, activeTab, lastRecorded]
    );

    const yDomain = useMemo(
        () => calculateNiceDomain(chartData, minLine, maxDomain),
        [chartData, minLine, maxDomain]
    );

    const chartWidth = chartData.length * 80;
    const chartHeight = expanded ? 400 : 220;

    const colors = colorSchemes[chartColor] || colorSchemes.blue;
    const gradientIdStr = `trendGradient-${gradientId}`;

    return (
        <div className="h-full p-3 rounded-lg border border-border/40 bg-card shadow-sm hover:shadow-md transition-all duration-300">
            <Modal open={expanded} onClose={() => setExpanded(false)}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "5%",
                        left: "5%",
                        width: "90%",
                        height: "90%",
                        bgcolor: "background.paper",
                        boxShadow: 24,
                        p: 3,
                        borderRadius: 2,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <IconButton
                        onClick={() => setExpanded(false)}
                        sx={{ position: "absolute", top: 8, right: 8, zIndex: 20 }}
                    >
                        <CloseFullscreen />
                    </IconButton>

                    <Typography variant="h6" mb={2} sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Icon className="w-5 h-5" style={{ color: colors.stroke }} />
                        {title} - {activeTab[trendType]} View
                    </Typography>

                    {/* Chart Container */}
                    <div style={{ flex: 1, overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                        {/* Scrollable Chart Area */}
                        <div style={{ width: '100%', height: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                            <div style={{ width: Math.max(chartWidth, 800), height: '100%', minHeight: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 60, bottom: 40 }}>
                                        <defs>
                                            <linearGradient id="modalGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.5} />
                                                <stop offset="100%" stopColor={colors.stroke} stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 10, fill: '#6b7280' }}
                                            axisLine={{ stroke: '#e5e7eb' }}
                                            tickLine={{ stroke: '#e5e7eb' }}
                                            interval="preserveStartEnd"
                                            angle={-30}
                                            textAnchor="end"
                                            height={50}
                                        />
                                        <YAxis
                                            domain={[0, yDomain.max]}
                                            ticks={yDomain.ticks}
                                            tick={{ fontSize: 10, fill: '#6b7280' }}
                                            tickFormatter={(v) => `${v}${unit}`}
                                            width={55}
                                            axisLine={{ stroke: '#e5e7eb' }}
                                            tickLine={{ stroke: '#e5e7eb' }}
                                            label={{
                                                value: yLable || 'Value',
                                                angle: -90,
                                                position: 'insideLeft',
                                                style: { fontSize: 11, fill: '#6b7280', fontWeight: 600 }
                                            }}
                                        />
                                        <Tooltip
                                            formatter={(value) => [`${value} ${unit}`, 'Value']}
                                            labelFormatter={(label) => `Time: ${label}`}
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: 6,
                                                fontSize: 11,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <ReferenceLine
                                            y={minLine}
                                            stroke="#ef4444"
                                            strokeDasharray="4 4"
                                            strokeWidth={1.5}
                                            label={{
                                                value: `Min ${yLable || 'Level'}: ${minLine}${unit}`,
                                                position: "insideTopLeft",
                                                fill: "#ef4444",
                                                fontSize: 11,
                                                fontWeight: 600,
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={colors.stroke}
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#modalGradient)"
                                            dot={{ r: 3, fill: "white", stroke: colors.stroke, strokeWidth: 2 }}
                                            activeDot={{ r: 5, fill: colors.stroke }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Footer with info */}
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#6b7280' }}>
                        <span>Showing {chartData.length} data points</span>
                        <span>Scroll horizontally to see more data →</span>
                    </div>
                </Box>
            </Modal>

            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: colors.bg }}
                    >
                        <Icon className="w-3.5 h-3.5" style={{ color: colors.stroke }} />
                    </div>
                    <p className="text-xs font-bold text-foreground">{title}</p>
                </div>
                <button
                    onClick={() => setExpanded(true)}
                    className="p-1 rounded hover:bg-muted/50 transition-colors">
                    <ExpandIcon className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </button>
            </div>

            {/* Average Value Summary */}
            <div className="mb-2">
                <p className="text-[10px] text-muted-foreground">
                    Avg {activeTab[trendType] === "Day" ? "today" : activeTab[trendType] === "Week" ? "this week" : "this month"}
                </p>
                <p className="text-sm font-bold text-foreground">{avgValue}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-2">
                {(["Day", "Week", "Last 30 Days"] as TimeframeTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(trendType, tab)}
                        className={`px-2 py-0.5 text-[9px] font-semibold rounded transition-all ${activeTab[trendType] === tab
                            ? "bg-gradient-to-r from-primary to-orange-600 text-white"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Chart Wrapper */}
            <div style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                        <defs>
                            <linearGradient id={gradientIdStr} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={colors.fill} stopOpacity={0.4} />
                                <stop offset="100%" stopColor={colors.fill} stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fill: '#6b7280' }}
                            tickMargin={8}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={{ stroke: '#e5e7eb' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={[0, yDomain.max]}
                            ticks={yDomain.ticks}
                            tick={{ fontSize: 9, fill: '#6b7280' }}
                            tickFormatter={(v) => `${v}${unit}`}
                            width={40}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={{ stroke: '#e5e7eb' }}
                        />
                        <Tooltip
                            formatter={(value) => `${value} ${unit}`}
                            labelFormatter={(label) => `${label}`}
                            contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.95)",
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                fontSize: "10px",
                                padding: "4px 8px",
                            }}
                        />
                        <ReferenceLine
                            y={minLine}
                            stroke="#ef4444"
                            strokeDasharray="4 4"
                            strokeWidth={1}
                            label={{
                                value: `Min ${yLable || 'Level'}`,
                                position: "insideTopRight",
                                fill: "#ef4444",
                                fontSize: 8,
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={colors.stroke}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#${gradientIdStr})`}
                            dot={false}
                            activeDot={{ r: 4, fill: colors.stroke }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Footer */}
            <div className="mt-2 pt-2 border-t border-border/20 text-[9px] text-muted-foreground">
                Last recorded: <span className="font-semibold text-foreground">{lastRecorded}</span>
            </div>
        </div>
    );
};

export default TrendCard;