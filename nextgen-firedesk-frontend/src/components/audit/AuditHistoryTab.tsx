/**
 * Audit History Tab Component - Redesigned for Better Readability
 * 
 * Features:
 * - Clean table-like display of changes
 * - Clear before/after values in columns
 * - Better spacing and typography
 * - Works across all entity pages
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
    UserPlus,
    CheckCircle,
    XCircle,
    Send,
    Archive,
    RefreshCw,
    Clock,
    Filter,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auditApi, type AuditLogEntry } from '@/services/api/auditApi';

// ============== Types ==============

interface AuditHistoryTabProps {
    entityType: string;
    entityId?: string;
    className?: string;
}

// ============== Action Config ==============

const actionConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
    CREATE: { icon: Plus, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Created' },
    UPDATE: { icon: Pencil, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Updated' },
    DELETE: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50', label: 'Deleted' },
    RESTORE: { icon: RotateCcw, color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'Restored' },
    ARCHIVE: { icon: Archive, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Archived' },
    ASSIGN: { icon: UserPlus, color: 'text-indigo-600', bgColor: 'bg-indigo-50', label: 'Assigned' },
    APPROVE: { icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-50', label: 'Approved' },
    REJECT: { icon: XCircle, color: 'text-rose-600', bgColor: 'bg-rose-50', label: 'Rejected' },
    SUBMIT: { icon: Send, color: 'text-cyan-600', bgColor: 'bg-cyan-50', label: 'Submitted' },
    COMPLETE: { icon: CheckCircle, color: 'text-teal-600', bgColor: 'bg-teal-50', label: 'Completed' },
    BULK_UPDATE: { icon: RefreshCw, color: 'text-violet-600', bgColor: 'bg-violet-50', label: 'Bulk Updated' },
    STATUS_CHANGE: { icon: RefreshCw, color: 'text-sky-600', bgColor: 'bg-sky-50', label: 'Status Changed' },
};

const defaultAction = { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-200', label: 'Changed' };

// ============== Helper Functions ==============

function getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatFieldName(field: string): string {
    // Common field name mappings for better readability
    const fieldMappings: Record<string, string> = {
        'plantName': 'Plant Name',
        'plant_name': 'Plant Name',
        'assetName': 'Asset Name',
        'asset_name': 'Asset Name',
        'createdAt': 'Created At',
        'created_at': 'Created At',
        'updatedAt': 'Updated At',
        'updated_at': 'Updated At',
        'plantId': 'Plant',
        'plant_id': 'Plant',
        'userId': 'User',
        'user_id': 'User',
        'roleId': 'Role',
        'role_id': 'Role',
        'categoryId': 'Category',
        'category_id': 'Category',
        'status': 'Status',
        'email': 'Email',
        'phone': 'Phone',
        'address': 'Address',
        'description': 'Description',
        'name': 'Name',
    };

    if (fieldMappings[field]) return fieldMappings[field];

    return field
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}


function formatValue(value: any): string {
    if (value === null || value === undefined || value === '') return '(empty)';
    if (value === 'N/A') return '(not set)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    // Helper: Check if string is a UUID
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str));

    if (Array.isArray(value)) {
        if (value.length === 0) return '(none)';
        // Check if array of objects with names
        if (value.length > 0 && typeof value[0] === 'object') {
            const names = value.map((item: any) => formatValue(item)).filter(v => v !== '(hidden ID)');
            return names.length > 0 ? names.join(', ') : '(items)';
        }
        // Filter out UUIDs from array of strings
        const filtered = value.filter(v => !isUUID(v));
        return filtered.length > 0 ? filtered.join(', ') : (value.length > 0 ? '(IDs)' : '(none)');
    }

    if (typeof value === 'object') {
        // 1. Try common name fields
        if (Object.keys(value).length === 0) return '(empty object)';
        if (value.name) return value.name;
        if (value.plantName) return value.plantName;
        if (value.fullName) return value.fullName;
        if (value.full_name) return value.full_name;
        if (value.firstName) return `${value.firstName} ${value.lastName || ''}`.trim();
        if (value.label) return value.label;
        if (value.title) return value.title;
        if (value.code) return value.code;
        if (value.email) return value.email;
        if (value.username) return value.username;
        if (value.productName) return value.productName;
        if (value.categoryName) return value.categoryName;

        // 2. If no name, filter out technical fields and show the rest
        const technicalFields = ['id', 'uuid', '_id', 'created_at', 'updated_at', 'createdAt', 'updatedAt', 'deletedAt', 'password', 'plantId', 'userId'];
        const meaningfulKeys = Object.keys(value).filter(k =>
            !technicalFields.includes(k) &&
            !k.endsWith('_id') &&
            !k.endsWith('Id') &&
            !k.toLowerCase().includes('uuid') &&
            value[k] !== null &&
            value[k] !== ''
        );

        if (meaningfulKeys.length > 0) {
            // If we have meaningful data, show it nicely
            return meaningfulKeys.map(k => {
                const label = formatFieldName(k);
                const val = typeof value[k] === 'object' ? '...' : String(value[k]);
                // Skip if value is UUID
                if (isUUID(val)) return null;
                return `${label}: ${val}`;
            }).filter(Boolean).join(', ');
        }

        return '(details)';
    }

    const str = String(value);

    // Hide standalone UUIDs
    if (isUUID(str)) return '(ID)';

    // Truncate very long strings but allow slightly more length
    if (str.length > 200) return str.slice(0, 200) + '...';
    return str;
}

// ============== History Entry Component (Vertical Timeline) ==============

function HistoryEntry({ entry, isLast }: { entry: AuditLogEntry; isLast: boolean }) {
    const config = actionConfig[entry.action] || defaultAction;
    const IconComponent = config.icon;

    // Collect all changes to display
    const changes: Array<{ field: string; old: any; new: any }> = [];

    // From changes object
    if (entry.changes && typeof entry.changes === 'object') {
        Object.entries(entry.changes).forEach(([field, change]) => {
            if (change && typeof change === 'object' && 'old' in change && 'new' in change) {
                // Skip if both old and new are UUIDs or empty
                const isFieldUUID = field.toLowerCase().endsWith('id') || field.toLowerCase().includes('uuid');
                if (isFieldUUID) return;

                changes.push({ field, old: change.old, new: change.new });
            }
        });
    }

    // From field_name/old_value/new_value
    if (entry.field_name && !changes.length) {
        changes.push({
            field: entry.field_name,
            old: entry.old_value,
            new: entry.new_value,
        });
    }

    return (
        <div className="relative flex gap-4 pb-6 group">
            {/* Connection Line */}
            {!isLast && (
                <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-gray-100 group-hover:bg-gray-200 transition-colors" />
            )}

            {/* Icon */}
            <div className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-105',
                config.bgColor
            )}>
                <IconComponent className={cn('h-3.5 w-3.5', config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
                {/* Header Line */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                        {config.label}
                    </span>
                    {entry.entity_name && (
                        <span className="text-sm font-medium text-gray-600 truncate max-w-[200px]" title={entry.entity_name}>
                            {entry.entity_name}
                        </span>
                    )}
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500" title={new Date(entry.created_at).toLocaleString()}>
                        {formatDateTime(entry.created_at)}
                    </span>
                </div>

                {/* Subtitle/Description */}
                {entry.action_description && (
                    <p className="text-xs text-gray-500 mb-2">
                        {entry.action_description}
                    </p>
                )}

                {/* User Info */}
                <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[8px] bg-gray-100 text-gray-600">
                            {getInitials(entry.user_name)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-500 font-medium">
                        {entry.user_name}
                    </span>
                </div>

                {/* Changes List */}
                {changes.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                        {changes.map((change, idx) => {
                            const oldVal = formatValue(change.old);
                            const newVal = formatValue(change.new);

                            // Skip if both displayed values are empty/hidden
                            if ((oldVal === '(empty)' || oldVal === '(ID)') &&
                                (newVal === '(empty)' || newVal === '(ID)')) {
                                return null;
                            }

                            return (
                                <div key={idx} className="flex items-start text-xs bg-gray-50/50 rounded p-2 hover:bg-gray-50 transition-colors border border-gray-100">
                                    <span className="font-semibold text-gray-700 min-w-[80px] shrink-0">
                                        {formatFieldName(change.field)}:
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5 ml-2 flex-1">
                                        {change.old !== undefined && change.old !== null && change.old !== '' && (
                                            <>
                                                <span className="text-gray-500 line-through decoration-red-300 break-all">
                                                    {oldVal}
                                                </span>
                                                <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                                            </>
                                        )}
                                        <span className="text-gray-900 font-medium break-all">
                                            {newVal}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============== Main Component ==============

export function AuditHistoryTab({ entityType, entityId, className }: AuditHistoryTabProps) {
    const [history, setHistory] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [actionFilter, setActionFilter] = useState('all');
    const limit = 20;

    const loadHistory = useCallback(async (reset = false) => {
        setLoading(true);
        setError(null);

        console.log('[AuditHistoryTab] Loading history for:', { entityType, entityId, reset });

        try {
            const filters = {
                limit,
                offset: reset ? 0 : offset,
                actions: actionFilter !== 'all' ? [actionFilter] : undefined,
            };

            let response: any;
            if (entityId) {
                console.log('[AuditHistoryTab] Fetching entity history:', entityType, entityId);
                response = await auditApi.getEntityHistory(entityType, entityId, filters);
            } else {
                console.log('[AuditHistoryTab] Fetching module history:', entityType);
                response = await auditApi.getModuleHistory(entityType, filters);
            }

            console.log('[AuditHistoryTab] API Response:', response);

            // Handle API response - rows can be at response.rows or response.data.rows
            const rows = response?.rows || response?.data?.rows || [];
            const hasMoreData = response?.hasMore ?? response?.data?.hasMore ?? false;

            console.log('[AuditHistoryTab] Rows received:', rows.length);

            if (reset) {
                setHistory(rows);
                setOffset(0);
            } else {
                setHistory(prev => [...prev, ...rows]);
            }
            setHasMore(hasMoreData);
        } catch (err: any) {
            console.error('[AuditHistoryTab] Failed to load audit history:', err);
            setError(err.message || 'Failed to load history');
        } finally {
            setLoading(false);
        }
    }, [entityType, entityId, offset, actionFilter]);

    useEffect(() => {
        loadHistory(true);
    }, [entityType, entityId, actionFilter]);

    const handleLoadMore = () => {
        setOffset(prev => prev + limit);
        loadHistory(false);
    };

    // Loading skeleton
    if (loading && history.length === 0) {
        return (
            <div className={cn('space-y-3 p-1', className)}>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white border rounded-lg p-3">
                        <div className="flex gap-3">
                            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
                <p className="text-sm text-destructive mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={() => loadHistory(true)}>
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Header with Filter */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn('h-8 px-3 gap-1.5', showFilters && 'bg-muted')}
                >
                    <Filter className="h-3.5 w-3.5" />
                    <span className="text-xs">Filter</span>
                    {actionFilter !== 'all' && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">1</Badge>
                    )}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadHistory(true)}
                    disabled={loading}
                    className="h-8 w-8 p-0"
                >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="mb-3 pb-3 border-b shrink-0">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Filter by Action
                    </label>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="All Actions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            <SelectItem value="CREATE">Created</SelectItem>
                            <SelectItem value="UPDATE">Updated</SelectItem>
                            <SelectItem value="DELETE">Deleted</SelectItem>
                            <SelectItem value="RESTORE">Restored</SelectItem>
                            <SelectItem value="ASSIGN">Assigned</SelectItem>
                            <SelectItem value="APPROVE">Approved</SelectItem>
                            <SelectItem value="REJECT">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* History Count */}
            {history.length > 0 && (
                <div className="text-xs text-muted-foreground mb-2 shrink-0">
                    Showing {history.length} change{history.length !== 1 ? 's' : ''}
                    {entityId && <span className="ml-1 text-blue-600 font-medium">(this item only)</span>}
                </div>
            )}

            {/* History List */}
            <ScrollArea className="flex-1 -mx-5 px-5">
                <div className="pr-2">
                    {history.length > 0 ? (
                        <>
                            {history.map((entry, index) => (
                                <HistoryEntry
                                    key={entry.id}
                                    entry={entry}
                                    isLast={index === history.length - 1}
                                />
                            ))}

                            {hasMore && (
                                <div className="py-3 flex justify-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleLoadMore}
                                        disabled={loading}
                                    >
                                        {loading ? 'Loading...' : 'Load More'}
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">No history available</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Changes will appear here as they are made.
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

export default AuditHistoryTab;
