const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const TicketTaskChecklistQuestion = sequelize.define('TicketTaskChecklistQuestion', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    task_id: {
        type: DataTypes.UUID, allowNull: false,
        references: { model: 'ticket_tasks', key: 'id' }, onDelete: 'CASCADE'
    },
    question_text: { type: DataTypes.TEXT, allowNull: false },
    question_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_mandatory: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
    tableName: 'ticket_task_checklist_questions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = TicketTaskChecklistQuestion;
