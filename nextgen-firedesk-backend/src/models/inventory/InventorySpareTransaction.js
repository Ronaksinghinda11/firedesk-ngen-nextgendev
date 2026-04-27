/**
 * InventorySpareTransaction Model
 * Logs every movement (issue OUT / return IN) of an inventory spare.
 *
 * Rules enforced in the service layer:
 *   - 'issue'  → allowed for consumable AND non-consumable → reduces stock
 *   - 'return' → allowed ONLY for non-consumable           → increases stock
 *
 * quantity_before + quantity_after give a full immutable audit trail.
 */

const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../../../config/config");

class InventorySpareTransaction extends Model {}

InventorySpareTransaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // ── Parent spare ───────────────────────────────────────────────────────────
    spare_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "inventory_spares", key: "id" },
      onDelete: "CASCADE",
    },

    // ── Movement direction ─────────────────────────────────────────────────────
    // 'issue'  = stock goes OUT  (consumable + non-consumable)
    // 'return' = stock comes IN  (non-consumable only — enforced in service)
    transaction_type: {
      type: DataTypes.ENUM("issue", "return"),
      allowNull: false,
    },

    // ── Quantity ───────────────────────────────────────────────────────────────
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      validate: { min: 0.001 },
    },
    quantity_before: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
    },
    quantity_after: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
    },

    // ── Issue fields (transaction_type = 'issue') ──────────────────────────────
    issued_to: {
      type: DataTypes.STRING(255),
      allowNull: true, // name / department who received the spare
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true, // why it was needed
    },

    // ── Return fields (transaction_type = 'return') ────────────────────────────
    received_from: {
      type: DataTypes.STRING(255),
      allowNull: true, // name / department returning the spare
    },
    return_condition: {
      type: DataTypes.ENUM("good", "damaged", "needs_repair"),
      allowNull: true, // only relevant on return
    },

    // ── Optional linkages ──────────────────────────────────────────────────────
    linked_asset_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "assets", key: "id" },
      onDelete: "SET NULL",
      comment: "Asset the spare was installed on / removed from",
    },
    linked_ticket_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Maintenance ticket that triggered this movement",
    },

    // ── General ────────────────────────────────────────────────────────────────
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    transaction_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
  },
  {
    sequelize,
    modelName: "InventorySpareTransaction",
    tableName: "inventory_spare_transactions",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false, // transactions are immutable — no updates
  },
);

module.exports = InventorySpareTransaction;
