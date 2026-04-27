/**
 * Plant Controller
 * Handles HTTP requests for plant operations
 */

const Joi = require('joi');
const plantService = require('../../services/plants/plant_service');

// Validation schemas
const createPlantSchema = Joi.object({
    plantName: Joi.string().required().min(1).max(255).messages({
        'string.empty': 'Plant name is required',
        'any.required': 'Plant name is required'
    }),
    addressLine1: Joi.string().optional().allow(''),
    address: Joi.string().optional().allow(''),
    city: Joi.string().required().messages({ 'string.empty': 'City is required', 'any.required': 'City is required' }),
    state: Joi.string().required().messages({ 'string.empty': 'State is required', 'any.required': 'State is required' }),
    country: Joi.string().optional().allow('', null).default('India'),
    industryId: Joi.string().uuid().optional().allow('', null),
    organizationId: Joi.string().uuid().optional().allow('', null),
    managerIds: Joi.array().items(Joi.string().uuid()).optional().default([]),
    categoryIds: Joi.array().items(Joi.string().uuid()).optional().default([]),
    mainBuildings: Joi.number().integer().min(0).optional().default(0),
    subBuildings: Joi.number().integer().min(0).optional().default(0),
    totalPlantArea: Joi.number().optional().allow('', null),
    totalBuiltUpArea: Joi.number().optional().allow('', null),
    totalBuildUpArea: Joi.number().optional().allow('', null),
    buildings: Joi.array().items(Joi.object({
        id: Joi.string().optional().allow('', null), // For updates or temp IDs
        buildingName: Joi.string().optional(),
        buildingHeight: Joi.number().optional().allow('', null),
        totalArea: Joi.number().optional().allow('', null),
        totalBuiltUpArea: Joi.number().optional().allow('', null),
        buildingType: Joi.string().optional().allow('', null),
        numFloors: Joi.number().integer().min(0).optional().allow('', null),
        // Staircase fields at building level
        staircaseAvailable: Joi.alternatives().try(Joi.string(), Joi.boolean()).optional().allow('', null),
        staircaseQuantity: Joi.number().integer().min(0).optional().allow('', null),
        staircaseType: Joi.string().optional().allow('', null),
        staircaseWidth: Joi.number().optional().allow('', null),
        staircaseFireRating: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow('', null),
        staircasePressurization: Joi.alternatives().try(Joi.string(), Joi.boolean()).optional().allow('', null),
        staircaseEmergencyLighting: Joi.alternatives().try(Joi.string(), Joi.boolean()).optional().allow('', null),
        staircaseLocation: Joi.string().optional().allow('', null),
        // Lift fields at building level
        liftAvailable: Joi.alternatives().try(Joi.string(), Joi.boolean()).optional().allow('', null),
        liftQuantity: Joi.number().integer().min(0).optional().allow('', null),
        liftType: Joi.string().optional().allow('', null),
        liftCapacity: Joi.number().optional().allow('', null),
        liftFireRating: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow('', null),
        liftEmergencyPhone: Joi.alternatives().try(Joi.string(), Joi.boolean()).optional().allow('', null),
        // Floors
        floors: Joi.array().items(Joi.object({
            id: Joi.string().optional().allow('', null), // For updates or temp IDs
            floorName: Joi.string().optional(),
            usageType: Joi.string().optional().allow('', null),
            floorUsage: Joi.string().optional().allow('', null),
            floorArea: Joi.number().optional().allow('', null),
            wing: Joi.string().optional().allow('', null),
            wingName: Joi.string().optional().allow('', null),
            // Wings array within floors - Support both object array and simple string array
            wings: Joi.alternatives().try(
                Joi.array().items(Joi.string()),
                Joi.array().items(Joi.object({
                    id: Joi.string().optional().allow('', null),
                    wingName: Joi.string().optional().allow('', null),
                    wing: Joi.string().optional().allow('', null), // Support both naming conventions
                    usage: Joi.string().optional().allow('', null),
                    wingArea: Joi.number().optional().allow('', null)
                }))
            ).optional()
        })).optional()
    })).optional().default([]),
    entrances: Joi.array().items(Joi.object({
        id: Joi.string().optional().allow('', null), // For updates or temp IDs
        entranceName: Joi.string().optional(),
        name: Joi.string().optional(),
        entranceType: Joi.string().optional().allow('', null),
        entranceWidth: Joi.number().optional().allow('', null),
        width: Joi.number().optional().allow('', null)
    })).optional().default([]),
    dgAvailable: Joi.alternatives().try(Joi.string(), Joi.boolean()).optional(),
    dgQuantity: Joi.number().integer().min(0).optional().default(0),
    // Fire Safety
    primeOverTankCapacity: Joi.number().optional().allow('', null),
    terraceTankCapacity: Joi.number().optional().allow('', null),
    diesel1TankCapacity: Joi.number().optional().allow('', null),
    diesel2TankCapacity: Joi.number().optional().allow('', null),
    headerPressureBar: Joi.number().optional().allow('', null),
    systemCommissionDate: Joi.date().optional().allow('', null),
    amcVendorId: Joi.string().uuid().optional().allow('', null),
    amcStartDate: Joi.date().optional().allow('', null),
    amcEndDate: Joi.date().optional().allow('', null),
    numFireExtinguishers: Joi.number().integer().min(0).optional().default(0),
    numHydrantPoints: Joi.number().integer().min(0).optional().default(0),
    numSprinklers: Joi.number().integer().min(0).optional().default(0),
    numSafeAssemblyAreas: Joi.number().integer().min(0).optional().default(0),
    dieselEngine: Joi.number().integer().min(0).optional().allow('', null),
    electricalPump: Joi.number().integer().min(0).optional().allow('', null),
    jockeyPump: Joi.number().integer().min(0).optional().allow('', null),
    // Compliance
    fireNocNumber: Joi.string().optional().allow('', null),
    nocValidityDate: Joi.date().optional().allow('', null),
    fireNocValidityDate: Joi.date().optional().allow('', null),
    insurancePolicyNumber: Joi.string().optional().allow('', null),
    insurerName: Joi.string().optional().allow('', null),
    // Status
    status: Joi.string().valid('Active', 'Inactive', 'Draft', 'Archived').optional().default('Active')
}).unknown(true);

