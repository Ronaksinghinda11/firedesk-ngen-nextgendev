import React from 'react';
import { AlertCircle, Bell, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: string;
    title: string;
    message: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    sent_at: string;
    is_read?: boolean;
}

interface IssuesAlertsPanelProps {
    notifications: Notification[];
    isLoading?: boolean;
    className?: string;
}

/**
 * Issues & Alerts Panel Component
 * Displays recent notifications and alerts from pump room
 */
export const IssuesAlertsPanel: React.FC<IssuesAlertsPanelProps> = ({
    notifications,
    isLoading = false,
    className
}) => {
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'CRITICAL':
                return 'bg-red-500/10 border-red-500/30 text-red-700';
            case 'HIGH':
                return 'bg-orange-500/10 border-orange-500/30 text-orange-700';
            case 'MEDIUM':
                return 'bg-amber-500/10 border-amber-500/30 text-amber-700';
            default:
                return 'bg-blue-500/10 border-blue-500/30 text-blue-700';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'CRITICAL':
            case 'HIGH':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    const hasCriticalAlarms = notifications.some(n => n.priority === 'CRITICAL');

    return (
        <div className={cn(
            "p-6 rounded-xl border-2 border-border/40 bg-gradient-to-br from-card to-card/80 shadow-md",
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-border/30">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg border",
                        hasCriticalAlarms ?
                            "bg-red-500/15 border-red-500/20" :
                            "bg-gradient-to-br from-primary/15 to-primary/5 border-primary/20"
                    )}>
                        <Bell className={cn(
                            "h-5 w-5",
                            hasCriticalAlarms ? "text-red-600" : "text-primary"
                        )} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-base font-bold text-foreground">Issues & Alerts</h3>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-semibold">
                    {notifications.length} total
                </span>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-xs text-muted-foreground">Loading notifications...</p>
                    </div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">
                        No critical alarms — System operational
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        All systems are running normally
                    </p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={cn(
                                "p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md",
                                getPriorityColor(notification.priority)
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                    {getPriorityIcon(notification.priority)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="text-sm font-bold line-clamp-1">
                                            {notification.title}
                                        </h4>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 whitespace-nowrap font-semibold">
                                            {notification.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-foreground/80 mb-2 line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
