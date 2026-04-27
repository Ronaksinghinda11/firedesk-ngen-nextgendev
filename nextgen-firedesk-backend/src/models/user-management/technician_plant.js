const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const TechnicianPlant = sequelize.define('TechnicianPlant', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    technician_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'technician_id',
        references: {
            model: 'technicians',
            key: 'id'
        }
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
        allowNull: true,
        field: 'manager_id',
        references: {
            model: 'managers',
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'technician_plants',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['technician_id', 'plant_id']
        }
    ]
});

module.exports = TechnicianPlant;
