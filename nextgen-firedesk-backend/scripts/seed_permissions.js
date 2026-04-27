/**
 * Permission Seeder Script
 * 
 * This script syncs all permissions defined in permission_constants.js
 * to the database. Run this after adding new entities to the constants.
 * 
 * Usage: node scripts/seed_permissions.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { sequelize } = require('../config/config');
const { Permission, Role, RolePermission } = require('../src/models/user-management');
const { ENTITIES, ACTIONS } = require('../src/utils/permission_constants');

async function seedPermissions() {
    console.log('🚀 Starting Permission Seeder...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        const entities = Object.values(ENTITIES);
        const actions = Object.values(ACTIONS);

        console.log(`📋 Syncing ${entities.length} entities × ${actions.length} actions = ${entities.length * actions.length} permissions\n`);

        let created = 0;
        let existing = 0;

        for (const entity of entities) {
            for (const action of actions) {
                const [permission, wasCreated] = await Permission.findOrCreate({
                    where: { entity_name: entity, action_name: action },
                    defaults: { entity_name: entity, action_name: action }
                });

                if (wasCreated) {
                    console.log(`   ✅ Created: ${entity}.${action}`);
                    created++;
                } else {
                    existing++;
                }
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Created: ${created}`);
        console.log(`   Already existed: ${existing}`);
        console.log(`   Total: ${created + existing}`);

        // ============================================
        // ASSIGN ALL PERMISSIONS TO ADMIN ROLE
        // ============================================
        console.log('\n🔐 Checking Admin role permissions...');

        const adminRole = await Role.findOne({ where: { name: 'Admin' } });

        if (adminRole) {
            const allPermissions = await Permission.findAll();
            const existingRolePermissions = await RolePermission.findAll({
                where: { role_id: adminRole.id }
            });

            const existingPermissionIds = existingRolePermissions.map(rp => rp.permission_id);
            const missingPermissions = allPermissions.filter(p => !existingPermissionIds.includes(p.id));

            if (missingPermissions.length > 0) {
                const newAssignments = missingPermissions.map(p => ({
                    role_id: adminRole.id,
                    permission_id: p.id
                }));

                await RolePermission.bulkCreate(newAssignments);
                console.log(`   ✅ Assigned ${missingPermissions.length} new permissions to Admin role`);
            } else {
                console.log(`   ✅ Admin role already has all ${allPermissions.length} permissions`);
            }
        } else {
            console.log('   ⚠️ Admin role not found. Create it first via signup or seeder.');
        }

        console.log('\n✅ Permission seeding completed!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run if called directly
if (require.main === module) {
    seedPermissions()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { seedPermissions };
