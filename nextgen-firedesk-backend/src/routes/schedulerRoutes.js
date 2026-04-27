/**
 * Scheduler Routes
 * Defines all API routes for scheduler module with RBAC protection
 */

const express = require('express');
const router = express.Router();

// Controller
const schedulerController = require('../controllers/scheduler/schedulerController');

// Middleware
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../utils/permission_constants');

// ============================================================================
// SCHEDULER ROUTES
// ============================================================================

// ============================================================================
// STATIC GET ROUTES (MUST BE BEFORE /:id)
// ============================================================================

/**
 * @route   GET /schedulers
 * @desc    Get all schedulers
 * @access  Private - Requires SCHEDULER.READ
 */
router.get('/', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.READ), schedulerController.getAllSchedulers);

/**
 * @route   GET /schedulers/assignment-stats
 * @desc    Get technician assignment statistics
 * @access  Private - Requires SCHEDULER.READ
 */
router.get('/assignment-stats', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.READ), schedulerController.getAssignmentStats);

/**
 * @route   GET /schedulers/cron-status
 * @desc    Get status of all cron schedulers
 * @access  Private - Requires SCHEDULER.READ
 */
router.get('/cron-status', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.READ), schedulerController.getCronStatus);

/**
 * @route   GET /schedulers/plant/:plantId
 * @desc    Get schedulers for a specific plant
 * @access  Private - Requires SCHEDULER.READ
 */
router.get('/plant/:plantId', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.READ), schedulerController.getSchedulersByPlant);

// ============================================================================
// PARAMETERIZED GET ROUTES (/:id MUST BE AFTER STATIC ROUTES)
// ============================================================================

/**
 * @route   GET /schedulers/:id
 * @desc    Get single scheduler by ID
 * @access  Private - Requires SCHEDULER.READ
 */
router.get('/:id', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.READ), schedulerController.getSchedulerById);

/**
 * @route   POST /schedulers
 * @desc    Create a new scheduler (auto-generates services)
 * @access  Private - Requires SCHEDULER.CREATE
 */
router.post('/', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.CREATE), schedulerController.createScheduler);

/**
 * @route   POST /schedulers/bulk
 * @desc    Bulk create/update/delete schedulers for a plant
 * @access  Private - Requires SCHEDULER.UPDATE
 */
router.post('/bulk', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.UPDATE), schedulerController.bulkSaveSchedulers);

/**
 * @route   PUT /schedulers/:id
 * @desc    Update a scheduler (auto-updates services based on changes)
 * @access  Private - Requires SCHEDULER.UPDATE
 */
router.put('/:id', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.UPDATE), schedulerController.updateScheduler);

/**
 * @route   DELETE /schedulers/:id
 * @desc    Delete a scheduler (cancels associated services)
 * @access  Private - Requires SCHEDULER.DELETE
 */
router.delete('/:id', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.DELETE), schedulerController.deleteScheduler);

/**
 * @route   POST /schedulers/:id/generate-services
 * @desc    Manually trigger service generation for a scheduler
 * @access  Private - Requires SCHEDULER.UPDATE
 */
router.post('/:id/generate-services', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.UPDATE), schedulerController.generateServices);

/**
 * @route   POST /schedulers/plant/:plantId/generate-services
 * @desc    Generate services for all schedulers in a plant
 * @access  Private - Requires SCHEDULER.UPDATE
 */
router.post('/plant/:plantId/generate-services', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.UPDATE), schedulerController.generateServicesForPlant);

/**
 * @route   POST /schedulers/auto-assign
 * @desc    Manually trigger technician auto-assignment for upcoming services
 * @access  Private - Requires SCHEDULER.UPDATE
 */
router.post('/auto-assign', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.UPDATE), schedulerController.triggerAutoAssignment);

/**
 * @route   POST /schedulers/services/:serviceId/assign-technician
 * @desc    Manually assign a technician to a specific service
 * @access  Private - Requires SCHEDULER.UPDATE
 */
router.post('/services/:serviceId/assign-technician', auth, requirePermission(ENTITIES.SCHEDULER, ACTIONS.UPDATE), schedulerController.assignTechnicianToService);

module.exports = router;
