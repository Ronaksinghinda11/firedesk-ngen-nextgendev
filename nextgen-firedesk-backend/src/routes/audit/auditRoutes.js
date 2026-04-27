/**
 * Audit Routes
 * API routes for audit trail and history
 * 
 * All routes require authentication
 * Permissions can be added later if needed
 */

const express = require('express');
const router = express.Router();
const auditController = require('../../controllers/audit/audit_controller');
const auth = require('../../middleware/auth');

/**
 * @route   GET /api/audit/entity/:entityType/:entityId
 * @desc    Get history for a specific entity
 * @access  Private
 * @query   limit, offset, startDate, endDate, actions, userId
 */
router.get('/entity/:entityType/:entityId', auth, auditController.getEntityHistory);

/**
 * @route   GET /api/audit/module/:entityType
 * @desc    Get history for all entities of a type (module-level)
 * @access  Private
 * @query   limit, offset, startDate, endDate, actions, userId
 */
router.get('/module/:entityType', auth, auditController.getModuleHistory);

/**
 * @route   GET /api/audit/user/:userId
 * @desc    Get activity for a specific user
 * @access  Private
 * @query   limit, offset, startDate, endDate, entityType
 */
router.get('/user/:userId', auth, auditController.getUserActivity);

/**
 * @route   GET /api/audit/context/:contextId
 * @desc    Get grouped changes for a context
 * @access  Private
 */
router.get('/context/:contextId', auth, auditController.getGroupedChanges);

module.exports = router;
