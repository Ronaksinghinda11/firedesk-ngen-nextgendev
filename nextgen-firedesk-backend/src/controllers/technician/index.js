/**
 * Technician Controller Index
 * Exports all technician-related controllers
 */

const technician_services_controller = require('./technician_services_controller');
const technician_qr_controller = require('./technician_qr_controller');
const technician_assets_controller = require('./technician_assets_controller');
const technician_tickets_controller = require('./technician_tickets_controller');
const technician_calendar_controller = require('./technician_calendar_controller');
const technician_performance_controller = require('./technician_performance_controller');
const technician_service_form_controller = require('./technician_service_form_controller');
const technician_auth_controller = require('./technician_auth_controller');

module.exports = {
    // Authentication
    ...technician_auth_controller,

    // Services
    ...technician_services_controller,

    // QR Verification
    ...technician_qr_controller,

    // Assets
    ...technician_assets_controller,

    // Tickets
    ...technician_tickets_controller,

    // Calendar
    ...technician_calendar_controller,

    // Performance Reports
    ...technician_performance_controller,

    // Service Forms
    ...technician_service_form_controller
};
