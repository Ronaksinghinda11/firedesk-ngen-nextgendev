/**
 * DieselGenerator Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class DieselGenerator extends Model { }

DieselGenerator.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    plant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'plants',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    available: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}, {
    sequelize,
    modelName: 'DieselGenerator',
    tableName: 'diesel_generators',
    underscored: true,
    timestamps: false
});

module.exports = DieselGenerator;
