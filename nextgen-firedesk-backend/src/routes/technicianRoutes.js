/**
 * Technician Routes
 * Routes for technician-specific operations
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const technicianController = require('../controllers/technician');

// ============================================
// AUTHENTICATION (No auth middleware needed for login)
// ============================================
router.post('/registerCheck', technicianController.register_check);
router.post('/login', technicianController.login);
router.post('/logout', auth, technicianController.logout);
router.put('/deactive-account/:technicianUserId', auth, technicianController.deactivate_account);

// ============================================
// PROFILE & ASSIGNMENTS
// ============================================
router.get('/my-assigned-plant', auth, technicianController.get_my_assigned_plant);
router.get('/my-category-assets', auth, technicianController.get_my_category_assets);

// ============================================
// SERVICES - My assigned services
// ============================================
router.get('/my-services', auth, technicianController.get_my_assigned_services);
router.get('/my-services/due', auth, technicianController.get_services_due);
router.get('/my-services/upcoming', auth, technicianController.get_upcoming_services);
router.get('/my-services/lapsed', auth, technicianController.get_lapsed_services);
router.get('/my-services/completed', auth, technicianController.get_completed_services);
router.get('/my-services/rejected', auth, technicianController.get_rejected_services);
router.get('/my-services/:id', auth, technicianController.get_service_by_id);

// ============================================
// QR CODE VERIFICATION
// ============================================
router.get('/services/by-asset/:assetId', auth, technicianController.get_services_by_asset);
router.post('/services/:serviceId/verify-qr', auth, technicianController.verify_qr_code);
router.post('/services/:serviceId/request-override', auth, technicianController.request_override);
router.get('/services/:serviceId/override-status', auth, technicianController.get_override_status);

// ============================================
// SERVICE FORMS
// ============================================
router.get('/services/:serviceId/form', auth, technicianController.get_service_form);
router.post('/services/:serviceId/submit', auth, technicianController.submit_service_form);
router.patch('/services/:serviceId/start', auth, technicianController.start_service);

// ============================================
// ASSETS
// ============================================
router.get('/my-assets', auth, technicianController.get_my_assets);
router.post('/asset-detail/:assetId', auth, technicianController.get_asset_by_id);
router.get('/get-assets-details-by-scanner-id/:id', auth, technicianController.get_assets_by_scanner_id);
router.put('/update-location', auth, technicianController.update_location);

// ============================================
// INCIDENTS (Auto-created from geolocation)
// ============================================
router.post('/displacement-incident', auth, technicianController.create_displacement_incident);

// ============================================
// TICKETS
// ============================================
router.get('/my-assigned-tickets', auth, technicianController.get_my_tickets); // Alias for frontend
router.get('/tickets', auth, technicianController.get_my_tickets);
router.get('/tickets/:id', auth, technicianController.get_ticket_by_id);
router.patch('/tickets/:id/start', auth, technicianController.start_ticket);
router.post('/tickets/:id/submit', auth, technicianController.submit_ticket);
router.post('/tickets/:id/comments', auth, technicianController.add_comment);

// ============================================
// CALENDAR
// ============================================
router.get('/calendar/events', auth, technicianController.get_calendar_events);
router.get('/calendar/statistics', auth, technicianController.get_statistics);

// ============================================
// PERFORMANCE REPORTS
// ============================================
router.get('/performance-report/plants', auth, technicianController.get_my_plants);
router.get('/performance-report/data', auth, technicianController.get_report_data);
router.post('/performance-report/pdf', auth, technicianController.generate_performance_report);

module.exports = router;
