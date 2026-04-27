const express = require("express");
const router = express.Router();
const iotDeviceController = require("../controllers/iot/iotDeviceController");
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../utils/permission_constants');

/**
 * IoT Device Routes
 * Handles multi-device IoT data ingestion and device-asset mapping
 */

// ============================================================================
// Lambda Webhook (No authentication - secured by AWS)
// ============================================================================

/**
 * POST /api/iot/data
 * Receives IoT data from AWS Lambda
 * Public endpoint (secured at AWS level)
 */
// router.post("/data", iotDeviceController.receiveIoTData);

// ============================================================================
// Frontend APIs (Requires authentication)
// ============================================================================

/**
 * GET /api/iot/devices/by-plant/:plantId/:categoryId
 * Get all device mappings for a specific plant and category
 * Used by dashboard to fetch device list
 */
router.get(
    "/devices/by-plant/:plantId/:categoryId",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    iotDeviceController.getDevicesByPlantCategory
);

/**
 * GET /api/iot/devices/latest/:plantId/:categoryId
 * Get latest IoT data for devices in a plant/category
 * Used for initial data load
 */
router.get(
    "/devices/latest/:plantId/:categoryId",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    iotDeviceController.getLatestDeviceData
);

/**
 * POST /api/iot/mapping
 * Create new device-to-asset mapping
 * Used by IoT Setup page
 */
router.post(
    "/mapping",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.CREATE),
    iotDeviceController.createMapping
);

/**
 * GET /api/iot/device-mappings-summary
 * Get summary of all device mappings with port usage
 * Used by IoT Setup page for validation
 */
router.get(
    "/device-mappings-summary",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    iotDeviceController.getDeviceMappingsSummary
);

/**
 * PUT /api/iot/mapping/:id
 * Update existing device-to-asset mapping
 * Used by IoT Setup page
 */
router.put(
    "/mapping/:id",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.UPDATE),
    iotDeviceController.updateMapping
);

/**
 * DELETE /api/iot/mapping/:id
 * Remove device-to-asset mapping
 * Used by IoT Setup page
 */
router.delete(
    "/mapping/:id",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.DELETE),
    iotDeviceController.deleteMapping
);

/**
 * GET /api/iot/pump-room-summary/:plantId/:deviceId
 * Get comprehensive pump room summary data
 * Includes run hours, last auto-start, notifications, etc.
 */
router.get(
    "/pump-room-summary/:plantId/:deviceId",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    iotDeviceController.getPumpRoomSummary
);

/**
 * GET /api/iot/pump-room-notifications/:plantId/:deviceId
 * Get recent pump room notifications
 */
router.get(
    "/pump-room-notifications/:plantId/:deviceId",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    iotDeviceController.getPumpRoomNotifications
);

/**
 * GET /api/iot/plants-with-pump-room
 * Get all plants that have pump room devices
 */
router.get(
    "/plants-with-pump-room",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    iotDeviceController.getPlantsWithPumpRoom
);

module.exports = router;
