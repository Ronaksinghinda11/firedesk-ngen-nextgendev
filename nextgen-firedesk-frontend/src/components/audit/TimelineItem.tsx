/**
 * Timeline Item Component
 * 
 * Displays a single audit log entry in a timeline format
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
    UserPlus,
    UserMinus,
    CheckCircle,
    XCircle,
    Send,
    Archive,
    RefreshCw,
    Upload,
    Clock,
} from 'lucide-react';
import type { AuditLogEntry } from '@/services/api/auditApi';

// ============== Action Icons & Colors ==============

const actionConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    CREATE: { icon: Plus, color: 'text-green-600', bgColor: 'bg-green-100' },
    UPDATE: { icon: Pencil, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    DELETE: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100' },
    RESTORE: { icon: RotateCcw, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    ARCHIVE: { icon: Archive, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    ASSIGN: { icon: UserPlus, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    UNASSIGN: { icon: UserMinus, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    APPROVE: { icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    REJECT: { icon: XCircle, color: 'text-rose-600', bgColor: 'bg-rose-100' },
    SUBMIT: { icon: Send, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
    COMPLETE: { icon: CheckCircle, color: 'text-teal-600', bgColor: 'bg-teal-100' },
    BULK_UPDATE: { icon: RefreshCw, color: 'text-violet-600', bgColor: 'bg-violet-100' },
    IMPORT: { icon: Upload, color: 'text-amber-600', bgColor: 'bg-amber-100' },
    STATUS_CHANGE: { icon: RefreshCw, color: 'text-sky-600', bgColor: 'bg-sky-100' },
};

const defaultAction = { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' };

// ============== Utility Functions ==============

function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ============== Timeline Item Component ==============

interface TimelineItemProps {
    entry: AuditLogEntry;
    isLast?: boolean;
    showEntityName?: boolean;
}

export function TimelineItem({ entry, isLast = false, showEntityName = false }: TimelineItemProps) {
    const config = actionConfig[entry.action] || defaultAction;
    const IconComponent = config.icon;

    return (
        <div className="relative flex gap-3 pb-4">
            {/* Vertical Line */}
            {!isLast && (
                <div className="absolute left-[15px] top-8 h-full w-[2px] bg-border" />
            )}

            {/* Icon */}
            <div
                className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    config.bgColor
                )}
            >
                <IconComponent className={cn('h-4 w-4', config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        {/* Action Description */}
                        <p className="text-sm font-medium text-foreground leading-tight">
                            {entry.action_description || `${entry.action} ${entry.entity_name || ''}`}
                        </p>

                        {/* Entity Name (for module view) */}
                        {showEntityName && entry.entity_name && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {entry.entity_name}
                            </p>
                        )}
                    </div>

                    {/* Action Badge */}
                    <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                        {entry.action}
                    </Badge>
                </div>

                {/* User & Time */}
                <div className="flex items-center gap-2 mt-1.5">
                    <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-muted">
                            {getInitials(entry.user_name)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{entry.user_name}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
                </div>

                {/* Changes Display */}
                {entry.changes && Object.keys(entry.changes).length > 0 && (
                    <ChangesDiff changes={entry.changes} />
                )}

                {/* Simple Field Change */}
                {!entry.changes && entry.field_name && (
                    <div className="mt-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                        <span className="font-medium">{entry.field_name}</span>
                        {entry.old_value && (
                            <>
                                <span className="text-muted-foreground">: </span>
                                <span className="line-through text-red-600/70">{entry.old_value_display || entry.old_value}</span>
                            </>
                        )}
                        {entry.new_value && (
                            <>
                                <span className="text-muted-foreground"> → </span>
                                <span className="text-green-600">{entry.new_value_display || entry.new_value}</span>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============== Changes Diff Component ==============

interface ChangesDiffProps {
    changes: Record<string, { old: any; new: any }>;
}

export function ChangesDiff({ changes }: ChangesDiffProps) {
    const entries = Object.entries(changes);

    if (entries.length === 0) return null;

    return (
        <div className="mt-2 space-y-1">
            {entries.map(([field, { old: oldVal, new: newVal }]) => (
                <div key={field} className="text-xs bg-muted/50 rounded px-2 py-1 flex flex-wrap items-center gap-1">
                    <span className="font-medium text-muted-foreground capitalize">
                        {field.replace(/_/g, ' ')}:
                    </span>
                    {oldVal !== undefined && oldVal !== null && (
                        <span className="line-through text-red-600/70 max-w-[100px] truncate">
                            {String(oldVal)}
                        </span>
                    )}
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-600 max-w-[100px] truncate">
                        {String(newVal)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ============== Grouped Timeline ==============

interface GroupedTimelineProps {
    items: AuditLogEntry[];
    showEntityName?: boolean;
}

export function GroupedTimeline({ items, showEntityName = true }: GroupedTimelineProps) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No history available</p>
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {items.map((entry, index) => (
                <TimelineItem
                    key={entry.id}
                    entry={entry}
                    isLast={index === items.length - 1}
                    showEntityName={showEntityName}
                />
            ))}
        </div>
    );
}

export default TimelineItem;
