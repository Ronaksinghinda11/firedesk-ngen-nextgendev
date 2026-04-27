/**
 * AssetDocument Model
 * Asset documents/attachments
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class AssetDocument extends Model {
    static associate(models) {
        AssetDocument.belongsTo(models.Asset, {
            foreignKey: 'asset_id',
            as: 'asset'
        });
    }
}

AssetDocument.init({
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
    document_url: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING(500),
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'AssetDocument',
    tableName: 'asset_documents',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = AssetDocument;
