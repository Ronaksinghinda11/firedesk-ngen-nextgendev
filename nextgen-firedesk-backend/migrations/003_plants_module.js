/**
 * Migration: Plants Module
 * Creates tables for organization, plants, and building hierarchy
 * 
 * Tables: organization, plants, buildings, floors, wings, entrances, staircases,
 *         lifts, diesel_generators, fire_safety_systems, compliance_records,
 *         monitoring_forms, monitoring_devices, layouts, maintenance_schedulers,
 *         plant_managers, plant_categories, technician_plants, technician_managers, technician_categories
 * 
 * Run: node migrations/003_plants_module.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Plants Module Migration (003)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ============================================
        // ORGANIZATION TABLE
        // ============================================
        console.log('📋 Creating organization table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS organization (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                organization_code VARCHAR(50) UNIQUE NOT NULL,
                organization_name VARCHAR(255) NOT NULL,
                address TEXT NOT NULL,
                gst_number VARCHAR(15),
                country VARCHAR(50),
                state VARCHAR(50),
                city VARCHAR(50),
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                no_of_plants INTEGER DEFAULT 3,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_org_created_by ON organization(created_by);`);
        console.log('   ✅ organization table created');

        // ============================================
        // PLANTS TABLE
        // ============================================
        console.log('📋 Creating plants table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE plant_status_enum AS ENUM ('Active', 'Inactive', 'Draft');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS plants (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_code VARCHAR(50) UNIQUE NOT NULL,
                plant_name VARCHAR(255) NOT NULL,
                address_line1 TEXT NOT NULL,
                city VARCHAR(30),
                state VARCHAR(35),
                country VARCHAR(50),
                postal_code VARCHAR(6),
                gst_number VARCHAR(25),
                industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
                organization_id UUID REFERENCES organization(id) ON DELETE CASCADE,
                main_buildings_count INTEGER DEFAULT 0,
                sub_buildings_count INTEGER DEFAULT 0,
                total_plant_area DECIMAL(12,2),
                total_built_up_area DECIMAL(12,2),
                status plant_status_enum DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plants_code ON plants(plant_code);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plants_industry ON plants(industry_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plants_org ON plants(organization_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plants_status ON plants(status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plants_created ON plants(created_at);`);
        console.log('   ✅ plants table created');

        // ============================================
        // BUILDINGS TABLE
        // ============================================
        console.log('📋 Creating buildings table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS buildings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                building_name VARCHAR(255) NOT NULL,
                building_height DECIMAL(8,2),
                total_area DECIMAL(12,2),
                total_built_up_area DECIMAL(12,2),
                building_type VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(plant_id, building_name)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_buildings_plant ON buildings(plant_id);`);
        console.log('   ✅ buildings table created');

        // ============================================
        // FLOORS TABLE
        // ============================================
        console.log('📋 Creating floors table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS floors (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
                floor_name VARCHAR(100) NOT NULL,
                usage_type VARCHAR(100),
                floor_area DECIMAL(12,2),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_floors_building ON floors(building_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_floors_bldg_name ON floors(building_id, floor_name);`);
        console.log('   ✅ floors table created');

        // ============================================
        // WINGS TABLE
        // ============================================
        console.log('📋 Creating wings table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS wings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
                wing_name VARCHAR(100) NOT NULL,
                usage_type VARCHAR(100),
                wing_area DECIMAL(12,2),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_wings_floor ON wings(floor_id);`);
        console.log('   ✅ wings table created');

        // ============================================
        // ENTRANCES TABLE
        // ============================================
        console.log('📋 Creating entrances table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS entrances (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                entrance_name VARCHAR(100) NOT NULL,
                entrance_type VARCHAR(50),
                width_meters DECIMAL(8,2),
                location_description TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_entrances_plant ON entrances(plant_id);`);
        console.log('   ✅ entrances table created');

        // ============================================
        // STAIRCASES TABLE
        // ============================================
        console.log('📋 Creating staircases table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS staircases (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
                available BOOLEAN DEFAULT false,
                quantity INTEGER DEFAULT 1,
                width_meters DECIMAL(8,2),
                fire_rating_minutes INTEGER,
                has_emergency_lighting BOOLEAN DEFAULT false,
                location_description TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_staircases_building ON staircases(building_id);`);
        console.log('   ✅ staircases table created');

        // ============================================
        // LIFTS TABLE
        // ============================================
        console.log('📋 Creating lifts table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS lifts (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
                available BOOLEAN DEFAULT false,
                quantity INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_lifts_building ON lifts(building_id);`);
        console.log('   ✅ lifts table created');

        // ============================================
        // DIESEL_GENERATORS TABLE
        // ============================================
        console.log('📋 Creating diesel_generators table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS diesel_generators (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                available BOOLEAN DEFAULT false,
                quantity INTEGER DEFAULT 1
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_dg_plant ON diesel_generators(plant_id);`);
        console.log('   ✅ diesel_generators table created');

        // ============================================
        // FIRE_SAFETY_SYSTEMS TABLE
        // ============================================
        console.log('📋 Creating fire_safety_systems table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS fire_safety_systems (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL UNIQUE REFERENCES plants(id) ON DELETE CASCADE,
                prime_over_tank DECIMAL(12,2),
                terrace_tank DECIMAL(12,2),
                diesel_tank_1 DECIMAL(10,2),
                diesel_tank_2 DECIMAL(10,2),
                header_pressure_value DECIMAL(8,2),
                system_commission_date DATE,
                diesel_pump_count INTEGER DEFAULT 0,
                electric_pump_count INTEGER DEFAULT 0,
                jockey_pump_count INTEGER DEFAULT 0,
                fire_extinguisher_count INTEGER DEFAULT 0,
                hydrant_point_count INTEGER DEFAULT 0,
                sprinkler_count INTEGER DEFAULT 0,
                safe_assembly_area_count INTEGER DEFAULT 0,
                amc_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
                amc_start_date DATE,
                amc_end_date DATE,
                documents_json JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fss_plant ON fire_safety_systems(plant_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fss_vendor ON fire_safety_systems(amc_vendor_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fss_amc_end ON fire_safety_systems(amc_end_date);`);
        console.log('   ✅ fire_safety_systems table created');

        // ============================================
        // COMPLIANCE_RECORDS TABLE
        // ============================================
        console.log('📋 Creating compliance_records table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS compliance_records (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                fire_noc_number VARCHAR(100),
                fire_noc_expiry_date DATE,
                insurance_policy_number VARCHAR(100),
                insurance_name VARCHAR(255),
                documents_json JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_compliance_plant ON compliance_records(plant_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_compliance_noc_expiry ON compliance_records(fire_noc_expiry_date);`);
        console.log('   ✅ compliance_records table created');

        // ============================================
        // MONITORING_FORMS TABLE
        // ============================================
        console.log('📋 Creating monitoring_forms table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS monitoring_forms (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                building_id UUID,
                floor_id UUID,
                building VARCHAR(255),
                specific_location TEXT,
                installation_date DATE,
                documents_data TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_monitoring_forms_plant ON monitoring_forms(plant_id);`);
        console.log('   ✅ monitoring_forms table created');

        // ============================================
        // MONITORING_DEVICES TABLE
        // ============================================
        console.log('📋 Creating monitoring_devices table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS monitoring_devices (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                monitoring_form_id UUID NOT NULL REFERENCES monitoring_forms(id) ON DELETE CASCADE,
                device_code VARCHAR(100) UNIQUE NOT NULL,
                device_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_monitoring_devices_form ON monitoring_devices(monitoring_form_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_monitoring_devices_code ON monitoring_devices(device_code);`);
        console.log('   ✅ monitoring_devices table created');

        // ============================================
        // LAYOUTS TABLE
        // ============================================
        console.log('📋 Creating layouts table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS layouts (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
                floor_id UUID REFERENCES floors(id) ON DELETE CASCADE,
                wing_id UUID REFERENCES wings(id) ON DELETE CASCADE,
                svg_picture TEXT,
                svg_binary BYTEA,
                file_name VARCHAR(255),
                file_size_bytes BIGINT,
                mime_type VARCHAR(100) DEFAULT 'image/svg+xml',
                health_status VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_layouts_plant ON layouts(plant_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_layouts_bldg_floor ON layouts(building_id, floor_id);`);
        console.log('   ✅ layouts table created');

        // ============================================
        // MAINTENANCE_SCHEDULERS TABLE
        // ============================================
        console.log('📋 Creating maintenance_schedulers table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS maintenance_schedulers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                schedule_start_date DATE NOT NULL,
                schedule_end_date DATE NOT NULL,
                inspection_frequency VARCHAR(50),
                testing_frequency VARCHAR(50),
                maintenance_frequency VARCHAR(50),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_maint_sched_plant ON maintenance_schedulers(plant_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_maint_sched_plant_cat ON maintenance_schedulers(plant_id, category_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_maint_sched_active ON maintenance_schedulers(is_active);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_maint_sched_end ON maintenance_schedulers(schedule_end_date);`);
        console.log('   ✅ maintenance_schedulers table created');

        // ============================================
        // PLANT_MANAGERS JUNCTION TABLE
        // ============================================
        console.log('📋 Creating plant_managers table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS plant_managers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(plant_id, manager_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plant_managers_plant ON plant_managers(plant_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plant_managers_manager ON plant_managers(manager_id);`);
        console.log('   ✅ plant_managers table created');

        // ============================================
        // PLANT_CATEGORIES JUNCTION TABLE
        // ============================================
        console.log('📋 Creating plant_categories table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS plant_categories (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(plant_id, category_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plant_categories_plant ON plant_categories(plant_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plant_categories_cat ON plant_categories(category_id);`);
        console.log('   ✅ plant_categories table created');

        // ============================================
        // TECHNICIAN_PLANTS TABLE
        // ============================================
        console.log('📋 Creating technician_plants table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS technician_plants (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
                plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
                manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(technician_id, plant_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tech_plants_tech ON technician_plants(technician_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tech_plants_plant ON technician_plants(plant_id);`);
        console.log('   ✅ technician_plants table created');

        // ============================================
        // TECHNICIAN_MANAGERS TABLE
        // ============================================
        console.log('📋 Creating technician_managers table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS technician_managers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
                manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(technician_id, manager_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tech_mgrs_tech ON technician_managers(technician_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tech_mgrs_mgr ON technician_managers(manager_id);`);
        console.log('   ✅ technician_managers table created');

        // ============================================
        // TECHNICIAN_CATEGORIES TABLE
        // ============================================
        console.log('📋 Creating technician_categories table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS technician_categories (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
                category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(technician_id, category_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tech_cats_tech ON technician_categories(technician_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tech_cats_cat ON technician_categories(category_id);`);
        console.log('   ✅ technician_categories table created');

        console.log('\n✅ Plants Module Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Plants Module Migration...\n');

    try {
        await sequelize.authenticate();

        // Drop tables in reverse order
        await sequelize.query('DROP TABLE IF EXISTS technician_categories CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS technician_managers CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS technician_plants CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS plant_categories CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS plant_managers CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS maintenance_schedulers CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS layouts CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS monitoring_devices CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS monitoring_forms CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS compliance_records CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS fire_safety_systems CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS diesel_generators CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS lifts CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS staircases CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS entrances CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS wings CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS floors CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS buildings CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS plants CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS organization CASCADE;');

        // Drop enum types
        await sequelize.query('DROP TYPE IF EXISTS plant_status_enum;');

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
