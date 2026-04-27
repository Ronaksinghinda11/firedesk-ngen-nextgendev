const ConditionMaster = require('../../models/master-data/ConditionMaster');
const { Op } = require('sequelize');
const { generateCode, ensureUniqueCode } = require('../../utils/codeGenerator');
const auditService = require('../../services/audit/audit_service');

class ConditionService {
    /**
     * Get all conditions with optional filtering
     */
    async getAllConditions(filters = {}) {
        const { is_active, severity_level, health_impact, search, page = 1, limit = 50 } = filters;

        const whereClause = {};

        if (is_active !== undefined) {
            whereClause.is_active = is_active;
        }

        if (severity_level) {
            whereClause.severity_level = severity_level;
        }

        if (health_impact) {
            whereClause.health_impact = health_impact;
        }

        if (search) {
            whereClause[Op.or] = [
                { condition_name: { [Op.iLike]: `%${search}%` } },
                { condition_code: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await ConditionMaster.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['priority_score', 'DESC'], ['condition_name', 'ASC']]
        });

        return {
            conditions: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get active conditions
     */
    async getActiveConditions() {
        const conditions = await ConditionMaster.findAll({
            where: { is_active: true },
            order: [['priority_score', 'DESC'], ['condition_name', 'ASC']]
        });

        return conditions;
    }

    /**
     * Get condition by ID
     */
    async getConditionById(conditionId) {
        const condition = await ConditionMaster.findByPk(conditionId);

        if (!condition) {
            throw new Error('Condition not found');
        }

        return condition;
    }

    /**
     * Get conditions by severity
     */
    async getConditionsBySeverity(severityLevel) {
        const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
        if (!validSeverities.includes(severityLevel.toUpperCase())) {
            throw new Error('Invalid severity level');
        }

        const conditions = await ConditionMaster.findAll({
            where: {
                severity_level: severityLevel.toUpperCase(),
                is_active: true
            },
            order: [['priority_score', 'DESC']]
        });

        return conditions;
    }

    /**
     * Create condition
     */
    async createCondition(conditionData, user, source = 'ui') {
        const {
            condition_name,
            condition_code,
            severity_level,
            priority_score,
            health_impact,
            recommended_action,
            requires_immediate_action,
            is_active,
            created_by
        } = conditionData;

        // Auto-generate condition code if not provided
        let finalConditionCode = condition_code ? condition_code.toUpperCase() : null;
        if (!finalConditionCode) {
            const baseCode = generateCode(condition_name);
            finalConditionCode = await ensureUniqueCode(baseCode, async (code) => {
                const existing = await ConditionMaster.findOne({
                    where: { condition_code: { [Op.iLike]: code } }
                });
                return !!existing;
            });
        } else {
            // Check if manually provided code already exists (Case Insensitive)
            const existing = await ConditionMaster.findOne({
                where: { condition_code: { [Op.iLike]: finalConditionCode } }
            });

            if (existing) {
                throw new Error('Condition with this code already exists');
            }
        }

        const condition = await ConditionMaster.create({
            condition_code: finalConditionCode,
            condition_name,
            severity_level: severity_level || 'MEDIUM',
            priority_score,
            health_impact,
            recommended_action,
            requires_immediate_action: requires_immediate_action || false,
            is_active: is_active !== undefined ? is_active : true,
            created_by
        });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'condition',
                entityId: condition.id,
                entityName: condition.condition_name,
                action: 'CREATE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source
            });
        } catch (error) {
            console.error('Audit log failed for createCondition:', error.message);
        }

