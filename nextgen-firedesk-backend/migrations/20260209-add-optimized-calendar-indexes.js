/**
 * Migration: Add Optimized Composite Indexes for Calendar Performance (Fix #5)
 * Date: 2026-02-09
 *
 * Adds composite indexes aligned with actual calendar query patterns.
 * Column order matters — these match the WHERE clause patterns used
 * by calendarService.js for due/lapsed/pending/cancelled/unassigned queries.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Add Optimized Calendar Indexes Migration...\n');

    try {
        await sequelize.authenticate();

        console.log('📋 Adding optimized composite indexes to service_submissions...');

        // For Due/Lapsed queries: status first (equality), then date range, then plant
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_svc_status_date_plant 
            ON service_submissions(status, scheduled_date, plant_id);
        `);
        console.log('   ✅ idx_svc_status_date_plant (due/lapsed queries)');

        // For Pending approval queries: status + approval_status + plant
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_svc_status_approval 
            ON service_submissions(status, approval_status, plant_id);
        `);
        console.log('   ✅ idx_svc_status_approval (pending approval queries)');

        // For Unassigned queries: technician_id IS NULL + status + date
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_svc_technician_status_date 
            ON service_submissions(technician_id, status, scheduled_date);
        `);
        console.log('   ✅ idx_svc_technician_status_date (unassigned queries)');

        // Partial index for cancelled queries with ordering
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_svc_cancelled_at_partial
            ON service_submissions(cancelled_at DESC, plant_id) 
            WHERE status = 'cancelled';
        `);
        console.log('   ✅ idx_svc_cancelled_at_partial (cancelled queries)');

        console.log('\n📋 Adding optimized indexes to service_technicians...');

        // For technician calendar: junction table lookups
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_svc_tech_technician_service 
            ON service_technicians(technician_id, service_id);
        `);
        console.log('   ✅ idx_svc_tech_technician_service (technician calendar)');

        console.log('\n📋 Adding optimized indexes to tickets...');

        // For ticket status counts per plant
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_tickets_status_plant 
            ON tickets(completed_status, plant_id);
        `);
        console.log('   ✅ idx_tickets_status_plant (ticket statistics)');

        // For ticket date + plant queries  
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_tickets_date_plant 
            ON tickets(target_date, plant_id);
        `);
        console.log('   ✅ idx_tickets_date_plant (ticket calendar)');

        // For technician-specific ticket lookups
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_tickets_technician_status
            ON tickets(technician_id, completed_status);
        `);
        console.log('   ✅ idx_tickets_technician_status (technician ticket stats)');

        console.log('\n✅ Optimized Calendar Indexes Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Optimized Calendar Indexes Migration...\n');

    try {
        await sequelize.authenticate();

        await sequelize.query(`DROP INDEX IF EXISTS idx_svc_status_date_plant;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_svc_status_approval;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_svc_technician_status_date;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_svc_cancelled_at_partial;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_svc_tech_technician_service;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_tickets_status_plant;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_tickets_date_plant;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_tickets_technician_status;`);
        console.log('   ✅ Dropped all optimized indexes');

        console.log('\n✅ Rollback completed!');
    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    const action = process.argv[2] || 'up';

    (async () => {
        try {
            if (action === 'down') {
                await down();
            } else {
                await up();
            }
        } catch (error) {
            console.error('Fatal error:', error.message);
            process.exit(1);
        } finally {
            await sequelize.close();
            process.exit(0);
        }
    })();
}

module.exports = { up, down };
