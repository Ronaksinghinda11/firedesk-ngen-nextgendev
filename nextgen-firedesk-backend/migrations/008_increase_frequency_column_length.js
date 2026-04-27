/**
 * Migration: Increase Scheduler Frequency Column Lengths
 * 
 * Fixes "value too long for type character varying(50)" error when storing
 * comma-separated frequency values like "Daily, Weekly, Quarterly, Yearly, Monthly, Half Yearly"
 * 
 * Run: node migrations/008_increase_frequency_column_length.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Scheduler Frequency Column Length Migration (008)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Increase VARCHAR length from 50 to 255 for frequency columns
        console.log('📋 Altering maintenance_schedulers frequency columns...');

        await sequelize.query(`
            ALTER TABLE maintenance_schedulers 
            ALTER COLUMN inspection_frequency TYPE VARCHAR(255);
        `);
        console.log('   ✅ inspection_frequency column increased to VARCHAR(255)');

        await sequelize.query(`
            ALTER TABLE maintenance_schedulers 
            ALTER COLUMN testing_frequency TYPE VARCHAR(255);
        `);
        console.log('   ✅ testing_frequency column increased to VARCHAR(255)');

        await sequelize.query(`
            ALTER TABLE maintenance_schedulers 
            ALTER COLUMN maintenance_frequency TYPE VARCHAR(255);
        `);
        console.log('   ✅ maintenance_frequency column increased to VARCHAR(255)');

        console.log('\n✅ Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Scheduler Frequency Column Length Migration...\n');

    try {
        await sequelize.authenticate();

        // Revert to VARCHAR(50) - Note: this may fail if data is too long
        await sequelize.query(`
            ALTER TABLE maintenance_schedulers 
            ALTER COLUMN inspection_frequency TYPE VARCHAR(50);
        `);
        await sequelize.query(`
            ALTER TABLE maintenance_schedulers 
            ALTER COLUMN testing_frequency TYPE VARCHAR(50);
        `);
        await sequelize.query(`
            ALTER TABLE maintenance_schedulers 
            ALTER COLUMN maintenance_frequency TYPE VARCHAR(50);
        `);

        console.log('✅ Rollback completed!\n');

    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        throw error;
    }
}

// Export for use with run_all_migrations
module.exports = { up, down };

// Run directly if executed as main script
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
            console.error('Migration error:', error);
            process.exit(1);
        } finally {
            await sequelize.close();
            process.exit(0);
        }
    })();
}
