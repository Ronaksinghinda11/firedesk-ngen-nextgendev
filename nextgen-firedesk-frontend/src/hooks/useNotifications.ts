import { useEffect, useState, useCallback } from 'react';
import {
    notificationApi,
    type Notification,
    type NotificationCounts,
    type NotificationCategory,
    type NotificationPriority
} from '@/lib/api';

export interface NotificationFilters {
    category?: NotificationCategory;
    priority?: NotificationPriority;
    is_read?: boolean;
}

export const useNotifications = (autoRefreshInterval = 60000) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [counts, setCounts] = useState<NotificationCounts>({
        alert: 0,
        warning: 0,
        info: 0,
        success: 0,
        reminder: 0,
        unread: 0,
        critical: 0,
        total: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentFilters, setCurrentFilters] = useState<NotificationFilters>({});

    // Fetch notifications
    const fetchNotifications = useCallback(async (filters?: NotificationFilters) => {
        try {
            setLoading(true);
            setError(null);

            const response = await notificationApi.getNotifications({
                ...filters,
                limit: 50,
            });

            setNotifications(response.data);
            if (filters) {
                setCurrentFilters(filters);
            }
        } catch (err: any) {
            console.error('Error fetching notifications:', err);
            setError(err.message || 'Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch notification counts
    const fetchCounts = useCallback(async () => {
        try {
            const response = await notificationApi.getCounts();
            setCounts(response.data);
        } catch (err: any) {
            console.error('Error fetching notification counts:', err);
        }
    }, []);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            await notificationApi.markAsRead(notificationId);
            // Update local state
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, is_read: true, read_at: new Date().toISOString() }
                        : notification
                )
            );
            // Refresh counts
            await fetchCounts();
        } catch (err: any) {
            console.error('Error marking notification as read:', err);
            throw err;
        }
    }, [fetchCounts]);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            await notificationApi.markAllAsRead();
            // Update local state
            setNotifications(prev =>
                prev.map(notification => ({
                    ...notification,
                    is_read: true,
                    read_at: new Date().toISOString()
                }))
            );
            // Refresh counts
            await fetchCounts();
        } catch (err: any) {
            console.error('Error marking all notifications as read:', err);
            throw err;
        }
    }, [fetchCounts]);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId: string) => {
        try {
            await notificationApi.delete(notificationId);
            // Update local state
            setNotifications(prev =>
                prev.filter(notification => notification.id !== notificationId)
            );
            // Refresh counts
            await fetchCounts();
        } catch (err: any) {
            console.error('Error deleting notification:', err);
            throw err;
        }
    }, [fetchCounts]);

    // Mark action as taken
    const markActionTaken = useCallback(async (notificationId: string) => {
        try {
            await notificationApi.markActionTaken(notificationId);
            // Update local state
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, action_taken: true, is_read: true }
                        : notification
                )
            );
        } catch (err: any) {
            console.error('Error marking action taken:', err);
            throw err;
        }
    }, []);

    // Filter by category
    const filterByCategory = useCallback((category?: NotificationCategory) => {
        fetchNotifications({ ...currentFilters, category });
    }, [fetchNotifications, currentFilters]);

    // Filter by read status
    const filterByReadStatus = useCallback((is_read?: boolean) => {
        fetchNotifications({ ...currentFilters, is_read });
    }, [fetchNotifications, currentFilters]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
        fetchCounts();
    }, [fetchNotifications, fetchCounts]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefreshInterval) return;

        const intervalId = setInterval(() => {
            fetchNotifications(currentFilters);
            fetchCounts();
        }, autoRefreshInterval);

        return () => clearInterval(intervalId);
    }, [autoRefreshInterval, fetchNotifications, fetchCounts, currentFilters]);

    // Transform counts to legacy format for backward compatibility
    const legacyCounts = {
        critical: counts.critical,
        reminder: counts.reminder,
        warning: counts.warning,
        info: counts.info,
        unread: counts.unread,
        total: counts.total,
    };

    // Transform notifications to legacy Alert format for backward compatibility
    const alerts = notifications.map(n => ({
        id: n.id,
        type: n.category === 'ALERT' ? 'critical' as const :
            n.category === 'REMAINDER' ? 'reminder' as const :
                n.category === 'WARNING' ? 'warning' as const : 'info' as const,
        title: n.title,
        message: n.message,
        read: n.is_read,
        userId: n.user_id,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
    }));

    return {
        // New API
        notifications,
        counts,
        loading,
        error,
        fetchNotifications,
        fetchCounts,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        markActionTaken,
        filterByCategory,
        filterByReadStatus,
        currentFilters,

        // Legacy API (backward compatibility)
        alerts,
        legacyCounts,
    };
};

