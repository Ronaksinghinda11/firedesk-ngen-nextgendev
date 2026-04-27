const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Industry = sequelize.define('Industry', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    industry_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'industry_name',
        validate: {
            notEmpty: true
        }
    },
    industry_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'industry_code',
        validate: {
            notEmpty: true
        }
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
    tableName: 'industries',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Industry;
