import { ArrowDownToLine } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatDate } from "../../helpers/formatDate";


// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

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

interface MaintenanceSummaryProps {
    lastFiveServiceActivity?: ServiceActivity[];
    serviceTypeCount?: ServiceTypeCount[];
    completedStatusCount?: CompletedStatusCount[];
    PENDINGByRange?: PendingByRange[];
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

interface TooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        payload: PieDataItem;
    }>;
}

// -----------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------

const RenderTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const { name, value } = payload[0];
        return (
            <div className="bg-white p-2 rounded-md shadow-md border">
                <p>
                    <strong>{name}</strong>
                    {` ${value}`}
                </p>
            </div>
        );
    }
    return null;
};

// -----------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------

const MaintenanceSummary: React.FC<MaintenanceSummaryProps> = ({
    lastFiveServiceActivity = [],
    serviceTypeCount = [],
    completedStatusCount = [],
    PENDINGByRange = [],
}) => {
    const pieData: PieDataItem[] = [
        {
            name: "Inspection",
            value: serviceTypeCount.find((s) => s._id === "Inspection")?.count || 0,
            color: "#10B981",
        },
        {
            name: "Testing",
            value: serviceTypeCount.find((s) => s._id === "Testing")?.count || 0,
            color: "#F59E0B",
        },
        {
            name: "Maintenance",
            value: serviceTypeCount.find((s) => s._id === "Maintenance")?.count || 0,
            color: "#3B82F6",
        },
    ];

    const overdueData: OverdueDataItem[] = [
        {
            period: "1 - 3 Days",
            count: PENDINGByRange.find((p) => p._id === "Next 3 Days")?.count || 0,
        },
        {
            period: "4 - 7 Days",
            count: PENDINGByRange.find((p) => p._id === "Next 4–7 Days")?.count || 0,
        },
        {
            period: " > 7 Days",
            count: PENDINGByRange.find((p) => p._id === "More Than 7 Days")?.count || 0,
        },
    ];

    const totalTasks = serviceTypeCount.reduce((sum, item) => sum + item.count, 0);
    const totalStatusTasks = completedStatusCount.reduce((sum, item) => sum + item.count, 0);
    const totalOverdueTasks = PENDINGByRange.reduce((sum, item) => sum + item.count, 0);

    return (
        <section className="mt-3 font-[Figtree] w-full p-3 overflow-x-hidden bg-white border rounded-xl">
            {/* Top Container */}
            <div>
                <p className="font-medium text-2xl">Maintenance Summary</p>
            </div>

            {/* Bottom Container */}
            <div className="grid grid-cols-1 grid-rows-5 lg:grid-cols-2 lg:grid-rows-4 gap-4 mt-3">
                {/* Total Maintenance Tasks */}
                <div className="bg-[#F9F9F9] row-span-2 col-span-1 p-2 rounded-2xl shadow-sm lg:row-span-2">
                    <p className="text-lg font-medium">Total Maintenance Tasks</p>
                    <p className="text-xs">(This Month)</p>

                    <div className="flex flex-col md:flex-row xl:flex-col xl:row-span-2 items-center justify-center space-x-5">
                        <div className="relative flex items-center justify-center mt-8">
                            <div className="h-64 w-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={75}
                                            outerRadius={110}
                                            paddingAngle={1}
                                            dataKey="value"
                                            cornerRadius={8}
                                        >
                                            {pieData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={pieData[index].color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<RenderTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="absolute text-center">
                                <p className="text-sm text-[#727272]">Total Task</p>
                                <p className="text-4xl font-semibold">{totalTasks}</p>
                            </div>
                        </div>

                        <div className="flex flex-col flex-wrap justify-center gap-3">
                            {pieData.map((item, index) => (
                                <div key={index} className="flex items-center space-x-1 basis-[40%]">
                                    <div
                                        className="w-5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: item.color }}
                                    ></div>
                                    <span className="text-base text-[#727272]">
                                        {item.name} <span className="text-black">({item.value})</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Task Status Overview */}
                <div className="bg-[#F9F9F9] p-2 rounded-2xl col-start-1 row-start-3 shadow-sm lg:row-span-1 lg:col-start-2 lg:row-start-1">
                    <p className="text-lg font-medium mb-2">Task Status Overview</p>

                    <div className="flex items-center space-x-1 mb-3">
                        <span className="text-2xl md:text-3xl font-semibold">{totalStatusTasks}</span>
                        <span className="text-sm text-[#737373] font-medium mt-3">Total Task</span>
                    </div>

                    <div className="w-full h-2 mb-4 flex gap-0.5 rounded-full overflow-hidden">
                        <div className="bg-[#10B981] h-full rounded-full" style={{ width: "44%" }}></div>
                        <div className="bg-yellow-500 h-full rounded-full" style={{ width: "36%" }}></div>
                        <div className="bg-gray-400 h-full rounded-full" style={{ width: "20%" }}></div>
                    </div>

                    <div className="flex flex-wrap items-center justify-start gap-x-2 gap-y-3 text-[11px] lg:text-xs">
                        <div className="flex items-center space-x-2 whitespace-nowrap">
                            <div className="w-2.5 h-2.5 bg-[#10B981] rounded-full flex-shrink-0"></div>
                            <span>Completed (22)</span>
                        </div>
                        <div className="flex items-center space-x-2 whitespace-nowrap">
                            <div className="w-2.5 h-2.5 bg-[#F59E0B] rounded-full flex-shrink-0"></div>
                            <span>In Progress (18)</span>
                        </div>
                        <div className="flex items-center space-x-2 whitespace-nowrap">
                            <div className="w-2.5 h-2.5 bg-[#9CA3AF] rounded-full flex-shrink-0"></div>
                            <span>Pending (10)</span>
                        </div>
                    </div>
                </div>

                {/* Overdue Maintenance Tasks */}
                <div className="bg-[#F9F9F9] p-2 rounded-2xl shadow-sm row-start-4 lg:col-start-2 lg:row-start-2">
                    <p className="text-base xl:text-lg font-medium mb-1">Overdue Maintenance Tasks</p>

                    <div className="flex items-center space-x-2 mb-4">
                        <span className="text-2xl sm:text-3xl font-bold text-[#B91C1C]">
                            {totalOverdueTasks}
                        </span>
                        <span className="text-sm sm:text-base text-[#B91C1C]">Tasks Overdue</span>
                    </div>

                    <div className="space-y-3">
                        {overdueData.map((item, index) => (
                            <div key={index} className="flex items-center justify-between gap-2">
                                <span className="text-xs sm:text-sm text-[#727272] flex-shrink-0 w-16">
                                    {item.period}
                                </span>
                                <div className="flex items-center space-x-2 flex-1">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${index === 0
                                                ? "bg-[#FBBF24]"
                                                : index === 1
                                                    ? "bg-[#FB923C]"
                                                    : "bg-[#F87171]"
                                                }`}
                                            style={{ width: `${(item.count / 7) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold w-4 text-right">
                                        {item.count}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Maintenance Activity Table */}
                <div className="bg-[#F9F9F9] rounded-2xl shadow-sm row-start-5 row-span-2 col-span-2 lg:row-start-3">
                    <div className="p-3 sm:p-4 rounded-t-lg">
                        <p className="text-base xl:text-lg font-medium mb-1 lg:mb-4">
                            Recent Maintenance Activity Table
                        </p>
                    </div>

                    <div className="overflow-x-auto max-w-full">
                        <table className="w-full min-w-[400px] sm:min-w-[600px] text-xs sm:text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left p-2 sm:p-4 font-medium text-[#737373] text-xs sm:text-sm">
                                        Asset
                                    </th>
                                    <th className="text-left p-2 sm:p-4 font-medium text-[#737373] text-xs sm:text-sm">
                                        Technician
                                    </th>
                                    <th className="text-left p-2 sm:p-4 font-medium text-[#737373] text-xs sm:text-sm">
                                        Date
                                    </th>
                                    <th className="text-left p-2 sm:p-4 font-medium text-[#737373] text-xs sm:text-sm">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lastFiveServiceActivity.map((activity, index) => (
                                    <tr key={index} className="border-b-1">
                                        <td className="p-2 text-xs xl:text-md">
                                            {activity.assetsId.map((a) => a.assetId).join(", ")}
                                        </td>
                                        <td className="p-1 text-xs xl:text-md">{activity.serviceDoneBy.name}</td>
                                        <td className="p-1 text-xs xl:text-md">{formatDate(activity.date)}</td>
                                        <td className="p-1 text-xs xl:text-md">{activity.completedStatus}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row items-center justify-end gap-3 mt-3 text-[#FF6B2C]">
                <button className="border-1 border-[#FF6B2C] p-2 px-5 rounded-2 hover:scale-105 hover:duration-300 hover:transition">
                    Run Report
                </button>
                <button className="bg-[#FF6B2C] p-2 px-4 rounded-2 text-white hover:scale-110 hover:duration-300 hover:transition">
                    <ArrowDownToLine className="inline w-5 h-5 text-white" strokeWidth={1.5} />
                    Download Report
                </button>
            </div>
        </section>
    );
};

export default MaintenanceSummary;