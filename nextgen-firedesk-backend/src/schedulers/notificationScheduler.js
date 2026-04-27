/**
 * Notification Scheduler
 * Cron jobs for generating service due reminders and cleaning up expired notifications
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const notificationService = require('../services/notifications/notificationService');

// Scheduler status
let schedulerStatus = {
    isRunning: false,
    lastRun: null,
    lastCleanup: null,
    remindersGenerated: 0,
    cleanupCount: 0
};

/**
 * Lazy load models to avoid crashes if models don't exist
 */
const getModels = () => {
    try {
        const Asset = require('../models/assets/Asset');
        const AssetTestingSchedule = require('../models/assets/asset_testing_schedule');
        const ServiceSubmission = require('../models/service-form/ServiceSubmission');
        const Notification = require('../models/notifications/Notification');
        const { User, Manager, Technician, PlantManager, TechnicianPlant } = require('../models/user-management');
        return {
            Asset,
            AssetTestingSchedule,
            ServiceSubmission,
            Notification,
            User,
            Manager,
            Technician,
            PlantManager,
            TechnicianPlant
        };
    } catch (error) {
        console.error('Error loading models:', error.message);
        return null;
    }
};

/**
 * Generate HP Test due reminders
 * Runs daily and creates notifications for HP tests due in 7 days
 */
const generateHPTestDueReminders = async () => {
    console.log('📢 Starting HP test due reminder generation...');

    try {
        const models = getModels();
        if (!models) {
            console.log('   ⚠️ Skipping - required models not available');
            return;
        }

        const { Asset, AssetTestingSchedule } = models;
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(oneWeekFromNow);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(oneWeekFromNow);
        endOfDay.setHours(23, 59, 59, 999);

        // Find testing schedules with HP tests due in one week
        const schedules = await AssetTestingSchedule.findAll({
            where: {
                next_hp_test_due_date: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            },
            attributes: ['id', 'asset_id', 'next_hp_test_due_date']
        });

        console.log(`   Found ${schedules.length} assets with HP tests due in 7 days`);

        let notificationsCreated = 0;

        for (const schedule of schedules) {
            // Get asset details separately
            const asset = await Asset.findByPk(schedule.asset_id, {
                attributes: ['id', 'asset_code', 'plant_id']
            });

            if (!asset) continue;

            const plantId = asset.plant_id;
            const userIds = await getUsersForPlant(plantId);

            if (userIds.length === 0) continue;

            for (const userId of userIds) {
                // Check if notification already exists
                const existingNotification = await checkExistingReminder(
                    userId,
                    'HP_TEST_DUE',
                    asset.id
                );

                if (existingNotification) continue;

                await notificationService.createNotification({
                    type: 'HP_TEST_DUE',
                    category: 'REMAINDER',
                    priority: 'HIGH', // HP tests are typically important
                    title: 'HP Test Due',
                    message: `Asset ${asset.asset_code} has an HP test due in 7 days on ${new Date(schedule.next_hp_test_due_date).toLocaleDateString()}.`,
                    user_id: userId,
                    related_entity_type: 'Asset',
                    related_entity_id: asset.id,
                    action_url: `/admin/assets?mode=view&id=${asset.id}`,
                    is_actionable: true,
                    notification_source: 'SCHEDULER'
                });

                notificationsCreated++;
            }
        }

        schedulerStatus.remindersGenerated += notificationsCreated;
        console.log(`   ✅ Generated ${notificationsCreated} HP test due reminder notifications`);

    } catch (error) {
        console.error('❌ Error generating HP test due reminders:', error);
    }
};

/**
 * Generate refill due reminders
 * Runs daily and creates notifications for refills due in 7 days  
 */
