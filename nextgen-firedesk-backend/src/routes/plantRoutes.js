/**
 * Plant Routes
 * Defines all API routes for plants module with RBAC protection
 */

const express = require('express');
const router = express.Router();

// Controllers
const plantController = require('../controllers/plants/plant_controller');
const organizationController = require('../controllers/plants/organizationController');

// Middleware
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../utils/permission_constants');
const { managerPlantFilter } = require('../middleware/managerPlantFilter');

// ============================================================================
// ORGANIZATION ROUTES
// ============================================================================

/**
 * @route   GET /organization
 * @desc    Get organization details
 * @access  Private - Requires PLANTS.READ
 */
router.get('/organization', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.READ), organizationController.getOrganization);

/**
 * @route   POST /organization
 * @desc    Create new organization (limit 1)
 * @access  Private - Requires PLANTS.CREATE
 */
router.post('/organization', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.CREATE), organizationController.createOrganization);

/**
 * @route   PUT /organization/:id
 * @desc    Update organization
 * @access  Private - Requires PLANTS.UPDATE
 */
router.put('/organization/:id', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.UPDATE), organizationController.updateOrganization);


// ============================================================================
// PLANT ROUTES
// ============================================================================

/**
 * @route   GET /plants
 * @desc    Get all plants with filters (filtered by manager plant assignments)
 * @access  Private - Requires PLANTS.READ
 */
router.get('/plants', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.READ), managerPlantFilter, plantController.getAll);

/**
 * @route   GET /plants/active
 * @desc    Get active plants for dropdowns (filtered by manager plant assignments)
 * @access  Private - Requires PLANTS.READ
 */
router.get('/plants/active', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.READ), managerPlantFilter, plantController.getActive);

/**
 * @route   GET /plants/:id
 * @desc    Get plant by ID with full details
 * @access  Private - Requires PLANTS.READ
 */
router.get('/plants/:id', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.READ), plantController.getById);

/**
 * @route   POST /plants
 * @desc    Create a new plant
 * @access  Private - Requires PLANTS.CREATE
 */
router.post('/plants', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.CREATE), plantController.create);

/**
 * @route   PUT /plants/:id
 * @desc    Update a plant
 * @access  Private - Requires PLANTS.UPDATE
 */
router.put('/plants/:id', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.UPDATE), plantController.update);

/**
 * @route   DELETE /plants/:id
 * @desc    Delete a plant
 * @access  Private - Requires PLANTS.DELETE
 */
router.delete('/plants/:id', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.DELETE), plantController.delete);

// ============================================================================
// COMPATIBILITY ROUTES (for frontend using singular /plant)
// These also require PLANTS.READ permission
// ============================================================================

/**
 * @route   GET /plant
 * @desc    Get all plants (compatibility for frontend calling /plant)
 * @access  Private - Requires PLANTS.READ
 */
router.get('/plant', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.READ), managerPlantFilter, plantController.getActive);

/**
 * @route   GET /plant/active
 * @desc    Get active plants for dropdowns (filtered by manager plant assignments)
 * @access  Private - Requires PLANTS.READ
 */
router.get('/plant/active', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.READ), managerPlantFilter, plantController.getActive);

/**
 * @route   GET /plant/:id
 * @desc    Get plant by ID (compatibility)
 * @access  Private - Requires PLANTS.READ
 */
router.get('/plant/:id', auth, requirePermission(ENTITIES.PLANTS, ACTIONS.READ), plantController.getById);

// ============================================================================
// ALERTS ROUTES (placeholder - returns empty array for now)
// ============================================================================

/**
 * @route   GET /alerts
 * @desc    Get all alerts (placeholder)
 * @access  Private
 */
router.get('/alerts', auth, async (req, res) => {
    res.status(200).json({
        success: true,
        alerts: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }
    });
});

/**
 * @route   GET /alerts/counts
 * @desc    Get alert counts (placeholder)
 * @access  Private
 */
router.get('/alerts/counts', auth, async (req, res) => {
    // Return counts inside data property as expected by frontend
    res.status(200).json({
        success: true,
        data: {
            critical: 0,
            reminder: 0,
            warning: 0,
            info: 0,
            unread: 0,
            total: 0
        }
    });
});

// ============================================================================
// STATE & CITY ROUTES (placeholder - returns empty arrays for now)
// ============================================================================

/**
 * @route   GET /state
 * @desc    Get states (placeholder)
 * @access  Private
 */
router.get('/state', auth, async (req, res) => {
    res.status(200).json({
        success: true,
        states: []
    });
});

/**
 * @route   GET /city
 * @desc    Get cities (placeholder)
 * @access  Private
 */
router.get('/city', auth, async (req, res) => {
    res.status(200).json({
        success: true,
        cities: []
    });
});

/**
 * @route   GET /industry
 * @desc    Get industries (placeholder)
 * @access  Private
 */
router.get('/industry', auth, async (req, res) => {
    res.status(200).json({
        success: true,
        industries: []
    });
});

/**
 * @route   GET /manager
 * @desc    Get all managers with their assigned plants
 * @access  Private
 */
