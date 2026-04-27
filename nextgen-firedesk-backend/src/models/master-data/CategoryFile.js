const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const CategoryFile = sequelize.define('CategoryFile', {
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
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'file_name',
        validate: {
            notEmpty: true
        }
    },
    mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'mime_type'
    },
    file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'file_size'
    },
    storage_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'storage_path',
        validate: {
            notEmpty: true
        }
    },
    uploaded_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'uploaded_by',
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
    tableName: 'category_files',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = CategoryFile;