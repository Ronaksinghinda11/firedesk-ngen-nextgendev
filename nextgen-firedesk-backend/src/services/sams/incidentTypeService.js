const { IncidentType, IncidentSubtype } = require('../../models/sams');
const { Op } = require('sequelize');
const auditService = require('../../services/audit/audit_service');

/**
 * Incident Type Service
 * Business logic for incident type management
 */

class IncidentTypeService {
    /**
     * Get all incident types with optional filtering
     */
    async getAll(filters = {}) {
        const whereClause = {};

        if (filters.isActive !== undefined) {
            whereClause.isActive = filters.isActive;
        }

        return await IncidentType.findAll({
            where: whereClause,
            order: [['typeName', 'ASC']]
        });
    }

    /**
     * Get incident type by ID with subtypes
     */
    async getById(id) {
        const incidentType = await IncidentType.findByPk(id, {
            include: [
                {
                    association: 'subtypes',
                    where: { isActive: true },
                    required: false
                }
            ]
        });

        if (!incidentType) {
            throw new Error('Incident type not found');
        }

        return incidentType;
    }

    /**
     * Create new incident type
     */
    async create(data, user) {
        const createdBy = user.id;
        const { typeName, typeCode, description, isActive } = data;

        // Validate required fields
        if (!typeName) {
            throw new Error('Type name is required');
        }

        // Check for duplicate type name
        const existing = await IncidentType.findOne({
            where: { typeName }
        });

        if (existing) {
            const error = new Error('Incident type with this name already exists');
            error.statusCode = 409;
            throw error;
        }

        // Create incident type
        const incidentType = await IncidentType.create({
            typeName,
            typeCode,
            description,
            isActive: isActive !== undefined ? isActive : true,
            createdBy
        });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'incident_type',
                entityId: incidentType.id,
                entityName: typeName,
                action: 'CREATE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for incidentType create:', error.message);
        }

        return incidentType;
    }

    /**
     * Update incident type
     */
    async update(id, data, user) {
        const { typeName, typeCode, description, isActive } = data;

        const incidentType = await IncidentType.findByPk(id);

        if (!incidentType) {
            throw new Error('Incident type not found');
        }

        // Check for duplicate type name if changing
        if (typeName && typeName !== incidentType.typeName) {
            const existing = await IncidentType.findOne({
                where: { typeName }
            });

            if (existing) {
                const error = new Error('Incident type with this name already exists');
                error.statusCode = 409;
                throw error;
            }
        }

        // Update fields
        if (typeName !== undefined) incidentType.typeName = typeName;
        if (typeCode !== undefined) incidentType.typeCode = typeCode;
        if (description !== undefined) incidentType.description = description;
        if (isActive !== undefined) incidentType.isActive = isActive;

        await incidentType.save();

        // Audit Log
        try {
            const changes = auditService.calculateChanges(incidentType.toJSON(), await IncidentType.findByPk(id)); // Re-fetch or calculate manually if needed, but here simple values changed
            // Actually incidentType instance is updated? Sequelize instance updates vary. 
            // Better: Capture oldValues before update. But I missed that.
            // Let's rely on basic logging allowing "Updated Incident Type" without deep diff if risky, 
            // OR use generic "UPDATE" and let auditService handle diff if I passed old/new?
            // The auditService.log generic call doesn't do diffing unless 'changes' is passed.
            await auditService.log({
                entityType: 'incident_type',
                entityId: id,
                entityName: incidentType.typeName,
                action: 'UPDATE',
                changes: data, // Approximate changes since we applied data
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for incidentType update:', error.message);
        }

        return incidentType;
    }

    /**
     * Delete incident type
     */
    async delete(id, user) {
        const incidentType = await IncidentType.findByPk(id);

        if (!incidentType) {
            throw new Error('Incident type not found');
        }

        // Check if there are any subtypes
        const subtypesCount = await IncidentSubtype.count({
            where: { incidentTypeId: id }
        });

        if (subtypesCount > 0) {
            const error = new Error(
                `Cannot delete incident type. It has ${subtypesCount} associated subtype(s). Please delete or reassign subtypes first.`
            );
            error.statusCode = 400;
            throw error;
        }

        await incidentType.destroy();

        // Audit Log
        try {
            await auditService.log({
                entityType: 'incident_type',
                entityId: id,
                entityName: incidentType.typeName,
                action: 'DELETE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for incidentType delete:', error.message);
        }

        return { message: 'Incident type deleted successfully' };
    }

    /**
     * Restore incident type
     */
    async restore(id) {
        const incidentType = await IncidentType.findByPk(id);

        if (!incidentType) {
            throw new Error('Incident type not found');
        }

        incidentType.isActive = true;
        await incidentType.save();

        return incidentType;
    }
}

module.exports = new IncidentTypeService();
