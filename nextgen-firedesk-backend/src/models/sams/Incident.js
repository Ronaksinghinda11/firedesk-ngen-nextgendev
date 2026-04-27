const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Incident = sequelize.define('Incident', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    incidentNumber: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        field: 'incident_number'
    },
    // Classification
    incidentSubtypeId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'incident_subtype_id',
        references: {
            model: 'incident_subtypes',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    },
    // Location
    plantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'plant_id',
        references: {
            model: 'plants',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    },
    buildingId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'building_id',
        references: {
            model: 'buildings',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    floorId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'floor_id',
        references: {
            model: 'floors',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    // Details
    incidentDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'incident_date'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    impact: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    severity: {
        type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
        allowNull: false,
        defaultValue: 'Medium'
    },
    // Status & Workflow
    status: {
        type: DataTypes.ENUM('Open', 'Team Assigned', 'In Progress', 'Pending Approval', 'Closed', 'Rejected'),
        defaultValue: 'Open'
    },
    currentCapaStep: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'current_capa_step'
    },
    // Team
    teamCreatorId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'team_creator_id',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    teamLeaderId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'team_leader_id',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    // Metadata
    documentsData: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'documents_data'
    },
    // Tracking
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    }
}, {
    tableName: 'incidents',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Incident;
