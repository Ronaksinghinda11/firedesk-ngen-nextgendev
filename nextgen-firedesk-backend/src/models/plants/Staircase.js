/**
 * Staircase Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Staircase extends Model { }

Staircase.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    building_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'buildings',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    available: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    has_pressurization: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    width_meters: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true
    },
    fire_rating_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    has_emergency_lighting: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    location_description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Staircase',
    tableName: 'staircases',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Staircase;
