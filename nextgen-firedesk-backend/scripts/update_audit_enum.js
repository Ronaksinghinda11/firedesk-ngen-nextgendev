const { sequelize } = require('../config/config');

async function updateEnum() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected');

        const queryInterface = sequelize.getQueryInterface();

        // Helper to add value if not exists (Postgres throws if exists, so try-catch)
        const addValue = async (val) => {
            try {
                await sequelize.query(`ALTER TYPE "entity_type_enum" ADD VALUE '${val}';`);
                console.log(`✅ Added ${val}`);
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log(`ℹ️ ${val} already exists`);
                } else {
                    console.error(`❌ Failed to add ${val}:`, e.message);
                }
            }
        };

        await addValue('scheduler');
        await addValue('incident_type');
        await addValue('incident_subtype');
        await addValue('incident');
        await addValue('capa');

    } catch (error) {
        console.error('Failed:', error);
    } finally {
        await sequelize.close();
    }
}

updateEnum();
