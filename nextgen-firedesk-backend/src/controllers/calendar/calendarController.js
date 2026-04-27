/**
 * Calendar Controller (Admin)
 * Handles calendar events and service statistics for admin users
 * Admin has access to all plants without restrictions
 */

const calendarService = require('../../services/calendar/calendarService');

const calendarController = {
    /**
     * Get calendar events for all plants (admin view)
     * GET /api/v1/calendar/events
     */
    async getCalendarEvents(req, res, next) {
        try {
            // Admin has access to all plants, so no plantIds filter
            const events = await calendarService.getCalendarEvents(req.query, req.user, null);
            return res.json({
                success: true,
                events
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get service statistics for all plants (admin view)
     * GET /api/v1/calendar/statistics
     */
    async getServiceStatistics(req, res, next) {
        try {
            // Admin has access to all plants
            const stats = await calendarService.getServiceStatistics(req.query, req.user, null);
            return res.json({
                success: true,
                stats
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get completed services (paginated)
     * GET /api/v1/calendar/services/completed
     */
    async getCompletedServices(req, res, next) {
        try {
            const result = await calendarService.getCompletedServices(req.query, req.user, null);
            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get due services (paginated)
     * GET /api/v1/calendar/services/due
     */
    async getServicesDue(req, res, next) {
        try {
            const result = await calendarService.getServicesDue(req.query, req.user, null);
            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get lapsed services (paginated)
     * GET /api/v1/calendar/services/lapsed
     */
    async getLapsedServices(req, res, next) {
        try {
            const result = await calendarService.getLapsedServices(req.query, req.user, null);
            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get cancelled services (paginated)
     * GET /api/v1/calendar/services/cancelled
     */
    async getCancelledServices(req, res, next) {
        try {
            const result = await calendarService.getCancelledServices(req.query, req.user, null);
            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get rejected services (paginated)
     * GET /api/v1/calendar/services/rejected
     */
    async getRejectedServices(req, res, next) {
        try {
            const result = await calendarService.getRejectedServices(req.query, req.user, null);
            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get PENDING approval services (paginated)
     * GET /api/v1/calendar/services/PENDING-approval
     */
    async getPendingApprovalServices(req, res, next) {
        try {
            const result = await calendarService.getPendingApprovalServices(req.query, req.user, null);
            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get unassigned services (paginated)
     * GET /api/v1/calendar/services/unassigned
     */
    async getUnassignedServices(req, res, next) {
        try {
            const result = await calendarService.getUnassignedServices(req.query, null);
            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get combined calendar dashboard (counts + statistics) in one call
     * GET /api/v1/calendar/dashboard
     */
    async getCalendarDashboard(req, res, next) {
        try {
            const result = await calendarService.getCalendarDashboard(req.query, req.user, null);
            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get lightweight calendar counts per date
     * GET /api/v1/calendar/counts
     */
    async getCalendarCounts(req, res, next) {
        try {
            const counts = await calendarService.getCalendarCounts(req.query, null);
            return res.json({
                success: true,
                counts
            });
        } catch (error) {
            return next(error);
        }
    }
};

module.exports = calendarController;
