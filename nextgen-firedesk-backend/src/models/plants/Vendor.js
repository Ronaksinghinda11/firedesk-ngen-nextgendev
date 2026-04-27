/**
 * Vendor Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Vendor extends Model { }

Vendor.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    vendor_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    vendor_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
    },
    contact_person: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    gst_number: {
        type: DataTypes.STRING(25),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize,
    modelName: 'Vendor',
    tableName: 'vendors',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Vendor;
