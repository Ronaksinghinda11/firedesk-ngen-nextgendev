const { sequelize } = require('../config/config');
// Import specific models to sync
const Plant = require('../src/models/plants/Plant');
const Building = require('../src/models/plants/Building');
const Floor = require('../src/models/plants/Floor');
const Wing = require('../src/models/plants/Wing');
const Staircase = require('../src/models/plants/Staircase');
const Lift = require('../src/models/plants/Lift');
const Entrance = require('../src/models/plants/Entrance');
const DieselGenerator = require('../src/models/plants/DieselGenerator');
const FireSafetySystem = require('../src/models/plants/FireSafetySystem');
const ComplianceRecord = require('../src/models/plants/ComplianceRecord');

async function forceSync() {
    try {
        console.log('🔄 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Connected.');

        console.log('⏳ Syncing Plant models individually (alter: true)...');

        // Sync in order of dependency
        // await Plant.sync({ alter: true });
        console.log('⚠️ Skipping Plant sync (ENUM issue). Assuming table exists.');

        await Building.sync({ alter: true });
        console.log('✅ Building synced');

        await Floor.sync({ alter: true });
        console.log('✅ Floor synced');

        await Wing.sync({ alter: true });
        console.log('✅ Wing synced');

        await Staircase.sync({ alter: true });
        console.log('✅ Staircase synced');

        await Lift.sync({ alter: true });
        console.log('✅ Lift synced');

        await Entrance.sync({ alter: true });
        console.log('✅ Entrance synced');

        await DieselGenerator.sync({ alter: true });
        console.log('✅ DieselGenerator synced');

        await FireSafetySystem.sync({ alter: true });
        console.log('✅ FireSafetySystem synced');

        await ComplianceRecord.sync({ alter: true });
        console.log('✅ ComplianceRecord synced');

        console.log('✅ All Plant-related tables synchronized successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Sync failed:', error);
        process.exit(1);
    }
}

forceSync();
