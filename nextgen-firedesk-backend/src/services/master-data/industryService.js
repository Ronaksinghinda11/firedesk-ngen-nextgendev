const Industry = require('../../models/master-data/Industry');
const { Plant } = require('../../models');
const { Op } = require('sequelize');
const { generateCode, ensureUniqueCode } = require('../../utils/codeGenerator');
const auditService = require('../../services/audit/audit_service');

class IndustryService {
    /**
     * Get all industries with optional filtering
     */
    async getAllIndustries(filters = {}) {
        const { status, search, page = 1, limit = 50 } = filters;

        const whereClause = {};

        if (status) {
            whereClause.status = status;
        }

        if (search) {
            whereClause[Op.or] = [
                { industry_name: { [Op.iLike]: `%${search}%` } },
                { industry_code: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Industry.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        return {
            industries: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get active industries
     */
    async getActiveIndustries() {
        const industries = await Industry.findAll({
            where: { status: "Active" },
            order: [['created_at', 'DESC']]
        });

        return industries;
    }

    /**
     * Get industry by ID
     */
    async getIndustryById(industryId) {
        const industry = await Industry.findByPk(industryId);

        if (!industry) {
            throw new Error('Industry not found');
        }

        return industry;
    }

    /**
     * Create industry
     */
    async createIndustry(industryData, user) {
        const { industry_name, industry_code, status, created_by } = industryData;

        // Check if industry name already exists
        const existingByName = await Industry.findOne({
            where: { industry_name }
        });

        if (existingByName) {
            throw new Error('Industry name already exists');
        }

        // Auto-generate industry code if not provided
        let finalIndustryCode = industry_code;
        if (!finalIndustryCode) {
            const baseCode = generateCode(industry_name);
            finalIndustryCode = await ensureUniqueCode(baseCode, async (code) => {
                const existing = await Industry.findOne({ where: { industry_code: code } });
                return !!existing;
            });
        } else {
            // Check if manually provided code already exists
            const existingByCode = await Industry.findOne({
                where: { industry_code: finalIndustryCode }
            });

            if (existingByCode) {
                throw new Error('Industry code already exists');
            }
        }

        const industry = await Industry.create({
            industry_name,
            industry_code: finalIndustryCode,
            status: status || 'Active',
            created_by
        });

        // Audit Log (Fire and Forget)
        try {
            await auditService.log({
                entityType: 'industry',
                entityId: industry.id,
                entityName: industry.industry_name,
                action: 'CREATE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for createIndustry:', error.message);
        }

        return industry;
    }

    /**
     * Update industry
     */
    async updateIndustry(industryId, industryData, user) {
        const industry = await Industry.findByPk(industryId);

        if (!industry) {
            throw new Error('Industry not found');
        }

        // Capture old values for audit
        const oldValues = industry.toJSON();

        const { industry_name, industry_code, status } = industryData;

        // Check if new name already exists (excluding current industry)
        if (industry_name && industry_name !== industry.industry_name) {
            const existingByName = await Industry.findOne({
                where: {
                    industry_name,
                    id: { [Op.ne]: industryId }
                }
            });

            if (existingByName) {
                throw new Error('Industry name already exists');
            }

            // Auto-generate new code if name changed and code not provided
            if (!industry_code) {
                const baseCode = generateCode(industry_name);
                const new_industry_code = await ensureUniqueCode(baseCode, async (code) => {
                    const existing = await Industry.findOne({
                        where: {
                            industry_code: code,
                            id: { [Op.ne]: industryId }
                        }
                    });
                    return !!existing;
                });

                await industry.update({
                    industry_name,
                    industry_code: new_industry_code,
                    status: status !== undefined ? status : industry.status
                });

                // Helper to log changes after update
                await this._logUpdate(industryId, oldValues, industry, user, 'UPDATE');
                return industry;
            }
        }

        // Check if industry code changed and if it already exists
        if (industry_code && industry_code !== industry.industry_code) {
            const existingByCode = await Industry.findOne({
                where: {
                    industry_code,
                    id: { [Op.ne]: industryId }
                }
            });

            if (existingByCode) {
                throw new Error('Industry code already exists');
            }
        }

        await industry.update({
            industry_name: industry_name !== undefined ? industry_name : industry.industry_name,
            industry_code: industry_code !== undefined ? industry_code : industry.industry_code,
            status: status !== undefined ? status : industry.status
        });

        // Log changes
        await this._logUpdate(industryId, oldValues, industry, user, 'UPDATE');

        return industry;
    }

    // Helper for update logging to avoid duplication
    async _logUpdate(entityId, oldValues, newEntity, user, action) {
        try {
            const changes = auditService.calculateChanges(oldValues, newEntity.toJSON());
            if (changes) {
                await auditService.log({
                    entityType: 'industry',
                    entityId: entityId,
                    entityName: newEntity.industry_name,
                    action: action,
                    changes,
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            }
        } catch (error) {
            console.error('Audit log failed for updateIndustry:', error.message);
        }
    }

    /**
     * Delete industry
     */
    async deleteIndustry(industryId, user) {
        const industry = await Industry.findByPk(industryId);

        if (!industry) {
            throw new Error('Industry not found');
        }

        // Capture old values for audit
        const oldValues = industry.toJSON();

        // Soft delete by setting status to Inactive
        await industry.update({ status: 'Inactive' });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'industry',
                entityId: industryId,
                entityName: industry.industry_name,
                action: 'ARCHIVE',
                changes: { status: { old: oldValues.status, new: 'Inactive' } },
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for deleteIndustry:', error.message);
        }

        return { message: 'Industry archived successfully' };
    }

    /**
     * Permanent Delete industry
     */
    async hardDeleteIndustry(industryId, user) {
        const industry = await Industry.findByPk(industryId);

        if (!industry) {
            throw new Error('Industry not found');
        }

        // Capture name before delete for audit
        const industryName = industry.industry_name;

        // Check if industry is used by any plants
        const plantsUsingIndustry = await Plant.count({
            where: { industry_id: industryId }
        });

        if (plantsUsingIndustry > 0) {
            throw new Error(`Cannot delete industry. It is associated with ${plantsUsingIndustry} plant(s).`);
        }

        // Hard delete
        await industry.destroy();

        // Audit Log
        try {
            await auditService.log({
                entityType: 'industry',
                entityId: industryId,
                entityName: industryName,
                action: 'DELETE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for hardDeleteIndustry:', error.message);
        }

        return { message: 'Industry permanently deleted successfully' };
    }

    /**
     * Restore industry (reactivate)
     */
    async restoreIndustry(industryId, user) {
        const industry = await Industry.findByPk(industryId);

        if (!industry) {
            throw new Error('Industry not found');
        }

        const oldValues = industry.toJSON();

        // Restore by setting status to Active
        await industry.update({ status: 'Active' });

        // Log as RESTORE or STATUS_CHANGE
        this._logUpdate(industryId, oldValues, industry, user, 'RESTORE');

        return { message: 'Industry restored successfully' };
    }

    /**
     * Bulk import industries from raw records
     * @param {Array} rawRecords - Raw records from import
     * @param {string} createdBy - User ID who is creating
     * @returns {Object} - Results with imported count and errors
     */
    async bulkImportIndustries(rawRecords, createdBy) {
        const results = { imported: 0, errors: [] };

        // Helper to get field value from various name formats
        const getField = (record, ...keys) => {
            for (const key of keys) {
                if (record[key] !== undefined) return record[key];
                if (record[key + ' *'] !== undefined) return record[key + ' *'];
            }
            return undefined;
        };

        for (let i = 0; i < rawRecords.length; i++) {
            try {
                const record = rawRecords[i];

                // Normalize field names
                const industryName = getField(record, 'industry_name', 'industryName', 'Industry Name', 'industry name');
                const industryCode = getField(record, 'industry_code', 'industryCode', 'Industry Code', 'industry code');

                if (!industryName) {
                    results.errors.push({ row: i + 1, data: record, error: 'Industry name is required' });
                    continue;
                }

                const industryData = {
                    industry_name: industryName,
                    industry_code: industryCode || undefined,
                    created_by: createdBy
                };

                await this.createIndustry(industryData);
                results.imported++;
            } catch (err) {
                results.errors.push({ row: i + 1, data: rawRecords[i], error: err.message });
            }
        }

        return results;
    }
}

module.exports = new IndustryService();