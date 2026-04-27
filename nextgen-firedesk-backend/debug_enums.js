
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { sequelize } = require('./config/config');

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        const [results] = await sequelize.query("SELECT typname FROM pg_type WHERE typname LIKE 'enum_%'");
        console.log('Enums:', results.map(r => r.typname));
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
})();
