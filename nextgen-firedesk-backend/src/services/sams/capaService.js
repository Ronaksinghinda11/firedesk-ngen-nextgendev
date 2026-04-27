const { CapaStepDefinition, IncidentCapaStep } = require('../../models/sams');
const { sequelize } = require('../../../config/config');
const auditService = require('../audit/audit_service');

/**
 * CAPA Step Definition Service
 * Business logic for universal CAPA step definition management
 */

class CapaStepService {
    /**
     * Get all CAPA step definitions with optional filtering
     */
    async getAll(filters = {}) {
        const whereClause = {};

        if (filters.isActive !== undefined) {
            whereClause.isActive = filters.isActive;
        }

        return await CapaStepDefinition.findAll({
            where: whereClause,
            order: [['step_number', 'ASC']]
        });
    }

    /**
     * Get CAPA step definition by ID
     */
    async getById(id) {
        const capaStep = await CapaStepDefinition.findByPk(id);

        if (!capaStep) {
            throw new Error('CAPA step definition not found');
        }

        return capaStep;
    }

    /**
     * Create new CAPA step definition
     */
    async create(data, user) {
        const createdBy = user.id;
        const {
            stepNumber,
            stepName,
            stepCode,
            stepDescription,
            isDocumentRequired,
            isApprovalRequired,
            isActive
        } = data;

        // Validate required fields
        if (!stepNumber || !stepName) {
            throw new Error('Step number and step name are required');
        }

        // Validate step number is positive
        if (stepNumber < 1) {
            throw new Error('Step number must be a positive integer');
        }

        // Check for duplicate step number
        const existingNumber = await CapaStepDefinition.findOne({
            where: { stepNumber }
        });

        if (existingNumber) {
            const error = new Error(`Step number ${stepNumber} is already in use`);
            error.statusCode = 409;
            throw error;
        }

        // Check for duplicate step code if provided
        if (stepCode) {
            const existingCode = await CapaStepDefinition.findOne({
                where: { stepCode }
            });

            if (existingCode) {
                const error = new Error('Step code already exists');
                error.statusCode = 409;
                throw error;
            }
        }

        // Create CAPA step definition
        const capaStep = await CapaStepDefinition.create({
            stepNumber,
            stepName,
            stepCode,
            stepDescription,
            isDocumentRequired: isDocumentRequired !== undefined ? isDocumentRequired : false,
            isApprovalRequired: isApprovalRequired !== undefined ? isApprovalRequired : true,
            isActive: isActive !== undefined ? isActive : true,
            createdBy
        });

        await auditService.log({
            entityType: 'capa',
            entityId: capaStep.id,
            entityName: capaStep.stepName,
            action: 'CREATE',
            user: user ? { id: user.id, name: user.name, type: user.userType } : null,
            source: 'ui'
        });

        return capaStep;
    }

