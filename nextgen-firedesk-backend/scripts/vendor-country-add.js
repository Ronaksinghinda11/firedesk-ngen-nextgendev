/**
 * Vendor Address Fields Migration Runner
 * Run this to add country, state, city, zipcode fields to vendors table
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

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

async function runVendorMigration() {
    try {
        console.log('🚀 Starting Vendor Address Fields Migration...\n');

        // Test connection
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        // Import the vendor migration
        const migration = require('../migrations/20260123-add-address-fields-to-vendors');

        console.log('Adding address fields to vendors table...\n');

        // Run the migration
        await migration.up(sequelize.getQueryInterface(), Sequelize);

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 Added fields: country, state, city, zipcode to vendors table\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

runVendorMigration();