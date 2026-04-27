/**
 * Floor Controller
 * Handles HTTP requests for floor operations
 */

const floorService = require('../../services/plants/floorService');

const floorController = {
    /**
     * Get all floors, optionally filtered by buildingId
     * Query params: ?buildingId=<uuid>
     */
    async getAll(req, res) {
        try {
            const { buildingId } = req.query;

            const floors = await floorService.getAll(buildingId);

            // Transform to camelCase for frontend
            const transformedFloors = floors.map(f => ({
                id: f.id,
                buildingId: f.building_id,
                floorName: f.floor_name,
                floorNumber: f.floor_number,
                floorArea: f.floor_area,
                // Include wings array for dropdown population
                wings: f.wings ? f.wings.map(w => ({
                    id: w.id,
                    wingName: w.wing_name,
                    wing_name: w.wing_name // Also include snake_case for compatibility
                })) : [],
                building: f.building ? {
                    id: f.building.id,
                    buildingName: f.building.building_name,
                    plant: f.building.plant ? {
                        id: f.building.plant.id,
                        plantName: f.building.plant.plant_name
                    } : null
                } : null,
                // Include wings array for dropdown population
                wings: f.wings ? f.wings.map(w => ({
                    id: w.id,
                    wingName: w.wing_name,
                    wing_name: w.wing_name // Also include snake_case for compatibility
                })) : [],
            }));

            return res.status(200).json({
                success: true,
                data: transformedFloors,
                count: floors.length
            });
        } catch (error) {
            console.error('Get floors error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve floors',
                error: error.message
            });
        }
    },

    /**
     * Get a single floor by ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            const floor = await floorService.getById(id);

            if (!floor) {
                return res.status(404).json({
                    success: false,
                    message: 'Floor not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: floor
            });
        } catch (error) {
            console.error('Get floor by ID error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve floor',
                error: error.message
            });
        }
    }
};

module.exports = floorController;
