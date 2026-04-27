/**
 * Asset Health Service
 * Manages asset health status based on service submission results
 */

const { sequelize } = require('../../../config/config');
const {
    Asset,
    AssetActiveCondition,
    Condition,
    ServiceSubmission,
    ServiceAnswer,
    Technician
} = require('../../models');

// Lazy-load complianceScoreService to avoid circular dependency
let complianceScoreService = null;
const getComplianceScoreService = () => {
    if (!complianceScoreService) {
        complianceScoreService = require('./complianceScoreService');
    }
    return complianceScoreService;
};

class AssetHealthService {
    /**
     * Update asset health status and conditions based on approved service
     * Main entry point called when a service is approved
     */
    async updateAssetHealthFromService(assetId, submissionId) {
        const transaction = await sequelize.transaction();

        try {
            // Get the service submission with answers and technician info
            const submission = await ServiceSubmission.findByPk(submissionId, {
                include: [
                    {
                        model: ServiceAnswer,
                        as: 'answers',
                        include: [{
                            model: Condition,
                            as: 'selectedCondition',
                            attributes: ['id', 'condition_code', 'condition_name', 'severity_level', 'priority_score']
                        }]
                    },
                    {
                        model: Technician,
                        as: 'technician',
                        attributes: ['id', 'user_id']
                    },
                    {
                        model: Technician,
                        as: 'submitter',
                        attributes: ['id', 'user_id']
                    }
                ]
            });

            if (!submission) {
                throw new Error('Service submission not found');
            }

            // Update active conditions based on answers
            await this.updateAssetConditions(assetId, submission.answers, submissionId, transaction);

            // Calculate and update asset health status
            const healthStatus = await this.calculateAssetHealthStatus(assetId, transaction);

            // Get current asset to check for health status change
            const currentAsset = await Asset.findByPk(assetId, { transaction });
            const oldHealthStatus = currentAsset?.health_status;
            const healthChanged = healthStatus && healthStatus !== oldHealthStatus;

            // Get active conditions to store in conditions JSONB field
            const activeConditions = await AssetActiveCondition.findAll({
                where: { asset_id: assetId },
                include: [{
                    model: Condition,
                    as: 'condition',
                    attributes: ['condition_name', 'severity_level']
                }],
                transaction
            });

            //Build conditions array for JSONB field
            const conditionsArray = activeConditions.map(ac => ac.condition?.condition_name).filter(Boolean);

            // Update asset with health status AND conditions
            await Asset.update({
                health_status: healthStatus,
                conditions: conditionsArray.length > 0 ? conditionsArray : null
            }, {
                where: { id: assetId },
                transaction
            });

            console.log(`  📝 Updated asset conditions field: [${conditionsArray.join(', ')}]`);

            // Record health status change in history if it changed
            if (healthChanged) {
                // Resolve the User ID (changed_by requires User ID, not Technician ID)
                const changedByUserId = submission.technician?.user_id || submission.submitter?.user_id;

                const AssetStatusHistory = require('../../models/assets/asset_status_history');
                await AssetStatusHistory.create({
                    asset_id: assetId,
                    old_health_statuses: [oldHealthStatus],
                    new_health_status: healthStatus,
                    changed_by: changedByUserId, // Use User ID
                    changed_at: new Date(),
                    source_type: 'SERVICE_SUBMISSION',
                    source_id: submissionId
                }, { transaction });

                console.log(`  📊 Recorded health status change: ${oldHealthStatus} → ${healthStatus} (by User ${changedByUserId})`);
            }

            await transaction.commit();

            // Recalculate compliance score after conditions change (fire-and-forget, non-blocking)
            getComplianceScoreService().updateComplianceScore(assetId)
                .then(score => {
                    console.log(`📊 Updated compliance score for asset ${assetId}: ${score}%`);
                })
                .catch(scoreError => {
                    console.error('⚠️ Error recalculating compliance score:', scoreError.message);
                });

            console.log(`✅ Asset ${assetId} health updated to ${healthStatus}`);

            return { healthStatus };
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error updating asset health:', error);
            throw error;
        }
    }

