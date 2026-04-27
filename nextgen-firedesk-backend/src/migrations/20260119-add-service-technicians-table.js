'use strict';

/**
 * Migration: Create service_technicians junction table
 * 
 * Purpose: Support assigning multiple technicians to a single service.
 * - service_technicians: Stores ALL assigned technicians (many-to-many)
 * - service_submissions.technician_id: The ONE technician who COMPLETES the service
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        // Check if table already exists
        const tableExists = await queryInterface.sequelize.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_technicians')`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (tableExists[0].exists) {
            console.log('Table service_technicians already exists, skipping creation');
            return;
        }

        await queryInterface.createTable('service_technicians', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            service_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'service_submissions',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            technician_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'technicians',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            assigned_by: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'managers',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            assigned_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            },
            status: {
                type: Sequelize.ENUM('assigned', 'started', 'completed', 'declined'),
                allowNull: false,
                defaultValue: 'assigned'
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            }
        });

        // Add unique constraint to prevent duplicate assignments
        await queryInterface.addConstraint('service_technicians', {
            fields: ['service_id', 'technician_id'],
            type: 'unique',
            name: 'unique_service_technician'
        });

        // Add indexes for faster queries
        await queryInterface.addIndex('service_technicians', ['service_id'], {
            name: 'idx_service_technicians_service_id'
        });
        await queryInterface.addIndex('service_technicians', ['technician_id'], {
            name: 'idx_service_technicians_technician_id'
        });
        await queryInterface.addIndex('service_technicians', ['status'], {
            name: 'idx_service_technicians_status'
        });

        console.log('✅ Created service_technicians table with indexes');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('service_technicians');
        console.log('✅ Dropped service_technicians table');
    }
};
