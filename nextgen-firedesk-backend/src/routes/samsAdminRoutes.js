const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../utils/permission_constants');

// Import controllers
const incidentTypeController = require('../controllers/sams/incidentTypeController');
const incidentSubtypeController = require('../controllers/sams/incidentSubtypeController');
const capaStepController = require('../controllers/sams/capaStepController');

/**
 * Admin Routes for SAMS (Safety & Audit Management System)
 * All routes require authentication and appropriate permissions
 * 
 * RBAC: Uses permission-based access control via requirePermission middleware
 * - Incident types/subtypes use INCIDENTS entity permissions
 * - CAPA steps use CAPA_STEPS entity permissions
 */

// ============================================
// INCIDENT TYPE ROUTES
// ============================================

// Create incident type - requires CREATE permission on incidents
router.post(
    '/incident-type',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.CREATE),
    incidentTypeController.create
);

// Get all incident types - requires READ permission on incidents
router.get(
    '/incident-type',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.READ),
    incidentTypeController.getAll
);

// Get incident type by ID - requires READ permission on incidents
router.get(
    '/incident-type/:id',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.READ),
    incidentTypeController.getById
);

// Update incident type - requires UPDATE permission on incidents
router.put(
    '/incident-type/:id',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.UPDATE),
    incidentTypeController.update
);

// Delete incident type - requires DELETE permission on incidents
router.delete(
    '/incident-type/:id',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.DELETE),
    incidentTypeController.delete
);

// Restore incident type - requires UPDATE permission on incidents
router.post(
    '/incident-type/:id/restore',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.UPDATE),
    incidentTypeController.restore
);

// ============================================
// INCIDENT SUBTYPE ROUTES
// ============================================

// Create incident subtype - requires CREATE permission on incidents
router.post(
    '/incident-subtype',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.CREATE),
    incidentSubtypeController.create
);

// Get all incident subtypes - requires READ permission on incidents
router.get(
    '/incident-subtype',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.READ),
    incidentSubtypeController.getAll
);

// Get incident subtype by ID - requires READ permission on incidents
router.get(
    '/incident-subtype/:id',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.READ),
    incidentSubtypeController.getById
);

// Update incident subtype - requires UPDATE permission on incidents
router.put(
    '/incident-subtype/:id',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.UPDATE),
    incidentSubtypeController.update
);

// Delete incident subtype - requires DELETE permission on incidents
router.delete(
    '/incident-subtype/:id',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.DELETE),
    incidentSubtypeController.delete
);

// Restore incident subtype - requires UPDATE permission on incidents
router.post(
    '/incident-subtype/:id/restore',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.UPDATE),
    incidentSubtypeController.restore
);

// ============================================
// CAPA STEP DEFINITION ROUTES
// ============================================

// Create CAPA step - requires CREATE permission on capaSteps
router.post(
    '/capa-step',
    auth,
    requirePermission(ENTITIES.CAPA_STEPS, ACTIONS.CREATE),
    capaStepController.create
);

// Get all CAPA steps - requires READ permission on capaSteps
router.get(
    '/capa-step',
    auth,
    requirePermission(ENTITIES.CAPA_STEPS, ACTIONS.READ),
    capaStepController.getAll
);

// Get CAPA step by ID - requires READ permission on capaSteps
router.get(
    '/capa-step/:id',
    auth,
    requirePermission(ENTITIES.CAPA_STEPS, ACTIONS.READ),
    capaStepController.getById
);

// Update CAPA step - requires UPDATE permission on capaSteps
router.put(
    '/capa-step/:id',
    auth,
    requirePermission(ENTITIES.CAPA_STEPS, ACTIONS.UPDATE),
    capaStepController.update
);

// Delete CAPA step - requires DELETE permission on capaSteps
router.delete(
    '/capa-step/:id',
    auth,
    requirePermission(ENTITIES.CAPA_STEPS, ACTIONS.DELETE),
    capaStepController.delete
);

// Restore CAPA step - requires UPDATE permission on capaSteps
router.post(
    '/capa-step/:id/restore',
    auth,
    requirePermission(ENTITIES.CAPA_STEPS, ACTIONS.UPDATE),
    capaStepController.restore
);

// Reorder CAPA steps - requires UPDATE permission on capaSteps
router.put(
    '/capa-step-reorder',
    auth,
    requirePermission(ENTITIES.CAPA_STEPS, ACTIONS.UPDATE),
    capaStepController.reorder
);

module.exports = router;
