const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const IncidentActivity = sequelize.define('IncidentActivity', {
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
    action: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    performedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'performed_by',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    tableName: 'incident_activities',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false  // No updatedAt for activities
});

module.exports = IncidentActivity;
