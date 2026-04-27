s/**
 * Migration: Add Source to Audit Logs
 * Adds missing source column to audit_logs table to match Sequelize model
 * 
 * New Column:
 * Audit Logs: source (VARCHAR(30), default 'ui')
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Add Source to Audit Logs Migration (20260120)...\n');

    try {
        await sequelize.authenticate();

        console.log('📋 Updating audit_logs table...');

        await sequelize.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'source') THEN
                    ALTER TABLE audit_logs ADD COLUMN "source" VARCHAR(30) DEFAULT 'ui';
                END IF;
            END $$;
        `);
        console.log('   ✅ audit_logs table updated');

        console.log('\n✅ Add Source to Audit Logs Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Add Source to Audit Logs Migration...\n');

    try {
        await sequelize.authenticate();

        console.log('📋 Reverting audit_logs table...');
        await sequelize.query(`
            ALTER TABLE audit_logs 
            DROP COLUMN IF EXISTS "source";
        `);

        console.log('✅ Rollback completed!\n');

    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        throw error;
    }
}

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
