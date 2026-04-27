/**
 * Services Index
 * Exports all services from all modules
 */

// User Management Services
const auth_service = require('./user-management/auth_service');
const password_service = require('./user-management/password_service');
const user_service = require('./user-management/user_service');
const role_service = require('./user-management/role_service');
const permission_service = require('./user-management/permission_service');
const manager_service = require('./user-management/manager_service');
const technician_service = require('./user-management/technician_service');

// Shared Services
const jwt_service = require('./jwt_service');
const email_service = require('./email_service');

module.exports = {
    // User Management
    auth_service,
    password_service,
    user_service,
    role_service,
    permission_service,
    manager_service,
    technician_service,

    // Shared
    jwt_service,
    email_service
};
