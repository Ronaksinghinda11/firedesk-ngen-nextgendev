const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function updateDb() {
    try {
        console.log("Adding is_fire_extinguisher to categories...");
        await sequelize.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_fire_extinguisher BOOLEAN DEFAULT false;");
        
        console.log("Updating ticket_category ENUM...");
        // In Postgres, we can add to an ENUM
        try {
            await sequelize.query("ALTER TYPE enum_tickets_ticket_category ADD VALUE IF NOT EXISTS 'Refill / HP Test';");
        } catch (e) {
            console.error(e.message);
        }

        console.log("Adding refill_metadata to tickets...");
        await sequelize.query("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS refill_metadata JSONB DEFAULT '{}';");

        console.log("Database update successful!");
    } catch (e) {
        console.error("Database update failed:", e);
    } finally {
        await sequelize.close();
    }
}

updateDb();
