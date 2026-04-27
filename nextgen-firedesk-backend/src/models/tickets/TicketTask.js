const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const TicketTask = sequelize.define('TicketTask', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ticket_id: {
        type: DataTypes.UUID, allowNull: false,
        references: { model: 'tickets', key: 'id' }, onDelete: 'CASCADE'
    },
    task_number: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    role_label: { type: DataTypes.STRING(100), allowNull: true },
    target_date: { type: DataTypes.DATEONLY, allowNull: false },
    assigned_technician_id: {
        type: DataTypes.UUID, allowNull: true,
        references: { model: 'technicians', key: 'id' }, onDelete: 'SET NULL'
    },
    requires_approval: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    has_checklist: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'pending_approval', 'approved', 'rejected', 'completed'),
        allowNull: false, defaultValue: 'pending'
    },
    started_at: { type: DataTypes.DATE, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    rejection_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    technician_notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: {
        type: DataTypes.UUID, allowNull: true,
        references: { model: 'users', key: 'id' }, onDelete: 'SET NULL'
    },
}, {
    tableName: 'ticket_tasks',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = TicketTask;
