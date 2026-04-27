/**
 * Audit Service
 * Core service for logging and retrieving audit trail data
 * 
 * Usage Example:
 * 
 * const auditService = require('../services/audit/audit_service');
 * 
 * await auditService.log({
 *     entityType: 'asset',
 *     entityId: asset.id,
 *     entityName: asset.asset_code,
 *     action: 'CREATE',
 *     user: { id: user.id, name: user.name, type: 'admin' },
 *     source: 'ui',
 *     metadata: { reason: 'Initial setup' }
 * });
 */

const { v4: uuidv4 } = require('uuid');
const { AuditLog } = require('../../models/audit');
const { Op } = require('sequelize');

class AuditService {
    /**
     * Log an audit event
     * 
     * @param {Object} options
     * @param {string} options.entityType - 'asset', 'plant', 'user', etc.
     * @param {string} options.entityId - UUID of entity (can be null for deleted)
     * @param {string} options.entityName - Human-readable entity name
     * @param {string} options.action - 'CREATE', 'UPDATE', 'DELETE', etc.
     * @param {Object} options.changes - { field: { old, new, old_display, new_display } }
     * @param {string} options.fieldName - For simple cases (STATUS_CHANGE, ASSIGN)
     * @param {string} options.oldValue - Previous value (simple cases)
     * @param {string} options.newValue - New value (simple cases)
     * @param {Object} options.user - { id, name, type }
     * @param {string} options.source - 'ui' | 'api' | 'scheduler' | 'system' | 'import'
     * @param {string} options.contextId - Group related changes (optional)
     * @param {Object} options.relatedEntity - { type, id, name } (for ASSIGN, etc.)
     * @param {Object} options.metadata - Additional context { reason, notes, etc. }
     * @param {string} options.ipAddress - IP address (optional)
     * @param {string} options.userAgent - User agent (optional)
     * @param {string} options.requestId - Request ID for tracing (optional)
     * 
     * @returns {Promise<AuditLog|null>} Created audit log or null if error
     */
    async log({
        entityType,
        entityId = null,
        entityName = null,
        action,
        changes = null,
        fieldName = null,
        oldValue = null,
        newValue = null,
        oldValueDisplay = null,
        newValueDisplay = null,
        user = null,
        source = 'ui',
        contextId = null,
        relatedEntity = null,
        metadata = null,
        ipAddress = null,
        userAgent = null,
        requestId = null
    }) {
        try {
            // Generate context_id if not provided
            const finalContextId = contextId || uuidv4();

            // Generate action description
            const actionDescription = this._generateDescription(action, entityName, changes, fieldName, source);

            // Create audit log
            const auditLog = await AuditLog.create({
                entity_type: entityType,
                entity_id: entityId,
                entity_name: entityName,
                action,
                action_description: actionDescription,
                user_id: user?.id || null,
                user_name: user?.name || 'System',
                user_type: user?.type || 'system',
                changes,
                field_name: fieldName,
                old_value: oldValue,
                new_value: newValue,
                old_value_display: oldValueDisplay,
                new_value_display: newValueDisplay,
                context_id: finalContextId,
                source,
                related_entity_type: relatedEntity?.type || null,
                related_entity_id: relatedEntity?.id || null,
                related_entity_name: relatedEntity?.name || null,
                metadata,
                ip_address: ipAddress,
                user_agent: userAgent,
                request_id: requestId
            });

            return auditLog;

        } catch (error) {
            console.error('❌ Audit log failed:', error.message);
            // CRITICAL: Never throw - audit failure should not break app
            return null;
        }
    }

    /**
     * Log bulk operations (single context_id)
     * 
     * @param {Array} items - Array of log options
     * @param {Object} commonContext - Common fields (user, source, etc.)
     * @returns {Promise<Array>} Results of all log attempts
     */
    async logBulk(items, commonContext = {}) {
        const contextId = uuidv4();

        const promises = items.map(item =>
            this.log({
                ...item,
                ...commonContext,
                contextId
            })
        );

        return Promise.allSettled(promises);
    }

