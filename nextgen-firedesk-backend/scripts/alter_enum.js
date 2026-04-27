require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false
    }
);

async function alterEnum() {
    try {
        console.log('🚀 Altering enum_tickets_ticket_type...\n');
        await sequelize.authenticate();
        
        await sequelize.query(`ALTER TYPE enum_tickets_ticket_type ADD VALUE IF NOT EXISTS 'STANDARD';`);
        await sequelize.query(`ALTER TYPE enum_tickets_ticket_type ADD VALUE IF NOT EXISTS 'BM_MAINTENANCE';`);
        await sequelize.query(`ALTER TYPE enum_tickets_ticket_type ADD VALUE IF NOT EXISTS 'INSTALLATION';`);
        await sequelize.query(`ALTER TYPE enum_tickets_ticket_type ADD VALUE IF NOT EXISTS 'INSPECTION';`);
        
        console.log('✅ Enum updated.');
    } catch (error) {
        console.error('❌ Failed to update enum:', error.message);
    } finally {
        await sequelize.close();
    }
}

alterEnum();
