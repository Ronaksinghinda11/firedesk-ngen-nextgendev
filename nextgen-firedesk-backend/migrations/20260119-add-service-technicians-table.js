'use strict';

/**
 * Migration: Create service_technicians junction table
 *
 * This file can be executed via:
 *   node migrations/20260119-add-service-technicians-table.js
 *
 * It will:
 *  - use ../config/config.js sequelize instance (so it respects your .env)
 *  - check if table exists and skip if already present
 *  - create table, constraints and indexes
 *
 * Exports up/down for CLI/other usage as well.
 */

require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});

const SequelizeLib = require('sequelize'); // for QueryTypes / types
const { sequelize } = require('../config/config');

async function up(queryInterfaceParam, SequelizeParam) {
  // If called by Sequelize CLI, queryInterfaceParam will be provided.
  // If called manually (node file.js) we'll build our own queryInterface.
  const queryInterface = queryInterfaceParam || sequelize.getQueryInterface();
  const Sequelize = SequelizeParam || SequelizeLib;

  // Safe existence check
  const tableExistsResult = await queryInterface.sequelize.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables 
       WHERE table_name = 'service_technicians'
     ) AS "exists"`,
    { type: Sequelize.QueryTypes.SELECT }
  );

  if (Array.isArray(tableExistsResult) && tableExistsResult[0] && tableExistsResult[0].exists) {
    console.log('Table service_technicians already exists, skipping creation');
    return;
  }

  await queryInterface.createTable('service_technicians', {
    id: {
      type: SequelizeLib.UUID,
      defaultValue: SequelizeLib.UUIDV4,
      primaryKey: true,
    },
    service_id: {
      type: SequelizeLib.UUID,
      allowNull: false,
      references: {
        model: 'service_submissions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    technician_id: {
      type: SequelizeLib.UUID,
      allowNull: false,
      references: {
        model: 'technicians',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    assigned_by: {
      type: SequelizeLib.UUID,
      allowNull: true,
      references: {
        model: 'managers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    assigned_at: {
      type: SequelizeLib.DATE,
      allowNull: false,
      defaultValue: SequelizeLib.NOW,
    },
    status: {
      type: SequelizeLib.ENUM('assigned', 'started', 'completed', 'declined'),
      allowNull: false,
      defaultValue: 'assigned',
    },
    notes: {
      type: SequelizeLib.TEXT,
      allowNull: true,
    },
    created_at: {
      type: SequelizeLib.DATE,
      allowNull: false,
      defaultValue: SequelizeLib.NOW,
    },
    updated_at: {
      type: SequelizeLib.DATE,
      allowNull: false,
      defaultValue: SequelizeLib.NOW,
    },
  });

  // Unique constraint
  await queryInterface.addConstraint('service_technicians', {
    fields: ['service_id', 'technician_id'],
    type: 'unique',
    name: 'unique_service_technician',
  });

  // Indexes
  await queryInterface.addIndex('service_technicians', ['service_id'], {
    name: 'idx_service_technicians_service_id',
  });
  await queryInterface.addIndex('service_technicians', ['technician_id'], {
    name: 'idx_service_technicians_technician_id',
  });
  await queryInterface.addIndex('service_technicians', ['status'], {
    name: 'idx_service_technicians_status',
  });

  console.log('✅ Created service_technicians table with indexes');
}

async function down(queryInterfaceParam, SequelizeParam) {
  const queryInterface = queryInterfaceParam || sequelize.getQueryInterface();
  // drop table (this will implicitly remove constraints/indexes created by createTable)
  await queryInterface.dropTable('service_technicians');

  // optionally drop enum type to avoid lingering types (Sequelize creates enum type automatically)
  try {
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_service_technicians_status";`);
    console.log('✅ Dropped enum type enum_service_technicians_status (if existed)');
  } catch (err) {
    // ignore if it fails
  }

  console.log('✅ Dropped service_technicians table');
}

/* -------------------------
   Self-run when executed with node
   ------------------------- */
if (require.main === module) {
  (async () => {
    try {
      console.log('Running migration: service_technicians (manual mode)');
      await up(); // uses sequelize.getQueryInterface() internally
      console.log('🎉 Migration finished successfully');
      process.exit(0);
    } catch (err) {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { up, down };
