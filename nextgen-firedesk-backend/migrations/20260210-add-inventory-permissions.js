/**
 * Migration: Add Inventory Permissions
 * Inserts all action permissions for the 'inventory' entity into the permissions table.
 * Idempotent: uses ON CONFLICT DO NOTHING so it's safe to re-run.
 *
 * Run standalone: node migrations/20260210-add-inventory-permissions.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Add Inventory Permissions Migration...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Ensure uuid-ossp extension is available (idempotent)
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

        console.log('📋 Inserting inventory permissions...');

        const entity  = 'inventory';
        const actions = ['create', 'read', 'update', 'delete', 'assign', 'export'];

        const valueRows = actions
            .map(action => `(uuid_generate_v4(), '${entity}', '${action}', NOW())`)
            .join(',\n            ');

        await sequelize.query(`
            INSERT INTO permissions (id, entity_name, action_name, created_at)
            VALUES
                ${valueRows}
            ON CONFLICT (entity_name, action_name) DO NOTHING;
        `);

        console.log(`✅ Permissions inserted (skipped if already exist) for entity: ${entity}`);
        actions.forEach(a => console.log(`   - ${entity}:${a}`));

        console.log('\n✅ Add Inventory Permissions Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Add Inventory Permissions Migration...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        await sequelize.query(`
            DELETE FROM permissions
            WHERE entity_name = 'inventory';
        `);

        console.log('✅ Deleted all permissions for entity: inventory');
        console.log('\n✅ Rollback completed!\n');

    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        throw error;
    }
}

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
