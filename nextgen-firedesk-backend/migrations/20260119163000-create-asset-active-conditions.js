/**
 * Migration: Create asset_active_conditions table
 * Run with: node migrations/20260119163000-create-asset-active-conditions.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('Creating asset_active_conditions table...');

    await sequelize.query(`
    CREATE TABLE IF NOT EXISTS asset_active_conditions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      condition_id UUID NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
      question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      severity_level VARCHAR(20),
      priority_score INTEGER DEFAULT 0,
      detected_at TIMESTAMP WITH TIME ZONE,
      last_submission_id UUID REFERENCES service_submissions(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(asset_id, condition_id, question_id)
    );
  `);

    await sequelize.query(`
    CREATE INDEX IF NOT EXISTS asset_active_conditions_asset_id_idx 
    ON asset_active_conditions(asset_id);
  `);

    await sequelize.query(`
    CREATE INDEX IF NOT EXISTS asset_active_conditions_priority_score_idx 
    ON asset_active_conditions(priority_score);
  `);

    console.log('✅ asset_active_conditions table created');
}

async function down() {
    console.log('Dropping asset_active_conditions table...');

    await sequelize.query(`DROP TABLE IF EXISTS asset_active_conditions CASCADE;`);

    console.log('✅ asset_active_conditions table dropped');
}

// Allow running as standalone script
if (require.main === module) {
    const action = process.argv[2] || 'up';

    (async () => {
        try {
            await sequelize.authenticate();
            console.log('✅ Database connected\n');

            if (action === 'down') {
                await down();
            } else {
                await up();
            }

            console.log('\n✅ Migration completed successfully');
        } catch (error) {
            console.error('\n❌ Migration failed:', error.message);
            console.error(error);
            process.exit(1);
        } finally {
            await sequelize.close();
            process.exit(0);
        }
    })();
}

module.exports = { up, down };
