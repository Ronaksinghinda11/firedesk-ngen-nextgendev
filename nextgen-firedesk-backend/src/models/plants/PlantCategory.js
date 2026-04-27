/**
 * PlantCategory Junction Model
 * Maps plants to their assigned categories
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class PlantCategory extends Model { }

PlantCategory.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    plant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'plants',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
}, {
    sequelize,
    modelName: 'PlantCategory',
    tableName: 'plant_categories',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['plant_id', 'category_id']
        }
    ]
});

module.exports = PlantCategory;
