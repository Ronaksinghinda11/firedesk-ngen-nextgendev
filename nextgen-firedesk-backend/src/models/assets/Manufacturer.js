/**
 * Manufacturer Model
 * Manufacturer reference table (from 002_master_data migration)
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Manufacturer extends Model {
    static associate(models) {
        Manufacturer.hasMany(models.Asset, {
            foreignKey: 'manufacturer_id',
            as: 'assets'
        });
    }
}

Manufacturer.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    }
}, {
    sequelize,
    modelName: 'Manufacturer',
    tableName: 'manufacturers',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Manufacturer;
