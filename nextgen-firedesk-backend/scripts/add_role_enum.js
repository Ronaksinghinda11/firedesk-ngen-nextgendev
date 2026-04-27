
const { sequelize } = require('../config/config');

async function addRoleEnum() {
    try {
        console.log('Adding "role" to audit enums...');

        // Add to entity_type_enum
        try {
            await sequelize.query("ALTER TYPE entity_type_enum ADD VALUE IF NOT EXISTS 'role'");
            console.log('✅ Added "role" to entity_type_enum');
        } catch (e) {
            console.log('ℹ️ "role" might already exist in entity_type_enum or type mismatch:', e.message);
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addRoleEnum();
