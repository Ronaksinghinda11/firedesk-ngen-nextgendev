/**
 * Lift Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Lift extends Model { }

Lift.init({
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
    capacity_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    fire_rating_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    has_emergency_phone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    sequelize,
    modelName: 'Lift',
    tableName: 'lifts',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Lift;
