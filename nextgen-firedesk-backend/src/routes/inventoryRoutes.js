/**
 * Inventory Routes
 * Full permission-gated routes for the Inventory + Spares module.
 *
 * Base path: /api/inventory  (mounted in src/routes/index.js)
 *
 * Endpoints:
 *   Dropdowns
 *     GET  /dropdown-data       – categories, products, dynamic values scoped to a plant
 *     GET  /user-plants         – plants accessible to the requesting user
 *
 *   Dynamic master values (custom dropdown management)
 *     GET  /dynamic-values      – list values for a given ?type=
 *     POST /dynamic-values      – add a new value (find-or-create)
 *
 *   Inventory Assets
 *     GET    /assets            – paginated list (plant-filtered for managers)
 *     POST   /assets            – create a new inventory asset
 *     GET    /assets/:id        – get a single inventory asset
 *     PUT    /assets/:id        – update an inventory asset
 *     DELETE /assets/:id        – delete an inventory asset
 *
 *   Move to main assets
 *     POST /move-to-assets/:id  – promote inventory asset → live assets table
 *
 *   Inventory Spares
 *     GET    /spares            – paginated list (plant-filtered for managers)
 *     POST   /spares            – create a new spare
 *     GET    /spares/:id        – get a single spare
 *     PUT    /spares/:id        – update a spare
 *     DELETE /spares/:id        – delete a spare
 */

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { requirePermission } = require("../middleware/permission_check");
const { managerPlantFilter } = require("../middleware/managerPlantFilter");
const { ENTITIES, ACTIONS } = require("../utils/permission_constants");
const ctrl = require("../controllers/inventory/inventory_controller");

// All inventory routes require a valid JWT
router.use(auth);

// ============================================================
// DROPDOWN HELPERS
// ============================================================

// GET /inventory/user-plants
// Returns the plants this user may create/view inventory for
router.get(
  "/user-plants",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  ctrl.get_user_plants,
);

// GET /inventory/dropdown-data?plant_id=<uuid>
// Returns categories, products (with variants), material_forms, units
router.get(
  "/dropdown-data",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  ctrl.get_dropdown_data,
);

// GET /inventory/all-products
// Returns ALL active products (with category name) for the spare linked-product dropdown
router.get(
  "/all-products",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  ctrl.get_all_products,
);

// ============================================================
// DYNAMIC MASTER VALUES  (material_form / unit_of_measurement / …)
// ============================================================

// GET /inventory/dynamic-values?type=material_form
router.get(
  "/dynamic-values",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  ctrl.get_dynamic_values,
);

// POST /inventory/dynamic-values  { type, value }
router.post(
  "/dynamic-values",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.CREATE),
  ctrl.create_dynamic_value,
);

// ============================================================
// INVENTORY ASSETS
// ============================================================

// GET /inventory/assets
// managerPlantFilter attaches req.managerPlantIds for automatic scoping
router.get(
  "/assets",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  managerPlantFilter,
  ctrl.get_assets,
);

// POST /inventory/assets
router.post(
  "/assets",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.CREATE),
  managerPlantFilter,
  ctrl.create_asset,
);

// GET /inventory/assets/groups
router.get(
  "/assets/groups",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  managerPlantFilter,
  ctrl.get_asset_groups,
);

// GET /inventory/assets/:id
router.get(
  "/assets/:id",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  ctrl.get_asset,
);

// PUT /inventory/assets/:id
router.put(
  "/assets/:id",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.UPDATE),
  ctrl.update_asset,
);

// DELETE /inventory/assets/:id
router.delete(
  "/assets/:id",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.DELETE),
  ctrl.delete_asset,
);

// GET /inventory/assets/:id/lifecycle-cost
// Get total spare costs spent on this asset throughout its lifecycle
router.get(
  "/assets/:id/lifecycle-cost",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  ctrl.get_asset_lifecycle_cost,
);

// ============================================================
// MOVE INVENTORY ASSET → MAIN ASSETS TABLE
// ============================================================

// POST /inventory/move-to-assets/:id
router.post(
  "/move-to-assets/:id",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.UPDATE),
  ctrl.move_to_asset,
);

// ============================================================
// BULK UPLOAD
// ============================================================

// POST /inventory/bulk-upload
// Requires multer middleware for file upload
const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

router.post(
  "/bulk-upload",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.CREATE),
  managerPlantFilter,
  upload.single('file'),
  ctrl.bulk_upload_inventory,
);

// ============================================================
// INVENTORY SPARES
// ============================================================

// GET /inventory/spares
router.get(
  "/spares",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  managerPlantFilter,
  ctrl.get_spares,
);

// POST /inventory/spares
router.post(
  "/spares",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.CREATE),
  managerPlantFilter,
  ctrl.create_spare,
);

// GET /inventory/spares/:id
router.get(
  "/spares/:id",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  ctrl.get_spare,
);

// PUT /inventory/spares/:id
router.put(
  "/spares/:id",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.UPDATE),
  ctrl.update_spare,
);

// DELETE /inventory/spares/:id
router.delete(
  "/spares/:id",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.DELETE),
  ctrl.delete_spare,
);

// ============================================================
// SPARE TRANSACTION LOG (issue OUT / return IN)
// ============================================================

// POST /inventory/spares/:id/issue
// Issue (dispatch) a spare — reduces stock
// Allowed for consumable AND non-consumable
router.post(
  "/spares/:id/issue",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.UPDATE),
  ctrl.issue_spare,
);

// POST /inventory/spares/:id/return
// Return a spare — increases stock
// Allowed ONLY for non-consumable (enforced in service)
router.post(
  "/spares/:id/return",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.UPDATE),
  ctrl.return_spare,
);

// GET /inventory/spares/:id/transactions
// Full movement history for one spare
router.get(
  "/spares/:id/transactions",
  requirePermission(ENTITIES.INVENTORY, ACTIONS.READ),
  ctrl.get_spare_transactions,
);

module.exports = router;
