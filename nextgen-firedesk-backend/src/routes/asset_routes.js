/**
 * Asset Routes
 * All asset-related API endpoints with RBAC protection
 */

const express = require('express');
const router = express.Router();
const asset_controller = require('../controllers/assets/asset_controller');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../utils/permission_constants');
const { managerPlantFilter } = require('../middleware/managerPlantFilter');

// ============================================
// ASSET COUNTS (must be before /:id)
// ============================================
router.get('/counts', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), managerPlantFilter, asset_controller.get_counts);

// ============================================
// TECHNICIAN ROUTES (must be before /:id)
// ============================================
router.get('/technician/my-assets', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), asset_controller.get_my_assets);

// ============================================
// BULK OPERATIONS (must be before /:id)
// ============================================


router.post(
  '/bulk',
  auth,
  requirePermission(ENTITIES.ASSETS, ACTIONS.CREATE),
  managerPlantFilter,
  asset_controller.bulk_create
);

router.post(
  '/bulk-import',
  auth,
  requirePermission(ENTITIES.ASSETS, ACTIONS.CREATE),
  managerPlantFilter,
  asset_controller.bulk_create
);

router.post(
  '/bulk-fetch',
  auth,
  requirePermission(ENTITIES.ASSETS, ACTIONS.READ),
  managerPlantFilter,
  asset_controller.bulk_fetch
);

router.post(
  '/bulk-qr-print',
  auth,
  requirePermission(ENTITIES.ASSETS, ACTIONS.READ),
  managerPlantFilter,
  asset_controller.bulk_qr_print
);



// ============================================
// FLOORPLAN ROUTES (must be before /:id)
// ============================================
router.get('/by-floor/:floor_id', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), managerPlantFilter, asset_controller.get_by_floor);

// ============================================
// MANUFACTURER ROUTES (must be before /:id)
// ============================================
const manufacturerController = require('../controllers/assets/manufacturerController');
router.get('/manufacturers', auth, manufacturerController.getAll);
router.get('/manufacturers/:id', auth, manufacturerController.getById);
router.post('/manufacturers', auth, manufacturerController.create);
router.put('/manufacturers/:id', auth, manufacturerController.update);
router.delete('/manufacturers/:id', auth, manufacturerController.delete);


// ============================================
// ASSET CRUD ROUTES (with manager plant filtering)
// ============================================
router.get('/', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), managerPlantFilter, asset_controller.get_all);
router.post('/', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.CREATE), managerPlantFilter, asset_controller.create);
router.get('/:id', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), managerPlantFilter, asset_controller.get_by_id);
router.put('/:id', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.UPDATE), managerPlantFilter, asset_controller.update);
router.delete('/:id', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.DELETE), managerPlantFilter, asset_controller.delete);
router.post('/:id/restore', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.UPDATE), asset_controller.restore);

// ============================================
// ASSET SUB-RESOURCES
// ============================================
router.get('/:id/pdf', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), asset_controller.get_pdf);
router.get('/:id/service-history', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), asset_controller.get_service_history);
router.get('/:id/lifecycle-stats', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), asset_controller.get_lifecycle_stats);
router.get('/:id/lifecycle-timeline', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), asset_controller.get_lifecycle_timeline);
router.put('/:id/floorplan', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.UPDATE), asset_controller.update_floorplan_position);
router.delete('/:id/floorplan', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.UPDATE), asset_controller.remove_from_floorplan);
router.put('/:id/geolocation', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.UPDATE), asset_controller.update_geolocation);
router.get('/:id/status-history', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), asset_controller.get_status_history);
router.get('/:id/location-history', auth, requirePermission(ENTITIES.ASSETS, ACTIONS.READ), asset_controller.get_location_history);

module.exports = router;
