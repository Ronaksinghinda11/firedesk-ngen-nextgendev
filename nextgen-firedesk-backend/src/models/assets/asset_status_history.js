/**
 * AssetStatusHistory Model
 * Tracks health status changes over time
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class AssetStatusHistory extends Model {
    static associate(models) {
        AssetStatusHistory.belongsTo(models.Asset, {
            foreignKey: 'asset_id',
            as: 'asset'
        });
        AssetStatusHistory.belongsTo(models.User, {
            foreignKey: 'changed_by',
            as: 'changed_by_user'
        });
    }
}

AssetStatusHistory.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'assets',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    old_health_statuses: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true
    },
    new_health_status: {
        type: DataTypes.ENUM('HEALTHY', 'NEEDS_ATTENTION', 'NOT_WORKING', 'INVENTORY', 'OBSOLETE'),
        allowNull: true
    },
    changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    },
    changed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    source_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    source_id: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'AssetStatusHistory',
    tableName: 'asset_status_history',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = AssetStatusHistory;
