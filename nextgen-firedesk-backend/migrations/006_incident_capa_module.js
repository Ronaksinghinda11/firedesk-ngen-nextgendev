/**
 * Migration: Incident & CAPA Module (Tickets)
 * Creates tables for ticket/incident management
 * 
 * Tables: tickets, ticket_responses
 * 
 * Run: node migrations/006_incident_capa_module.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Incident & CAPA Module Migration (006)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ============================================
        // TICKET ENUM TYPES
        // ============================================
        console.log('📋 Creating ticket enum types...');

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE ticket_type_enum AS ENUM ('General', 'Asset Related');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE ticket_completed_status_enum AS ENUM ('Pending', 'Rejected', 'Waiting for approval', 'Completed', 'Archived');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE ticket_response_type_enum AS ENUM ('submission', 'rejection', 'comment');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('   ✅ Ticket enum types created');

        // ============================================
        // TICKETS TABLE
        // ============================================
        console.log('📋 Creating tickets table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                ticket_code VARCHAR(50),
                
                created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                plant_id UUID REFERENCES plants(id) ON DELETE SET NULL,
                asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                category_id UUID,
                technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
                
                task_name VARCHAR(255) NOT NULL,
                task_description VARCHAR(1000),
                target_date TIMESTAMP NOT NULL,
                
                ticket_type ticket_type_enum DEFAULT 'General',
                completed_status ticket_completed_status_enum DEFAULT 'Pending',
                
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_asset ON tickets(asset_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_creator ON tickets(created_by);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_technician ON tickets(technician_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(completed_status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_target_date ON tickets(target_date);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tickets_plant ON tickets(plant_id);`);
        console.log('   ✅ tickets table created');

        // ============================================
        // TICKET_RESPONSES TABLE
        // ============================================
        console.log('📋 Creating ticket_responses table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS ticket_responses (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                assigned_technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
                
                comment TEXT NOT NULL,
                response_type ticket_response_type_enum,
                is_fixed BOOLEAN,
                
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket ON ticket_responses(ticket_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ticket_responses_technician ON ticket_responses(assigned_technician_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ticket_responses_created ON ticket_responses(created_at);`);
        console.log('   ✅ ticket_responses table created');

        console.log('\n✅ Incident & CAPA Module Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Incident & CAPA Module Migration...\n');

    try {
        await sequelize.authenticate();

        // Drop tables in reverse order
        await sequelize.query('DROP TABLE IF EXISTS ticket_responses CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS tickets CASCADE;');

        // Drop enum types
        await sequelize.query('DROP TYPE IF EXISTS ticket_response_type_enum;');
        await sequelize.query('DROP TYPE IF EXISTS ticket_completed_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS ticket_type_enum;');

        console.log('✅ Rollback completed!\n');

    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        throw error;
    }
}

// Export for use with run_all_migrations
module.exports = { up, down };

// Run directly if executed as main script
if (require.main === module) {
    const action = process.argv[2] || 'up';

    (async () => {
        try {
            await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

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
