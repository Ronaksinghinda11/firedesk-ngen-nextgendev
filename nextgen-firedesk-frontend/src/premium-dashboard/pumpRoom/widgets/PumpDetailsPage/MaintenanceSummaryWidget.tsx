import { Download, FileText } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import Card3D from "@/premium-dashboard/components/Card3D";
import { useKnowMore } from "../../contexts/KnowMoreContext";
import { cn } from "@/lib/utils";

interface ServiceTypeCount {
    _id: string;
    count: number;
}

interface CompletedStatusCount {
    _id: string;
    count: number;
}

interface PendingByRange {
    _id: string;
    count: number;
}

interface Asset {
    assetId: string;
    [key: string]: any;
}

interface ServiceDoneBy {
    name: string;
    [key: string]: any;
}

interface ServiceActivity {
    assetsId: Asset[];
    serviceDoneBy: ServiceDoneBy;
    date: string;
    completedStatus: string;
    [key: string]: any;
}

interface PieDataItem {
    name: string;
    value: number;
    color: string;
}

interface OverdueDataItem {
    period: string;
    count: number;
}

const RenderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const { name, value } = payload[0];
        return (
            <div className="bg-popover text-popover-foreground p-2 rounded-lg shadow-md border border-border">
                <p className="text-xs font-semibold">
                    {name}: <span className="font-bold">{value}</span>
                </p>
            </div>
        );
    }
    return null;
};

