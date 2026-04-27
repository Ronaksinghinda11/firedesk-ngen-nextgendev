
import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import moment from 'moment';

interface StepLineChartProps {
    data: any[];
    lines: {
        dataKey: string;
        color: string;
        name: string;
    }[];
    height?: number;
    yAxisTickFormatter?: (value: any) => string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
                <p className="font-semibold text-gray-700 mb-2">
                    {moment(label).format('DD MMM YYYY, HH:mm:ss')}
                </p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-gray-600">
                                {entry.name}:{' '}
                                <span className="font-medium text-gray-900">
                                    {entry.value === 1 || entry.value === 'ON' || entry.value === 'TRIPPED' || entry.value === 'Auto'
                                        ? (entry.value === 'Auto' ? 'Auto' : entry.value === 'TRIPPED' ? 'Yes' : 'On/Yes')
                                        : (entry.value === 'Manual' ? 'Manual' : entry.value === 'NOT_TRIPPED' ? 'No' : 'Off/No')}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const StepLineChart: React.FC<StepLineChartProps> = ({
    data,
    lines,
    height = 300,
    yAxisTickFormatter,
}) => {
    // Format data timestamps to numbers for XAxis scaling if needed, 
    // but usually Recharts handles categorical strings or number timestamps well.
    // For time scale, numbers are better.
    const formattedData = data.map(d => ({
        ...d,
        timestampNum: new Date(d.timestamp).getTime(),
    }));

    const formatXAxis = (tickItem: number) => {
        return moment(tickItem).format('DD MMM HH:mm');
    };

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <LineChart
                    data={formattedData}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 20,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="timestampNum"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={formatXAxis}
                        stroke="#9CA3AF"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickMargin={10}
                        minTickGap={50} // Adjust to avoid overcrowding
                    />
                    <YAxis
                        stroke="#9CA3AF"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickFormatter={yAxisTickFormatter}
                        domain={[0, 1.2]} // Add some padding on top
                        ticks={[0, 1]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {lines.map((line, index) => (
                        <Line
                            key={index}
                            type="stepAfter"
                            dataKey={line.dataKey}
                            stroke={line.color}
                            strokeWidth={2}
                            name={line.name}
                            dot={false}
                            activeDot={{ r: 4 }}
                            isAnimationActive={false} // Disable animation for smoother timeline feel or set to true
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StepLineChart;
