/**
 * Migration: Add Compliance Score to Assets
 * Adds compliance_score column to assets table if it doesn't exist
 *
 * Run: node migrations/012_add_compliance_score_to_assets.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Add Compliance Score to Assets Migration (012)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Check if column already exists
        const [results] = await sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'assets'
            AND column_name = 'compliance_score';
        `);

        if (results.length > 0) {
            console.log('⚠️  compliance_score column already exists in assets table');
            console.log('✅ Migration skipped - no changes needed\n');
            return;
        }

        // Add compliance_score column
        console.log('📋 Adding compliance_score column to assets table...');
        await sequelize.query(`
            ALTER TABLE assets
            ADD COLUMN compliance_score INTEGER DEFAULT 100
            CHECK (compliance_score >= 0 AND compliance_score <= 100);
        `);
        console.log('   ✅ compliance_score column added');

        // Add index for better query performance
        console.log('📋 Creating index on compliance_score...');
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_assets_compliance_score
            ON assets(compliance_score);
        `);
        console.log('   ✅ Index created');

        // Add comment to the column
        await sequelize.query(`
            COMMENT ON COLUMN assets.compliance_score IS
            'OAC (Optimal Asset Compliance) = 100% - 50% (if critical condition) - 25% (if open ticket/service due/overdue) - 25% (if lifespan exceeded)';
        `);
        console.log('   ✅ Column comment added');

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Migration 012 completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

async function down() {
    console.log('🔄 Rolling back Add Compliance Score to Assets Migration (012)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Remove index
        console.log('📋 Dropping index on compliance_score...');
        await sequelize.query(`
            DROP INDEX IF EXISTS idx_assets_compliance_score;
        `);
        console.log('   ✅ Index dropped');

        // Remove column
        console.log('📋 Removing compliance_score column from assets table...');
        await sequelize.query(`
            ALTER TABLE assets
            DROP COLUMN IF EXISTS compliance_score;
        `);
        console.log('   ✅ compliance_score column removed');

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Rollback 012 completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run migration if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args[0] === 'down') {
        down();
    } else {
        up();
    }
}

module.exports = { up, down };
