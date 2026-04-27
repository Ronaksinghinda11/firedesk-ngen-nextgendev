/**
 * Notification Controller
 * Handles HTTP requests for notification operations
 */

const notificationService = require('../../services/notifications/notificationService');

/**
 * Get all notifications for the authenticated user
 * @route GET /notifications
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { category, type, priority, is_read, limit, offset } = req.query;

        // Parse is_read query param
        let isReadFilter;
        if (is_read === 'true') isReadFilter = true;
        else if (is_read === 'false') isReadFilter = false;

        const result = await notificationService.getNotifications(userId, {
            category,
            type,
            priority,
            is_read: isReadFilter,
            limit: limit || 50,
            offset: offset || 0
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error in getNotifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

/**
 * Get notification counts by category
 * @route GET /notifications/counts
 */
const getNotificationCounts = async (req, res) => {
    try {
        const userId = req.user.id;
        const counts = await notificationService.getNotificationCounts(userId);

        res.status(200).json({
            success: true,
            data: counts
        });
    } catch (error) {
        console.error('Error in getNotificationCounts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification counts',
            error: error.message
        });
    }
};

/**
 * Get a single notification by ID
 * @route GET /notifications/:id
 */
const getNotificationById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await notificationService.getNotificationById(id, userId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error('Error in getNotificationById:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification',
            error: error.message
        });
    }
};

/**
 * Mark a notification as read
 * @route POST /notifications/:id/read
 */
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await notificationService.markAsRead(id, userId);

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });
    } catch (error) {
        console.error('Error in markAsRead:', error);

        if (error.message === 'Notification not found') {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
};

/**
 * Mark all notifications as read
 * @route POST /notifications/read-all
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const updatedCount = await notificationService.markAllAsRead(userId);

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
            updated: updatedCount
        });
    } catch (error) {
        console.error('Error in markAllAsRead:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: error.message
        });
    }
};

/**
 * Mark action taken on a notification
 * @route POST /notifications/:id/action
 */
const markActionTaken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await notificationService.markActionTaken(id, userId);

        res.status(200).json({
            success: true,
            message: 'Action marked as taken',
            data: notification
        });
    } catch (error) {
        console.error('Error in markActionTaken:', error);

        if (error.message === 'Notification not found') {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to mark action as taken',
            error: error.message
        });
    }
};

/**
 * Delete a notification
 * @route DELETE /notifications/:id
 */
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const deleted = await notificationService.deleteNotification(id, userId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('Error in deleteNotification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message
        });
    }
};

/**
 * Create a notification (admin/system use)
 * @route POST /notifications
 */
const createNotification = async (req, res) => {
    try {
        const {
            type,
            category,
            priority,
            title,
            message,
            user_id,
            related_entity_type,
            related_entity_id,
            action_url,
            is_actionable
        } = req.body;

        // Validate required fields
        if (!type || !title || !message || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: type, title, message, user_id'
            });
        }

        const notification = await notificationService.createNotification({
            type,
            category,
            priority,
            title,
            message,
            user_id,
            related_entity_type,
            related_entity_id,
            action_url,
            is_actionable,
            triggered_by: req.user?.id,
            notification_source: 'SYSTEM'
        });

        res.status(201).json({
            success: true,
            message: 'Notification created',
            data: notification
        });
    } catch (error) {
        console.error('Error in createNotification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification',
            error: error.message
        });
    }
};

/**
 * Cleanup expired notifications (system use / cron)
 * @route POST /notifications/cleanup
 */
const cleanupExpired = async (req, res) => {
    try {
        const deleted = await notificationService.cleanupExpiredNotifications();

        res.status(200).json({
            success: true,
            message: `Cleaned up ${deleted} expired notifications`,
            deleted
        });
    } catch (error) {
        console.error('Error in cleanupExpired:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup expired notifications',
            error: error.message
        });
    }
};

module.exports = {
    getNotifications,
    getNotificationCounts,
    getNotificationById,
    markAsRead,
    markAllAsRead,
    markActionTaken,
    deleteNotification,
    createNotification,
    cleanupExpired
};
