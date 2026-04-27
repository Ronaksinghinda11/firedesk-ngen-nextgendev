/**
 * Calendar Routes (Admin)
 *
 * Routes for calendar and service management for admin users
 * Admin has access to all plants without restrictions
 */

const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar/calendarController');
const serviceSubmissionController = require('../controllers/service-form/serviceSubmissionController');
const auth = require('../middleware/auth');

// All calendar routes require authentication
router.use(auth);

// =================== SERVICE FORM VIEW ROUTES ===================

// View submitted service form with answers
router.get(
    '/services/:serviceId/form-view',
    async (req, res, next) => {
        // Map serviceId to id for the controller
        req.params = { id: req.params.serviceId };
        return serviceSubmissionController.getSubmissionView(req, res, next);
    }
);

// =================== CALENDAR ROUTES ===================

// Combined dashboard (counts + statistics in one call)
router.get('/dashboard', calendarController.getCalendarDashboard);

// Lightweight calendar counts per date (for month grid)
router.get('/counts', calendarController.getCalendarCounts);

// Calendar events (full objects - for day/week detail view)
router.get('/events', calendarController.getCalendarEvents);

// Service statistics
router.get('/statistics', calendarController.getServiceStatistics);

// Services by status
router.get('/services/completed', calendarController.getCompletedServices);
router.get('/services/due', calendarController.getServicesDue);
router.get('/services/lapsed', calendarController.getLapsedServices);
router.get('/services/cancelled', calendarController.getCancelledServices);
router.get('/services/rejected', calendarController.getRejectedServices);
router.get('/services/PENDING-approval', calendarController.getPendingApprovalServices);
router.get('/services/unassigned', calendarController.getUnassignedServices);

module.exports = router;
