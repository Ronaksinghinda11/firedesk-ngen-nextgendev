/**
 * Migration: Incident & CAPA System
 * Creates all tables for the incident and CAPA management system
 * 
 * Tables: 
 * - incident_types
 * - incident_subtypes
 * - capa_step_definitions
 * - incidents
 * - incident_assignments
 * - incident_capa_steps
 * - incident_activities
 * 
 * Run: node migrations/007_incident_capa_system.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Incident & CAPA System Migration (007)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Enable UUID extension if not already enabled
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

        // ============================================
        // 1. INCIDENT_TYPES TABLE
        // ============================================
        console.log('📋 Creating incident_types table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS incident_types (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                type_name VARCHAR(255) NOT NULL UNIQUE,
                type_code VARCHAR(50) UNIQUE,
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        console.log('   ✅ incident_types table created');

        // ============================================
        // 2. INCIDENT_SUBTYPES TABLE
        // ============================================
        console.log('📋 Creating incident_subtypes table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS incident_subtypes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                incident_type_id UUID NOT NULL REFERENCES incident_types(id) ON DELETE CASCADE,
                subtype_name VARCHAR(255) NOT NULL,
                subtype_code VARCHAR(50) UNIQUE,
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE(incident_type_id, subtype_name)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incident_subtypes_type ON incident_subtypes(incident_type_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incident_subtypes_active ON incident_subtypes(is_active);`);
        console.log('   ✅ incident_subtypes table created');

        // ============================================
        // 3. CAPA_STEP_DEFINITIONS TABLE (Universal Steps)
        // ============================================
        console.log('📋 Creating capa_step_definitions table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS capa_step_definitions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                step_number INTEGER NOT NULL UNIQUE,
                step_name VARCHAR(255) NOT NULL,
                step_code VARCHAR(50) UNIQUE,
                step_description TEXT,
                is_document_required BOOLEAN DEFAULT false,
                is_approval_required BOOLEAN DEFAULT true,
                is_active BOOLEAN DEFAULT true,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_capa_step_definitions_number ON capa_step_definitions(step_number);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_capa_step_definitions_active ON capa_step_definitions(is_active);`);
        console.log('   ✅ capa_step_definitions table created');

        // ============================================
        // 4. INCIDENTS TABLE
        // ============================================
        console.log('📋 Creating incidents table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE incident_severity_enum AS ENUM ('Low', 'Medium', 'High', 'Critical');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE incident_status_enum AS ENUM ('Open', 'Team Assigned', 'In Progress', 'Pending Approval', 'Closed', 'Rejected');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS incidents (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                incident_number VARCHAR(50) UNIQUE NOT NULL,
                
                -- Classification
                incident_subtype_id UUID NOT NULL REFERENCES incident_subtypes(id) ON DELETE RESTRICT,
                
                -- Location
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE RESTRICT,
                building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
                floor_id UUID REFERENCES floors(id) ON DELETE SET NULL,
                
                -- Details
                incident_date TIMESTAMP NOT NULL,
                description TEXT NOT NULL,
                impact TEXT,
                severity incident_severity_enum NOT NULL DEFAULT 'Medium',
                
                -- Status & Workflow
                status incident_status_enum DEFAULT 'Open',
                current_capa_step INTEGER DEFAULT 0,
                
                -- Team
                team_creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
                team_leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
                
                -- Metadata
                documents_data JSONB,
                
                -- Tracking
                created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incidents_plant ON incidents(plant_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incidents_subtype ON incidents(incident_subtype_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incidents_creator ON incidents(created_by);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(incident_date);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incidents_team_creator ON incidents(team_creator_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incidents_team_leader ON incidents(team_leader_id);`);
        console.log('   ✅ incidents table created');

        // ============================================
        // 5. INCIDENT_ASSIGNMENTS TABLE (Team Members)
        // ============================================
        console.log('📋 Creating incident_assignments table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS incident_assignments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(100),
                assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE(incident_id, user_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incident_assignments_incident ON incident_assignments(incident_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incident_assignments_user ON incident_assignments(user_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incident_assignments_active ON incident_assignments(is_active);`);
        console.log('   ✅ incident_assignments table created');

        // ============================================
        // 6. INCIDENT_CAPA_STEPS TABLE
        // ============================================
        console.log('📋 Creating incident_capa_steps table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE capa_step_status_enum AS ENUM ('Not Started', 'In Progress', 'Pending Approval', 'Approved', 'Rejected');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS incident_capa_steps (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
                capa_step_definition_id UUID NOT NULL REFERENCES capa_step_definitions(id) ON DELETE RESTRICT,
                
                -- Step Details (copied from definition)
                step_number INTEGER NOT NULL,
                step_name VARCHAR(255),
                step_description TEXT,
                is_document_required BOOLEAN DEFAULT false,
                is_approval_required BOOLEAN DEFAULT true,
                
                -- Response
                step_response TEXT,
                documents_data JSONB,
                
                -- Status
                status capa_step_status_enum DEFAULT 'Not Started',
                
                -- Tracking
                submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
                submitted_at TIMESTAMP,
                approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
                approved_at TIMESTAMP,
                rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
                rejected_at TIMESTAMP,
                rejection_reason TEXT,
                
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE(incident_id, step_number)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incident_capa_steps_incident ON incident_capa_steps(incident_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incident_capa_steps_definition ON incident_capa_steps(capa_step_definition_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incident_capa_steps_status ON incident_capa_steps(status);`);
        console.log('   ✅ incident_capa_steps table created');

        // ============================================
        // 7. INCIDENT_ACTIVITIES TABLE (Timeline)
        // ============================================
        console.log('📋 Creating incident_activities table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS incident_activities (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
                action VARCHAR(255) NOT NULL,
                description TEXT,
                performed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                metadata JSONB,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incident_activities_incident ON incident_activities(incident_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_incident_activities_created ON incident_activities(created_at);`);
        console.log('   ✅ incident_activities table created');

        console.log('\n✅ Incident & CAPA System Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Incident & CAPA System Migration...\n');

    try {
        await sequelize.authenticate();

        // Drop tables in reverse order
        await sequelize.query('DROP TABLE IF EXISTS incident_activities CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS incident_capa_steps CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS incident_assignments CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS incidents CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS capa_step_definitions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS incident_subtypes CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS incident_types CASCADE;');

        // Drop enum types
        await sequelize.query('DROP TYPE IF EXISTS capa_step_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS incident_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS incident_severity_enum;');

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
