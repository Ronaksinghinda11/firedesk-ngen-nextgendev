const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class InventorySpare extends Model {}

InventorySpare.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  plant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'plants', key: 'id' },
    onDelete: 'CASCADE',
  },
  spare_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  spare_type: {
    type: DataTypes.ENUM('consumable', 'non-consumable'),
    allowNull: false,
  },
  material_form: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  unit_of_measurement: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  linked_product_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'products', key: 'id' },
    onDelete: 'SET NULL',
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  total_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  sequelize,
  modelName: 'InventorySpare',
  tableName: 'inventory_spares',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = InventorySpare;
