/**
 * Test CAPA Failure
 * Reproduces the issue where a Manager cannot fill CAPA steps
 * 
 * Run: node scripts/test_capa_failure.js
 */

require('dotenv').config();
const { sequelize } = require('../config/config');
const { User, Role } = require('../src/models/user-management');
const { Incident, IncidentAssignment, CapaStepDefinition } = require('../src/models/sams');
const incidentService = require('../src/services/sams/incidentService');
const { v4: uuidv4 } = require('uuid');

async function test() {
    console.log('🚀 Starting CAPA Failure Test...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // 1. Get or Create Manager User
        const managerRole = await Role.findOne({ where: { name: 'Manager' } });
        if (!managerRole) throw new Error('Manager role not found');

        const [managerUser] = await User.findOrCreate({
            where: { email: 'manager_test@firedesk.com' },
            defaults: {
                name: 'Test Manager',
                email: 'manager_test@firedesk.com',
                password: 'password', // Hash not needed for direct service call if we don't auth
                role_id: managerRole.id,
                status: 'Active'
            }
        });
        console.log(`👤 Manager User: ${managerUser.id} (${managerUser.name})`);

        // 2. Get or Create Admin User (for assignment)
        const adminUser = await User.findOne({ where: { email: 'admin@firedesk.com' } });
        if (!adminUser) throw new Error('Admin user not found');
        console.log(`👤 Admin User: ${adminUser.id}`);

        // 3. Create Incident
        // Need a plant first? Or we can skip plant validation if service allows?
        // Service validates plant... let's find a plant
        const { Plant } = require('../src/models/plants'); // Adjust path if needed
        const plant = await Plant.findOne();
        if (!plant) {
            console.log('⚠️ No plant found, creating one...');
            // Skip for now, assume plant exists or mock it
        }

        // Create incident via Service
        // We'll mock the data
        const incidentData = {
            incidentSubtypeId: (await require('../src/models/sams/IncidentSubtype').findOne())?.id,
            plantId: plant?.id || uuidv4(), // Might fail FK if not exists
            buildingId: null,
            floorId: null,
            incidentDate: new Date(),
            description: 'Test Incident for CAPA',
            impact: 'Test Impact',
            severity: 'Low'
        };

        if (!incidentData.incidentSubtypeId) {
            console.log('⚠️ No Incident Subtypes found. Please run seeds.');
            return;
        }

        // Create universal CAPA step if none
        const stepDef = await CapaStepDefinition.findOne();
        if (!stepDef) {
            console.log('⚠️ No CAPA Step Definitions found. Please run seeds.');
            return;
        }

        console.log('📋 Creating incident...');
        const incident = await incidentService.create(incidentData, adminUser.id);
        console.log(`✅ Incident Created: ${incident.id} (${incident.incidentNumber})`);

        // 4. Assign Team (Admin assigns Manager)
        console.log('\n👥 Assigning Team (Manager as member)...');
        // We assume valid plant for user? Manager needs to be in plant?
        // Service skips manager validation comment says so.

        await incidentService.assignTeam(incident.id, {
            teamMemberIds: [managerUser.id],
            teamLeaderId: managerUser.id
        }, adminUser.id);
        console.log('✅ Team Assigned');

        // 5. Verify Assignment in DB
        const assignments = await IncidentAssignment.findAll({ where: { incidentId: incident.id } });
        console.log(`🔍 Assignments in DB: ${assignments.length}`);
        assignments.forEach(a => console.log(`   - User: ${a.userId}, Active: ${a.isActive}`));

        // 6. Attempt Submit CAPA Step as Manager
        const steps = await incident.getCapaSteps();
        if (steps.length === 0) throw new Error('No CAPA steps generated');
        const firstStep = steps[0];
        console.log(`\n📝 Submitting CAPA Step ${firstStep.stepNumber} (ID: ${firstStep.id})...`);

        try {
            await incidentService.submitCapaStep(incident.id, firstStep.id, {
                stepResponse: 'Test Response',
                documentsData: []
            }, managerUser.id);
            console.log('✅ CAPA Step Submitted Successfully!');
        } catch (error) {
            console.error('\n❌ Submit Failed!');
            console.error('Error Message:', error.message);
            console.error('Stack:', error.stack);

            if (error.statusCode === 403) {
                console.log('\n🔎 Debugging 403:');
                console.log(`   Manager User ID: ${managerUser.id}`);
                console.log(`   Assigned User IDs: ${assignments.map(a => a.userId).join(', ')}`);
            }
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        await sequelize.close();
    }
}

test();
