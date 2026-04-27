/**
 * PlantManager Junction Model
 * Maps plants to their assigned managers
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class PlantManager extends Model { }

PlantManager.init({
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
    manager_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'managers',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    assigned_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'PlantManager',
    tableName: 'plant_managers',
    underscored: true,
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['plant_id', 'manager_id']
        }
    ]
});

module.exports = PlantManager;
