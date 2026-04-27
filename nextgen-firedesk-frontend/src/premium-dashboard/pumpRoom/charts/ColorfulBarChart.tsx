import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps, LabelList } from 'recharts';

// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

interface MultiSeriesConfig {
    key: string;
    color: string;
    name: string;
}

interface ColorfulBarChartProps {
    data: any[];
    iotNumber: number;
    loading?: boolean;
    yAxisLabel?: string;
    xAxisData?: string;
    yAxisData?: string;
    multiSeries?: MultiSeriesConfig[] | null;
    categoricalYAxis?: boolean;
    disableHover?: boolean;
}

interface ColorConfig {
    color: string;
    shadow: string;
}

interface ChartDataPoint {
    name: string;
    value: number;
    status?: string;
    tripStatus?: string;
    [key: string]: any;
}

interface StackDataPoint {
    name: string;
    tripped: number;
    status: number;
    originalStatus: string;
}

// -----------------------------------------------------
// COMPONENT
// -----------------------------------------------------

const ColorfulBarChart: React.FC<ColorfulBarChartProps> = ({
    data = [],
    iotNumber,
    loading = false,
    yAxisLabel = "",
    xAxisData = "runtime",
    yAxisData = "label",
    multiSeries = null,
    categoricalYAxis = false,
    disableHover = false
}) => {
    const getColorConfig = (): ColorConfig => {
        return {
            color: "#3b82f6",
            shadow: "shadow-blue-200"
        };
    };

    const colorConfig = getColorConfig();
    const safeData = Array.isArray(data) ? data : [];

    // Transform data for recharts
    const chartData: ChartDataPoint[] = safeData.map(item => ({
        name: item[yAxisData],
        value: item[xAxisData] || 0,
        status: item.status,
        tripStatus: item.tripStatus,
        ...item
    }));

    const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 p-3 border border-border rounded-lg shadow-lg backdrop-blur-sm">
                    <p className="text-sm font-semibold text-foreground">{`${payload[0].value?.toFixed(1)}${yAxisLabel}`}</p>
                </div>
            );
        }
        return null;
    };

    if (categoricalYAxis) {
        // Use stacked bar chart for categorical data
        const stackData: StackDataPoint[] = safeData.map(item => {
            const isTripped = item.tripStatus === "TRIPPED";
            const statusValue = item.status === "ON" ? 1 : 0.5;

            return {
                name: item[yAxisData],
                tripped: isTripped ? 0.1 : 0,
                status: statusValue - 0.1,
                originalStatus: item.status
            };
        });

        return (
            <div className="relative bg-white rounded-xl h-64 p-4">
                {loading && (
                    <div className="absolute inset-0 bg-white/75 flex items-center justify-center rounded-xl z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis
                            domain={[0, 1.2]}
                            ticks={[0.1, 0.5, 1]}
                            tickFormatter={(value: number) => value >= 1 ? 'ON' : value >= 0.5 ? 'OFF' : 'TRIPPED'}
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            width={50}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="tripped" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]}>
                            <LabelList dataKey="tripStatus" position="top" offset={10} style={{ fill: '#ef4444', fontSize: '9px', fontWeight: 'bold' }} />
                        </Bar>
                        <Bar dataKey="status" stackId="a" radius={[4, 4, 0, 0]}>
                            {stackData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.originalStatus === "ON" ? "#10b981" : "#f97316"} />
                            ))}
                            <LabelList dataKey="originalStatus" position="top" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '9px', fontWeight: 'bold' }} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return (
        <div className="relative bg-white rounded-xl h-64 p-4">
            {loading && (
                <div className="absolute inset-0 bg-white/75 flex items-center justify-center rounded-xl z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        width={45}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                        dataKey="value"
                        fill="url(#barGradient)"
                        radius={[4, 4, 0, 0]}
                    >
                        <LabelList dataKey="value" position="top" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ColorfulBarChart;