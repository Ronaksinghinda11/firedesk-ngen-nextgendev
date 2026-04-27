import React from 'react';
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

interface MultiSeriesConfig {
    key: string;
    color: string;
    name: string;
}

interface ColorfulLineChartProps {
    data: any[];
    iotNumber: number;
    loading?: boolean;
    yAxisLabel?: string;
    xAxisData?: string;
    yAxisData?: string;
    multiSeries?: MultiSeriesConfig[] | null;
    categoricalYAxis?: boolean;
}

interface ChartData {
    series: {
        name: string;
        data: number[];
    }[];
    categories: string[];
}

// -----------------------------------------------------
// COMPONENT
// -----------------------------------------------------

const ColorfulLineChart: React.FC<ColorfulLineChartProps> = ({
    data = [],
    iotNumber,
    loading = false,
    yAxisLabel = "",
    xAxisData = "runtime",
    yAxisData = "label",
    multiSeries = null,
    categoricalYAxis = false
}) => {
    const primaryColor = "#3b82f6";
    const safeData = Array.isArray(data) ? data : [];

    // Prepare chart data
    const prepareChartData = (): ChartData => {
        if (safeData.length === 0) return { series: [], categories: [] };

        const categories = safeData.map(item => item[yAxisData]);

        if (multiSeries) {
            const series = multiSeries.map(seriesConfig => ({
                name: seriesConfig.name,
                data: safeData.map(item => item[seriesConfig.key] || 0)
            }));
            return { series, categories };
        } else if (categoricalYAxis) {
            const series = [{
                name: "Status",
                data: safeData.map(item => {
                    const isTripped = item.tripStatus === "TRIPPED";
                    if (isTripped) return 3;
                    return item.status === "ON" ? 2 : 1;
                })
            }];
            return { series, categories };
        } else {
            const series = [{
                name: "Value",
                data: safeData.map(item => item[xAxisData] || 0)
            }];
            return { series, categories };
        }
    };

    const { series, categories } = prepareChartData();

    // Chart options - matching Trend.tsx styling
    const options: ApexOptions = {
        chart: {
            type: "line",
            height: "100%",
            toolbar: { show: false },
            background: "transparent",
            fontFamily: 'inherit'
        },
        stroke: {
            curve: "smooth",
            width: 2,
            lineCap: "round"
        },
        colors: multiSeries
            ? multiSeries.map(s => s.color)
            : [primaryColor],
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.5,
                opacityTo: 0.1,
                stops: [0, 100]
            }
        },
        dataLabels: {
            enabled: false
        },
        markers: {
            size: 4,
            strokeWidth: 2,
            strokeColors: "#fff",
            colors: multiSeries ? multiSeries.map(s => s.color) : [primaryColor],
            hover: {
                size: 6
            }
        },
        xaxis: {
            categories: categories,
            labels: {
                style: {
                    colors: "#6b7280",
                    fontSize: "11px"
                }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                style: {
                    colors: "#6b7280",
                    fontSize: "11px"
                },
                formatter: (value: number) => {
                    if (categoricalYAxis) {
                        if (value === 1) return "OFF";
                        if (value === 2) return "ON";
                        if (value === 3) return "TRIPPED";
                        return "";
                    }
                    return Math.round(value) + yAxisLabel;
                }
            },
            min: categoricalYAxis ? 0.5 : undefined,
            max: categoricalYAxis ? 3.5 : undefined,
            tickAmount: categoricalYAxis ? 3 : undefined
        },
        grid: {
            strokeDashArray: 3,
            borderColor: "#e5e7eb",
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
            padding: {
                top: 10,
                right: 10,
                bottom: 0,
                left: 0
            }
        },
        tooltip: {
            theme: 'light',
            style: {
                fontSize: '12px'
            },
            custom: ({ series, seriesIndex, dataPointIndex, w }: {
                series: number[][];
                seriesIndex: number;
                dataPointIndex: number;
                w: any;
            }) => {
                const value = series[seriesIndex][dataPointIndex];

                let displayValue: string | number = value;
                if (categoricalYAxis) {
                    if (value === 1) displayValue = "OFF";
                    else if (value === 2) displayValue = "ON";
                    else if (value === 3) displayValue = "TRIPPED";
                }

                return `
                    <div style="background: rgba(255,255,255,0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="font-weight: 600; font-size: 13px; color: ${w.globals.colors[seriesIndex]};">
                            ${displayValue}${!categoricalYAxis ? yAxisLabel : ''}
                        </div>
                    </div>
                `;
            }
        },
        legend: {
            show: !!multiSeries,
            position: "top",
            horizontalAlign: "right",
            fontSize: '12px',
            labels: {
                colors: "#6b7280"
            },
            markers: {
                size: 4
            }
        }
    };

    return (
        <div className="relative w-full h-full bg-white rounded-xl p-4">
            {loading && (
                <div className="absolute inset-0 bg-white/75 flex items-center justify-center rounded-xl z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            )}

            <div className="w-full h-full">
                {safeData && safeData.length > 0 ? (
                    <Chart
                        options={options}
                        series={series}
                        type="area"
                        height="100%"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <span>No data available</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ColorfulLineChart;