
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { sequelize } = require('./config/config');

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        const [results] = await sequelize.query(`
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'tickets' AND column_name = 'completed_status';
        `);
        console.log('Column Info:', results);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
})();
