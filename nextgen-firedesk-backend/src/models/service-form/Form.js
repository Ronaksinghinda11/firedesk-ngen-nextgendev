const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Form = sequelize.define('Form', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    form_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'form_code'
    },
    service_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'service_name'
    },
    service_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'service_type',
        comment: 'inspection, testing, maintenance'
    },
    category_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'category_id',
        references: {
            model: 'categories',
            key: 'id'
        },
        comment: 'Optional: Primary category for this form'
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'product_id',
        references: {
            model: 'products',
            key: 'id'
        },
        comment: 'Optional: Primary product for this form'
    },
    frequency_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'frequency_id',
        references: {
            model: 'inspection_frequencies',
            key: 'id'
        },
        comment: 'Frequency for this form - unique per category+product+frequency'
    },
    plant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'plant_id',
        references: {
            model: 'plants',
            key: 'id'
        },
        comment: 'Optional: Plant-specific form'
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active',
        field: 'status'
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'forms',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Form;
