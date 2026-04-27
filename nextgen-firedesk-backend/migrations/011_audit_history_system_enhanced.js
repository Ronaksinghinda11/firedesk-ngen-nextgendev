/**
 * Migration: Enhanced Audit & History System with Partitioning
 * 
 * This migration creates/updates the audit logging and commenting system with:
 * - NULLABLE entity_id (survives deleted entities)
 * - source field (ui/api/scheduler/system tracking)
 * - Monthly partitioning for audit_logs (scalability)
 * - Minimal strategic indexes (write optimization)
 * - entity_name snapshot in comments table
 * 
 * Tables: audit_logs (partitioned), comments, comment_mentions, 
 *         comment_reactions, comment_attachments, comment_read_status
 * 
 * Run: node migrations/011_audit_history_system_enhanced.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Enhanced Audit & History System Migration (011)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ============================================
        // DROP OLD AUDIT_LOGS TABLE IF EXISTS
        // ============================================
        console.log('🔄 Dropping old audit_logs table (if exists)...');
        await sequelize.query('DROP TABLE IF EXISTS audit_logs CASCADE;');
        console.log('   ✅ Old table dropped\n');

        // ============================================
        // ENUMS (reuse existing or create if missing)
        // ============================================
        console.log('📋 Creating/updating enum types...');

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE entity_type_enum AS ENUM (
                    'plant', 'building', 'floor', 'wing', 'asset', 'ticket',
                    'user', 'technician', 'manager', 'organization', 
                    'fire_safety_system', 'maintenance_schedule', 'service_submission',
                    'form', 'vendor', 'category', 'product', 'notification',
                    'industry', 'condition', 'scheduler', 'incident', 'capa',
                    'question', 'manufacturer', 'monitoring_device'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE audit_action_enum AS ENUM (
                    'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ARCHIVE',
                    'ASSIGN', 'UNASSIGN', 'APPROVE', 'REJECT', 'SUBMIT',
                    'CANCEL', 'COMPLETE', 'STATUS_CHANGE', 'BULK_UPDATE', 'IMPORT'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        console.log('   ✅ Enum types ready\n');

        // ============================================
        // AUDIT_LOGS TABLE (PARTITIONED)
        // ============================================
        console.log('📋 Creating partitioned audit_logs table...');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID DEFAULT uuid_generate_v4(),
                
                -- Entity Information (NULLABLE for deleted entities)
                entity_type entity_type_enum NOT NULL,
                entity_id UUID,  -- NULLABLE! Critical for deleted entities
                entity_name VARCHAR(255),  -- Snapshot for UI display
                
                -- Action Information
                action audit_action_enum NOT NULL,
                action_description TEXT,
                
                -- User Information (with snapshots)
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                user_name VARCHAR(255),  -- Snapshot
                user_type VARCHAR(50),   -- admin/manager/technician
                
                -- Change Details (prefer changes JSONB)
                changes JSONB,  -- Primary: { field: { old, new, old_display, new_display } }
                
                -- Field-level (ONLY for simple cases like STATUS_CHANGE, ASSIGN)
                field_name VARCHAR(100),
                old_value TEXT,
                new_value TEXT,
                old_value_display TEXT,
                new_value_display TEXT,
                
                -- Grouping & Context
                context_id UUID,  -- Groups related changes (single save action)
                
                -- Source Tracking (CRITICAL for scale)
                source VARCHAR(30),  -- 'ui' | 'api' | 'scheduler' | 'system' | 'import'
                
                -- Network Context
                ip_address INET,
                user_agent TEXT,
                request_id VARCHAR(100),
                
                -- Additional Metadata
                metadata JSONB,  -- { reason, notes, etc. }
                
                -- Related Entity (for relational actions like ASSIGN)
                related_entity_type entity_type_enum,
                related_entity_id UUID,
                related_entity_name VARCHAR(255),
                
                -- Timestamp (PARTITION KEY)
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            ) PARTITION BY RANGE (created_at);
        `);

        console.log('   ✅ audit_logs table created (partitioned)\n');

        // ============================================
        // CREATE INITIAL PARTITIONS (24 months)
        // ============================================
        console.log('📅 Creating monthly partitions (2025-01 to 2026-12)...');

        const partitions = [
            // 2025
            ['2025_01', '2025-01-01', '2025-02-01'],
            ['2025_02', '2025-02-01', '2025-03-01'],
            ['2025_03', '2025-03-01', '2025-04-01'],
            ['2025_04', '2025-04-01', '2025-05-01'],
            ['2025_05', '2025-05-01', '2025-06-01'],
            ['2025_06', '2025-06-01', '2025-07-01'],
            ['2025_07', '2025-07-01', '2025-08-01'],
            ['2025_08', '2025-08-01', '2025-09-01'],
            ['2025_09', '2025-09-01', '2025-10-01'],
            ['2025_10', '2025-10-01', '2025-11-01'],
            ['2025_11', '2025-11-01', '2025-12-01'],
            ['2025_12', '2025-12-01', '2026-01-01'],
            // 2026
            ['2026_01', '2026-01-01', '2026-02-01'],
            ['2026_02', '2026-02-01', '2026-03-01'],
            ['2026_03', '2026-03-01', '2026-04-01'],
            ['2026_04', '2026-04-01', '2026-05-01'],
            ['2026_05', '2026-05-01', '2026-06-01'],
            ['2026_06', '2026-06-01', '2026-07-01'],
            ['2026_07', '2026-07-01', '2026-08-01'],
            ['2026_08', '2026-08-01', '2026-09-01'],
            ['2026_09', '2026-09-01', '2026-10-01'],
            ['2026_10', '2026-10-01', '2026-11-01'],
            ['2026_11', '2026-11-01', '2026-12-01'],
            ['2026_12', '2026-12-01', '2027-01-01'],
        ];

        for (const [suffix, start, end] of partitions) {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS audit_logs_${suffix} 
                PARTITION OF audit_logs
                FOR VALUES FROM ('${start}') TO ('${end}');
            `);
            console.log(`   ✅ Created partition: audit_logs_${suffix}`);
        }

        console.log('\n📊 Creating strategic indexes (minimal for write performance)...');

        // PRIMARY: Entity timeline (most common query)
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_entity_timeline 
            ON audit_logs (entity_type, entity_id, created_at DESC) 
            WHERE entity_id IS NOT NULL;
        `);

        // Context grouping (for displaying grouped changes)
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_context 
            ON audit_logs (context_id, created_at DESC) 
            WHERE context_id IS NOT NULL;
        `);

        // User activity
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_user_timeline 
            ON audit_logs (user_id, created_at DESC) 
            WHERE user_id IS NOT NULL;
        `);

        // Time-based queries (module history)
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_created 
            ON audit_logs (created_at DESC);
        `);

        // Module-level history
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_entity_type 
            ON audit_logs (entity_type, created_at DESC);
        `);

        console.log('   ✅ Indexes created (5 strategic indexes only)\n');

        // ============================================
        // UPDATE COMMENTS TABLE (add entity_name)
        // ============================================
        console.log('📋 Updating comments table...');

        // Check if entity_name column exists
        const [result] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'comments' AND column_name = 'entity_name';
        `);

        if (result.length === 0) {
            await sequelize.query(`
                ALTER TABLE comments 
                ADD COLUMN entity_name VARCHAR(255);
            `);
            console.log('   ✅ Added entity_name column to comments table\n');
        } else {
            console.log('   ⏭️  entity_name column already exists\n');
        }

        // ============================================
        // VERIFICATION
        // ============================================
        console.log('🔍 Verifying migration...');

        const [auditCheck] = await sequelize.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_name LIKE 'audit_logs%';
        `);
        console.log(`   ✅ Found ${auditCheck[0].count} audit_logs tables (main + partitions)`);

        const [commentsCheck] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'comments';
        `);
        console.log(`   ✅ Comments table has ${commentsCheck.length} columns`);

        console.log('\n✅ Enhanced Audit & History System Migration completed successfully!\n');
        console.log('📊 Performance Notes:');
        console.log('   - audit_logs: Partitioned by month (fast queries)');
        console.log('   - entity_id: NULLABLE (survives deletions)');
        console.log('   - source: Tracks ui/api/scheduler/system');
        console.log('   - Indexes: 5 strategic indexes (write-optimized)');
        console.log('   - Retention: 24 months (can extend programmatically)\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Enhanced Audit & History System Migration...\n');

    try {
        await sequelize.authenticate();

        // Drop all partitions first
        console.log('🗑️  Dropping audit_logs partitions...');
        const partitions = [
            '2025_01', '2025_02', '2025_03', '2025_04', '2025_05', '2025_06',
            '2025_07', '2025_08', '2025_09', '2025_10', '2025_11', '2025_12',
            '2026_01', '2026_02', '2026_03', '2026_04', '2026_05', '2026_06',
            '2026_07', '2026_08', '2026_09', '2026_10', '2026_11', '2026_12'
        ];

        for (const partition of partitions) {
            await sequelize.query(`DROP TABLE IF EXISTS audit_logs_${partition} CASCADE;`);
        }

        // Drop main table
        await sequelize.query('DROP TABLE IF EXISTS audit_logs CASCADE;');

        // Remove entity_name from comments if it was added
        await sequelize.query(`
            ALTER TABLE comments DROP COLUMN IF EXISTS entity_name;
        `);

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
