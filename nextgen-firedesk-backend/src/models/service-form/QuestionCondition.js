const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const QuestionCondition = sequelize.define('QuestionCondition', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
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
    condition_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'condition_id',
        references: {
            model: 'conditions',
            key: 'id'
        }
    },
    condition_source: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'condition_source',
        comment: 'manual, system, calculated'
    },
    display_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'display_order'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    data_source_config: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'data_source_config',
        comment: 'Configuration for dynamic condition loading'
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
    tableName: 'question_conditions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['question_id', 'condition_id']
        }
    ]
});

module.exports = QuestionCondition;
