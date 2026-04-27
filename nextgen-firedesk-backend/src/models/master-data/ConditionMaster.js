const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const ConditionMaster = sequelize.define('ConditionMaster', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    condition_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'condition_code',
        validate: {
            notEmpty: true
        }
    },
    condition_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'condition_name',
        validate: {
            notEmpty: true
        }
    },
    severity_level: {
        type: DataTypes.ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'),
        defaultValue: 'MEDIUM',
        field: 'severity_level'
    },
    priority_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'priority_score',
        validate: {
            min: 0,
            max: 100
        },
        comment: '0-100 priority score'
    },
    health_impact: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'health_impact'
    },
    recommended_action: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'recommended_action'
    },
    requires_immediate_action: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'requires_immediate_action'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'conditions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = ConditionMaster;