router.get('/manager', auth, async (req, res) => {
    try {
        const { Manager, User, PlantManager } = require('../models/user-management');
        const Plant = require('../models/plants/Plant');

        const managers = await Manager.findAll({
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'status']
                },
                {
                    model: PlantManager,
                    as: 'plant_assignments',
                    include: [{
                        model: Plant,
                        as: 'plant',
                        attributes: ['id', 'plant_name', 'status']
                    }]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Transform to match frontend expectations
        const transformedManagers = managers.map(m => ({
            id: m.id,
            userId: m.user_id,
            user: m.user,
            status: m.status,
            // Convert plant_assignments to plants array
            plants: (m.plant_assignments || [])
                .filter(pa => pa.plant)
                .map(pa => ({
                    id: pa.plant.id,
                    plantName: pa.plant.plant_name,
                    status: pa.plant.status
                }))
        }));

        res.status(200).json({
            success: true,
            allManager: transformedManagers,
            managers: transformedManagers
        });
    } catch (error) {
        console.error('Error fetching managers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch managers',
            error: error.message
        });
    }
});

// ============================================================================
// BUILDING & FLOOR ROUTES (for incident location selection)
// ============================================================================

/**
 * @route   GET /buildings
 * @desc    Get buildings by plant ID
 * @access  Private
 */
router.get('/buildings', auth, async (req, res) => {
    try {
        const { plantId } = req.query;

        if (!plantId) {
            return res.status(400).json({
                success: false,
                message: 'Plant ID is required'
            });
        }

        const Building = require('../models/plants/Building');

        const buildings = await Building.findAll({
            where: { plant_id: plantId },
            order: [['building_name', 'ASC']]
        });

        // Transform to camelCase for frontend
        const transformedBuildings = buildings.map(b => ({
            id: b.id,
            plantId: b.plant_id,
            buildingName: b.building_name,
            buildingHeight: b.building_height,
            totalArea: b.total_area,
            totalBuiltUpArea: b.total_built_up_area,
            buildingType: b.building_type
        }));

        res.status(200).json({
            success: true,
            data: transformedBuildings
        });
    } catch (error) {
        console.error('Error fetching buildings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch buildings'
        });
    }
});

/**
 * @route   GET /floors
 * @desc    Get floors by building ID
 * @access  Private
 */
router.get('/sams/floors', auth, async (req, res) => {
    try {
        const { buildingId } = req.query;

        if (!buildingId) {
            return res.status(400).json({
                success: false,
                message: 'Building ID is required'
            });
        }

        const Floor = require('../models/plants/Floor');

        const floors = await Floor.findAll({
            where: { building_id: buildingId },
            order: [['floor_name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: floors
        });
    } catch (error) {
        console.error('Error fetching floors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floors'
        });
    }
});
// FLOOR ROUTES
// ============================================================================

const floorController = require('../controllers/plants/floorController');

/**
 * @route   GET /floors
 * @desc    Get all floors, optionally filtered by buildingId
 * @access  Private
 */
router.get('/floors', auth, floorController.getAll);

/**
 * @route   GET /floors/:id
 * @desc    Get floor by ID
 * @access  Private
 */
router.get('/floors/:id', auth, floorController.getById);

// ============================================================================
// LAYOUT ROUTES
// ============================================================================

const layoutController = require('../controllers/plants/layoutController');
const { uploadLayout } = require('../middleware/upload');

/**
 * @route   POST /layout
 * @desc    Create a new layout
 * @access  Private
 */
router.post('/layout', auth, layoutController.create);

/**
 * @route   POST /layout/upload
 * @desc    Upload layout file (SVG)
 * @access  Private
 */
router.post('/layout/upload', auth, uploadLayout.single('layoutFile'), layoutController.uploadLayout);

/**
 * @route   GET /layout
 * @desc    Get all layouts with optional filters
 * @access  Private
 */
router.get('/layout', auth, layoutController.getAll);

/**
 * @route   GET /layout/floor/:floorId
 * @desc    Get layout by floor ID
 * @access  Private
 */
router.get('/layout/floor/:floorId', auth, layoutController.getByFloorId);

/**
 * @route   GET /layout/plant/:plantId
 * @desc    Get all layouts for a plant
 * @access  Private
 */
router.get('/layout/plant/:plantId', auth, layoutController.getByPlantId);

/**
 * @route   GET /layout/:id
 * @desc    Get layout by ID
 * @access  Private
 */
router.get('/layout/:id', auth, layoutController.getById);

/**
 * @route   PUT /layout/:id
 * @desc    Update a layout
 * @access  Private
 */
router.put('/layout/:id', auth, layoutController.update);

/**
 * @route   DELETE /layout/:id
 * @desc    Delete a layout
 * @access  Private
 */
router.delete('/layout/:id', auth, layoutController.delete);

// ============================================================================
// FLOORPLAN HIERARCHY ROUTES
// ============================================================================

const floorplanHierarchyController = require('../controllers/plants/floorplanHierarchyController');

/**
 * @route   GET /floorplan-hierarchy
 * @desc    Get plant/building/floor hierarchy for floorplan viewer
 * @access  Private
 */
router.get('/floorplan-hierarchy', auth, floorplanHierarchyController.getHierarchy);

module.exports = router;

