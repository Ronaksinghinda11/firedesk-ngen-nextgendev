/**
 * Migration: Add service_type_id to questions table
 * Links questions to specific service types (Maintenance, Inspection, Testing)
 * Run with: node migrations/20260119164000-add-service-type-to-questions.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('Adding service_type column to questions table...');

    await sequelize.query(`
    ALTER TABLE questions 
    ADD COLUMN service_type VARCHAR(50);
  `);

    await sequelize.query(`
    CREATE INDEX idx_questions_service_type ON questions(service_type);
  `);

    await sequelize.query(`
    COMMENT ON COLUMN questions.service_type IS 'inspection, testing, maintenance';
  `);

    console.log('✅ service_type column added to questions table');
}

async function down() {
    console.log('Removing service_type column from questions table...');

    await sequelize.query(`DROP INDEX IF EXISTS idx_questions_service_type;`);
    await sequelize.query(`ALTER TABLE questions DROP COLUMN IF EXISTS service_type;`);

    console.log('✅ service_type column removed from questions table');
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
