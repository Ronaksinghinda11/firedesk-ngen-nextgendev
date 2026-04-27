require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { sequelize } = require('../config/config');

async function forceCreate() {
    try {
        await sequelize.authenticate();
        const config = sequelize.config;
        console.log(`✅ Connected to Database: ${config.database} on ${config.host}`);

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS "uploaded_files" (
                "id" UUID PRIMARY KEY,
                "original_name" VARCHAR(255) NOT NULL,
                "stored_name" VARCHAR(255) NOT NULL,
                "mime_type" VARCHAR(100) NOT NULL,
                "size" INTEGER NOT NULL,
                "path" VARCHAR(500) NOT NULL,
                "url" VARCHAR(500) NOT NULL,
                "uploaded_by" UUID NOT NULL REFERENCES "users" ("id"),
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await sequelize.query(createTableSQL);
        console.log('✅ Executed CREATE TABLE SQL.');

        const checkSQL = `
            SELECT to_regclass('public.uploaded_files');
        `;
        const [results] = await sequelize.query(checkSQL);
        console.log('Check Result:', results);

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await sequelize.close();
    }
}

forceCreate();
