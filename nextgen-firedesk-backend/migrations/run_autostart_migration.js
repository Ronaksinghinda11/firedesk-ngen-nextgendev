/**
 * Run the auto-start column migration
 * Usage: node migrations/run_autostart_migration.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { sequelize } = require('../config/config');
const migration = require('./011_add_last_auto_start_date');

async function runMigration() {
    console.log('🚀 Starting last_auto_start_date migration...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        const queryInterface = sequelize.getQueryInterface();
        await migration.up(queryInterface, sequelize.Sequelize);

        console.log('\n🎉 Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        if (error.original) {
            console.error('Database error:', error.original.message);
        }
        process.exit(1);
    }
}

runMigration();
