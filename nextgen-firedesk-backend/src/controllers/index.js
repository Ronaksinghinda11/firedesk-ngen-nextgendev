/**
 * Controllers Index
 * Exports all controllers from all modules
 */

// User Management Controllers
const auth_controller = require('./user-management/auth_controller');
const password_controller = require('./user-management/password_controller');
const user_controller = require('./user-management/user_controller');
const role_controller = require('./user-management/role_controller');
const permission_controller = require('./user-management/permission_controller');
const manager_controller = require('./user-management/manager_controller');
const technician_controller = require('./user-management/technician_controller');

module.exports = {
    // User Management
    auth_controller,
    password_controller,
    user_controller,
    role_controller,
    permission_controller,
    manager_controller,
    technician_controller
};
