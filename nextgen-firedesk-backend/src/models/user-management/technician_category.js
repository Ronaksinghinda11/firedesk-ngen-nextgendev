const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const TechnicianCategory = sequelize.define('TechnicianCategory', {
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
    category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'category_id',
        references: {
            model: 'categories',
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
    tableName: 'technician_categories',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['technician_id', 'category_id']
        }
    ]
});

module.exports = TechnicianCategory;
