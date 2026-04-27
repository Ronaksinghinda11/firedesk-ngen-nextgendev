
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');
const { QueryTypes } = require('sequelize');

async function alterColumn() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        console.log('Altering profile_pic column type to TEXT...');
        await sequelize.query(
            'ALTER TABLE users ALTER COLUMN profile_pic TYPE TEXT;',
            { type: QueryTypes.RAW }
        );
        console.log('✅ users table updated successfully');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating database:', error);
        process.exit(1);
    }
}

alterColumn();
