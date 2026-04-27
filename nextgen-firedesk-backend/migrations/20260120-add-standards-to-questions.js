/**
 * Migration: Add Missing Columns to Questions Table
 * Date: 2026-01-20
 * 
 * Adds missing columns: standards, plant_id, service_type
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Add Missing Columns to Questions Migration...\n');

    try {
        await sequelize.authenticate();

        console.log('📋 Updating questions table...');

        // Add standards column if it doesn't exist
        await sequelize.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'standards') THEN
                    ALTER TABLE questions ADD COLUMN "standards" TEXT;
                END IF;
            END $$;
        `);
        console.log('   ✅ standards column added');

        // Add plant_id column if it doesn't exist
        await sequelize.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'plant_id') THEN
                    ALTER TABLE questions ADD COLUMN "plant_id" UUID REFERENCES plants(id) ON DELETE SET NULL;
                END IF;
            END $$;
        `);
        console.log('   ✅ plant_id column added');

        // Add service_type column if it doesn't exist
        await sequelize.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'service_type') THEN
                    ALTER TABLE questions ADD COLUMN "service_type" VARCHAR(50);
                END IF;
            END $$;
        `);
        console.log('   ✅ service_type column added');

        console.log('\n✅ Add Missing Columns to Questions Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Add Missing Columns to Questions Migration...\n');

    try {
        await sequelize.authenticate();

        await sequelize.query(`ALTER TABLE questions DROP COLUMN IF EXISTS "standards";`);
        await sequelize.query(`ALTER TABLE questions DROP COLUMN IF EXISTS "plant_id";`);
        await sequelize.query(`ALTER TABLE questions DROP COLUMN IF EXISTS "service_type";`);
        console.log('   ✅ Rolled back columns');

        console.log('\n✅ Rollback completed!');
    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        throw error;
    }
}

// Run if called directly
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
            console.error('Fatal error:', error.message);
            process.exit(1);
        } finally {
            await sequelize.close();
            process.exit(0);
        }
    })();
}

module.exports = { up, down };
