// 'use strict';

// /**
//  * Migration: Inventory Management Overhaul
//  *
//  * 1. Add ticket_category ENUM to tickets
//  * 2. Migrate existing ticket_type data
//  * 3. Drop ticket_type column
//  * 4. Make asset_id nullable on tickets
//  * 5. Add inventory_asset_id FK on tickets
//  * 6. Add building_id, floor_id, wing_id, location to tickets
//  * 7. Add total_spare_cost to tickets
//  * 8. Add asset_code to inventory_assets
//  * 9. Rename ticket_steps → ticket_tasks (and all related tables/columns)
//  */

// module.exports = {
//     up: async (queryInterface, Sequelize) => {
//         const transaction = await queryInterface.sequelize.transaction();

//         try {
//             // ─── 1. Create ticket_category ENUM and add column ────────────────────
//             await queryInterface.sequelize.query(
//                 `CREATE TYPE "enum_tickets_ticket_category" AS ENUM ('Installation', 'Breakdown Maintenance', 'Preventive Maintenance', 'General');`,
//                 { transaction }
//             );

//             await queryInterface.addColumn('tickets', 'ticket_category', {
//                 type: Sequelize.ENUM('Installation', 'Breakdown Maintenance', 'Preventive Maintenance', 'General'),
//                 allowNull: false,
//                 defaultValue: 'General',
//             }, { transaction });

//             // ─── 2. Migrate existing ticket_type data ─────────────────────────────
//             // Check if ticket_type column exists before migrating
//             const [cols] = await queryInterface.sequelize.query(
//                 `SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'ticket_type';`,
//                 { transaction }
//             );

//             if (cols.length > 0) {
//                 await queryInterface.sequelize.query(
//                     `UPDATE tickets SET ticket_category = 'General';`,
//                     { transaction }
//                 );

//                 // ─── 3. Drop ticket_type column ───────────────────────────────────────
//                 await queryInterface.removeColumn('tickets', 'ticket_type', { transaction });
//                 await queryInterface.sequelize.query(
//                     `DROP TYPE IF EXISTS "enum_tickets_ticket_type";`,
//                     { transaction }
//                 );
//             }

//             // ─── 4. Make asset_id nullable ────────────────────────────────────────
//             await queryInterface.changeColumn('tickets', 'asset_id', {
//                 type: Sequelize.UUID,
//                 allowNull: true,
//                 references: { model: 'assets', key: 'id' },
//             }, { transaction });

//             // ─── 5. Add inventory_asset_id FK ─────────────────────────────────────
//             await queryInterface.addColumn('tickets', 'inventory_asset_id', {
//                 type: Sequelize.UUID,
//                 allowNull: true,
//                 references: { model: 'inventory_assets', key: 'id' },
//                 onDelete: 'SET NULL',
//             }, { transaction });

//             // ─── 6. Add location fields to tickets ────────────────────────────────
//             await queryInterface.addColumn('tickets', 'building_id', {
//                 type: Sequelize.UUID,
//                 allowNull: true,
//                 references: { model: 'buildings', key: 'id' },
//                 onDelete: 'SET NULL',
//             }, { transaction });

//             await queryInterface.addColumn('tickets', 'floor_id', {
//                 type: Sequelize.UUID,
//                 allowNull: true,
//                 references: { model: 'floors', key: 'id' },
//                 onDelete: 'SET NULL',
//             }, { transaction });

//             await queryInterface.addColumn('tickets', 'wing_id', {
//                 type: Sequelize.UUID,
//                 allowNull: true,
//                 references: { model: 'wings', key: 'id' },
//                 onDelete: 'SET NULL',
//             }, { transaction });

//             await queryInterface.addColumn('tickets', 'location', {
//                 type: Sequelize.STRING(255),
//                 allowNull: true,
//             }, { transaction });

//             // ─── 7. Add total_spare_cost ──────────────────────────────────────────
//             await queryInterface.addColumn('tickets', 'total_spare_cost', {
//                 type: Sequelize.DECIMAL(12, 2),
//                 allowNull: true,
//                 defaultValue: 0,
//             }, { transaction });

