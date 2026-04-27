import React, { useState } from 'react';
import {
    Bell,
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCircle2,
    Clock,
    X,
    ExternalLink,
    Trash2,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Notification, NotificationCategory, NotificationPriority } from '@/lib/api';

interface NotificationPanelProps {
    notifications: Notification[];
    counts: {
        alert: number;
        warning: number;
        info: number;
        success: number;
        reminder: number;
        unread: number;
        critical: number;
        total: number;
    };
    loading?: boolean;
    onMarkAsRead: (notificationId: string) => Promise<void>;
    onMarkAllAsRead: () => Promise<void>;
    onDelete?: (notificationId: string) => Promise<void>;
    onFilterChange?: (category?: NotificationCategory) => void;
    onNotificationClick?: (notification: Notification) => void;

    onActionClick?: (url: string) => void;
}

type Tab = 'all' | 'alert' | 'warning' | 'info' | 'success' | 'reminder' | 'unread';

// Category color mapping
const categoryColors: Record<NotificationCategory, { bg: string; text: string; icon: string; border: string }> = {
    ALERT: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        icon: 'text-red-500',
        border: 'border-red-200'
    },
    WARNING: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        icon: 'text-amber-500',
        border: 'border-amber-200'
    },
    INFO: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        icon: 'text-blue-500',
        border: 'border-blue-200'
    },
    SUCCESS: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        icon: 'text-emerald-500',
        border: 'border-emerald-200'
    },
    REMAINDER: {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        icon: 'text-orange-500',
        border: 'border-orange-200'
    },
};

// Priority colors
const priorityColors: Record<NotificationPriority, string> = {
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-blue-500 text-white',
    LOW: 'bg-gray-400 text-white',
};

// Get icon for category
const getCategoryIcon = (category: NotificationCategory, className: string = 'h-5 w-5') => {
    switch (category) {
        case 'ALERT':
            return <AlertTriangle className={cn(className, categoryColors.ALERT.icon)} />;
        case 'WARNING':
            return <AlertCircle className={cn(className, categoryColors.WARNING.icon)} />;
        case 'INFO':
            return <Info className={cn(className, categoryColors.INFO.icon)} />;
        case 'SUCCESS':
            return <CheckCircle2 className={cn(className, categoryColors.SUCCESS.icon)} />;
        case 'REMAINDER':
            return <Clock className={cn(className, categoryColors.REMAINDER.icon)} />;
        default:
            return <Bell className={cn(className, 'text-gray-500')} />;
    }
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
    notifications,
    counts,
    loading,
    onMarkAsRead,
    onMarkAllAsRead,
    onDelete,
    onFilterChange,
    onNotificationClick,

    onActionClick,
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('all');


    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);

        if (!onFilterChange) return;

        switch (tab) {
            case 'all':
                onFilterChange(undefined);
                break;

            case 'alert':
                onFilterChange('ALERT');
                break;
            case 'warning':
                onFilterChange('WARNING');
                break;
            case 'info':
                onFilterChange('INFO');
                break;
            case 'success':
                onFilterChange('SUCCESS');
                break;
            case 'reminder':
                onFilterChange('REMAINDER');
                break;
            case 'unread':
                // Handle unread separately in parent
                onFilterChange(undefined);
                break;
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await onMarkAsRead(notification.id);
        }

        if (notification.action_url && onActionClick) {
            onActionClick(notification.action_url);
        }

        if (onNotificationClick) {
            onNotificationClick(notification);
        }
    };

    // Filter notifications based on active tab
    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'all') return true;
        if (activeTab === 'unread') return !n.is_read;


        const categoryMap: Record<string, NotificationCategory> = {
            alert: 'ALERT',
            warning: 'WARNING',
            info: 'INFO',
            success: 'SUCCESS',
            reminder: 'REMAINDER',
        };

        return n.category === categoryMap[activeTab];
    });

    return (
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">Notifications</h3>
                    {counts.unread > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full">
                            {counts.unread}
                        </span>
                    )}
                </div>
                {counts.unread > 0 && (
                    <button
                        onClick={onMarkAllAsRead}
                        className="text-sm text-orange-300 hover:text-orange-200 font-medium transition-colors"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <TabButton
                    active={activeTab === 'all'}
                    onClick={() => handleTabChange('all')}
                    color="gray"
                >
                    All ({counts.total})
                </TabButton>
                <TabButton
                    active={activeTab === 'alert'}
                    onClick={() => handleTabChange('alert')}
                    color="red"
                >
                    Alert ({counts.alert})
                </TabButton>
                <TabButton
                    active={activeTab === 'warning'}
                    onClick={() => handleTabChange('warning')}
                    color="amber"
                >
                    Warning ({counts.warning})
                </TabButton>
                <TabButton
                    active={activeTab === 'info'}
                    onClick={() => handleTabChange('info')}
                    color="blue"
                >
                    Info ({counts.info})
                </TabButton>
                <TabButton
                    active={activeTab === 'success'}
                    onClick={() => handleTabChange('success')}
                    color="green"
                >
                    Success ({counts.success})
                </TabButton>
                <TabButton
                    active={activeTab === 'reminder'}
                    onClick={() => handleTabChange('reminder')}
                    color="orange"
                >
                    Reminder ({counts.reminder})
                </TabButton>
                <TabButton
                    active={activeTab === 'unread'}
                    onClick={() => handleTabChange('unread')}
                    color="slate"
                >
                    Unread ({counts.unread})
                </TabButton>
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mr-3"></div>
                        Loading notifications...
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Bell className="h-12 w-12 text-gray-200 mb-3" />
                        <p className="text-sm">No notifications</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredNotifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onClick={() => handleNotificationClick(notification)}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}

        </div>
    );
};

