/**
 * Migration: Add Frequency to Forms
 * Adds missing frequency_id column to forms table to match Sequelize model
 * 
 * New Column:
 * Forms: frequency_id (UUID, FK to inspection_frequencies)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Add Frequency to Forms Migration (20260120)...\n');

    try {
        await sequelize.authenticate();

        console.log('📋 Updating forms table...');

        await sequelize.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'frequency_id') THEN
                    ALTER TABLE forms ADD COLUMN "frequency_id" UUID REFERENCES inspection_frequencies(id) ON DELETE SET NULL;
                    CREATE INDEX IF NOT EXISTS idx_forms_frequency ON forms(frequency_id);
                END IF;
            END $$;
        `);
        console.log('   ✅ forms table updated');

        console.log('\n✅ Add Frequency to Forms Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Add Frequency to Forms Migration...\n');

    try {
        await sequelize.authenticate();

        console.log('📋 Reverting forms table...');
        await sequelize.query(`
            ALTER TABLE forms 
            DROP COLUMN IF EXISTS "frequency_id";
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
