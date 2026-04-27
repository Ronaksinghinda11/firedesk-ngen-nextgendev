/**
 * AssetMetadata Model
 * Tag, QR code URL, serial number
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class AssetMetadata extends Model {
    static associate(models) {
        AssetMetadata.belongsTo(models.Asset, {
            foreignKey: 'asset_id',
            as: 'asset'
        });
    }
}

AssetMetadata.init({
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
    tag: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    serial_number: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    model: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'AssetMetadata',
    tableName: 'asset_metadata',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = AssetMetadata;
