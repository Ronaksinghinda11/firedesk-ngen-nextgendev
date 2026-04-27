/**
 * ServiceTechnician Model
 * Junction table for many-to-many relationship between ServiceSubmission and Technician.
 * 
 * Purpose:
 * - Tracks ALL technicians assigned to a service
 * - Records who assigned them and when
 * - Tracks assignment status (assigned, started, completed, declined)
 * 
 * Note: service_submissions.technician_id stores WHO COMPLETED the service
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const ServiceTechnician = sequelize.define('ServiceTechnician', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    service_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'service_submissions',
            key: 'id'
        }
    },
    technician_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'technicians',
            key: 'id'
        }
    },
    assigned_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'managers',
            key: 'id'
        }
    },
    assigned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.ENUM('assigned', 'started', 'completed', 'declined'),
        allowNull: false,
        defaultValue: 'assigned'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'service_technicians',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['service_id', 'technician_id'],
            name: 'unique_service_technician'
        },
        {
            fields: ['service_id'],
            name: 'idx_service_technicians_service_id'
        },
        {
            fields: ['technician_id'],
            name: 'idx_service_technicians_technician_id'
        },
        {
            fields: ['status'],
            name: 'idx_service_technicians_status'
        }
    ]
});

module.exports = ServiceTechnician;
