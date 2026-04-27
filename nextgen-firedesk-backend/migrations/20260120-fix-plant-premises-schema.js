/**
 * Migration: Fix Plant Premises Schema
 * Adds missing columns to staircases and lifts tables to match Sequelize models
 * 
 * New Columns:
 * Staircases: type, has_pressurization
 * Lifts: type, capacity_kg, fire_rating_minutes, has_emergency_phone
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Fix Plant Premises Schema Migration (20260120)...\n');

    try {
        await sequelize.authenticate();

        // STAIRCASES
        console.log('📋 Updating staircases table...');

        await sequelize.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staircases' AND column_name = 'type') THEN
                    ALTER TABLE staircases ADD COLUMN "type" VARCHAR(50);
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staircases' AND column_name = 'has_pressurization') THEN
                    ALTER TABLE staircases ADD COLUMN "has_pressurization" BOOLEAN DEFAULT false;
                END IF;
            END $$;
        `);
        console.log('   ✅ staircases table updated');

        // LIFTS
        console.log('📋 Updating lifts table...');

        await sequelize.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifts' AND column_name = 'type') THEN
                    ALTER TABLE lifts ADD COLUMN "type" VARCHAR(50);
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifts' AND column_name = 'capacity_kg') THEN
                    ALTER TABLE lifts ADD COLUMN "capacity_kg" DECIMAL(10, 2);
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifts' AND column_name = 'fire_rating_minutes') THEN
                    ALTER TABLE lifts ADD COLUMN "fire_rating_minutes" INTEGER;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifts' AND column_name = 'has_emergency_phone') THEN
                    ALTER TABLE lifts ADD COLUMN "has_emergency_phone" BOOLEAN DEFAULT false;
                END IF;
            END $$;
        `);
        console.log('   ✅ lifts table updated');

        console.log('\n✅ Fix Plant Premises Schema Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Fix Plant Premises Schema Migration...\n');

    try {
        await sequelize.authenticate();

        console.log('📋 Reverting staircases table...');
        await sequelize.query(`
            ALTER TABLE staircases 
            DROP COLUMN IF EXISTS "type",
            DROP COLUMN IF EXISTS "has_pressurization";
        `);

        console.log('📋 Reverting lifts table...');
        await sequelize.query(`
            ALTER TABLE lifts 
            DROP COLUMN IF EXISTS "type",
            DROP COLUMN IF EXISTS "capacity_kg",
            DROP COLUMN IF EXISTS "fire_rating_minutes",
            DROP COLUMN IF EXISTS "has_emergency_phone";
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
