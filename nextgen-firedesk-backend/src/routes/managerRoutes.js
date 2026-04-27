/**
 * Manager Routes
 * Routes for ticket management (CRUD, approve, reject) and calendar operations
 */
const express = require('express');
const router = express.Router();

// Middleware
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../utils/permission_constants');
const { managerPlantFilter } = require('../middleware/managerPlantFilter');

// Controllers
const ticketController = require('../controllers/tickets/ticketController');
const managerCalendarController = require('../controllers/calendar/managerCalendarController');
const serviceSubmissionController = require('../controllers/service-form/serviceSubmissionController');

// Apply auth middleware to all routes
router.use(auth);

// =================== SERVICE FORM VIEW ROUTES ===================

// View submitted service form with answers
router.get(
    '/services/:serviceId/form-view',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    async (req, res, next) => {
        // Map serviceId to id for the controller and remove serviceId to pass validation
        req.params = { id: req.params.serviceId };
        return serviceSubmissionController.getSubmissionView(req, res, next);
    }
);

// Get service submission PDF
router.get(
    '/form/submission/:id/pdf',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    async (req, res, next) => {
        return serviceSubmissionController.getSubmissionPDF(req, res, next);
    }
);

// =================== CALENDAR ROUTES ===================

// Combined calendar dashboard (counts + statistics in one call)
router.get(
    '/calendar/dashboard',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getCalendarDashboard
);

// Lightweight calendar counts per date (for month grid)
router.get(
    '/calendar/counts',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getCalendarCounts
);

// Get calendar events for manager's plants (full objects - for day/week detail view)
router.get(
    '/calendar/events',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getCalendarEvents
);

// Get calendar statistics
router.get(
    '/calendar/statistics',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getServiceStatistics
);

// Get services by status
router.get(
    '/calendar/services/completed',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getCompletedServices
);

router.get(
    '/calendar/services/due',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getServicesDue
);

router.get(
    '/calendar/services/lapsed',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getLapsedServices
);

router.get(
    '/calendar/services/cancelled',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getCancelledServices
);

router.get(
    '/calendar/services/rejected',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getRejectedServices
);

router.get(
    '/calendar/services/PENDING-approval',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getPendingApprovalServices
);

router.get(
    '/calendar/services/unassigned',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getUnassignedServices
);

// Get eligible technicians for a service
router.get(
    '/calendar/eligible-technicians/:serviceId',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getEligibleTechnicians
);

// Assign technician to a service
router.put(
    '/calendar/assign-technician/:serviceId',
    requirePermission(ENTITIES.SERVICES, ACTIONS.UPDATE),
    managerCalendarController.assignTechnician
);

// Get all technicians assigned to a service
router.get(
    '/calendar/services/:serviceId/technicians',
    requirePermission(ENTITIES.SERVICES, ACTIONS.READ),
    managerCalendarController.getServiceTechnicians
);

// Unassign a technician from a service
router.delete(
    '/calendar/services/:serviceId/technicians/:technicianId',
    requirePermission(ENTITIES.SERVICES, ACTIONS.UPDATE),
    managerCalendarController.unassignTechnician
);

// Assign all eligible technicians to a service
router.post(
    '/calendar/assign-all-technicians/:serviceId',
    requirePermission(ENTITIES.SERVICES, ACTIONS.UPDATE),
    managerCalendarController.assignAllEligibleTechnicians
);

// Bulk assign technicians for the next week
router.post(
    '/calendar/assign-technicians-weekly',
    requirePermission(ENTITIES.SERVICES, ACTIONS.UPDATE),
    managerCalendarController.assignTechniciansForWeek
);

// Approve a submitted service
router.post(
    '/calendar/approve-service/:serviceId',
    requirePermission(ENTITIES.SERVICES, ACTIONS.UPDATE),
    managerCalendarController.approveService
);

// Approve service (alternative route for form view)
router.post(
    '/services/:serviceId/approve',
    requirePermission(ENTITIES.SERVICES, ACTIONS.UPDATE),
    managerCalendarController.approveService
);

// Reject a submitted service
router.post(
    '/calendar/reject-service/:serviceId',
    requirePermission(ENTITIES.SERVICES, ACTIONS.UPDATE),
    managerCalendarController.rejectService
);

// Reject service (alternative route for form view)
router.post(
    '/services/:serviceId/reject',
    requirePermission(ENTITIES.SERVICES, ACTIONS.UPDATE),
    managerCalendarController.rejectService
);

// Assign technician to a ticket
router.put(
    '/calendar/assign-ticket-technician/:ticketId',
    requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
    managerCalendarController.assignTicketTechnician
);

// =================== TICKET ROUTES ===================

// Get dropdown data for ticket form (plants, categories, technicians)
// Uses managerPlantFilter to restrict plants to manager's assignments
router.get(
    '/tickets/dropdown-data',
    requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
    managerPlantFilter,
    ticketController.getDropdownData
);

// Get assets by plant and category
router.get(
    '/tickets/assets',
    requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
    ticketController.getAssetsByPlantAndCategory
);

// Get all tickets
// Uses managerPlantFilter to restrict tickets to manager's assigned plants
router.get(
    '/tickets',
    requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
    managerPlantFilter,
    ticketController.getTickets
);

// Get single ticket by ID
router.get(
    '/tickets/:id',
    requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
    ticketController.getTicketById
);

// Create new ticket
router.post(
    '/tickets',
    requirePermission(ENTITIES.TICKETS, ACTIONS.CREATE),
    ticketController.createTicket
);

// Update ticket
router.put(
    '/tickets/:id',
    requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
    ticketController.updateTicket
);

// Delete ticket
router.delete(
    '/tickets/:id',
    requirePermission(ENTITIES.TICKETS, ACTIONS.DELETE),
    ticketController.deleteTicket
);

// Approve ticket
router.put(
    '/tickets/:id/approve',
    requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
    ticketController.approveTicket
);

// Reject ticket
router.put(
    '/tickets/:id/reject',
    requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
    ticketController.rejectTicket
);

module.exports = router;