    /**
     * Update CAPA step definition
     */
    async update(id, data, user) {
        const {
            stepNumber,
            stepName,
            stepCode,
            stepDescription,
            isDocumentRequired,
            isApprovalRequired,
            isActive
        } = data;

        const capaStep = await CapaStepDefinition.findByPk(id);

        if (!capaStep) {
            throw new Error('CAPA step definition not found');
        }

        // Validate step number if changing
        if (stepNumber && stepNumber !== capaStep.stepNumber) {
            if (stepNumber < 1) {
                throw new Error('Step number must be a positive integer');
            }

            const existingNumber = await CapaStepDefinition.findOne({
                where: { stepNumber }
            });

            if (existingNumber) {
                const error = new Error(`Step number ${stepNumber} is already in use`);
                error.statusCode = 409;
                throw error;
            }
        }

        // Check for duplicate step code if changing
        if (stepCode && stepCode !== capaStep.stepCode) {
            const existingCode = await CapaStepDefinition.findOne({
                where: { stepCode }
            });

            if (existingCode && existingCode.id !== id) {
                const error = new Error('Step code already exists');
                error.statusCode = 409;
                throw error;
            }
        }

        const oldData = { ...capaStep.dataValues };

        // Update fields
        if (stepNumber !== undefined) capaStep.stepNumber = stepNumber;
        if (stepName !== undefined) capaStep.stepName = stepName;
        if (stepCode !== undefined) capaStep.stepCode = stepCode;
        if (stepDescription !== undefined) capaStep.stepDescription = stepDescription;
        if (isDocumentRequired !== undefined) capaStep.isDocumentRequired = isDocumentRequired;
        if (isApprovalRequired !== undefined) capaStep.isApprovalRequired = isApprovalRequired;
        if (isActive !== undefined) capaStep.isActive = isActive;

        await capaStep.save();

        const changes = auditService.calculateChanges(oldData, capaStep.dataValues);

        if (changes) {
            await auditService.log({
                entityType: 'capa',
                entityId: capaStep.id,
                entityName: capaStep.stepName,
                action: 'UPDATE',
                changes,
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        }

        return capaStep;
    }

    /**
     * Delete CAPA step definition
     */
    async delete(id, user) {
        const capaStep = await CapaStepDefinition.findByPk(id);

        if (!capaStep) {
            throw new Error('CAPA step definition not found');
        }

        // Check if there are any incident CAPA steps using this definition
        const instancesCount = await IncidentCapaStep.count({
            where: { capaStepDefinitionId: id }
        });

        if (instancesCount > 0) {
            const error = new Error(
                `Cannot delete CAPA step definition. It is used by ${instancesCount} incident(s). Please deactivate it instead or reassign incidents.`
            );
            error.statusCode = 400;
            throw error;
        }

        await capaStep.destroy();

        await auditService.log({
            entityType: 'capa',
            entityId: capaStep.id,
            entityName: capaStep.stepName,
            action: 'DELETE',
            user: user ? { id: user.id, name: user.name, type: user.userType } : null,
            source: 'ui'
        });

        return { message: 'CAPA step definition deleted successfully' };
    }

    /**
     * Restore CAPA step definition
     */
    async restore(id) {
        const capaStep = await CapaStepDefinition.findByPk(id);

        if (!capaStep) {
            throw new Error('CAPA step definition not found');
        }

        capaStep.isActive = true;
        await capaStep.save();

        return capaStep;
    }

    /**
     * Reorder CAPA steps
     */
    async reorder(steps, user) {
        if (!Array.isArray(steps) || steps.length === 0) {
            throw new Error('Steps array is required');
        }

        // Validate all step numbers are unique and positive
        const stepNumbers = steps.map(s => s.stepNumber);
        const uniqueNumbers = new Set(stepNumbers);

        if (stepNumbers.length !== uniqueNumbers.size) {
            throw new Error('Step numbers must be unique');
        }

        if (stepNumbers.some(num => num < 1)) {
            throw new Error('Step numbers must be positive integers');
        }

        // Update step numbers using transaction
        const transaction = await sequelize.transaction();

        try {
            // Phase 1: Set all to temporary negative numbers to avoid unique constraint violations
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const capaStep = await CapaStepDefinition.findByPk(step.id, { transaction });
                if (capaStep) {
                    capaStep.stepNumber = -(i + 1); // Negative temp number
                    await capaStep.save({ transaction, fields: ['stepNumber'] });
                }
            }

            // Phase 2: Set to actual step numbers
            for (const step of steps) {
                const capaStep = await CapaStepDefinition.findByPk(step.id, { transaction });
                if (capaStep) {
                    capaStep.stepNumber = step.stepNumber;
                    await capaStep.save({ transaction, fields: ['stepNumber'] });
                }
            }

            await transaction.commit();

            // Fetch updated steps
            const allSteps = await this.getAll();

            await auditService.log({
                entityType: 'capa',
                entityId: null, // Module level action
                entityName: 'All Steps',
                action: 'BULK_UPDATE',
                fieldName: 'Reordered CAPA steps',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });

            return allSteps;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new CapaStepService();
