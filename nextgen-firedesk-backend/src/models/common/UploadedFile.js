const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class UploadedFile extends Model { }

UploadedFile.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    original_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    stored_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    mime_type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    path: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    url: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    uploaded_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    data: {
        type: DataTypes.BLOB,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'UploadedFile',
    tableName: 'uploaded_files',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = UploadedFile;
