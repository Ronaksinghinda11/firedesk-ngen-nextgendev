const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const FormQuestion = sequelize.define('FormQuestion', {
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
    question_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'question_id',
        references: {
            model: 'questions',
            key: 'id'
        }
    },
    section_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'section_id',
        references: {
            model: 'form_sections',
            key: 'id'
        }
    },
    question_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'question_order'
    },
    is_mandatory_override: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'is_mandatory_override',
        comment: 'Override the question default mandatory setting'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    }
}, {
    tableName: 'form_questions',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['form_id', 'question_id']
        }
    ]
});

module.exports = FormQuestion;
