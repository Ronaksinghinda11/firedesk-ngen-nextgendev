/**
 * AssetSpecValue Model
 * Asset specification values
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class AssetSpecValue extends Model {
    static associate(models) {
        AssetSpecValue.belongsTo(models.Asset, {
            foreignKey: 'asset_id',
            as: 'asset'
        });
        AssetSpecValue.belongsTo(models.SpecDefinition, {
            foreignKey: 'spec_definition_id',
            as: 'spec_definition'
        });
    }
}

AssetSpecValue.init({
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
    spec_definition_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'spec_definitions',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    spec_value: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    unit: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'AssetSpecValue',
    tableName: 'asset_spec_values',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['asset_id', 'spec_definition_id']
        }
    ]
});

module.exports = AssetSpecValue;
