
const path = require('path');
require('./nextgen-firedesk-backend/node_modules/dotenv').config({ path: path.join(__dirname, 'nextgen-firedesk-backend', '.env') });
const { Category, Product, sequelize } = require('./nextgen-firedesk-backend/src/models');

async function checkMasterData() {
    try {
        console.log('\n--- Products by Category ---');
        const categories = await Category.findAll({
            include: [{ model: Product, as: 'products' }]
        });

        categories.forEach(c => {
            console.log(`\nCategory: ${c.category_name} (${c.products.length} products)`);
            c.products.forEach(p => console.log(`  - ${p.product_name} (ID: ${p.id})`));
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkMasterData();
