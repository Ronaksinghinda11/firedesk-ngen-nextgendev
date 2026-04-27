const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const IncidentAssignment = sequelize.define('IncidentAssignment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    incidentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'incident_id',
        references: {
            model: 'incidents',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    role: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    assignedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'assigned_by',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    },
    assignedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'assigned_at'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'incident_assignments',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['incident_id', 'user_id']
        }
    ]
});

module.exports = IncidentAssignment;
