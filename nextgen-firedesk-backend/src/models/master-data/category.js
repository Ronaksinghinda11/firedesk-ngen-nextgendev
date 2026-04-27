const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    category_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'category_name',
        validate: {
            notEmpty: true
        }
    },
    category_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'category_code',
        validate: {
            notEmpty: true
        }
    },
    test_frequency_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'test_frequency_required'
    },
    is_fire_extinguisher: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_fire_extinguisher'
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
    tableName: 'categories',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Category;