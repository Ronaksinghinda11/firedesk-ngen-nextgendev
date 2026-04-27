/**
 * Plant Model
 * Represents a plant/facility in the system
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Plant extends Model { }

Plant.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    plant_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    plant_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    address_line1: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    city: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    state: {
        type: DataTypes.STRING(35),
        allowNull: false
    },
    country: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'India'
    },
    postal_code: {
        type: DataTypes.STRING(6),
        allowNull: true
    },
    gst_number: {
        type: DataTypes.STRING(25),
        allowNull: true
    },
    industry_id: {
        type: DataTypes.UUID,
        references: {
            model: 'industries',
            key: 'id'
        },
        onDelete: 'SET NULL',
        allowNull: true
    },
    organization_id: {
        type: DataTypes.UUID,
        references: {
            model: 'organization',
            key: 'id'
        },
        onDelete: 'CASCADE',
        allowNull: true
    },
    main_buildings_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    sub_buildings_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    total_plant_area: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    total_built_up_area: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive', 'Draft'),
        defaultValue: 'Active'
    }
}, {
    sequelize,
    modelName: 'Plant',
    tableName: 'plants',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Plant;
