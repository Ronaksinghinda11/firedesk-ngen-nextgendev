/**
 * Migration: Add Indexes for Calendar Performance
 * Date: 2026-01-20
 * 
 * Adds critical indexes for service_submissions table to enable
 * fast queries with lakhs of records.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Add Calendar Indexes Migration...\n');

    try {
        await sequelize.authenticate();

        console.log('📋 Adding indexes to service_submissions table...');

        // Index on scheduled_date for date-range queries
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_service_submissions_scheduled_date 
            ON service_submissions(scheduled_date);
        `);
        console.log('   ✅ idx_service_submissions_scheduled_date');

        // Index on status for filtering
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_service_submissions_status 
            ON service_submissions(status);
        `);
        console.log('   ✅ idx_service_submissions_status');

        // Index on plant_id for plant filtering
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_service_submissions_plant_id 
            ON service_submissions(plant_id);
        `);
        console.log('   ✅ idx_service_submissions_plant_id');

        // Index on approval_status for filtering
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_service_submissions_approval_status 
            ON service_submissions(approval_status);
        `);
        console.log('   ✅ idx_service_submissions_approval_status');

        // Composite index for the most common calendar queries
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_service_submissions_calendar 
            ON service_submissions(scheduled_date, status, plant_id);
        `);
        console.log('   ✅ idx_service_submissions_calendar (composite)');

        // Index on technician_id for technician-specific queries
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_service_submissions_technician_id 
            ON service_submissions(technician_id);
        `);
        console.log('   ✅ idx_service_submissions_technician_id');

        console.log('\n📋 Adding indexes to tickets table...');

        // Index on target_date for date-range queries
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_tickets_target_date 
            ON tickets(target_date);
        `);
        console.log('   ✅ idx_tickets_target_date');

        // Index on completed_status for filtering
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_tickets_completed_status 
            ON tickets(completed_status);
        `);
        console.log('   ✅ idx_tickets_completed_status');

        // Index on plant_id for tickets
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_tickets_plant_id 
            ON tickets(plant_id);
        `);
        console.log('   ✅ idx_tickets_plant_id');

        console.log('\n✅ Add Calendar Indexes Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Add Calendar Indexes Migration...\n');

    try {
        await sequelize.authenticate();

        await sequelize.query(`DROP INDEX IF EXISTS idx_service_submissions_scheduled_date;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_service_submissions_status;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_service_submissions_plant_id;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_service_submissions_approval_status;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_service_submissions_calendar;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_service_submissions_technician_id;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_tickets_target_date;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_tickets_completed_status;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_tickets_plant_id;`);
        console.log('   ✅ Dropped all indexes');

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
