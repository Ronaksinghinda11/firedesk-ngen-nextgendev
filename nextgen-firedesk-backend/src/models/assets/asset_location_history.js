/**
 * AssetLocationHistory Model
 * GPS location tracking history
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class AssetLocationHistory extends Model {
    static associate(models) {
        AssetLocationHistory.belongsTo(models.Asset, {
            foreignKey: 'asset_id',
            as: 'asset'
        });
        AssetLocationHistory.belongsTo(models.User, {
            foreignKey: 'recorded_by',
            as: 'recorded_by_user'
        });
    }
}

AssetLocationHistory.init({
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
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false
    },
    recorded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    recorded_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    }
}, {
    sequelize,
    modelName: 'AssetLocationHistory',
    tableName: 'asset_location_history',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = AssetLocationHistory;