const generateRefillDueReminders = async () => {
    console.log('📢 Starting refill due reminder generation...');

    try {
        const models = getModels();
        if (!models) {
            console.log('   ⚠️ Skipping - required models not available');
            return;
        }

        const { Asset, AssetTestingSchedule } = models;
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(oneWeekFromNow);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(oneWeekFromNow);
        endOfDay.setHours(23, 59, 59, 999);

        // Find testing schedules with refills due in one week
        const schedules = await AssetTestingSchedule.findAll({
            where: {
                next_refill_date: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            },
            attributes: ['id', 'asset_id', 'next_refill_date']
        });

        console.log(`   Found ${schedules.length} assets with refills due in 7 days`);

        let notificationsCreated = 0;

        for (const schedule of schedules) {
            // Get asset details separately
            const asset = await Asset.findByPk(schedule.asset_id, {
                attributes: ['id', 'asset_code', 'plant_id']
            });

            if (!asset) continue;

            const plantId = asset.plant_id;
            const userIds = await getUsersForPlant(plantId);

            if (userIds.length === 0) continue;

            for (const userId of userIds) {
                // Check if notification already exists
                const existingNotification = await checkExistingReminder(
                    userId,
                    'SERVICE_DUE',
                    asset.id
                );

                if (existingNotification) continue;

                await notificationService.createNotification({
                    type: 'SERVICE_DUE',
                    category: 'REMAINDER',
                    priority: 'MEDIUM',
                    title: 'Refill Due',
                    message: `Asset ${asset.asset_code} has a refill due in 7 days on ${new Date(schedule.next_refill_date).toLocaleDateString()}.`,
                    user_id: userId,
                    related_entity_type: 'Asset',
                    related_entity_id: asset.id,
                    action_url: `/admin/assets?mode=view&id=${asset.id}`,
                    is_actionable: true,
                    notification_source: 'SCHEDULER'
                });

                notificationsCreated++;
            }
        }

        schedulerStatus.remindersGenerated += notificationsCreated;
        console.log(`   ✅ Generated ${notificationsCreated} refill due reminder notifications`);

    } catch (error) {
        console.error('❌ Error generating refill due reminders:', error);
    }
};

/**
 * Generate scheduled service reminders
 * Finds services scheduled for 7 days from now and notifies assigned technicians/managers
 */
const generate_scheduled_service_reminders = async () => {
    console.log('📢 Starting scheduled service reminder generation...');

    try {
        const models = getModels();
        if (!models) {
            console.log('   ⚠️ Skipping - required models not available');
            return;
        }

        const { ServiceSubmission, Asset, Technician, User } = models;

        const now = new Date();
        const seven_days_later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const start_of_day = new Date(now);
        start_of_day.setHours(0, 0, 0, 0);
        const end_of_day = new Date(seven_days_later);
        end_of_day.setHours(23, 59, 59, 999);

        // Find services scheduled in the next 7 days that are NOT completed/cancelled/submitted
        const scheduled_services = await ServiceSubmission.findAll({
            where: {
                scheduled_date: {
                    [Op.between]: [start_of_day, end_of_day]
                },
                // Include services with these statuses (or null/draft/in_progress/pending)
                [Op.or]: [
                    { status: { [Op.in]: ['draft', 'pending', 'in_progress', 'PENDING', 'DRAFT', 'IN_PROGRESS'] } },
                    { status: { [Op.is]: null } }
                ]
            },
            include: [{
                model: Asset,
                as: 'asset',
                attributes: ['id', 'asset_code', 'plant_id']
            }]
        });

        console.log(`   Found ${scheduled_services.length} services scheduled in the next 7 days`);

        let notifications_created = 0;

        for (const service of scheduled_services) {
            const user_ids = new Set();
            let asset_code = 'N/A';
            let plant_id = null;

            // Asset is already included
            if (service.asset) {
                asset_code = service.asset.asset_code;
                plant_id = service.asset.plant_id;
            } else if (service.asset_id) {
                // Fallback manual fetch if include fails (unlikely with fix) or for robustness
                const asset = await Asset.findByPk(service.asset_id, {
                    attributes: ['id', 'asset_code', 'plant_id']
                });
                if (asset) {
                    asset_code = asset.asset_code;
                    plant_id = asset.plant_id;
                }
            }

            // Manual fetch of Technician -> User
            if (service.technician_id) {
                const technician = await Technician.findByPk(service.technician_id, {
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name']
                    }]
                });

                if (technician?.user?.id) {
                    user_ids.add(technician.user.id);
                }
            }

            // Also notify plant managers
            if (plant_id) {
                const plant_users = await notificationService.get_users_for_plant(plant_id);
                plant_users.forEach(id => user_ids.add(id));
            }

            const serviceType = service.inspection_type || service.frequency || 'Service'; // e.g. Inspection, Monthly

            for (const user_id of user_ids) {
                // Check if notification already exists
                const existing = await checkExistingReminder(
                    user_id,
                    'SERVICE_DUE',
                    service.id
                );

                if (existing) continue;

                await notificationService.createNotification({
                    type: 'SERVICE_DUE',
                    category: 'REMAINDER',
                    priority: 'MEDIUM',
                    title: `${serviceType} due for ${asset_code}`,
                    message: `${serviceType} for asset ${asset_code} is scheduled on ${new Date(service.scheduled_date).toLocaleDateString()}.`,
                    user_id: user_id,
                    related_entity_type: 'ServiceSubmission',
                    related_entity_id: service.id,
                    action_url: `/admin/service-forms/submissions?id=${service.id}`,
                    is_actionable: true,
                    notification_source: 'SCHEDULER'
                });

                notifications_created++;
            }
        }

        schedulerStatus.remindersGenerated += notifications_created;
        console.log(`   ✅ Generated ${notifications_created} scheduled service reminder notifications`);

    } catch (error) {
        console.error('❌ Error generating scheduled service reminders:', error);
    }
};

