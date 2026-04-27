/**
 * FireSafetySystem Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class FireSafetySystem extends Model { }

FireSafetySystem.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    plant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'plants',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    prime_over_tank: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    terrace_tank: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    diesel_tank_1: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    diesel_tank_2: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    header_pressure_value: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true
    },
    system_commission_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    diesel_pump_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    electric_pump_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    jockey_pump_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    fire_extinguisher_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    hydrant_point_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    sprinkler_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    safe_assembly_area_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    amc_vendor_id: {
        type: DataTypes.UUID,
        references: {
            model: 'vendors',
            key: 'id'
        },
        onDelete: 'SET NULL',
        allowNull: true
    },
    amc_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    amc_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    documents_json: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'FireSafetySystem',
    tableName: 'fire_safety_systems',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = FireSafetySystem;
