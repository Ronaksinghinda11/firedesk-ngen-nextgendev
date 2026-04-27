/**
 * Seed service_technicians table
 * 
 * This script:
 * 1. Fetches all existing service_submissions (services)
 * 2. Fetches all existing technicians
 * 3. For each service, assigns 1-2 random technicians
 * 4. Inserts rows into service_technicians
 * 
 * Usage:  node scripts/seed_service_technicians.js
 */
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); const { sequelize } = require('../config/config');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        // 1. Get completed/rejected/lapsed services (exclude PENDING = due)
        const [services] = await sequelize.query(`
            SELECT id, technician_id, status as submission_status FROM service_submissions 
            WHERE status IN ('approved', 'completed', 'lapsed', 'rejected')
            ORDER BY created_at DESC
        `);
        console.log(`📋 Found ${services.length} services (approved/completed/lapsed/rejected, excludes PENDING/due)`);

        if (services.length === 0) {
            console.log('❌ No eligible service submissions found. Cannot seed service_technicians.');
            process.exit(1);
        }

        // 2. Get all active technicians
        const [technicians] = await sequelize.query(`
            SELECT id FROM technicians WHERE status = 'Active'
        `);
        console.log(`👷 Found ${technicians.length} active technicians`);

        if (technicians.length === 0) {
            console.log('❌ No active technicians found. Cannot seed service_technicians.');
            process.exit(1);
        }

        // 3. Get existing manager IDs for assigned_by
        const [managers] = await sequelize.query(`
            SELECT id FROM managers LIMIT 5
        `);
        console.log(`👤 Found ${managers.length} managers`);

        // 4. Check what already exists
        const [existing] = await sequelize.query(`
            SELECT COUNT(*) as count FROM service_technicians
        `);
        console.log(`📊 Existing service_technicians rows: ${existing[0].count}`);

        if (parseInt(existing[0].count) > 0) {
            console.log('⚠️  Table already has data. Skipping insert to avoid duplicates.');
            console.log('   To force re-seed, run: DELETE FROM service_technicians;');
            process.exit(0);
        }

        // 5. Build insert rows
        const techIds = technicians.map(t => t.id);
        const managerIds = managers.map(m => m.id);

        const rows = [];
        const usedPairs = new Set();

        for (const service of services) {
            // Determine technician: prefer the one in submission, otherwise random
            let techToAssign = (service.technician_id && techIds.includes(service.technician_id))
                ? service.technician_id
                : techIds[Math.floor(Math.random() * techIds.length)];

            // Map submission status to junction table status
            // Junction enum: ('assigned', 'started', 'completed', 'declined')
            let junctionStatus = 'assigned';
            if (service.submission_status === 'completed' || service.submission_status === 'approved') junctionStatus = 'completed';
            else if (service.submission_status === 'rejected') junctionStatus = 'declined';
            else if (service.submission_status === 'lapsed') junctionStatus = 'assigned'; // Lapsed usually means past due at assigned stage

            const pairKey = `${service.id}:${techToAssign}`;
            if (!usedPairs.has(pairKey)) {
                usedPairs.add(pairKey);
                rows.push({
                    service_id: service.id,
                    technician_id: techToAssign,
                    assigned_by: managerIds.length > 0 ? managerIds[Math.floor(Math.random() * managerIds.length)] : null,
                    status: junctionStatus
                });
            }
        }

        console.log(`\n🔧 Inserting ${rows.length} rows into service_technicians...`);

        // 6. Batch insert using raw SQL for speed
        let inserted = 0;
        const BATCH_SIZE = 100;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const values = batch.map(r =>
                `(gen_random_uuid(), '${r.service_id}', '${r.technician_id}', ${r.assigned_by ? `'${r.assigned_by}'` : 'NULL'}, NOW(), '${r.status}', NULL, NOW(), NOW())`
            ).join(',\n');

            await sequelize.query(`
                INSERT INTO service_technicians (id, service_id, technician_id, assigned_by, assigned_at, status, notes, created_at, updated_at)
                VALUES ${values}
                ON CONFLICT (service_id, technician_id) DO NOTHING
            `);

            inserted += batch.length;
            process.stdout.write(`   Inserted ${inserted}/${rows.length}\r`);
        }

        console.log(`\n✅ Done! Inserted ${inserted} rows into service_technicians`);

        // 7. Verify
        const [verification] = await sequelize.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT service_id) as unique_services,
                COUNT(DISTINCT technician_id) as unique_technicians,
                COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'started') as started,
                COUNT(*) FILTER (WHERE status = 'declined') as declined
            FROM service_technicians
        `);
        console.log('\n📊 Verification:');
        console.log(JSON.stringify(verification[0], null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

seed();
