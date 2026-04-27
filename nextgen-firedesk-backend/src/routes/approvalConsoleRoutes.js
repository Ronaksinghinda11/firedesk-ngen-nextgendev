/**
 * Approval Console Routes
 * Routes for the Service Approval Console
 */
const express = require('express');
const router = express.Router();

// Middleware
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../utils/permission_constants');

// Controller
const approvalConsoleController = require('../controllers/approval/approvalConsoleController');

// Apply auth middleware to all routes
router.use(auth);

// =================== APPROVAL CONSOLE ROUTES ===================

// GET  /api/manager/approval-console              — Main approval queue (table data)
router.get(
    '/',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    approvalConsoleController.getApprovalQueue
);

// GET  /api/manager/approval-console/kpis         — KPI summary strip
router.get(
    '/kpis',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    approvalConsoleController.getKPIs
);

// GET  /api/manager/approval-console/filter-data  — Dropdown filter options
router.get(
    '/filter-data',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    approvalConsoleController.getFilterDropdownData
);

// GET  /api/manager/approval-console/alerts       — Right-side alert panel data
router.get(
    '/alerts',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    approvalConsoleController.getAlerts
);

// GET  /api/manager/approval-console/submissions/:id/details — Inline expansion details
router.get(
    '/submissions/:id/details',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    approvalConsoleController.getSubmissionDetails
);

// POST /api/manager/approval-console/bulk-approve — Bulk approve
router.post(
    '/bulk-approve',
    requirePermission(ENTITIES.SERVICES, ACTIONS.UPDATE),
    approvalConsoleController.bulkApprove
);

// POST /api/manager/approval-console/bulk-reject  — Bulk reject
router.post(
    '/bulk-reject',
    requirePermission(ENTITIES.SERVICES, ACTIONS.UPDATE),
    approvalConsoleController.bulkReject
);

module.exports = router;
