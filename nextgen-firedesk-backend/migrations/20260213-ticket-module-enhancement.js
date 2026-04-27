/**
 * Migration: Ticket Module Enhancement
 * Extends the existing ticket system with:
 *   - Extended ticket_type (Deployment, Maintenance added)
 *   - priority + total_cost columns on tickets
 *   - ticket_steps table (multi-step workflow)
 *   - ticket_step_checklist_questions
 *   - ticket_step_checklist_answers
 *   - ticket_step_approvals
 *   - ticket_inventory_usage
 *
 * BACKWARD COMPATIBLE — existing tickets and APIs are not broken.
 *
 * Run:      node migrations/20260213-ticket-module-enhancement.js
 * Rollback: node migrations/20260213-ticket-module-enhancement.js down
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
  console.log('🚀 Running Ticket Module Enhancement Migration...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Extend ticket_type ENUM (ADD VALUE outside transaction — Postgres rule)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📋 Extending ticket_type enum...');

    // Sequelize names the enum "enum_tickets_ticket_type"
    // ADD VALUE IF NOT EXISTS is idempotent but requires no surrounding transaction
    for (const val of ['Deployment', 'Maintenance']) {
      try {
        await sequelize.query(
          `ALTER TYPE "enum_tickets_ticket_type" ADD VALUE IF NOT EXISTS '${val}';`
        );
        console.log(`   ✅ ticket_type += '${val}'`);
      } catch (e) {
        // Postgres < 9.6 doesn't support IF NOT EXISTS — swallow duplicate errors
        if (!e.message.includes('already exists')) throw e;
        console.log(`   ⚠  '${val}' already present, skipping`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Add priority + total_cost to existing tickets table
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Altering tickets table...');

    await sequelize.query(`
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS priority    VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
          CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
        ADD COLUMN IF NOT EXISTS total_cost  DECIMAL(15,2);
    `);
    console.log('   ✅ priority, total_cost added to tickets');

    // ─────────────────────────────────────────────────────────────────────────
    // 3. ticket_steps
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Creating ticket_steps table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ticket_steps (
        id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        ticket_id               UUID NOT NULL
                                  REFERENCES tickets(id) ON DELETE CASCADE,

        step_number             INTEGER NOT NULL,
        title                   VARCHAR(255),
        description             TEXT,

        -- Free-text role label (e.g. "Electrician", "Safety Officer")
        role_label              VARCHAR(100),

        target_date             DATE NOT NULL,

        assigned_technician_id  UUID
                                  REFERENCES technicians(id) ON DELETE SET NULL,

        requires_approval       BOOLEAN NOT NULL DEFAULT FALSE,
        has_checklist           BOOLEAN NOT NULL DEFAULT FALSE,

        -- Step lifecycle status
        status                  VARCHAR(30) NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                    'pending',
                                    'in_progress',
                                    'pending_approval',
                                    'approved',
                                    'rejected',
                                    'completed'
                                  )),

        started_at              TIMESTAMPTZ,
        completed_at            TIMESTAMPTZ,

        -- How many times this step has been rejected (for audit)
        rejection_count         INTEGER NOT NULL DEFAULT 0,

        -- Notes added by the technician when submitting
        technician_notes        TEXT,

        created_by              UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Each step number is unique per ticket
        UNIQUE (ticket_id, step_number)
      );
    `);
    console.log('   ✅ ticket_steps created');

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ticket_step_checklist_questions
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Creating ticket_step_checklist_questions table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ticket_step_checklist_questions (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        step_id         UUID NOT NULL
                          REFERENCES ticket_steps(id) ON DELETE CASCADE,

        question_text   TEXT NOT NULL,
        question_order  INTEGER NOT NULL DEFAULT 0,
        is_mandatory    BOOLEAN NOT NULL DEFAULT TRUE,

        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        UNIQUE (step_id, question_order)
      );
    `);
    console.log('   ✅ ticket_step_checklist_questions created');

    // ─────────────────────────────────────────────────────────────────────────
    // 5. ticket_step_checklist_answers
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Creating ticket_step_checklist_answers table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ticket_step_checklist_answers (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        question_id   UUID NOT NULL
                        REFERENCES ticket_step_checklist_questions(id) ON DELETE CASCADE,

        step_id       UUID NOT NULL
                        REFERENCES ticket_steps(id) ON DELETE CASCADE,

        -- The user (manager or technician) who answered
        answered_by   UUID REFERENCES users(id) ON DELETE SET NULL,

        -- YES = true, NO = false, unanswered = NULL
        answer        BOOLEAN,
        remarks       TEXT,
        answered_at   TIMESTAMPTZ DEFAULT NOW(),

        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- One answer per question per step submission
        UNIQUE (question_id, step_id)
      );
    `);
    console.log('   ✅ ticket_step_checklist_answers created');

    // ─────────────────────────────────────────────────────────────────────────
    // 6. ticket_step_approvals
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Creating ticket_step_approvals table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ticket_step_approvals (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        step_id         UUID NOT NULL
                          REFERENCES ticket_steps(id) ON DELETE CASCADE,

        ticket_id       UUID NOT NULL
                          REFERENCES tickets(id) ON DELETE CASCADE,

        -- Increments each time the step is rejected and re-submitted
        approval_round  INTEGER NOT NULL DEFAULT 1,

        -- 'ticket_creator' | 'plant_spare_manager' | 'admin'
        approver_role   VARCHAR(50),

        status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected')),

        -- Who submitted the step for approval
        requested_by    UUID REFERENCES users(id) ON DELETE SET NULL,

        -- Who actually approved or rejected
        approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,

        remarks         TEXT,

        requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        acted_at        TIMESTAMPTZ,

        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('   ✅ ticket_step_approvals created');

    // ─────────────────────────────────────────────────────────────────────────
    // 7. ticket_inventory_usage
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Creating ticket_inventory_usage table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ticket_inventory_usage (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        ticket_id     UUID NOT NULL
                        REFERENCES tickets(id) ON DELETE CASCADE,

        -- nullable: usage can be at ticket level or step level
        step_id       UUID
                        REFERENCES ticket_steps(id) ON DELETE SET NULL,

        -- 'asset' = inventory_assets  |  'spare' = inventory_spares
        item_type     VARCHAR(20) NOT NULL
                        CHECK (item_type IN ('asset','spare')),

        -- UUID pointing to inventory_assets.id or inventory_spares.id
        item_id       UUID NOT NULL,

        -- Denormalised name for audit (survives item deletion)
        item_name     VARCHAR(255),

        quantity      DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
        unit_cost     DECIMAL(12,2),
        total_cost    DECIMAL(12,2)
                        GENERATED ALWAYS AS (quantity * unit_cost) STORED,

        consumed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
        notes         TEXT,

        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('   ✅ ticket_inventory_usage created');

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Indexes
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Creating indexes...');

    const indexes = [
      // ticket_steps
      ['idx_ts_ticket_id',    'ticket_steps(ticket_id)'],
      ['idx_ts_status',       'ticket_steps(status)'],
      ['idx_ts_technician',   'ticket_steps(assigned_technician_id) WHERE assigned_technician_id IS NOT NULL'],
      ['idx_ts_target_date',  'ticket_steps(target_date)'],

      // checklist questions
      ['idx_tscq_step',       'ticket_step_checklist_questions(step_id)'],

      // checklist answers
      ['idx_tsca_step',       'ticket_step_checklist_answers(step_id)'],
      ['idx_tsca_question',   'ticket_step_checklist_answers(question_id)'],

      // approvals
      ['idx_tsa_step',        'ticket_step_approvals(step_id)'],
      ['idx_tsa_status',      'ticket_step_approvals(status)'],
      ['idx_tsa_ticket',      'ticket_step_approvals(ticket_id)'],

      // inventory usage
      ['idx_tiu_ticket',      'ticket_inventory_usage(ticket_id)'],
      ['idx_tiu_step',        'ticket_inventory_usage(step_id) WHERE step_id IS NOT NULL'],
      ['idx_tiu_item',        'ticket_inventory_usage(item_type, item_id)'],
    ];

    for (const [name, expr] of indexes) {
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS ${name} ON ${expr};`
      );
      console.log(`   ✅ ${name}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────────');
    console.log('✅ Ticket Module Enhancement Migration completed!');
    console.log('   New columns  : tickets.priority, tickets.total_cost');
    console.log('   New types    : Deployment, Maintenance (ticket_type)');
    console.log('   New tables   : ticket_steps');
    console.log('                  ticket_step_checklist_questions');
    console.log('                  ticket_step_checklist_answers');
    console.log('                  ticket_step_approvals');
    console.log('                  ticket_inventory_usage');
    console.log('   New indexes  : 13');
    console.log('─────────────────────────────────────────────\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.parent) console.error('   DB error:', err.parent.message);
    throw err;
  }
}

async function down() {
  console.log('🔄 Rolling back Ticket Module Enhancement...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Drop in reverse FK dependency order
    const tables = [
      'ticket_inventory_usage',
      'ticket_step_approvals',
      'ticket_step_checklist_answers',
      'ticket_step_checklist_questions',
      'ticket_steps',
    ];

    for (const t of tables) {
      await sequelize.query(`DROP TABLE IF EXISTS ${t} CASCADE;`);
      console.log(`   🗑  ${t} dropped`);
    }

    // Remove added columns from tickets
    await sequelize.query(`
      ALTER TABLE tickets
        DROP COLUMN IF EXISTS priority,
        DROP COLUMN IF EXISTS total_cost;
    `);
    console.log('   🗑  priority, total_cost removed from tickets');

    // Note: Postgres doesn't support DROP VALUE from enums — the extra
    // 'Deployment' / 'Maintenance' values are harmless and left in place.
    console.log('   ℹ  Enum values (Deployment, Maintenance) retained (Postgres limitation)');

    console.log('\n✅ Rollback completed!\n');

  } catch (err) {
    console.error('❌ Rollback failed:', err.message);
    throw err;
  }
}

module.exports = { up, down };

if (require.main === module) {
  const action = process.argv[2] || 'up';

  (async () => {
    try {
      action === 'down' ? await down() : await up();
    } catch (err) {
      console.error('Script error:', err.message);
      process.exit(1);
    } finally {
      await sequelize.close();
      process.exit(0);
    }
  })();
}
