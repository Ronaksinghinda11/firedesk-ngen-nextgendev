/**
 * ServiceDetailsDialog — Service Detail Popup
 *
 * Shows comprehensive service submission details in a modal dialog.
 * Displays asset info, service details, technician info, scheduling,
 * and health status — all in a clean, compact layout.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Calendar,
    Clock,
    MapPin,
    User,
    Layers,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Ban,
    ThumbsDown,
    Building,
    Package,
    Hash,
    Activity,
    ExternalLink,
} from 'lucide-react';
import type { ServiceTabItem } from './ServiceTabs';

interface ServiceDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    service: ServiceTabItem | null;
    /** The raw API service object for extra fields */
    rawService?: any;
    role: 'admin' | 'manager';
    onNavigateToForm?: (serviceId: string) => void;
}

const STATUS_MAP: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    due: { color: '#ea580c', bg: '#fff7ed', icon: Clock, label: 'Due' },
    assigned: { color: '#ea580c', bg: '#fff7ed', icon: Clock, label: 'Assigned' },
    submitted: { color: '#2563eb', bg: '#eff6ff', icon: FileText, label: 'Submitted' },
    approved: { color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2, label: 'Approved' },
    completed: { color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2, label: 'Completed' },
    lapsed: { color: '#dc2626', bg: '#fef2f2', icon: AlertTriangle, label: 'Lapsed' },
    overdue: { color: '#dc2626', bg: '#fef2f2', icon: AlertTriangle, label: 'Overdue' },
    cancelled: { color: '#64748b', bg: '#f8fafc', icon: Ban, label: 'Cancelled' },
    rejected: { color: '#9333ea', bg: '#faf5ff', icon: ThumbsDown, label: 'Rejected' },
};

function getStatusConfig(status: string) {
    const key = status?.toLowerCase() || 'due';
    for (const [k, v] of Object.entries(STATUS_MAP)) {
        if (key.includes(k)) return v;
    }
    return STATUS_MAP.due;
}