    /**
     * Update active conditions for an asset based on service answers
     * - Add condition if answer is non-compliant
     * - Remove condition if answer is compliant (clears the issue)
     */
    async updateAssetConditions(assetId, answers, submissionId, transaction) {
        if (!answers || answers.length === 0) {
            return;
        }

        for (const answer of answers) {
            const complianceStatus = answer.compliance_status?.toUpperCase();

            // Check both selected_condition_id and non_compliance_condition_id
            // Service forms may populate either field depending on question type
            const conditionId = answer.selected_condition_id || answer.non_compliance_condition_id;

            if (complianceStatus === 'NON_COMPLIANT' && conditionId) {
                // Add or update active condition
                await AssetActiveCondition.upsert({
                    asset_id: assetId,
                    condition_id: conditionId,
                    question_id: answer.question_id,
                    severity_level: answer.severity_level,
                    priority_score: answer.priority_score || 0,
                    detected_at: answer.answered_at || new Date(),
                    last_submission_id: submissionId,
                }, { transaction });

                console.log(`  ➕ Added/Updated condition for question ${answer.question_id} (${answer.severity_level}), condition: ${conditionId}`);
            }
            else if (complianceStatus === 'COMPLIANT' && answer.question_id) {
                // Remove any active condition for this question (clears the issue)
                const deleted = await AssetActiveCondition.destroy({
                    where: {
                        asset_id: assetId,
                        question_id: answer.question_id,
                    },
                    transaction
                });

                if (deleted > 0) {
                    console.log(`  ✅ Removed condition for question ${answer.question_id} (now compliant)`);
                }
            }
            // N/A answers don't affect conditions
        }
    }

    /**
     * Calculate asset health status based on active conditions
     * Returns the health status based on highest priority active condition
     */
    async calculateAssetHealthStatus(assetId, transaction) {
        // Get all active conditions for this asset, ordered by priority (highest first)
        const activeConditions = await AssetActiveCondition.findAll({
            where: { asset_id: assetId },
            include: [{
                model: Condition,
                as: 'condition',
                attributes: ['id', 'condition_code', 'condition_name', 'severity_level', 'priority_score']
            }],
            order: [['priority_score', 'DESC']],
            transaction
        });

        // No active conditions = healthy
        if (activeConditions.length === 0) {
            return 'HEALTHY';
        }

        // Count conditions by severity
        const criticalCount = activeConditions.filter(c => c.severity_level === 'CRITICAL').length;
        const highCount = activeConditions.filter(c => c.severity_level === 'HIGH').length;
        const mediumCount = activeConditions.filter(c => c.severity_level === 'MEDIUM').length;

        console.log(`  📊 Active conditions: CRITICAL=${criticalCount}, HIGH=${highCount}, MEDIUM=${mediumCount}`);

        // Determine health status based on severity counts
        if (criticalCount > 0) {
            return 'NOT_WORKING';
        }

        if (highCount > 0 || mediumCount >= 3) {
            return 'NEEDS_ATTENTION';
        }

        // Has some low/medium issues but not severe
        if (mediumCount > 0) {
            return 'NEEDS_ATTENTION';
        }

        return 'HEALTHY';
    }

    /**
     * Get active conditions for an asset
     * Useful for displaying what issues an asset currently has
     */
    async getAssetActiveConditions(assetId) {
        return await AssetActiveCondition.findAll({
            where: { asset_id: assetId },
            include: [{
                model: Condition,
                as: 'condition',
                attributes: ['id', 'condition_code', 'condition_name', 'severity_level', 'priority_score', 'health_impact']
            }],
            order: [['priority_score', 'DESC'], ['detected_at', 'ASC']]
        });
    }

    /**
     * Get count of active conditions by severity for an asset
     */
    async getAssetConditionsSummary(assetId) {
        const conditions = await this.getAssetActiveConditions(assetId);

        return {
            total: conditions.length,
            critical: conditions.filter(c => c.severity_level === 'CRITICAL').length,
            high: conditions.filter(c => c.severity_level === 'HIGH').length,
            medium: conditions.filter(c => c.severity_level === 'MEDIUM').length,
            low: conditions.filter(c => c.severity_level === 'LOW').length,
        };
    }
}

module.exports = new AssetHealthService();
