'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('uploaded_files', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            original_name: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            stored_name: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            mime_type: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            size: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            path: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            url: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            uploaded_by: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('uploaded_files');
    }
};
