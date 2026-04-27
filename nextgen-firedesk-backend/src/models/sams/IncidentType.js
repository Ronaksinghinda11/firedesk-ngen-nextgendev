const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const IncidentType = sequelize.define('IncidentType', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    typeName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'type_name'
    },
    typeCode: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'type_code'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'incident_types',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = IncidentType;