export function ServiceDetailsDialog({
    open,
    onOpenChange,
    service,
    rawService,
    role,
    onNavigateToForm,
}: ServiceDetailsDialogProps) {
    if (!service) return null;

    const statusCfg = getStatusConfig(service.status);
    const StatusIcon = statusCfg.icon;

    // Priority/health info from raw service
    const criticalCount = rawService?.criticalCount || 0;
    const highCount = rawService?.highCount || 0;
    const mediumCount = rawService?.mediumCount || 0;
    const lowCount = rawService?.lowCount || 0;
    const healthStatus = rawService?.calculatedHealthStatus || null;
    const technician = rawService?.technician || rawService?.submitter || null;
    const assignedTechnicians = rawService?.assignedTechnicians || [];
    const approvalRemarks = rawService?.approvalRemarks || '';
    const cancelledReason = rawService?.cancelledReason || '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-orange-500" />
                        Service Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-1">
                    {/* Status Banner */}
                    <div
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.color}20` }}
                    >
                        <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" style={{ color: statusCfg.color }} />
                            <span className="text-sm font-medium" style={{ color: statusCfg.color }}>
                                {statusCfg.label}
                            </span>
                        </div>
                        {service.submissionNumber && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                                #{service.submissionNumber}
                            </Badge>
                        )}
                    </div>

                    {/* Service Info */}
                    <Section title="Service Information">
                        <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Service" value={service.serviceName} />
                        <InfoRow icon={<Layers className="h-3.5 w-3.5" />} label="Type" value={service.serviceType} />
                        <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Frequency" value={service.frequency} />
                        {service.category && (
                            <InfoRow icon={<Package className="h-3.5 w-3.5" />} label="Category" value={service.category} />
                        )}
                        {service.product && (
                            <InfoRow icon={<Package className="h-3.5 w-3.5" />} label="Product" value={service.product} />
                        )}
                    </Section>

                    {/* Asset Info */}
                    <Section title="Asset">
                        <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="Asset Code" value={service.assetCode} />
                        {service.assetName && service.assetName !== service.assetCode && (
                            <InfoRow icon={<Layers className="h-3.5 w-3.5" />} label="Name" value={service.assetName} />
                        )}
                        {rawService?.asset?.location && (
                            <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={rawService.asset.location} />
                        )}
                        {rawService?.asset?.building?.buildingName && (
                            <InfoRow icon={<Building className="h-3.5 w-3.5" />} label="Building" value={rawService.asset.building.buildingName} />
                        )}
                    </Section>

                    {/* Schedule Info */}
                    <Section title="Schedule">
                        <InfoRow
                            icon={<Calendar className="h-3.5 w-3.5" />}
                            label="Scheduled"
                            value={service.scheduledDate ? new Date(service.scheduledDate).toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                            }) : '—'}
                        />
                        {service.completedAt && (
                            <InfoRow
                                icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                                label="Completed"
                                value={new Date(service.completedAt).toLocaleDateString('en-US', {
                                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                                })}
                            />
                        )}
                        {service.plant && (
                            <InfoRow icon={<Building className="h-3.5 w-3.5" />} label="Plant" value={service.plant} />
                        )}
                    </Section>

                    {/* Technician Info */}
                    {(technician || assignedTechnicians.length > 0) && (
                        <Section title="Technician">
                            {technician && (
                                <InfoRow
                                    icon={<User className="h-3.5 w-3.5" />}
                                    label={service.status?.toLowerCase().includes('submit') ? 'Submitted By' : 'Technician'}
                                    value={technician.user?.name || technician.name || technician.technicianCode || '—'}
                                />
                            )}
                            {assignedTechnicians.map((t: any, i: number) => (
                                <InfoRow
                                    key={t.id || i}
                                    icon={<User className="h-3.5 w-3.5" />}
                                    label={`Assigned ${assignedTechnicians.length > 1 ? `#${i + 1}` : ''}`}
                                    value={`${t.name || '—'} (${t.status})`}
                                />
                            ))}
                        </Section>
                    )}

                    {/* Health / Priority */}
                    {(criticalCount > 0 || highCount > 0 || mediumCount > 0 || lowCount > 0) && (
                        <Section title="Health Status">
                            <div className="flex items-center gap-3 flex-wrap">
                                {healthStatus && (
                                    <Badge
                                        className="text-xs"
                                        variant={healthStatus === 'Good' ? 'default' : 'destructive'}
                                    >
                                        <Activity className="h-3 w-3 mr-1" />
                                        {healthStatus}
                                    </Badge>
                                )}
                                <div className="flex items-center gap-2 text-[11px]">
                                    {criticalCount > 0 && <PriorityDot color="#dc2626" label="Critical" count={criticalCount} />}
                                    {highCount > 0 && <PriorityDot color="#f97316" label="High" count={highCount} />}
                                    {mediumCount > 0 && <PriorityDot color="#eab308" label="Medium" count={mediumCount} />}
                                    {lowCount > 0 && <PriorityDot color="#22c55e" label="Low" count={lowCount} />}
                                </div>
                            </div>
                        </Section>
                    )}

                    {/* Remarks */}
                    {(approvalRemarks || cancelledReason) && (
                        <Section title="Remarks">
                            {approvalRemarks && (
                                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{approvalRemarks}</p>
                            )}
                            {cancelledReason && (
                                <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{cancelledReason}</p>
                            )}
                        </Section>
                    )}

                    {/* Action */}
                    {onNavigateToForm && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs gap-1"
                            onClick={() => onNavigateToForm(service.id)}
                        >
                            <ExternalLink className="h-3 w-3" />
                            Open Service Form
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Helpers ───

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{title}</h3>
            <div className="space-y-1.5">{children}</div>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">{icon}</span>
            <span className="text-gray-500 min-w-[80px]">{label}</span>
            <span className="text-gray-800 font-medium">{value}</span>
        </div>
    );
}

function PriorityDot({ color, label, count }: { color: string; label: string; count: number }) {
    return (
        <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-gray-500">{label}: {count}</span>
        </div>
    );
}
