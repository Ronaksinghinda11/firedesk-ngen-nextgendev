const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const QuestionCategory = sequelize.define('QuestionCategory', {
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
    category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'category_id',
        references: {
            model: 'categories',
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    }
}, {
    tableName: 'question_categories',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['question_id', 'category_id']
        }
    ]
});

module.exports = QuestionCategory;
