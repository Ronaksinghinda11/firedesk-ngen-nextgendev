/**
 * Entrance Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Entrance extends Model { }

Entrance.init({
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
    entrance_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    entrance_type: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    width_meters: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true
    },
    location_description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Entrance',
    tableName: 'entrances',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Entrance;
