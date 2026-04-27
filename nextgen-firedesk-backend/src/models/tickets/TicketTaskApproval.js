const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const TicketTaskApproval = sequelize.define('TicketTaskApproval', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    task_id: {
        type: DataTypes.UUID, allowNull: false,
        references: { model: 'ticket_tasks', key: 'id' }, onDelete: 'CASCADE'
    },
    ticket_id: {
        type: DataTypes.UUID, allowNull: false,
        references: { model: 'tickets', key: 'id' }, onDelete: 'CASCADE'
    },
    approval_round: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    approver_role: { type: DataTypes.STRING(50), allowNull: true },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false, defaultValue: 'pending'
    },
    requested_by: {
        type: DataTypes.UUID, allowNull: true,
        references: { model: 'users', key: 'id' }, onDelete: 'SET NULL'
    },
    approved_by: {
        type: DataTypes.UUID, allowNull: true,
        references: { model: 'users', key: 'id' }, onDelete: 'SET NULL'
    },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    requested_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    acted_at: { type: DataTypes.DATE, allowNull: true },
}, {
    tableName: 'ticket_task_approvals',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = TicketTaskApproval;
