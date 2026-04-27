/**
 * User Management Routes
 * Defines all API routes for user management module
 */
const express = require('express');
const router = express.Router();

// Controllers
const {
    auth_controller,
    password_controller,
    user_controller,
    role_controller,
    permission_controller,
    manager_controller,
    technician_controller
} = require('../../controllers');

// Middleware
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../../utils/permission_constants');
const { managerPlantFilter } = require('../../middleware/managerPlantFilter');

// ============================================================================
// AUTH ROUTES (Public)
// ============================================================================

/**
 * @route   POST /auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
router.post('/auth/login', auth_controller.login);

/**
 * @route   POST /auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post('/auth/signup', auth_controller.signup);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/auth/refresh', auth_controller.refresh);

/**
 * @route   POST /auth/forgot-password
 * @desc    Request password reset OTP
 * @access  Public
 */
router.post('/auth/forgot-password', password_controller.forgot_password);

/**
 * @route   POST /auth/verify-otp
 * @desc    Verify OTP
 * @access  Public
 */
router.post('/auth/verify-otp', password_controller.verify_otp);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post('/auth/reset-password', password_controller.reset_password);

// ============================================================================
// AUTH ROUTES (Protected)
// ============================================================================

/**
 * @route   POST /auth/logout
 * @desc    Logout and invalidate tokens
 * @access  Private
 */
router.post('/auth/logout', auth, auth_controller.logout);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/auth/me', auth, auth_controller.get_profile);

