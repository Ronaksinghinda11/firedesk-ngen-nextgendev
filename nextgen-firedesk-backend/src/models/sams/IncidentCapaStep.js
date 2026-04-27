const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const IncidentCapaStep = sequelize.define('IncidentCapaStep', {
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
    capaStepDefinitionId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'capa_step_definition_id',
        references: {
            model: 'capa_step_definitions',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    },
    // Step Details (copied from definition)
    stepNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'step_number'
    },
    stepName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'step_name'
    },
    stepDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'step_description'
    },
    isDocumentRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_document_required'
    },
    isApprovalRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_approval_required'
    },
    // Response
    stepResponse: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'step_response'
    },
    documentsData: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'documents_data'
    },
    // Status
    status: {
        type: DataTypes.ENUM('Not Started', 'In Progress', 'Pending Approval', 'Approved', 'Rejected'),
        defaultValue: 'Not Started'
    },
    // Tracking
    submittedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'submitted_by',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'submitted_at'
    },
    approvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'approved_by',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at'
    },
    rejectedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'rejected_by',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    rejectedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'rejected_at'
    },
    rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'rejection_reason'
    }
}, {
    tableName: 'incident_capa_steps',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['incident_id', 'step_number']
        }
    ]
});

module.exports = IncidentCapaStep;
