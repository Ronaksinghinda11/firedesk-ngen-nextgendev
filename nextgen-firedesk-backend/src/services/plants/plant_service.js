/**
 * Plant Service
 * Handles business logic for plant CRUD operations
 * Excludes: Monitoring, Layout, Scheduler (handled separately)
 */

const { sequelize } = require('../../../config/config');
const { Op } = require('sequelize');
const auditService = require('../../services/audit/audit_service');

// Import models from main models module
const {
    Plant,
    Building,
    Floor,
    Wing,
    Entrance,
    DieselGenerator,
    Staircase,
    Lift,
    FireSafetySystem,
    ComplianceRecord,
    PlantManager,
    PlantCategory,
    Organization,
    Industry,
    Vendor,
    Manager,
    User,
    Category
} = require('../../models');

class PlantService {
    /**
     * Get all plants with optional filters
     * Simplified query - avoids complex associations that may cause errors
     * @param {Object} filters - Query filters
     * @param {string[]} filters.allowedPlantIds - If provided, restrict results to these plant IDs (for manager filtering)
     */
    async getAllPlants(filters = {}) {
        try {
            const { status, organizationId, industryId, search, page = 1, limit = 50, id, allowedPlantIds } = filters;

            const whereCondition = {};

            // Manager plant restriction - if allowedPlantIds are specified, filter by them
            if (allowedPlantIds && allowedPlantIds.length > 0) {
                // If a specific id is requested, validate it's in the allowed list
                if (id && id !== 'all') {
                    if (allowedPlantIds.includes(id)) {
                        whereCondition.id = id;
                    } else {
                        // Manager trying to access unauthorized plant - return empty
                        console.warn(`🌱 [PlantService] Manager tried to access unauthorized plant: ${id}`);
                        return {
                            plants: [],
                            pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
                        };
                    }
                } else {
                    // No specific id, filter by allowed plants
                    whereCondition.id = { [Op.in]: allowedPlantIds };
                }
            } else if (id && id !== 'all') {
                // No manager restriction, but specific id requested
                whereCondition.id = id;
            }

            if (status) {
                whereCondition.status = status;
            }

            if (organizationId) {
                whereCondition.organization_id = organizationId;
            }

            if (industryId) {
                whereCondition.industry_id = industryId;
            }

            if (search) {
                whereCondition[Op.or] = [
                    { plant_name: { [Op.iLike]: `%${search}%` } },
                    { plant_code: { [Op.iLike]: `%${search}%` } },
                    { address_line1: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const offset = (page - 1) * limit;

            const { count, rows: plants } = await Plant.findAndCountAll({
                where: whereCondition,
                include: [
                    Organization ? {
                        model: Organization,
                        as: 'organization',
                        attributes: ['id', 'organization_name', 'organization_code'],
                        required: false
                    } : null,
                    Industry ? {
                        model: Industry,
                        as: 'industry',
                        attributes: ['id', 'industry_name'],
                        required: false
                    } : null,
                    Category ? {
                        model: Category,
                        as: 'categories',
                        through: { attributes: [] },
                        attributes: ['id', 'category_name'],
                        required: false
                    } : null
                ].filter(Boolean),
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                distinct: true
            });

            return {
                plants,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Get all plants error:', error);

            // Fallback: try simpler query without includes
            try {
                const { page = 1, limit = 50 } = filters;
                const offset = (page - 1) * limit;

                const { count, rows: plants } = await Plant.findAndCountAll({
                    order: [['created_at', 'DESC']],
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                });

                return {
                    plants,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / limit)
                    }
                };
            } catch (fallbackError) {
                console.error('Fallback query also failed:', fallbackError);
                throw error;
            }
        }
    }

    /**
     * Get plant by ID with full details
     */
    async getPlantById(id) {
        try {
            const plant = await Plant.findByPk(id, {
                include: [
                    {
                        model: Organization,
                        as: 'organization',
                        attributes: ['id', 'organization_name', 'organization_code', 'address']
                    },
                    {
                        model: Industry,
                        as: 'industry',
                        attributes: ['id', 'industry_name']
                    },
                    {
                        model: Manager,
                        as: 'managers',
                        through: { attributes: ['assigned_at'] },
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'email', 'phone']
                        }]
                    },
                    {
                        model: Category,
                        as: 'categories',
                        through: { attributes: [] },
                        attributes: ['id', 'category_name']
                    },
                    {
                        model: Building,
                        as: 'buildings',
                        include: [
                            {
                                model: Floor,
                                as: 'floors',
                                include: [{
                                    model: Wing,
                                    as: 'wings'
                                }]
                            },
                            { model: Staircase, as: 'staircases' },
                            { model: Lift, as: 'lifts' }
                        ]
                    },
                    { model: Entrance, as: 'entrances' },
                    { model: DieselGenerator, as: 'dieselGenerators' },
                    {
                        model: FireSafetySystem,
                        as: 'fireSafetySystem',
                        include: [{
                            model: Vendor,
                            as: 'amcVendor',
                            attributes: ['id', 'vendor_name']
                        }]
                    },
                    { model: ComplianceRecord, as: 'complianceRecords' }
                ]
            });

            if (!plant) {
                throw new Error('Plant not found');
            }

            return plant;
        } catch (error) {
            console.error('Get plant by ID error:', error);
            throw error;
        }
    }

    /**
     * Create a new plant with all related data
     */
    async createPlant(data, user, transaction = null) {
        const t = transaction || await sequelize.transaction();
        const useExternalTransaction = !!transaction;

        try {
            // Determine Organization ID and Check Limit
            let organizationId = data.organizationId;
            let organization = null;

            if (organizationId) {
                organization = await Organization.findByPk(organizationId);
            } else {
                // If not provided, try to find the single organization (assuming single-tenant context for now)
                organization = await Organization.findOne();
                if (organization) {
                    organizationId = organization.id;
                }
            }

            if (!organization) {
                throw new Error('Organization not found. Please set up an organization first.');
            }

            // Check Limit
            const currentPlantCount = await Plant.count({
                where: { organization_id: organizationId }
            });

            if (currentPlantCount >= organization.no_of_plants) {
                throw new Error(`Plant creation limit reached. You can only create ${organization.no_of_plants} plants. Contact support to increase limit.`);
            }

            // Generate unique plant code by finding the max existing code number
            const lastPlant = await Plant.findOne({
                where: {
                    plant_code: { [Op.like]: 'PLT-%' }
                },
                order: [['plant_code', 'DESC']],
                attributes: ['plant_code']
            });

            let nextNumber = 1;
            if (lastPlant && lastPlant.plant_code) {
                const match = lastPlant.plant_code.match(/PLT-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            const plantCode = `PLT-${String(nextNumber).padStart(5, '0')}`;

            // Create plant
            const plant = await Plant.create({
                plant_code: plantCode,
                plant_name: data.plantName,
                address_line1: data.addressLine1 || data.address,
                city: data.city || null,
                state: data.state || null,
                country: data.country || 'India',
                postal_code: data.postalCode || data.zipCode,
                gst_number: data.gstNumber || data.gstNo,
                industry_id: data.industryId || null,
                organization_id: organizationId,
                main_buildings_count: data.mainBuildings || 0,
                sub_buildings_count: data.subBuildings || 0,
                total_plant_area: data.totalPlantArea || null,
                total_built_up_area: data.totalBuiltUpArea || data.totalBuildUpArea || null,
                status: data.status || 'Active'
            }, { transaction: t });

            // Associate managers
            if (data.managerIds && data.managerIds.length > 0) {
                const managerAssociations = data.managerIds.map(managerId => ({
                    plant_id: plant.id,
                    manager_id: managerId
                }));
                await PlantManager.bulkCreate(managerAssociations, { transaction: t });
            }

            // Associate categories
            if (data.categoryIds && data.categoryIds.length > 0) {
                const categoryAssociations = data.categoryIds.map(categoryId => ({
                    plant_id: plant.id,
                    category_id: categoryId
                }));
                await PlantCategory.bulkCreate(categoryAssociations, { transaction: t });
            }

            // Create buildings with floors/wings
            if (data.buildings && data.buildings.length > 0) {
                await this._createBuildings(plant.id, data.buildings, t);
            }

            // Create entrances
            if (data.entrances && data.entrances.length > 0) {
                await this._createEntrances(plant.id, data.entrances, t);
            }

            // Create diesel generators
            if (data.dgAvailable === 'yes' || data.dgAvailable === true) {
                await DieselGenerator.create({
                    plant_id: plant.id,
                    available: true,
                    quantity: data.dgQuantity || 1
                }, { transaction: t });
            }

            // Create fire safety system
            if (this._hasFireSafetyData(data)) {
                await this._createFireSafetySystem(plant.id, data, t);
            }

            // Create compliance records
            if (this._hasComplianceData(data)) {
                await this._createComplianceRecord(plant.id, data, t);
            }

            if (!useExternalTransaction) {
                await t.commit();
            }

            const newPlant = await this.getPlantById(plant.id);

            // Audit Log
            try {
                await auditService.log({
                    entityType: 'plant',
                    entityId: plant.id,
                    entityName: plant.plant_name,
                    action: 'CREATE',
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for createPlant:', error.message);
            }

            return newPlant;
        } catch (error) {
            if (!useExternalTransaction) {
                await t.rollback();
            }
            console.error('Create plant error:', error);
            throw error;
        }
    }

    /**
     * Update an existing plant
     */
    async updatePlant(id, data, user, transaction = null) {
        const t = transaction || await sequelize.transaction();
        const useExternalTransaction = !!transaction;

        try {
            // Capture old state (deep) for audit
            let oldValues = null;
            try {
                const oldPlantFull = await this.getPlantById(id);
                // Convert to plain object
                oldValues = oldPlantFull.toJSON();
            } catch (e) {
                console.warn('Could not fetch old plant values for audit:', e.message);
            }

            const plant = await Plant.findByPk(id);
            if (!plant) {
                throw new Error('Plant not found');
            }

            // Update plant basic info
            const updateData = {};
            const fieldMapping = {
                plantName: 'plant_name',
                addressLine1: 'address_line1',
                address: 'address_line1',
                city: 'city',
                state: 'state',
                country: 'country',
                postalCode: 'postal_code',
                zipCode: 'postal_code',
                gstNumber: 'gst_number',
                gstNo: 'gst_number',
                industryId: 'industry_id',
                organizationId: 'organization_id',
                mainBuildings: 'main_buildings_count',
                subBuildings: 'sub_buildings_count',
                totalPlantArea: 'total_plant_area',
                totalBuiltUpArea: 'total_built_up_area',
                totalBuildUpArea: 'total_built_up_area',
                status: 'status'
            };

            Object.keys(fieldMapping).forEach(key => {
                if (data[key] !== undefined) {
                    let value = data[key];
                    // Convert empty strings to null for UUID fields
                    if ((key === 'industryId' || key === 'organizationId') && value === '') {
                        value = null;
                    }
                    updateData[fieldMapping[key]] = value;
                }
            });

            await plant.update(updateData, { transaction: t });

            // Update managers
            if (data.managerIds !== undefined) {
                await PlantManager.destroy({
                    where: { plant_id: id },
                    transaction: t
                });

                if (data.managerIds.length > 0) {
                    const managerAssociations = data.managerIds.map(managerId => ({
                        plant_id: id,
                        manager_id: managerId
                    }));
                    await PlantManager.bulkCreate(managerAssociations, { transaction: t });
                }
            }

            // Update categories
            if (data.categoryIds !== undefined) {
                await PlantCategory.destroy({
                    where: { plant_id: id },
                    transaction: t
                });

                if (data.categoryIds.length > 0) {
                    const categoryAssociations = data.categoryIds.map(categoryId => ({
                        plant_id: id,
                        category_id: categoryId
                    }));
                    await PlantCategory.bulkCreate(categoryAssociations, { transaction: t });
                }
            }

            // Update buildings if provided
            if (data.buildings !== undefined) {
                await this._updateBuildings(id, data.buildings, t);
            }

            // Update entrances if provided
            if (data.entrances !== undefined) {
                await Entrance.destroy({ where: { plant_id: id }, transaction: t });
                if (data.entrances.length > 0) {
                    await this._createEntrances(id, data.entrances, t);
                }
            }

            // Update diesel generators
            if (data.dgAvailable !== undefined) {
                await DieselGenerator.destroy({ where: { plant_id: id }, transaction: t });
                if (data.dgAvailable === 'yes' || data.dgAvailable === true) {
                    await DieselGenerator.create({
                        plant_id: id,
                        available: true,
                        quantity: data.dgQuantity || 1
                    }, { transaction: t });
                }
            }

            // Update fire safety system
            if (this._hasFireSafetyData(data)) {
                await FireSafetySystem.destroy({ where: { plant_id: id }, transaction: t });
                await this._createFireSafetySystem(id, data, t);
            }

            // Update compliance records
            if (this._hasComplianceData(data)) {
                await ComplianceRecord.destroy({ where: { plant_id: id }, transaction: t });
                await this._createComplianceRecord(id, data, t);
            }

            if (!useExternalTransaction) {
                await t.commit();
            }

            const updatedPlant = await this.getPlantById(id);

            // Audit Log
            try {
                const changes = auditService.calculateChanges(oldValues, updatedPlant.toJSON());
                if (changes) {
                    await auditService.log({
                        entityType: 'plant',
                        entityId: id,
                        entityName: plant.plant_name, // Use plant.plant_name (updated?) or oldValues? Updated is better.
                        action: 'UPDATE',
                        changes,
                        user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                        source: 'ui'
                    });
                }
            } catch (error) {
                console.error('Audit log failed for updatePlant:', error.message);
            }

            return updatedPlant;
        } catch (error) {
            if (!useExternalTransaction) {
                await t.rollback();
            }
            console.error('Update plant error:', error);
            throw error;
        }
    }

    /**
     * Delete a plant
     */
    async deletePlant(id, user) {
        const t = await sequelize.transaction();

        try {
            const plant = await Plant.findByPk(id);
            if (!plant) {
                throw new Error('Plant not found');
            }
            const plantName = plant.plant_name;

            // Delete in order to respect foreign keys
            await PlantManager.destroy({ where: { plant_id: id }, transaction: t });
            await PlantCategory.destroy({ where: { plant_id: id }, transaction: t });
            await Entrance.destroy({ where: { plant_id: id }, transaction: t });
            await DieselGenerator.destroy({ where: { plant_id: id }, transaction: t });
            await FireSafetySystem.destroy({ where: { plant_id: id }, transaction: t });
            await ComplianceRecord.destroy({ where: { plant_id: id }, transaction: t });

            // Delete buildings (will cascade to floors, wings, staircases, lifts)
            await Building.destroy({ where: { plant_id: id }, transaction: t });

            // Delete plant
            await plant.destroy({ transaction: t });

            await t.commit();

            // Audit Log
            try {
                await auditService.log({
                    entityType: 'plant',
                    entityId: id,
                    entityName: plantName,
                    action: 'DELETE',
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for deletePlant:', error.message);
            }

            return { message: 'Plant deleted successfully' };
        } catch (error) {
            await t.rollback();
            console.error('Delete plant error:', error);
            throw error;
        }
    }

    /**
     * Get active plants (for dropdowns)
     * @param {string[]} allowedPlantIds - If provided, restrict results to these plant IDs (for manager filtering)
     */
    async getActivePlants(allowedPlantIds = null) {
        try {
            const whereCondition = { status: 'Active' };

            // Manager plant restriction
            if (allowedPlantIds && allowedPlantIds.length > 0) {
                whereCondition.id = { [Op.in]: allowedPlantIds };
                console.log(`🌱 [PlantService] getActivePlants - Filtering by manager plants: ${allowedPlantIds.join(', ')}`);
            }

            const plants = await Plant.findAll({
                where: whereCondition,
                attributes: ['id', 'plant_code', 'plant_name', 'city', 'state'],
                order: [['plant_name', 'ASC']]
            });
            return plants;
        } catch (error) {
            console.error('Get active plants error:', error);
            throw error;
        }
    }

    // ============================================
    // PRIVATE HELPER METHODS
    // ============================================

    async _createBuildings(plantId, buildings, transaction) {
        for (const buildingData of buildings) {
            const building = await Building.create({
                plant_id: plantId,
                building_name: buildingData.buildingName || `Building ${Date.now()}`,
                building_height: buildingData.buildingHeight || null,
                total_area: buildingData.totalArea || null,
                total_built_up_area: buildingData.totalBuiltUpArea || null,
                building_type: buildingData.buildingType || null
            }, { transaction });

            // Create floors
            if (buildingData.floors && buildingData.floors.length > 0) {
                for (const floorData of buildingData.floors) {
                    const floor = await Floor.create({
                        building_id: building.id,
                        floor_name: floorData.floorName || `Floor ${Date.now()}`,
                        usage_type: floorData.usageType || floorData.floorUsage || null,
                        floor_area: floorData.floorArea || null
                    }, { transaction });

                    // Create wings (Multi-select support)
                    if (floorData.wings && Array.isArray(floorData.wings) && floorData.wings.length > 0) {
                        for (const wingItem of floorData.wings) {
                            // Support both simple string array ["A", "B"] and object array [{wingName:"A"}, {wingName:"B"}]
                            const wingName = typeof wingItem === 'string' ? wingItem : (wingItem.wingName || wingItem.wing || '');
                            if (wingName) {
                                await Wing.create({
                                    floor_id: floor.id,
                                    wing_name: wingName,
                                    usage_type: (typeof wingItem === 'object' ? wingItem.usage : null) || floorData.usageType || null,
                                    wing_area: (typeof wingItem === 'object' ? wingItem.wingArea : null) || null
                                }, { transaction });
                            }
                        }
                    } else if (floorData.wing || floorData.wingName) {
                        // Original single-wing fallback
                        await Wing.create({
                            floor_id: floor.id,
                            wing_name: floorData.wing || floorData.wingName,
                            usage_type: floorData.usageType || null,
                            wing_area: floorData.wingArea || null
                        }, { transaction });
                    }
                }
            }

            // Create staircases
            if (buildingData.staircaseAvailable === 'yes' || buildingData.hasStaircase) {
                await Staircase.create({
                    building_id: building.id,
                    available: true,
                    quantity: buildingData.staircaseQuantity || 1,
                    type: buildingData.staircaseType || null,
                    width_meters: buildingData.staircaseWidth || null,
                    fire_rating_minutes: buildingData.staircaseFireRating || null,
                    has_pressurization: buildingData.staircasePressurization === 'yes',
                    has_emergency_lighting: buildingData.staircaseEmergencyLighting === 'yes',
                    location_description: buildingData.staircaseLocation || null
                }, { transaction });
            }

            // Create lifts
            if (buildingData.liftAvailable === 'yes' || buildingData.hasLift) {
                await Lift.create({
                    building_id: building.id,
                    available: true,
                    quantity: buildingData.liftQuantity || 1,
                    type: buildingData.liftType || null,
                    capacity_kg: buildingData.liftCapacity || null,
                    fire_rating_minutes: buildingData.liftFireRating || null,
                    has_emergency_phone: buildingData.liftEmergencyPhone === 'yes'
                }, { transaction });
            }
        }
    }

    async _updateBuildings(plantId, buildings, transaction) {
        // Get existing buildings
        const existingBuildings = await Building.findAll({
            where: { plant_id: plantId },
            attributes: ['id']
        });
        const existingIds = existingBuildings.map(b => b.id);

        // Get IDs from update payload
        const updatedIds = buildings.filter(b => b.id).map(b => b.id);

        // Delete buildings not in update payload
        const toDelete = existingIds.filter(id => !updatedIds.includes(id));
        if (toDelete.length > 0) {
            await Building.destroy({
                where: { id: toDelete },
                transaction
            });
        }

        // Update or create buildings
        for (const buildingData of buildings) {
            if (buildingData.id && existingIds.includes(buildingData.id)) {
                // Update existing
                await Building.update({
                    building_name: buildingData.buildingName,
                    building_height: buildingData.buildingHeight || null,
                    total_area: buildingData.totalArea || null,
                    total_built_up_area: buildingData.totalBuiltUpArea || null,
                    building_type: buildingData.buildingType || null
                }, {
                    where: { id: buildingData.id },
                    transaction
                });

                // Update nested data for existing building
                await this._updateFloors(buildingData.id, buildingData.floors, transaction);

                // Update staircases (delete & recreate)
                await Staircase.destroy({
                    where: { building_id: buildingData.id },
                    transaction
                });

                if (buildingData.staircaseAvailable === 'yes' || buildingData.hasStaircase) {
                    await Staircase.create({
                        building_id: buildingData.id,
                        available: true,
                        quantity: buildingData.staircaseQuantity || 1,
                        type: buildingData.staircaseType || null,
                        width_meters: buildingData.staircaseWidth || null,
                        fire_rating_minutes: buildingData.staircaseFireRating || null,
                        has_pressurization: buildingData.staircasePressurization === 'yes',
                        has_emergency_lighting: buildingData.staircaseEmergencyLighting === 'yes',
                        location_description: buildingData.staircaseLocation || null
                    }, { transaction });
                }

                // Update lifts (delete & recreate)
                await Lift.destroy({
                    where: { building_id: buildingData.id },
                    transaction
                });

                if (buildingData.liftAvailable === 'yes' || buildingData.hasLift) {
                    await Lift.create({
                        building_id: buildingData.id,
                        available: true,
                        quantity: buildingData.liftQuantity || 1,
                        type: buildingData.liftType || null,
                        capacity_kg: buildingData.liftCapacity || null,
                        fire_rating_minutes: buildingData.liftFireRating || null,
                        has_emergency_phone: buildingData.liftEmergencyPhone === 'yes'
                    }, { transaction });
                }
            } else {
                // Create new
                await this._createBuildings(plantId, [buildingData], transaction);
            }
        }
    }

    async _createEntrances(plantId, entrances, transaction) {
        const entranceData = entrances.map(entrance => ({
            plant_id: plantId,
            entrance_name: entrance.entranceName || entrance.name,
            entrance_type: entrance.entranceType || null,
            width_meters: entrance.entranceWidth || entrance.width || null,
            location_description: entrance.locationDescription || null
        }));
        await Entrance.bulkCreate(entranceData, { transaction });
    }

    _hasFireSafetyData(data) {
        const fields = [
            'primeOverTankCapacity', 'terraceTankCapacity', 'diesel1TankCapacity',
            'diesel2TankCapacity', 'headerPressureBar', 'systemCommissionDate',
            'numFireExtinguishers', 'numHydrantPoints', 'numSprinklers'
        ];
        return fields.some(field => data[field] !== undefined && data[field] !== null && data[field] !== '');
    }

    async _createFireSafetySystem(plantId, data, transaction) {
        await FireSafetySystem.create({
            plant_id: plantId,
            prime_over_tank: data.primeOverTankCapacity || null,
            terrace_tank: data.terraceTankCapacity || null,
            diesel_tank_1: data.diesel1TankCapacity || null,
            diesel_tank_2: data.diesel2TankCapacity || null,
            header_pressure_value: data.headerPressureBar || null,
            system_commission_date: data.systemCommissionDate || null,
            diesel_pump_count: data.dieselEngine || 0,
            electric_pump_count: data.electricalPump || 0,
            jockey_pump_count: data.jockeyPump || 0,
            fire_extinguisher_count: data.numFireExtinguishers || 0,
            hydrant_point_count: data.numHydrantPoints || 0,
            sprinkler_count: data.numSprinklers || 0,
            safe_assembly_area_count: data.numSafeAssemblyAreas || 0,
            amc_vendor_id: data.amcVendorId || null,
            amc_start_date: data.amcStartDate || null,
            amc_end_date: data.amcEndDate || null,
            documents_json: data.fireSafetyDocuments || null
        }, { transaction });
    }

    _hasComplianceData(data) {
        const fields = ['fireNocNumber', 'nocValidityDate', 'fireNocValidityDate', 'insurancePolicyNumber', 'insurerName', 'insuranceValidityDate'];
        return fields.some(field => data[field] !== undefined && data[field] !== null && data[field] !== '');
    }

    async _createComplianceRecord(plantId, data, transaction) {
        await ComplianceRecord.create({
            plant_id: plantId,
            fire_noc_number: data.fireNocNumber || null,
            fire_noc_expiry_date: (data.fireNocValidityDate && data.fireNocValidityDate !== '') ? data.fireNocValidityDate :
                ((data.nocValidityDate && data.nocValidityDate !== '') ? data.nocValidityDate : null),
            insurance_policy_number: data.insurancePolicyNumber || null,
            insurance_name: data.insurerName || null,
            insurance_validity_date: (data.insuranceValidityDate && data.insuranceValidityDate !== '') ? data.insuranceValidityDate : null,
            num_fire_extinguishers: data.complianceNumExtinguishers || 0,
            num_hydrant_points: data.complianceNumHydrants || 0,
            num_sprinklers: data.complianceNumSprinklers || 0,
            num_safe_assembly_areas: data.complianceNumSafeAreas || 0,
            documents_data: data.complianceDocuments || null
        }, { transaction });
    }

    async _updateFloors(buildingId, floors, transaction) {
        if (!floors || floors.length === 0) {
            // Delete all floors if none provided
            await Floor.destroy({ where: { building_id: buildingId }, transaction });
            return;
        }

        // Get existing floor IDs
        const existing = await Floor.findAll({
            where: { building_id: buildingId },
            attributes: ['id']
        });
        const existingIds = existing.map(f => f.id);
        const updatedIds = floors.filter(f => f.id).map(f => f.id);

        // Delete removed floors
        const toDelete = existingIds.filter(id => !updatedIds.includes(id));
        if (toDelete.length > 0) {
            await Floor.destroy({ where: { id: toDelete }, transaction });
        }

        // Update or create each floor
        for (const floorData of floors) {
            if (floorData.id && existingIds.includes(floorData.id)) {
                // Update existing floor
                await Floor.update({
                    floor_name: floorData.floorName,
                    usage_type: floorData.floorUsage || null,
                    floor_area: floorData.floorArea || null
                }, { where: { id: floorData.id }, transaction });

                // Update wings for this floor
                await this._updateWings(floorData.id, floorData.wings, transaction);
            } else {
                // Create new floor
                const floor = await Floor.create({
                    building_id: buildingId,
                    floor_name: floorData.floorName,
                    usage_type: floorData.floorUsage || null,
                    floor_area: floorData.floorArea || null
                }, { transaction });

                // Create wings if provided
                if (floorData.wings && floorData.wings.length > 0) {
                    await this._createWings(floor.id, floorData.wings, transaction);
                } else if (floorData.wing || floorData.wingName) {
                    // Single wing from old format
                    await Wing.create({
                        floor_id: floor.id,
                        wing_name: floorData.wing || floorData.wingName,
                        wing_area: floorData.wingArea || null
                    }, { transaction });
                }
            }
        }
    }

    async _updateWings(floorId, wings, transaction) {
        if (!wings || wings.length === 0) {
            await Wing.destroy({ where: { floor_id: floorId }, transaction });
            return;
        }

        const existing = await Wing.findAll({
            where: { floor_id: floorId },
            attributes: ['id']
        });
        const existingIds = existing.map(w => w.id);
        const updatedIds = wings.filter(w => w.id).map(w => w.id);

        const toDelete = existingIds.filter(id => !updatedIds.includes(id));
        if (toDelete.length > 0) {
            await Wing.destroy({ where: { id: toDelete }, transaction });
        }

        for (const wingData of wings) {
            // Normalize wing data: support "A" or { wingName: "A", ... }
            const isString = typeof wingData === 'string';
            const wingName = isString ? wingData : (wingData.wingName || wingData.wing || '');

            if (wingData.id && existingIds.includes(wingData.id)) {
                // Update existing wing
                if (!isString) {
                    await Wing.update({
                        wing_name: wingName,
                        usage_type: wingData.usage || null,
                        wing_area: wingData.wingArea || null
                    }, { where: { id: wingData.id }, transaction });
                }
            } else {
                // Create new wing
                if (wingName) {
                    await Wing.create({
                        floor_id: floorId,
                        wing_name: wingName,
                        usage_type: (!isString ? wingData.usage : null) || null,
                        wing_area: (!isString ? wingData.wingArea : null) || null
                    }, { transaction });
                }
            }
        }
    }

    async _createWings(floorId, wings, transaction) {
        for (const wingData of wings) {
            const isString = typeof wingData === 'string';
            const wingName = isString ? wingData : (wingData.wingName || wingData.wing || '');

            if (wingName) {
                await Wing.create({
                    floor_id: floorId,
                    wing_name: wingName,
                    usage_type: (!isString ? wingData.usage : null) || null,
                    wing_area: (!isString ? wingData.wingArea : null) || null
                }, { transaction });
            }
        }
    }
}

module.exports = new PlantService();
