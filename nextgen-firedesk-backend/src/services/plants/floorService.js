/**
 * Floor Service
 * Business logic for floor operations
 */

const { Floor, Building, Plant, Wing, Layout } = require('../../models/plants');

/**
 * Get all floors with optional building filter
 * @param {string|null} buildingId - Optional building ID to filter by
 * @returns {Promise<Array>} Array of floor objects
 */
const getAll = async (buildingId = null) => {
    const whereClause = {};
    if (buildingId) {
        whereClause.building_id = buildingId;
    }

    const floors = await Floor.findAll({
        where: whereClause,
        order: [['floor_name', 'ASC']],
        include: [
            {
                model: Building,
                as: 'building',
                attributes: ['id', 'building_name'],
                include: [{
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', 'plant_name']
                }]
            },
            {
                model: Wing,
                as: 'wings',
                attributes: ['id', 'wing_name']
            },
            {
                model: Layout,
                as: 'layout',
                attributes: ['id', 'mime_type', 'file_name'],
                required: false
            }
        ]
    });

    return floors;
};

/**
 * Get floor by ID with full relations
 * @param {string} id - Floor UUID
 * @returns {Promise<Object|null>} Floor object or null
 */
const getById = async (id) => {
    const floor = await Floor.findByPk(id, {
        include: [
            {
                model: Building,
                as: 'building',
                include: [{
                    model: Plant,
                    as: 'plant'
                }]
            },
            {
                model: Wing,
                as: 'wings'
            },
            {
                model: Layout,
                as: 'layout',
                required: false
            }
        ]
    });

    return floor;
};

module.exports = {
    getAll,
    getById
};
