'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('ticket_responses', 'assigned_technician_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'technicians',
                key: 'id'
            }
        });
    },

    async down(queryInterface, Sequelize) {
        // Revert change - make it not null again
        // Note: This might fail if there are existing null values, so proceed with caution in production rollback
        await queryInterface.changeColumn('ticket_responses', 'assigned_technician_id', {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'technicians',
                key: 'id'
            }
        });
    }
};
