const { sequelize } = require('../config/config');
const { QueryTypes } = require('sequelize');
async function check() {
    try {
        const rows = await sequelize.query(`
            SELECT ss.asset_id, a.asset_code, COUNT(*)::int AS service_count
            FROM service_submissions ss
            LEFT JOIN assets a ON ss.asset_id = a.id
            WHERE ss.status NOT IN ('cancelled', 'CANCELLED')
            GROUP BY ss.asset_id, a.asset_code
            ORDER BY service_count DESC
            LIMIT 20
        `, { type: QueryTypes.SELECT });
        console.log('\n=== Assets and their service counts ===');
        rows.forEach(r => console.log(`  ${r.asset_code || 'NULL'} (id: ${r.asset_id}) => ${r.service_count} services`));
    } catch (e) { console.error(e.message); }
    finally { await sequelize.close(); }
}
check();
