/**
 * Notification Service
 * Handles all notification CRUD operations, expiry logic, and notification generation
 */

const { Op } = require('sequelize');
const Notification = require('../../models/notifications/Notification');
const { User } = require('../../models/user-management');

// Constants
const UNREAD_EXPIRY_DAYS = 7;  // Unread notifications expire after 7 days
const READ_EXPIRY_DAYS = 2;    // Read notifications expire after 2 days

/**
 * Calculate expiry date based on read status
 * @param {boolean} isRead - Whether notification is read
 * @returns {Date} Expiry date
 */
const calculateExpiryDate = (isRead = false) => {
    const now = new Date();
    const days = isRead ? READ_EXPIRY_DAYS : UNREAD_EXPIRY_DAYS;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
};

/**
 * Create a new notification
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (data) => {
    try {
        const notificationData = {
            type: data.type,
            category: data.category || 'INFO',
            priority: data.priority || 'MEDIUM',
            title: data.title,
            message: data.message,
            related_entity_type: data.related_entity_type || null,
            related_entity_id: data.related_entity_id || null,
            user_id: data.user_id,
            action_url: data.action_url || null,
            is_actionable: data.is_actionable || false,
            is_read: false,
            sent_at: new Date(),
            expires_at: calculateExpiryDate(false),
            triggered_by: data.triggered_by || null,
            notification_source: data.notification_source || 'SYSTEM'
        };

        const notification = await Notification.create(notificationData);

        // Emit socket event for real-time updates
        if (global.io) {
            global.io.to(`user:${data.user_id}`).emit('notification:new', notification);
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

/**
 * Get notifications for a user with filters
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Notifications and metadata
 */
