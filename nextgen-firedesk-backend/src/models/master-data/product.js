const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
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
    product_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'product_name',
        validate: {
            notEmpty: true
        }
    },
    product_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'product_code',
        validate: {
            notEmpty: true
        }
    },
    test_frequency: {
        type: DataTypes.ENUM('One Year', 'Two Years', 'Three Years', 'Five Years', 'Ten Years'),
        allowNull: true,
        field: 'test_frequency'
    },
    variants: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        field: 'variants'
    },
    image: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'image'
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active',
        allowNull: false,
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
    tableName: 'products',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Product;