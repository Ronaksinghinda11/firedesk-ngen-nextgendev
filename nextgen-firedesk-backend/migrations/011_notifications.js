/**
 * Migration: Notifications Module
 * Creates table for notifications system
 * 
 * Tables: notifications
 * 
 * Run: node migrations/011_notifications_module.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Notifications Module Migration (011)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ============================================
        // CREATE ENUM TYPES
        // ============================================
        console.log('📋 Creating notification enum types...');

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE notification_type_enum AS ENUM (
                    'ASSET_ALERT',
                    'SERVICE_DUE',
                    'HP_TEST_DUE',
                    'TICKET_ASSIGNED',
                    'TICKET_UPDATED',
                    'INCIDENT_CREATED',
                    'INCIDENT_ASSIGNED',
                    'CAPA_INITIATED',
                    'CAPA_STEP_ACTION',
                    'AUDIT_SCHEDULED',
                    'AUDIT_REMINDER',
                    'TRAINING_SCHEDULED',
                    'SYSTEM_ALERT',
                    'GENERAL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('   ✅ notification_type_enum created');

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE notification_priority_enum AS ENUM (
                    'CRITICAL',
                    'HIGH',
                    'MEDIUM',
                    'LOW'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('   ✅ notification_priority_enum created');

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE notification_category_enum AS ENUM (
                    'ALERT',
                    'WARNING',
                    'INFO',
                    'SUCCESS',
                    'REMAINDER'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('   ✅ notification_category_enum created');

        // ============================================
        // NOTIFICATIONS TABLE
        // ============================================
        console.log('📋 Creating notifications table...');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                type notification_type_enum NOT NULL,
                category notification_category_enum DEFAULT 'INFO',
                priority notification_priority_enum DEFAULT 'MEDIUM',
                
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                
                related_entity_type VARCHAR(50),
                related_entity_id UUID,
                
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                
                action_url VARCHAR(500),
                is_actionable BOOLEAN DEFAULT false,
                action_taken BOOLEAN DEFAULT false,
                
                is_read BOOLEAN DEFAULT false,
                read_at TIMESTAMP,
                sent_at TIMESTAMP,
                expires_at TIMESTAMP,
                
                triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
                notification_source VARCHAR(50) DEFAULT 'SYSTEM',
                
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        console.log('   ✅ notifications table created');

        // ============================================
        // CREATE INDEXES
        // ============================================
        console.log('📋 Creating indexes...');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_user 
            ON notifications(user_id);
        `);
        console.log('   ✅ idx_notifications_user created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
            ON notifications(user_id, is_read);
        `);
        console.log('   ✅ idx_notifications_user_read created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_priority 
            ON notifications(user_id, priority, is_read);
        `);
        console.log('   ✅ idx_notifications_priority created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_type 
            ON notifications(type);
        `);
        console.log('   ✅ idx_notifications_type created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_entity_type 
            ON notifications(related_entity_type);
        `);
        console.log('   ✅ idx_notifications_entity_type created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_entity 
            ON notifications(related_entity_type, related_entity_id);
        `);
        console.log('   ✅ idx_notifications_entity created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_created 
            ON notifications(created_at);
        `);
        console.log('   ✅ idx_notifications_created created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_expires 
            ON notifications(expires_at);
        `);
        console.log('   ✅ idx_notifications_expires created');

        console.log('\n✅ Notifications Module Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Notifications Module Migration...\n');

    try {
        await sequelize.authenticate();

        // Drop indexes first
        await sequelize.query('DROP INDEX IF EXISTS idx_notifications_user;');
        await sequelize.query('DROP INDEX IF EXISTS idx_notifications_user_read;');
        await sequelize.query('DROP INDEX IF EXISTS idx_notifications_priority;');
        await sequelize.query('DROP INDEX IF EXISTS idx_notifications_type;');
        await sequelize.query('DROP INDEX IF EXISTS idx_notifications_entity_type;');
        await sequelize.query('DROP INDEX IF EXISTS idx_notifications_entity;');
        await sequelize.query('DROP INDEX IF EXISTS idx_notifications_created;');
        await sequelize.query('DROP INDEX IF EXISTS idx_notifications_expires;');

        // Drop table
        await sequelize.query('DROP TABLE IF EXISTS notifications CASCADE;');

        // Drop enum types
        await sequelize.query('DROP TYPE IF EXISTS notification_type_enum;');
        await sequelize.query('DROP TYPE IF EXISTS notification_priority_enum;');
        await sequelize.query('DROP TYPE IF EXISTS notification_category_enum;');

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
            // Ensure uuid-ossp extension exists
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