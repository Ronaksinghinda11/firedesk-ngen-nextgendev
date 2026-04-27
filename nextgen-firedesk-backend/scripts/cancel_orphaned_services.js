/**
 * Cancel All Future Non-Terminal Services
 * 
 * Since all schedulers have been deleted, this cancels every future service
 * that is still in a non-terminal status (PENDING, assigned, due, draft, etc.)
 * 
 * Usage: node scripts/cancel_orphaned_services.js [--dry-run]
 *   --dry-run   Show what would be cancelled without making changes
 */

const { sequelize } = require('../config/config');
const { QueryTypes } = require('sequelize');

async function cancelFutureServices() {
    const isDryRun = process.argv.includes('--dry-run');
    const today = new Date().toISOString().split('T')[0];

    console.log('='.repeat(60));
    console.log('Cancel All Future Non-Terminal Services');
    console.log(isDryRun ? '  MODE: DRY RUN (no changes will be made)' : '  MODE: LIVE (changes will be committed)');
    console.log(`  Today: ${today}`);
    console.log('='.repeat(60));

    try {
        // Step 1: Find all future services in non-terminal status
        const futureServices = await sequelize.query(`
            SELECT 
                id,
                submission_number,
                status,
                scheduled_date,
                schedule_id,
                inspection_type,
                asset_id
            FROM service_submissions
            WHERE scheduled_date >= :today
              AND status NOT IN ('cancelled', 'CANCELLED', 'Cancelled', 'approved', 'rejected', 'submitted')
            ORDER BY scheduled_date ASC
        `, { replacements: { today }, type: QueryTypes.SELECT });

        console.log(`\nFound ${futureServices.length} future non-terminal services.\n`);

        if (futureServices.length === 0) {
            console.log('Nothing to do.');
            return;
        }

        // Show summary by status
        const statusCounts = {};
        futureServices.forEach(s => {
            statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
        });
        console.log('Breakdown by status:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });

        // Show first few
        console.log('\nSample services to cancel:');
        futureServices.slice(0, 10).forEach(s => {
            console.log(`  [${s.status}] ${s.submission_number || s.id} | ${s.inspection_type} | scheduled: ${s.scheduled_date}`);
        });
        if (futureServices.length > 10) {
            console.log(`  ... and ${futureServices.length - 10} more`);
        }

        if (isDryRun) {
            console.log('\n🔍 DRY RUN complete. Run without --dry-run to apply changes.');
            return;
        }

        // Step 2: Cancel them
        await sequelize.query(`
            UPDATE service_submissions
            SET status = 'cancelled',
                cancelled_reason = 'All schedulers deleted - bulk cleanup'
            WHERE scheduled_date >= :today
              AND status NOT IN ('cancelled', 'CANCELLED', 'Cancelled', 'approved', 'rejected', 'submitted')
        `, { replacements: { today }, type: QueryTypes.UPDATE });

        console.log(`\n✅ Successfully cancelled ${futureServices.length} future services.`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await sequelize.close();
        console.log('\nDatabase connection closed.');
    }
}

cancelFutureServices();
