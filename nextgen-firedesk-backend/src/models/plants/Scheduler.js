/**
 * MaintenanceScheduler Model (Scheduler)
 * Stores maintenance scheduling configuration for plants/categories
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Scheduler extends Model { }

Scheduler.init({
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
        }
    },
    category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'id'
        }
    },
    schedule_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    schedule_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    inspection_frequency: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    testing_frequency: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    maintenance_frequency: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize,
    modelName: 'Scheduler',
    tableName: 'maintenance_schedulers',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Scheduler;
