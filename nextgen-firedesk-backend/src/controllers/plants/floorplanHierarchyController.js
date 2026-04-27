/**
 * Floorplan Hierarchy Controller
 * Provides a hierarchical view of plants, buildings, and floors with layout info
 */

const { Plant, Building, Floor, Layout, Manager } = require('../../models/plants');
const { Op } = require('sequelize');

const floorplanHierarchyController = {
    /**
     * Get all plants with their buildings and floors for floorplan viewer
     */
    async getHierarchy(req, res) {
        try {
            // Build where clause for plants
            const plantWhere = { status: 'Active' };

            // Filter by manager's assigned plants if user is a manager
            if (req.user && req.user.user_type === 'manager') {
                let managerPlantIds = req.managerPlantIds;

                if (!managerPlantIds) {
                    // Fallback: fetch manager's plants directly
                    const manager = await Manager.findOne({
                        where: { user_id: req.user.id },
                        include: [{
                            model: Plant,
                            as: 'plants',
                            attributes: ['id'],
                            through: { attributes: [] }
                        }]
                    });

                    if (!manager) {
                        return res.status(403).json({
                            success: false,
                            message: 'Manager not found'
                        });
                    }

                    managerPlantIds = (manager.plants || []).map(p => p.id);
                }

                // If manager has assigned plants, filter by them
                if (managerPlantIds && managerPlantIds.length > 0) {
                    plantWhere.id = { [Op.in]: managerPlantIds };
                } else {
                    // Manager has no plants assigned - return empty array
                    return res.status(200).json({
                        success: true,
                        data: []
                    });
                }
            }

            const plants = await Plant.findAll({
                where: plantWhere,
                attributes: ['id', 'plant_name', 'address_line1', 'total_plant_area'],
                order: [['plant_name', 'ASC']],
                include: [
                    {
                        model: Building,
                        as: 'buildings',
                        attributes: ['id', 'building_name', 'plant_id'],
                        include: [
                            {
                                model: Floor,
                                as: 'floors',
                                attributes: ['id', 'floor_name', 'building_id', 'floor_area'],
                                include: [
                                    {
                                        model: Layout,
                                        as: 'layout',
                                        attributes: ['id', 'floor_id', 'file_name', 'health_status'],
                                        required: false
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            // Transform the data to match frontend expectations
            const transformedPlants = plants.map(plant => ({
                id: plant.id,
                name: plant.plant_name,
                description: plant.address_line1 || '',
                buildings: (plant.buildings || []).map(building => ({
                    id: building.id,
                    name: building.building_name,
                    location: '',
                    floors: (building.floors || []).map(floor => ({
                        id: floor.id,
                        name: floor.floor_name,
                        level: parseInt(floor.floor_name.match(/\d+/)?.[0]) || 1,
                        hasFloorplan: floor.layout !== null && floor.layout !== undefined,
                        layoutId: floor.layout?.id || null
                    }))
                }))
            }));

            res.status(200).json({
                success: true,
                data: transformedPlants
            });
        } catch (error) {
            console.error('Error fetching floorplan hierarchy:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch floorplan hierarchy',
                error: error.message
            });
        }
    }
};

module.exports = floorplanHierarchyController;
