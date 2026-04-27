const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const QuestionProduct = sequelize.define('QuestionProduct', {
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
    product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'product_id',
        references: {
            model: 'products',
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    }
}, {
    tableName: 'question_products',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['question_id', 'product_id']
        }
    ]
});

module.exports = QuestionProduct;
