const {
    Incident,
    IncidentSubtype,
    IncidentType,
    IncidentAssignment,
    IncidentCapaStep,
    IncidentActivity,
    CapaStepDefinition
} = require('../../models/sams');
const { User, Role } = require('../../models/user-management');
const Plant = require('../../models/plants/Plant');
const Building = require('../../models/plants/Building');
const Floor = require('../../models/plants/Floor');
const Manager = require('../../models/user-management/manager');
const Technician = require('../../models/user-management/technician');
const UploadedFile = require('../../models/common/UploadedFile');
const { Op } = require('sequelize');
const { sequelize } = require('../../../config/config');
const { notify_incident_created, notify_incident_team_assigned } = require('../notifications/notificationService');
const auditService = require('../../services/audit/audit_service');

/**
 * Incident Service
 * Core business logic for incident management
 */

class IncidentService {
    /**
     * Generate unique incident number
     */
    async generateIncidentNumber(incidentSubtypeId) {
        const subtype = await IncidentSubtype.findByPk(incidentSubtypeId);

        if (!subtype) {
            throw new Error('Incident subtype not found');
        }

        // Get the count of incidents for this subtype
        const count = await Incident.count({
            where: { incidentSubtypeId }
        });

        const prefix = subtype.subtypeCode || 'INC';
        const year = new Date().getFullYear();
        const number = String(count + 1).padStart(4, '0');

        return `${prefix}-${year}-${number}`;
    }

    /**
     * Format metadata as human-readable text
     */
    async formatMetadataAsText(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            return '';
        }

        const parts = [];

        try {
            // Resolve plantId to plant name
            if (metadata.plantId) {
                const plant = await Plant.findByPk(metadata.plantId, {
                    attributes: ['id', 'name']
                });
                if (plant) {
                    parts.push(`Plant: ${plant.name}`);
                }
            }

            // Add severity
            if (metadata.severity) {
                parts.push(`Severity: ${metadata.severity}`);
            }

            // Resolve teamMemberIds to names
            if (metadata.teamMemberIds && Array.isArray(metadata.teamMemberIds)) {
                const users = await User.findAll({
                    where: { id: { [Op.in]: metadata.teamMemberIds } },
                    attributes: ['id', 'name']
                });
                const names = users.map(u => u.name).join(', ');
                parts.push(`Team Members: ${names}`);
            }

            // Resolve teamLeaderId to name
            if (metadata.teamLeaderId) {
                const leader = await User.findByPk(metadata.teamLeaderId, {
                    attributes: ['id', 'name']
                });
                if (leader) {
                    parts.push(`Team Leader: ${leader.name}`);
                }
            }
        } catch (error) {
            console.error('Error formatting metadata:', error);
            return '';
        }

