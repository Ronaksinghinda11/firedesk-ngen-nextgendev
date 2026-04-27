/**
 * BMIssueType Model
 * Master data for breakdown/compliance issue types
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const BMIssueType = sequelize.define('BMIssueType', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'name'
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'category',
        comment: 'ELECTRICAL, MECHANICAL, HYDRAULIC, SOFTWARE, COMPLIANCE, etc.'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'description'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
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
    tableName: 'bm_issue_types',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = BMIssueType;
