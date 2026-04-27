const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const AssetHealthHistory = sequelize.define('AssetHealthHistory', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'asset_id',
        references: {
            model: 'assets',
            key: 'id'
        }
    },
    submission_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'submission_id',
        references: {
            model: 'service_submissions',
            key: 'id'
        }
    },
    // Timestamp
    submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'submitted_at'
    },
    // Snapshot of metrics at this point in time
    critical_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'critical_count'
    },
    high_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'high_count'
    },
    medium_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'medium_count'
    },
    low_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'low_count'
    },
    total_priority_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'total_priority_score'
    },
    health_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'health_status',
        comment: 'HEALTHY, NEEDS_ATTENTION, NOT_WORKING'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    }
}, {
    tableName: 'asset_health_history',
    timestamps: false,
    underscored: true
});

module.exports = AssetHealthHistory;
