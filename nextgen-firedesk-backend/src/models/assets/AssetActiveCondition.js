/**
 * Asset Active Condition Model
 * Tracks currently active (non-compliant) conditions for each asset
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const AssetActiveCondition = sequelize.define('AssetActiveCondition', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'assets',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    condition_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'conditions',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    question_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'questions',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    severity_level: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'CRITICAL, HIGH, MEDIUM, LOW, INFO',
    },
    priority_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    },
    detected_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When this condition was first detected (answer timestamp)',
    },
    last_submission_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'service_submissions',
            key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'Last service submission that confirmed this condition',
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'asset_active_conditions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['asset_id', 'condition_id', 'question_id'],
            name: 'asset_active_conditions_unique_idx',
        },
        {
            fields: ['asset_id'],
            name: 'asset_active_conditions_asset_id_idx',
        },
        {
            fields: ['priority_score'],
            name: 'asset_active_conditions_priority_score_idx',
        },
    ],
});

module.exports = AssetActiveCondition;
