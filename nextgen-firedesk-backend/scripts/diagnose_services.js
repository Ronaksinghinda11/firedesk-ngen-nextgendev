/**
 * Diagnostic: Show what's in the service_submissions table
 */
const { sequelize } = require('../config/config');
const { QueryTypes } = require('sequelize');

async function diagnose() {
    try {
        // Count all services by status
        const statusCounts = await sequelize.query(`
            SELECT status, COUNT(*)::int AS count
            FROM service_submissions
            GROUP BY status
            ORDER BY count DESC
        `, { type: QueryTypes.SELECT });

        console.log('\n=== All services by status ===');
        statusCounts.forEach(r => console.log(`  ${r.status}: ${r.count}`));

        // Count future services by status
        const futureCounts = await sequelize.query(`
            SELECT status, COUNT(*)::int AS count
            FROM service_submissions
            WHERE scheduled_date >= CURRENT_DATE
            GROUP BY status
            ORDER BY count DESC
        `, { type: QueryTypes.SELECT });

        console.log('\n=== Future services (>= today) by status ===');
        futureCounts.forEach(r => console.log(`  ${r.status}: ${r.count}`));

        // Show date range of services
        const dateRange = await sequelize.query(`
            SELECT 
                MIN(scheduled_date)::text AS min_date,
                MAX(scheduled_date)::text AS max_date,
                COUNT(*)::int AS total
            FROM service_submissions
        `, { type: QueryTypes.SELECT });

        console.log('\n=== Date range ===');
        console.log(`  From: ${dateRange[0].min_date}`);
        console.log(`  To: ${dateRange[0].max_date}`);
        console.log(`  Total: ${dateRange[0].total}`);

        // Show sample non-cancelled services around today
        const samples = await sequelize.query(`
            SELECT id, submission_number, status, scheduled_date::text, inspection_type, schedule_id
            FROM service_submissions
            WHERE status NOT IN ('cancelled', 'CANCELLED', 'Cancelled')
            ORDER BY scheduled_date DESC
            LIMIT 15
        `, { type: QueryTypes.SELECT });

        console.log('\n=== Sample non-cancelled services (most recent first) ===');
        samples.forEach(s => {
            console.log(`  [${s.status}] ${s.submission_number || s.id} | ${s.inspection_type} | date: ${s.scheduled_date} | scheduler: ${s.schedule_id || 'NULL'}`);
        });

        // Check scheduler count
        const schedulerCount = await sequelize.query(`
            SELECT COUNT(*)::int AS count FROM maintenance_schedulers
        `, { type: QueryTypes.SELECT });
        console.log(`\n=== Schedulers: ${schedulerCount[0].count} ===`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

diagnose();
