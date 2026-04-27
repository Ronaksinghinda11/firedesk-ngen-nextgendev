/**
 * Compliance Score Scheduler
 * Daily cron job to recalculate compliance scores for all assets
 * Runs at midnight to ensure scores stay current based on:
 * - Asset lifespan aging
 * - Services becoming due/overdue
 */

const cron = require('node-cron');

// Scheduler status
let schedulerStatus = {
    isRunning: false,
    lastRun: null,
    lastDuration: null,
    assetsProcessed: 0,
    assetsFailed: 0,
    totalAssets: 0
};

/**
 * Lazy load compliance score service to avoid circular dependencies
 */
const getComplianceScoreService = () => {
    try {
        return require('../services/assets/complianceScoreService');
    } catch (error) {
        console.error('Error loading compliance score service:', error.message);
        return null;
    }
};

/**
 * Lazy load Asset model
 */
const getAssetModel = () => {
    try {
        return require('../models/assets/Asset');
    } catch (error) {
        console.error('Error loading Asset model:', error.message);
        return null;
    }
};

/**
 * Recalculate compliance scores for all assets with batch processing
 * and rate limiting to prevent database overload
 */
const recalculateAllComplianceScores = async () => {
    if (schedulerStatus.isRunning) {
        console.log('⚠️ Compliance score recalculation already running, skipping...');
        return;
    }

    console.log('\n' + '━'.repeat(60));
    console.log('🔄 COMPLIANCE SCORE RECALCULATION - DAILY JOB');
    console.log('━'.repeat(60));

    schedulerStatus.isRunning = true;
    const startTime = Date.now();

    try {
        const complianceScoreService = getComplianceScoreService();
        const Asset = getAssetModel();

        if (!complianceScoreService || !Asset) {
            console.log('   ⚠️ Skipping - required services/models not available');
            schedulerStatus.isRunning = false;
            return;
        }

        // Fetch all non-deleted assets (only IDs for memory efficiency)
        const assets = await Asset.findAll({
            where: { deleted_at: null },
            attributes: ['id'],
            order: [['created_at', 'ASC']] // Process oldest assets first
        });

        schedulerStatus.totalAssets = assets.length;
        console.log(`📊 Found ${assets.length} assets to process\n`);

        if (assets.length === 0) {
            console.log('✅ No assets to process');
            schedulerStatus.isRunning = false;
            return;
        }

        let processed = 0;
        let failed = 0;
        const BATCH_SIZE = 50; // Process 50 assets at a time
        const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

        // Process in batches to avoid overwhelming the database
        for (let i = 0; i < assets.length; i += BATCH_SIZE) {
            const batch = assets.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(assets.length / BATCH_SIZE);

            console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} assets)...`);

            // Process batch in parallel (but batches sequentially)
            const batchResults = await Promise.allSettled(
                batch.map(asset => complianceScoreService.updateComplianceScore(asset.id))
            );

            // Count successes and failures
            batchResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    processed++;
                } else {
                    failed++;
                    console.error(`   ❌ Failed: ${result.reason?.message || 'Unknown error'}`);
                }
            });

            // Progress update
            const progressPercent = ((processed + failed) / assets.length * 100).toFixed(1);
            console.log(`   ✅ Batch complete: ${processed} succeeded, ${failed} failed (${progressPercent}% total progress)`);

            // Delay between batches to prevent database overload
            // Skip delay on last batch
            if (i + BATCH_SIZE < assets.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
        }

        // Update scheduler status
        schedulerStatus.assetsProcessed = processed;
        schedulerStatus.assetsFailed = failed;
        schedulerStatus.lastRun = new Date();
        schedulerStatus.lastDuration = Date.now() - startTime;

        console.log('\n' + '━'.repeat(60));
        console.log('✅ COMPLIANCE SCORE RECALCULATION COMPLETE');
        console.log('━'.repeat(60));
        console.log(`📊 Total Assets: ${assets.length}`);
        console.log(`✅ Successfully Processed: ${processed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⏱️  Duration: ${(schedulerStatus.lastDuration / 1000).toFixed(2)}s`);
        console.log(`🕐 Completed at: ${schedulerStatus.lastRun.toLocaleString()}`);
        console.log('━'.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Error in compliance score recalculation:', error);
        console.error('   Stack trace:', error.stack);
    } finally {
        schedulerStatus.isRunning = false;
    }
};

/**
 * Initialize the compliance score scheduler
 * Runs daily at midnight IST
 */
const initScheduler = () => {
    console.log('⏰ Initializing Compliance Score Scheduler...');

    // Daily at 12:00 AM (midnight) IST
    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 [12 AM] Running daily compliance score recalculation');
        await recalculateAllComplianceScores();
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('   ✅ Scheduled: Daily at 12:00 AM IST');
    console.log('   📋 Task: Recalculate compliance scores for all assets');
    console.log('   ⚡ Optimization: Batch processing (50 assets/batch) with 1s delay');

    // Optional: Run immediately on startup for testing (comment out in production)
    // setTimeout(() => recalculateAllComplianceScores(), 5000);
};

/**
 * Get scheduler status
 * @returns {Object} Scheduler status
 */
const getSchedulerStatus = () => ({
    name: 'Compliance Score Scheduler',
    ...schedulerStatus
});

/**
 * Manually trigger compliance score recalculation
 * @returns {Promise<void>}
 */
const triggerManualRun = async () => {
    if (schedulerStatus.isRunning) {
        throw new Error('Compliance score recalculation is already running');
    }
    await recalculateAllComplianceScores();
};

module.exports = {
    initScheduler,
    getSchedulerStatus,
    triggerManualRun,
    recalculateAllComplianceScores
};
