/**
 * Test script to verify service generation for multiple frequencies
 * Run with: node scripts/test_service_generation.js
 */

require('dotenv').config();

const schedulerService = require('../src/services/scheduler/schedulerService');

async function testServiceGeneration() {
    console.log('=== Testing Service Generation ===\n');

    try {
        // Get all schedulers
        const schedulers = await schedulerService.getAllSchedulers();
        console.log(`Found ${schedulers.length} scheduler(s)\n`);

        for (const scheduler of schedulers) {
            console.log(`\nScheduler: ${scheduler.id}`);
            console.log(`  Plant ID: ${scheduler.plant_id}`);
            console.log(`  Category ID: ${scheduler.category_id}`);
            console.log(`  Inspection Frequency: ${scheduler.inspection_frequency}`);
            console.log(`  Testing Frequency: ${scheduler.testing_frequency}`);
            console.log(`  Maintenance Frequency: ${scheduler.maintenance_frequency}`);
            console.log(`  Date Range: ${scheduler.schedule_start_date} to ${scheduler.schedule_end_date}`);

            console.log('\n  Generating services...');
            const result = await schedulerService.generateServicesForPlant(scheduler.plant_id, scheduler.id);
            console.log(`  Result: ${JSON.stringify(result, null, 2)}`);
        }

        // Verify counts
        const { sequelize } = require('../config/config');
        const [results] = await sequelize.query(`
            SELECT f.frequency_name, ss.inspection_type, COUNT(*) as count
            FROM service_submissions ss 
            JOIN inspection_frequencies f ON ss.frequency_id = f.id 
            WHERE ss.status != 'cancelled'
            GROUP BY f.frequency_name, ss.inspection_type 
            ORDER BY f.frequency_name, ss.inspection_type
        `);

        console.log('\n=== Service Count by Frequency ===');
        console.table(results);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testServiceGeneration();
