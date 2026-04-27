/**
 * Schedulers Index
 * Export all cron-based schedulers for initialization on server startup
 */

const technicianAutoAssignment = require('./technicianAutoAssignment');
const notificationScheduler = require('./notificationScheduler');
const complianceScoreScheduler = require('./complianceScoreScheduler');

/**
 * Initialize all schedulers
 * Call this function after database connection is established
 */
const initAllSchedulers = () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🕐 Initializing All Cron Schedulers');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Initialize technician auto-assignment scheduler
    technicianAutoAssignment.initScheduler();

    // Initialize notification scheduler
    notificationScheduler.initScheduler();

    // Initialize compliance score scheduler
    complianceScoreScheduler.initScheduler();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All Schedulers Initialized Successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

/**
 * Get status of all schedulers
 * @returns {Array} Array of scheduler status objects
 */
const getAllSchedulerStatuses = () => {
    return [
        technicianAutoAssignment.getSchedulerStatus(),
        notificationScheduler.getSchedulerStatus(),
        complianceScoreScheduler.getSchedulerStatus()
    ];
};

module.exports = {
    technicianAutoAssignment,
    notificationScheduler,
    complianceScoreScheduler,
    initAllSchedulers,
    getAllSchedulerStatuses
};
