const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const RolePermission = sequelize.define('RolePermission', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'role_id',
        references: {
            model: 'roles',
            key: 'id'
        }
    },
    permission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'permission_id',
        references: {
            model: 'permissions',
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    }
}, {
    tableName: 'role_permissions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        {
            unique: true,
            fields: ['role_id', 'permission_id']
        }
    ]
});

module.exports = RolePermission;
