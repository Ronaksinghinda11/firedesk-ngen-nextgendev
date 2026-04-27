const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Question = sequelize.define('Question', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'question_text'
    },
    question_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'question_code'
    },
    answer_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'answer_type',
        comment: 'text, number, boolean, date, select, multi_select, condition, photo, signature'
    },
    question_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'question_type',
        comment: 'inspection, testing, maintenance, general'
    },
    is_mandatory: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_mandatory'
    },
    requires_photo: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'requires_photo'
    },
    requires_notes: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'requires_notes'
    },
    help_text: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'help_text'
    },
    display_condition: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'display_condition'
    },
    standards: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'standards',
        comment: 'Standards/regulations this question relates to'
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
    plant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'plant_id',
        references: {
            model: 'plants',
            key: 'id'
        },
        comment: 'Plant this question belongs to (for grouping in UI)'
    },
    service_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'service_type',
        comment: 'inspection, testing, maintenance'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'questions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Question;
