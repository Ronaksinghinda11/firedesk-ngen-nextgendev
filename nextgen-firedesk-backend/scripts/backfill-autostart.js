/**
 * One-time backfill: Compute last_auto_start_date from existing history
 * for all IoTLiveDataPR records that don't have it set yet.
 * 
 * Run AFTER the migration: node scripts/backfill-autostart.js
 * 
 * This scans the full PS/AS history (one-time cost) and sets the
 * last_auto_start_date column. After this, the beforeSave hook
 * handles all future updates incrementally (O(1)).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { IoTLiveDataPR } = require('../src/models/iot');

/**
 * Scan history to find the most recent auto-start event (Diesel only: AS3/PS3).
 * Auto-start = AS3 goes Auto(1) → Manual(0) AND PS3 goes OFF(1) → ON(0)
 */
function findLastAutoStart(history) {
    if (!history || !history.AS3 || !history.PS3) return null;

    const asHistory = history.AS3;
    const psHistory = history.PS3;
    if (asHistory.length < 2 || psHistory.length < 2) return null;

    // Walk PS3 history backwards to find OFF(1) → ON(0) transitions
    for (let i = psHistory.length - 1; i > 0; i--) {
        const currPS = Number(psHistory[i].data);
        const prevPS = Number(psHistory[i - 1].data);

        if (prevPS === 1 && currPS === 0) {
            const transitionTime = new Date(psHistory[i].date || psHistory[i].timestamp);
            const transitionTs = transitionTime.getTime();

            // Check for AS3 Auto(1) → Manual(0) near this time
            for (let j = asHistory.length - 1; j > 0; j--) {
                const currAS = Number(asHistory[j].data);
                const prevAS = Number(asHistory[j - 1].data);
                const asTime = new Date(asHistory[j].date || asHistory[j].timestamp).getTime();

                if (prevAS === 1 && currAS === 0 && Math.abs(asTime - transitionTs) <= 60000) {
                    return transitionTime; // Most recent match — done
                }
            }
        }
    }

    return null;
}

async function backfill() {
    console.log('[Backfill] 🚀 Starting last_auto_start_date backfill...');

    const records = await IoTLiveDataPR.findAll({
        attributes: ['id', 'device_id', 'history', 'last_auto_start_date']
    });
    console.log(`[Backfill] Found ${records.length} device(s) to process`);

    let updated = 0;
    let skipped = 0;

    for (const record of records) {
        // Skip if already has a value
        if (record.last_auto_start_date) {
            console.log(`[Backfill] ⏭️  ${record.device_id}: already set (${record.last_auto_start_date})`);
            skipped++;
            continue;
        }

        const lastAutoStart = findLastAutoStart(record.history);

        if (lastAutoStart) {
            // Update the column directly (skip hooks to avoid re-triggering history changes)
            await IoTLiveDataPR.update(
                { last_auto_start_date: lastAutoStart },
                { where: { id: record.id }, hooks: false }
            );
            console.log(`[Backfill] ✅ ${record.device_id}: set to ${lastAutoStart.toISOString()}`);
            updated++;
        } else {
            console.log(`[Backfill] ⏭️  ${record.device_id}: no auto-start found in history`);
            skipped++;
        }
    }

    console.log(`\n[Backfill] Done. Updated: ${updated}, Skipped: ${skipped}`);
    process.exit(0);
}

backfill().catch(err => {
    console.error('[Backfill] ❌ Error:', err);
    process.exit(1);
});
