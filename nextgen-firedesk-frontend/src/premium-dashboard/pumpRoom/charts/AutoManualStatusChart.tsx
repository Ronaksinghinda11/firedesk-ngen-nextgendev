// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

interface DataPoint {
    label: string;
    status: string;
    [key: string]: any;
}

interface AutoManualStatusChartProps {
    data?: DataPoint[];
    durationData?: any[];
    loading?: boolean;
    iotNumber: number;
}

// -----------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------

const AutoManualStatusChart: React.FC<AutoManualStatusChartProps> = ({
    data = [],
    loading = false,
    iotNumber,
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl text-muted-foreground">
                No data available
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-white rounded-xl p-4">
            {/* Timeline Chart container */}
            <div className="relative h-full flex flex-col justify-center">
                <div className="flex">
                    {/* Y-axis labels */}
                    <div className="flex flex-col justify-center mr-4 space-y-10">
                        <div className="text-xs text-muted-foreground font-medium">Auto</div>
                        <div className="text-xs text-muted-foreground font-medium">Manual</div>
                    </div>

                    {/* Chart area */}
                    <div className="flex-1">
                        {/* Auto row */}
                        <div className="flex h-12 items-center gap-2 mb-4">
                            {data.map((item, index) => {
                                const isAuto = item.status === "Auto";

                                return (
                                    <div key={`auto-${index}`} className="flex-1">
                                        {isAuto && (
                                            <div
                                                className="h-6 rounded-full transition-all duration-200 hover:opacity-80"
                                                style={{
                                                    backgroundColor: "#10b981",
                                                    minWidth: "40px",
                                                }}
                                                title={`Auto at ${item.label}`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Manual row */}
                        <div className="flex h-12 items-center gap-2 mb-4">
                            {data.map((item, index) => {
                                const isManual = item.status === "Manual";

                                return (
                                    <div key={`manual-${index}`} className="flex-1">
                                        {isManual && (
                                            <div
                                                className="h-6 rounded-full transition-all duration-200 hover:opacity-80"
                                                style={{
                                                    backgroundColor: "#3b82f6",
                                                    minWidth: "40px",
                                                }}
                                                title={`Manual at ${item.label}`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* X-axis labels */}
                        <div className="flex mt-1 border-t border-border/30 pt-2">
                            {data.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex-1 text-center text-[11px] text-muted-foreground"
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutoManualStatusChart;