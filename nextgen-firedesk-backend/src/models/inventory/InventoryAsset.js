const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class InventoryAsset extends Model { }

InventoryAsset.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  plant_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'plants', key: 'id' }, onDelete: 'CASCADE' },
  category_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'categories', key: 'id' }, onDelete: 'RESTRICT' },
  product_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'RESTRICT' },
  type: { type: DataTypes.STRING(100), allowNull: true },
  sub_type: { type: DataTypes.STRING(100), allowNull: true },
  manufacturer: { type: DataTypes.STRING(255), allowNull: true },
  model: { type: DataTypes.STRING(255), allowNull: true },
  serial_number: { type: DataTypes.STRING(255), allowNull: true },
  manufacturing_date: { type: DataTypes.DATEONLY, allowNull: true },
  warranty_end_date: { type: DataTypes.DATEONLY, allowNull: true },
  lifespan_years: { type: DataTypes.INTEGER, allowNull: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  total_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  documents: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
  status: {
    type: DataTypes.ENUM('available', 'installed', 'reserved'),
    allowNull: false,
    defaultValue: 'available',
  },
  moved_to_asset_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'assets', key: 'id' },
    onDelete: 'SET NULL',
  },
  moved_at: { type: DataTypes.DATE, allowNull: true },
  asset_code: { type: DataTypes.STRING(100), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  sequelize,
  modelName: 'InventoryAsset',
  tableName: 'inventory_assets',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = InventoryAsset;
