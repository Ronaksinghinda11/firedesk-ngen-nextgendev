const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const IncidentSubtype = sequelize.define('IncidentSubtype', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    incidentTypeId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'incident_type_id',
        references: {
            model: 'incident_types',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    subtypeName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'subtype_name'
    },
    subtypeCode: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'subtype_code'
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
    tableName: 'incident_subtypes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['incident_type_id', 'subtype_name']
        }
    ]
});

module.exports = IncidentSubtype;
