const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const PlantManager = sequelize.define('PlantManager', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    plant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'plant_id',
        references: {
            model: 'plants',
            key: 'id'
        }
    },
    manager_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'manager_id',
        references: {
            model: 'managers',
            key: 'id'
        }
    },
    assigned_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'assigned_at'
    }
}, {
    tableName: 'plant_managers',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            name: 'unique_plant_manager',
            fields: ['plant_id', 'manager_id']
        }
    ]
});

module.exports = PlantManager;