/**
 * Generate notifications for services DUE TODAY
 * Runs at 6 AM IST daily
 */
const generate_services_due_today = async () => {
    console.log('📢 [6 AM] Generating notifications for services due today...');

    try {
        const models = getModels();
        if (!models) {
            console.log('   ⚠️ Skipping - required models not available');
            return;
        }

        const { ServiceSubmission, Asset } = models;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`   🔍 Searching for services scheduled between ${today.toISOString()} and ${endOfDay.toISOString()}`);

        // Find services due today that are not completed/approved/rejected/cancelled
        const dueServices = await ServiceSubmission.findAll({
            where: {
                scheduled_date: {
                    [Op.between]: [today, endOfDay]
                },
                status: {
                    [Op.notIn]: ['approved', 'rejected', 'cancelled', 'completed']
                }
            },
            include: [{
                model: Asset,
                as: 'asset',
                attributes: ['id', 'asset_code', 'plant_id']
            }]
        });

        console.log(`   Found ${dueServices.length} services due today`);

        let notifications_created = 0;

        for (const service of dueServices) {
            if (!service.asset) {
                console.log(`   ⚠️ Skipping service ${service.id} - no asset found`);
                continue;
            }

            const plant_id = service.asset.plant_id;
            const user_ids = await notificationService.get_users_for_plant(plant_id);

            for (const user_id of user_ids) {
                // Check if notification already exists (avoid duplicates)
                const existing = await checkExistingReminder(
                    user_id,
                    'SERVICE_DUE',
                    service.id
                );

                if (existing) continue;

                await notificationService.createNotification({
                    type: 'SERVICE_DUE',
                    category: 'REMAINDER',
                    priority: 'MEDIUM',
                    title: `Service Due Today: ${service.asset.asset_code}`,
                    message: `Service ${service.submission_number || service.id} for asset ${service.asset.asset_code} is scheduled for today (${service.inspection_type || 'Service'}).`,
                    user_id: user_id,
                    related_entity_type: 'ServiceSubmission',
                    related_entity_id: service.id,
                    action_url: `/admin/service-forms/submissions?id=${service.id}`,
                    is_actionable: true,
                    notification_source: 'SCHEDULER'
                });

                notifications_created++;
            }
        }

        schedulerStatus.remindersGenerated += notifications_created;
        console.log(`   ✅ Generated ${notifications_created} "due today" notifications`);

    } catch (error) {
        console.error('❌ Error generating services due today notifications:', error);
        console.error('   Stack trace:', error.stack);
    }
};

/**
 * Generate notifications for services LAPSED (overdue from any past date)
 * Runs at 6 AM IST daily
 */