        return condition;
    }

    /**
     * Update condition
     */
    async updateCondition(conditionId, conditionData, user, source = 'ui') {
        const condition = await ConditionMaster.findByPk(conditionId);

        if (!condition) {
            throw new Error('Condition not found');
        }

        const oldValues = condition.toJSON();

        const {
            condition_name,
            condition_code,
            severity_level,
            priority_score,
            health_impact,
            recommended_action,
            requires_immediate_action,
            is_active
        } = conditionData;

        // Check if condition code is being changed and if it conflicts
        if (condition_code && condition_code.toUpperCase() !== condition.condition_code) {
            const existing = await ConditionMaster.findOne({
                where: {
                    condition_code: { [Op.iLike]: condition_code },
                    id: { [Op.ne]: conditionId }
                }
            });

            if (existing) {
                throw new Error('Condition code already exists');
            }
        }

        // If name changed but code not provided, auto-generate new code
        if (condition_name && condition_name !== condition.condition_name && !condition_code) {
            const baseCode = generateCode(condition_name);
            const new_condition_code = await ensureUniqueCode(baseCode, async (code) => {
                const existing = await ConditionMaster.findOne({
                    where: {
                        condition_code: { [Op.iLike]: code },
                        id: { [Op.ne]: conditionId }
                    }
                });
                return !!existing;
            });

            await condition.update({
                condition_name,
                condition_code: new_condition_code,
                severity_level: severity_level !== undefined ? severity_level : condition.severity_level,
                priority_score: priority_score !== undefined ? priority_score : condition.priority_score,
                health_impact: health_impact !== undefined ? health_impact : condition.health_impact,
                recommended_action: recommended_action !== undefined ? recommended_action : condition.recommended_action,
                requires_immediate_action: requires_immediate_action !== undefined ? requires_immediate_action : condition.requires_immediate_action,
                is_active: is_active !== undefined ? is_active : condition.is_active
            });
        } else {
            await condition.update({
                condition_name: condition_name !== undefined ? condition_name : condition.condition_name,
                condition_code: condition_code !== undefined ? condition_code.toUpperCase() : condition.condition_code,
                severity_level: severity_level !== undefined ? severity_level : condition.severity_level,
                priority_score: priority_score !== undefined ? priority_score : condition.priority_score,
                health_impact: health_impact !== undefined ? health_impact : condition.health_impact,
                recommended_action: recommended_action !== undefined ? recommended_action : condition.recommended_action,
                requires_immediate_action: requires_immediate_action !== undefined ? requires_immediate_action : condition.requires_immediate_action,
                is_active: is_active !== undefined ? is_active : condition.is_active
            });
        }

        // Audit Log
        try {
            const changes = auditService.calculateChanges(oldValues, condition.toJSON());
            if (changes) {
                await auditService.log({
                    entityType: 'condition',
                    entityId: conditionId,
                    entityName: condition.condition_name,
                    action: 'UPDATE',
                    changes,
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source
                });
            }
        } catch (error) {
            console.error('Audit log failed for updateCondition:', error.message);
        }

        return condition;
    }

    /**
     * Delete condition (soft delete)
     */
    async deleteCondition(conditionId, user) {
        const condition = await ConditionMaster.findByPk(conditionId);

        if (!condition) {
            throw new Error('Condition not found');
        }

        // Capture old value for audit
        const oldValue = condition.is_active;

        // Soft delete by setting is_active to false
        await condition.update({ is_active: false });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'condition',
                entityId: conditionId,
                entityName: condition.condition_name,
                action: 'ARCHIVE',
                changes: { is_active: { old: oldValue, new: false } },
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for deleteCondition:', error.message);
        }

        return { message: 'Condition archived successfully' };
    }

    /**
     * Permanent Delete condition
     */
    async hardDeleteCondition(conditionId, user) {
        const condition = await ConditionMaster.findByPk(conditionId);

        if (!condition) {
            throw new Error('Condition not found');
        }

        // Capture name before delete for audit
        const conditionName = condition.condition_name;

        // Hard delete
        await condition.destroy();

        // Audit Log
        try {
            await auditService.log({
                entityType: 'condition',
                entityId: conditionId,
                entityName: conditionName,
                action: 'DELETE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for hardDeleteCondition:', error.message);
        }

        return { message: 'Condition permanently deleted successfully' };
    }

    /**
     * Restore condition (reactivate)
     */
    async restoreCondition(conditionId, user) {
        const condition = await ConditionMaster.findByPk(conditionId);

        if (!condition) {
            throw new Error('Condition not found');
        }

        // Restore by setting is_active to true
        await condition.update({ is_active: true });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'condition',
                entityId: conditionId,
                entityName: condition.condition_name,
                action: 'RESTORE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for restoreCondition:', error.message);
        }

        return { message: 'Condition restored successfully' };
    }


    /**
     * Bulk create conditions
     */
    async bulkCreateConditions(conditions, user) {
        const results = {
            success: [],
            errors: []
        };

        for (let i = 0; i < conditions.length; i++) {
            const conditionData = conditions[i];
            try {
                const condition = await this.createCondition(conditionData, user);
                results.success.push({
                    index: i,
                    condition_name: condition.condition_name,
                    id: condition.id
                });
            } catch (error) {
                results.errors.push({
                    index: i,
                    condition_name: conditionData.condition_name || 'Unknown',
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Bulk import conditions from raw records (with upsert by condition_code)
     * If condition_code is provided and matches existing, updates that condition.
     * Otherwise, creates a new condition.
     * @param {Array} rawRecords - Raw records from import
     * @param {string} createdBy - User ID who is creating
     * @returns {Object} - Results with created/updated counts and errors
     */
    async bulkImportConditions(rawRecords, user) {
        // Accept either full user object or just user ID for backward compatibility
        const createdBy = user?.id || user;
        const results = { created: 0, updated: 0, errors: [] };

        // Helper to get field value case-insensitively
        const getField = (record, ...keys) => {
            const normalizedRecord = {};
            Object.keys(record).forEach(k => {
                // Normalize key: lowercase and remove optional ' *' or '*' suffix
                const cleanKey = k.toLowerCase().replace(/ \**$/, '').replace(/\*$/, '').trim();
                normalizedRecord[cleanKey] = record[k];
            });

            for (const key of keys) {
                const searchKey = key.toLowerCase();
                if (normalizedRecord[searchKey] !== undefined) return normalizedRecord[searchKey];
                // Check straight match if normalization was too aggressive
                if (record[key] !== undefined) return record[key];
            }
            return undefined;
        };

        // Pre-fetch existing conditions by code for upsert
        const existingByCode = new Map();
        try {
            const allConditions = await ConditionMaster.findAll({ attributes: ['id', 'condition_code'] });
            allConditions.forEach(c => {
                if (c.condition_code) {
                    existingByCode.set(c.condition_code.toLowerCase(), c);
                }
            });
        } catch (e) {
            console.warn('Could not pre-fetch existing conditions:', e.message);
        }

        for (let i = 0; i < rawRecords.length; i++) {
            const record = rawRecords[i];
            try {
                // Extract fields
                const conditionName = getField(record, 'condition_name', 'conditionName', 'Condition Name', 'condition name');
                const conditionCode = getField(record, 'condition_code', 'conditionCode', 'Condition Code', 'condition code');
                const severityLevel = getField(record, 'severity_level', 'severityLevel', 'Severity Level', 'severity level', 'Severity');
                const priorityScore = getField(record, 'priority_score', 'priorityScore', 'Priority Score', 'priority score', 'Priority');
                const healthImpact = getField(record, 'health_impact', 'healthImpact', 'Health Impact', 'health impact');
                const recommendedAction = getField(record, 'recommended_action', 'recommendedAction', 'Recommended Action', 'recommended action');
                let requiresImmediateAction = getField(record, 'requires_immediate_action', 'requiresImmediateAction', 'Requires Immediate Action', 'Immediate');
                let isActive = getField(record, 'is_active', 'isActive', 'Is Active', 'Status');

                // Check for existing condition FIRST
                const existingCondition = conditionCode ? existingByCode.get(conditionCode.toLowerCase()) : null;

                if (existingCondition) {
                    // === UPDATE OPERATION ===
                    const updateData = {};

                    if (conditionName !== undefined) updateData.condition_name = conditionName;
                    if (severityLevel !== undefined) updateData.severity_level = severityLevel.toUpperCase();
                    if (priorityScore !== undefined && priorityScore !== null) updateData.priority_score = parseInt(priorityScore);

                    // Normalize health impact
                    if (healthImpact !== undefined) {
                        const STANDARD_HEALTH_IMPACTS = {
                            'healthy': 'Healthy',
                            'need attention': 'Need Attention',
                            'not working': 'Not Working',
                            'inventory': 'Inventory',
                            'under maintenance': 'Under Maintenance',
                            'de-active': 'De-Active'
                        };
                        updateData.health_impact = STANDARD_HEALTH_IMPACTS[healthImpact.toLowerCase()] || healthImpact;
                    }

                    if (recommendedAction !== undefined) updateData.recommended_action = recommendedAction;

                    // Convert booleans
                    if (requiresImmediateAction !== undefined) {
                        if (typeof requiresImmediateAction === 'string') {
                            updateData.requires_immediate_action = ['true', 'yes', '1'].includes(requiresImmediateAction.toLowerCase());
                        } else {
                            updateData.requires_immediate_action = !!requiresImmediateAction;
                        }
                    }
                    if (isActive !== undefined) {
                        if (typeof isActive === 'string') {
                            updateData.is_active = ['true', 'yes', '1', 'active'].includes(isActive.toLowerCase());
                        } else {
                            updateData.is_active = isActive !== false;
                        }
                    }

                    await this.updateCondition(existingCondition.id, updateData, user, 'import');
                    results.updated++;

                } else {
                    // === CREATE OPERATION ===
                    // Validate Mandatory Fields
                    if (!conditionName) throw new Error('Condition Name is required');
                    if (!severityLevel) throw new Error('Severity Level is required');
                    if (priorityScore === undefined || priorityScore === null) throw new Error('Priority Score is required');
                    if (!healthImpact) throw new Error('Health Impact is required');

                    // Convert booleans
                    if (typeof requiresImmediateAction === 'string') {
                        requiresImmediateAction = ['true', 'yes', '1'].includes(requiresImmediateAction.toLowerCase());
                    }
                    if (typeof isActive === 'string') {
                        isActive = ['true', 'yes', '1', 'active'].includes(isActive.toLowerCase());
                    }

                    // Normalize Health Impact
                    const STANDARD_HEALTH_IMPACTS = {
                        'healthy': 'Healthy',
                        'need attention': 'Need Attention',
                        'not working': 'Not Working',
                        'inventory': 'Inventory',
                        'under maintenance': 'Under Maintenance',
                        'de-active': 'De-Active'
                    };

                    let normalizedHealthImpact = healthImpact;
                    if (healthImpact && STANDARD_HEALTH_IMPACTS[healthImpact.toLowerCase()]) {
                        normalizedHealthImpact = STANDARD_HEALTH_IMPACTS[healthImpact.toLowerCase()];
                    }

                    const conditionData = {
                        condition_name: conditionName,
                        condition_code: conditionCode,
                        severity_level: severityLevel ? severityLevel.toUpperCase() : 'MEDIUM',
                        priority_score: priorityScore !== undefined ? parseInt(priorityScore) : 0,
                        health_impact: normalizedHealthImpact,
                        recommended_action: recommendedAction,
                        requires_immediate_action: !!requiresImmediateAction,
                        is_active: isActive !== false,
                        created_by: createdBy
                    };

                    await this.createCondition(conditionData, user, 'import');
                    results.created++;
                }

            } catch (err) {
                results.errors.push({
                    row: i + 1,
                    data: record,
                    error: err.message
                });
            }
        }

        // Add imported count for backward compatibility
        results.imported = results.created + results.updated;
        return results;
    }
}

module.exports = new ConditionService();