        return parts.length > 0 ? ` (${parts.join(', ')})` : '';
    }

    /**
     * Log activity for an incident
     */
    async logActivity(incidentId, action, performedBy, description = null, metadata = null, options = {}) {
        // Format metadata as readable text and append to description
        const metadataText = await this.formatMetadataAsText(metadata);
        const fullDescription = description ? `${description}${metadataText}` : metadataText.trim();

        return await IncidentActivity.create({
            incidentId,
            action,
            description: fullDescription,
            performedBy,
            metadata: null  // Don't store metadata to avoid JSON display
        }, options);
    }

    /**
     * Get incidents for a specific user based on their role and plant access
     */
    async getIncidentsForUser(userId, filters = {}) {
        const user = await User.findByPk(userId, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!user) {
            throw new Error('User not found');
        }

        let whereClause = {};

        if (user.role && user.role.name === 'Admin') {
            // Admin sees all incidents
            whereClause = { ...filters };
        } else {
            // For non-admin users, show incidents they created or are assigned to
            const assignedIncidentIds = await IncidentAssignment.findAll({
                where: { userId, isActive: true },
                attributes: ['incidentId']
            });

            const incidentIds = assignedIncidentIds.map(a => a.incidentId);

            // Check if user is a manager and get their managed plants
            let managedPlantIds = [];
            if (user.role && user.role.name === 'Manager') {
                const manager = await Manager.findOne({
                    where: { user_id: userId },
                    include: [{
                        model: require('../../models/user-management/plant_manager'),
                        as: 'plant_assignments',
                        attributes: ['plant_id']
                    }]
                });

                if (manager && manager.plant_assignments) {
                    managedPlantIds = manager.plant_assignments.map(pa => pa.plant_id);
                }
            }

            const orConditions = [
                { createdBy: userId },
                { id: { [Op.in]: incidentIds } }
            ];

            if (managedPlantIds.length > 0) {
                // If filtering by plant via API params, ensure it's one of the managed plants
                if (filters.plantId) {
                    if (managedPlantIds.includes(filters.plantId)) {
                        // Manager manages this plant, allow seeing all incidents in it
                        orConditions.push({ plantId: filters.plantId });
                    }
                    // If they don't manage it, fall back to only created/assigned
                } else {
                    // Include all managed plants
                    orConditions.push({ plantId: { [Op.in]: managedPlantIds } });
                }
            }

            whereClause = {
                [Op.or]: orConditions,
                ...filters
            };
        }

        return await Incident.findAll({
            where: whereClause,
            include: [
                {
                    model: IncidentSubtype,
                    as: 'subtype',
                    include: [
                        {
                            model: IncidentType,
                            as: 'incidentType'
                        }
                    ]
                },
                {
                    model: Plant,
                    as: 'plant'
                },
                {
                    model: Building,
                    as: 'building',
                    required: false
                },
                {
                    model: Floor,
                    as: 'floor',
                    required: false
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: IncidentAssignment,
                    as: 'assignments',
                    where: { isActive: true },
                    required: false,
                    include: [
                        {
                            model: User,
                            as: 'assignedUser',
                            attributes: ['id', 'name', 'email']
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Get incidents assigned to the user (where they are a team member)
     */
    async getMyAssignedIncidents(userId) {
        // Find all active assignments for this user
        const assignments = await IncidentAssignment.findAll({
            where: { userId, isActive: true },
            attributes: ['incidentId']
        });

        const incidentIds = assignments.map(a => a.incidentId);

        if (incidentIds.length === 0) {
            return [];
        }

        // Fetch the incidents
        return await Incident.findAll({
            where: { id: { [Op.in]: incidentIds } },
            include: [
                {
                    model: IncidentSubtype,
                    as: 'subtype',
                    include: [
                        {
                            model: IncidentType,
                            as: 'incidentType'
                        }
                    ]
                },
                { model: Plant, as: 'plant' },
                {
                    model: IncidentCapaStep,
                    as: 'capaSteps',
                    include: [
                        { model: CapaStepDefinition, as: 'definition' }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Get incident by ID with full details
     */
    async getById(id, userId) {
        const incident = await Incident.findByPk(id, {
            include: [
                {
                    model: IncidentSubtype,
                    as: 'subtype',
                    include: [
                        {
                            model: IncidentType,
                            as: 'incidentType'
                        }
                    ]
                },
                {
                    model: Plant,
                    as: 'plant'
                },
                {
                    model: Building,
                    as: 'building',
                    required: false
                },
                {
                    model: Floor,
                    as: 'floor',
                    required: false
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: User,
                    as: 'teamCreator',
                    attributes: ['id', 'name', 'email'],
                    required: false
                },
                {
                    model: User,
                    as: 'teamLeader',
                    attributes: ['id', 'name', 'email'],
                    required: false
                },
                {
                    model: IncidentAssignment,
                    as: 'assignments',
                    include: [
                        {
                            model: User,
                            as: 'assignedUser',
                            attributes: ['id', 'name', 'email']
                        }
                    ]
                },
                {
                    model: IncidentCapaStep,
                    as: 'capaSteps',
                    include: [
                        {
                            model: CapaStepDefinition,
                            as: 'definition'
                        },
                        {
                            model: User,
                            as: 'submitter',
                            attributes: ['id', 'name', 'email'],
                            required: false
                        },
                        {
                            model: User,
                            as: 'approver',
                            attributes: ['id', 'name', 'email'],
                            required: false
                        }
                    ],
                    order: [['stepNumber', 'ASC']]
                },
                {
                    model: IncidentActivity,
                    as: 'activities',
                    include: [
                        {
                            model: User,
                            as: 'performer',
                            attributes: ['id', 'name', 'email']
                        }
                    ],
                    order: [['created_at', 'DESC']]
                }
            ]
        });

        if (!incident) {
            throw new Error('Incident not found');
        }

        // Check access
        await this.checkUserAccess(incident, userId);

        return incident;
    }

    /**
     * Check if user has access to view incident
     */
    async checkUserAccess(incident, userId) {
        const user = await User.findByPk(userId, {
            include: [{ model: Role, as: 'role' }]
        });

        // Admin: can view all
        if (user && user.role && user.role.name === 'Admin') {
            return true;
        }

        // For non-admin, check if user created or is assigned
        const isCreator = incident.createdBy === userId;

        // Check if user is a team member
        const isTeamMember = incident.assignments && incident.assignments.some(
            a => a.userId === userId && a.isActive
        );

        if (isTeamMember) {
            return true;
        }

        if (isCreator) {
            return true;
        }

        // Check if user is a manager of the plant where incident occurred
        if (user.role && user.role.name === 'Manager') {
            const manager = await Manager.findOne({
                where: { user_id: userId },
                include: [{
                    model: require('../../models/user-management/plant_manager'),
                    as: 'plant_assignments',
                    attributes: ['plant_id']
                }]
            });

            if (manager && manager.plant_assignments) {
                const managedPlantIds = manager.plant_assignments.map(pa => pa.plant_id);
                if (managedPlantIds.includes(incident.plantId)) {
                    return true;
                }
            }
        }

        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
    }

    /**
     * Create new incident
     */
    async create(data, user) {
        const createdBy = user.id;
        const {
            incidentSubtypeId,
            plantId,
            buildingId,
            floorId,
            incidentDate,
            description,
            impact,
            severity
        } = data;

        // Validate required fields
        if (!incidentSubtypeId || !plantId || !incidentDate || !description) {
            throw new Error('Required fields: incidentSubtypeId, plantId, incidentDate, description');
        }

        // Validate user has access to this plant
        // Validate user has access to this plant (Skipped)
        // const userToCheck = await User.findByPk(createdBy);

        // Skip plant access validation for now - allow all authenticated users to create incidents

        // Generate incident number
        const incidentNumber = await this.generateIncidentNumber(incidentSubtypeId);

        const transaction = await sequelize.transaction();

        try {
            // Create incident
            const incident = await Incident.create({
                incidentNumber,
                incidentSubtypeId,
                plantId,
                buildingId,
                floorId,
                incidentDate,
                description,
                impact,
                severity: severity || 'Medium',
                status: 'Open',
                currentCapaStep: 0,
                createdBy
            }, { transaction });

            // Log activity
            await this.logActivity(
                incident.id,
                'Incident Created',
                createdBy,
                `Incident ${incidentNumber} created`,
                { severity, plantId },
                { transaction }
            );

            await transaction.commit();

            // Audit Service Log
            try {
                await auditService.log({
                    entityType: 'incident',
                    entityId: incident.id,
                    entityName: incidentNumber,
                    action: 'CREATE',
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for incident create:', error.message);
            }

            // Fetch and return with full details
            const createdIncident = await this.getById(incident.id, createdBy);

            // Send notification for new incident
            try {
                await notify_incident_created(createdIncident, createdBy);
            } catch (notifError) {
                console.error('Failed to send incident creation notification:', notifError);
            }

            return createdIncident;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Update incident
     */
    async update(id, data, user) {
        const userId = user.id;
        const incident = await Incident.findByPk(id);

        if (!incident) {
            throw new Error('Incident not found');
        }

        // Check access
        await this.checkUserAccess(incident, userId);

        const oldValues = incident.toJSON();

        const {
            incidentSubtypeId,
            buildingId,
            floorId,
            incidentDate,
            description,
            impact,
            severity
        } = data;

        // Validate required fields - cannot be set to empty
        if (description !== undefined && (!description || description.length < 10)) {
            throw new Error('Description is required and must be at least 10 characters');
        }

        // Update fields
        if (incidentSubtypeId !== undefined) incident.incidentSubtypeId = incidentSubtypeId;
        if (buildingId !== undefined) incident.buildingId = buildingId;
        if (floorId !== undefined) incident.floorId = floorId;
        if (incidentDate !== undefined) incident.incidentDate = incidentDate;
        if (description !== undefined) incident.description = description;
        if (impact !== undefined) incident.impact = impact;
        if (severity !== undefined) incident.severity = severity;
        if (data.status !== undefined) incident.status = data.status;

        await incident.save();

        // Log activity
        await this.logActivity(
            incident.id,
            'Incident Updated',
            userId,
            'Incident details updated'
        );

        // Audit Log
        try {
            const changes = auditService.calculateChanges(oldValues, incident.toJSON());
            if (changes) {
                await auditService.log({
                    entityType: 'incident',
                    entityId: incident.id,
                    entityName: incident.incidentNumber,
                    action: 'UPDATE',
                    changes,
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            }
        } catch (error) {
            console.error('Audit log failed for incident update:', error.message);
        }

        return await this.getById(id, userId);
    }

    /**
     * Delete incident
     */
    async delete(id, user) {
        const userId = user.id;
        const incident = await Incident.findByPk(id);

        if (!incident) {
            throw new Error('Incident not found');
        }

        // Check access - only admin can delete
        // Check access - only admin can delete
        const userToCheck = await User.findByPk(userId, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!userToCheck || !userToCheck.role || userToCheck.role.name !== 'Admin') {
            const error = new Error('Only administrators can delete incidents');
            error.statusCode = 403;
            throw error;
        }

        // Clean up associated files from CAPA steps
        const capaSteps = await IncidentCapaStep.findAll({
            where: { incidentId: id }
        });

        const fileIdsToDelete = [];

        capaSteps.forEach(step => {
            // documentsData is stored as JSON object { url: '/upload/ID', ... }
            if (step.documentsData && step.documentsData.url) {
                // Extract ID from URL (format: /upload/:id)
                const parts = step.documentsData.url.split('/');
                const fileId = parts[parts.length - 1]; // Get last part

                // Basic UUID validation or check if it looks like an ID
                if (fileId) {
                    fileIdsToDelete.push(fileId);
                }
            }
        });

        if (fileIdsToDelete.length > 0) {
            await UploadedFile.destroy({
                where: {
                    id: { [Op.in]: fileIdsToDelete }
                }
            });
        }

        await incident.destroy();

        // Audit Log
        try {
            await auditService.log({
                entityType: 'incident',
                entityId: id,
                entityName: incident.incidentNumber,
                action: 'DELETE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for incident delete:', error.message);
        }

        return { message: 'Incident deleted successfully' };
    }

    /**
     * Restore incident
     */
    async restore(id, userId) {
        const incident = await Incident.findByPk(id);

        if (!incident) {
            throw new Error('Incident not found');
        }

        // Check access - only admin can restore
        const user = await User.findByPk(userId, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!user || !user.role || user.role.name !== 'Admin') {
            const error = new Error('Only administrators can restore incidents');
            error.statusCode = 403;
            throw error;
        }

        // Restore to Active/Open status
        // If it was archived (Inactive), set to Open
        incident.status = 'Open';
        await incident.save();

        // Log activity
        await this.logActivity(
            incident.id,
            'Incident Restored',
            userId,
            'Incident restored from archive'
        );

        return await this.getById(id, userId);
    }

    /**
     * Get available team members for an incident's plant (excluding admin)
     */
    async getAvailableMembers(incidentId, userId) {
        const incident = await Incident.findByPk(incidentId);

        if (!incident) {
            throw new Error('Incident not found');
        }

        // Get all users in the system (admins will filter by plant if needed)
        const availableUsers = await User.findAll({
            include: [{
                model: Role,
                as: 'role',
                where: {
                    name: { [Op.ne]: 'Admin' }
                },
                attributes: ['name']
            }],
            attributes: ['id', 'name', 'email']
        });

        return availableUsers;
    }

    /**
     * Assign team to incident
     */
    async assignTeam(incidentId, teamData, user) {
        const assignedBy = user.id;
        const { teamMemberIds, teamLeaderId } = teamData;

        const incident = await Incident.findByPk(incidentId);

        if (!incident) {
            throw new Error('Incident not found');
        }

        // Validate user can assign team (Admin or Manager of that plant)
        // Validate user can assign team (Admin or Manager of that plant)
        // const userToCheck = await User.findByPk(assignedBy);

        // Skip manager validation for now - allow any authenticated user to assign teams

        // Validate team leader is in team members
        if (teamLeaderId && !teamMemberIds.includes(teamLeaderId)) {
            throw new Error('Team leader must be one of the team members');
        }

        const transaction = await sequelize.transaction();

        try {
            // Deactivate existing assignments
            await IncidentAssignment.update(
                { isActive: false },
                { where: { incidentId }, transaction }
            );

            // Create new assignments
            const assignments = await IncidentAssignment.bulkCreate(
                teamMemberIds.map(memberId => ({
                    incidentId,
                    userId: memberId,
                    assignedBy,
                    assignedAt: new Date(),
                    isActive: true
                })),
                { transaction }
            );

            // Update incident with team creator and leader
            incident.teamCreatorId = assignedBy;
            incident.teamLeaderId = teamLeaderId;
            incident.status = 'Team Assigned';
            await incident.save({ transaction });

            // Initialize CAPA steps
            await this.initializeCapaSteps(incidentId, transaction);

            // Log activity
            await this.logActivity(
                incidentId,
                'Team Assigned',
                assignedBy,
                `Team of ${teamMemberIds.length} members assigned`,
                { teamMemberIds, teamLeaderId }
            );

            await transaction.commit();

            // Send notification to team members
            try {
                await notify_incident_team_assigned(incident, teamMemberIds, assignedBy);
            } catch (notifError) {
                console.error('Failed to send team assignment notification:', notifError);
            }
            // Audit Log
            try {
                await auditService.log({
                    entityType: 'incident',
                    entityId: incidentId,
                    entityName: incident.incidentNumber,
                    action: 'ASSIGN',
                    details: 'Team Assigned', // Still ignored but keeping for safe replace if needed, but action handles desc
                    changes: { teamMemberIds: teamData.teamMemberIds, teamLeaderId: teamData.teamLeaderId },
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for incident assignTeam:', error.message);
            }

            return await this.getById(incidentId, assignedBy);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Initialize CAPA steps for an incident
     */
    async initializeCapaSteps(incidentId, transaction = null) {
        // Get all active CAPA step definitions
        const stepDefinitions = await CapaStepDefinition.findAll({
            where: { isActive: true },
            order: [['stepNumber', 'ASC']]
        });

        if (stepDefinitions.length === 0) {
            throw new Error('No CAPA step definitions found. Please configure CAPA steps first.');
        }

        // Create incident CAPA steps
        const capaSteps = await IncidentCapaStep.bulkCreate(
            stepDefinitions.map(def => ({
                incidentId,
                capaStepDefinitionId: def.id,
                stepNumber: def.stepNumber,
                stepName: def.stepName,
                stepDescription: def.stepDescription,
                isDocumentRequired: def.isDocumentRequired,
                isApprovalRequired: def.isApprovalRequired,
                status: 'Not Started'
            })),
            { transaction }
        );
        return capaSteps;
    }

    /**
   * Submit CAPA step response
   */
    async submitCapaStep(incidentId, stepId, data, user) {
        const userId = user.id;
        const { stepResponse, documentsData } = data;

        const incident = await Incident.findByPk(incidentId, {
            include: [{ model: IncidentAssignment, as: 'assignments' }]
        });

        if (!incident) {
            throw new Error('Incident not found');
        }

        // Check if user is a team member
        const isTeamMember = incident.assignments.some(
            a => a.userId === userId && a.isActive
        );

        if (!isTeamMember) {
            const assignmentIds = incident.assignments.map(a => a.userId).join(', ');
            const error = new Error(`Only team members can submit CAPA steps. Current User: ${userId}, Assigned: ${assignmentIds}`);
            error.statusCode = 403;
            throw error;
        }

        const capaStep = await IncidentCapaStep.findByPk(stepId);

        if (!capaStep) {
            throw new Error('CAPA step not found');
        }

        if (capaStep.incidentId !== incidentId) {
            throw new Error('CAPA step does not belong to this incident');
        }

        // Validate response
        if (!stepResponse || stepResponse.trim() === '') {
            throw new Error('CAPA step response is required');
        }

        // Validate document if required
        if (capaStep.isDocumentRequired && (!documentsData || documentsData.length === 0)) {
            throw new Error('Document is required for this CAPA step');
        }

        const transaction = await sequelize.transaction();

        try {
            // Cleanup old file if it exists and is being replaced
            if (capaStep.documentsData && capaStep.documentsData.url) {
                const oldUrl = capaStep.documentsData.url;
                const newUrl = documentsData ? documentsData.url : null;

                if (oldUrl !== newUrl) {
                    const parts = oldUrl.split('/');
                    const fileId = parts[parts.length - 1];

                    if (fileId) {
                        try {
                            await UploadedFile.destroy({
                                where: { id: fileId },
                                transaction
                            });
                        } catch (err) {
                            console.error('Failed to cleanup old file:', err);
                            // Continue - don't block submission
                        }
                    }
                }
            }

            // Update CAPA step
            capaStep.stepResponse = stepResponse;
            capaStep.documentsData = documentsData;
            capaStep.submittedBy = userId;
            capaStep.submittedAt = new Date();

            // Auto-approve if approval not required
            if (!capaStep.isApprovalRequired) {
                capaStep.status = 'Approved';
                capaStep.approvedBy = userId; // System auto-approval
                capaStep.approvedAt = new Date();
            } else {
                capaStep.status = 'Pending Approval';
            }

            await capaStep.save({ transaction });

            // Update incident status
            if (incident.status === 'Team Assigned') {
                incident.status = 'In Progress';
                await incident.save({ transaction });
            }

            // Log activity
            await this.logActivity(
                incidentId,
                capaStep.isApprovalRequired ? 'CAPA Step Submitted' : 'CAPA Step Completed',
                userId,
                `Step ${capaStep.stepNumber}: ${capaStep.stepName} ${capaStep.isApprovalRequired ? 'submitted for approval' : 'auto-approved'}`,
                { stepId, stepNumber: capaStep.stepNumber, autoApproved: !capaStep.isApprovalRequired }
            );

            // Check if all steps are completed
            await this.checkAndCloseIncident(incidentId, transaction);

            await transaction.commit();

            // Audit Log
            try {
                await auditService.log({
                    entityType: 'incident',
                    entityId: incidentId,
                    entityName: incident.incidentNumber,
                    action: 'SUBMIT',
                    details: 'CAPA Step Submitted',
                    changes: { stepId, stepResponse: data.stepResponse },
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for incident submitCapaStep:', error.message);
            }

            return await this.getById(incidentId, userId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Approve or reject CAPA step
     */
    async reviewCapaStep(incidentId, stepId, reviewData, user) {
        const userId = user.id;
        const { approved, rejectionReason } = reviewData;

        const incident = await Incident.findByPk(incidentId);

        if (!incident) {
            throw new Error('Incident not found');
        }

        // Check if user is the team creator
        if (incident.teamCreatorId !== userId) {
            const error = new Error('Only the team creator can review CAPA steps');
            error.statusCode = 403;
            throw error;
        }

        const capaStep = await IncidentCapaStep.findByPk(stepId);

        if (!capaStep) {
            throw new Error('CAPA step not found');
        }

        if (capaStep.incidentId !== incidentId) {
            throw new Error('CAPA step does not belong to this incident');
        }

        if (capaStep.status !== 'Pending Approval') {
            throw new Error(`Cannot review step with status: ${capaStep.status}`);
        }

        // Validate rejection reason if rejecting
        if (!approved && (!rejectionReason || rejectionReason.trim() === '')) {
            throw new Error('Rejection reason is required when rejecting a CAPA step');
        }

        const transaction = await sequelize.transaction();

        try {
            if (approved) {
                capaStep.status = 'Approved';
                capaStep.approvedBy = userId;
                capaStep.approvedAt = new Date();
                capaStep.rejectionReason = null;
            } else {
                capaStep.status = 'Rejected';
                capaStep.rejectedBy = userId;
                capaStep.rejectedAt = new Date();
                capaStep.rejectionReason = rejectionReason;
            }

            await capaStep.save({ transaction });

            // Update incident status
            if (approved) {
                incident.status = 'In Progress';
            } else {
                incident.status = 'Pending Approval';
            }
            await incident.save({ transaction });

            // Log activity
            await this.logActivity(
                incidentId,
                approved ? 'CAPA Step Approved' : 'CAPA Step Rejected',
                userId,
                `Step ${capaStep.stepNumber}: ${capaStep.stepName} ${approved ? 'approved' : 'rejected'}`,
                { stepId, stepNumber: capaStep.stepNumber, approved, rejectionReason }
            );

            // If approved, check if all steps are completed
            if (approved) {
                await this.checkAndCloseIncident(incidentId, transaction);
            }

            await transaction.commit();

            // Audit
            try {
                await auditService.log({
                    entityType: 'incident',
                    entityId: incidentId,
                    entityName: incident.incidentNumber,
                    action: reviewData.approved ? 'APPROVE' : 'REJECT',
                    details: reviewData.approved ? 'CAPA Step Approved' : 'CAPA Step Rejected',
                    changes: { stepId, approved: reviewData.approved, rejectionReason: reviewData.rejectionReason },
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for incident reviewCapaStep:', error.message);
            }

            return await this.getById(incidentId, userId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Check if all CAPA steps are approved and close incident if so
     */
    async checkAndCloseIncident(incidentId, transaction = null) {
        const allSteps = await IncidentCapaStep.findAll({
            where: { incidentId },
            transaction
        });

        const allApproved = allSteps.every(step => step.status === 'Approved');

        if (allApproved && allSteps.length > 0) {
            const incident = await Incident.findByPk(incidentId);
            incident.status = 'Closed';
            await incident.save({ transaction });

            // Log activity (find who approved the last step for performer)
            const lastStep = allSteps[allSteps.length - 1];
            await this.logActivity(
                incidentId,
                'Incident Closed',
                lastStep.approvedBy || incident.teamCreatorId,
                'All CAPA steps approved, incident closed',
                { totalSteps: allSteps.length }
            );
        }
    }

    /**
     * Check if user is a team leader for any incident
     */
    async isTeamLeader(userId) {
        // Find incidents where user is the team creator (team leader)
        const incidents = await Incident.findAll({
            where: {
                teamCreatorId: userId,
                status: { [Op.notIn]: ['Closed', 'Rejected'] }
            },
            attributes: ['id', 'incidentNumber', 'status', 'severity', 'incidentDate'],
            include: [
                {
                    model: IncidentSubtype,
                    as: 'subtype',
                    attributes: ['subtypeName']
                }
            ]
        });

        return {
            isTeamLeader: incidents.length > 0,
            incidentCount: incidents.length,
            incidents: incidents
        };
    }
}

module.exports = new IncidentService();
