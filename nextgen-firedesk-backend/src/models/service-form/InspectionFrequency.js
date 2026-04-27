const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const InspectionFrequency = sequelize.define('InspectionFrequency', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    frequency_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'frequency_code'
    },
    frequency_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'frequency_name'
    },
    interval_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'interval_days'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
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
    tableName: 'inspection_frequencies',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = InspectionFrequency;
