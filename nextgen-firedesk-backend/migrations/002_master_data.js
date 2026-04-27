/**
 * Migration: Master Data Module
 * Creates tables for master/reference data
 * 
 * Tables: industries, vendors, categories, category_files,
 *         products, conditions, manufacturers
 * 
 * Run: node migrations/002_master_data.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Master Data Migration (002)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ============================================
        // INDUSTRIES TABLE
        // ============================================
        console.log('📋 Creating industries table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE industry_status_enum AS ENUM ('Active', 'Inactive');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS industries (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                industry_name VARCHAR(255) UNIQUE,
                industry_code VARCHAR(50) UNIQUE,
                status industry_status_enum DEFAULT 'Active',
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('   ✅ industries table created');

        // ============================================
        // VENDORS TABLE
        // ============================================
        console.log('📋 Creating vendors table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE vendor_status_enum AS ENUM ('Active', 'Inactive');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS vendors (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                vendor_name VARCHAR(255) UNIQUE,
                vendor_code VARCHAR(50) UNIQUE,
                address VARCHAR(500),
                contact_name VARCHAR(255),
                email VARCHAR(255),
                phone_no VARCHAR(20),
                status vendor_status_enum DEFAULT 'Active',
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('   ✅ vendors table created');

        // Add vendor_id FK to technicians table
        await sequelize.query(`
            DO $$ BEGIN
                ALTER TABLE technicians 
                ADD CONSTRAINT fk_technicians_vendor 
                FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('   ✅ Added vendor FK to technicians');

        // ============================================
        // CATEGORIES TABLE
        // ============================================
        console.log('📋 Creating categories table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE category_status_enum AS ENUM ('Active', 'Inactive');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                category_name VARCHAR(255),
                category_code VARCHAR(50) UNIQUE,
                test_frequency_required BOOLEAN DEFAULT false,
                status category_status_enum DEFAULT 'Active',
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('   ✅ categories table created');

        // ============================================
        // CATEGORY_FILES TABLE
        // ============================================
        console.log('📋 Creating category_files table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS category_files (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
                file_name VARCHAR(255),
                mime_type VARCHAR(100),
                file_size INTEGER,
                storage_path VARCHAR(500),
                uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_category_files_category ON category_files(category_id);
        `);
        console.log('   ✅ category_files table created');

        // ============================================
        // PRODUCTS TABLE
        // ============================================
        console.log('📋 Creating products table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE product_status_enum AS ENUM ('Active', 'Inactive');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE test_frequency_enum AS ENUM ('One Year', 'Two Years', 'Three Years', 'Five Years', 'Ten Years');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS products (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
                product_name VARCHAR(255) UNIQUE,
                product_code VARCHAR(50) UNIQUE,
                test_frequency test_frequency_enum,
                variants JSONB,
                image TEXT,
                status product_status_enum DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
        `);
        console.log('   ✅ products table created');

        // ============================================
        // CONDITIONS TABLE
        // ============================================
        console.log('📋 Creating conditions table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE severity_level_enum AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS conditions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                condition_code VARCHAR(50) UNIQUE,
                condition_name VARCHAR(255),
                severity_level severity_level_enum,
                priority_score INTEGER CHECK (priority_score >= 0 AND priority_score <= 100),
                health_impact VARCHAR(255),
                recommended_action TEXT,
                requires_immediate_action BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('   ✅ conditions table created');

        // ============================================
        // MANUFACTURERS TABLE
        // ============================================
        console.log('📋 Creating manufacturers table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS manufacturers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS manufacturers_name_unique ON manufacturers(name);
        `);
        console.log('   ✅ manufacturers table created');

        console.log('\n✅ Master Data Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Master Data Migration...\n');

    try {
        await sequelize.authenticate();

        // Remove FK from technicians before dropping vendors
        await sequelize.query(`
            ALTER TABLE technicians DROP CONSTRAINT IF EXISTS fk_technicians_vendor;
        `);

        // Drop tables in reverse order
        await sequelize.query('DROP TABLE IF EXISTS manufacturers CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS conditions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS products CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS category_files CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS categories CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS vendors CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS industries CASCADE;');

        // Drop enum types
        await sequelize.query('DROP TYPE IF EXISTS severity_level_enum;');
        await sequelize.query('DROP TYPE IF EXISTS test_frequency_enum;');
        await sequelize.query('DROP TYPE IF EXISTS product_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS category_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS vendor_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS industry_status_enum;');

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