/**
 * Migration: Assign Manager Permissions
 * Grants full CRUD permissions for Incidents and CAPA Steps to the Manager role
 *
 * Run: node migrations/009_assign_manager_permissions.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');
const { Role, Permission } = require('../src/models/user-management');
const { ENTITIES, ACTIONS } = require('../src/utils/permission_constants');

async function up() {
    console.log('🚀 Running Assign Manager Permissions Migration (009)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // 1. Find the Manager Role
        const managerRole = await Role.findOne({
            where: { name: 'Manager' }
        });

        if (!managerRole) {
            console.error('❌ Manager role not found! Aborting.');
            return;
        }
        console.log(`✅ Found Manager role: ${managerRole.id}`);

        // 2. Define entities allowed for Manager
        const entitiesToGrant = [
            ENTITIES.INCIDENTS,
            ENTITIES.CAPA_STEPS
        ];

        // 3. Create permissions if they don't exist and assign to Manager
        for (const entity of entitiesToGrant) {
            console.log(`\n📋 Processing entity: ${entity}`);

            for (const action of Object.values(ACTIONS)) {
                // Create or find permission
                const [permission, created] = await Permission.findOrCreate({
                    where: {
                        entity_name: entity,
                        action_name: action
                    },
                    defaults: {
                        entity_name: entity,
                        action_name: action
                    }
                });

                if (created) {
                    console.log(`   ✨ Created permission: ${entity} - ${action}`);
                } else {
                    console.log(`   ℹ️  Permission exists: ${entity} - ${action}`);
                }

                // Assign to Manager role
                // Check if already assigned to avoid duplicates (though model methods usually handle this, explicit check is safe)
                const hasPermission = await managerRole.hasPermission(permission);
                if (!hasPermission) {
                    await managerRole.addPermission(permission);
                    console.log(`   ➕ Assigned to Manager: ${entity} - ${action}`);
                } else {
                    console.log(`   ✔️  Already assigned to Manager: ${entity} - ${action}`);
                }
            }
        }

        console.log('\n✅ Manager permissions updated successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Manager Permissions Assignment...\n');

    try {
        await sequelize.authenticate();

        const managerRole = await Role.findOne({
            where: { name: 'Manager' }
        });

        if (!managerRole) {
            console.log('⚠️ Manager role not found, nothing to revoke.');
            return;
        }

        const entitiesRevoke = [
            ENTITIES.INCIDENTS,
            ENTITIES.CAPA_STEPS
        ];

        for (const entity of entitiesRevoke) {
            const permissions = await Permission.findAll({
                where: { entity_name: entity }
            });

            if (permissions.length > 0) {
                await managerRole.removePermissions(permissions);
                console.log(`➖ Revoked permissions for ${entity} from Manager`);

                // Optionally delete the permissions themselves if we want to clean up completely
                // await Permission.destroy({ where: { entity_name: entity } });
            }
        }

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
            // Close connection only if script ran standalone
            // Models keep connection alive?
            // await sequelize.close(); 
            process.exit(0);
        }
    })();
}