const updatePlantSchema = createPlantSchema.fork(
    ['plantName', 'city', 'state', 'industryId'],
    (schema) => schema.optional()
);

/**
 * Transform plant data from snake_case to camelCase for frontend
 */
function transformPlantData(plant) {
    if (!plant) return null;

    const plainPlant = plant.toJSON ? plant.toJSON() : plant;

    return {
        id: plainPlant.id,
        plantName: plainPlant.plant_name,
        plantCode: plainPlant.plant_code,
        address: plainPlant.address_line1 || plainPlant.address,
        addressLine1: plainPlant.address_line1,
        // Return raw strings for city/state as expected by frontend form
        city: plainPlant.city,
        state: plainPlant.state,
        country: plainPlant.country,
        zipCode: plainPlant.postal_code,
        gstNo: plainPlant.gst_number,
        industryId: plainPlant.industry_id,
        organizationId: plainPlant.organization_id,
        status: plainPlant.status,
        createdAt: plainPlant.created_at,
        updatedAt: plainPlant.updated_at,
        mainBuildings: plainPlant.main_buildings_count,
        subBuildings: plainPlant.sub_buildings_count,
        totalPlantArea: plainPlant.total_plant_area,
        // Ensure camelCase match with Frontend (totalBuiltUpArea vs totalBuildUpArea)
        // Frontend sanitizeFormData uses 'totalBuildUpArea', but Inputs might accept both if not strictly typed?
        // Let's send both to be safe
        totalBuiltUpArea: plainPlant.total_built_up_area,
        totalBuildUpArea: plainPlant.total_built_up_area,

        // Transform nested associations
        organization: plainPlant.organization ? {
            id: plainPlant.organization.id,
            organizationName: plainPlant.organization.organization_name,
            organizationCode: plainPlant.organization.organization_code,
            address: plainPlant.organization.address
        } : null,
        industry: plainPlant.industry ? {
            id: plainPlant.industry.id,
            industryName: plainPlant.industry.industry_name
        } : null,
        managers: plainPlant.managers,
        categories: plainPlant.categories,
        // Buildings with nested floors, wings, staircases, lifts
        buildings: (plainPlant.buildings || []).map(building => {
            // Flatten Staircase (Take 1st if available because frontend expects flat props)
            const firstStaircase = (building.staircases && building.staircases.length > 0) ? building.staircases[0] : null;
            const firstLift = (building.lifts && building.lifts.length > 0) ? building.lifts[0] : null;

            return {
                id: building.id,
                buildingName: building.building_name,
                buildingHeight: building.building_height,
                numFloors: building.num_floors || (building.floors ? building.floors.length : 0), // Explicitly map num_floors
                totalArea: building.total_area,
                totalBuiltUpArea: building.total_built_up_area || building.totalBuiltUpArea,
                buildingType: building.building_type || building.buildingType,

                // Nested Floors
                floors: (building.floors || []).map(floor => ({
                    id: floor.id,
                    floorName: floor.floor_name,
                    floorUsage: floor.usage_type || floor.floor_usage, // Handle usage_type from DB
                    floorArea: floor.floor_area,
                    wing: (floor.wings && floor.wings.length > 0) ? floor.wings[0].wing_name : '', // Flatten wing if needed? Or just pass array 
                    wings: (floor.wings || []).map(wing => ({
                        id: wing.id,
                        wingName: wing.wing_name,
                        usage: wing.usage_type || wing.usage,
                        wingArea: wing.wing_area
                    }))
                })),

                // Flattened Staircase Props for Frontend Form
                staircaseAvailable: firstStaircase ? (firstStaircase.available ? 'yes' : 'no') : 'no',
                staircaseQuantity: firstStaircase ? firstStaircase.quantity : '',
                staircaseType: firstStaircase ? firstStaircase.type : '',
                staircaseWidth: firstStaircase ? firstStaircase.width_meters : '',
                staircaseFireRating: firstStaircase ? firstStaircase.fire_rating_minutes : '',
                staircasePressurization: firstStaircase ? (firstStaircase.has_pressurization ? 'yes' : 'no') : 'no',
                staircaseEmergencyLighting: firstStaircase ? (firstStaircase.has_emergency_lighting ? 'yes' : 'no') : 'no',
                staircaseLocation: firstStaircase ? firstStaircase.location_description : '',

                // Flattened Lift Props for Frontend Form
                liftAvailable: firstLift ? (firstLift.available ? 'yes' : 'no') : 'no',
                liftQuantity: firstLift ? firstLift.quantity : '',
                // If frontend adds Lift fields later, map them here:
                liftType: firstLift ? firstLift.type : '',
                liftCapacity: firstLift ? firstLift.capacity_kg : '',
                liftFireRating: firstLift ? firstLift.fire_rating_minutes : '',
                liftEmergencyPhone: firstLift ? firstLift.has_emergency_phone : false,

                // Keep original nested arrays just in case
                staircases: (building.staircases || []).map(staircase => ({
                    id: staircase.id,
                    available: staircase.available,
                    quantity: staircase.quantity,
                    type: staircase.type,
                    widthMeters: staircase.width_meters,
                    fireRatingMinutes: staircase.fire_rating_minutes,
                    hasPressurization: staircase.has_pressurization,
                    hasEmergencyLighting: staircase.has_emergency_lighting,
                    locationDescription: staircase.location_description
                })),
                lifts: (building.lifts || []).map(lift => ({
                    id: lift.id,
                    available: lift.available,
                    quantity: lift.quantity,
                    type: lift.type,
                    capacityKg: lift.capacity_kg,
                    fireRatingMinutes: lift.fire_rating_minutes,
                    hasEmergencyPhone: lift.has_emergency_phone
                }))
            };
        }),
        entrances: (plainPlant.entrances || []).map(entrance => ({
            id: entrance.id,
            entranceName: entrance.entrance_name || entrance.name,
            entranceType: entrance.entrance_type,
            entranceWidth: entrance.entrance_width || entrance.width_meters || entrance.width
        })),
        // Diesel Generators
        dieselGenerators: (plainPlant.dieselGenerators || []).map(dg => ({
            id: dg.id,
            available: dg.available,
            quantity: dg.quantity,
            capacity: dg.capacity,
            fuelType: dg.fuel_type
        })),
        // Fire Safety System (map to fireSafetyForms for frontend compatibility)
        fireSafetyForms: plainPlant.fireSafetySystem ? [{
            id: plainPlant.fireSafetySystem.id,
            primeOverTankCapacity: plainPlant.fireSafetySystem.prime_over_tank,
            terraceTankCapacity: plainPlant.fireSafetySystem.terrace_tank,
            dieselTank1Capacity: plainPlant.fireSafetySystem.diesel_tank_1,
            dieselTank2Capacity: plainPlant.fireSafetySystem.diesel_tank_2,
            headerPressureBar: plainPlant.fireSafetySystem.header_pressure_value,
            systemCommissionDate: plainPlant.fireSafetySystem.system_commission_date,
            amcVendorId: plainPlant.fireSafetySystem.amc_vendor_id,
            amcStartDate: plainPlant.fireSafetySystem.amc_start_date,
            amcEndDate: plainPlant.fireSafetySystem.amc_end_date,
            numFireExtinguishers: plainPlant.fireSafetySystem.fire_extinguisher_count,
            numHydrantPoints: plainPlant.fireSafetySystem.hydrant_point_count,
            numSprinklers: plainPlant.fireSafetySystem.sprinkler_count,
            numSafeAssemblyAreas: plainPlant.fireSafetySystem.safe_assembly_area_count,
            dieselEngine: plainPlant.fireSafetySystem.diesel_pump_count,
            electricalPump: plainPlant.fireSafetySystem.electric_pump_count,
            jockeyPump: plainPlant.fireSafetySystem.jockey_pump_count,
            documentsData: plainPlant.fireSafetySystem.documents_json,
            amcVendor: plainPlant.fireSafetySystem.amcVendor
        }] : [],
        // Compliance Records (map to complianceForms for frontend compatibility)
        complianceForms: (plainPlant.complianceRecords || []).map(cr => ({
            id: cr.id,
            fireNocNumber: cr.fire_noc_number,
            nocValidityDate: cr.fire_noc_expiry_date,
            insurancePolicyNumber: cr.insurance_policy_number,
            insurerName: cr.insurance_name,
            insuranceValidityDate: cr.insurance_validity_date,
            numFireExtinguishers: cr.num_fire_extinguishers,
            numHydrantPoints: cr.num_hydrant_points,
            numSprinklers: cr.num_sprinklers,
            numSafeAssemblyAreas: cr.num_safe_assembly_areas,
            documentsData: cr.documents_data
        })),
        // Flatten first compliance record for frontend form compatibility
        ...(plainPlant.complianceRecords && plainPlant.complianceRecords.length > 0 ? {
            fireNocNumber: plainPlant.complianceRecords[0].fire_noc_number,
            nocValidityDate: plainPlant.complianceRecords[0].fire_noc_expiry_date,
            fireNocValidityDate: plainPlant.complianceRecords[0].fire_noc_expiry_date,
            insurancePolicyNumber: plainPlant.complianceRecords[0].insurance_policy_number,
            insurerName: plainPlant.complianceRecords[0].insurance_name,
            insuranceValidityDate: plainPlant.complianceRecords[0].insurance_validity_date,
            complianceNumExtinguishers: plainPlant.complianceRecords[0].num_fire_extinguishers,
            complianceNumHydrantPoints: plainPlant.complianceRecords[0].num_hydrant_points,
            complianceNumSprinklers: plainPlant.complianceRecords[0].num_sprinklers,
            complianceNumSafeAreas: plainPlant.complianceRecords[0].num_safe_assembly_areas,
            complianceDocuments: plainPlant.complianceRecords[0].documents_data
        } : {})
    };
}

