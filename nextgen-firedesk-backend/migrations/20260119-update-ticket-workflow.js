
/**
 * Migration: Update Ticket and TicketResponse for Technician Flow
 * 1. Add 'started_at' to tickets table
 * 2. Add 'In Progress' to completed_status enum (tickets)
 * 3. Add 'photo_urls' to ticket_responses
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('Starting migration for Ticket modifications...');

    const transaction = await sequelize.transaction();

    try {
        // 1. Add started_at to tickets
        console.log('Adding started_at to tickets table...');
        await sequelize.query(`
            ALTER TABLE tickets 
            ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
        `, { transaction });

        // 2. Add 'In Progress' to completed_status enum
        // Note: PostgreSQL requires specific command for ENUM modification
        console.log('Adding "In Progress" to ticket_completed_status_enum...');
        try {
            // Check if value exists first to avoid error
            await sequelize.query(`
                ALTER TYPE "ticket_completed_status_enum" ADD VALUE IF NOT EXISTS 'In Progress';
            `, { transaction });
        } catch (e) {
            console.log('Enum value might already exist or error adding it:', e.message);
        }

        // 3. Add photo_urls to ticket_responses
        console.log('Adding photo_urls to ticket_responses table...');
        await sequelize.query(`
            ALTER TABLE ticket_responses 
            ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]';
        `, { transaction });

        await transaction.commit();
        console.log('✅ Migration completed successfully');

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

async function down() {
    console.log('Reverting Ticket modifications...');

    // We typically don't remove ENUM values in down migrations in Postgres as it's complex
    // But we can remove the columns

    await sequelize.query(`
        ALTER TABLE tickets DROP COLUMN IF EXISTS started_at;
    `);

    await sequelize.query(`
        ALTER TABLE ticket_responses DROP COLUMN IF EXISTS photo_urls;
    `);

    console.log('✅ Revert completed');
}

// Allow running as standalone script
if (require.main === module) {
    const action = process.argv[2] || 'up';

    (async () => {
        try {
            await sequelize.authenticate();
            console.log('✅ Database connected\n');

            if (action === 'down') {
                await down();
            } else {
                await up();
            }

            process.exit(0);
        } catch (error) {
            console.error('\n❌ Script failed:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = { up, down };
