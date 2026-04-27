const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'name',
        validate: {
            notEmpty: true
        }
    },
    description: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'description'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_default'
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
    tableName: 'roles',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Role;
