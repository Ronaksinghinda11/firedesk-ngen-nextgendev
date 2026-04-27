/**
 * Migration Runner Script
 * Run this to execute the master data schema migration
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: console.log
    }
);

async function runMigration() {
    try {
        console.log('🚀 Starting Master Data Schema Migration...\n');

        // Test connection
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        // Import migration
        const migration = require('./migrations/20260112-master-data-uuid-migration');

        // Confirm before proceeding
        console.log('⚠️  WARNING: This migration will DROP and RECREATE tables!');
        console.log('⚠️  All existing master data will be LOST!');
        console.log('⚠️  Make sure you have a database backup!\n');

        // In production, you'd want user confirmation here
        // For now, we'll proceed automatically

        console.log('Executing migration...\n');

        // Run the migration
        await migration.up(sequelize.getQueryInterface(), Sequelize);

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 Next steps:');
        console.log('   1. Run seeder to populate initial data');
        console.log('   2. Test API endpoints');
        console.log('   3. Update frontend to use new field names\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

runMigration();