//             // ─── 8. Add asset_code to inventory_assets ────────────────────────────
//             await queryInterface.addColumn('inventory_assets', 'asset_code', {
//                 type: Sequelize.STRING(100),
//                 allowNull: true,
//             }, { transaction });

//             // ─── 9. Rename ticket_steps → ticket_tasks ────────────────────────────

//             // 9a. Rename the main table
//             await queryInterface.renameTable('ticket_steps', 'ticket_tasks', { transaction });

//             // 9b. Rename step_number → task_number in ticket_tasks
//             await queryInterface.renameColumn('ticket_tasks', 'step_number', 'task_number', { transaction });

//             // 9c. Rename ticket_step_checklist_questions table and its step_id column
//             await queryInterface.renameTable('ticket_step_checklist_questions', 'ticket_task_checklist_questions', { transaction });
//             await queryInterface.renameColumn('ticket_task_checklist_questions', 'step_id', 'task_id', { transaction });

//             // 9d. Rename ticket_step_checklist_answers table and its step_id column
//             await queryInterface.renameTable('ticket_step_checklist_answers', 'ticket_task_checklist_answers', { transaction });
//             await queryInterface.renameColumn('ticket_task_checklist_answers', 'step_id', 'task_id', { transaction });

//             // 9e. Rename ticket_step_approvals table and its step_id column
//             await queryInterface.renameTable('ticket_step_approvals', 'ticket_task_approvals', { transaction });
//             await queryInterface.renameColumn('ticket_task_approvals', 'step_id', 'task_id', { transaction });

//             // 9f. Rename step_id → task_id in ticket_inventory_usage
//             await queryInterface.renameColumn('ticket_inventory_usage', 'step_id', 'task_id', { transaction });

//             // ─── 10. Rename ENUM types for ticket_tasks status ────────────────────
//             // The old enum type names may have been auto-generated by Sequelize.
//             // We leave the underlying ENUM types as-is since Postgres reuses them by reference.

//             await transaction.commit();
//             console.log('✅ Migration 20260331-inventory-management-overhaul: UP completed');
//         } catch (error) {
//             await transaction.rollback();
//             console.error('❌ Migration 20260331-inventory-management-overhaul: UP failed', error);
//             throw error;
//         }
//     },

//     down: async (queryInterface, Sequelize) => {
//         const transaction = await queryInterface.sequelize.transaction();

//         try {
//             // Reverse order of changes

//             // 9f. task_id → step_id in ticket_inventory_usage
//             await queryInterface.renameColumn('ticket_inventory_usage', 'task_id', 'step_id', { transaction });

//             // 9e. ticket_task_approvals → ticket_step_approvals
//             await queryInterface.renameColumn('ticket_task_approvals', 'task_id', 'step_id', { transaction });
//             await queryInterface.renameTable('ticket_task_approvals', 'ticket_step_approvals', { transaction });

//             // 9d. ticket_task_checklist_answers → ticket_step_checklist_answers
//             await queryInterface.renameColumn('ticket_task_checklist_answers', 'task_id', 'step_id', { transaction });
//             await queryInterface.renameTable('ticket_task_checklist_answers', 'ticket_step_checklist_answers', { transaction });

//             // 9c. ticket_task_checklist_questions → ticket_step_checklist_questions
//             await queryInterface.renameColumn('ticket_task_checklist_questions', 'task_id', 'step_id', { transaction });
//             await queryInterface.renameTable('ticket_task_checklist_questions', 'ticket_step_checklist_questions', { transaction });

//             // 9b. task_number → step_number
//             await queryInterface.renameColumn('ticket_tasks', 'task_number', 'step_number', { transaction });

//             // 9a. ticket_tasks → ticket_steps
//             await queryInterface.renameTable('ticket_tasks', 'ticket_steps', { transaction });

//             // 8. Remove asset_code from inventory_assets
//             await queryInterface.removeColumn('inventory_assets', 'asset_code', { transaction });

