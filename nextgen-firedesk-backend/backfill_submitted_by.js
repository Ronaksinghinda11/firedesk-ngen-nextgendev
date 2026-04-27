/**
 * Backfill submitted_by field for existing service submissions
 * Sets submitted_by to technician_id for all submitted/approved services
 */

const { sequelize } = require('./config/config');

async function backfillSubmittedBy() {
    try {
        console.log('🔄 Starting to backfill submitted_by field...');

        // First, update services where technician_id is set but submitted_by is null
        const [results1] = await sequelize.query(`
            UPDATE service_submissions
            SET submitted_by = technician_id
            WHERE submitted_by IS NULL
            AND status IN ('SUBMITTED', 'submitted', 'APPROVED', 'approved', 'rejected', 'REJECTED')
            AND technician_id IS NOT NULL;
        `);

        console.log(`✅ Updated ${results1.affectedRows || results1.rowCount || 0} services using technician_id`);
        
        // Second, update services where technician_id is NULL but there's an assigned technician in service_technicians
        const [results2] = await sequelize.query(`
            UPDATE service_submissions ss
            SET submitted_by = (
                SELECT st.technician_id 
                FROM service_technicians st 
                WHERE st.service_id = ss.id 
                LIMIT 1
            )
            WHERE ss.submitted_by IS NULL
            AND ss.status IN ('SUBMITTED', 'submitted', 'APPROVED', 'approved', 'rejected', 'REJECTED')
            AND EXISTS (
                SELECT 1 
                FROM service_technicians st 
                WHERE st.service_id = ss.id
            );
        `);

        console.log(`✅ Updated ${results2.affectedRows || results2.rowCount || 0} services using service_technicians table`);
        
        // Verify the update
        const [count] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM service_submissions
            WHERE submitted_by IS NOT NULL;
        `);

        console.log(`📊 Total services with submitted_by: ${count[0].count}`);
        console.log('✅ Backfill completed successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error during backfill:', error);
        process.exit(1);
    }
}

backfillSubmittedBy();
