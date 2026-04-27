const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Technician = sequelize.define('Technician', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    technician_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        field: 'technician_code'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    vendor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'vendor_id',
        references: {
            model: 'vendors',
            key: 'id'
        }
    },
    technician_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'technician_type',
        comment: 'In-House | Third-Party'
    },
    experience: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'experience'
    },
    specialization: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'specialization'
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active',
        field: 'status'
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
    tableName: 'technicians',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Technician;
