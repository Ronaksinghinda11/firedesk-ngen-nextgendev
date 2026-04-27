const { Sequelize } = require('sequelize');
require('dotenv').config();

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

async function shiftDates() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        // Fetch completed/approved services with their associated interval_days
        const [services] = await sequelize.query(`
            SELECT s.id, s.scheduled_date, f.interval_days 
            FROM service_submissions s
            JOIN inspection_frequencies f ON s.frequency_id = f.id
            WHERE s.status ILIKE 'COMPLETED' OR s.status ILIKE 'APPROVED'
        `);

        if (!services.length) {
            console.log('✅ No completed services found in the database.');
            process.exit(0);
        }

        console.log(`📊 Found ${services.length} completed services in total.`);

        // Determine 60% of services to shift (meets ">50%" criteria)
        const targetShiftCount = Math.floor(services.length * 0.6);
        
        // Randomly shuffle the array to pick an unbiased 60% slice
        for (let i = services.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [services[i], services[j]] = [services[j], services[i]];
        }
        
        const servicesToShift = services.slice(0, targetShiftCount);
        console.log(`⏳ Shifting "completed_at" dates for a random ${servicesToShift.length} services...`);

        let updatedCount = 0;
        for (const service of servicesToShift) {
            const interval = service.interval_days || 30; // Fallback to 30 days if undefined
            
            // Calculate strictly AFTER half the window length
            const halfWindow = Math.floor(interval / 2);
            
            // Shift date between [halfWindow, interval - 1]
            // E.g. For Monthly (30 days), halfWindow is 15. The shift will be randomly between 15 and 29 days.
            const randomExtraDays = halfWindow + Math.floor(Math.random() * Math.max(1, (interval - halfWindow)));
            
            const scheduledDate = new Date(service.scheduled_date);
            const newCompletedDate = new Date(scheduledDate);
            newCompletedDate.setDate(newCompletedDate.getDate() + randomExtraDays);
            
            // Add some random realistic hours (between 8:00 AM and 5:00 PM)
            newCompletedDate.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);

            await sequelize.query(`
                UPDATE service_submissions 
                SET completed_at = :newDate 
                WHERE id = :id
            `, {
                replacements: {
                    newDate: newCompletedDate,
                    id: service.id
                }
            });
            updatedCount++;
        }

        console.log(`✅ Successfully pushed "completed_at" past the mid-window threshold for ${updatedCount} services.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error shifting dates:', err);
        process.exit(1);
    }
}

shiftDates();
