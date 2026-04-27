/**
 * Migration: Audit Logs & Comments Module
 * Creates tables for audit trail, comments system, and notifications
 * 
 * Tables: audit_logs, comments, comment_mentions, comment_reactions, 
 *         comment_attachments, comment_read_status, notifications
 * 
 * Run: node migrations/007_audit_comments_module.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Audit Logs & Comments Module Migration (007)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ============================================
        // AUDIT & COMMENT ENUM TYPES
        // ============================================
        console.log('📋 Creating enum types...');

        // Entity type enum (shared across audit and comments)
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE entity_type_enum AS ENUM (
                    'plant', 'building', 'floor', 'wing', 'asset', 'ticket',
                    'user', 'technician', 'manager', 'organization', 
                    'fire_safety_system', 'maintenance_schedule', 'service_submission',
                    'form', 'vendor', 'category', 'product', 'notification'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Audit action enum
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE audit_action_enum AS ENUM (
                    'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ARCHIVE',
                    'ASSIGN', 'UNASSIGN', 'APPROVE', 'REJECT', 'SUBMIT',
                    'CANCEL', 'COMPLETE', 'STATUS_CHANGE', 'BULK_UPDATE'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Reaction type enum
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE reaction_type_enum AS ENUM (
                    'like', 'thumbs_up', 'thumbs_down', 'heart', 
                    'laugh', 'confused', 'celebrate'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Notification enums
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE notification_type_enum AS ENUM (
                    'ASSET_ALERT', 'SERVICE_DUE', 'HP_TEST_DUE', 'TICKET_ASSIGNED',
                    'TICKET_UPDATED', 'INCIDENT_CREATED', 'INCIDENT_ASSIGNED',
                    'CAPA_INITIATED', 'CAPA_STEP_ACTION', 'AUDIT_SCHEDULED',
                    'AUDIT_REMINDER', 'TRAINING_SCHEDULED', 'SYSTEM_ALERT', 'GENERAL'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE notification_priority_enum AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE notification_category_enum AS ENUM ('ALERT', 'WARNING', 'INFO', 'SUCCESS', 'REMAINDER');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('   ✅ Enum types created');

        // ============================================
        // AUDIT_LOGS TABLE
        // ============================================
        console.log('📋 Creating audit_logs table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                -- Entity Information
                entity_type entity_type_enum NOT NULL,
                entity_id UUID NOT NULL,
                entity_name VARCHAR(255),
                
                -- Action Information
                action audit_action_enum NOT NULL,
                action_description TEXT,
                
                -- User Information
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                user_name VARCHAR(255),
                user_type VARCHAR(50),
                
                -- Change Details
                field_name VARCHAR(100),
                old_value TEXT,
                new_value TEXT,
                old_value_display TEXT,
                new_value_display TEXT,
                
                -- Structured Changes
                changes JSONB,
                
                -- Context & Metadata
                context_id UUID,
                ip_address INET,
                user_agent TEXT,
                request_id VARCHAR(100),
                
                -- Additional Metadata
                metadata JSONB,
                
                -- Related Entity
                related_entity_type entity_type_enum,
                related_entity_id UUID,
                related_entity_name VARCHAR(255),
                
                -- Timestamps
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_entity_timeline ON audit_logs(entity_type, entity_id, created_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_context ON audit_logs(context_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_field ON audit_logs(field_name);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_user_timeline ON audit_logs(user_id, created_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_changes_gin ON audit_logs USING GIN (changes);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_metadata_gin ON audit_logs USING GIN (metadata);`);
        console.log('   ✅ audit_logs table created');

        // ============================================
        // COMMENTS TABLE
        // ============================================
        console.log('📋 Creating comments table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                -- Entity Information
                entity_type entity_type_enum NOT NULL,
                entity_id UUID NOT NULL,
                
                -- Threading Support
                parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
                thread_root_id UUID REFERENCES comments(id) ON DELETE CASCADE,
                thread_level INTEGER DEFAULT 0,
                thread_path VARCHAR(500),
                
                -- Comment Content
                comment_text TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                comment_format VARCHAR(20) DEFAULT 'plain',
                
                -- Author Information
                created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                created_by_name VARCHAR(255),
                created_by_avatar VARCHAR(500),
                author_role VARCHAR(50),
                
                -- Edit Tracking
                is_edited BOOLEAN DEFAULT false,
                edited_at TIMESTAMP,
                edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
                edit_count INTEGER DEFAULT 0,
                
                -- Soft Delete
                is_deleted BOOLEAN DEFAULT false,
                deleted_at TIMESTAMP,
                deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
                
                -- Metadata
                is_pinned BOOLEAN DEFAULT false,
                is_internal BOOLEAN DEFAULT false,
                visibility VARCHAR(20) DEFAULT 'all',
                
                -- Timestamps
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id, created_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_comments_thread ON comments(thread_root_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(created_by);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_comments_active ON comments(entity_type, entity_id, is_deleted, is_pinned);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_comments_deleted ON comments(is_deleted);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_comments_path ON comments(thread_path);`);
        console.log('   ✅ comments table created');

        // ============================================
        // NOTIFICATIONS TABLE (create before mentions for FK)
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

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(user_id, priority, is_read);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_entity_type ON notifications(related_entity_type);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(related_entity_type, related_entity_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at);`);
        console.log('   ✅ notifications table created');

        // ============================================
        // COMMENT_MENTIONS TABLE
        // ============================================
        console.log('📋 Creating comment_mentions table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS comment_mentions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
                
                -- Mentioned User
                mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                mentioned_user_name VARCHAR(255),
                mention_text VARCHAR(100),
                
                -- Who mentioned
                mentioned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                mentioned_by_name VARCHAR(255),
                
                -- Position in comment
                mention_start_index INTEGER,
                mention_end_index INTEGER,
                
                -- Notification Status
                notification_sent BOOLEAN DEFAULT false,
                notification_sent_at TIMESTAMP,
                notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
                
                -- Email Status
                email_sent BOOLEAN DEFAULT false,
                email_sent_at TIMESTAMP,
                email_error TEXT,
                
                -- Read Status
                is_read BOOLEAN DEFAULT false,
                read_at TIMESTAMP,
                
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                
                UNIQUE(comment_id, mentioned_user_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mentions_comment ON comment_mentions(comment_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mentions_user ON comment_mentions(mentioned_user_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mentions_unread ON comment_mentions(mentioned_user_id, is_read);`);
        console.log('   ✅ comment_mentions table created');

        // ============================================
        // COMMENT_REACTIONS TABLE
        // ============================================
        console.log('📋 Creating comment_reactions table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS comment_reactions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                
                reaction_type reaction_type_enum NOT NULL,
                
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                
                UNIQUE(comment_id, user_id, reaction_type)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reactions_comment ON comment_reactions(comment_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reactions_user ON comment_reactions(user_id);`);
        console.log('   ✅ comment_reactions table created');

        // ============================================
        // COMMENT_ATTACHMENTS TABLE
        // ============================================
        console.log('📋 Creating comment_attachments table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS comment_attachments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
                
                file_name VARCHAR(255) NOT NULL,
                file_size_bytes BIGINT,
                mime_type VARCHAR(100),
                storage_path VARCHAR(500) NOT NULL,
                storage_url VARCHAR(500),
                
                is_image BOOLEAN DEFAULT false,
                thumbnail_url VARCHAR(500),
                
                uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_attachments_comment ON comment_attachments(comment_id);`);
        console.log('   ✅ comment_attachments table created');

        // ============================================
        // COMMENT_READ_STATUS TABLE
        // ============================================
        console.log('📋 Creating comment_read_status table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS comment_read_status (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                entity_type entity_type_enum NOT NULL,
                entity_id UUID NOT NULL,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                
                last_read_at TIMESTAMP NOT NULL,
                last_read_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
                
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                
                UNIQUE(entity_type, entity_id, user_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_read_status_user ON comment_read_status(user_id);`);
        console.log('   ✅ comment_read_status table created');

        console.log('\n✅ Audit Logs & Comments Module Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Audit Logs & Comments Module Migration...\n');

    try {
        await sequelize.authenticate();

        // Drop tables in reverse order
        await sequelize.query('DROP TABLE IF EXISTS comment_read_status CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS comment_attachments CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS comment_reactions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS comment_mentions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS notifications CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS comments CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS audit_logs CASCADE;');

        // Drop enum types
        await sequelize.query('DROP TYPE IF EXISTS notification_category_enum;');
        await sequelize.query('DROP TYPE IF EXISTS notification_priority_enum;');
        await sequelize.query('DROP TYPE IF EXISTS notification_type_enum;');
        await sequelize.query('DROP TYPE IF EXISTS reaction_type_enum;');
        await sequelize.query('DROP TYPE IF EXISTS audit_action_enum;');
        await sequelize.query('DROP TYPE IF EXISTS entity_type_enum;');

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
