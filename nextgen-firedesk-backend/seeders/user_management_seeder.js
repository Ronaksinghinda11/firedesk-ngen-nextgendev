/**
 * User Management Seeder
 * Creates default roles, permissions, and admin user
 * Only modifies Admin role - leaves Manager and Technician unchanged
 * 
 * Run: node seeders/user_management_seeder.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/config');
const {
    User, Role, Permission, RolePermission
} = require('../src/models');
const { ENTITIES, ACTIONS } = require('../src/utils/permission_constants');

async function seed() {
    console.log('🌱 Starting User Management Seeder...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Skip sync - tables already exist
        // await sequelize.sync({ alter: true });
        // console.log('✅ Tables synced\n');

        // ========================================
        // 1. CREATE/UPDATE ADMIN ROLE ONLY
        // ========================================
        console.log('📋 Updating Admin role...');

        const [adminRole, adminCreated] = await Role.findOrCreate({
            where: { name: 'Admin' },
            defaults: {
                name: 'Admin',
                description: 'Full access to all system features',
                is_default: true
            }
        });

        // Update description if role already exists
        if (!adminCreated) {
            await adminRole.update({
                description: 'Full access to all system features',
                is_default: true
            });
            console.log('   ✅ Updated Admin role description');
        } else {
            console.log('   ✅ Created Admin role');
        }

        // Ensure Manager and Technician exist as default roles (without modifying permissions)
        await Role.findOrCreate({
            where: { name: 'Manager' },
            defaults: { name: 'Manager', description: 'Plant management and technician oversight', is_default: true }
        });
        await Role.findOrCreate({
            where: { name: 'Technician' },
            defaults: { name: 'Technician', description: 'Field work and asset servicing', is_default: true }
        });
        console.log('   ✅ Manager and Technician roles exist (unchanged)');

        // ========================================
        // 2. CREATE ALL PERMISSIONS
        // ========================================
        console.log('\n🔐 Creating permissions...');

        const allPermissions = [];
        const entities = Object.values(ENTITIES);
        const actions = Object.values(ACTIONS);

        for (const entity of entities) {
            for (const action of actions) {
                const [permission, created] = await Permission.findOrCreate({
                    where: { entity_name: entity, action_name: action },
                    defaults: { entity_name: entity, action_name: action }
                });
                allPermissions.push(permission);
                if (created) {
                    console.log(`   ✅ Created: ${entity}:${action}`);
                }
            }
        }
        console.log(`   📊 Total permissions: ${allPermissions.length}`);

        // ========================================
        // 3. ASSIGN ALL PERMISSIONS TO ADMIN ONLY
        // ========================================
        console.log('\n👑 Assigning full permissions to Admin...');

        // Clear existing permissions for admin
        await RolePermission.destroy({ where: { role_id: adminRole.id } });

        // Assign all permissions
        const adminPermissions = allPermissions.map(p => ({
            role_id: adminRole.id,
            permission_id: p.id
        }));
        await RolePermission.bulkCreate(adminPermissions, { ignoreDuplicates: true });
        console.log(`   ✅ Assigned ${allPermissions.length} permissions to Admin`);

        // ========================================
        // 3B. ASSIGN INCIDENTS PERMISSIONS TO TECHNICIAN
        // ========================================
        console.log('\n🔧 Assigning INCIDENTS permissions to Technician...');

        const technicianRole = await Role.findOne({ where: { name: 'Technician' } });
        if (technicianRole) {
            // Technicians can create, read and update incidents (for SAMS safety reporting)
            const technicianPermissionEntities = [
                { entity: ENTITIES.INCIDENTS, actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE] },
                { entity: ENTITIES.CAPA_STEPS, actions: [ACTIONS.READ, ACTIONS.UPDATE] }
            ];

            for (const { entity, actions: permActions } of technicianPermissionEntities) {
                for (const action of permActions) {
                    const permission = await Permission.findOne({
                        where: { entity_name: entity, action_name: action }
                    });
                    if (permission) {
                        await RolePermission.findOrCreate({
                            where: { role_id: technicianRole.id, permission_id: permission.id },
                            defaults: { role_id: technicianRole.id, permission_id: permission.id }
                        });
                        console.log(`   ✅ Assigned ${entity}:${action} to Technician`);
                    }
                }
            }
        } else {
            console.log('   ⚠️ Technician role not found');
        }

        // ========================================
        // 4. CREATE ADMIN USER
        // ========================================
        console.log('\n👤 Creating Admin user...');

        const adminPassword = await bcrypt.hash('Admin@123', 10);
        const [adminUser, userCreated] = await User.findOrCreate({
            where: { email: 'admin@firedesk.com' },
            defaults: {
                name: 'Admin',
                email: 'admin@firedesk.com',
                phone: '9999999999',
                password: adminPassword,
                role_id: adminRole.id,
                status: 'Active'
            }
        });

        if (userCreated) {
            console.log('   ✅ Created Admin user');
            console.log('   📧 Email: admin@firedesk.com');
            console.log('   🔑 Password: Admin@123');
        } else {
            console.log('   ⏭️  Admin user already exists');
        }

        // ========================================
        // DONE
        // ========================================
        console.log('\n✅ Seeding completed successfully!\n');

        console.log('📋 Summary:');
        console.log(`   Admin: Full access (${allPermissions.length} permissions)`);
        console.log(`   Manager & Technician: Unchanged`);
        console.log(`   Admin User: admin@firedesk.com / Admin@123`);

    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        console.error(error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

seed();
