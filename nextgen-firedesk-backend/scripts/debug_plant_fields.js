const { sequelize } = require('../config/config');
const PlantService = require('../src/services/plants/plant_service');
const { transformPlantData } = require('../src/controllers/plants/plant_controller');

// The ID from the user's logs
const PLANT_ID = 'f8cb8264-058e-4b86-97cf-ddfa4215c9a1';

async function debugPlant() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB.');

        console.log(`🔍 Fetching Plant ${PLANT_ID}...`);

        // 1. Fetch Raw Data (simulating Service layer)
        // We need to access the internal method or use the service to get the raw instance
        // But getAllPlants returns standard objects. 
        // Let's use the Model directly to inspect RAW DB values first.
        const Plant = require('../src/models/plants/Plant');
        const Building = require('../src/models/plants/Building');
        const Floor = require('../src/models/plants/Floor');
        const Wing = require('../src/models/plants/Wing');
        const Staircase = require('../src/models/plants/Staircase');
        const Lift = require('../src/models/plants/Lift');
        const FireSafetySystem = require('../src/models/plants/FireSafetySystem');
        const ComplianceRecord = require('../src/models/plants/ComplianceRecord');

        const plant = await Plant.findOne({
            where: { id: PLANT_ID },
            include: [
                {
                    model: Building,
                    as: 'buildings',
                    include: [
                        { model: Floor, as: 'floors', include: ['wings'] },
                        { model: Staircase, as: 'staircases' },
                        { model: Lift, as: 'lifts' }
                    ]
                },
                { model: FireSafetySystem, as: 'fireSafetySystem' },
                { model: ComplianceRecord, as: 'complianceRecords' }
            ]
        });

        if (!plant) {
            console.error('❌ Plant not found!');
            return;
        }

        console.log('\n=== STEP 1: RAW DB VALUES ===');
        console.log('1) Country:', plant.country);
        console.log('2) State:', plant.state); // Is this a string or ID?
        console.log('3) City:', plant.city);   // Is this a string or ID?
        console.log('11) Total Built Up Area:', plant.total_built_up_area);

        const b1 = plant.buildings && plant.buildings[0];
        if (b1) {
            // 4) No of Floors - checking helper getter or calculation
            console.log('4) No of Floors (Building 1):', b1.floors ? b1.floors.length : 0);

            const f1 = b1.floors && b1.floors[0];
            if (f1) {
                console.log('5) Floor Usage (Raw):', f1.usage_type, 'OR', f1.floor_usage);
            }

            const s1 = b1.staircases && b1.staircases[0];
            if (s1) {
                console.log('6) Staircase Type:', s1.type);
                console.log('7) Staircase Width:', s1.width_meters);
                console.log('8) Fire Rating:', s1.fire_rating_minutes);
                console.log('9) Pressurization:', s1.has_pressurization);
                console.log('10) Emergency Lighting:', s1.has_emergency_lighting);
            }
        }

        const fs = plant.fireSafetySystem;
        if (fs) {
            console.log('15) Num Fire Extinguishers:', fs.fire_extinguisher_count);
            console.log('16) Num Hydrant Points:', fs.hydrant_point_count);
            console.log('17) Num Sprinklers:', fs.sprinkler_count);
            console.log('18) Num Safe Assembly:', fs.safe_assembly_area_count);
        }

        const comp = plant.complianceRecords;
        if (comp) {
            // Check for missing fields here
            console.log('19) Compliance Docs Data:', comp.documents_data ? 'Present' : 'NULL');
        }

        console.log('\n=== STEP 3: TRANSFORMED OUTPUT (Controller Layer) ===');
        // Mocking the toJSON if needed, or passing raw object
        // The transformer expects a plain object usually
        const plainPlant = plant.toJSON();
        const transformed = transformPlantData(plainPlant);

        console.log('1) Country:', transformed.country);
        console.log('2) State:', transformed.state);
        console.log('3) City:', transformed.city);
        console.log('11) Total Built Up Area:', transformed.totalBuiltUpArea, 'OR', transformed.totalBuildUpArea);

        if (transformed.buildings && transformed.buildings[0]) {
            const tb1 = transformed.buildings[0];
            const tf1 = tb1.floors && tb1.floors[0];
            // 4) No of Floors might not be explicit field, but array length
            console.log('5) Floor Usage (Transformed):', tf1 ? tf1.floorUsage : 'N/A');

            // Check FLATTENED properties on the building (Frontend logic)
            console.log('6) Staircase Type (Flat):', tb1.staircaseType); // Should be null if null in DB
            console.log('7) Staircase Width (Flat):', tb1.staircaseWidth);
            console.log('8) Fire Rating (Flat):', tb1.staircaseFireRating);
            console.log('9) Pressurization (Flat):', tb1.staircasePressurization);
        }

        if (transformed.complianceForms && transformed.complianceForms[0]) {
            const cf = transformed.complianceForms[0];
            console.log('10) NOC Validity:', cf.nocValidityDate);
            console.log('11) Insurer:', cf.insurerName);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugPlant();
