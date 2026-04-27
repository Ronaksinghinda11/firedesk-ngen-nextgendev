/**
 * Floor Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Floor extends Model { }

Floor.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    building_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'buildings',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    floor_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    usage_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    floor_area: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Floor',
    tableName: 'floors',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Floor;