    /**
     * Get entity-specific history
     * 
     * @param {string} entityType - Type of entity
     * @param {string} entityId - UUID of entity
     * @param {Object} options
     * @param {number} options.limit - Max records (default: 50)
     * @param {number} options.offset - Offset for pagination (default: 0)
     * @param {Date} options.startDate - Filter by start date
     * @param {Date} options.endDate - Filter by end date
     * @param {Array<string>} options.actions - Filter by actions
     * @param {string} options.userId - Filter by user
     * 
     * @returns {Promise<Object>} { rows, count }
     */
    async getEntityHistory(entityType, entityId, options = {}) {
        const {
            limit = 50,
            offset = 0,
            startDate = null,
            endDate = null,
            actions = null,
            userId = null
        } = options;

        const where = {
            entity_type: entityType,
            entity_id: entityId
        };

        // Date filters
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) where.created_at[Op.gte] = startDate;
            if (endDate) where.created_at[Op.lte] = endDate;
        }

        // Action filter
        if (actions && Array.isArray(actions) && actions.length > 0) {
            where.action = { [Op.in]: actions };
        }

        // User filter
        if (userId) {
            where.user_id = userId;
        }

        const result = await AuditLog.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        return {
            rows: result.rows,
            count: result.count,
            limit,
            offset,
            hasMore: (offset + limit) < result.count
        };
    }

    /**
     * Get module-level history (all entities of a type)
     * 
     * @param {string} entityType - Type of entity
     * @param {Object} options
     * @param {number} options.limit - Max records (default: 100)
     * @param {number} options.offset - Offset for pagination
     * @param {Date} options.startDate - Filter by start date
     * @param {Date} options.endDate - Filter by end date
     * @param {string} options.userId - Filter by user
     * @param {Array<string>} options.actions - Filter by actions
     * 
     * @returns {Promise<Object>} { rows, count }
     */
    async getModuleHistory(entityType, options = {}) {
        const {
            limit = 100,
            offset = 0,
            startDate = null,
            endDate = null,
            userId = null,
            actions = null
        } = options;

        const where = { entity_type: entityType };

        // Date filters (IMPORTANT for performance - limits partition scan)
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) where.created_at[Op.gte] = startDate;
            if (endDate) where.created_at[Op.lte] = endDate;
        } else {
            // Default: Last 30 days to avoid scanning old partitions
            where.created_at = {
                [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            };
        }

        // User filter
        if (userId) {
            where.user_id = userId;
        }

        // Action filter
        if (actions && Array.isArray(actions) && actions.length > 0) {
            where.action = { [Op.in]: actions };
        }

        const result = await AuditLog.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        return {
            rows: result.rows,
            count: result.count,
            limit,
            offset,
            hasMore: (offset + limit) < result.count
        };
    }

    /**
     * Get user activity
     * 
     * @param {string} userId - User UUID
     * @param {Object} options
     * @param {number} options.limit - Max records (default: 100)
     * @param {number} options.offset - Offset for pagination
     * @param {Date} options.startDate - Filter by start date
     * @param {Date} options.endDate - Filter by end date
     * @param {string} options.entityType - Filter by entity type
     * 
     * @returns {Promise<Object>} { rows, count }
     */
    async getUserActivity(userId, options = {}) {
        const {
            limit = 100,
            offset = 0,
            startDate = null,
            endDate = null,
            entityType = null
        } = options;

        const where = { user_id: userId };

        // Date filters
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) where.created_at[Op.gte] = startDate;
            if (endDate) where.created_at[Op.lte] = endDate;
        } else {
            // Default: Last 30 days
            where.created_at = {
                [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            };
        }

        // Entity type filter
        if (entityType) {
            where.entity_type = entityType;
        }

        const result = await AuditLog.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        return {
            rows: result.rows,
            count: result.count,
            limit,
            offset,
            hasMore: (offset + limit) < result.count
        };
    }

    /**
     * Get grouped changes by context_id
     * Useful for displaying "single save action" as one timeline entry
     * 
     * @param {string} contextId - Context UUID
     * @returns {Promise<Array<AuditLog>>}
     */
    async getGroupedChanges(contextId) {
        const logs = await AuditLog.findAll({
            where: { context_id: contextId },
            order: [['created_at', 'ASC']]
        });

        return logs;
    }

    /**
     * Generate human-readable action description
     * 
     * @private
     * @param {string} action - Action type
     * @param {string} entityName - Entity name
     * @param {Object} changes - Changes object
     * @param {string} fieldName - Field name (for simple cases)
     * @returns {string}
     */
    _generateDescription(action, entityName, changes, fieldName, source) {
        const actionLabels = {
            CREATE: 'created',
            UPDATE: 'updated',
            DELETE: 'deleted',
            RESTORE: 'restored',
            ARCHIVE: 'archived',
            ASSIGN: 'assigned',
            UNASSIGN: 'unassigned',
            APPROVE: 'approved',
            REJECT: 'rejected',
            SUBMIT: 'submitted',
            CANCEL: 'cancelled',
            COMPLETE: 'completed',
            STATUS_CHANGE: 'changed status of',
            BULK_UPDATE: 'bulk updated',
            IMPORT: 'imported'
        };

        let verb = actionLabels[action] || action.toLowerCase();
        // When source is 'import', show as 'Created (Import)' / 'Updated (Import)'
        if (source === 'import' && (action === 'CREATE' || action === 'UPDATE')) {
            const capitalVerb = verb.charAt(0).toUpperCase() + verb.slice(1);
            verb = `${capitalVerb} (Import)`;
        }
        const name = entityName || 'item';

        // If changes object exists, add field count
        if (changes && typeof changes === 'object') {
            const changeCount = Object.keys(changes).length;
            return changeCount > 0
                ? `${verb} ${name} (${changeCount} field${changeCount > 1 ? 's' : ''})`
                : `${verb} ${name}`;
        }

        // If fieldName exists, mention it
        if (fieldName) {
            return `${verb} ${name} (${fieldName})`;
        }

        return `${verb} ${name}`;
    }

    /**
     * Helper: Calculate changes between old and new objects
     * Useful in service update methods
     * 
     * @param {Object} oldData - Previous data
     * @param {Object} newData - New data
     * @param {Array<string>} excludeFields - Fields to ignore (default: timestamps)
     * @returns {Object} Changes object { field: { old, new } }
     */
    calculateChanges(oldData, newData, excludeFields = ['created_at', 'updated_at', 'id']) {
        const changes = {};

        for (const [key, newVal] of Object.entries(newData)) {
            if (excludeFields.includes(key)) continue;

            const oldVal = oldData[key];

            // Skip if values are the same
            if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

            changes[key] = {
                old: oldVal,
                new: newVal
            };
        }

        return Object.keys(changes).length > 0 ? changes : null;
    }
}

// Export singleton instance
module.exports = new AuditService();
