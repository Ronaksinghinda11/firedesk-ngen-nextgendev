const InventoryAsset = require("./InventoryAsset");
const InventorySpare = require("./InventorySpare");
const InventorySpareTransaction = require("./InventorySpareTransaction");
const DynamicMasterValue = require("./DynamicMasterValue");

const setupInventoryAssociations = (models) => {
  const { Plant, Category, Product, User, Asset } = models;

  // ── InventoryAsset associations ──────────────────────────────────────────────
  InventoryAsset.belongsTo(Plant, { foreignKey: "plant_id", as: "plant" });
  Plant.hasMany(InventoryAsset, {
    foreignKey: "plant_id",
    as: "inventory_assets",
  });

  InventoryAsset.belongsTo(Category, {
    foreignKey: "category_id",
    as: "category",
  });
  Category.hasMany(InventoryAsset, {
    foreignKey: "category_id",
    as: "inventory_assets",
  });

  InventoryAsset.belongsTo(Product, {
    foreignKey: "product_id",
    as: "product",
  });
  Product.hasMany(InventoryAsset, {
    foreignKey: "product_id",
    as: "inventory_assets",
  });

  InventoryAsset.belongsTo(User, { foreignKey: "created_by", as: "creator" });

  // ── InventorySpare associations ──────────────────────────────────────────────
  InventorySpare.belongsTo(Plant, { foreignKey: "plant_id", as: "plant" });
  Plant.hasMany(InventorySpare, {
    foreignKey: "plant_id",
    as: "inventory_spares",
  });

  InventorySpare.belongsTo(Product, {
    foreignKey: "linked_product_id",
    as: "linked_product",
  });
  Product.hasMany(InventorySpare, {
    foreignKey: "linked_product_id",
    as: "spare_links",
  });

  InventorySpare.belongsTo(User, { foreignKey: "created_by", as: "creator" });

  // Spare ↔ Transactions (one-to-many)
  InventorySpare.hasMany(InventorySpareTransaction, {
    foreignKey: "spare_id",
    as: "transactions",
  });
  InventorySpareTransaction.belongsTo(InventorySpare, {
    foreignKey: "spare_id",
    as: "spare",
  });

  // ── InventorySpareTransaction associations ───────────────────────────────────
  InventorySpareTransaction.belongsTo(User, {
    foreignKey: "created_by",
    as: "created_by_user",
  });

  // Optional: link to a live asset (e.g. spare installed on asset)
  if (Asset) {
    InventorySpareTransaction.belongsTo(Asset, {
      foreignKey: "linked_asset_id",
      as: "linked_asset",
    });
  }

  // ── DynamicMasterValue associations ─────────────────────────────────────────
  DynamicMasterValue.belongsTo(User, {
    foreignKey: "created_by",
    as: "creator",
  });
};

module.exports = {
  InventoryAsset,
  InventorySpare,
  InventorySpareTransaction,
  DynamicMasterValue,
  setupInventoryAssociations,
};
