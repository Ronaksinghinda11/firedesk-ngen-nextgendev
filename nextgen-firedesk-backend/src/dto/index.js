/**
 * DTOs Index
 * Exports all DTOs from all modules
 */

// User Management DTOs
const UserDTO = require('./user-management/user_dto');
const ManagerDTO = require('./user-management/manager_dto');
const TechnicianDTO = require('./user-management/technician_dto');

module.exports = {
    // User Management
    UserDTO,
    ManagerDTO,
    TechnicianDTO
};
