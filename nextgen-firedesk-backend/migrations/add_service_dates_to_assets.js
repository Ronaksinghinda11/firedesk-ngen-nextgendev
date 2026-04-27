require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

(async () => {
    try {
        await sequelize.authenticate();
        await sequelize.query(`
            ALTER TABLE assets
                ADD COLUMN IF NOT EXISTS last_service_date DATE,
                ADD COLUMN IF NOT EXISTS next_service_date DATE;
        `);
        console.log('✅ Added last_service_date and next_service_date to assets table');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
})();
