/**
 * History Viewer Component
 * 
 * Reusable component to display audit history for modules or entities.
 * Supports filtering by date range, action type, and user.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Filter, RefreshCw, Clock } from 'lucide-react';
import { GroupedTimeline } from './TimelineItem';
import { auditApi, type AuditLogEntry, type AuditFilters } from '@/services/api/auditApi';

// ============== Types ==============

export type HistoryContext = 'MODULE' | 'ENTITY' | 'USER';

export type EntityType =
    | 'asset' | 'plant' | 'user' | 'role' | 'vendor'
    | 'category' | 'product' | 'scheduler' | 'incident'
    | 'incident_type' | 'incident_subtype' | 'capa' | 'condition';

export interface HistoryViewerProps {
    context: HistoryContext;
    entityType?: EntityType | string;
    entityId?: string;
    userId?: string;
    title?: string;
    className?: string;
    compact?: boolean;
}

// ============== Action Options ==============

const actionOptions = [
    { value: 'all', label: 'All Actions' },
    { value: 'CREATE', label: 'Created' },
    { value: 'UPDATE', label: 'Updated' },
    { value: 'DELETE', label: 'Deleted' },
    { value: 'RESTORE', label: 'Restored' },
    { value: 'ASSIGN', label: 'Assigned' },
    { value: 'APPROVE', label: 'Approved' },
    { value: 'REJECT', label: 'Rejected' },
    { value: 'SUBMIT', label: 'Submitted' },
];

// ============== Main Component ==============

export function HistoryViewer({
    context,
    entityType,
    entityId,
    userId,
    title,
    className,
    compact = false,
}: HistoryViewerProps) {
    // State
    const [history, setHistory] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    // Filters
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [offset, setOffset] = useState(0);
    const limit = compact ? 10 : 25;

    // ============== Load History ==============

    const loadHistory = useCallback(async (reset = false) => {
        if (!entityType && context !== 'USER') {
            setError('Entity type is required');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const filters: AuditFilters = {
                limit,
                offset: reset ? 0 : offset,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                actions: actionFilter !== 'all' ? [actionFilter] : undefined,
            };

            let response;

            if (context === 'ENTITY' && entityId) {
                response = await auditApi.getEntityHistory(entityType!, entityId, filters);
            } else if (context === 'USER' && userId) {
                response = await auditApi.getUserActivity(userId, filters);
            } else if (context === 'MODULE') {
                response = await auditApi.getModuleHistory(entityType!, filters);
            } else {
                throw new Error('Invalid context or missing required parameters');
            }

            if (response?.data) {
                if (reset) {
                    setHistory(response.data.rows);
                    setOffset(0);
                } else {
                    setHistory(prev => [...prev, ...response.data.rows]);
                }
                setTotal(response.data.count);
                setHasMore(response.data.hasMore);
            }
        } catch (err: any) {
            console.error('Failed to load history:', err);
            setError(err.message || 'Failed to load history');
        } finally {
            setLoading(false);
        }
    }, [context, entityType, entityId, userId, offset, limit, startDate, endDate, actionFilter]);

    // ============== Effects ==============

    useEffect(() => {
        loadHistory(true);
    }, [entityType, entityId, userId, startDate, endDate, actionFilter]);

    // ============== Handlers ==============

    const handleLoadMore = () => {
        setOffset(prev => prev + limit);
        loadHistory(false);
    };

    const handleRefresh = () => {
        setOffset(0);
        loadHistory(true);
    };

    const handleClearFilters = () => {
        setStartDate('');
        setEndDate('');
        setActionFilter('all');
    };

    // ============== Render ==============

    const displayTitle = title || (
        context === 'MODULE'
            ? `${entityType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} History`
            : context === 'USER'
                ? 'User Activity'
                : 'History'
    );

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">{displayTitle}</h3>
                    {total > 0 && (
                        <span className="text-xs text-muted-foreground">({total})</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="h-7 w-7 p-0"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFiltersOpen(!filtersOpen)}
                        className={cn('h-7 px-2 gap-1', filtersOpen && 'bg-muted')}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        <span className="text-xs">Filters</span>
                    </Button>
                </div>
            </div>

            {/* Filters Panel */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleContent className="py-3 border-b space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">From</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">To</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Action</Label>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {actionOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {(startDate || endDate || actionFilter !== 'all') && (
                        <Button
                            variant="link"
                            size="sm"
                            onClick={handleClearFilters}
                            className="h-6 px-0 text-xs"
                        >
                            Clear filters
                        </Button>
                    )}
                </CollapsibleContent>
            </Collapsible>

            {/* Content */}
            <ScrollArea className="flex-1 pt-3">
                {loading && history.length === 0 ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-sm text-destructive mb-2">{error}</p>
                        <Button variant="outline" size="sm" onClick={handleRefresh}>
                            Try Again
                        </Button>
                    </div>
                ) : (
                    <>
                        <GroupedTimeline
                            items={history}
                            showEntityName={context === 'MODULE'}
                        />

                        {hasMore && (
                            <div className="pt-4 pb-2 flex justify-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLoadMore}
                                    disabled={loading}
                                    className="text-xs"
                                >
                                    {loading ? 'Loading...' : 'Load More'}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </ScrollArea>
        </div>
    );
}

export default HistoryViewer;
