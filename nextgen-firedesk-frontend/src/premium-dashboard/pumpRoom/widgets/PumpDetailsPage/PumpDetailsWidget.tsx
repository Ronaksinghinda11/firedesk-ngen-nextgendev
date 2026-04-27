import { Clock, Wrench, User, MessageSquare } from "lucide-react";
import Card3D from "@/premium-dashboard/components/Card3D";
import { useKnowMore } from "../../contexts/KnowMoreContext";

interface PumpDetailsWidgetProps {
    widgetControls?: React.ReactNode;
}

const PumpDetailsWidget: React.FC<PumpDetailsWidgetProps> = ({ widgetControls }) => {
    const { data, isLoading } = useKnowMore();

    if (isLoading) {
        return (
            <Card3D>
                <div className="p-4 h-48 flex items-center justify-center">
                    <div className="text-muted-foreground text-sm">Loading pump details...</div>
                </div>
            </Card3D>
        );
    }

    return (
        <Card3D className="h-full p-3 shadow-lg border-t-2 border-t-primary border-x border-b border-border/40 overflow-auto">
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border/20">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                            <Wrench className="w-4 h-4 text-primary" strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Pump Details</h3>
                            <p className="text-[10px] text-muted-foreground">Usage and maintenance information</p>
                        </div>
                    </div>
                    {widgetControls}
                </div>

                {/* Usage Summary */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Clock className="w-3.5 h-3.5 text-sky-600" />
                            <span className="text-[10px] font-semibold text-sky-600 uppercase">Age</span>
                        </div>
                        <p className="text-base font-bold text-foreground">{data?.ageString || "N/A"}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Clock className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-[10px] font-semibold text-green-600 uppercase">Run Hours</span>
                        </div>
                        <p className="text-base font-bold text-foreground">{data?.totalOnHours || 0} hrs</p>
                    </div>
                </div>

                {/* Last Service Activity */}
                {data?.lastServiceActivity && (
                    <div className="border-t border-border/20 pt-3">
                        <h4 className="text-xs font-bold text-foreground mb-2">Last Service Activity</h4>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                <div className="flex-1 flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-muted-foreground">Date</span>
                                    <span className="text-xs font-bold text-foreground">
                                        {data.lastServiceActivity?.date
                                            ? new Date(data.lastServiceActivity.date).toLocaleDateString()
                                            : "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                                <User className="w-3.5 h-3.5 text-primary" />
                                <div className="flex-1 flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-muted-foreground">Technician</span>
                                    <span className="text-xs font-bold text-foreground">
                                        {data.lastServiceActivity?.serviceDoneBy?.name || "N/A"}
                                    </span>
                                </div>
                            </div>

                            {data.lastServiceActivity?.submittedFormId?.technicianRemark && (
                                <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                                    <MessageSquare className="w-3.5 h-3.5 text-primary mt-0.5" />
                                    <div className="flex-1">
                                        <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Remark</span>
                                        <span className="text-xs text-foreground">
                                            {data.lastServiceActivity.submittedFormId.technicianRemark}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Card3D>
    );
};

export default PumpDetailsWidget;