// Tab Button Component
interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    color: 'gray' | 'red' | 'orange' | 'amber' | 'green' | 'blue' | 'slate';
    children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, color, children }) => {
    const colorClasses = {
        gray: active ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100',
        red: active ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-red-50',
        orange: active ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-orange-50',
        amber: active ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-amber-50',
        green: active ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-emerald-50',
        blue: active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-blue-50',
        slate: active ? 'bg-slate-800 text-white' : 'text-gray-600 hover:bg-slate-100',
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
                colorClasses[color]
            )}
        >
            {children}
        </button>
    );
};

// Single Notification Item Component
interface NotificationItemProps {
    notification: Notification;
    onClick: () => void;
    onDelete?: (id: string) => Promise<void>;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
    notification,
    onClick,
    onDelete,
}) => {
    const colors = categoryColors[notification.category] || categoryColors.INFO;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(notification.id);
        }
    };

    return (
        <div
            className={cn(
                'group px-4 py-3 cursor-pointer transition-all duration-200 relative',
                notification.is_read ? 'bg-white' : colors.bg,
                'hover:bg-gray-50'
            )}
            onClick={onClick}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn(
                    'flex-shrink-0 mt-0.5 p-1.5 rounded-lg',
                    notification.is_read ? 'bg-gray-100' : `${colors.bg} ${colors.border} border`
                )}>
                    {getCategoryIcon(notification.category, 'h-4 w-4')}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-8"> {/* Added padding-right for delete button space */}
                    {/* Title Row */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={cn(
                            'text-sm font-semibold line-clamp-1',
                            notification.is_read ? 'text-gray-700' : 'text-gray-900'
                        )}>
                            {notification.title}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Priority Badge */}
                            <span className={cn(
                                'px-1.5 py-0.5 text-[10px] font-bold rounded uppercase',
                                priorityColors[notification.priority]
                            )}>
                                {notification.priority}
                            </span>
                        </div>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-gray-600 line-clamp-2">
                        {notification.message}
                    </p>

                    {/* Metadata Row */}
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                            {/* Unread Indicator */}
                            {!notification.is_read && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                                    <span className="h-1.5 w-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                                    New
                                </span>
                            )}

                            {/* Category Badge */}
                            <span className={cn(
                                'px-1.5 py-0.5 text-[10px] font-medium rounded border',
                                colors.bg, colors.text, colors.border
                            )}>
                                {notification.category === 'REMAINDER' ? 'Reminder' : notification.category}
                            </span>

                            {/* Type */}
                            <span className="text-xs text-gray-400">
                                {notification.type.replace(/_/g, ' ').toLowerCase()}
                            </span>
                        </div>

                        {/* Timestamp */}
                        <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                    </div>
                </div>

                {/* Delete Button - Absolute positioned on the right or flex item */}
                {onDelete && (
                    <button
                        onClick={handleDelete}
                        className="absolute right-2 top-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete notification"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

// Export for backward compatibility with legacy Alert prop
export interface LegacyNotificationPanelProps {
    alerts: Array<{
        id: string;
        type: 'critical' | 'reminder' | 'warning' | 'info';
        title: string;
        message: string;
        read: boolean;
        createdAt: string;
    }>;
    counts: {
        critical: number;
        reminder: number;
        warning: number;
        unread: number;
        total: number;
    };
    loading?: boolean;
    onMarkAsRead: (alertId: string) => Promise<void>;
    onMarkAllAsRead: () => Promise<void>;
    onFilterChange?: (filter?: { type?: 'critical' | 'reminder' | 'warning' | 'info'; read?: boolean }) => void;
}

// Wrapper for legacy usage
export const LegacyNotificationPanel: React.FC<LegacyNotificationPanelProps> = ({
    alerts,
    counts,
    loading,
    onMarkAsRead,
    onMarkAllAsRead,
    onFilterChange,
}) => {
    // Transform legacy alerts to new notification format
    const notifications: Notification[] = alerts.map(alert => ({
        id: alert.id,
        type: 'GENERAL' as const,
        category: alert.type === 'critical' ? 'ALERT' as const :
            alert.type === 'reminder' ? 'REMAINDER' as const :
                alert.type === 'warning' ? 'WARNING' as const : 'INFO' as const,
        priority: alert.type === 'critical' ? 'CRITICAL' as const : 'MEDIUM' as const,
        title: alert.title,
        message: alert.message,
        user_id: '',
        is_actionable: false,
        action_taken: false,
        is_read: alert.read,
        notification_source: 'SYSTEM',
        created_at: alert.createdAt,
        updated_at: alert.createdAt,
    }));

    const newCounts = {
        alert: counts.critical,
        warning: counts.warning,
        info: 0,
        success: 0,
        reminder: counts.reminder,
        unread: counts.unread,
        critical: counts.critical,
        total: counts.total,
    };

    const handleFilterChange = (category?: NotificationCategory) => {
        if (!onFilterChange) return;

        if (!category) {
            onFilterChange();
        } else {
            const typeMap: Record<NotificationCategory, 'critical' | 'reminder' | 'warning' | 'info'> = {
                ALERT: 'critical',
                REMAINDER: 'reminder',
                WARNING: 'warning',
                INFO: 'info',
                SUCCESS: 'info',
            };
            onFilterChange({ type: typeMap[category] });
        }
    };

    return (
        <NotificationPanel
            notifications={notifications}
            counts={newCounts}
            loading={loading}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onFilterChange={handleFilterChange}
        />
    );
};
