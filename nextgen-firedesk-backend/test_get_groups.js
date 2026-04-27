const { sequelize } = require('./config/config');
const inventoryService = require('./src/services/inventory/inventory_service');

async function run() {
  const s = new inventoryService();
  try {
    const res = await s.get_asset_groups({}, []);
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
