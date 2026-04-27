/**
 * Standalone script to run the form split migration
 * 
 * Usage: node scripts/migrate-forms-by-service-type.js
 * 
 * This script will:
 * 1. Convert form names from freq_category_product to ServiceType_Category_Product_Frequency
 * 2. Split forms with multiple service types into separate forms
 * 3. Each form will have only questions matching its service_type
 */

require('dotenv').config();
const { sequelize } = require('../config/config');

async function runMigration() {
    console.log('🚀 Starting Form Split Migration');
    console.log('================================\n');

    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Import the migration
        const migration = require('../src/migrations/20260118-split-forms-by-service-type');

        // Run the migration
        const result = await migration.up(null, null);

        console.log('\n================================');
        console.log('🎉 Migration completed!');
        console.log(`   Updated: ${result.formsUpdated} forms`);
        console.log(`   Created: ${result.formsCreated} forms`);
        console.log(`   Skipped: ${result.formsSkipped} forms`);

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Run the migration
runMigration();
