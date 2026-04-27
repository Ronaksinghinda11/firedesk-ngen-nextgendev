/**
 * Migration: Users Module
 * Creates tables for user management, roles, permissions, and domain users
 * 
 * Tables: roles, permissions, role_permissions, users, refresh_tokens, managers, technicians
 * 
 * Run: node migrations/001_users_module.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Users Module Migration (001)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ============================================
        // ROLES TABLE
        // ============================================
        console.log('📋 Creating roles table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) UNIQUE NOT NULL,
                description VARCHAR(500),
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('   ✅ roles table created');

        // ============================================
        // PERMISSIONS TABLE
        // ============================================
        console.log('📋 Creating permissions table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                entity_name VARCHAR(100) NOT NULL,
                action_name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(entity_name, action_name)
            );
        `);
        console.log('   ✅ permissions table created');

        // ============================================
        // ROLE_PERMISSIONS TABLE
        // ============================================
        console.log('📋 Creating role_permissions table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(role_id, permission_id)
            );
        `);

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
        `);
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
        `);
        console.log('   ✅ role_permissions table created');

        // ============================================
        // USERS TABLE
        // ============================================
        console.log('📋 Creating users table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE user_status_enum AS ENUM ('Active', 'Inactive');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255),
                display_name VARCHAR(255),
                phone VARCHAR(20) UNIQUE,
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                profile_pic VARCHAR(500),
                status user_status_enum DEFAULT 'Active',
                otp TEXT,
                otp_expiry TIMESTAMP,
                otp_is_used BOOLEAN DEFAULT false,
                device_token VARCHAR(500),
                role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
        `);
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
        `);
        console.log('   ✅ users table created');

        // ============================================
        // REFRESH_TOKENS TABLE
        // ============================================
        console.log('📋 Creating refresh_tokens table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                token TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('   ✅ refresh_tokens table created');

        // ============================================
        // MANAGERS TABLE
        // ============================================
        console.log('📋 Creating managers table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE manager_status_enum AS ENUM ('Active', 'Inactive');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS managers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                manager_code VARCHAR(50) UNIQUE,
                user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                status manager_status_enum DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_managers_user ON managers(user_id);
        `);
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_managers_status ON managers(status);
        `);
        console.log('   ✅ managers table created');

        // ============================================
        // TECHNICIANS TABLE (vendor_id FK added later)
        // ============================================
        console.log('📋 Creating technicians table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE technician_status_enum AS ENUM ('Active', 'Inactive');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS technicians (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                technician_code VARCHAR(50) UNIQUE,
                user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                vendor_id UUID,
                technician_type VARCHAR(50),
                experience VARCHAR(100),
                specialization VARCHAR(255),
                status technician_status_enum DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_technicians_user ON technicians(user_id);
        `);
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_technicians_vendor ON technicians(vendor_id);
        `);
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);
        `);
        console.log('   ✅ technicians table created');

        console.log('\n✅ Users Module Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Users Module Migration...\n');

    try {
        await sequelize.authenticate();

        // Drop tables in reverse order (respecting foreign keys)
        await sequelize.query('DROP TABLE IF EXISTS technicians CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS managers CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS refresh_tokens CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS users CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS role_permissions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS permissions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS roles CASCADE;');

        // Drop enum types
        await sequelize.query('DROP TYPE IF EXISTS technician_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS manager_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS user_status_enum;');

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
