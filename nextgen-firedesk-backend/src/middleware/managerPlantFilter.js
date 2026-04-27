const { Plant } = require("../models/plants");
const { Manager } = require("../models/user-management");


const managerPlantFilter = async (req, res, next) => {
    try {
        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return next({ status: 401, message: "Unauthorized" });
        }

        // Find the manager record for this user
        // This validates they are a manager without strict role name checking
        const manager = await Manager.findOne({
            where: { user_id: req.user.id },
            include: [{
                model: Plant,
                as: 'plants',
                attributes: ['id'],
                through: { attributes: [] } // Exclude junction table attributes
            }]
        });

        if (!manager) {
            // User exists but is not a manager - allow through without filtering
            // This handles admins and organization owners who can access all plants
            console.log(`User ${req.user.id} is not a manager - allowing access to all plants`);
            req.managerPlantIds = []; // Empty array indicates no filtering needed
            req.managerId = null;
            return next();
        }

        // Extract plant IDs
        const plantIds = manager.plants ? manager.plants.map(plant => plant.id) : [];

        // Attach data to request
        req.managerId = manager.id;
        req.managerPlantIds = plantIds;

        // Log for debugging
        console.log(`Manager ${manager.id} (User: ${req.user.id}) has access to ${plantIds.length} plants:`, plantIds);

        // Allow access even if no plants assigned (will just show empty data)
        // This is useful for testing and new managers
        if (plantIds.length === 0) {
            console.warn(`Warning: Manager ${manager.id} has no plants assigned`);
        }

        next();
    } catch (error) {
        console.error("Error in managerPlantFilter middleware:", error);
        console.error("User ID:", req.user?.id);
        console.error("User Role:", req.user?.role?.name);
        return next({
            status: 500,
            message: "Error fetching manager plant assignments",
            error: error.message
        });
    }
};

/**
 * Middleware to validate that a specific plant ID belongs to the manager
 * Use this when the plantId is in req.params or req.body
 * Must be used after managerPlantFilter
 */
const validatePlantAccess = (paramName = 'plantId', source = 'body') => {
    return (req, res, next) => {
        try {
            if (!req.managerPlantIds) {
                return next({
                    status: 500,
                    message: "Plant filter not applied. Use managerPlantFilter middleware first."
                });
            }

            const plantId = source === 'params' ? req.params[paramName] : req.body[paramName];

            if (!plantId) {
                return next({
                    status: 400,
                    message: `${paramName} is required`
                });
            }

            // If managerPlantIds is empty or null, user is not a manager (admin/org owner) - allow access
            if (!req.managerPlantIds || req.managerPlantIds.length === 0) {
                console.log(`User ${req.user.id} is not a manager - allowing access to plant ${plantId}`);
                return next();
            }

            // For managers, validate they have access to this specific plant
            if (!req.managerPlantIds.includes(plantId)) {
                return next({
                    status: 403,
                    message: "Access denied. This plant is not assigned to you."
                });
            }

            next();
        } catch (error) {
            console.error("Error in validatePlantAccess middleware:", error);
            return next({
                status: 500,
                message: "Error validating plant access"
            });
        }
    };
};

module.exports = {
    managerPlantFilter,
    validatePlantAccess
};
