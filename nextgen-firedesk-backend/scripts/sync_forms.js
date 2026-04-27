#!/usr/bin/env node
/**
 * Sync Forms Script
 * Populates all forms with matching questions based on their category/product/frequency
 * 
 * Usage: node scripts/sync_forms.js
 */

require('dotenv').config();

const { sequelize } = require('../config/config');
const formService = require('../src/services/service-form/formService');

async function syncForms() {
    console.log('🔄 Starting form sync...');

    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Sync all forms
        const results = await formService.syncAllForms();

        console.log('\n📊 Sync Results:');
        console.table(results.map(r => ({
            formName: r.formName?.substring(0, 40) || 'Unknown',
            synced: r.synced || 0,
            sections: r.sections || 0,
            error: r.error || null
        })));

        const totalSynced = results.reduce((sum, r) => sum + (r.synced || 0), 0);
        console.log(`\n✅ Total questions synced: ${totalSynced}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Sync failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

syncForms();
