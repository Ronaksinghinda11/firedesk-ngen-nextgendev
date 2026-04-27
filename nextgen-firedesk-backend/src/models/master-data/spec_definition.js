/**
 * SpecDefinition Model
 * Category-specific specification definitions
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class SpecDefinition extends Model {
    static associate(models) {
        SpecDefinition.belongsTo(models.Category, {
            foreignKey: 'category_id',
            as: 'category'
        });
        SpecDefinition.hasMany(models.AssetSpecValue, {
            foreignKey: 'spec_definition_id',
            as: 'spec_values'
        });
    }
}

SpecDefinition.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    spec_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    spec_label: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    spec_type: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    spec_unit: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    is_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    display_order: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    select_options: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'SpecDefinition',
    tableName: 'spec_definitions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['category_id', 'spec_name']
        }
    ]
});

module.exports = SpecDefinition;
