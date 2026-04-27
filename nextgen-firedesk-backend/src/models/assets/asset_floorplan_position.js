/**
 * AssetFloorplanPosition Model
 * Stores asset position on floor plan (one-to-one with Asset)
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class AssetFloorplanPosition extends Model {
    static associate(models) {
        AssetFloorplanPosition.belongsTo(models.Asset, {
            foreignKey: 'asset_id',
            as: 'asset'
        });
        AssetFloorplanPosition.belongsTo(models.Floor, {
            foreignKey: 'floor_id',
            as: 'floor'
        });
        AssetFloorplanPosition.belongsTo(models.User, {
            foreignKey: 'updated_by',
            as: 'updated_by_user'
        });
    }
}

AssetFloorplanPosition.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'assets',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    floor_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'floors',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    coordinate_x: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    coordinate_y: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    updated_by: {
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
    modelName: 'AssetFloorplanPosition',
    tableName: 'asset_floorplan_position',
    underscored: true,
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at'
});

module.exports = AssetFloorplanPosition;