//             // 7. Remove total_spare_cost
//             await queryInterface.removeColumn('tickets', 'total_spare_cost', { transaction });

//             // 6. Remove location fields
//             await queryInterface.removeColumn('tickets', 'location', { transaction });
//             await queryInterface.removeColumn('tickets', 'wing_id', { transaction });
//             await queryInterface.removeColumn('tickets', 'floor_id', { transaction });
//             await queryInterface.removeColumn('tickets', 'building_id', { transaction });

//             // 5. Remove inventory_asset_id
//             await queryInterface.removeColumn('tickets', 'inventory_asset_id', { transaction });

//             // 4. Make asset_id NOT NULL again
//             await queryInterface.changeColumn('tickets', 'asset_id', {
//                 type: Sequelize.UUID,
//                 allowNull: false,
//                 references: { model: 'assets', key: 'id' },
//             }, { transaction });

//             // 3 & 2 & 1. Re-add ticket_type
//             await queryInterface.sequelize.query(
//                 `CREATE TYPE "enum_tickets_ticket_type" AS ENUM ('General', 'Asset Related');`,
//                 { transaction }
//             );
//             await queryInterface.addColumn('tickets', 'ticket_type', {
//                 type: Sequelize.ENUM('General', 'Asset Related'),
//                 defaultValue: 'General',
//             }, { transaction });
//             await queryInterface.sequelize.query(
//                 `UPDATE tickets SET ticket_type = 'General';`,
//                 { transaction }
//             );

//             // Drop ticket_category
//             await queryInterface.removeColumn('tickets', 'ticket_category', { transaction });
//             await queryInterface.sequelize.query(
//                 `DROP TYPE IF EXISTS "enum_tickets_ticket_category";`,
//                 { transaction }
//             );

//             await transaction.commit();
//             console.log('✅ Migration 20260331-inventory-management-overhaul: DOWN completed');
//         } catch (error) {
//             await transaction.rollback();
//             console.error('❌ Migration 20260331-inventory-management-overhaul: DOWN failed', error);
//             throw error;
//         }
//     },
// };



'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Sequelize } = require('sequelize');

