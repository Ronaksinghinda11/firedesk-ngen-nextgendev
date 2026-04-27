/**
 * Custom Migration Runner for IoT Tables Only
 * Runs only the create-iot-tables migration
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { sequelize } = require('../config/config');
const migration = require('./010_iot_migration');

async function runMigration() {
    console.log('🚀 Starting IoT tables migration...\n');

    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        // Run the migration
        const queryInterface = sequelize.getQueryInterface();
        await migration.up(queryInterface, sequelize.Sequelize);

        console.log('\n🎉 IoT tables migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('\nError details:', error.message);
        if (error.original) {
            console.error('Database error:', error.original.message);
        }
        process.exit(1);
    }
}

// Run the migration
runMigration();