class PlantController {
    /**
     * Get all plants
     * GET /plants
     * If user is a manager, only returns plants assigned to them
     */
    async getAll(req, res) {
        try {
            const { status, organizationId, industryId, search, page, limit, id, plantId } = req.query;

            console.log('🌱 [PlantController] getAll request query:', req.query);
            console.log('🌱 [PlantController] Extracted id:', id, 'plantId:', plantId);

            // Build filters including manager plant restrictions
            const filters = {
                status,
                organizationId,
                industryId,
                search,
                page: page || 1,
                limit: limit || 50,
                id: id || plantId // Support both
            };

            // If manager, restrict to their assigned plants
            if (req.managerPlantIds && req.managerPlantIds.length > 0) {
                filters.allowedPlantIds = req.managerPlantIds;
                console.log(`🌱 [PlantController] Manager restricted to plants: ${req.managerPlantIds.join(', ')}`);
            }

            const result = await plantService.getAllPlants(filters);

            // Transform plants to camelCase
            const transformedPlants = result.plants.map(p => transformPlantData(p));

            res.status(200).json({
                success: true,
                plants: transformedPlants,
                pagination: result.pagination
            });
        } catch (error) {
            console.error('Get all plants error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch plants',
                error: error.message
            });
        }
    }

    /**
     * Get plant by ID
     * GET /plants/:id
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            const plant = await plantService.getPlantById(id);

            res.status(200).json({
                success: true,
                plant: transformPlantData(plant)
            });
        } catch (error) {
            console.error('Get plant by ID error:', error);

            if (error.message === 'Plant not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Plant not found'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to fetch plant',
                error: error.message
            });
        }
    }

    /**
     * Create a new plant
     * POST /plants
     */
    async create(req, res) {
        try {
            // Parse JSON strings if from FormData (skip if already JSON)
            console.log('Create Plant Payload:', req.body);
            // this._parseJsonFields(req.body); // Not needed for JSON requests

            const { error, value } = createPlantSchema.validate(req.body, {
                stripUnknown: false,
                abortEarly: false
            });

            if (error) {
                console.error('❌ Validation Error:', error.details.map(d => d.message));
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(d => d.message)
                });
            }

            const plant = await plantService.createPlant(value, req.user);

            res.status(201).json({
                success: true,
                message: 'Plant created successfully',
                plant
            });
        } catch (error) {
            console.error('Create plant error:', error);

            if (error.message.includes('limit reached')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('Organization not found')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to create plant',
                error: error.message,
                details: error.errors ? error.errors.map(e => e.message) : undefined
            });
        }
    }

    /**
     * Update a plant
     * PUT /plants/:id
     */
    async update(req, res) {
        try {
            const { id } = req.params;

            // Parse JSON strings if from FormData (skip if already JSON)
            // this._parseJsonFields(req.body); // Not needed for JSON requests

            const { error, value } = updatePlantSchema.validate(req.body, {
                stripUnknown: false,
                abortEarly: false
            });

            if (error) {
                console.error('❌ Update Validation Error:', error.details.map(d => d.message));
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(d => d.message)
                });
            }

            const plant = await plantService.updatePlant(id, value, req.user);

            res.status(200).json({
                success: true,
                message: 'Plant updated successfully',
                plant
            });
        } catch (error) {
            console.error('Update plant error:', error);

            if (error.message === 'Plant not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Plant not found'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to update plant',
                error: error.message
            });
        }
    }

    /**
     * Delete a plant
     * DELETE /plants/:id
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            await plantService.deletePlant(id, req.user);

            res.status(200).json({
                success: true,
                message: 'Plant deleted successfully'
            });
        } catch (error) {
            console.error('Delete plant error:', error);

            if (error.message === 'Plant not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Plant not found'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to delete plant',
                error: error.message
            });
        }
    }

    /**
     * Get active plants for dropdowns
     * GET /plants/active
     * If user is a manager, only returns their assigned plants
     */
    async getActive(req, res) {
        try {
            // If manager, restrict to their assigned plants
            let allowedPlantIds = null;
            if (req.managerPlantIds && req.managerPlantIds.length > 0) {
                allowedPlantIds = req.managerPlantIds;
                console.log(`🌱 [PlantController] getActive - Manager restricted to plants: ${req.managerPlantIds.join(', ')}`);
            }

            const plants = await plantService.getActivePlants(allowedPlantIds);

            res.status(200).json({
                success: true,
                plants
            });
        } catch (error) {
            console.error('Get active plants error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch active plants',
                error: error.message
            });
        }
    }

    /**
     * Helper to parse JSON strings from FormData
     */
    _parseJsonFields(body) {
        const jsonFields = ['managerIds', 'categoryIds', 'buildings', 'entrances'];

        jsonFields.forEach(field => {
            if (typeof body[field] === 'string') {
                try {
                    body[field] = JSON.parse(body[field]);
                } catch (e) {
                    console.error(`Error parsing ${field}:`, e);
                }
            }
        });

        // Handle duplicate FormData values that become arrays
        const scalarFields = ['zipCode', 'gstNo', 'address', 'city', 'state'];
        scalarFields.forEach(field => {
            if (Array.isArray(body[field])) {
                body[field] = body[field][0] || '';
            }
        });
    }
}

const plantController = new PlantController();
plantController.transformPlantData = transformPlantData;
module.exports = plantController;
