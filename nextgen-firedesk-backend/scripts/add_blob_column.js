const { sequelize } = require('../config/config');

async function addDataColumn() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB');

        // Add 'data' column of type BYTEA (for Postgres)
        const alterSQL = `
            ALTER TABLE "uploaded_files" 
            ADD COLUMN IF NOT EXISTS "data" BYTEA;
        `;

        await sequelize.query(alterSQL);
        console.log('✅ Added "data" column to uploaded_files table.');

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await sequelize.close();
    }
}

addDataColumn();
