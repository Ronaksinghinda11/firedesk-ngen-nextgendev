const { sequelize } = require('../config/config');
const { Sequelize } = require('sequelize');

async function fixColumns() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        const queryInterface = sequelize.getQueryInterface();

        // 1. Fix Categories table
        try {
            const tableDescription = await queryInterface.describeTable('categories');
            if (!tableDescription.is_active) {
                console.log('Adding is_active to categories...');
                await queryInterface.addColumn('categories', 'is_active', {
                    type: Sequelize.BOOLEAN,
                    defaultValue: true
                });
                console.log('✅ Added is_active to categories');
            } else {
                console.log('ℹ️ is_active already exists in categories');
            }
        } catch (error) {
            console.error('Error checking/updating categories table:', error.message);
        }

        // 2. Fix Vendors table
        try {
            const tableDescription = await queryInterface.describeTable('vendors');
            if (!tableDescription.is_active) {
                console.log('Adding is_active to vendors...');
                await queryInterface.addColumn('vendors', 'is_active', {
                    type: Sequelize.BOOLEAN,
                    defaultValue: true
                });
                console.log('✅ Added is_active to vendors');
            } else {
                console.log('ℹ️ is_active already exists in vendors');
            }
        } catch (error) {
            console.error('Error checking/updating vendors table:', error.message);
        }

    } catch (error) {
        console.error('❌ Database connection failed:', error);
    } finally {
        await sequelize.close();
    }
}

fixColumns();
