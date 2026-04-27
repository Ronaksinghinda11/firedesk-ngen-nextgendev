const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const QuestionFrequency = sequelize.define('QuestionFrequency', {
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
    frequency_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'frequency_id',
        references: {
            model: 'inspection_frequencies',
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    }
}, {
    tableName: 'question_frequencies',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['question_id', 'frequency_id']
        }
    ]
});

module.exports = QuestionFrequency;
