/**
 * Migration: Inventory Module
 * Creates tables for the Inventory + Spares module
 *
 * Tables: inventory_assets, inventory_spares, dynamic_master_values
 *
 * Run: node migrations/20260211-inventory-module.js
 * Rollback: node migrations/20260211-inventory-module.js down
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Inventory Module Migration...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ============================================
        // INVENTORY_ASSETS TABLE
        // ============================================
        console.log('📋 Creating inventory_assets table...');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS inventory_assets (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                type VARCHAR(100),
                sub_type VARCHAR(100),
                manufacturer VARCHAR(255),
                model VARCHAR(255),
                serial_number VARCHAR(255),
                manufacturing_date DATE,
                warranty_end_date DATE,
                lifespan_years INTEGER,
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_price DECIMAL(12,2),
                total_price DECIMAL(12,2),
                documents JSONB DEFAULT '[]',
                status VARCHAR(50) NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','moved','reserved')),
                moved_to_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
                moved_at TIMESTAMPTZ,
                notes TEXT,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('   ✅ inventory_assets table created');

        // ============================================
        // INVENTORY_SPARES TABLE
        // ============================================
        console.log('📋 Creating inventory_spares table...');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS inventory_spares (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                spare_name VARCHAR(255) NOT NULL,
                spare_type VARCHAR(50) NOT NULL
                    CHECK (spare_type IN ('consumable','non-consumable')),
                material_form VARCHAR(100),
                unit_of_measurement VARCHAR(100),
                linked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
                quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
                unit_price DECIMAL(12,2),
                total_price DECIMAL(12,2),
                notes TEXT,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('   ✅ inventory_spares table created');

        // ============================================
        // DYNAMIC_MASTER_VALUES TABLE
        // ============================================
        console.log('📋 Creating dynamic_master_values table...');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS dynamic_master_values (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                type VARCHAR(100) NOT NULL,
                value VARCHAR(255) NOT NULL,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT dynamic_master_values_type_value_unique UNIQUE (type, value)
            );
        `);
        console.log('   ✅ dynamic_master_values table created');

        // ============================================
        // INDEXES
        // ============================================
        console.log('📋 Creating indexes...');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_inventory_assets_plant
            ON inventory_assets(plant_id);
        `);
        console.log('   ✅ idx_inventory_assets_plant created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_inventory_assets_status
            ON inventory_assets(status);
        `);
        console.log('   ✅ idx_inventory_assets_status created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_inventory_assets_category
            ON inventory_assets(category_id);
        `);
        console.log('   ✅ idx_inventory_assets_category created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_inventory_assets_product
            ON inventory_assets(product_id);
        `);
        console.log('   ✅ idx_inventory_assets_product created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_inventory_spares_plant
            ON inventory_spares(plant_id);
        `);
        console.log('   ✅ idx_inventory_spares_plant created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_inventory_spares_spare_type
            ON inventory_spares(spare_type);
        `);
        console.log('   ✅ idx_inventory_spares_spare_type created');

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_dynamic_master_values_type
            ON dynamic_master_values(type);
        `);
        console.log('   ✅ idx_dynamic_master_values_type created');

        console.log('\n✅ Inventory Module Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Inventory Module Migration...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Drop indexes first
        console.log('📋 Dropping indexes...');

        await sequelize.query('DROP INDEX IF EXISTS idx_inventory_assets_plant;');
        await sequelize.query('DROP INDEX IF EXISTS idx_inventory_assets_status;');
        await sequelize.query('DROP INDEX IF EXISTS idx_inventory_assets_category;');
        await sequelize.query('DROP INDEX IF EXISTS idx_inventory_assets_product;');
        await sequelize.query('DROP INDEX IF EXISTS idx_inventory_spares_plant;');
        await sequelize.query('DROP INDEX IF EXISTS idx_inventory_spares_spare_type;');
        await sequelize.query('DROP INDEX IF EXISTS idx_dynamic_master_values_type;');
        console.log('   ✅ Indexes dropped');

        // Drop tables (order matters due to FK constraints)
        console.log('📋 Dropping tables...');

        await sequelize.query('DROP TABLE IF EXISTS inventory_spares;');
        console.log('   ✅ inventory_spares dropped');

        await sequelize.query('DROP TABLE IF EXISTS inventory_assets;');
        console.log('   ✅ inventory_assets dropped');

        await sequelize.query('DROP TABLE IF EXISTS dynamic_master_values;');
        console.log('   ✅ dynamic_master_values dropped');

        console.log('\n✅ Rollback completed!\n');

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
