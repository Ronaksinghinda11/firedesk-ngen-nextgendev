/**
 * Utility Script: Create Future Audit Log Partitions
 * 
 * Creates monthly partitions for audit_logs table to maintain performance.
 * Should be run monthly via cron job or scheduled task.
 * 
 * Usage:
 *   node scripts/create_audit_partitions.js          # Creates next 12 months
 *   node scripts/create_audit_partitions.js 24       # Creates next 24 months
 *   node scripts/create_audit_partitions.js cleanup  # Drops partitions older than 2 years
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

/**
 * Create monthly partitions for audit_logs
 */
async function createPartitions(monthsAhead = 12) {
    console.log(`🚀 Creating audit_logs partitions for next ${monthsAhead} months...\n`);

    try {
        await sequelize.authenticate();

        const now = new Date();
        const createdPartitions = [];

        for (let i = 0; i < monthsAhead; i++) {
            const targetDate = new Date(now);
            targetDate.setMonth(now.getMonth() + i);

            // Format: YYYY_MM
            const year = targetDate.getFullYear();
            const month = String(targetDate.getMonth() + 1).padStart(2, '0');
            const suffix = `${year}_${month}`;

            // Calculate date range
            const startDate = `${year}-${month}-01`;
            const nextMonth = new Date(targetDate);
            nextMonth.setMonth(targetDate.getMonth() + 1);
            const endYear = nextMonth.getFullYear();
            const endMonth = String(nextMonth.getMonth() + 1).padStart(2, '0');
            const endDate = `${endYear}-${endMonth}-01`;

            // Check if partition already exists
            const [existing] = await sequelize.query(`
                SELECT tablename 
                FROM pg_tables 
                WHERE tablename = 'audit_logs_${suffix}';
            `);

            if (existing.length > 0) {
                console.log(`   ⏭️  Partition audit_logs_${suffix} already exists`);
                continue;
            }

            // Create partition
            await sequelize.query(`
                CREATE TABLE audit_logs_${suffix} 
                PARTITION OF audit_logs
                FOR VALUES FROM ('${startDate}') TO ('${endDate}');
            `);

            console.log(`   ✅ Created partition: audit_logs_${suffix} (${startDate} to ${endDate})`);
            createdPartitions.push(suffix);
        }

        if (createdPartitions.length === 0) {
            console.log('\n✅ All partitions already exist. Nothing to do.\n');
        } else {
            console.log(`\n✅ Created ${createdPartitions.length} new partition(s):\n`);
            createdPartitions.forEach(p => console.log(`   - audit_logs_${p}`));
            console.log('');
        }

    } catch (error) {
        console.error('❌ Failed to create partitions:', error.message);
        throw error;
    }
}

/**
 * Drop partitions older than retention period (default: 2 years)
 */
async function cleanupOldPartitions(retentionMonths = 24) {
    console.log(`🗑️  Cleaning up audit_logs partitions older than ${retentionMonths} months...\n`);

    try {
        await sequelize.authenticate();

        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

        // Get all partition names
        const [partitions] = await sequelize.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE tablename LIKE 'audit_logs_%' 
            AND tablename != 'audit_logs';
        `);

        const droppedPartitions = [];

        for (const partition of partitions) {
            const tableName = partition.tablename;

            // Extract date from table name (audit_logs_YYYY_MM)
            const match = tableName.match(/audit_logs_(\d{4})_(\d{2})/);
            if (!match) continue;

            const year = parseInt(match[1]);
            const month = parseInt(match[2]);
            const partitionDate = new Date(year, month - 1, 1);

            if (partitionDate < cutoffDate) {
                await sequelize.query(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
                console.log(`   ✅ Dropped old partition: ${tableName}`);
                droppedPartitions.push(tableName);
            }
        }

        if (droppedPartitions.length === 0) {
            console.log('\n✅ No old partitions to clean up.\n');
        } else {
            console.log(`\n✅ Cleaned up ${droppedPartitions.length} old partition(s).\n`);
        }

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        throw error;
    }
}

/**
 * Main execution
 */
if (require.main === module) {
    const arg = process.argv[2];

    (async () => {
        try {
            if (arg === 'cleanup') {
                await cleanupOldPartitions();
            } else {
                const months = parseInt(arg) || 12;
                await createPartitions(months);
            }
        } catch (error) {
            console.error('Script error:', error);
            process.exit(1);
        } finally {
            await sequelize.close();
            process.exit(0);
        }
    })();
}

module.exports = { createPartitions, cleanupOldPartitions };
