/**
 * Migration: Assets Module
 * Creates tables for asset management
 * 
 * Tables: assets, asset_status_history, asset_floorplan_position, asset_testing_schedule,
 *         asset_metadata, spec_definitions, asset_spec_values, asset_documents, asset_location_history
 * 
 * Run: node migrations/004_assets_module.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Assets Module Migration (004)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ============================================
        // ASSET ENUM TYPES
        // ============================================
        console.log('📋 Creating asset enum types...');

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE asset_status_enum AS ENUM ('ACTIVE', 'DEACTIVE');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE health_status_enum AS ENUM ('HEALTHY', 'NEEDS_ATTENTION', 'NOT_WORKING', 'INVENTORY', 'OBSOLETE');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE maintenance_status_enum AS ENUM ('UNDER_WARRANTY', 'OUT_OF_WARRANTY', 'UNDER_AMC', 'OUT_OF_AMC', 'IN_HOUSE');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE refill_status_enum AS ENUM ('FULL', 'NEEDS_REFILL');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE hp_test_status_enum AS ENUM ('PASSED', 'FAILED', 'DUE', 'OVERDUE', 'NOT_APPLICABLE');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('   ✅ Asset enum types created');

        // ============================================
        // ASSETS TABLE
        // ============================================
        console.log('📋 Creating assets table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS assets (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                asset_code VARCHAR(100) UNIQUE NOT NULL,
                
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
                floor_id UUID REFERENCES floors(id) ON DELETE SET NULL,
                wing_id UUID REFERENCES wings(id) ON DELETE SET NULL,
                
                category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
                
                created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                
                type VARCHAR(100) NOT NULL,
                sub_type VARCHAR(100),
                manufacturing_date DATE NOT NULL,
                install_date DATE NOT NULL,
                warranty_end_date DATE,
                last_service_date DATE,
                next_service_date DATE,
                lifespan_years INTEGER,
                
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                location VARCHAR(255),
                
                status asset_status_enum NOT NULL DEFAULT 'ACTIVE',
                health_status health_status_enum NOT NULL DEFAULT 'HEALTHY',
                maintenance_status maintenance_status_enum NOT NULL DEFAULT 'IN_HOUSE',
                
                conditions JSONB,
                
                -- Compliance Score: OAC = 100% - 50% (if critical condition) - 25% (if open ticket/service pending) - 25% (if lifespan exceeded)
                compliance_score INTEGER DEFAULT 100 CHECK (compliance_score >= 0 AND compliance_score <= 100),
                
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMP
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_plant ON assets(plant_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_product ON assets(product_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_health ON assets(health_status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_maint ON assets(maintenance_status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_deleted ON assets(deleted_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_conditions ON assets USING GIN (conditions);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(latitude, longitude);`);
        console.log('   ✅ assets table created');

        // ============================================
        // ASSET_STATUS_HISTORY TABLE
        // ============================================
        console.log('📋 Creating asset_status_history table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS asset_status_history (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                old_health_statuses health_status_enum[],
                new_health_status health_status_enum,
                changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                changed_at TIMESTAMP,
                source_type VARCHAR(100),
                source_id UUID,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_history_asset ON asset_status_history(asset_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_history_changed ON asset_status_history(changed_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_history_asset_changed ON asset_status_history(asset_id, changed_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_history_changed_by ON asset_status_history(changed_by);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_history_old_statuses ON asset_status_history USING GIN (old_health_statuses);`);
        console.log('   ✅ asset_status_history table created');

        // ============================================
        // ASSET_FLOORPLAN_POSITION TABLE
        // ============================================
        console.log('📋 Creating asset_floorplan_position table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS asset_floorplan_position (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                asset_id UUID UNIQUE NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
                coordinate_x FLOAT NOT NULL,
                coordinate_y FLOAT NOT NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_by UUID REFERENCES users(id) ON DELETE SET NULL
            );
        `);

        await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_floorplan_asset ON asset_floorplan_position(asset_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_floorplan_floor ON asset_floorplan_position(floor_id);`);
        console.log('   ✅ asset_floorplan_position table created');

        // ============================================
        // ASSET_TESTING_SCHEDULE TABLE
        // ============================================
        console.log('📋 Creating asset_testing_schedule table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS asset_testing_schedule (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                asset_id UUID UNIQUE NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                last_hp_test_date JSONB,
                next_hp_test_due_date DATE,
                test_frequency_months INTEGER,
                last_refill_date JSONB,
                next_refill_date DATE,
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_testing_asset ON asset_testing_schedule(asset_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_testing_due ON asset_testing_schedule(next_hp_test_due_date);`);
        console.log('   ✅ asset_testing_schedule table created');

        // ============================================
        // ASSET_METADATA TABLE
        // ============================================
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS asset_metadata (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                asset_id UUID UNIQUE NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                tag TEXT,
                model VARCHAR(255),
                serial_number VARCHAR(255),
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_meta_asset ON asset_metadata(asset_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_meta_serial ON asset_metadata(serial_number);`);
        console.log('   ✅ asset_metadata table created');

        // ============================================
        // SPEC_DEFINITIONS TABLE
        // ============================================
        console.log('📋 Creating spec_definitions table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS spec_definitions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                spec_name VARCHAR(255) NOT NULL,
                spec_label VARCHAR(255),
                spec_type VARCHAR(50) NOT NULL,
                spec_unit JSONB,
                is_required BOOLEAN DEFAULT false,
                display_order INTEGER,
                select_options JSONB,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE(category_id, spec_name)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_spec_def_category ON spec_definitions(category_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_spec_def_order ON spec_definitions(display_order);`);
        console.log('   ✅ spec_definitions table created');

        // ============================================
        // ASSET_SPEC_VALUES TABLE
        // ============================================
        console.log('📋 Creating asset_spec_values table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS asset_spec_values (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                spec_definition_id UUID NOT NULL REFERENCES spec_definitions(id) ON DELETE CASCADE,
                spec_value TEXT,
                unit VARCHAR(100),
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE(asset_id, spec_definition_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_spec_asset ON asset_spec_values(asset_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_spec_def ON asset_spec_values(spec_definition_id);`);
        console.log('   ✅ asset_spec_values table created');

        // ============================================
        // ASSET_DOCUMENTS TABLE
        // ============================================
        console.log('📋 Creating asset_documents table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS asset_documents (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                document_url TEXT NOT NULL,
                description VARCHAR(500),
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_asset_docs_asset ON asset_documents(asset_id);`);
        console.log('   ✅ asset_documents table created');

        // ============================================
        // ASSET_LOCATION_HISTORY TABLE
        // ============================================
        console.log('📋 Creating asset_location_history table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS asset_location_history (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                latitude DECIMAL(10,8) NOT NULL,
                longitude DECIMAL(11,8) NOT NULL,
                recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
                recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_location_hist_asset ON asset_location_history(asset_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_location_hist_date ON asset_location_history(recorded_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_location_hist_asset_date ON asset_location_history(asset_id, recorded_at);`);
        console.log('   ✅ asset_location_history table created');

        console.log('\n✅ Assets Module Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Assets Module Migration...\n');

    try {
        await sequelize.authenticate();

        // Drop tables in reverse order
        await sequelize.query('DROP TABLE IF EXISTS asset_location_history CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS asset_documents CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS asset_spec_values CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS spec_definitions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS asset_metadata CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS asset_testing_schedule CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS asset_floorplan_position CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS asset_status_history CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS assets CASCADE;');

        // Drop enum types
        await sequelize.query('DROP TYPE IF EXISTS hp_test_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS refill_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS maintenance_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS health_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS asset_status_enum;');

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
