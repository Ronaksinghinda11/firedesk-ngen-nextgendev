const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const TicketTaskChecklistAnswer = sequelize.define('TicketTaskChecklistAnswer', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    question_id: {
        type: DataTypes.UUID, allowNull: false,
        references: { model: 'ticket_task_checklist_questions', key: 'id' }, onDelete: 'CASCADE'
    },
    task_id: {
        type: DataTypes.UUID, allowNull: false,
        references: { model: 'ticket_tasks', key: 'id' }, onDelete: 'CASCADE'
    },
    answered_by: {
        type: DataTypes.UUID, allowNull: true,
        references: { model: 'users', key: 'id' }, onDelete: 'SET NULL'
    },
    answer: { type: DataTypes.BOOLEAN, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    answered_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
}, {
    tableName: 'ticket_task_checklist_answers',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = TicketTaskChecklistAnswer;
