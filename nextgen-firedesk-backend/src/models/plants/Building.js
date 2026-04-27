/**
 * Building Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Building extends Model { }

Building.init({
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
    building_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    building_height: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true
    },
    total_area: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    total_built_up_area: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    building_type: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Building',
    tableName: 'buildings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Building;
