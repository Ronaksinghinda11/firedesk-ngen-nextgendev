const { sequelize } = require('./config/config');
const { User, Technician, Plant, Category, Asset } = require('./src/models');
const { Op } = require('sequelize');

const checkCategoryAssets = async () => {
    try {
        await sequelize.authenticate();
        const phone = '7439746027';
        const user = await User.findOne({ where: { phone } });
        if (!user) return console.log('User not found');

        const technician = await Technician.findOne({
            where: { user_id: user.id },
            include: [
                { model: Plant, as: 'plants' },
                { model: Category, as: 'categories' }
            ]
        });

        console.log(`Technician: ${technician.id}`);
        const plantIds = technician.plants.map(p => p.id);
        const categoryIds = technician.categories.map(c => c.id);

        console.log(`Plant IDs: ${plantIds}`);
        console.log(`Category IDs: ${categoryIds}`);

        if (plantIds.length > 0 && categoryIds.length > 0) {
            const assets = await Asset.count({
                where: {
                    plant_id: { [Op.in]: plantIds },
                    category_id: { [Op.in]: categoryIds }
                }
            });
            console.log(`Category Assets Count: ${assets}`);
        } else {
            console.log('No plants or categories assigned');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
};

checkCategoryAssets();
