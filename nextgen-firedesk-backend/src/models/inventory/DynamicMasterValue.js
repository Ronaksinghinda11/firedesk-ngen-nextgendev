const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class DynamicMasterValue extends Model {}

DynamicMasterValue.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: "e.g. 'material_form', 'unit_of_measurement'",
  },
  value: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  sequelize,
  modelName: 'DynamicMasterValue',
  tableName: 'dynamic_master_values',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['type', 'value'],
    },
  ],
});

module.exports = DynamicMasterValue;