/**
 * @route   POST /auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/auth/change-password', auth, auth_controller.change_password);
router.put('/auth/profile', auth, auth_controller.update_profile);

// ============================================================================
// USER ROUTES
// ============================================================================

router.get('/users', auth, requirePermission(ENTITIES.USERS, ACTIONS.READ), user_controller.get_all);
router.get('/users/:id', auth, requirePermission(ENTITIES.USERS, ACTIONS.READ), user_controller.get_by_id);
router.post('/users', auth, requirePermission(ENTITIES.USERS, ACTIONS.CREATE), user_controller.create);
router.put('/users/:id', auth, requirePermission(ENTITIES.USERS, ACTIONS.UPDATE), user_controller.update);
router.put('/users/:id/role', auth, requirePermission(ENTITIES.USERS, ACTIONS.UPDATE), user_controller.update_role);
router.delete('/users/:id', auth, requirePermission(ENTITIES.USERS, ACTIONS.DELETE), user_controller.delete_user);
router.post('/users/check-phone', auth, user_controller.check_phone);
router.get('/users/:id/avatar', auth, user_controller.get_avatar);
router.post('/users/:id/restore', auth, requirePermission(ENTITIES.USERS, ACTIONS.UPDATE), user_controller.restore);
router.post('/users/bulk-import', auth, requirePermission(ENTITIES.USERS, ACTIONS.CREATE), user_controller.bulk_import);

// ============================================================================
// ROLE ROUTES
// ============================================================================

router.get('/roles', auth, requirePermission(ENTITIES.ROLES, ACTIONS.READ), role_controller.get_all);
router.get('/roles/:id', auth, requirePermission(ENTITIES.ROLES, ACTIONS.READ), role_controller.get_by_id);
router.post('/roles', auth, requirePermission(ENTITIES.ROLES, ACTIONS.CREATE), role_controller.create);
router.put('/roles/:id', auth, requirePermission(ENTITIES.ROLES, ACTIONS.UPDATE), role_controller.update);
router.delete('/roles/:id', auth, requirePermission(ENTITIES.ROLES, ACTIONS.DELETE), role_controller.delete_role);
router.put('/roles/:id/permissions', auth, requirePermission(ENTITIES.ROLES, ACTIONS.UPDATE), role_controller.assign_permissions);

// ============================================================================
// PERMISSION ROUTES
// ============================================================================

router.get('/permissions', auth, requirePermission(ENTITIES.ROLES, ACTIONS.READ), permission_controller.get_all);
router.get('/permissions/grouped', auth, requirePermission(ENTITIES.ROLES, ACTIONS.READ), permission_controller.get_grouped);
router.get('/permissions/constants', auth, permission_controller.get_constants);
router.get('/permissions/role/:role_id', auth, requirePermission(ENTITIES.ROLES, ACTIONS.READ), permission_controller.get_by_role);
router.get('/permissions/:id', auth, requirePermission(ENTITIES.ROLES, ACTIONS.READ), permission_controller.get_by_id);
router.post('/permissions', auth, requirePermission(ENTITIES.ROLES, ACTIONS.CREATE), permission_controller.create);
router.post('/permissions/entity', auth, requirePermission(ENTITIES.ROLES, ACTIONS.CREATE), permission_controller.create_for_entity);
router.post('/permissions/sync', auth, requirePermission(ENTITIES.ROLES, ACTIONS.CREATE), permission_controller.sync_defaults);
router.delete('/permissions/:id', auth, requirePermission(ENTITIES.ROLES, ACTIONS.DELETE), permission_controller.delete_permission);

// ============================================================================
// MANAGER ROUTES
// ============================================================================

router.get('/managers', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.READ), manager_controller.get_all);
router.get('/managers/me/plants', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.READ), manager_controller.get_assigned_plants);
router.get('/managers/:id', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.READ), manager_controller.get_by_id);
router.post('/managers', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.CREATE), manager_controller.create);
router.put('/managers/:id', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.UPDATE), manager_controller.update);
router.put('/managers/:id/status', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.UPDATE), manager_controller.update_status);
router.delete('/managers/:id', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.DELETE), manager_controller.delete_manager);

// ============================================================================
// TECHNICIAN ROUTES (with manager plant filtering for GET operations)
// ============================================================================

router.get('/technicians', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.READ), managerPlantFilter, technician_controller.get_all);
router.get('/technicians/:id', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.READ), technician_controller.get_by_id);
router.post('/technicians', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.CREATE), technician_controller.create);
router.put('/technicians/:id', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.UPDATE), technician_controller.update);
router.post('/technicians/:id/restore', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.UPDATE), technician_controller.restore);
router.delete('/technicians/:id', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.DELETE), technician_controller.delete_technician);

// ============================================================================
// ADMIN PREFIX ROUTES (for frontend compatibility)
// Frontend calls /admin/users instead of /users - these are aliases
// IMPORTANT: These routes MUST have the same RBAC as their non-admin counterparts
// ============================================================================

// Admin Users
router.get('/admin/users', auth, requirePermission(ENTITIES.USERS, ACTIONS.READ), user_controller.get_all);
router.get('/admin/users/:id', auth, requirePermission(ENTITIES.USERS, ACTIONS.READ), user_controller.get_by_id);
router.post('/admin/users', auth, requirePermission(ENTITIES.USERS, ACTIONS.CREATE), user_controller.create);
router.put('/admin/users/:id', auth, requirePermission(ENTITIES.USERS, ACTIONS.UPDATE), user_controller.update);
router.put('/admin/users/:id/role', auth, requirePermission(ENTITIES.USERS, ACTIONS.UPDATE), user_controller.update_role);
router.delete('/admin/users/:id', auth, requirePermission(ENTITIES.USERS, ACTIONS.DELETE), user_controller.delete_user);
router.post('/admin/users/:id/restore', auth, requirePermission(ENTITIES.USERS, ACTIONS.UPDATE), user_controller.restore);

// Frontend Data Update Routes (Compatibility)
router.put('/admin/users/:id/manager-data', auth, requirePermission(ENTITIES.USERS, ACTIONS.UPDATE), user_controller.update_manager_data);
router.put('/admin/users/:id/technician-data', auth, requirePermission(ENTITIES.USERS, ACTIONS.UPDATE), user_controller.update_technician_data);

// Admin Managers
router.get('/admin/managers', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.READ), manager_controller.get_all);
router.get('/admin/managers/:id', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.READ), manager_controller.get_by_id);
router.post('/admin/managers', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.CREATE), manager_controller.create);
router.put('/admin/managers/:id', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.UPDATE), manager_controller.update);
router.delete('/admin/managers/:id', auth, requirePermission(ENTITIES.MANAGERS, ACTIONS.DELETE), manager_controller.delete_manager);

// Admin Technicians
router.get('/admin/technicians', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.READ), technician_controller.get_all);
router.get('/admin/technicians/:id', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.READ), technician_controller.get_by_id);
router.post('/admin/technicians', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.CREATE), technician_controller.create);
router.put('/admin/technicians/:id', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.UPDATE), technician_controller.update);
router.delete('/admin/technicians/:id', auth, requirePermission(ENTITIES.TECHNICIANS, ACTIONS.DELETE), technician_controller.delete_technician);

// Admin Roles
router.get('/admin/roles', auth, requirePermission(ENTITIES.ROLES, ACTIONS.READ), role_controller.get_all);
router.get('/admin/roles/:id', auth, requirePermission(ENTITIES.ROLES, ACTIONS.READ), role_controller.get_by_id);
router.post('/admin/roles', auth, requirePermission(ENTITIES.ROLES, ACTIONS.CREATE), role_controller.create);
router.put('/admin/roles/:id', auth, requirePermission(ENTITIES.ROLES, ACTIONS.UPDATE), role_controller.update);
router.delete('/admin/roles/:id', auth, requirePermission(ENTITIES.ROLES, ACTIONS.DELETE), role_controller.delete_role);

// Admin Permissions
router.get('/admin/permissions', auth, requirePermission(ENTITIES.ROLES, ACTIONS.READ), permission_controller.get_all);
router.get('/admin/permissions/grouped', auth, requirePermission(ENTITIES.ROLES, ACTIONS.READ), permission_controller.get_grouped);

module.exports = router;
