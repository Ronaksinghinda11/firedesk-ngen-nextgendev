/**
 * Test CAPA Negative Case
 * Verifies that a user NOT in the team cannot submit CAPA steps
 * 
 * Run: node scripts/test_capa_failure_negative.js
 */

require('dotenv').config();
const { sequelize } = require('../config/config');
const { User, Role } = require('../src/models/user-management');
const { Incident, IncidentAssignment, CapaStepDefinition } = require('../src/models/sams');
const incidentService = require('../src/services/sams/incidentService');
const { v4: uuidv4 } = require('uuid');

async function test() {
    console.log('🚀 Starting CAPA Negative Test...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // 1. Get Manager User (The one who will try to submit)
        // We'll Create a NEW manager to be sure they are not in any old teams if possible, or just reuse
        const managerRole = await Role.findOne({ where: { name: 'Manager' } });
        const [managerUser] = await User.findOrCreate({
            where: { email: 'manager_negative@firedesk.com' },
            defaults: {
                name: 'Negative Manager',
                email: 'manager_negative@firedesk.com',
                password: 'password',
                role_id: managerRole.id,
                status: 'Active'
            }
        });
        console.log(`👤 Manager User (Intruder): ${managerUser.id}`);

        // 2. Get Admin User (Creator)
        const adminUser = await User.findOne({ where: { email: 'admin@firedesk.com' } });

        // 3. Create Incident
        // Use existing plant logic or mock
        const { Plant } = require('../src/models/plants');
        const plant = await Plant.findOne();

        const incidentData = {
            incidentSubtypeId: (await require('../src/models/sams/IncidentSubtype').findOne())?.id,
            plantId: plant?.id,
            incidentDate: new Date(),
            description: 'Negative Test Incident',
            impact: 'None',
            severity: 'Low'
        };

        const incident = await incidentService.create(incidentData, adminUser.id);
        console.log(`✅ Incident Created: ${incident.id}`);

        // 4. Assign Team (EXCLUDING the Manager)
        console.log('\n👥 Assigning Team (Admin ONLY)...');
        // Admin assigns themselves only
        await incidentService.assignTeam(incident.id, {
            teamMemberIds: [adminUser.id],
            teamLeaderId: adminUser.id
        }, adminUser.id);
        console.log('✅ Team Assigned (Manager is NOT in team)');

        // 5. Attempt Submit CAPA Step as Manager
        const steps = await incident.getCapaSteps();
        const firstStep = steps[0];
        console.log(`\n📝 Attempting Submit as Manager (Should Fail)...`);

        try {
            await incidentService.submitCapaStep(incident.id, firstStep.id, {
                stepResponse: 'Illegal Response',
                documentsData: []
            }, managerUser.id);

            console.error('❌ ERROR: Submission Succeeded! Security Hole!');
        } catch (error) {
            console.log('\n✅ Expected Error Caught:');
            console.log(`   Message: ${error.message}`);
            // This message should contain the debug info I added
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        await sequelize.close();
    }
}

test();
