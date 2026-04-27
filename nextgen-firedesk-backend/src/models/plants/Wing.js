/**
 * Wing Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Wing extends Model { }

Wing.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    floor_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'floors',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    wing_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    usage_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    wing_area: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Wing',
    tableName: 'wings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Wing;
