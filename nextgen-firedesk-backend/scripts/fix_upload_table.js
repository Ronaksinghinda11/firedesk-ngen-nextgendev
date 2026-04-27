const { sequelize } = require('../config/config');
const UploadedFile = require('../src/models/common/UploadedFile');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB');

        const tables = await sequelize.getQueryInterface().showAllTables();
        console.log('Tables in DB:', tables);

        if (tables.includes('uploaded_files')) {
            console.log('✅ uploaded_files table EXISTS');
        } else {
            console.log('❌ uploaded_files table MISSING');
            console.log('Attempting to create it...');
            await UploadedFile.sync();
            console.log('✅ uploaded_files table CREATED via sync');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await sequelize.close();
    }
}

check();
