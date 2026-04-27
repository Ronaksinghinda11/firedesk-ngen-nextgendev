/**
 * Technician Auto-Assignment Scheduler
 *
 * Runs daily at 9:00 AM (Asia/Kolkata) to automatically assign technicians
 * to services scheduled 7 days from now
 */

const cron = require("node-cron");
const technicianAssignmentService = require("../services/scheduler/technicianAssignmentService");

/**
 * Daily task to auto-assign technicians to upcoming services
 * Runs at 9:00 AM every day (Asia/Kolkata timezone)
 */
const autoAssignTechniciansTask = async () => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🤖 Starting Daily Technician Auto-Assignment');
        console.log(`📅 ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Auto-assign technicians to services scheduled 7 days from now
        const result = await technicianAssignmentService.autoAssignTechniciansForUpcomingServices(7);

        if (result.success) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✅ Auto-Assignment Summary:');
            console.log('\n📋 SERVICES:');
            console.log(`   Total Services Found: ${result.totalServices}`);
            console.log(`   Successfully Assigned: ${result.assignedCount}`);
            console.log(`   Failed to Assign: ${result.failedCount}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } else {
            console.error('❌ Auto-Assignment Failed:', result.error);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }

        return result;
    } catch (error) {
        console.error('❌ Error in auto-assignment scheduler:', error);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return { success: false, error: error.message };
    }
};

/**
 * Initialize the scheduler
 * Cron expression: "0 9 * * *" = 9:00 AM every day
 * Timezone: Asia/Kolkata (IST)
 */
const initScheduler = () => {
    console.log('🚀 Initializing Technician Auto-Assignment Scheduler');
    console.log('📅 Schedule: Daily at 9:00 AM (Asia/Kolkata)');
    console.log('🎯 Target: Services scheduled 7 days from now\n');

    // Schedule the task to run daily at 9:00 AM IST
    cron.schedule("0 9 * * *", autoAssignTechniciansTask, {
        timezone: "Asia/Kolkata",
        scheduled: true
    });

    console.log('✅ Technician Auto-Assignment Scheduler initialized successfully\n');
};

/**
 * Run assignment immediately (for testing or manual trigger)
 * @param {number} daysAhead - Optional number of days ahead to look for services (default: 7)
 * @returns {Promise<Object>} Result of assignment
 */
const runNow = async (daysAhead = 7) => {
    console.log('🧪 Running technician auto-assignment immediately (manual trigger)...\n');
    return await technicianAssignmentService.autoAssignTechniciansForUpcomingServices(daysAhead);
};

/**
 * Get status of the scheduler
 * @returns {Object} Scheduler status information
 */
const getSchedulerStatus = () => {
    return {
        name: 'Technician Auto-Assignment Scheduler',
        schedule: '0 9 * * * (Daily at 9:00 AM)',
        timezone: 'Asia/Kolkata',
        target: 'Services scheduled 7 days ahead',
        status: 'active'
    };
};

module.exports = {
    initScheduler,
    runNow,
    getSchedulerStatus,
    autoAssignTechniciansTask
};
