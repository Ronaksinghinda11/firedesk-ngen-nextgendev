/**
 * Organization Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Organization extends Model { }

Organization.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    organization_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    organization_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    gst_number: {
        type: DataTypes.STRING(15),
        allowNull: true
    },
    country: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    state: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    city: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    created_by: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL',
        allowNull: true
    },
    no_of_plants: {
        type: DataTypes.INTEGER,
        defaultValue: 3
    }
}, {
    sequelize,
    modelName: 'Organization',
    tableName: 'organization',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Organization;
