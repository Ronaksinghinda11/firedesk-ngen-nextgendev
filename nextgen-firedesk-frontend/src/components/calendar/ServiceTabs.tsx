/**
 * ServiceTabs — Improved service status tabs
 *
 * Displays tabs for Due, Completed, Lapsed, Cancelled, Rejected services
 * with improved card-style entries, clean badges, and pagination.
 * Admin view is read-only; Manager view includes action buttons.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ChevronLeft,
    ChevronRight,
    Eye,
    UserPlus,
    CheckCircle,
    XCircle,
    FileText,
    Clock,
    AlertTriangle,
    Ban,
    ThumbsDown,
    Loader2,
} from 'lucide-react';

export interface ServiceTabItem {
    id: string;
    submissionNumber: string;
    assetCode: string;
    assetName?: string;
    serviceName: string;
    serviceType: string;
    frequency: string;
    category: string;
    product?: string;
    plant: string;
    scheduledDate: string;
    status: string;
    completedAt?: string;
    submittedBy?: string;
    technicians?: string[];
}

export interface TabData {
    items: ServiceTabItem[];
    total: number;
    page: number;
    limit: number;
    loading: boolean;
}

interface ServiceTabsProps {
    role: 'admin' | 'manager';
    due: TabData;
    completed: TabData;
    lapsed: TabData;
    cancelled: TabData;
    rejected: TabData;
    pendingApproval?: TabData;
    onPageChange: (tab: string, page: number) => void;
    /** Manager-only callbacks */
    onViewDetails?: (item: ServiceTabItem) => void;
    onAssignTechnician?: (item: ServiceTabItem) => void;
    onApprove?: (item: ServiceTabItem) => void;
    onReject?: (item: ServiceTabItem) => void;
    /** Service status counts */
    stats?: { due: number; completed: number; lapsed: number; cancelled: number; rejected: number; pendingApproval?: number };
}

interface TabConfig {
    key: string;
    label: string;
    icon: any;
    color: string;
    bg: string;
    data: TabData;
}

