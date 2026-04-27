/**
 * Compliance Score Service
 * Calculates and updates asset compliance score based on the Compliance Score Matrix:
 * 
 * OAC (Optimal Asset Compliance) = 100%
 * - Condition (AC): 50% weight - If any one Critical condition present: OAC - 50%
 * - Service (AS): 25% weight - If any Open Ticket or Service Due/Overdue: OAC - 25%
 * - Lifecycle (AL): 25% weight - If Lifespan Years exceeds the limit: OAC - 25%
 */

const { Op } = require('sequelize');
const { sequelize } = require('../../../config/config');
const {
    Asset,
    AssetActiveCondition,
    Ticket,
    ServiceSubmission
} = require('../../models');

class ComplianceScoreService {
    /**
     * Calculate compliance score for an asset
     * @param {string} assetId - UUID of the asset
     * @returns {number} Compliance score (0-100)
     */
    async calculateComplianceScore(assetId) {
        let score = 100; // OAC = 100%

        const asset = await Asset.findByPk(assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }

        // NOTE: Conditions are updated in real-time via triggers, but we still
        // check them here for data consistency and as a safety net
        // 1. Condition (AC) - 50% weight
        // Check if any Critical condition is present
        const criticalConditionCount = await AssetActiveCondition.count({
            where: {
                asset_id: assetId,
                severity_level: 'CRITICAL'
            }
        });

        if (criticalConditionCount > 0) {
            score -= 50;
            console.log(`  📉 Asset ${assetId}: -50% for Critical condition`);
        }

        // 2. Service (AS) - 25% weight
        // Check if any Open Ticket or Service Due/Overdue
        const openTicketCount = await Ticket.count({
            where: {
                asset_id: assetId,
                completed_status: {
                    [Op.notIn]: ['Completed']
                }
            }
        });

        // Check for services that are overdue
        // A service is overdue if:
        // 1. scheduled_date is strictly in the past (before today)
        // 2. status is still active/incomplete — excludes all terminal states:
        //    - 'submitted'  : technician has completed the work, pending manager review
        //    - 'approved'   : fully done and accepted
        //    - 'rejected'   : terminal state, service was reviewed and closed
        //    - 'cancelled'  : intentionally cancelled
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

        const dueOrOverdueServiceCount = await ServiceSubmission.count({
            where: {
                asset_id: assetId,
                scheduled_date: {
                    [Op.lt]: today // Strictly less than today (past only)
                },
                status: {
                    [Op.notIn]: ['submitted', 'approved', 'rejected', 'cancelled']
                }
            }
        });

        if (openTicketCount > 0 || dueOrOverdueServiceCount > 0) {
            score -= 25;
            console.log(`  📉 Asset ${assetId}: -25% for Open Ticket or Service Overdue (past scheduled_date)`);
        }

        // 3. Lifecycle (AL) - 25% weight
        // Check if asset has exceeded its lifespan based on manufacturing_date
        // (physical age of the asset from when it was made, not when it was installed)
        if (asset.manufacturing_date && asset.lifespan_years) {
            const manufacturingDate = new Date(asset.manufacturing_date);
            const lifespanEndDate = new Date(manufacturingDate);
            lifespanEndDate.setFullYear(lifespanEndDate.getFullYear() + asset.lifespan_years);

            const today = new Date();
            if (today > lifespanEndDate) {
                score -= 25;
                console.log(`  📉 Asset ${assetId}: -25% for Lifespan exceeded (manufactured: ${asset.manufacturing_date}, expired: ${lifespanEndDate.toISOString().split('T')[0]})`);
            }
        }

        return Math.max(0, score); // Ensure score doesn't go below 0
    }

    /**
     * Update compliance score for an asset
     * @param {string} assetId - UUID of the asset
     * @param {object} transaction - Optional Sequelize transaction
     * @returns {number} Updated compliance score
     */
    async updateComplianceScore(assetId, transaction = null) {
        const score = await this.calculateComplianceScore(assetId);

        await Asset.update(
            { compliance_score: score },
            { 
                where: { id: assetId },
                transaction
            }
        );

        console.log(`✅ Asset ${assetId} compliance score updated to ${score}%`);
        return score;
    }

    /**
     * Recalculate compliance scores for all assets
     * Useful for batch updates or initial data migration
     * @returns {object} Summary of updated assets
     */
    async recalculateAllComplianceScores() {
        console.log('🔄 Recalculating compliance scores for all assets...');

        const assets = await Asset.findAll({
            where: { deleted_at: null },
            attributes: ['id']
        });

        let updated = 0;
        let failed = 0;

        for (const asset of assets) {
            try {
                await this.updateComplianceScore(asset.id);
                updated++;
            } catch (error) {
                console.error(`❌ Failed to update compliance score for asset ${asset.id}:`, error.message);
                failed++;
            }
        }

        console.log(`✅ Compliance score recalculation complete: ${updated} updated, ${failed} failed`);
        return { updated, failed, total: assets.length };
    }

    /**
     * Recalculate compliance scores for assets in a specific plant
     * @param {string} plantId - UUID of the plant
     * @returns {object} Summary of updated assets
     */
    async recalculateComplianceScoresByPlant(plantId) {
        console.log(`🔄 Recalculating compliance scores for plant ${plantId}...`);

        const assets = await Asset.findAll({
            where: { 
                plant_id: plantId,
                deleted_at: null 
            },
            attributes: ['id']
        });

        let updated = 0;
        let failed = 0;

        for (const asset of assets) {
            try {
                await this.updateComplianceScore(asset.id);
                updated++;
            } catch (error) {
                console.error(`❌ Failed to update compliance score for asset ${asset.id}:`, error.message);
                failed++;
            }
        }

        console.log(`✅ Compliance score recalculation complete for plant: ${updated} updated, ${failed} failed`);
        return { updated, failed, total: assets.length };
    }
}

module.exports = new ComplianceScoreService();