// ✅ DB connection using env
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    console.log('🚀 Running Inventory Management Migration...\n');

    // 1. ENUM (safe)
    console.log('STEP 1: Creating ENUM');
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_tickets_ticket_category" AS ENUM 
        ('Installation', 'Breakdown Maintenance', 'Preventive Maintenance', 'General');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('STEP 2: Adding column ticket_category');
    await queryInterface.addColumn('tickets', 'ticket_category', {
      type: Sequelize.ENUM('Installation', 'Breakdown Maintenance', 'Preventive Maintenance', 'General'),
      allowNull: false,
      defaultValue: 'General',
    }, { transaction });

    console.log('STEP 3: Checking old column');
    // const [cols] = await sequelize.query(
    //   `SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'ticket_type';`
    // );

    // if (cols.length > 0) {
    //   console.log('STEP 4: Migrating old data');
    //   await sequelize.query(`UPDATE tickets SET ticket_category = 'General';`);

    //   console.log('STEP 5: Dropping old column');
    //   await queryInterface.removeColumn('tickets', 'ticket_type', { transaction });

    //   await sequelize.query(`DROP TYPE IF EXISTS "enum_tickets_ticket_type";`);
    // }

    console.log('STEP 6: Updating asset_id');
    await queryInterface.changeColumn('tickets', 'asset_id', {
      type: Sequelize.UUID,
      allowNull: true,
    }, { transaction });

    console.log('STEP 7: Adding inventory_asset_id');
    await queryInterface.addColumn('tickets', 'inventory_asset_id', {
      type: Sequelize.UUID,
      allowNull: true,
    }, { transaction });

    console.log('STEP 8: Adding location fields');
    await queryInterface.addColumn('tickets', 'building_id', { type: Sequelize.UUID }, { transaction });
    await queryInterface.addColumn('tickets', 'floor_id', { type: Sequelize.UUID }, { transaction });
    await queryInterface.addColumn('tickets', 'wing_id', { type: Sequelize.UUID }, { transaction });
    await queryInterface.addColumn('tickets', 'location', { type: Sequelize.STRING }, { transaction });

    console.log('STEP 9: Adding total_spare_cost');
    await queryInterface.addColumn('tickets', 'total_spare_cost', {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0,
    }, { transaction });

    console.log('STEP 10: Adding asset_code');
    await queryInterface.addColumn('inventory_assets', 'asset_code', {
      type: Sequelize.STRING,
    }, { transaction });

    console.log('STEP 11: Renaming tables');
    await queryInterface.renameTable('ticket_steps', 'ticket_tasks', { transaction });
    await queryInterface.renameColumn('ticket_tasks', 'step_number', 'task_number', { transaction });

    await queryInterface.renameTable('ticket_step_checklist_questions', 'ticket_task_checklist_questions', { transaction });
    await queryInterface.renameColumn('ticket_task_checklist_questions', 'step_id', 'task_id', { transaction });

    await queryInterface.renameTable('ticket_step_checklist_answers', 'ticket_task_checklist_answers', { transaction });
    await queryInterface.renameColumn('ticket_task_checklist_answers', 'step_id', 'task_id', { transaction });

    await queryInterface.renameTable('ticket_step_approvals', 'ticket_task_approvals', { transaction });
    await queryInterface.renameColumn('ticket_task_approvals', 'step_id', 'task_id', { transaction });

    await queryInterface.renameColumn('ticket_inventory_usage', 'step_id', 'task_id', { transaction });

    await transaction.commit();
    console.log('\n✅ Migration completed successfully\n');

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Migration failed:', err.message);
    throw err;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    console.log('🔄 Running rollback...\n');

    await queryInterface.renameColumn('ticket_inventory_usage', 'task_id', 'step_id', { transaction });

    await queryInterface.renameColumn('ticket_task_approvals', 'task_id', 'step_id', { transaction });
    await queryInterface.renameTable('ticket_task_approvals', 'ticket_step_approvals', { transaction });

    await queryInterface.renameColumn('ticket_task_checklist_answers', 'task_id', 'step_id', { transaction });
    await queryInterface.renameTable('ticket_task_checklist_answers', 'ticket_step_checklist_answers', { transaction });

    await queryInterface.renameColumn('ticket_task_checklist_questions', 'task_id', 'step_id', { transaction });
    await queryInterface.renameTable('ticket_task_checklist_questions', 'ticket_step_checklist_questions', { transaction });

    await queryInterface.renameColumn('ticket_tasks', 'task_number', 'step_number', { transaction });
    await queryInterface.renameTable('ticket_tasks', 'ticket_steps', { transaction });

    await queryInterface.removeColumn('inventory_assets', 'asset_code', { transaction });
    await queryInterface.removeColumn('tickets', 'total_spare_cost', { transaction });

    await queryInterface.removeColumn('tickets', 'location', { transaction });
    await queryInterface.removeColumn('tickets', 'wing_id', { transaction });
    await queryInterface.removeColumn('tickets', 'floor_id', { transaction });
    await queryInterface.removeColumn('tickets', 'building_id', { transaction });

    await queryInterface.removeColumn('tickets', 'inventory_asset_id', { transaction });

    await queryInterface.removeColumn('tickets', 'ticket_category', { transaction });
    await sequelize.query(`DROP TYPE IF EXISTS "enum_tickets_ticket_category";`);

    await transaction.commit();
    console.log('✅ Rollback completed\n');

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', err.message);
    throw err;
  }
}

// 🔥 EXECUTION ENTRY
if (require.main === module) {
  const action = process.argv[2] || 'up';

  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ DB Connected\n');

      if (action === 'down') {
        await down();
      } else {
        await up();
      }

    } catch (err) {
      console.error('❌ Script error:', err.message);
      process.exit(1);
    } finally {
      await sequelize.close();
      process.exit(0);
    }
  })();
}

module.exports = { up, down };