const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Permission = sequelize.define('Permission', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    entity_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'entity_name',
        validate: {
            notEmpty: true
        }
    },
    action_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'action_name',
        validate: {
            notEmpty: true
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    }
}, {
    tableName: 'permissions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        {
            unique: true,
            fields: ['entity_name', 'action_name']
        }
    ]
});

module.exports = Permission;
