require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

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

async function alterTable() {
    try {
        console.log('🚀 Starting Tickets Table Alteration...\n');
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        const qi = sequelize.getQueryInterface();

        const columns = [
            { name: 'ticket_type', opts: { type: DataTypes.STRING(50), defaultValue: 'STANDARD' } },
            { name: 'maintenance_type', opts: { type: DataTypes.STRING(20), allowNull: true } },
            { name: 'priority', opts: { type: DataTypes.STRING(20), defaultValue: 'MEDIUM' } },
            { name: 'bm_state', opts: { type: DataTypes.STRING(50), allowNull: true } },
            { name: 'bm_metadata', opts: { type: DataTypes.JSONB, defaultValue: {} } },
            { name: 'acknowledged_at', opts: { type: DataTypes.DATE, allowNull: true } },
            { name: 'sla_deadline', opts: { type: DataTypes.DATE, allowNull: true } },
            { name: 'sla_breached', opts: { type: DataTypes.BOOLEAN, defaultValue: false } }
        ];

        for (const col of columns) {
            try {
                await qi.addColumn('tickets', col.name, col.opts);
                console.log(`✅ Added column ${col.name}`);
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log(`⚠️  Column ${col.name} already exists. Skipping.`);
                } else {
                    console.error(`❌ Error adding ${col.name}: ${err.message}`);
                }
            }
        }

        console.log('\n✅ Script finished!');
    } catch (error) {
        console.error('\n❌ Alteration failed:', error.message);
    } finally {
        await sequelize.close();
    }
}

alterTable();
