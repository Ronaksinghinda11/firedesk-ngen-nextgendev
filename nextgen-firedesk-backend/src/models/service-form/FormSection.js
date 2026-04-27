const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const FormSection = sequelize.define('FormSection', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    form_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'form_id',
        references: {
            model: 'forms',
            key: 'id'
        }
    },
    section_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'section_name'
    },
    section_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'section_order'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'description'
    },
    is_mandatory: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_mandatory'
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
    tableName: 'form_sections',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = FormSection;