const getNotifications = async (userId, filters = {}) => {
    try {
        const {
            category,
            type,
            priority,
            is_read,
            limit = 50,
            offset = 0
        } = filters;

        const whereClause = {
            user_id: userId,
            [Op.or]: [
                { expires_at: null },
                { expires_at: { [Op.gt]: new Date() } }
            ]
        };

        if (category) {
            whereClause.category = category.toUpperCase();
        }

        if (type) {
            whereClause.type = type.toUpperCase();
        }

        if (priority) {
            whereClause.priority = priority.toUpperCase();
        }

        if (typeof is_read === 'boolean') {
            whereClause.is_read = is_read;
        }

        const { count, rows } = await Notification.findAndCountAll({
            where: whereClause,
            order: [
                ['is_read', 'ASC'],
                ['created_at', 'DESC']
            ],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            data: rows,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }
};

/**
 * Get notification counts by category for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Notification counts
 */
const getNotificationCounts = async (userId) => {
    try {
        const baseWhere = {
            user_id: userId,
            [Op.or]: [
                { expires_at: null },
                { expires_at: { [Op.gt]: new Date() } }
            ]
        };

        // Get counts by category
        const [
            alertCount,
            warningCount,
            infoCount,
            successCount,
            remainderCount,
            unreadCount,
            criticalCount,
            totalCount
        ] = await Promise.all([
            Notification.count({ where: { ...baseWhere, category: 'ALERT' } }),
            Notification.count({ where: { ...baseWhere, category: 'WARNING' } }),
            Notification.count({ where: { ...baseWhere, category: 'INFO' } }),
            Notification.count({ where: { ...baseWhere, category: 'SUCCESS' } }),
            Notification.count({ where: { ...baseWhere, category: 'REMAINDER' } }),
            Notification.count({ where: { ...baseWhere, is_read: false } }),
            Notification.count({ where: { ...baseWhere, priority: 'CRITICAL' } }),
            Notification.count({ where: baseWhere })
        ]);

        return {
            alert: alertCount,
            warning: warningCount,
            info: infoCount,
            success: successCount,
            reminder: remainderCount,
            unread: unreadCount,
            critical: criticalCount,
            total: totalCount
        };
    } catch (error) {
        console.error('Error fetching notification counts:', error);
        throw error;
    }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for verification)
 * @returns {Promise<Object>} Updated notification
 */
const markAsRead = async (notificationId, userId) => {
    try {
        const notification = await Notification.findOne({
            where: { id: notificationId, user_id: userId }
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        if (notification.is_read) {
            return notification;
        }

        // Update read status and recalculate expiry
        await notification.update({
            is_read: true,
            read_at: new Date(),
            expires_at: calculateExpiryDate(true)
        });

        // Emit socket event
        if (global.io) {
            global.io.to(`user:${userId}`).emit('notification:read', { id: notificationId });
        }

        return notification;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of updated notifications
 */
const markAllAsRead = async (userId) => {
    try {
        const newExpiryDate = calculateExpiryDate(true);

        const [updatedCount] = await Notification.update(
            {
                is_read: true,
                read_at: new Date(),
                expires_at: newExpiryDate
            },
            {
                where: {
                    user_id: userId,
                    is_read: false
                }
            }
        );

        // Emit socket event
        if (global.io) {
            global.io.to(`user:${userId}`).emit('notification:readAll');
        }

        return updatedCount;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for verification)
 * @returns {Promise<boolean>} Success status
 */
const deleteNotification = async (notificationId, userId) => {
    try {
        const deleted = await Notification.destroy({
            where: { id: notificationId, user_id: userId }
        });

        if (deleted) {
            // Emit socket event
            if (global.io) {
                global.io.to(`user:${userId}`).emit('notification:deleted', { id: notificationId });
            }
        }

        return deleted > 0;
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
};

/**
 * Cleanup expired notifications
 * @returns {Promise<number>} Number of deleted notifications
 */
const cleanupExpiredNotifications = async () => {
    try {
        const deleted = await Notification.destroy({
            where: {
                expires_at: {
                    [Op.lt]: new Date()
                }
            }
        });

        console.log(`🧹 Cleaned up ${deleted} expired notifications`);
        return deleted;
    } catch (error) {
        console.error('Error cleaning up expired notifications:', error);
        throw error;
    }
};

/**
 * Create notifications for multiple users (bulk)
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notificationData - Base notification data
 * @returns {Promise<Array>} Created notifications
 */
const createBulkNotifications = async (userIds, notificationData) => {
    try {
        const notifications = userIds.map(userId => ({
            ...notificationData,
            user_id: userId,
            is_read: false,
            sent_at: new Date(),
            expires_at: calculateExpiryDate(false)
        }));

        const created = await Notification.bulkCreate(notifications);

        // Emit socket events
        if (global.io) {
            userIds.forEach(userId => {
                const userNotification = created.find(n => n.user_id === userId);
                if (userNotification) {
                    global.io.to(`user:${userId}`).emit('notification:new', userNotification);
                }
            });
        }

        return created;
    } catch (error) {
        console.error('Error creating bulk notifications:', error);
        throw error;
    }
};

/**
 * Generate a success notification
 * @param {string} type - Notification type (SERVICE_DUE, TICKET_UPDATED, etc.)
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
const generateSuccessNotification = async (type, data) => {
    return createNotification({
        type,
        category: 'SUCCESS',
        priority: 'LOW',
        ...data
    });
};

/**
 * Generate a reminder notification
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
const generateReminderNotification = async (type, data) => {
    return createNotification({
        type,
        category: 'REMAINDER',
        priority: data.priority || 'MEDIUM',
        ...data
    });
};

/**
 * Generate an alert notification
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
const generateAlertNotification = async (type, data) => {
    return createNotification({
        type,
        category: 'ALERT',
        priority: data.priority || 'HIGH',
        ...data
    });
};

/**
 * Get notification by ID
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for verification)
 * @returns {Promise<Object>} Notification
 */
const getNotificationById = async (notificationId, userId) => {
    try {
        const notification = await Notification.findOne({
            where: { id: notificationId, user_id: userId }
        });

        return notification;
    } catch (error) {
        console.error('Error fetching notification:', error);
        throw error;
    }
};

/**
 * Mark action as taken on a notification
 * @param {string} notification_id - Notification ID
 * @param {string} user_id - User ID
 * @returns {Promise<Object>} Updated notification
 */
const mark_action_taken = async (notification_id, user_id) => {
    try {
        const notification = await Notification.findOne({
            where: { id: notification_id, user_id: user_id }
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        await notification.update({
            action_taken: true,
            is_read: true,
            read_at: notification.read_at || new Date(),
            expires_at: calculateExpiryDate(true)
        });

        return notification;
    } catch (error) {
        console.error('Error marking action taken:', error);
        throw error;
    }
};

// ============================================
// HELPER FUNCTIONS FOR SERVICE INTEGRATION
// ============================================

/**
 * Get users associated with a plant (managers and technicians)
 * @param {string} plant_id - Plant ID
 * @returns {Promise<string[]>} Array of user IDs
 */
const get_users_for_plant = async (plant_id) => {
    try {
        // Import models from index to ensure associations are loaded
        const {
            Manager,
            Technician,
            PlantManager,
            TechnicianPlant,
            User,
            Role
        } = require('../../models/user-management');

        const user_ids = new Set();

        // ALWAYS include Admin users (Super Admins should see all notifications)
        try {
            const adminRole = await Role.findOne({ where: { name: 'Admin' } });
            if (adminRole) {
                const adminUsers = await User.findAll({
                    where: { role_id: adminRole.id, status: 'Active' },
                    attributes: ['id']
                });
                adminUsers.forEach(u => user_ids.add(u.id));
            }
        } catch (e) {
            console.error('[NOTIF] Error fetching admin users:', e.message);
        }

        // Get managers for the plant
        if (PlantManager && plant_id) {
            const plant_managers = await PlantManager.findAll({
                where: { plant_id: plant_id },
                include: [{
                    model: Manager,
                    as: 'manager',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id'],
                        where: { status: 'Active' },
                        required: false
                    }],
                    required: false
                }]
            });

            plant_managers.forEach(pm => {
                if (pm.manager?.user?.id) {
                    user_ids.add(pm.manager.user.id);
                }
            });
        }

        // Get technicians for the plant
        if (TechnicianPlant && plant_id) {
            const plant_technicians = await TechnicianPlant.findAll({
                where: { plant_id: plant_id },
                include: [{
                    model: Technician,
                    as: 'technician',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id'],
                        where: { status: 'Active' },
                        required: false
                    }],
                    required: false
                }]
            });

            plant_technicians.forEach(pt => {
                if (pt.technician?.user?.id) {
                    user_ids.add(pt.technician.user.id);
                }
            });
        }

        return Array.from(user_ids);
    } catch (error) {
        console.error('Error getting users for plant:', error);
        return [];
    }
};

/**
 * Notify on service approval
 * @param {Object} submission - Service submission object (with asset and plant populated)
 * @param {string} manager_id - Manager who approved
 */
const notify_service_approved = async (submission, manager_id) => {
    try {
        const plant_id = submission.plant_id;
        const user_ids = await get_users_for_plant(plant_id);

        const asset_code = submission.asset?.asset_code || 'N/A';
        const submission_number = submission.submission_number || submission.id;

        // Notify admin + managers of the plant (excluding the approving manager)
        for (const user_id of user_ids) {
            if (user_id === manager_id) continue;

            await createNotification({
                type: 'GENERAL',
                category: 'SUCCESS',
                priority: 'LOW',
                title: `Service Approved: ${submission_number}`,
                message: `Service for asset ${asset_code} has been approved.`,
                user_id: user_id,
                related_entity_type: 'ServiceSubmission',
                related_entity_id: submission.id,
                action_url: `/admin/service-forms/submissions?id=${submission.id}`,
                is_actionable: true,
                triggered_by: manager_id,
                notification_source: 'SYSTEM'
            });
        }

        // Notify the technician who submitted it
        if (submission.submitted_by || submission.technician_id) {
            const { Technician, User } = require('../../models/user-management');
            const tech_id = submission.submitted_by || submission.technician_id;
            const technician = await Technician.findByPk(tech_id, {
                include: [{ model: User, as: 'user', attributes: ['id'] }]
            });

            if (technician?.user?.id && technician.user.id !== manager_id) {
                await createNotification({
                    type: 'GENERAL',
                    category: 'SUCCESS',
                    priority: 'MEDIUM',
                    title: `Your Service Was Approved`,
                    message: `Your service submission ${submission_number} for asset ${asset_code} has been approved.`,
                    user_id: technician.user.id,
                    related_entity_type: 'ServiceSubmission',
                    related_entity_id: submission.id,
                    action_url: `/technician/services?id=${submission.id}`,
                    is_actionable: true,
                    triggered_by: manager_id,
                    notification_source: 'SYSTEM'
                });
            }
        }
    } catch (error) {
        console.error('Error sending service approval notification:', error);
    }
};

/**
 * Notify on service rejection
 * @param {Object} submission - Service submission object
 * @param {string} manager_id - Manager who rejected
 * @param {string} rejection_reason - Reason for rejection
 */
const notify_service_rejected = async (submission, manager_id, rejection_reason) => {
    try {
        console.log('[NOTIF] notify_service_rejected called for submission:', submission.id);
        const plant_id = submission.plant_id;
        const user_ids = await get_users_for_plant(plant_id);

        const asset_code = submission.asset?.asset_code || 'N/A';
        const submission_number = submission.submission_number || submission.id;

        // Notify admin + managers of the plant (excluding the rejecting manager)
        for (const user_id of user_ids) {
            if (user_id === manager_id) continue;

            await createNotification({
                type: 'GENERAL',
                category: 'WARNING',
                priority: 'MEDIUM',
                title: `Service Rejected: ${submission_number}`,
                message: `Service for asset ${asset_code} was rejected.`,
                user_id: user_id,
                related_entity_type: 'ServiceSubmission',
                related_entity_id: submission.id,
                action_url: `/admin/service-forms/submissions?id=${submission.id}`,
                is_actionable: true,
                triggered_by: manager_id,
                notification_source: 'SYSTEM'
            });
        }

        // Notify the technician who submitted it (HIGH priority)
        const tech_id = submission.submitted_by || submission.technician_id;
        console.log('[NOTIF] Checking technician for notification. submitted_by:', submission.submitted_by, 'technician_id:', submission.technician_id, 'Final tech_id:', tech_id);

        if (tech_id) {
            const { Technician, User } = require('../../models/user-management');
            const technician = await Technician.findByPk(tech_id, {
                include: [{ model: User, as: 'user', attributes: ['id'] }]
            });

            console.log('[NOTIF] Technician found:', technician ? 'YES' : 'NO', 'User ID:', technician?.user?.id);

            if (technician?.user?.id) {
                const notif = await createNotification({
                    type: 'GENERAL',
                    category: 'WARNING',
                    priority: 'HIGH',
                    title: `Your Service Was Rejected`,
                    message: `Your service submission ${submission_number} was rejected. Reason: ${rejection_reason || 'No reason provided'}`,
                    user_id: technician.user.id,
                    related_entity_type: 'ServiceSubmission',
                    related_entity_id: submission.id,
                    action_url: `/technician/services?id=${submission.id}`,
                    is_actionable: true,
                    triggered_by: manager_id,
                    notification_source: 'SYSTEM'
                });
                console.log('[NOTIF] Rejection notification created:', notif.id);
            } else {
                console.log('[NOTIF] Technician has no associated user or user ID not found.');
            }
        } else {
            console.log('[NOTIF] No technician ID found on submission.');
        }
    } catch (error) {
        console.error('Error sending service rejection notification:', error);
    }
};

/**
 * Notify on service completion
 * @param {Object} submission - Service submission object
 * @param {string} technician_id - Technician who completed the service
 * 
 */
const notify_service_completed = async (submission, technician_id) => {
    console.log('[NOTIF] notify_service_completed triggered for submission:', submission.id);
    try {
        const plant_id = submission.plant_id;
        console.log('[NOTIF] Plant ID:', plant_id);
        const user_ids = await get_users_for_plant(plant_id);
        console.log('[NOTIF] Found users to notify:', user_ids.length);

        for (const user_id of user_ids) {
            if (user_id === technician_id) continue;

            await createNotification({
                type: 'GENERAL',
                category: 'SUCCESS',
                priority: 'LOW',
                title: 'Service Completed',
                message: `Service ${submission.submission_number || submission.id} has been completed successfully.`,
                user_id: user_id,
                related_entity_type: 'ServiceSubmission',
                related_entity_id: submission.id,
                action_url: `/admin/service-forms/submissions?id=${submission.id}`,
                is_actionable: true,
                triggered_by: technician_id,
                notification_source: 'SYSTEM'
            });
        }
    } catch (error) {
        console.error('Error sending service completion notification:', error);
    }
};

/**
 * Notify on new incident creation
 * @param {Object} incident - Incident object
 * @param {string} created_by - User ID who created the incident
 */
const notify_incident_created = async (incident, created_by) => {
    try {
        const plant_id = incident.plantId || incident.plant_id;
        const user_ids = await get_users_for_plant(plant_id);

        for (const user_id of user_ids) {
            await createNotification({
                type: 'INCIDENT_CREATED',
                category: 'ALERT',
                priority: 'HIGH',
                title: `New Incident: ${incident.incidentNumber || incident.incident_number}`,
                message: incident.description?.substring(0, 150) || 'A new incident has been reported.',
                user_id: user_id,
                related_entity_type: 'Incident',
                related_entity_id: incident.id,
                action_url: `/admin/incidents?id=${incident.id}`,
                is_actionable: true,
                triggered_by: created_by,
                notification_source: 'SYSTEM'
            });
        }
    } catch (error) {
        console.error('Error sending incident creation notification:', error);
    }
};

/**
 * Notify team assignment for incident
 * @param {Object} incident - Incident object
 * @param {Array} team_member_ids - Array of user IDs assigned to the team
 * @param {string} assigned_by - User who assigned the team
 */
const notify_incident_team_assigned = async (incident, team_member_ids, assigned_by) => {
    try {
        for (const user_id of team_member_ids) {
            await createNotification({
                type: 'INCIDENT_ASSIGNED',
                category: 'INFO',
                priority: 'HIGH',
                title: `Assigned to Incident Team: ${incident.incidentNumber || incident.incident_number}`,
                message: `You have been assigned to the team for incident ${incident.incidentNumber || incident.incident_number}`,
                user_id: user_id,
                related_entity_type: 'Incident',
                related_entity_id: incident.id,
                action_url: `/admin/incidents?id=${incident.id}`,
                is_actionable: true,
                triggered_by: assigned_by,
                notification_source: 'SYSTEM'
            });
        }
    } catch (error) {
        console.error('Error sending incident team assignment notification:', error);
    }
};

/**
 * Notify on ticket creation
 * @param {Object} ticket - Ticket object (with plant, asset populated)
 * @param {string} created_by - User ID who created the ticket
 */
const notify_ticket_created = async (ticket, created_by) => {
    console.log('[NOTIF] notify_ticket_created triggered for ticket:', ticket.id);
    try {
        const plant_id = ticket.plant_id;
        const user_ids = await get_users_for_plant(plant_id);

        for (const user_id of user_ids) {
            // Don't notify the creator
            if (user_id === created_by) continue;

            await createNotification({
                type: 'TICKET_ASSIGNED',
                category: 'INFO',
                priority: 'MEDIUM',
                title: `New Ticket Created: ${ticket.ticket_code || ticket.id}`,
                message: `Ticket "${ticket.task_name}" has been created${ticket.technician_id ? ' and assigned' : ''}.`,
                user_id: user_id,
                related_entity_type: 'Ticket',
                related_entity_id: ticket.id,
                action_url: `/admin/tickets?id=${ticket.id}`,
                is_actionable: true,
                triggered_by: created_by,
                notification_source: 'SYSTEM'
            });
        }

        // If a specific technician is assigned, notify them explicitly
        if (ticket.technician_id) {
            const { Technician, User } = require('../../models/user-management');
            const technician = await Technician.findByPk(ticket.technician_id, {
                include: [{ model: User, as: 'user', attributes: ['id'] }]
            });

            if (technician?.user?.id && technician.user.id !== created_by) {
                await createNotification({
                    type: 'TICKET_ASSIGNED',
                    category: 'INFO',
                    priority: 'HIGH',
                    title: `Ticket Assigned to You: ${ticket.ticket_code || ticket.id}`,
                    message: `You have been assigned ticket "${ticket.task_name}". Target date: ${ticket.target_date ? new Date(ticket.target_date).toLocaleDateString() : 'Not set'}.`,
                    user_id: technician.user.id,
                    related_entity_type: 'Ticket',
                    related_entity_id: ticket.id,
                    action_url: `/admin/tickets?id=${ticket.id}`,
                    is_actionable: true,
                    triggered_by: created_by,
                    notification_source: 'SYSTEM'
                });
            }
        }

        console.log('[NOTIF] Ticket notifications sent to', user_ids.length, 'users');
    } catch (error) {
        console.error('Error sending ticket creation notification:', error);
    }
};

/**
 * Notify on ticket assignment
 * @param {Object} ticket - Ticket object
 * @param {string} assignee_user_id - User ID of the assigned person
 * @param {string} created_by - User who created the ticket
 */
const notify_ticket_assigned = async (ticket, assignee_user_id, created_by) => {
    try {
        if (!assignee_user_id) return;

        await createNotification({
            type: 'TICKET_ASSIGNED',
            category: 'INFO',
            priority: 'MEDIUM',
            title: `Ticket Assigned: ${ticket.ticket_number || ticket.id}`,
            message: ticket.description?.substring(0, 150) || 'A new ticket has been assigned to you.',
            user_id: assignee_user_id,
            related_entity_type: 'Ticket',
            related_entity_id: ticket.id,
            action_url: `/admin/tickets?id=${ticket.id}`,
            is_actionable: true,
            triggered_by: created_by,
            notification_source: 'SYSTEM'
        });
    } catch (error) {
        console.error('Error sending ticket assignment notification:', error);
    }
};

/**
 * Notify on asset health status change (critical)
 * @param {Object} asset - Asset object
 * @param {string} new_health_status - New health status
 * @param {string} changed_by - User who triggered the change
 */
const notify_asset_health_critical = async (asset, new_health_status, changed_by) => {
    try {
        if (new_health_status !== 'NEEDS_ATTENTION' && new_health_status !== 'NOT_WORKING') {
            return;
        }

        const plant_id = asset.plant_id;
        const user_ids = await get_users_for_plant(plant_id);
        const priority = new_health_status === 'NOT_WORKING' ? 'CRITICAL' : 'HIGH';

        for (const user_id of user_ids) {
            await createNotification({
                type: 'ASSET_ALERT',
                category: 'ALERT',
                priority,
                title: `Asset Alert: ${asset.asset_code}`,
                message: `Asset ${asset.asset_code} health status changed to ${new_health_status}`,
                user_id: user_id,
                related_entity_type: 'Asset',
                related_entity_id: asset.id,
                action_url: `/admin/assets?mode=view&id=${asset.id}`,
                is_actionable: true,
                triggered_by: changed_by,
                notification_source: 'SYSTEM'
            });
        }
    } catch (error) {
        console.error('Error sending asset health notification:', error);
    }
};

// Export all functions
module.exports = {
    // Core functions
    createNotification,
    getNotifications,
    getNotificationCounts,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    cleanupExpiredNotifications,
    createBulkNotifications,
    getNotificationById,
    mark_action_taken,

    // Generators
    generateSuccessNotification,
    generateReminderNotification,
    generateAlertNotification,

    // Helper functions
    calculateExpiryDate,
    get_users_for_plant, // Added this back as it was in the original export and used by other functions

    // Service Integration Helpers
    notify_service_approved,
    notify_service_rejected,
    notify_incident_created,
    notify_incident_team_assigned,
    notify_ticket_created,
    notify_ticket_assigned,
    notify_asset_health_critical,

    // Export constants
    UNREAD_EXPIRY_DAYS,
    READ_EXPIRY_DAYS
};
