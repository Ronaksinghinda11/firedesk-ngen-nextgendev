/**
 * Migration: Add last_auto_start_date column to iot_live_data_pr
 * 
 * This adds a dedicated TIMESTAMPTZ column for storing the last auto-start date
 * instead of embedding it inside the JSONB history column.
 * 
 * Run with: node migrations/run_autostart_migration.js
 */

'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Add the column (safe — IF NOT EXISTS is handled by Sequelize)
            await queryInterface.addColumn('iot_live_data_pr', 'last_auto_start_date', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Last auto-start date — updated when AS goes Auto→Manual and PS goes OFF→ON'
            }, { transaction });

            console.log('✅ Added column: last_auto_start_date');

            // Backfill from cached history._lastAutoStartDate if it exists
            await queryInterface.sequelize.query(`
                UPDATE iot_live_data_pr 
                SET last_auto_start_date = (history->>'_lastAutoStartDate')::TIMESTAMPTZ
                WHERE history->>'_lastAutoStartDate' IS NOT NULL
                  AND last_auto_start_date IS NULL;
            `, { transaction });

            console.log('✅ Backfilled last_auto_start_date from history cache');

            // Clean up the old cache key from history JSONB
            await queryInterface.sequelize.query(`
                UPDATE iot_live_data_pr 
                SET history = history - '_lastAutoStartDate'
                WHERE history ? '_lastAutoStartDate';
            `, { transaction });

            console.log('✅ Cleaned up _lastAutoStartDate from history JSONB');

            await transaction.commit();
            console.log('✅ Migration completed successfully!');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error);
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('iot_live_data_pr', 'last_auto_start_date');
        console.log('✅ Removed column: last_auto_start_date');
    }
};
