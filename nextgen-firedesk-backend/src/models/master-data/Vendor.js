const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Vendor = sequelize.define('Vendor', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    vendor_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'vendor_name',
        validate: {
            notEmpty: true
        }
    },
    vendor_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'vendor_code',
        validate: {
            notEmpty: true
        }
    },
    address: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'address'
    },
    country: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'country'
    },
    state: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'state'
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'city'
    },
    zipcode: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'zipcode'
    },
    contact_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'contact_name'
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'email',
        validate: {
            isEmail: true
        }
    },
    phone_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'phone_no'
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active',
        allowNull: false,
        field: 'status'
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
    tableName: 'vendors',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Vendor;