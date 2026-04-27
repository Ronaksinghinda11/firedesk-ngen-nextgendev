/**
 * Notification Routes
 * Defines all API routes for notifications module
 */

const express = require('express');
const router = express.Router();

// Controller
const notificationController = require('../controllers/notifications/notificationController');

// Middleware
const auth = require('../middleware/auth');

// ============================================================================
// NOTIFICATION ROUTES
// All routes require authentication
// ============================================================================

/**
 * @route   GET /notifications
 * @desc    Get all notifications for the authenticated user
 * @access  Private
 * @query   {string} category - Filter by category (ALERT, WARNING, INFO, SUCCESS, REMAINDER)
 * @query   {string} type - Filter by type (ASSET_ALERT, SERVICE_DUE, etc.)
 * @query   {string} priority - Filter by priority (CRITICAL, HIGH, MEDIUM, LOW)
 * @query   {boolean} is_read - Filter by read status
 * @query   {number} limit - Number of results (default: 50)
 * @query   {number} offset - Offset for pagination
 */
router.get('/', auth, notificationController.getNotifications);

/**
 * @route   GET /notifications/counts
 * @desc    Get notification counts by category
 * @access  Private
 */
router.get('/counts', auth, notificationController.getNotificationCounts);

/**
 * @route   POST /notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.post('/read-all', auth, notificationController.markAllAsRead);

/**
 * @route   POST /notifications/cleanup
 * @desc    Cleanup expired notifications (system/admin use)
 * @access  Private
 */
router.post('/cleanup', auth, notificationController.cleanupExpired);

/**
 * @route   GET /notifications/:id
 * @desc    Get a single notification by ID
 * @access  Private
 */
router.get('/:id', auth, notificationController.getNotificationById);

/**
 * @route   POST /notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.post('/:id/read', auth, notificationController.markAsRead);

/**
 * @route   POST /notifications/:id/action
 * @desc    Mark action as taken on a notification
 * @access  Private
 */
router.post('/:id/action', auth, notificationController.markActionTaken);

/**
 * @route   DELETE /notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', auth, notificationController.deleteNotification);

/**
 * @route   POST /notifications
 * @desc    Create a new notification (admin/system use)
 * @access  Private
 */
router.post('/', auth, notificationController.createNotification);

module.exports = router;
