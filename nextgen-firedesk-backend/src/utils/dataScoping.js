/**
 * Data Scoping Utilities
 * Helpers for scoping data access based on user roles and assignments
 */

const { Manager, PlantManager, PlantCategory } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all plant IDs assigned to a manager
 * @param {string} userId - The USER ID of the manager (not manager profile ID)
 * @returns {Promise<string[]>} - Array of plant IDs
 */
const getManagerPlantIds = async (userId) => {
    try {
        if (!userId) return [];

        // 1. Get Manager profile from User ID
        const manager = await Manager.findOne({
            where: { user_id: userId }
        });

        if (!manager) {
            console.warn(`[DataScoping] No manager profile found for user ${userId}`);
            return [];
        }

        // 2. Get assigned plants from PlantManager
        const assignments = await PlantManager.findAll({
            where: { manager_id: manager.id },
            attributes: ['plant_id']
        });

        const plantIds = assignments.map(a => a.plant_id);
        console.log(`[DataScoping] Manager ${userId} (Profile: ${manager.id}) has access to ${plantIds.length} plants`);

        return plantIds;

    } catch (error) {
        console.error('[DataScoping] Error fetching manager plant IDs:', error);
        return [];
    }
};

/**
 * Get all category IDs assigned to a manager (via their assigned plants)
 * @param {string} userId - The USER ID of the manager
 * @returns {Promise<string[]>} - Array of category IDs
 */
const getManagerCategoryIds = async (userId) => {
    try {
        // 1. Get Plant IDs
        const plantIds = await getManagerPlantIds(userId);

        if (!plantIds || plantIds.length === 0) {
            return [];
        }

        // 2. Get Categories associated with these plants
        const plantCategories = await PlantCategory.findAll({
            where: {
                plant_id: {
                    [Op.in]: plantIds
                }
            },
            attributes: ['category_id']
        });

        // 3. Extract and deduplicate category IDs
        const categoryIds = [...new Set(plantCategories.map(pc => pc.category_id))];

        console.log(`[DataScoping] Manager ${userId} has access to ${categoryIds.length} categories via ${plantIds.length} plants`);
        return categoryIds;

    } catch (error) {
        console.error('[DataScoping] Error fetching manager category IDs:', error);
        return [];
    }
};

module.exports = {
    getManagerPlantIds,
    getManagerCategoryIds
};
