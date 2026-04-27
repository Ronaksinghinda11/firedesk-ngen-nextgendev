const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'name'
    },
    display_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'display_name'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
        field: 'phone',
        validate: {
            is: /^[0-9+\-\s()]*$/
        }
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        field: 'email',
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'password'
    },
    profile_pic: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'profile_pic'
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active',
        field: 'status'
    },
    otp: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'otp'
    },
    otp_expiry: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'otp_expiry'
    },
    otp_is_used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'otp_is_used'
    },
    device_token: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'device_token'
    },
    role_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'role_id',
        references: {
            model: 'roles',
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
    tableName: 'users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = User;
