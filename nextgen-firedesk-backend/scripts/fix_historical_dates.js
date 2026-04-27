const { Sequelize } = require('sequelize');
require('dotenv').config();

// Initialize Sequelize
const sequelize = new Sequelize(
    process.env.DB_NAME || 'ngendevdb',
    process.env.DB_USER || 'admin',
    process.env.DB_PASSWORD || 'Passw0rd123',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 8433,
        dialect: 'postgres',
        logging: false,
    }
);

async function fixHistoricalDates() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        console.log('\n--- Normalizing Historical Service Dates ---');
        console.log('Updating "completed_at" and fixing missing dates so waiting periods render correctly in the Gantt chart.');

        // Update all completed services to ensure completed_at exactly matches scheduled_date
        // This ensures wait times calculate from the intended schedule day rather than the day the seed script was run
        const [updateResult, updateMetadata] = await sequelize.query(`
            UPDATE service_submissions 
            SET completed_at = scheduled_date
            WHERE (status ILIKE 'COMPLETED' OR status ILIKE 'APPROVED' OR status ILIKE 'SUBMIT')
            AND (completed_at IS NULL OR completed_at::date != scheduled_date::date);
        `);

        console.log(`Successfully fixed "completed_at" for ${updateMetadata.rowCount} completed historical services.`);
        
        console.log('\nHistorical data dates now comply with correct mathematical logic.');

        // Close connection
        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('Error migrating data:', error);
        process.exit(1);
    }
}

fixHistoricalDates();
