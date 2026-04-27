/**
 * Calculate statistics for service reports
 * Provides different metrics based on service type
 *
 * @param {Array} records - Array of service records
 * @param {string} serviceType - Type of service ('Inspection', 'Testing', 'Maintenance')
 * @returns {Object} - Statistics object with relevant metrics
 */
function calculateServiceStats(records, serviceType) {
    const stats = {
        totalRecords: records.length,
        completed: 0,
        pending: 0,
        inProgress: 0,
        approved: 0,
        submitted: 0
    };

    // Count by status
    // Note: APPROVED counts as completed (consistent with dashboard widgets)
    records.forEach(record => {
        const status = record.status ? record.status.toUpperCase() : '';

        switch (status) {
            case 'COMPLETED':
                stats.completed++;
                break;
            case 'PENDING':
                stats.pending++;
                break;
            case 'IN_PROGRESS':
                stats.inProgress++;
                break;
            case 'APPROVED':
                stats.approved++;
                stats.completed++;
                break;
            case 'SUBMITTED':
                stats.submitted++;
                break;
        }
    });

    // Service-specific stats
    if (serviceType === 'Inspection') {
        // Deduplicate by asset ID to count unique assets, not submissions
        const uniqueAssets = new Map();
        records.forEach(r => {
            const assetId = r.asset?.id || r.Asset?.id || r.asset_id;
            const healthStatus = (r.asset?.healthStatus || r.Asset?.healthStatus || r.calculatedHealthStatus || '').toUpperCase();
            if (assetId && !uniqueAssets.has(assetId)) {
                uniqueAssets.set(assetId, healthStatus);
            }
        });

        stats.healthyAssets = Array.from(uniqueAssets.values()).filter(
            hs => hs === 'HEALTHY' || hs === 'GOOD'
        ).length;

        stats.unhealthyAssets = Array.from(uniqueAssets.values()).filter(
            hs => hs === 'NOT_WORKING' || hs === 'NOTWORKING' ||
                hs === 'NEEDS_ATTENTION' || hs === 'NEED_ATTENTION' ||
                hs === 'ATTENTIONREQUIRED'
        ).length;
    } else if (serviceType === 'Testing') {
        // For testing, "passed" means completed/approved
        stats.passed = stats.completed + stats.approved;
        stats.failed = records.filter(r => {
            const status = (r.status || '').toUpperCase();
            return status === 'REJECTED' || status === 'FAILED';
        }).length;
    } else if (serviceType === 'Maintenance') {
        stats.scheduled = records.filter(r => {
            const status = (r.status || '').toUpperCase();
            return status === 'SCHEDULED' || status === 'PENDING';
        }).length;
    }

    return stats;
}

/**
 * Calculate statistics for hydrostatic test reports
 *
 * @param {Array} assets - Array of assets
 * @returns {Object} - Statistics object
 */
function calculateHydroStats(assets) {
    const now = new Date();

    return {
        totalAssets: assets.length,
        testedInPeriod: assets.filter(a => a.lastHPTestDate).length,
        overdueTests: assets.filter(a => {
            if (!a.nextHPTestDueDate) return false;
            return new Date(a.nextHPTestDueDate) < now;
        }).length,
        upcomingTests: assets.filter(a => {
            if (!a.nextHPTestDueDate) return false;
            const dueDate = new Date(a.nextHPTestDueDate);
            const thirtyDaysFromNow = new Date(now);
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            return dueDate >= now && dueDate <= thirtyDaysFromNow;
        }).length,
    };
}

/**
 * Calculate statistics for refilling reports
 *
 * @param {Array} assets - Array of assets
 * @returns {Object} - Statistics object
 */
function calculateRefillingStats(assets) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return {
        totalAssets: assets.length,
        refilledInPeriod: assets.filter(a => a.lastRefilledDate || a.refilledOn).length,
        refilledLast30Days: assets.filter(a => {
            const refilledDate = a.lastRefilledDate || a.refilledOn;
            if (!refilledDate) return false;
            return new Date(refilledDate) >= thirtyDaysAgo;
        }).length,
        neverRefilled: assets.filter(a => !a.lastRefilledDate && !a.refilledOn).length,
    };
}

module.exports = {
    calculateServiceStats,
    calculateHydroStats,
    calculateRefillingStats
};
