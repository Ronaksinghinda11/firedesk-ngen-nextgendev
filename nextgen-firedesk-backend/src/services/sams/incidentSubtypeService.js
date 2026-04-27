const { IncidentSubtype, IncidentType, Incident } = require('../../models/sams');
const auditService = require('../../services/audit/audit_service');

/**
 * Incident Subtype Service
 * Business logic for incident subtype management
 */

class IncidentSubtypeService {
    /**
     * Get all incident subtypes with optional filtering
     */
    async getAll(filters = {}) {
        const whereClause = {};

        if (filters.isActive !== undefined) {
            whereClause.isActive = filters.isActive;
        }
        if (filters.incidentTypeId) {
            whereClause.incidentTypeId = filters.incidentTypeId;
        }

        return await IncidentSubtype.findAll({
            where: whereClause,
            include: [
                {
                    model: IncidentType,
                    as: 'incidentType',
                    attributes: ['id', 'typeName', 'typeCode']
                }
            ],
            order: [['subtypeName', 'ASC']]
        });
    }

    /**
     * Get incident subtype by ID
     */
    async getById(id) {
        const incidentSubtype = await IncidentSubtype.findByPk(id, {
            include: [
                {
                    model: IncidentType,
                    as: 'incidentType',
                    attributes: ['id', 'typeName', 'typeCode']
                }
            ]
        });

        if (!incidentSubtype) {
            throw new Error('Incident subtype not found');
        }

        return incidentSubtype;
    }

    /**
     * Create new incident subtype
     */
    async create(data, user) {
        const createdBy = user.id;
        const { incidentTypeId, subtypeName, subtypeCode, description, isActive } = data;

        // Validate required fields
        if (!incidentTypeId || !subtypeName) {
            throw new Error('Incident type ID and subtype name are required');
        }

        // Check if incident type exists
        const incidentType = await IncidentType.findByPk(incidentTypeId);
        if (!incidentType) {
            const error = new Error('Incident type not found');
            error.statusCode = 404;
            throw error;
        }

        // Check for duplicate subtype name within the same type
        const existing = await IncidentSubtype.findOne({
            where: {
                incidentTypeId,
                subtypeName
            }
        });

        if (existing) {
            const error = new Error('Incident subtype with this name already exists for this type');
            error.statusCode = 409;
            throw error;
        }

        // Create incident subtype
        const incidentSubtype = await IncidentSubtype.create({
            incidentTypeId,
            subtypeName,
            subtypeCode,
            description,
            isActive: isActive !== undefined ? isActive : true,
            createdBy
        });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'incident_subtype',
                entityId: incidentSubtype.id,
                entityName: subtypeName,
                action: 'CREATE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for incidentSubtype create:', error.message);
        }

        // Fetch with relations
        return await this.getById(incidentSubtype.id);
    }

    /**
     * Update incident subtype
     */
    async update(id, data, user) {
        const { incidentTypeId, subtypeName, subtypeCode, description, isActive } = data;

        const incidentSubtype = await IncidentSubtype.findByPk(id);

        if (!incidentSubtype) {
            throw new Error('Incident subtype not found');
        }

        // If changing incident type, verify it exists
        if (incidentTypeId && incidentTypeId !== incidentSubtype.incidentTypeId) {
            const incidentType = await IncidentType.findByPk(incidentTypeId);
            if (!incidentType) {
                const error = new Error('Incident type not found');
                error.statusCode = 404;
                throw error;
            }
        }

        // Check for duplicate subtype name if changing
        const checkTypeId = incidentTypeId || incidentSubtype.incidentTypeId;
        const checkSubtypeName = subtypeName || incidentSubtype.subtypeName;

        if (subtypeName && subtypeName !== incidentSubtype.subtypeName) {
            const existing = await IncidentSubtype.findOne({
                where: {
                    incidentTypeId: checkTypeId,
                    subtypeName: checkSubtypeName
                }
            });

            if (existing && existing.id !== id) {
                const error = new Error('Incident subtype with this name already exists for this type');
                error.statusCode = 409;
                throw error;
            }
        }

        // Update fields
        if (incidentTypeId !== undefined) incidentSubtype.incidentTypeId = incidentTypeId;
        if (subtypeName !== undefined) incidentSubtype.subtypeName = subtypeName;
        if (subtypeCode !== undefined) incidentSubtype.subtypeCode = subtypeCode;
        if (description !== undefined) incidentSubtype.description = description;
        if (isActive !== undefined) incidentSubtype.isActive = isActive;

        await incidentSubtype.save();

        // Audit Log
        try {
            await auditService.log({
                entityType: 'incident_subtype',
                entityId: id,
                entityName: incidentSubtype.subtypeName,
                action: 'UPDATE',
                changes: data,
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for incidentSubtype update:', error.message);
        }

        // Fetch with relations
        return await this.getById(id);
    }

    /**
     * Delete incident subtype
     */
    async delete(id, user) {
        const incidentSubtype = await IncidentSubtype.findByPk(id);

        if (!incidentSubtype) {
            throw new Error('Incident subtype not found');
        }

        // Check if there are any incidents using this subtype
        const incidentsCount = await Incident.count({
            where: { incidentSubtypeId: id }
        });

        if (incidentsCount > 0) {
            const error = new Error(
                `Cannot delete incident subtype. It is used by ${incidentsCount} incident(s). Please reassign or delete incidents first.`
            );
            error.statusCode = 400;
            throw error;
        }

        await incidentSubtype.destroy();

        // Audit Log
        try {
            await auditService.log({
                entityType: 'incident_subtype',
                entityId: id,
                entityName: incidentSubtype.subtypeName,
                action: 'DELETE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for incidentSubtype delete:', error.message);
        }

        return { message: 'Incident subtype deleted successfully' };
    }

    /**
     * Restore incident subtype
     */
    async restore(id) {
        const incidentSubtype = await IncidentSubtype.findByPk(id);

        if (!incidentSubtype) {
            throw new Error('Incident subtype not found');
        }

        incidentSubtype.isActive = true;
        await incidentSubtype.save();

        return incidentSubtype;
    }
}

module.exports = new IncidentSubtypeService();