export function ServiceTabs({
    role,
    due,
    completed,
    lapsed,
    cancelled,
    rejected,
    pendingApproval,
    onPageChange,
    onViewDetails,
    onAssignTechnician,
    onApprove,
    onReject,
    stats,
}: ServiceTabsProps) {
    const [activeTab, setActiveTab] = useState('due');

    const tabs: TabConfig[] = [
        { key: 'due', label: 'Due', icon: Clock, color: '#ea580c', bg: '#fff7ed', data: due },
        { key: 'completed', label: 'Completed', icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4', data: completed },
        { key: 'lapsed', label: 'Lapsed', icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', data: lapsed },
        { key: 'cancelled', label: 'Cancelled', icon: Ban, color: '#64748b', bg: '#f8fafc', data: cancelled },
        { key: 'rejected', label: 'Rejected', icon: ThumbsDown, color: '#9333ea', bg: '#faf5ff', data: rejected },
    ];

    // Add pending approval tab for manager
    if (role === 'manager' && pendingApproval) {
        tabs.splice(1, 0, {
            key: 'pendingApproval',
            label: 'Pending Approval',
            icon: FileText,
            color: '#2563eb',
            bg: '#eff6ff',
            data: pendingApproval,
        });
    }

    const currentTab = tabs.find((t) => t.key === activeTab) || tabs[0];

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Tab Headers */}
                <div className="border-b border-gray-100 bg-gray-50/30 px-2 pt-2">
                    <TabsList className="h-auto p-0 bg-transparent gap-1 flex-wrap justify-start">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const count = stats?.[tab.key as keyof typeof stats] ?? tab.data.total;
                            return (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className={`text-xs px-3 py-1.5 rounded-t-md rounded-b-none data-[state=active]:shadow-none border border-transparent border-b-0 gap-1.5 
                    data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:text-gray-900
                    data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:bg-gray-100
                  `}
                                >
                                    <Icon className="h-3 w-3" style={{ color: activeTab === tab.key ? tab.color : undefined }} />
                                    {tab.label}
                                    <Badge
                                        variant="secondary"
                                        className="h-4 px-1 text-[9px] ml-0.5"
                                        style={
                                            activeTab === tab.key
                                                ? { background: tab.bg, color: tab.color, border: `1px solid ${tab.color}30` }
                                                : {}
                                        }
                                    >
                                        {typeof count === 'number' ? count : 0}
                                    </Badge>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </div>

                {/* Tab Content */}
                {tabs.map((tab) => (
                    <TabsContent key={tab.key} value={tab.key} className="mt-0">
                        <ServiceTable
                            tab={tab}
                            role={role}
                            onViewDetails={onViewDetails}
                            onAssignTechnician={onAssignTechnician}
                            onApprove={onApprove}
                            onReject={onReject}
                            onPageChange={(page) => onPageChange(tab.key, page)}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}

// ────────────────────────────── Service Table ──────────────────────────────

function ServiceTable({
    tab,
    role,
    onViewDetails,
    onAssignTechnician,
    onApprove,
    onReject,
    onPageChange,
}: {
    tab: TabConfig;
    role: 'admin' | 'manager';
    onViewDetails?: (item: ServiceTabItem) => void;
    onAssignTechnician?: (item: ServiceTabItem) => void;
    onApprove?: (item: ServiceTabItem) => void;
    onReject?: (item: ServiceTabItem) => void;
    onPageChange: (page: number) => void;
}) {
    const { data } = tab;
    const totalPages = Math.ceil(data.total / data.limit) || 1;

    if (data.loading) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Loading…</span>
            </div>
        );
    }

    if (data.items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <tab.icon className="h-8 w-8 mb-2" style={{ color: `${tab.color}40` }} />
                <p className="text-sm">No {tab.label.toLowerCase()} services found</p>
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="text-[10px] uppercase w-[100px]">No.</TableHead>
                            <TableHead className="text-[10px] uppercase w-[100px]">Asset</TableHead>
                            <TableHead className="text-[10px] uppercase">Service</TableHead>
                            <TableHead className="text-[10px] uppercase w-[80px]">Type</TableHead>
                            <TableHead className="text-[10px] uppercase w-[80px]">Frequency</TableHead>
                            <TableHead className="text-[10px] uppercase w-[100px]">Scheduled</TableHead>
                            <TableHead className="text-[10px] uppercase w-[80px]">Plant</TableHead>
                            {role === 'manager' && (
                                <TableHead className="text-[10px] uppercase w-[120px] text-right">Actions</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.items.map((item) => (
                            <TableRow key={item.id} className="group hover:bg-orange-50/20">
                                <TableCell className="text-xs text-gray-500 font-mono py-2">{item.submissionNumber || '—'}</TableCell>
                                <TableCell className="py-2">
                                    <span className="text-xs font-medium text-gray-800">{item.assetCode}</span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <div>
                                        <span className="text-xs text-gray-700">{item.serviceName}</span>
                                        {item.category && (
                                            <span className="text-[10px] text-gray-400 ml-1">({item.category})</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-2">
                                    <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
                                        {item.serviceType?.substring(0, 4).toUpperCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-gray-500 py-2">{item.frequency}</TableCell>
                                <TableCell className="text-xs text-gray-500 py-2">
                                    {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                </TableCell>
                                <TableCell className="text-xs text-gray-500 py-2">{item.plant || '—'}</TableCell>
                                {role === 'manager' && (
                                    <TableCell className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {onViewDetails && (
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onViewDetails(item)}>
                                                    <Eye className="h-3 w-3 text-gray-400" />
                                                </Button>
                                            )}
                                            {tab.key === 'due' && onAssignTechnician && (
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onAssignTechnician(item)}>
                                                    <UserPlus className="h-3 w-3 text-blue-500" />
                                                </Button>
                                            )}
                                            {tab.key === 'pendingApproval' && (
                                                <>
                                                    {onApprove && (
                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onApprove(item)}>
                                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                                        </Button>
                                                    )}
                                                    {onReject && (
                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onReject(item)}>
                                                            <XCircle className="h-3 w-3 text-red-500" />
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-50">
                    <span className="text-[10px] text-gray-400">
                        Showing {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            disabled={data.page <= 1}
                            onClick={() => onPageChange(data.page - 1)}
                        >
                            <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-gray-500 px-2">
                            {data.page} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            disabled={data.page >= totalPages}
                            onClick={() => onPageChange(data.page + 1)}
                        >
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
