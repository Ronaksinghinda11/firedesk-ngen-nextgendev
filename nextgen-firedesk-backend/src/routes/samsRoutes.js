const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../utils/permission_constants');

// Import controller
const incidentController = require('../controllers/sams/incidentController');
const incidentTypeController = require('../controllers/sams/incidentTypeController');
const incidentSubtypeController = require('../controllers/sams/incidentSubtypeController');
const capaStepController = require('../controllers/sams/capaStepController');

/**
 * Incident Management Routes
 * Main routes for incident CRUD and workflow
 * 
 * RBAC: Uses permission-based access control via requirePermission middleware
 */

// ============================================
// LOOKUP ROUTES (for form dropdowns - any authenticated user)
// ============================================

// Get all active incident types - for dropdowns
router.get(
    '/lookup/incident-type',
    auth,
    incidentTypeController.getAll
);

// Get all active incident subtypes - for dropdowns
router.get(
    '/lookup/incident-subtype',
    auth,
    incidentSubtypeController.getAll
);

// Get all active CAPA steps - for reference
router.get(
    '/lookup/capa-step',
    auth,
    capaStepController.getAll
);

// ============================================
// INCIDENT CRUD ROUTES
// ============================================

// Create incident - requires CREATE permission on incidents
router.post(
    '/incident',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.CREATE),
    incidentController.create
);

// Create displacement incident (from mobile app)
router.post(
    '/displacement-incident',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.CREATE),
    incidentController.createDisplacementIncident
);

// Get all incidents - requires READ permission on incidents
router.get(
    '/incident',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.READ),
    incidentController.getAll
);

// Get my incidents - requires READ permission on incidents
router.get(
    '/my-incidents',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.READ),
    incidentController.getMyIncidents
);

// Get incident by ID - requires READ permission on incidents
router.get(
    '/incident/:id',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.READ),
    incidentController.getById
);

// Update incident - requires UPDATE permission on incidents
router.put(
    '/incident/:id',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.UPDATE),
    incidentController.update
);

// Delete incident - requires DELETE permission on incidents
router.delete(
    '/incident/:id',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.DELETE),
    incidentController.delete
);

// Restore incident - requires UPDATE permission on incidents (re-activating is akin to update)
router.post(
    '/incident/:id/restore',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.UPDATE),
    incidentController.restore
);

// ============================================
// TEAM ASSIGNMENT ROUTES
// ============================================

// Get available team members - requires ASSIGN permission on incidents
router.get(
    '/incident/:id/available-members',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.ASSIGN),
    incidentController.getAvailableMembers
);

// Assign team to incident - requires ASSIGN permission on incidents
router.post(
    '/incident/:id/assign-team',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.ASSIGN),
    incidentController.assignTeam
);

// ============================================
// CAPA WORKFLOW ROUTES
// ============================================

// Submit CAPA step response - requires UPDATE permission on capaSteps
router.put(
    '/incident/:id/capa-step/:stepId/submit',
    auth,
    requirePermission(ENTITIES.CAPA_STEPS, ACTIONS.UPDATE),
    incidentController.submitCapaStep
);

// Review (approve/reject) CAPA step - requires UPDATE permission on capaSteps
router.put(
    '/incident/:id/capa-step/:stepId/review',
    auth,
    requirePermission(ENTITIES.CAPA_STEPS, ACTIONS.UPDATE),
    incidentController.reviewCapaStep
);

// ============================================
// TIMELINE ROUTE
// ============================================

// Get incident timeline/activity - requires READ permission on incidents
router.get(
    '/incident/:id/timeline',
    auth,
    requirePermission(ENTITIES.INCIDENTS, ACTIONS.READ),
    incidentController.getTimeline
);

// ============================================
// USER ROUTES
// ============================================

// Check if current user is a team leader for any incident
router.get(
    '/user/is-team-leader',
    auth,
    incidentController.isTeamLeader
);

// Get incidents assigned to me (as team member)
router.get(
    '/technician/my-assigned-incidents',
    auth,
    incidentController.getMyAssignedIncidents
);

module.exports = router;
