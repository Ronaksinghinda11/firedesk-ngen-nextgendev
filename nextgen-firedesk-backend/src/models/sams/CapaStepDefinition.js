const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const CapaStepDefinition = sequelize.define('CapaStepDefinition', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    stepNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'step_number'
    },
    stepName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'step_name'
    },
    stepCode: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'step_code'
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
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'capa_step_definitions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = CapaStepDefinition;
