/**
 * Audit Controller
 * REST API endpoints for audit trail and history
 */

const auditService = require('../../services/audit/audit_service');

/**
 * Get entity-specific history
 * GET /api/audit/entity/:entityType/:entityId
 * 
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - startDate: ISO date
 * - endDate: ISO date
 * - actions: comma-separated string
 * - userId: UUID
 */
const getEntityHistory = async (req, res, next) => {
    try {
        const { entityType, entityId } = req.params;
        const {
            limit = 50,
            offset = 0,
            startDate,
            endDate,
            actions,
            userId
        } = req.query;

        // Parse actions if provided
        const actionArray = actions ? actions.split(',').map(a => a.trim()) : null;

        const result = await auditService.getEntityHistory(entityType, entityId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            actions: actionArray,
            userId
        });

        return res.json({
            success: true,
            ...result
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Get module-level history
 * GET /api/audit/module/:entityType
 * 
 * Query params:
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - startDate: ISO date
 * - endDate: ISO date
 * - actions: comma-separated string
 * - userId: UUID
 */
const getModuleHistory = async (req, res, next) => {
    try {
        const { entityType } = req.params;
        const {
            limit = 100,
            offset = 0,
            startDate,
            endDate,
            actions,
            userId
        } = req.query;

        // Parse actions if provided
        const actionArray = actions ? actions.split(',').map(a => a.trim()) : null;

        const result = await auditService.getModuleHistory(entityType, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            actions: actionArray,
            userId
        });

        return res.json({
            success: true,
            ...result
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Get user activity
 * GET /api/audit/user/:userId
 * 
 * Query params:
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - startDate: ISO date
 * - endDate: ISO date
 * - entityType: string
 */
const getUserActivity = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const {
            limit = 100,
            offset = 0,
            startDate,
            endDate,
            entityType
        } = req.query;

        const result = await auditService.getUserActivity(userId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            entityType
        });

        return res.json({
            success: true,
            ...result
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Get grouped changes for a context
 * GET /api/audit/context/:contextId
 */
const getGroupedChanges = async (req, res, next) => {
    try {
        const { contextId } = req.params;

        const logs = await auditService.getGroupedChanges(contextId);

        return res.json({
            success: true,
            count: logs.length,
            logs
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getEntityHistory,
    getModuleHistory,
    getUserActivity,
    getGroupedChanges
};
