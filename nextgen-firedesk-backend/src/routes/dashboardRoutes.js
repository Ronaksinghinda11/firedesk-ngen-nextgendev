const express = require('express');
const router = express.Router();
const dashboardAnalyticsController = require('../controllers/dashboard/dashboardAnalyticsController');
const dashboardCountsController = require('../controllers/dashboard/dashboardCountsController');
const serviceReportsController = require('../controllers/reports/serviceReportsController');
const hydroReportsController = require('../controllers/reports/hydroReportsController');
const refillingReportsController = require('../controllers/reports/refillingReportsController');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../utils/permission_constants');
const { managerPlantFilter, validatePlantAccess } = require('../middleware/managerPlantFilter');
const commandCenterController = require('../controllers/dashboard/commandCenterController');
// const managerPlantFilter = require('../middleware/managerPlantFilter');
// const validatePlantAccess = require('../middleware/validatePlantAccess');

// ==================================================================================
// FILTER HELPER ENDPOINTS
// ==================================================================================

router.post(
    "/get-pump-dashboard-data",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getPumpDashboardData
);

router.post(
    "/get-products-by-plant-and-category",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getProductsByPlantAndCategory
);

router.post(
    "/get-types-by-plant-and-category",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getTypesByPlantAndCategory
);

router.post(
    "/get-capacitys-by-plant-and-category",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getCapacitysByPlantAndCategory
);

router.post(
    "/get-categories-by-plant",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getCategoriesByPlant
);

router.post(
    "/get-locations-by-building",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getLocationsByBuilding
);

router.post(
    "/get-subtypes-by-type",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getSubTypesByType
);

router.post(
    "/get-manufacturers-by-category",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getManufacturersByCategory
);

router.post(
    "/get-all-assets-for-filtering",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getAllAssetsForFiltering
);


// ==================================================================================
// MANAGER DASHBOARD SUMMARY (Optimized for scale)
// ==================================================================================

router.get(
    "/manager/summary",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardCountsController.getManagerSummary
);

// ==================================================================================
// PREMIUM DASHBOARD ANALYTICS ENDPOINTS
// ==================================================================================

router.get(
    "/system/health",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getSystemHealth
);

router.get(
    "/tests/hydrostatic",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getHydrostaticTests
);

router.get(
    "/refill/status",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getRefillStatus
);

router.get(
    "/assets/distribution",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getAssetDistribution
);

router.get(
    "/tasks/overview",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getTasksOverview
);

router.get(
    "/maintenance/summary",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getMaintenanceSummary
);

// Separated task endpoints for better performance
router.get(
    "/technician/performance",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getTechnicianPerformance
);

router.get(
    "/tasks/distribution",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getTaskDistribution
);

// ==================================================================================
// PUMP MONITORING ENDPOINTS
// ==================================================================================

// Pump System Overview
router.post(
    "/pump/system-overview",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getPumpSystemOverview
);

// Water Level Trend
router.post(
    "/pump/water-level-trend",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getWaterLevelTrend
);

// Diesel Level Trend
router.post(
    "/pump/diesel-level-trend",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getDieselLevelTrend
);

// Header Pressure Trend
router.post(
    "/pump/header-pressure-trend",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getHeaderPressureTrend
);

// Pump Maintenance Overview
router.post(
    "/pump/maintenance-overview",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'body'),
    dashboardAnalyticsController.getPumpMaintenanceOverviewData
);

// Pump Know More Data
router.post(
    "/pump/know-more",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getPumpKnowMoreData
);

// Pump Mode Status Trend
router.post(
    "/pump/mode-status-trend",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getPumpModeStatusTrend
);

// Pump Condition Log Data
router.post(
    "/pump/condition-log",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getPumpConditionLogData
);

// Pump Runtime Data
router.post(
    "/pump/runtime-data",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getPumpRuntimeData
);

// Pump Auto/Manual Status Data
router.post(
    "/pump/auto-manual-status",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getPumpAutoManualStatusData
);

// Pump Auto/Manual Duration Data
router.post(
    "/pump/auto-manual-duration",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    dashboardAnalyticsController.getPumpAutoManualDurationData
);

// ==================================================================================
// REPORT GENERATION ENDPOINTS
// ==================================================================================

router.get(
    "/reports/service",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    serviceReportsController.downloadReportsPDF
);

router.get(
    "/reports/hp-test",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    hydroReportsController.downloadHydroPDF
);

router.get(
    "/reports/refill",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    refillingReportsController.downloadRefillingPDF
);

// ==================================================================================
// COMMAND CENTER ENDPOINTS
// ==================================================================================

// Plant Command Center — summary card data
router.get(
    "/plant/:plantId/summary",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'params'),
    commandCenterController.getPlantSummary
);

// Plant Command Center — full page data
router.get(
    "/plant/:plantId/command-center",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'params'),
    commandCenterController.getPlantCommandCenter
);

// Regional EHS — facilities summary card data
router.get(
    "/region/:regionId/facilities/summary",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    commandCenterController.getRegionFacilitiesSummary
);

// Regional EHS — full facilities page data
router.get(
    "/regional-ehs/facilities",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    commandCenterController.getRegionalEHSFacilities
);

// Fire Extinguisher — assets grouped by type
router.get(
    "/plant/:plantId/extinguisher-types/:categoryId",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'params'),
    commandCenterController.getExtinguisherTypeBreakdown
);

// Plant Recent Activity — filterable (service, alarms, assets, all)
router.get(
    "/plant/:plantId/recent-activity",
    auth,
    requirePermission(ENTITIES.DASHBOARD, ACTIONS.READ),
    managerPlantFilter,
    validatePlantAccess('plantId', 'params'),
    commandCenterController.getPlantRecentActivity
);

module.exports = router;
