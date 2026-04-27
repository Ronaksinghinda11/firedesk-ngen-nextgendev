/**
 * Models Index
 * Exports all models from all modules with associations
 *
 * This file combines models from all modules (user-management, master-data,
 * service-form, plants, assets, tickets, iot, etc.), sets up associations,
 * and exports the combined object.
 *
 * You asked to **keep both Ticket and IoT features** — this file includes both.
 */

// -----------------------------
// Module imports
// -----------------------------

// User Management Models
const userManagementModels = require("./user-management");

// Master Data Models
const masterDataModels = require("./master-data");

// Service Form Models
const serviceFormModels = require("./service-form");

// Plant Models
const plantModels = require("./plants");

// Asset Models
const assetModels = require("./assets");

// Ticket Models (ensure src/models/tickets exists in your branch)
const ticketModels = require("./tickets");
// Audit Models
const auditModels = require("./audit");

// ============================================
// MASTER DATA ASSOCIATIONS
// ============================================

// IoT Models (ensure src/models/iot exists in your branch)
const iotModels = require("./iot");

// Common models
const UploadedFile = require("./common/UploadedFile");

// Inventory Models
const inventoryModels = require("./inventory");

// -----------------------------
// Combine all models for export
// -----------------------------
const allModels = {
  // User Management
  ...userManagementModels,

  // Master Data
  ...masterDataModels,

  // Service Form (includes Form, ServiceSubmission, etc.)
  ...serviceFormModels,

  // Plants (all models with associations)
  ...plantModels,

  // Aliases for backward compatibility
  // Form is already exported from serviceFormModels, keep FireSafetyForm separately if needed
  FireSafetyForm: plantModels.FireSafetyForm,

  // Assets
  ...assetModels,

  // Tickets (spread the ticket models so they are available alongside others)
  ...ticketModels,

  // IoT Models
  ...iotModels,

  // Inventory Models
  ...inventoryModels,

  // Common
  //   UploadedFile,
  // Audit (audit_logs, comments)
  ...auditModels,

  // Common
  UploadedFile: require("./common/UploadedFile"),
};

// -----------------------------
// SETUP ASSET ASSOCIATIONS
// (Must be called after all models are combined)
// -----------------------------
if (assetModels && typeof assetModels.setupAssetAssociations === "function") {
  assetModels.setupAssetAssociations(allModels);
}

// -----------------------------
// SETUP INVENTORY ASSOCIATIONS
// (Must be called after all models are combined)
// -----------------------------
if (
  inventoryModels &&
  typeof inventoryModels.setupInventoryAssociations === "function"
) {
  inventoryModels.setupInventoryAssociations(allModels);
}

// -----------------------------
// MASTER DATA ASSOCIATIONS
// -----------------------------
// Product -> Category
if (masterDataModels.Product && masterDataModels.Category) {
  masterDataModels.Product.belongsTo(masterDataModels.Category, {
    foreignKey: "category_id",
    as: "category",
  });

  masterDataModels.Category.hasMany(masterDataModels.Product, {
    foreignKey: "category_id",
    as: "products",
  });

  // SpecDefinition -> Category
  if (masterDataModels.SpecDefinition) {
    masterDataModels.SpecDefinition.belongsTo(masterDataModels.Category, {
      foreignKey: "category_id",
      as: "category",
    });

    masterDataModels.Category.hasMany(masterDataModels.SpecDefinition, {
      foreignKey: "category_id",
      as: "spec_definitions",
    });
  }
}

// -----------------------------
// IOT DEVICE <-> ASSET <-> CATEGORY <-> PLANT ASSOCIATIONS
// -----------------------------
try {
  const { IoTDeviceAssetMap } = iotModels;
  const { Asset } = assetModels;
  const { Category } = masterDataModels;
  const { Plant } = plantModels;

  if (IoTDeviceAssetMap && Asset) {
    IoTDeviceAssetMap.belongsTo(Asset, {
      foreignKey: "asset_code",
      targetKey: "asset_code",
      as: "asset",
    });
  }

  if (IoTDeviceAssetMap && Category) {
    IoTDeviceAssetMap.belongsTo(Category, {
      foreignKey: "category_id",
      as: "category",
    });
  }

  if (IoTDeviceAssetMap && Plant) {
    IoTDeviceAssetMap.belongsTo(Plant, {
      foreignKey: "plant_id",
      as: "plant",
    });
  }
} catch (err) {
  // If iotModels or related models are not present, skip associations.
  // This prevents crashes during partial merges — but in your case both should exist.
  // console.warn('IoT associations skipped:', err.message);
}

// -----------------------------
// TICKET ASSOCIATIONS
// -----------------------------
if (
  ticketModels &&
  typeof ticketModels.setupTicketAssociations === "function"
) {
  ticketModels.setupTicketAssociations(allModels);
}

// -----------------------------
// Export all models
// -----------------------------
module.exports = allModels;
