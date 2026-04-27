'use strict';

/**
 * Migration: Add plant_id to questions table
 * This allows questions to be properly associated with a specific plant
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        // Check if the column already exists
        const tableDescription = await queryInterface.describeTable('questions');
        
        if (!tableDescription.plant_id) {
            await queryInterface.addColumn('questions', 'plant_id', {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'plants',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Plant this question belongs to (for grouping in UI)'
            });

            // Add index for faster lookups
            await queryInterface.addIndex('questions', ['plant_id'], {
                name: 'idx_questions_plant_id'
            });

            console.log('Added plant_id column to questions table');
        } else {
            console.log('plant_id column already exists in questions table');
        }
    },

    async down(queryInterface, Sequelize) {
        // Remove index first
        try {
            await queryInterface.removeIndex('questions', 'idx_questions_plant_id');
        } catch (e) {
            // Index might not exist
        }

        // Remove column
        await queryInterface.removeColumn('questions', 'plant_id');
        console.log('Removed plant_id column from questions table');
    }
};
