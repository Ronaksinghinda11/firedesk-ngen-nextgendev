/**
 * Run All Migrations
 * Master file to execute all module migrations in order
 * 
 * Usage:
 *   node migrations/run_all_migrations.js         # Run all migrations (up)
 *   node migrations/run_all_migrations.js up      # Run all migrations (up)
 *   node migrations/run_all_migrations.js down    # Rollback all migrations
 *   node migrations/run_all_migrations.js status  # Show migration status
 * 
 * Order of execution:
 *   1. Users Module (roles, permissions, users, managers, technicians)
 *   2. Master Data (countries, states, cities, categories, products, vendors, etc.)
 *   3. Plants Module (organization, plants, buildings, floors, wings, etc.)
 *   4. Assets Module (assets, specifications, documents, location history)
 *   5. Service Forms Module (forms, questions, submissions, answers)
 *   6. Incident & CAPA Module (tickets, responses)
 *   7. Audit Logs & Comments Module (audit_logs, comments, notifications)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

// Import all migrations
const migrations = [
    { name: '001_users_module', module: require('./001_users_module') },
    { name: '002_master_data', module: require('./002_master_data') },
    { name: '003_plants_module', module: require('./003_plants_module') },
    { name: '004_assets_module', module: require('./004_assets_module') },
    { name: '005_service_forms_module', module: require('./005_service_forms_module') },
    { name: '006_incident_capa_module', module: require('./006_incident_capa_module') },
    { name: '007_audit_comments_module', module: require('./007_audit_comments_module') },
    { name: '20260116-add-service-type-to-forms', module: require('./20260116-add-service-type-to-forms') },
    { name: '20260120-fix-plant-premises-schema', module: require('./20260120-fix-plant-premises-schema') },
    { name: '20260120-add-frequency-to-forms', module: require('./20260120-add-frequency-to-forms') },
    { name: '20260120-add-source-to-audit-logs', module: require('./20260120-add-source-to-audit-logs') },
    { name: '20260120-add-standards-to-questions', module: require('./20260120-add-standards-to-questions') }
];

async function runAllMigrations() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           🚀 RUNNING ALL DATABASE MIGRATIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const startTime = Date.now();
    let successCount = 0;
    let failedMigration = null;

    try {
        // Ensure database connection
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Ensure uuid-ossp extension exists
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        console.log('✅ UUID extension ready\n');

        console.log('───────────────────────────────────────────────────────────────\n');

        // Run each migration in order
        for (const migration of migrations) {
            console.log(`📦 Running: ${migration.name}`);
            console.log('───────────────────────────────────────────────────────────────');

            try {
                await migration.module.up();
                successCount++;
                console.log(`✅ ${migration.name} completed\n`);
            } catch (error) {
                failedMigration = migration.name;
                throw error;
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('           ✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`\n📊 Summary:`);
        console.log(`   • Migrations run: ${successCount}/${migrations.length}`);
        console.log(`   • Duration: ${duration}s`);
        console.log(`   • Database: ${process.env.DB_NAME || 'from DATABASE_URL'}\n`);

    } catch (error) {
        console.error('\n═══════════════════════════════════════════════════════════════');
        console.error('           ❌ MIGRATION FAILED');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error(`\n📍 Failed at: ${failedMigration}`);
        console.error(`💥 Error: ${error.message}\n`);
        console.error('To rollback completed migrations, run:');
        console.error('   node migrations/run_all_migrations.js down\n');
        throw error;
    }
}

async function rollbackAllMigrations() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           🔄 ROLLING BACK ALL MIGRATIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const startTime = Date.now();
    let successCount = 0;

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');
        console.log('───────────────────────────────────────────────────────────────\n');

        // Rollback in reverse order
        const reversedMigrations = [...migrations].reverse();

        for (const migration of reversedMigrations) {
            console.log(`🔄 Rolling back: ${migration.name}`);
            console.log('───────────────────────────────────────────────────────────────');

            try {
                await migration.module.down();
                successCount++;
                console.log(`✅ ${migration.name} rolled back\n`);
            } catch (error) {
                console.error(`⚠️  Warning: ${migration.name} rollback had issues: ${error.message}`);
                console.log('   Continuing with other rollbacks...\n');
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('           ✅ ROLLBACK COMPLETED');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`\n📊 Summary:`);
        console.log(`   • Migrations rolled back: ${successCount}/${migrations.length}`);
        console.log(`   • Duration: ${duration}s\n`);

    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        throw error;
    }
}

async function showStatus() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           📋 MIGRATION STATUS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        console.log('Available migrations:');
        console.log('───────────────────────────────────────────────────────────────');

        for (const migration of migrations) {
            console.log(`   📦 ${migration.name}`);
        }

        console.log('\n───────────────────────────────────────────────────────────────');
        console.log('\nTo run migrations:');
        console.log('   node migrations/run_all_migrations.js up');
        console.log('\nTo rollback migrations:');
        console.log('   node migrations/run_all_migrations.js down');
        console.log('\nTo run individual migration:');
        console.log('   node migrations/001_users_module.js');
        console.log('   node migrations/001_users_module.js down  # to rollback\n');

    } catch (error) {
        console.error('❌ Could not connect to database:', error.message);
        throw error;
    }
}

// Main execution
const action = process.argv[2] || 'up';

(async () => {
    try {
        switch (action.toLowerCase()) {
            case 'up':
                await runAllMigrations();
                break;
            case 'down':
                await rollbackAllMigrations();
                break;
            case 'status':
                await showStatus();
                break;
            default:
                console.log('Unknown action. Use: up, down, or status');
                process.exit(1);
        }
    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
})();
