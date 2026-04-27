'use strict';

/**
 * Migration: Allow NULL for assets.created_by
 * 
 * This enables user deletion without FK constraint violation.
 * When a user is deleted, their created_by references will be set to NULL.
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Step 1: Alter the column to allow NULL
        await queryInterface.changeColumn('assets', 'created_by', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'SET NULL'
        });

        console.log('✅ assets.created_by changed to allowNull: true with ON DELETE SET NULL');
    },

    down: async (queryInterface, Sequelize) => {
        // Revert: Set back to NOT NULL (only works if no NULL values exist)
        await queryInterface.changeColumn('assets', 'created_by', {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'RESTRICT'
        });

        console.log('⏪ assets.created_by reverted to allowNull: false');
    }
};
