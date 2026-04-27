/**
 * Migration: Inventory Spare Transactions Table
 * Creates the inventory_spare_transactions table to log every stock movement
 * (issue OUT / return IN) for inventory spares.
 *
 * Business rules (enforced in service layer, documented here for clarity):
 *   - 'issue'  → stock goes OUT  — allowed for consumable AND non-consumable
 *   - 'return' → stock comes IN  — allowed ONLY for non-consumable spares
 *
 * Run:      node migrations/20260212-inventory-spare-transactions.js
 * Rollback: node migrations/20260212-inventory-spare-transactions.js down
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
  console.log('🚀 Running Inventory Spare Transactions Migration...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Ensure uuid-ossp extension is available
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // ─── ENUM types ──────────────────────────────────────────────────────────
    console.log('📋 Creating enum types...');

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE spare_transaction_type_enum AS ENUM ('issue', 'return');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ spare_transaction_type_enum');

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE spare_return_condition_enum AS ENUM ('good', 'damaged', 'needs_repair');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ spare_return_condition_enum');

    // ─── Main table ──────────────────────────────────────────────────────────
    console.log('\n📋 Creating inventory_spare_transactions table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS inventory_spare_transactions (

        -- Primary key
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Parent spare (cascades on spare deletion)
        spare_id UUID NOT NULL
          REFERENCES inventory_spares(id) ON DELETE CASCADE,

        -- Direction: 'issue' = OUT, 'return' = IN
        transaction_type spare_transaction_type_enum NOT NULL,

        -- ── Quantity fields ──────────────────────────────────────────────────
        -- All quantities are positive; direction is determined by transaction_type
        quantity         DECIMAL(10, 3) NOT NULL CHECK (quantity > 0),
        quantity_before  DECIMAL(10, 3) NOT NULL CHECK (quantity_before >= 0),
        quantity_after   DECIMAL(10, 3) NOT NULL CHECK (quantity_after >= 0),

        -- ── Issue fields (transaction_type = 'issue') ────────────────────────
        issued_to  VARCHAR(255),   -- name / department receiving the spare
        purpose    TEXT,           -- reason for issuing

        -- ── Return fields (transaction_type = 'return') ──────────────────────
        received_from    VARCHAR(255),               -- who returned it
        return_condition spare_return_condition_enum, -- physical state on return

        -- ── Optional linkages ────────────────────────────────────────────────
        -- Asset the spare was installed on or removed from
        linked_asset_id UUID
          REFERENCES assets(id) ON DELETE SET NULL,

        -- Maintenance ticket / work-order that triggered this movement
        -- (stored as UUID without FK so ticket schema changes don't break this)
        linked_ticket_id UUID,

        -- ── General ──────────────────────────────────────────────────────────
        remarks          TEXT,
        transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,

        -- Who created this record
        created_by UUID
          REFERENCES users(id) ON DELETE SET NULL,

        -- Transactions are immutable — only created_at, no updated_at
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('   ✅ inventory_spare_transactions table created');

    // ─── Indexes ─────────────────────────────────────────────────────────────
    console.log('\n📋 Creating indexes...');

    // Most common query: all transactions for a specific spare
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ist_spare_id
        ON inventory_spare_transactions(spare_id);
    `);
    console.log('   ✅ idx_ist_spare_id');

    // Filter by direction (issue vs return)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ist_transaction_type
        ON inventory_spare_transactions(transaction_type);
    `);
    console.log('   ✅ idx_ist_transaction_type');

    // Filter / sort by date range
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ist_transaction_date
        ON inventory_spare_transactions(transaction_date DESC);
    `);
    console.log('   ✅ idx_ist_transaction_date');

    // Audit: who did what
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ist_created_by
        ON inventory_spare_transactions(created_by);
    `);
    console.log('   ✅ idx_ist_created_by');

    // Spare + date combined — common listing query
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ist_spare_date
        ON inventory_spare_transactions(spare_id, transaction_date DESC);
    `);
    console.log('   ✅ idx_ist_spare_date');

    // Linked asset lookups
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ist_linked_asset
        ON inventory_spare_transactions(linked_asset_id)
        WHERE linked_asset_id IS NOT NULL;
    `);
    console.log('   ✅ idx_ist_linked_asset (partial)');

    // Linked ticket lookups
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ist_linked_ticket
        ON inventory_spare_transactions(linked_ticket_id)
        WHERE linked_ticket_id IS NOT NULL;
    `);
    console.log('   ✅ idx_ist_linked_ticket (partial)');

    console.log('\n✅ Inventory Spare Transactions Migration completed successfully!\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.parent) console.error('   DB error:', err.parent.message);
    throw err;
  }
}

async function down() {
  console.log('🔄 Rolling back Inventory Spare Transactions Migration...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Drop table (indexes are dropped automatically with the table)
    await sequelize.query(
      'DROP TABLE IF EXISTS inventory_spare_transactions CASCADE;'
    );
    console.log('   ✅ inventory_spare_transactions table dropped');

    // Drop enum types
    await sequelize.query(
      'DROP TYPE IF EXISTS spare_transaction_type_enum CASCADE;'
    );
    console.log('   ✅ spare_transaction_type_enum dropped');

    await sequelize.query(
      'DROP TYPE IF EXISTS spare_return_condition_enum CASCADE;'
    );
    console.log('   ✅ spare_return_condition_enum dropped');

    console.log('\n✅ Rollback completed!\n');

  } catch (err) {
    console.error('❌ Rollback failed:', err.message);
    throw err;
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
    } catch (err) {
      console.error('Script error:', err.message);
      process.exit(1);
    } finally {
      await sequelize.close();
      process.exit(0);
    }
  })();
}
