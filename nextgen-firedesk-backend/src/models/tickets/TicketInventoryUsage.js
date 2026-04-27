const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const TicketInventoryUsage = sequelize.define('TicketInventoryUsage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ticket_id: {
    type: DataTypes.UUID, allowNull: false,
    references: { model: 'tickets', key: 'id' }, onDelete: 'CASCADE'
  },
  task_id: {
    type: DataTypes.UUID, allowNull: true,
    references: { model: 'ticket_tasks', key: 'id' }, onDelete: 'SET NULL'
  },
  item_type: {
    type: DataTypes.ENUM('asset', 'spare'),
    allowNull: false
  },
  item_id: { type: DataTypes.UUID, allowNull: false },
  item_name: { type: DataTypes.STRING(255), allowNull: true },
  quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  unit_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  // total_cost is GENERATED in DB; Sequelize just reads it
  total_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  consumed_by: {
    type: DataTypes.UUID, allowNull: true,
    references: { model: 'users', key: 'id' }, onDelete: 'SET NULL'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'ticket_inventory_usage',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = TicketInventoryUsage;