const generate_services_lapsed = async () => {
    console.log('📢 [6 AM] Generating notifications for lapsed (overdue) services...');

    try {
        const models = getModels();
        if (!models) {
            console.log('   ⚠️ Skipping - required models not available');
            return;
        }

        const { ServiceSubmission, Asset, Notification } = models;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log(`   🔍 Searching for services scheduled before ${today.toISOString()}`);

        // Find ALL services where the full submission window has lapsed that are NOT completed/approved/rejected/cancelled
        const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const lapsedServices = await ServiceSubmission.findAll({
            where: {
                [Op.and]: [
                    ServiceSubmission.sequelize.literal(`"ServiceSubmission"."scheduled_date" + (
                        SELECT CASE LOWER(f.frequency_name)
                            WHEN 'daily' THEN 1 WHEN 'weekly' THEN 7 WHEN 'fortnightly' THEN 14
                            WHEN 'monthly' THEN 30 WHEN 'bi-monthly' THEN 60 WHEN 'quarterly' THEN 90
                            WHEN 'half-yearly' THEN 180 WHEN 'semi-annually' THEN 180
                            WHEN 'annually' THEN 365 WHEN 'yearly' THEN 365 ELSE 30
                        END FROM inspection_frequencies f WHERE f.id = "ServiceSubmission"."frequency_id"
                    ) * INTERVAL '1 day' < '${todayStr}'`)
                ],
                status: {
                    [Op.notIn]: ['approved', 'rejected', 'cancelled', 'completed']
                }
            },
            include: [{
                model: Asset,
                as: 'asset',
                attributes: ['id', 'asset_code', 'plant_id']
            }]
        });

        console.log(`   Found ${lapsedServices.length} lapsed (overdue) services`);

        let notifications_created = 0;

        for (const service of lapsedServices) {
            if (!service.asset) {
                console.log(`   ⚠️ Skipping service ${service.id} - no asset found`);
                continue;
            }

            const plant_id = service.asset.plant_id;
            const user_ids = await notificationService.get_users_for_plant(plant_id);

            // Calculate how many days overdue
            const scheduledDate = new Date(service.scheduled_date);
            const daysOverdue = Math.floor((today - scheduledDate) / (1000 * 60 * 60 * 24));

            for (const user_id of user_ids) {
                // For lapsed services, check for recent notifications to avoid daily duplicates
                // Only create one notification per service per user within last 24 hours
                const existingNotif = await Notification.findOne({
                    where: {
                        user_id: user_id,
                        type: 'SERVICE_DUE',
                        related_entity_id: service.id,
                        category: 'ALERT', // Lapsed notifications have ALERT category
                        // Notification created within last 24 hours
                        created_at: {
                            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    }
                });

                if (existingNotif) continue;

                // Priority escalation: 7+ days = CRITICAL, otherwise HIGH
                const priority = daysOverdue > 7 ? 'CRITICAL' : 'HIGH';

                await notificationService.createNotification({
                    type: 'SERVICE_DUE',
                    category: 'ALERT',
                    priority: priority,
                    title: `Service OVERDUE: ${service.asset.asset_code}`,
                    message: `Service ${service.submission_number || service.id} for asset ${service.asset.asset_code} was due ${daysOverdue} day(s) ago and is now OVERDUE.`,
                    user_id: user_id,
                    related_entity_type: 'ServiceSubmission',
                    related_entity_id: service.id,
                    action_url: `/admin/service-forms/submissions?id=${service.id}`,
                    is_actionable: true,
                    notification_source: 'SCHEDULER'
                });

                notifications_created++;
            }
        }

        schedulerStatus.remindersGenerated += notifications_created;
        console.log(`   ✅ Generated ${notifications_created} "lapsed" notifications`);

    } catch (error) {
        console.error('❌ Error generating lapsed service notifications:', error);
        console.error('   Stack trace:', error.stack);
    }
};

/**
 * Cleanup expired notifications
 * Runs every 6 hours
 */
const cleanupExpiredNotifications = async () => {
    console.log('🧹 Starting expired notifications cleanup...');

    try {
        const deleted = await notificationService.cleanupExpiredNotifications();
        schedulerStatus.cleanupCount += deleted;
        schedulerStatus.lastCleanup = new Date();
        console.log(`   ✅ Cleaned up ${deleted} expired notifications`);
    } catch (error) {
        console.error('❌ Error cleaning up notifications:', error);
    }
};

/**
 * Helper: Get all users (managers + technicians) assigned to a plant
 * @param {string} plantId - Plant ID
 * @returns {Promise<Array>} Array of user IDs
 */
const getUsersForPlant = async (plantId) => {
    try {
        const models = getModels();
        if (!models) {
            console.log('   ⚠️ Models not available for getUsersForPlant');
            return [];
        }

        const { User, Manager, Technician, PlantManager, TechnicianPlant } = models;
        const { Role } = require('../models/user-management');
        const userIds = new Set();

        // Include ALL admin users (admins should see all notifications)
        try {
            const adminRole = await Role.findOne({ where: { name: 'Admin' } });
            if (adminRole) {
                const adminUsers = await User.findAll({
                    where: { role_id: adminRole.id, status: 'Active' },
                    attributes: ['id']
                });
                adminUsers.forEach(u => userIds.add(u.id));
            }
        } catch (e) {
            console.error('[getUsersForPlant] Error fetching admin users:', e.message);
        }

        // Get managers for this plant
        const plantManagers = await PlantManager.findAll({
            where: { plant_id: plantId },
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

        plantManagers.forEach(pm => {
            if (pm.manager?.user?.id) {
                userIds.add(pm.manager.user.id);
            }
        });

        // Get technicians for this plant
        const plantTechnicians = await TechnicianPlant.findAll({
            where: { plant_id: plantId },
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

        plantTechnicians.forEach(pt => {
            if (pt.technician?.user?.id) {
                userIds.add(pt.technician.user.id);
            }
        });

        return Array.from(userIds);
    } catch (error) {
        console.error('Error getting users for plant:', error);
        return [];
    }
};

/**
 * Helper: Check if a reminder notification already exists
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} entityId - Related entity ID
 * @param {string} additionalId - Additional ID for uniqueness
 * @returns {Promise<boolean>} Whether notification exists
 */
const checkExistingReminder = async (userId, type, entityId, additionalId = null) => {
    try {
        const Notification = require('../models/notifications/Notification');

        const where = {
            user_id: userId,
            type,
            related_entity_id: entityId,
            category: 'REMAINDER'
        };

        const existing = await Notification.findOne({ where });
        return !!existing;
    } catch (error) {
        console.error('Error checking existing reminder:', error);
        return false;
    }
};

/**
 * Run all reminder generation tasks
 */
const runAllReminders = async () => {
    console.log('\n' + '━'.repeat(50));
    console.log('🔔 Running Notification Scheduler Tasks');
    console.log('━'.repeat(50));

    schedulerStatus.isRunning = true;
    const startTime = Date.now();

    try {
        await generateHPTestDueReminders();
        await generateRefillDueReminders();
        await generate_scheduled_service_reminders();
    } catch (error) {
        console.error('Error in reminder generation:', error);
    }

    schedulerStatus.isRunning = false;
    schedulerStatus.lastRun = new Date();

    const duration = Date.now() - startTime;
    console.log(`\n✅ Notification scheduler completed in ${duration}ms`);
    console.log('━'.repeat(50) + '\n');
};

/**
 * Initialize the notification scheduler
 */
const initScheduler = () => {
    console.log('⏰ Initializing Notification Scheduler...');

    // Daily at 6:00 AM IST for services due today + lapsed (overdue)
    cron.schedule('0 6 * * *', async () => {
        console.log('🔔 [6 AM] Running daily service notifications (due today + overdue)');
        await generate_services_due_today();
        await generate_services_lapsed();
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Daily at 7:00 AM IST for 7-day ahead reminders
    cron.schedule('0 7 * * *', async () => {
        console.log('🔔 [7 AM] Running daily 7-day ahead reminders');
        await generateHPTestDueReminders();
        await generateRefillDueReminders();
        await generate_scheduled_service_reminders();
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Run cleanup every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        console.log('🧹 Running scheduled cleanup (every 6 hours)');
        await cleanupExpiredNotifications();
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('   ✅ 6 AM: Services due today + overdue services');
    console.log('   ✅ 7 AM: 7-day ahead reminders (HP tests, refills, services)');
    console.log('   ✅ Cleanup: Every 6 hours');

    // Optional: Run immediately on startup for testing (comment out in production)
    // setTimeout(() => runAllReminders(), 3000);
};

/**
 * Get scheduler status
 * @returns {Object} Scheduler status
 */
const getSchedulerStatus = () => ({
    name: 'Notification Scheduler',
    ...schedulerStatus
});

/**
 * Manually trigger reminder generation
 * @returns {Promise<void>}
 */
const triggerManualRun = async () => {
    if (schedulerStatus.isRunning) {
        throw new Error('Scheduler is already running');
    }
    await runAllReminders();
};

module.exports = {
    initScheduler,
    getSchedulerStatus,
    triggerManualRun,
    generateHPTestDueReminders,
    generateRefillDueReminders,
    generate_scheduled_service_reminders,
    generate_services_due_today,
    generate_services_lapsed,
    cleanupExpiredNotifications,
    runAllReminders
};