const MaintenanceSummaryWidget: React.FC = () => {
    const { data, isLoading } = useKnowMore();

    const lastFiveServiceActivity = data?.lastFiveServiceActivity || [];
    const serviceTypeCount = data?.serviceTypeCount || [];
    const completedStatusCount = data?.completedStatusCount || [];
    const PENDINGByRange = data?.PENDINGByRange || [];

    const pieData: PieDataItem[] = [
        {
            name: "Inspection",
            value: serviceTypeCount.find((s: ServiceTypeCount) => s._id === "Inspection")?.count || 0,
            color: "hsl(142, 76%, 36%)",
        },
        {
            name: "Testing",
            value: serviceTypeCount.find((s: ServiceTypeCount) => s._id === "Testing")?.count || 0,
            color: "hsl(38, 92%, 50%)",
        },
        {
            name: "Maintenance",
            value: serviceTypeCount.find((s: ServiceTypeCount) => s._id === "Maintenance")?.count || 0,
            color: "hsl(217, 91%, 60%)",
        },
    ];

    const overdueData: OverdueDataItem[] = [
        {
            period: "1-3 Days",
            count: PENDINGByRange.find((p: PendingByRange) => p._id === "Next 3 Days")?.count || 0,
        },
        {
            period: "4-7 Days",
            count: PENDINGByRange.find((p: PendingByRange) => p._id === "Next 4–7 Days")?.count || 0,
        },
        {
            period: ">7 Days",
            count: PENDINGByRange.find((p: PendingByRange) => p._id === "More Than 7 Days")?.count || 0,
        },
    ];

    const totalTasks = serviceTypeCount.reduce((sum: number, item: ServiceTypeCount) => sum + item.count, 0);
    const totalStatusTasks = completedStatusCount.reduce((sum: number, item: CompletedStatusCount) => sum + item.count, 0);
    const totalOverdueTasks = PENDINGByRange.reduce((sum: number, item: PendingByRange) => sum + item.count, 0);

    const completedCount = completedStatusCount.find((s: CompletedStatusCount) => s._id === "Completed")?.count || 0;
    const inProgressCount = completedStatusCount.find((s: CompletedStatusCount) => s._id === "In Progress")?.count || 0;
    const PENDINGCount = completedStatusCount.find((s: CompletedStatusCount) => s._id === "Pending")?.count || 0;

    const completedPercent = totalStatusTasks > 0 ? Math.round((completedCount / totalStatusTasks) * 100) : 0;
    const inProgressPercent = totalStatusTasks > 0 ? Math.round((inProgressCount / totalStatusTasks) * 100) : 0;
    const PENDINGPercent = totalStatusTasks > 0 ? Math.round((PENDINGCount / totalStatusTasks) * 100) : 0;

    if (isLoading) {
        return (
            <Card3D>
                <div className="p-6 h-64 flex items-center justify-center">
                    <div className="text-muted-foreground">Loading maintenance summary...</div>
                </div>
            </Card3D>
        );
    }

    return (
        <Card3D className="p-6 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-border/20">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 shadow-sm">
                            <FileText className="w-4 h-4 text-primary" strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Maintenance Summary</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Service activity and task overview</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 text-xs font-bold border-2 border-primary text-primary rounded-lg hover:bg-primary/10 transition-all shadow-sm flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            Run Report
                        </button>
                        <button className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-primary to-orange-600 text-white rounded-lg hover:from-primary/90 hover:to-orange-500 transition-all shadow-md hover:shadow-lg flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5" />
                            Download
                        </button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Total Tasks - Pie Chart */}
                    <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                        <h4 className="text-sm font-semibold text-foreground mb-1">Total Maintenance Tasks</h4>
                        <p className="text-[10px] text-muted-foreground mb-4">(This Month)</p>

                        <div className="flex flex-col items-center">
                            <div className="relative w-56 h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            cornerRadius={6}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<RenderTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <p className="text-xs text-muted-foreground">Total Tasks</p>
                                    <p className="text-3xl font-black text-foreground">{totalTasks}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 mt-4 w-full">
                                {pieData.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        ></div>
                                        <span className="text-xs text-muted-foreground">
                                            {item.name}{" "}
                                            <span className="font-bold text-foreground">({item.value})</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Task Status Overview */}
                    <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                        <h4 className="text-sm font-semibold text-foreground mb-4">Task Status Overview</h4>

                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-3xl font-black text-foreground">{totalStatusTasks}</span>
                            <span className="text-xs text-muted-foreground">Total Tasks</span>
                        </div>

                        <div className="w-full h-2 mb-4 flex gap-0.5 rounded-full overflow-hidden bg-muted">
                            <div
                                className="bg-green-600 h-full"
                                style={{ width: `${completedPercent}%` }}
                            ></div>
                            <div
                                className="bg-amber-500 h-full"
                                style={{ width: `${inProgressPercent}%` }}
                            ></div>
                            <div
                                className="bg-gray-400 h-full"
                                style={{ width: `${PENDINGPercent}%` }}
                            ></div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-green-600 rounded-full"></div>
                                <span className="text-muted-foreground">
                                    Completed <span className="font-bold text-foreground">({completedCount})</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                                <span className="text-muted-foreground">
                                    In Progress <span className="font-bold text-foreground">({inProgressCount})</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                                <span className="text-muted-foreground">
                                    Pending <span className="font-bold text-foreground">({PENDINGCount})</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Overdue Tasks */}
                    <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                        <h4 className="text-sm font-semibold text-foreground mb-1">Overdue Maintenance Tasks</h4>

                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-3xl font-black text-destructive">{totalOverdueTasks}</span>
                            <span className="text-xs text-destructive font-semibold">Tasks Overdue</span>
                        </div>

                        <div className="space-y-3">
                            {overdueData.map((item, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-muted-foreground w-16 flex-shrink-0">
                                        {item.period}
                                    </span>
                                    <div className="flex-1 bg-muted rounded-full h-2">
                                        <div
                                            className={cn(
                                                "h-2 rounded-full transition-all",
                                                index === 0 && "bg-amber-400",
                                                index === 1 && "bg-orange-500",
                                                index === 2 && "bg-destructive"
                                            )}
                                            style={{
                                                width: `${totalOverdueTasks > 0 ? (item.count / totalOverdueTasks) * 100 : 0}%`,
                                            }}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-bold text-foreground w-8 text-right">
                                        {item.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity Table */}
                    <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                        <h4 className="text-sm font-semibold text-foreground mb-4">Recent Maintenance Activity</h4>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border/30">
                                        <th className="text-left py-2 font-semibold text-muted-foreground">Asset</th>
                                        <th className="text-left py-2 font-semibold text-muted-foreground">Technician</th>
                                        <th className="text-left py-2 font-semibold text-muted-foreground">Date</th>
                                        <th className="text-left py-2 font-semibold text-muted-foreground">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lastFiveServiceActivity.slice(0, 5).map((activity: ServiceActivity, index: number) => (
                                        <tr key={index} className="border-b border-border/20">
                                            <td className="py-2 font-medium text-foreground">
                                                {activity?.assetsId?.[0]?.assetId || "N/A"}
                                            </td>
                                            <td className="py-2 text-muted-foreground">
                                                {activity?.serviceDoneBy?.name || "N/A"}
                                            </td>
                                            <td className="py-2 text-muted-foreground">
                                                {activity?.date ? new Date(activity.date).toLocaleDateString() : "N/A"}
                                            </td>
                                            <td className="py-2">
                                                <span
                                                    className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                        activity?.completedStatus === "Completed" &&
                                                        "bg-green-500/10 text-green-700 dark:text-green-400",
                                                        activity?.completedStatus === "In Progress" &&
                                                        "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                                                        activity?.completedStatus === "Pending" &&
                                                        "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                                                    )}
                                                >
                                                    {activity?.completedStatus || "N/A"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {lastFiveServiceActivity.length === 0 && (
                                <div className="text-center py-8 text-xs text-muted-foreground">
                                    No recent activity
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card3D>
    );
};

export default MaintenanceSummaryWidget;
