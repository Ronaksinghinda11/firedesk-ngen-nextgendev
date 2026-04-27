/**
 * Asset Service
 * Business logic for asset operations
 */

const { Op } = require('sequelize');
const { sequelize } = require('../../../config/config');
const {
    Asset,
    AssetMetadata,
    AssetTestingSchedule,
    AssetFloorplanPosition,
    AssetDocument,
    AssetSpecValue,
    AssetStatusHistory,
    AssetLocationHistory,
    Manufacturer,
    Category,
    Product,
    SpecDefinition,
    Plant,
    Building,
    Floor,
    Wing,
    User,
    Technician,
    TechnicianPlant,
    Manager,
    PlantManager,
    Scheduler,
    ServiceSubmission
} = require('../../models');

// Import scheduler service for generating services when asset is created/updated
const schedulerService = require('../scheduler/schedulerService');
const auditService = require('../../services/audit/audit_service');
const { generateAssetCode } = require('../../utils/asset_code_generator');
const complianceScoreService = require('./complianceScoreService');

/**
 * Create a new asset with related data
 */
const create_asset = async (asset_data, user) => {
    // Handle both user object or ID
    const user_id = user?.id || user;
    const userObj = typeof user === 'object' ? user : null;

    console.log('📝 Creating asset with data:', JSON.stringify(asset_data, null, 2));
    console.log('👤 User ID:', user_id);

    const transaction = await sequelize.transaction();

    try {
        let {
            asset_code,
            plant_id,
            building_id,
            floor_id,
            wing_id,
            location,
            category_id,
            product_id,
            manufacturer_id,
            type,
            sub_type,
            manufacturing_date,
            install_date,
            warranty_end_date,
            lifespan_years,
            latitude,
            longitude,
            status,
            health_status,
            maintenance_status,
            last_refill_date,
            conditions,
            metadata,
            testing_schedule,
            documents,
            spec_values
        } = asset_data;

        // Normalize UUID fields: convert empty strings to null to avoid Postgres UUID errors
        const normalizeUUID = (value) => (value === '' || value === undefined) ? null : value;

        plant_id = normalizeUUID(plant_id);
        building_id = normalizeUUID(building_id);
        floor_id = normalizeUUID(floor_id);
        wing_id = normalizeUUID(wing_id);
        category_id = normalizeUUID(category_id);
        product_id = normalizeUUID(product_id);
        manufacturer_id = normalizeUUID(manufacturer_id);

        // Validate mandatory fields with clear error messages
        const missingFields = [];
        if (!plant_id) missingFields.push('Plant');
        if (!category_id) missingFields.push('Category');
        if (!product_id) missingFields.push('Product');
        if (!type) missingFields.push('Type');
        if (!manufacturing_date) missingFields.push('Manufacturing Date');
        if (!install_date) missingFields.push('Installation Date');
        if (!maintenance_status) missingFields.push('Maintenance Status');

        if (missingFields.length > 0) {
            const errorMessage = missingFields.length === 1
                ? `${missingFields[0]} is required`
                : `The following fields are required: ${missingFields.join(', ')}`;
            throw new Error(errorMessage);
        }

        // Validate that Installation Date is not before Manufacturing Date
        if (new Date(install_date) < new Date(manufacturing_date)) {
            throw new Error('Installation Date cannot be before Manufacturing Date');
        }

        // Auto-generate asset code if not provided
        if (!asset_code) {
            if (!category_id || !product_id) {
                throw new Error('Category and Product are required to generate asset code');
            }
            asset_code = await generateAssetCode(category_id, product_id, transaction);
            console.log('🔢 Auto-generated asset code:', asset_code);
        }

        // Create asset with retry logic for unique constraint violations
        let asset;
        let retries = 5;
        let lastError;

        while (retries > 0) {
            try {
                asset = await Asset.create({
                    asset_code,
                    plant_id,
                    building_id,
                    floor_id,
                    wing_id,
                    location,
                    category_id,
                    product_id,
                    manufacturer_id,
                    created_by: user_id,
                    type,
                    sub_type,
                    manufacturing_date,
                    install_date,
                    warranty_end_date,
                    lifespan_years,
                    latitude,
                    longitude,
                    status: status || 'ACTIVE',
                    health_status: health_status || 'HEALTHY',
                    maintenance_status: maintenance_status || 'IN_HOUSE',
                    conditions
                }, { transaction });
                break; // Success, exit retry loop
            } catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError' && error.fields?.asset_code) {
                    console.log(`⚠️ Asset code ${asset_code} already exists, generating new code...`);
                    // Generate a new code and retry
                    asset_code = await generateAssetCode(category_id, product_id, transaction);
                    console.log('🔢 Retry with new asset code:', asset_code);
                    retries--;
                    lastError = error;
                    if (retries === 0) {
                        throw new Error('Failed to generate unique asset code after multiple attempts');
                    }
                } else {
                    throw error; // Re-throw non-duplicate errors
                }
            }
        }

        // Create metadata if provided
        if (metadata) {
            await AssetMetadata.create({
                asset_id: asset.id,
                tag: metadata.tag,
                serial_number: metadata.serial_number,
                model: metadata.model
            }, { transaction });
        }

        // Create testing schedule - auto-initialize with manufacturing_date
        // Only populate HP test and refill data if category requires test frequency
        if (manufacturing_date) {
            // Check if category requires test frequency
            let categoryRequiresTestFreq = false;
            if (category_id) {
                const category = await Category.findByPk(category_id);
                categoryRequiresTestFreq = category?.test_frequency_required === true;
            }

            // Only create testing schedule with HP test/refill data if category requires it
            if (categoryRequiresTestFreq) {
                // Get test frequency from product
                let test_frequency_months = testing_schedule?.test_frequency_months;
                if (!test_frequency_months && product_id) {
                    const product = await Product.findByPk(product_id);
                    if (product?.test_frequency) {
                        const frequencyMap = {
                            'One Year': 12,
                            'Two Years': 24,
                            'Three Years': 36,
                            'Five Years': 60,
                            'Ten Years': 120
                        };
                        test_frequency_months = frequencyMap[product.test_frequency] || 60;
                    }
                }
                // Default to 60 months (5 years) if no frequency set
                test_frequency_months = test_frequency_months || 60;

                // Calculate next_hp_test_due_date = manufacturing_date + 5 years (initial)
                const mfgDate = new Date(manufacturing_date);
                const nextHpTestDate = new Date(mfgDate);
                nextHpTestDate.setMonth(nextHpTestDate.getMonth() + 60); // +5 years for initial
                const next_hp_test_due_date = testing_schedule?.next_hp_test_due_date || nextHpTestDate.toISOString().split('T')[0];

                // Format manufacturing_date for JSONB storage
                const mfgDateStr = mfgDate.toISOString().split('T')[0];

                await AssetTestingSchedule.create({
                    asset_id: asset.id,
                    // Initialize with manufacturing_date as JSONB array
                    last_hp_test_date: [mfgDateStr],
                    last_refill_date: [mfgDateStr],
                    next_hp_test_due_date: next_hp_test_due_date,
                    test_frequency_months: test_frequency_months
                }, { transaction });
            }
            // If category doesn't require test frequency, don't create testing schedule with HP/refill data
        }

        // Create documents if provided
        if (documents && Array.isArray(documents)) {
            for (const doc of documents) {
                await AssetDocument.create({
                    asset_id: asset.id,
                    document_url: doc.document_url,
                    description: doc.description
                }, { transaction });
            }
        }

        // Create spec values if provided
        if (spec_values && Array.isArray(spec_values)) {
            for (const spec of spec_values) {
                await AssetSpecValue.create({
                    asset_id: asset.id,
                    spec_definition_id: spec.spec_definition_id,
                    spec_value: spec.spec_value,
                    unit: spec.unit || null
                }, { transaction });
            }
        }

        await transaction.commit();

        // Calculate initial compliance score (fire-and-forget, non-blocking)
        complianceScoreService.updateComplianceScore(asset.id)
            .then(score => {
                console.log(`📊 Initial compliance score for asset ${asset.id}: ${score}%`);
            })
            .catch(scoreError => {
                console.error('⚠️ Error calculating initial compliance score:', scoreError.message);
            });

        // Generate services for this new asset if a matching scheduler exists (fire-and-forget, non-blocking)
        if (plant_id && category_id) {
            console.log(`📅 Triggering async service generation for new asset ${asset.id} in plant ${plant_id}`);
            schedulerService.generateServicesForAsset(asset.id, plant_id)
                .then(serviceResult => {
                    console.log(`📅 Service generation completed for asset ${asset.id}:`, serviceResult);
                })
                .catch(serviceError => {
                    console.error('⚠️ Error generating services for new asset:', serviceError.message);
                });
        }

        // Audit Log
        try {
            await auditService.log({
                entityType: 'asset',
                entityId: asset.id,
                entityName: asset.asset_code,
                action: 'CREATE',
                user: userObj ? { id: userObj.id, name: userObj.name, type: userObj.userType } : { id: user_id },
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for create_asset:', error.message);
        }

        // Return complete asset with relations
        return await get_asset_by_id(asset.id);

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Create asset error:', {
            message: error.message,
            name: error.name,
            sql: error.sql,
            fields: error.fields,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Get all assets with filtering and pagination
 */
const get_all_assets = async (filters, user) => {
    const {
        page = 1,
        limit = 10,
        plant_id,
        building_id,
        floor_id,
        wing_id,
        category_id,
        product_id,
        manufacturer_id,
        status,
        health_status,
        maintenance_status,
        type,
        sub_type,
        location,
        search,
        capacity, // Add capacity filter
        sort_by = 'created_at',
        sort_order = 'DESC',
        allowedPlantIds: filterAllowedPlantIds // Support allowedPlantIds passed directly in filters
    } = filters;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // If user is Manager, restrict to assigned plants
    let allowedPlantIds = null;
    const userRoleName = user?.role?.name || user?.user_type || '';

    console.log(`[DEBUG] get_all_assets user role check: role.name=${user?.role?.name}, user_type=${user?.user_type}, detected=${userRoleName}`);

    // First, check if allowedPlantIds was passed directly in filters (from controller middleware)
    if (filterAllowedPlantIds && Array.isArray(filterAllowedPlantIds) && filterAllowedPlantIds.length > 0) {
        allowedPlantIds = filterAllowedPlantIds;
        console.log(`[DEBUG] Using allowedPlantIds from filters:`, allowedPlantIds);
    }
    // Otherwise, if user is Manager, look up their assigned plants
    else if (user && (userRoleName === 'Manager')) {
        const userId = user.id;
        const manager = await Manager.findOne({ where: { user_id: userId } });
        if (manager) {
            const assignedPlants = await PlantManager.findAll({
                where: { manager_id: manager.id },
                attributes: ['plant_id']
            });
            allowedPlantIds = assignedPlants.map(pm => pm.plant_id);
            console.log(`[DEBUG] Manager ${user.email} (ID: ${userId}) allowed plants:`, allowedPlantIds);


            // If no plants assigned, return empty result immediately
            if (allowedPlantIds.length === 0) {
                return {
                    assets: [],
                    pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), total_pages: 0 }
                };
            }
        }
    }

    // MANAGER PLANT FILTERING - This is the key security enforcement
    // If allowedPlantIds is provided (manager is logged in), restrict to those plants
    if (allowedPlantIds && allowedPlantIds.length > 0) {
        const requestedPlantId = plant_id || filters.plantId;

        if (requestedPlantId) {
            // Manager requested a specific plant - validate access
            if (allowedPlantIds.includes(requestedPlantId)) {
                where.plant_id = requestedPlantId;
                console.log(`[AssetService] Manager accessing authorized plant: ${requestedPlantId}`);
            } else {
                // Manager trying to access unauthorized plant - return empty result
                console.warn(`[AssetService] Manager attempted to access unauthorized plant: ${requestedPlantId}`);
                return {
                    assets: [],
                    pagination: {
                        total: 0,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total_pages: 0
                    }
                };
            }
        } else {
            // No specific plant requested - filter to all allowed plants
            where.plant_id = { [Op.in]: allowedPlantIds };
            console.log(`[AssetService] Manager restricted to plants: ${allowedPlantIds.join(', ')}`);
        }
    } else {
        // Non-manager (admin) - apply standard plant filter if provided
        if (plant_id) where.plant_id = plant_id;
        if (filters.plantId) where.plant_id = filters.plantId; // Support camelCase param from frontend
    }

    // Apply other filters
    if (building_id) where.building_id = building_id;
    if (floor_id) where.floor_id = floor_id;
    if (wing_id) where.wing_id = wing_id;
    if (category_id) where.category_id = category_id;
    if (product_id) where.product_id = product_id;
    if (manufacturer_id) where.manufacturer_id = manufacturer_id;
    if (status) where.status = status;
    if (health_status) where.health_status = health_status;
    if (maintenance_status) where.maintenance_status = maintenance_status;
    if (type) where.type = type;
    if (sub_type) where.sub_type = sub_type;
    if (location) where.location = { [Op.iLike]: `%${location}%` };

    // Support for "NOT" filters (e.g., product_id_not, type_not)
    // This allows filtering like "show all assets where product is NOT CO2"
    const { 
        plant_id_not, building_id_not, floor_id_not, wing_id_not,
        category_id_not, product_id_not, manufacturer_id_not,
        status_not, health_status_not, maintenance_status_not,
        type_not, sub_type_not, location_not
    } = filters;
    
    if (plant_id_not) where.plant_id = { [Op.ne]: plant_id_not };
    if (building_id_not) where.building_id = { [Op.ne]: building_id_not };
    if (floor_id_not) where.floor_id = { [Op.ne]: floor_id_not };
    if (wing_id_not) where.wing_id = { [Op.ne]: wing_id_not };
    if (category_id_not) where.category_id = { [Op.ne]: category_id_not };
    if (product_id_not) where.product_id = { [Op.ne]: product_id_not };
    if (manufacturer_id_not) where.manufacturer_id = { [Op.ne]: manufacturer_id_not };
    if (status_not) where.status = { [Op.ne]: status_not };
    if (health_status_not) where.health_status = { [Op.ne]: health_status_not };
    if (maintenance_status_not) where.maintenance_status = { [Op.ne]: maintenance_status_not };
    if (type_not) where.type = { [Op.ne]: type_not };
    if (sub_type_not) where.sub_type = { [Op.ne]: sub_type_not };
    if (location_not) where.location = { [Op.notILike]: `%${location_not}%` };

    // Search by asset code
    if (search) {
        where.asset_code = { [Op.iLike]: `%${search}%` };
    }

    // When filtering by DEACTIVE status, include soft-deleted records
    // This allows the archive view to show archived assets

    // Build order clause - handle both direct fields and nested associations
    let orderClause;

    // Map model references for nested sorting (using already-imported models)
    const modelMap = {
        'plant': Plant,
        'building': Building,
        'floor': Floor,
        'wing': Wing,
        'category': Category,
        'product': Product,
        'manufacturer': Manufacturer
    };

    // Map sort fields to nested association sorting
    const nestedSortMap = {
        'plant_id': ['plant', 'plant_name'],
        'building_id': ['building', 'building_name'],
        'floor_id': ['floor', 'floor_name'],
        'wing_id': ['wing', 'wing_name'],
        'category_id': ['category', 'category_name'],
        'product_id': ['product', 'product_name'],
        'manufacturer_id': ['manufacturer', 'name']
    };

    // Check if we should sort by a nested field
    if (nestedSortMap[sort_by]) {
        const [association, field] = nestedSortMap[sort_by];
        const model = modelMap[association];
        if (model) {
            orderClause = [[{ model: model, as: association }, field, sort_order.toUpperCase()]];
            console.log(`[AssetService] Sorting by nested field: ${association}.${field} ${sort_order.toUpperCase()}`);
        } else {
            console.warn(`[AssetService] Model not found for association: ${association}, falling back to direct sort`);
            orderClause = [[sort_by, sort_order.toUpperCase()]];
        }
    } else {
        // Direct field sorting
        orderClause = [[sort_by, sort_order.toUpperCase()]];
        console.log(`[AssetService] Sorting by direct field: ${sort_by} ${sort_order.toUpperCase()}`);
    }

    // Build spec_values include with capacity filter if provided
    const specValuesInclude = {
        model: AssetSpecValue,
        as: 'spec_values',
        include: [{ model: SpecDefinition, as: 'spec_definition' }],
        required: false // Default to optional join
    };

    // Handle capacity_not filter (isNot) - use subquery for efficiency
    const { capacity_not } = filters;
    
    if (capacity_not) {
        console.log(`[AssetService] Applying capacity NOT filter: ${capacity_not}`);

        // Parse capacity value - it might be in format "value unit" or just "value"
        const capacityStr = String(capacity_not).trim();
        const capacityParts = capacityStr.split(/\s+/);
        const capacityValue = capacityParts[0];

        // Sanitize the capacity value to prevent SQL injection
        const safeCapacityValue = capacityValue.replace(/'/g, "''"); // Escape single quotes

        // Use a NOT IN subquery to exclude assets with this capacity
        // This efficiently excludes assets that have the specified capacity
        // and automatically includes assets without any capacity spec
        where.id = {
            [Op.notIn]: sequelize.literal(`(
                SELECT DISTINCT asv.asset_id 
                FROM asset_spec_values asv
                JOIN spec_definitions sd ON sd.id = asv.spec_definition_id
                WHERE sd.spec_name ILIKE '%capacity%' 
                AND (asv.spec_value = '${safeCapacityValue}' OR asv.spec_value ILIKE '${safeCapacityValue}')
            )`)
        };
    }
    // If capacity filter is provided, add WHERE clause and make join required
    else if (capacity) {
        console.log(`[AssetService] Applying capacity filter: ${capacity}`);

        // Parse capacity value - it might be in format "value unit" or just "value"
        const capacityStr = String(capacity).trim();
        const capacityParts = capacityStr.split(/\s+/);
        const capacityValue = capacityParts[0];
        const capacityUnit = capacityParts.length > 1 ? capacityParts.slice(1).join(' ') : null;

        specValuesInclude.required = true; // Make it an INNER JOIN

        // Exact match only for capacity value (case-insensitive)
        specValuesInclude.where = {
            [Op.or]: [
                { spec_value: capacityValue }, // Exact match (case-sensitive)
                { spec_value: { [Op.iLike]: capacityValue } }, // Exact match (case-insensitive)
            ]
        };

        // If unit is specified, filter by it too (case-insensitive exact match)
        if (capacityUnit) {
            specValuesInclude.where.unit = { [Op.iLike]: capacityUnit };
        }

        // Add nested where for spec_definition to filter by 'Capacity' spec
        specValuesInclude.include = [{
            model: SpecDefinition,
            as: 'spec_definition',
            where: {
                spec_name: { [Op.iLike]: '%capacity%' } // Case-insensitive match for 'Capacity'
            },
            required: true
        }];
    }

    const queryOptions = {
        where,
        distinct: true, // Fix: Count only unique assets, not inflated count from hasMany joins (spec_values, documents)
        col: 'id', // Explicitly count on asset.id to ensure correct count with joins
        subQuery: false, // CRITICAL: Prevents Sequelize from sorting AFTER pagination - ensures global sorting
        include: [
            { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'plant_code'] },
            { model: Building, as: 'building', attributes: ['id', 'building_name'] },
            { model: Floor, as: 'floor', attributes: ['id', 'floor_name'] },
            { model: Wing, as: 'wing', attributes: ['id', 'wing_name'] },
            { model: Category, as: 'category', attributes: ['id', 'category_name', 'category_code', 'test_frequency_required'] },
            { model: Product, as: 'product', attributes: ['id', 'product_name', 'product_code'] },
            { model: Manufacturer, as: 'manufacturer', attributes: ['id', 'name'] },
            { model: AssetMetadata, as: 'metadata' },
            { model: AssetTestingSchedule, as: 'testing_schedule' },
            { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
            specValuesInclude
        ],
        order: orderClause,
        limit: parseInt(limit),
        offset,
        // Include soft-deleted records when querying archived assets
        paranoid: status !== 'DEACTIVE'
    };

    const { count, rows: assets } = await Asset.findAndCountAll(queryOptions);

    return {
        assets,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(count / parseInt(limit))
        }
    };
};

/**
 * Get single asset by ID with all relations
 */
const get_asset_by_id = async (id) => {
    return await Asset.findByPk(id, {
        include: [
            { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'plant_code'] },
            { model: Building, as: 'building', attributes: ['id', 'building_name'] },
            { model: Floor, as: 'floor', attributes: ['id', 'floor_name'] },
            { model: Wing, as: 'wing', attributes: ['id', 'wing_name'] },
            { model: Category, as: 'category', attributes: ['id', 'category_name', 'category_code', 'test_frequency_required'] },
            { model: Product, as: 'product', attributes: ['id', 'product_name', 'product_code', 'image'] },
            { model: Manufacturer, as: 'manufacturer', attributes: ['id', 'name'] },
            { model: AssetMetadata, as: 'metadata' },
            { model: AssetTestingSchedule, as: 'testing_schedule' },
            { model: AssetFloorplanPosition, as: 'floorplan_position' },
            { model: AssetDocument, as: 'documents' },
            {
                model: AssetSpecValue,
                as: 'spec_values',
                include: [{ model: SpecDefinition, as: 'spec_definition' }]
            },
            { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
        ]
    });
};

/**
 * Update asset
 */
const update_asset = async (id, asset_data, user) => {
    // Handle both user object or ID
    const user_id = user?.id || user;
    const userObj = typeof user === 'object' ? user : null;

    const transaction = await sequelize.transaction();

    try {
        const {
            asset_code,
            plant_id,
            building_id,
            floor_id,
            wing_id,
            location,
            category_id,
            product_id,
            manufacturer_id,
            type,
            sub_type,
            manufacturing_date,
            install_date,
            warranty_end_date,
            lifespan_years,
            latitude,
            longitude,
            status,
            health_status,
            maintenance_status,
            last_refill_date,
            conditions,
            metadata,
            testing_schedule,
            documents,
            spec_values
        } = asset_data;

        // Normalize UUID fields: convert empty strings to null to avoid Postgres UUID errors
        const normalizeUUID = (value) => (value === '' || value === undefined) ? null : value;

        const normalized_plant_id = normalizeUUID(plant_id);
        const normalized_building_id = normalizeUUID(building_id);
        const normalized_floor_id = normalizeUUID(floor_id);
        const normalized_wing_id = normalizeUUID(wing_id);
        const normalized_category_id = normalizeUUID(category_id);
        const normalized_product_id = normalizeUUID(product_id);
        const normalized_manufacturer_id = normalizeUUID(manufacturer_id);

        const asset = await Asset.findByPk(id);
        if (!asset) {
            throw new Error('Asset not found');
        }

        // Capture old values for audit log (asset table + metadata table)
        const oldValues = asset.toJSON();
        const oldMetadata = await AssetMetadata.findOne({ where: { asset_id: id } });
        const oldMetadataValues = oldMetadata ? {
            tag: oldMetadata.tag,
            serial_number: oldMetadata.serial_number,
            model: oldMetadata.model
        } : { tag: null, serial_number: null, model: null };

        // Track changes that affect service generation
        const old_plant_id = asset.plant_id;
        const old_category_id = asset.category_id;
        const plant_changed = normalized_plant_id && normalized_plant_id !== old_plant_id;
        const category_changed = normalized_category_id && normalized_category_id !== old_category_id;

        // Track health status change
        const old_health_status = asset.health_status;
        const health_changed = health_status && health_status !== old_health_status;

        // Geolocation: Only update if provided AND not already set (freeze first location)
        const finalLatitude = latitude !== undefined ? latitude : (asset.latitude || null);
        const finalLongitude = longitude !== undefined ? longitude : (asset.longitude || null);

        // If latitude/longitude provided but asset doesn't have it yet, this is the first scan - freeze it
        const shouldFreezeLocation = (latitude !== undefined && asset.latitude === null) ||
            (longitude !== undefined && asset.longitude === null);

        // Handle location field - allow clearing to empty/null if explicitly provided
        // Check if 'location' key exists in asset_data (even if value is empty string or null)
        const locationInRequest = 'location' in asset_data;
        const finalLocation = locationInRequest ? (location === '' || location === null || location === undefined ? null : location) : asset.location;

        // Determine final dates (use updated value if present, else fallback to existing)
        const finalManufacturingDate = manufacturing_date !== undefined ? manufacturing_date : asset.manufacturing_date;
        const finalInstallDate = install_date !== undefined ? install_date : asset.install_date;

        // Validate that Installation Date is not before Manufacturing Date
        if (finalManufacturingDate && finalInstallDate) {
            if (new Date(finalInstallDate) < new Date(finalManufacturingDate)) {
                throw new Error('Installation Date cannot be before Manufacturing Date');
            }
        }

        // Update asset with geolocation freeze logic
        await asset.update({
            asset_code,
            plant_id: normalized_plant_id,
            building_id: normalized_building_id,
            floor_id: normalized_floor_id,
            wing_id: normalized_wing_id,
            location: finalLocation,
            category_id: normalized_category_id,
            product_id: normalized_product_id,
            manufacturer_id: normalized_manufacturer_id,
            type,
            sub_type,
            manufacturing_date,
            install_date,
            warranty_end_date,
            lifespan_years,
            latitude: finalLatitude,
            longitude: finalLongitude,
            status,
            health_status,
            maintenance_status,
            last_refill_date,
            conditions,
            updated_at: new Date() // Explicitly set updated_at
        }, { transaction });

        // Record health status change
        if (health_changed) {
            await AssetStatusHistory.create({
                asset_id: id,
                old_health_statuses: [old_health_status],
                new_health_status: health_status,
                changed_by: user_id,
                changed_at: new Date(),
                source_type: 'MANUAL_UPDATE'
            }, { transaction });
        }

        // Update metadata
        if (metadata) {
            await AssetMetadata.upsert({
                asset_id: id,
                tag: metadata.tag,
                serial_number: metadata.serial_number,
                model: metadata.model
            }, { transaction });
        }

        // Update testing schedule - only if category requires test frequency
        if (testing_schedule && testing_schedule.last_hp_test_date) {
            // Check if category requires test frequency
            const categoryToCheck = normalized_category_id || asset.category_id;
            let categoryRequiresTestFreq = false;
            if (categoryToCheck) {
                const category = await Category.findByPk(categoryToCheck);
                categoryRequiresTestFreq = category?.test_frequency_required === true;
            }

            // Only update HP test/refill data if category requires it
            if (categoryRequiresTestFreq) {
                // Get test frequency from product
                const product = await Product.findByPk(normalized_product_id || asset.product_id);
                let test_frequency_months = testing_schedule.test_frequency_months;

                // Convert product test_frequency enum to months if not provided
                if (!test_frequency_months && product?.test_frequency) {
                    const frequencyMap = {
                        'One Year': 12,
                        'Two Years': 24,
                        'Three Years': 36,
                        'Five Years': 60,
                        'Ten Years': 120
                    };
                    test_frequency_months = frequencyMap[product.test_frequency] || 12;
                }

                // HP Test Update Logic:
                // 1. If a new last_hp_test_date is provided, append it to history.
                // 2. Calculate next_hp_test_due_date based on this NEW test date + product frequency.

                // Auto-calculate next test date from last test date + frequency
                let next_hp_test_due_date = testing_schedule.next_hp_test_due_date;
                let last_hp_test_date_history = undefined; // Undefined means don't update if not changed

                if (testing_schedule.last_hp_test_date) {
                    // Fetch current schedule to get existing history
                    const currentSchedule = await AssetTestingSchedule.findOne({ where: { asset_id: id } });
                    const currentHistory = currentSchedule?.last_hp_test_date || [];
                    const historyArray = Array.isArray(currentHistory) ? currentHistory : []; // Handle if it was null or single value

                    // Append new date if it's not already the *latest* entry (simple check to avoid duplicate clicks/updates)
                    // or just append. Set ensures uniqueness if we want, but array is fine for log.
                    // We'll just push.
                    last_hp_test_date_history = [...historyArray, testing_schedule.last_hp_test_date];

                    // Calculate next due date based on THIS new test date + frequency
                    if (test_frequency_months) {
                        const lastTestDate = new Date(testing_schedule.last_hp_test_date);
                        const nextTestDate = new Date(lastTestDate);
                        nextTestDate.setMonth(nextTestDate.getMonth() + test_frequency_months);
                        next_hp_test_due_date = nextTestDate.toISOString().split('T')[0];
                    }
                }

                const updatePayload = {
                    asset_id: id,
                    next_hp_test_due_date: next_hp_test_due_date,
                    test_frequency_months: test_frequency_months,
                    ...(last_hp_test_date_history !== undefined && { last_hp_test_date: last_hp_test_date_history })
                };

                await AssetTestingSchedule.upsert(updatePayload, { transaction });
            }
            // If category doesn't require test frequency, skip updating HP test/refill data
        }

        // Update documents (replace all)
        if (documents && Array.isArray(documents)) {
            await AssetDocument.destroy({ where: { asset_id: id }, transaction });
            for (const doc of documents) {
                await AssetDocument.create({
                    asset_id: id,
                    document_url: doc.document_url,
                    description: doc.description
                }, { transaction });
            }
        }

        // Update spec values (replace all)
        if (spec_values && Array.isArray(spec_values)) {
            await AssetSpecValue.destroy({ where: { asset_id: id }, transaction });
            for (const spec of spec_values) {
                await AssetSpecValue.create({
                    asset_id: id,
                    spec_definition_id: spec.spec_definition_id,
                    spec_value: spec.spec_value,
                    unit: spec.unit || null
                }, { transaction });
            }
        }

        await transaction.commit();

        // Recalculate compliance score (fire-and-forget, non-blocking)
        complianceScoreService.updateComplianceScore(id)
            .then(score => {
                console.log(`📊 Updated compliance score for asset ${id}: ${score}%`);
            })
            .catch(scoreError => {
                console.error('⚠️ Error recalculating compliance score:', scoreError.message);
            });

        // Generate services if plant or category changed (fire-and-forget, non-blocking)
        const finalPlantId = normalized_plant_id || old_plant_id;
        const finalCategoryId = normalized_category_id || old_category_id;

        if ((plant_changed || category_changed) && finalPlantId && finalCategoryId) {
            console.log(`📅 Triggering async service generation for updated asset ${id} (plant/category changed)`);
            schedulerService.generateServicesForAsset(id, finalPlantId)
                .then(serviceResult => {
                    console.log(`📅 Service generation completed for asset ${id}:`, serviceResult);
                })
                .catch(serviceError => {
                    console.error('⚠️ Error generating services for updated asset:', serviceError.message);
                });
        }
        // Audit Log (Fire and Forget)
        try {
            const updatedAsset = await Asset.findByPk(id);
            const changes = auditService.calculateChanges(oldValues, updatedAsset.toJSON()) || {};

            // Also diff metadata fields (tag, serial_number, model) — stored in a separate table
            if (metadata) {
                const newMetadataValues = {
                    tag: metadata.tag ?? null,
                    serial_number: metadata.serial_number ?? null,
                    model: metadata.model ?? null
                };
                for (const field of ['tag', 'serial_number', 'model']) {
                    const oldVal = oldMetadataValues[field] ?? null;
                    const newVal = newMetadataValues[field] ?? null;
                    if (String(oldVal) !== String(newVal)) {
                        changes[field] = { old: oldVal, new: newVal };
                    }
                }
            }

            if (Object.keys(changes).length > 0) {
                auditService.log({
                    entityType: 'asset',
                    entityId: id,
                    entityName: updatedAsset.asset_code,
                    action: 'UPDATE',
                    changes,
                    user: userObj ? { id: userObj.id, name: userObj.name, type: userObj.userType } : { id: user_id },
                    source: 'ui'
                });
            }
        } catch (error) {
            console.error('Audit log failed for update_asset:', error.message);
        }

        return await get_asset_by_id(id);

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Soft delete asset
 */
/**
 * Permanently delete asset from database
 */
const delete_asset = async (id, user) => {
    const userObj = typeof user === 'object' ? user : null;

    const asset = await Asset.findByPk(id);
    if (!asset) {
        throw new Error('Asset not found');
    }

    // Capture snapshot for audit
    const assetCode = asset.asset_code;

    await asset.destroy({ force: true }); // Hard delete (permanently removes from DB)

    // Audit Log
    try {
        auditService.log({
            entityType: 'asset',
            entityId: id,
            entityName: assetCode,
            action: 'DELETE',
            user: userObj ? { id: userObj.id, name: userObj.name, type: userObj.userType } : null,
            source: 'ui'
        });
    } catch (error) {
        console.error('Audit log failed for delete_asset:', error.message);
    }

    return true;
};

/**
 * Restore archived asset
 */
const restore_asset = async (id, asset_data, user) => {
    // Note: Since logic uses hard delete now, restore might not work for deletion.
    // It works if soft delete was used (paranoid: true).

    // Find soft-deleted asset
    const asset = await Asset.findByPk(id, { paranoid: false });
    if (!asset) {
        throw new Error('Asset not found');
    }

    const oldValues = asset.toJSON();

    // Restore the asset (clear deleted_at)
    await asset.restore();

    // Update with new data (including status: ACTIVE)
    const { status } = asset_data;
    await asset.update({
        status: status || 'ACTIVE'
    });

    // Audit Log
    try {
        const restoredAsset = await Asset.findByPk(id);
        const changes = auditService.calculateChanges(oldValues, restoredAsset.toJSON());

        auditService.log({
            entityType: 'asset',
            entityId: id,
            entityName: asset.asset_code,
            action: 'RESTORE',
            changes,
            user: user && typeof user === 'object' ? { id: user.id, name: user.name, type: user.userType } : null,
            source: 'ui'
        });
    } catch (error) {
        console.error('Audit log failed for restore_asset:', error.message);
    }

    return await get_asset_by_id(id);
};

/**
 * Get assets by floor (for floorplan view)
 */
const get_assets_by_floor = async (floor_id) => {
    const assets = await Asset.findAll({
        where: { floor_id },
        include: [
            { model: Category, as: 'category', attributes: ['id', 'category_name', 'category_code'] },
            { model: Product, as: 'product', attributes: ['id', 'product_name'] },
            { model: AssetFloorplanPosition, as: 'floorplan_position' },
            { model: AssetMetadata, as: 'metadata' }
        ]
    });

    if (!assets.length) return [];

    // 1. Fetch Scheduler Frequencies (based on Plant + Category)
    const plantIds = [...new Set(assets.map(a => a.plant_id).filter(Boolean))];
    const categoryIds = [...new Set(assets.map(a => a.category_id).filter(Boolean))];
    const assetIds = assets.map(a => a.id);

    let schedulerMap = {};
    if (plantIds.length > 0 && categoryIds.length > 0) {
        try {
            const schedulers = await Scheduler.findAll({
                where: {
                    plant_id: { [Op.in]: plantIds },
                    category_id: { [Op.in]: categoryIds },
                    is_active: true
                }
            });

            // Map: `${plant_id}_${category_id}` -> scheduler record
            schedulers.forEach(s => {
                schedulerMap[`${s.plant_id}_${s.category_id}`] = s;
            });
        } catch (err) {
            console.error('Error fetching schedulers for floorplan:', err.message);
        }
    }

    // 2. Fetch Last Service Dates (from completed/submitted ServiceSubmissions)
    let serviceMap = {};
    try {
        const lastServices = await ServiceSubmission.findAll({
            attributes: [
                'asset_id',
                'inspection_type',
                [sequelize.fn('MAX', sequelize.col('submitted_at')), 'last_date']
            ],
            where: {
                asset_id: { [Op.in]: assetIds },
                status: { [Op.in]: ['submitted', 'approved'] }
            },
            group: ['asset_id', 'inspection_type'],
            raw: true
        });

        lastServices.forEach(s => {
            const assetId = s.asset_id;
            const type = (s.inspection_type || 'other').toLowerCase();
            const date = s.last_date;

            if (!serviceMap[assetId]) serviceMap[assetId] = {};
            serviceMap[assetId][type] = date;
        });
    } catch (err) {
        console.error('Error fetching last service dates for floorplan:', err.message);
    }

    // 3. Fetch Next Due Dates directly from pre-generated ServiceSubmission rows
    // The scheduler already creates future service rows with scheduled_date — use them as source of truth
    // instead of manually recalculating from last_date + frequency (avoids duplicated logic & date math bugs)
    let nextServiceMap = {};
    try {
        const today = new Date().toISOString().split('T')[0];
        const nextServices = await ServiceSubmission.findAll({
            attributes: [
                'asset_id',
                'inspection_type',
                [sequelize.fn('MIN', sequelize.col('scheduled_date')), 'next_date']
            ],
            where: {
                asset_id: { [Op.in]: assetIds },
                scheduled_date: { [Op.gte]: today },
                status: { [Op.in]: ['draft', 'in_progress'] } // Not yet completed
            },
            group: ['asset_id', 'inspection_type'],
            raw: true
        });

        nextServices.forEach(s => {
            const assetId = s.asset_id;
            const type = (s.inspection_type || 'other').toLowerCase();
            if (!nextServiceMap[assetId]) nextServiceMap[assetId] = {};
            nextServiceMap[assetId][type] = s.next_date;
        });
    } catch (err) {
        console.error('Error fetching next service dates for floorplan:', err.message);
    }

    // Transform to camelCase and flat structure for frontend
    return assets.map(asset => {
        const plainAsset = asset.toJSON();

        // Match scheduler
        const sched = schedulerMap[`${plainAsset.plant_id}_${plainAsset.category_id}`];
        // Match last service dates and next due dates from DB
        const lastDates = serviceMap[plainAsset.id] || {};
        const nextDates = nextServiceMap[plainAsset.id] || {};

        return {
            ...plainAsset,
            // ID mappings
            id: plainAsset.id,
            assetId: plainAsset.asset_code,
            plantId: plainAsset.plant_id,
            buildingId: plainAsset.building_id,
            floorId: plainAsset.floor_id,

            // Category & Product mappings
            category: plainAsset.category ? {
                id: plainAsset.category.id,
                categoryName: plainAsset.category.category_name,
                categoryCode: plainAsset.category.category_code
            } : null,
            product: plainAsset.product ? {
                id: plainAsset.product.id,
                productName: plainAsset.product.product_name
            } : null,

            // Floorplan Position flattening
            floorplanX: plainAsset.floorplan_position?.coordinate_x || null,
            floorplanY: plainAsset.floorplan_position?.coordinate_y || null,

            // Metadata flattening (if needed, but keeping original structure is safer if frontend uses it)
            metadata: plainAsset.metadata || {},

            // Health Status
            healthStatus: plainAsset.health_status,
            status: plainAsset.status,

            // Dates
            createdAt: plainAsset.created_at,
            updatedAt: plainAsset.updated_at,

            // Populated Service Data
            schedulerData: sched ? {
                inspectionFrequency: sched.inspection_frequency,
                testingFrequency: sched.testing_frequency,
                maintenanceFrequency: sched.maintenance_frequency
            } : null,

            serviceDates: {
                lastServiceDates: {
                    inspection: lastDates.inspection || null,
                    testing: lastDates.testing || null,
                    maintenance: lastDates.maintenance || null
                },
                nextServiceDates: {
                    inspection: nextDates.inspection || null,
                    testing: nextDates.testing || null,
                    maintenance: nextDates.maintenance || null
                }
            }
        };
    });
};

/**
 * Update asset floorplan position
 */
const update_floorplan_position = async (asset_id, floor_id, coordinate_x, coordinate_y, user_id) => {
    const asset = await Asset.findByPk(asset_id);
    if (!asset) {
        throw new Error('Asset not found');
    }

    await AssetFloorplanPosition.upsert({
        asset_id,
        floor_id,
        coordinate_x,
        coordinate_y,
        updated_by: user_id
    });

    return true;
};

/**
 * Remove asset from floorplan (deletes the AssetFloorplanPosition record)
 * Coordinates are NOT NULL in the schema so we must delete the row rather than nullify them.
 */
const remove_from_floorplan = async (asset_id) => {
    const asset = await Asset.findByPk(asset_id);
    if (!asset) {
        throw new Error('Asset not found');
    }

    const deleted = await AssetFloorplanPosition.destroy({ where: { asset_id } });
    return { deleted };
};

/**
 * Update asset geolocation
 */
const update_geolocation = async (asset_id, latitude, longitude, user_id = null) => {
    const asset = await Asset.findByPk(asset_id);
    if (!asset) {
        throw new Error('Asset not found');
    }

    // Record in location history
    await AssetLocationHistory.create({
        asset_id,
        latitude,
        longitude,
        recorded_at: new Date(),
        recorded_by: user_id
    });

    // Update current location on asset
    await asset.update({ latitude, longitude });

    return true;
};

/**
 * Get asset status history
 */
const get_status_history = async (asset_id) => {
    return await AssetStatusHistory.findAll({
        where: { asset_id },
        include: [
            { model: User, as: 'changed_by_user', attributes: ['id', 'name'] }
        ],
        order: [['changed_at', 'DESC']]
    });
};

/**
 * Get asset location history
 */
const get_location_history = async (asset_id) => {
    return await AssetLocationHistory.findAll({
        where: { asset_id },
        include: [
            { model: User, as: 'recorded_by_user', attributes: ['id', 'name'] }
        ],
        order: [['recorded_at', 'DESC']]
    });
};

/**
 * Get technician's assigned assets
 */
const get_my_assets = async (user_id, filters) => {
    const { plant_id, category_id, status, health_status, page = 1, limit = 20 } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get technician's assigned plants
    const technician = await Technician.findOne({
        where: { user_id }
    });

    if (!technician) {
        throw new Error('Technician profile not found');
    }

    const assigned_plants = await TechnicianPlant.findAll({
        where: { technician_id: technician.id },
        attributes: ['plant_id']
    });

    const plant_ids = assigned_plants.map(tp => tp.plant_id);

    if (plant_ids.length === 0) {
        return {
            assets: [],
            pagination: { total: 0, page: 1, limit: parseInt(limit), total_pages: 0 }
        };
    }

    const where = {
        plant_id: { [Op.in]: plant_ids }
    };

    if (plant_id && plant_ids.includes(plant_id)) {
        where.plant_id = plant_id;
    }
    if (category_id) where.category_id = category_id;
    if (status) where.status = status;
    if (health_status) where.health_status = health_status;

    const { count, rows: assets } = await Asset.findAndCountAll({
        where,
        include: [
            { model: Plant, as: 'plant', attributes: ['id', 'plant_name'] },
            { model: Building, as: 'building', attributes: ['id', 'building_name'] },
            { model: Floor, as: 'floor', attributes: ['id', 'floor_name'] },
            { model: Category, as: 'category', attributes: ['id', 'category_name'] },
            { model: Product, as: 'product', attributes: ['id', 'product_name'] },
            { model: AssetMetadata, as: 'metadata' }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
    });

    return {
        assets,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(count / parseInt(limit))
        }
    };
};

/**
 * Bulk create/update assets with name-to-ID resolution (upsert by asset_code)
 * If asset_code is provided and matches an existing asset, updates that asset.
 * Otherwise, creates a new asset.
 */
const bulk_create_assets = async (assets_data, user, managerPlantIds = null) => {
    // Accept either full user object or just user_id for backward compatibility
    const user_id = user?.id || user;
    const userObj = typeof user === 'object' && user !== null ? user : null;
    // If managerPlantIds is a non-empty array, the user is a manager with restricted plant access
    const isManager = Array.isArray(managerPlantIds) && managerPlantIds.length > 0;

    console.log('\n========== BULK IMPORT ASSETS START ==========');
    console.log('[BulkImport] Received', assets_data.length, 'records');
    console.log('[BulkImport] First record:', JSON.stringify(assets_data[0], null, 2));
    console.log('===============================================\n');

    const transaction = await sequelize.transaction();
    const created_assets = [];
    const updated_assets = [];
    const errors = [];

    try {
        // Helper to get field from record using multiple possible keys
        const getField = (record, ...keys) => {
            // Check exact keys first
            for (const key of keys) {
                if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
            }

            // Check normalized keys (case-insensitive, ignoring spaces/underscores)
            const normalizedRecord = {};
            Object.keys(record).forEach(k => {
                const val = record[k];
                if (val === undefined || val === null || val === '') return;

                const cleanKey = k.toLowerCase().trim();
                normalizedRecord[cleanKey] = val;
                normalizedRecord[cleanKey.replace(/_/g, '')] = val;
                normalizedRecord[cleanKey.replace(/\s+/g, '')] = val; // "plant name" -> "plantname"
                normalizedRecord[cleanKey.replace(/\s+/g, '_')] = val; // "plant name" -> "plant_name"
                // Handle "Plant ID" -> "plantid" -> maps to "plant" if we stripped ID? No, keep explicit.
            });

            for (const key of keys) {
                const lowerKey = key.toLowerCase();
                if (normalizedRecord[lowerKey]) return normalizedRecord[lowerKey];
                if (normalizedRecord[lowerKey.replace(/_/g, '')]) return normalizedRecord[lowerKey.replace(/_/g, '')];
            }
            return undefined;
        };

        // Pre-fetch lookup data for name-to-ID resolution
        const [allPlants, allCategories, allProducts, allManufacturers] = await Promise.all([
            Plant.findAll({ attributes: ['id', 'plant_name', 'plant_code'] }),
            Category.findAll({ attributes: ['id', 'category_name', 'category_code'] }),
            Product.findAll({ attributes: ['id', 'product_name', 'product_code', 'category_id'] }),
            Manufacturer.findAll({ attributes: ['id', 'name'] })
        ]);

        // Create lookup maps and sets for validation
        const plantMap = new Map();
        const validPlantIds = new Set();
        allPlants.forEach(p => {
            validPlantIds.add(p.id);
            plantMap.set((p.plant_name || '').toLowerCase(), p.id);
            if (p.plant_code) plantMap.set(p.plant_code.toLowerCase(), p.id);
        });

        const categoryMap = new Map();
        const validCategoryIds = new Set();
        allCategories.forEach(c => {
            validCategoryIds.add(c.id);
            categoryMap.set((c.category_name || '').toLowerCase().trim(), c.id);
            if (c.category_code) categoryMap.set(c.category_code.toLowerCase().trim(), c.id);
        });

        const productMap = new Map();
        const validProductIds = new Set();
        allProducts.forEach(p => {
            validProductIds.add(p.id);
            productMap.set((p.product_name || '').toLowerCase().trim(), p.id);
            if (p.product_code) productMap.set(p.product_code.toLowerCase().trim(), p.id);
        });

        const manufacturerMap = new Map();
        const validManufacturerIds = new Set();
        allManufacturers.forEach(m => {
            validManufacturerIds.add(m.id);
            manufacturerMap.set((m.name || '').toLowerCase().trim(), m.id);
        });

        // Pre-fetch existing assets by asset_code for upsert functionality
        const assetCodesToCheck = assets_data
            .map(r => r.asset_code || r.assetId || r['Asset ID'] || r.asset_id)
            .filter(code => code && code.trim() !== '');

        const existingAssetsByCode = new Map();
        if (assetCodesToCheck.length > 0) {
            const existingAssets = await Asset.findAll({
                where: { asset_code: { [Op.in]: assetCodesToCheck } },
                include: [{ model: AssetMetadata, as: 'metadata', required: false }]
            });
            existingAssets.forEach(a => {
                existingAssetsByCode.set(a.asset_code.toLowerCase(), a);
            });
            console.log(`[BulkImport] Found ${existingAssets.length} existing assets by code for potential update`);
        }


        // Pre-fetch ALL buildings, floors, wings at once (not per-plant)
        console.log('[BulkImport] Preloading all location data...');
        const [allBuildings, allFloors, allWings, allSpecDefs] = await Promise.all([
            Building.findAll({ attributes: ['id', 'building_name', 'plant_id'] }),
            Floor.findAll({ attributes: ['id', 'floor_name', 'building_id'] }),
            Wing.findAll({ attributes: ['id', 'wing_name', 'floor_id'] }),
            SpecDefinition.findAll({ attributes: ['id', 'category_id', 'spec_name', 'spec_label', 'spec_unit'] })
        ]);

        // Group by parent for O(1) lookup
        const buildingsByPlant = new Map();
        allBuildings.forEach(b => {
            if (!buildingsByPlant.has(b.plant_id)) buildingsByPlant.set(b.plant_id, []);
            buildingsByPlant.get(b.plant_id).push(b);
        });

        const floorsByBuilding = new Map();
        allFloors.forEach(f => {
            if (!floorsByBuilding.has(f.building_id)) floorsByBuilding.set(f.building_id, []);
            floorsByBuilding.get(f.building_id).push(f);
        });

        const wingsByFloor = new Map();
        allWings.forEach(w => {
            if (!wingsByFloor.has(w.floor_id)) wingsByFloor.set(w.floor_id, []);
            wingsByFloor.get(w.floor_id).push(w);
        });

        // Group spec definitions by category
        const specDefsByCategory = new Map();
        allSpecDefs.forEach(s => {
            if (!specDefsByCategory.has(s.category_id)) specDefsByCategory.set(s.category_id, []);
            specDefsByCategory.get(s.category_id).push(s);
        });

        console.log(`[BulkImport] Loaded ${allBuildings.length} buildings, ${allFloors.length} floors, ${allWings.length} wings, ${allSpecDefs.length} spec definitions`);

        // ============ PRE-GENERATE ASSET CODES IN BATCH ============
        // This avoids N+1 query pattern for generateAssetCode
        console.log('[BulkImport] Pre-generating asset codes...');

        // Helper to extract code from name (same logic as asset_code_generator)
        const extractCode = (name) => {
            if (!name || typeof name !== 'string') return 'XX';
            const cleaned = name.trim();
            const words = cleaned.split(/\s+/).filter(w => w.length > 0);
            if (words.length >= 2) {
                return (words[0].substring(0, 1) + words[1].substring(0, 1)).toUpperCase();
            }
            return cleaned.substring(0, 2).toUpperCase();
        };

        // Build category/product code maps
        const categoryCodeMap = new Map();
        allCategories.forEach(c => {
            categoryCodeMap.set(c.id, extractCode(c.category_name));
        });
        const productCodeMap = new Map();
        allProducts.forEach(p => {
            productCodeMap.set(p.id, extractCode(p.product_name));
        });

        // Pre-fetch ALL existing asset codes to find max sequence per prefix
        const allExistingAssets = await Asset.findAll({
            attributes: ['asset_code'],
            raw: true
        });

        // Build a map of prefix -> max sequence { letter, number }
        const prefixMaxSequence = new Map();
        allExistingAssets.forEach(a => {
            if (!a.asset_code) return;
            const parts = a.asset_code.split('-');
            if (parts.length !== 4) return;
            const prefix = `${parts[0]}-${parts[1]}`;
            const letter = parts[2];
            const num = parseInt(parts[3], 10) || 0;

            const existing = prefixMaxSequence.get(prefix);
            if (!existing) {
                prefixMaxSequence.set(prefix, { letter, number: num });
            } else {
                // Compare: higher letter wins, then higher number
                if (letter > existing.letter || (letter === existing.letter && num > existing.number)) {
                    prefixMaxSequence.set(prefix, { letter, number: num });
                }
            }
        });

        // Track codes we're generating in this batch to avoid duplicates
        const generatedCodesInBatch = new Map(); // prefix -> { letter, number }

        const generateBatchAssetCode = (categoryId, productId, index) => {
            const catCode = categoryCodeMap.get(categoryId) || 'XX';
            const prodCode = productCodeMap.get(productId) || 'XX';
            const prefix = `${catCode}-${prodCode}`;

            // Get current max from DB or from this batch
            let current = generatedCodesInBatch.get(prefix) || prefixMaxSequence.get(prefix) || { letter: 'A', number: 0 };

            // Increment
            let nextLetter = current.letter;
            let nextNumber = current.number + 1;

            if (nextNumber > 9999) {
                // Move to next letter
                const charCode = nextLetter.charCodeAt(0);
                if (charCode < 90) { // Before Z
                    nextLetter = String.fromCharCode(charCode + 1);
                    nextNumber = 1;
                }
                // If Z, just continue with higher numbers
            }

            // Store for next iteration
            generatedCodesInBatch.set(prefix, { letter: nextLetter, number: nextNumber });

            // Format number
            const formattedNum = nextNumber <= 9999 ? String(nextNumber).padStart(4, '0') : String(nextNumber);
            return `${prefix}-${nextLetter}-${formattedNum}`;
        };

        console.log(`[BulkImport] Found ${allExistingAssets.length} existing assets for code generation reference`);

        // PHASE 1: Validate and prepare all data in memory
        console.log('[BulkImport] Phase 1: Validating and preparing data...');
        const assetsToCreate = [];
        const assetsToUpdate = [];
        const totalRecords = assets_data.length;
        let lastProgressLog = 0;

        for (let i = 0; i < assets_data.length; i++) {
            // Progress logging every 100 records
            if (i - lastProgressLog >= 100 || i === totalRecords - 1) {
                console.log(`[BulkImport] Processing record ${i + 1}/${totalRecords}...`);
                lastProgressLog = i;
            }

            const record = assets_data[i];
            const asset_code = getField(record, 'asset_code', 'assetId', 'Asset ID', 'Asset Code');
            const existingAsset = asset_code ? existingAssetsByCode.get(asset_code.toLowerCase()) : null;

            try {
                // --- RESOLUTION PHASE ---

                // Resolve Plant
                let plant_id = null;
                const plantInput = getField(record, 'plant_id', 'plantId', 'Plant ID', 'plant', 'Plant', 'plant_name', 'Plant Name');
                if (plantInput) {
                    if (validPlantIds.has(plantInput)) plant_id = plantInput;
                    else plant_id = plantMap.get(plantInput.toLowerCase());
                }

                if (!plant_id && !existingAsset) {
                    // Only error on missing plant if creating
                    errors.push({ row: i + 1, error: `Plant "${plantInput || 'Missing'}" not found or required` });
                    continue;
                }

                // Manager plant access validation
                const effectivePlantId = plant_id || (existingAsset ? existingAsset.plant_id : null);
                if (isManager && effectivePlantId && !managerPlantIds.includes(effectivePlantId)) {
                    const plantName = plantInput || allPlants.find(p => p.id === effectivePlantId)?.plant_name || effectivePlantId;
                    errors.push({ row: i + 1, error: `Plant "${plantName}" is not assigned to you. You can only import assets for your assigned plants.` });
                    continue;
                }

                // Resolve Building from preloaded data
                let building_id = null;
                const buildingInput = getField(record, 'building_id', 'buildingId', 'Building ID', 'building', 'Building', 'building_name', 'Building Name');
                if (plant_id && buildingInput) {
                    const plantBuildings = buildingsByPlant.get(plant_id) || [];
                    const building = plantBuildings.find(b =>
                        b.id === buildingInput ||
                        (b.building_name || '').toLowerCase().trim() === buildingInput.toLowerCase().trim()
                    );
                    if (building) building_id = building.id;
                }

                if (!building_id && !existingAsset) {
                    errors.push({ row: i + 1, error: `Building "${buildingInput || 'Missing'}" not found in plant` });
                    continue;
                }

                // Resolve Floor from preloaded data (Optional)
                let floor_id = null;
                const floorInput = getField(record, 'floor_id', 'floorId', 'Floor ID', 'floor', 'Floor', 'floor_name', 'Floor Name');
                if (building_id && floorInput) {
                    const buildingFloors = floorsByBuilding.get(building_id) || [];
                    const floor = buildingFloors.find(f =>
                        f.id === floorInput ||
                        (f.floor_name || '').toLowerCase().trim() === floorInput.toLowerCase().trim()
                    );
                    if (floor) floor_id = floor.id;
                }

                // Resolve Wing from preloaded data (Optional)
                let wing_id = null;
                const wingInput = getField(record, 'wing_id', 'wingId', 'Wing ID', 'wing', 'Wing', 'wing_name', 'Wing Name');
                if (floor_id && wingInput) {
                    const floorWings = wingsByFloor.get(floor_id) || [];
                    const wing = floorWings.find(w =>
                        w.id === wingInput ||
                        (w.wing_name || '').toLowerCase().trim() === wingInput.toLowerCase().trim()
                    );
                    if (wing) wing_id = wing.id;
                }

                // Resolve Category
                let category_id = null;
                const categoryInput = getField(record, 'category_id', 'categoryId', 'Category ID', 'category', 'Category', 'category_name', 'Category Name', 'productCategoryId', 'Product Category');
                if (categoryInput) {
                    if (validCategoryIds.has(categoryInput)) category_id = categoryInput;
                    else category_id = categoryMap.get(categoryInput.toLowerCase());
                }

                if (!category_id && !existingAsset) {
                    errors.push({ row: i + 1, error: `Category "${categoryInput || 'Missing'}" not found` });
                    continue;
                }

                // Resolve Product
                let product_id = null;
                const productInput = getField(record, 'product_id', 'productId', 'Product ID', 'product', 'Product', 'product_name', 'Product Name');
                if (productInput) {
                    if (validProductIds.has(productInput)) product_id = productInput;
                    else product_id = productMap.get(productInput.toLowerCase());
                }

                if (!product_id && !existingAsset) {
                    errors.push({ row: i + 1, error: `Product "${productInput || 'Missing'}" not found` });
                    continue;
                }

                // Resolve Manufacturer (Optional)
                let manufacturer_id = null;
                const manufacturerInput = getField(record, 'manufacturer_id', 'manufacturerId', 'Manufacturer ID', 'manufacturer', 'Manufacturer', 'manufacturer_name');
                if (manufacturerInput) {
                    if (validManufacturerIds.has(manufacturerInput)) manufacturer_id = manufacturerInput;
                    else manufacturer_id = manufacturerMap.get(manufacturerInput.toLowerCase());
                }

                // Common utils
                const normalizeDate = (dateVal, fallback = null) => {
                    if (!dateVal || dateVal === '' || dateVal === 'Invalid date') return fallback;

                    // Check for DD/MM/YYYY or DD-MM-YYYY format
                    if (typeof dateVal === 'string' && /^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(dateVal)) {
                        const parts = dateVal.split(/[/-]/);
                        if (parts.length === 3) {
                            const d = parseInt(parts[0], 10);
                            const m = parseInt(parts[1], 10);
                            const y = parseInt(parts[2], 10);
                            if (d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1900) {
                                return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            }
                        }
                    }

                    // Prevent timezone shifts 
                    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) return dateVal.substring(0, 10);

                    const parsed = new Date(dateVal);
                    if (isNaN(parsed.getTime())) return fallback;
                    return parsed.toISOString().split('T')[0];
                };

                const normalizeMaintenanceStatus = (val) => {
                    if (!val) return 'IN_HOUSE';
                    const normalized = val.toUpperCase().replace(/-/g, '_').replace(/\s+/g, '_');
                    const validStatuses = ['UNDER_WARRANTY', 'OUT_OF_WARRANTY', 'UNDER_AMC', 'OUT_OF_AMC', 'IN_HOUSE'];
                    return validStatuses.includes(normalized) ? normalized : 'IN_HOUSE';
                };
                const today = new Date().toISOString().split('T')[0];

                let asset;

                if (existingAsset) {
                    // === UPDATE EXISTING ASSET ===
                    const updatePayload = {};

                    // Only update fields that were successfully resolved or explicitly provided
                    if (plant_id) updatePayload.plant_id = plant_id;
                    if (building_id) updatePayload.building_id = building_id;
                    if (floor_id) updatePayload.floor_id = floor_id;
                    if (wing_id) updatePayload.wing_id = wing_id;
                    if (category_id) updatePayload.category_id = category_id;
                    if (product_id) updatePayload.product_id = product_id;
                    if (manufacturer_id) updatePayload.manufacturer_id = manufacturer_id;

                    if (record.location !== undefined) updatePayload.location = record.location;
                    if (record.type) updatePayload.type = record.type;
                    if (record.sub_type) updatePayload.sub_type = record.sub_type;

                    // Date fields - only update if provided
                    if (record.manufacturing_date) updatePayload.manufacturing_date = normalizeDate(record.manufacturing_date);
                    if (record.install_date) updatePayload.install_date = normalizeDate(record.install_date);
                    if (record.warranty_end_date) updatePayload.warranty_end_date = normalizeDate(record.warranty_end_date);
                    if (record.last_refill_date) updatePayload.last_refill_date = normalizeDate(record.last_refill_date);
                    if (record.last_hp_test_date) updatePayload.last_hp_test_date = normalizeDate(record.last_hp_test_date);

                    if (record.lifespan_years) updatePayload.lifespan_years = record.lifespan_years;
                    if (record.health_status) updatePayload.health_status = record.health_status.toUpperCase();
                    if (record.maintenance_status) updatePayload.maintenance_status = normalizeMaintenanceStatus(record.maintenance_status);

                    // Add to batch for update
                    assetsToUpdate.push({
                        existingAsset,
                        updatePayload,
                        record,
                        category_id: category_id || existingAsset.category_id
                    });

                } else {
                    // === PREPARE NEW ASSET FOR BATCH INSERT ===

                    // Validate mandatory fields for new assets
                    const missingFields = [];
                    if (!record.type) missingFields.push('Type');
                    if (!record.manufacturing_date) missingFields.push('Manufacturing Date');
                    if (!record.install_date) missingFields.push('Installation Date');
                    if (!record.maintenance_status) missingFields.push('Maintenance Status');

                    if (missingFields.length > 0) {
                        errors.push({
                            row: i + 1,
                            error: `Missing required fields: ${missingFields.join(', ')}`
                        });
                        continue;
                    }

                    // Auto-generate asset_code if needed (using fast batch generator)
                    let final_asset_code = asset_code;
                    if (!final_asset_code) {
                        final_asset_code = generateBatchAssetCode(category_id, product_id, i);
                    }

                    assetsToCreate.push({
                        asset_code: final_asset_code,
                        plant_id,
                        building_id,
                        floor_id: floor_id || null,
                        wing_id: wing_id || null,
                        location: record.location || null,
                        category_id,
                        product_id,
                        manufacturer_id: manufacturer_id || null,
                        type: record.type,
                        sub_type: record.sub_type || null,
                        manufacturing_date: normalizeDate(record.manufacturing_date),
                        install_date: normalizeDate(record.install_date),
                        warranty_end_date: normalizeDate(record.warranty_end_date, null),
                        lifespan_years: record.lifespan_years || null,
                        health_status: record.health_status ? record.health_status.toUpperCase() : 'HEALTHY',
                        maintenance_status: normalizeMaintenanceStatus(record.maintenance_status),
                        status: 'ACTIVE',
                        created_by: user_id,
                        _record: record // Keep reference for related records
                    });
                }

            } catch (err) {
                errors.push({ row: i + 1, error: err.message });
            }
        }

        console.log(`[BulkImport] Phase 1 complete: ${assetsToCreate.length} to create, ${assetsToUpdate.length} to update, ${errors.length} errors`);

        // Early exit if all failed
        if (errors.length > 0 && assetsToCreate.length === 0 && assetsToUpdate.length === 0) {
            await transaction.rollback();
            return { created: 0, updated: 0, failed: errors.length, errors };
        }

        // ============ PHASE 2: BATCH CREATE NEW ASSETS ============
        console.log(`[BulkImport] Phase 2: Creating ${assetsToCreate.length} new assets...`);

        if (assetsToCreate.length > 0) {
            // Extract just the database fields (exclude _record)
            const assetDbRecords = assetsToCreate.map(({ _record, ...dbFields }) => dbFields);

            // Batch insert with chunking for very large imports
            const BATCH_SIZE = 500;
            for (let batchStart = 0; batchStart < assetDbRecords.length; batchStart += BATCH_SIZE) {
                const batch = assetDbRecords.slice(batchStart, batchStart + BATCH_SIZE);
                const createdBatch = await Asset.bulkCreate(batch, {
                    transaction,
                    returning: true,
                    validate: false // Already validated
                });

                // Map back the created IDs to original data
                createdBatch.forEach((createdAsset, idx) => {
                    const originalIdx = batchStart + idx;
                    assetsToCreate[originalIdx]._createdAsset = createdAsset;
                    created_assets.push(createdAsset);
                });

                console.log(`[BulkImport] Created batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: ${batch.length} assets`);
            }
        }

        // ============ PHASE 3: BATCH UPDATE EXISTING ASSETS ============
        console.log(`[BulkImport] Phase 3: Updating ${assetsToUpdate.length} existing assets...`);

        for (const updateItem of assetsToUpdate) {
            const { existingAsset, updatePayload, record, category_id: catId } = updateItem;
            if (Object.keys(updatePayload).length > 0) {
                await Asset.update(updatePayload, {
                    where: { id: existingAsset.id },
                    transaction
                });
            }

            // Calculate changes between old and new values for audit
            const oldValues = existingAsset.toJSON ? existingAsset.toJSON() : existingAsset;
            const changes = auditService.calculateChanges(oldValues, updatePayload) || {};

            // Also diff metadata fields (tag, serial_number, model)
            const oldMeta = oldValues.metadata || {};
            const metaFields = { tag: record.tag, serial_number: record.sl_no, model: record.model };
            for (const [field, newVal] of Object.entries(metaFields)) {
                if (newVal !== undefined && newVal !== null) {
                    const oldVal = oldMeta[field] ?? null;
                    if (String(oldVal) !== String(newVal)) {
                        changes[field] = { old: oldVal, new: newVal };
                    }
                }
            }

            // Store reference for related records
            updateItem._updatedAsset = {
                id: existingAsset.id,
                asset_code: existingAsset.asset_code,
                _changes: Object.keys(changes).length > 0 ? changes : null
            };
            updated_assets.push(updateItem._updatedAsset);
        }

        // ============ PHASE 4: BATCH CREATE METADATA ============
        console.log('[BulkImport] Phase 4: Creating metadata...');

        const metadataToCreate = [];

        // For new assets
        for (const item of assetsToCreate) {
            const record = item._record;
            if (record.tag || record.model || record.sl_no) {
                metadataToCreate.push({
                    asset_id: item._createdAsset.id,
                    tag: record.tag || null,
                    model: record.model || null,
                    serial_number: record.sl_no || null
                });
            }
        }

        // Batch insert metadata
        if (metadataToCreate.length > 0) {
            await AssetMetadata.bulkCreate(metadataToCreate, { transaction, validate: false });
            console.log(`[BulkImport] Created ${metadataToCreate.length} metadata records`);
        }

        // For updates, handle metadata individually (need to check existing)
        for (const updateItem of assetsToUpdate) {
            const record = updateItem.record;
            if (record.tag || record.model || record.sl_no) {
                const assetId = updateItem.existingAsset.id;
                const metadataData = {
                    asset_id: assetId,
                    tag: record.tag || null,
                    model: record.model || null,
                    serial_number: record.sl_no || null
                };
                await AssetMetadata.upsert(metadataData, { transaction });
            }
        }

        // ============ PHASE 5: BATCH CREATE TESTING SCHEDULES ============
        console.log('[BulkImport] Phase 5: Creating testing schedules...');

        const schedulesToCreate = [];

        // Helper to compute schedule data
        const computeScheduleData = (record, assetId) => {
            const normalizeDate = (dateVal, fallback = null) => {
                if (!dateVal || dateVal === '' || dateVal === 'Invalid date') return fallback;
                if (typeof dateVal === 'string' && /^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(dateVal)) {
                    const parts = dateVal.split(/[/-]/);
                    if (parts.length === 3) {
                        const d = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10);
                        const y = parseInt(parts[2], 10);
                        if (d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1900) {
                            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        }
                    }
                }
                if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) return dateVal.substring(0, 10);
                const parsed = new Date(dateVal);
                if (isNaN(parsed.getTime())) return fallback;
                return parsed.toISOString().split('T')[0];
            };

            const csvHpTestDate = normalizeDate(record.last_hp_test_date, null);
            const parsedRefillDate = normalizeDate(record.last_refill_date, null);
            const manufacturingDate = normalizeDate(record.manufacturing_date, null);

            let refillHistory = null;
            if (manufacturingDate) refillHistory = [manufacturingDate];
            if (parsedRefillDate && parsedRefillDate !== manufacturingDate) {
                refillHistory = refillHistory ? [...refillHistory, parsedRefillDate] : [parsedRefillDate];
            }

            let hpTestHistory = null;
            let nextHpTestDueDate = null;
            if (manufacturingDate) {
                hpTestHistory = [manufacturingDate];
                const mfg = new Date(manufacturingDate);
                const nextDue = new Date(mfg);
                nextDue.setFullYear(nextDue.getFullYear() + 5);
                nextHpTestDueDate = nextDue.toISOString().split('T')[0];
            }
            if (csvHpTestDate && csvHpTestDate !== manufacturingDate) {
                hpTestHistory = hpTestHistory ? [...hpTestHistory, csvHpTestDate] : [csvHpTestDate];
            }

            if (hpTestHistory || refillHistory) {
                return {
                    asset_id: assetId,
                    last_hp_test_date: hpTestHistory,
                    next_hp_test_due_date: nextHpTestDueDate,
                    last_refill_date: refillHistory
                };
            }
            return null;
        };

        // For new assets
        for (const item of assetsToCreate) {
            const scheduleData = computeScheduleData(item._record, item._createdAsset.id);
            if (scheduleData) schedulesToCreate.push(scheduleData);
        }

        // Batch insert testing schedules
        if (schedulesToCreate.length > 0) {
            await AssetTestingSchedule.bulkCreate(schedulesToCreate, { transaction, validate: false });
            console.log(`[BulkImport] Created ${schedulesToCreate.length} testing schedules`);
        }

        // For updates, handle schedules individually (need to upsert)
        for (const updateItem of assetsToUpdate) {
            const scheduleData = computeScheduleData(updateItem.record, updateItem.existingAsset.id);
            if (scheduleData) {
                const existing = await AssetTestingSchedule.findOne({
                    where: { asset_id: updateItem.existingAsset.id },
                    transaction
                });
                if (existing) {
                    await existing.update(scheduleData, { transaction });
                } else {
                    await AssetTestingSchedule.create(scheduleData, { transaction });
                }
            }
        }

        // ============ PHASE 6: BATCH CREATE SPEC VALUES ============
        console.log('[BulkImport] Phase 6: Creating spec values...');

        const specValuesToCreate = [];

        // Helper to extract spec values from record
        const extractSpecValues = (record, assetId, categoryId) => {
            const categorySpecDefs = specDefsByCategory.get(categoryId) || [];
            const specs = [];

            for (const specDef of categorySpecDefs) {
                const specName = (specDef.spec_name || '').toLowerCase().replace(/\s+/g, '_');
                const specLabel = (specDef.spec_label || '').toLowerCase().replace(/\s+/g, '_');
                const specUnitOptions = Array.isArray(specDef.spec_unit) ? specDef.spec_unit : [];

                let specValue = null;
                let matchedKey = null;

                for (const [key, val] of Object.entries(record)) {
                    if (val === null || val === undefined || val === '') continue;
                    const keyLower = key.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
                    const keyNormalized = key.replace(/\s+/g, '').toLowerCase();

                    if (key === specDef.spec_name || key === specDef.spec_label ||
                        keyLower === specName || keyLower === specLabel ||
                        (specName && keyNormalized.includes(specName.replace(/_/g, ''))) ||
                        (specLabel && keyNormalized.includes(specLabel.replace(/_/g, '')))) {
                        specValue = val;
                        matchedKey = key;
                        break;
                    }
                }

                if (specValue !== null && specValue !== undefined && specValue !== '') {
                    let unitValue = null;
                    const unitColumnNames = [
                        `${specDef.spec_name}_Unit`, `${specDef.spec_label}_Unit`,
                        `${specDef.spec_name} Unit`, `${specDef.spec_label} Unit`,
                        `${specName}_unit`, `${specLabel}_unit`
                    ];

                    for (const unitCol of unitColumnNames) {
                        const unitColLower = unitCol.toLowerCase().replace(/\s+/g, '_');
                        for (const [key, val] of Object.entries(record)) {
                            if (key.toLowerCase().replace(/\s+/g, '_') === unitColLower && val) {
                                unitValue = String(val).trim();
                                break;
                            }
                        }
                        if (unitValue) break;
                    }

                    if (unitValue && specUnitOptions.length > 0) {
                        const validUnit = specUnitOptions.find(u => u.toLowerCase() === unitValue.toLowerCase());
                        unitValue = validUnit || null;
                    }

                    specs.push({
                        asset_id: assetId,
                        spec_definition_id: specDef.id,
                        spec_value: String(specValue),
                        unit: unitValue
                    });
                }
            }
            return specs;
        };

        // For new assets
        for (const item of assetsToCreate) {
            const specs = extractSpecValues(item._record, item._createdAsset.id, item.category_id);
            specValuesToCreate.push(...specs);
        }

        // Batch insert spec values
        if (specValuesToCreate.length > 0) {
            await AssetSpecValue.bulkCreate(specValuesToCreate, { transaction, validate: false });
            console.log(`[BulkImport] Created ${specValuesToCreate.length} spec values`);
        }

        // For updates, handle spec values individually (need to upsert)
        for (const updateItem of assetsToUpdate) {
            const categoryId = updateItem.category_id;
            const assetId = updateItem.existingAsset.id;
            const specs = extractSpecValues(updateItem.record, assetId, categoryId);

            for (const spec of specs) {
                await AssetSpecValue.upsert({
                    asset_id: spec.asset_id,
                    spec_definition_id: spec.spec_definition_id,
                    spec_value: spec.spec_value,
                    unit: spec.unit
                }, { transaction });
            }
        }

        console.log(`[BulkImport] All phases complete. Committing transaction...`);
        await transaction.commit();

        // Bulk Audit Log
        if (created_assets.length > 0 || updated_assets.length > 0) {
            try {
                const auditUser = userObj
                    ? { id: userObj.id, name: userObj.name, type: userObj.userType }
                    : { id: user_id };

                const createLogs = created_assets.map(asset => ({
                    entityType: 'asset',
                    entityId: asset.id,
                    entityName: asset.asset_code,
                    action: 'CREATE',
                    user: auditUser,
                    source: 'import'
                }));

                const updateLogs = updated_assets
                    .filter(asset => asset._changes)
                    .map(asset => ({
                    entityType: 'asset',
                    entityId: asset.id,
                    entityName: asset.asset_code,
                    action: 'UPDATE',
                    changes: asset._changes,
                    user: auditUser,
                    source: 'import'
                }));

                // Group all import entries under one context_id so they appear as a single batch in history
                await auditService.logBulk([...createLogs, ...updateLogs]);
            } catch (error) {
                console.error('Audit log failed for bulk_create_assets:', error.message);
            }
        }

        return { created: created_assets.length, updated: updated_assets.length, failed: errors.length, errors };

    } catch (error) {
        // Only rollback if transaction hasn't been finished already
        if (!transaction.finished) {
            await transaction.rollback();
        }
        throw error;
    }
};

/**
 * Get asset counts by status
 */
const get_asset_counts = async (filters) => {
    const { plant_id, category_id } = filters;
    const where = {};

    if (plant_id) where.plant_id = plant_id;
    if (category_id) where.category_id = category_id;

    const [total, by_status, by_health, by_maintenance] = await Promise.all([
        Asset.count({ where }),
        Asset.findAll({
            where,
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['status'],
            raw: true
        }),
        Asset.findAll({
            where,
            attributes: ['health_status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['health_status'],
            raw: true
        }),
        Asset.findAll({
            where,
            attributes: ['maintenance_status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['maintenance_status'],
            raw: true
        })
    ]);

    return {
        total,
        by_status: by_status.reduce((acc, item) => {
            acc[item.status] = parseInt(item.count);
            return acc;
        }, {}),
        by_health: by_health.reduce((acc, item) => {
            acc[item.health_status] = parseInt(item.count);
            return acc;
        }, {}),
        by_maintenance: by_maintenance.reduce((acc, item) => {
            acc[item.maintenance_status] = parseInt(item.count);
            return acc;
        }, {})
    };
};

/**
     * Get service history for an asset
     * Note: This queries the service_submissions table which must exist
     */
const get_service_history = async (asset_id, page = 1, limit = 10) => {
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Dynamic import to avoid circular dependency issues
    // ServiceSubmission should be available from main models
    try {
        const { ServiceSubmission, InspectionFrequency, Form, Technician, User } = require('../../models');

        const { count, rows: submissions } = await ServiceSubmission.findAndCountAll({
            where: { asset_id },
            include: [
                {
                    model: InspectionFrequency,
                    as: 'frequency',
                    attributes: ['id', 'frequency_name', 'frequency_code'],
                    required: false
                },
                {
                    model: Form,
                    as: 'form',
                    attributes: ['id', 'service_name'],
                    required: false
                },
                {
                    model: Technician,
                    as: 'technician',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['name']
                    }],
                    required: false
                }
            ],
            order: [['scheduled_date', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        return {
            submissions: submissions.map(sub => ({
                id: sub.id,
                scheduled_date: sub.scheduled_date,
                frequency: sub.frequency?.frequency_name || sub.frequency_id || '-',
                inspection_type: sub.inspection_type || sub.form?.service_name || '-',
                status: sub.status,
                technician_name: sub.technician?.user?.name || 'Unassigned',
                completed_at: sub.completed_at,
                submitted_at: sub.submitted_at
            })),
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(count / parseInt(limit))
            }
        };
    } catch (error) {
        console.error('Service history query error:', error.message);
        // Return empty result if ServiceSubmission model doesn't exist yet
        return {
            submissions: [],
            pagination: { total: 0, page: 1, limit: parseInt(limit), total_pages: 0 },
            error: 'Service submissions table not available'
        };
    }
};

/**
 * Get assets for bulk QR printing with location data
 */
/**
 * Get lifecycle cost & operational stats for an asset
 */
const get_lifecycle_stats = async (asset_id) => {
    try {
        const { Ticket, AssetSpareConsumption } = require('../../models/tickets');
        const { InventorySpare } = require('../../models');

        // Run aggregation queries + top 5 components for timeline
        const [ticketStats, spareQtyStr, spareCostStr, uniqueSparesCount, rawTickets, rawSpares] = await Promise.all([
            Ticket.findAll({
                where: { asset_id },
                attributes: [
                    'ticket_category', 'ticket_type', 'completed_status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['ticket_category', 'ticket_type', 'completed_status'],
                raw: true
            }),
            AssetSpareConsumption.sum('quantity_used', { where: { asset_id } }),
            AssetSpareConsumption.sum('total_cost', { where: { asset_id } }),
            AssetSpareConsumption.count({
                where: { asset_id },
                distinct: true,
                col: 'spare_id'
            }),
            Ticket.findAll({
                where: { asset_id },
                attributes: ['id', 'ticket_code', 'task_name', 'ticket_category', 'completed_status', 'created_at', 'ticket_type', 'total_spare_cost', 'priority', 'bm_state'],
                order: [['created_at', 'DESC']],
                limit: 5
            }),
            AssetSpareConsumption.findAll({
                where: { asset_id },
                include: [{
                    model: InventorySpare,
                    as: 'spare',
                    attributes: ['id', 'spare_name', 'spare_type', 'unit_of_measurement']
                }],
                attributes: ['id', 'ticket_id', 'quantity_used', 'unit_cost', 'total_cost', 'used_at', 'remarks'],
                order: [['used_at', 'DESC']],
                limit: 5
            })
        ]);

        let total_tickets = 0;
        let bm_tickets = { total: 0, completed: 0 };
        let refill_tickets = { total: 0, completed: 0 };
        let installation_tickets = 0;

        for (const stat of ticketStats) {
            const count = parseInt(stat.count || 0);
            total_tickets += count;
            
            if (stat.ticket_category === 'Breakdown Maintenance' || stat.ticket_type === 'BM_MAINTENANCE') {
                bm_tickets.total += count;
                if (stat.completed_status === 'Completed') bm_tickets.completed += count;
            } else if (stat.ticket_category === 'Refill / HP Test') {
                refill_tickets.total += count;
                if (stat.completed_status === 'Completed') refill_tickets.completed += count;
            } else if (stat.ticket_category === 'Installation') {
                installation_tickets += count;
            }
        }

        const total_spare_qty = parseInt(spareQtyStr || 0);
        const total_spare_cost = parseFloat(spareCostStr || 0);

        // Also query the single total_events count directly (fast)
        const total_spare_events = await AssetSpareConsumption.count({ where: { asset_id } });

        // Build extremely lightweight inline timeline (top 5 max overall)
        const timeline = [
            ...rawTickets.map(t => ({
                id: `ticket-${t.id}`,
                type: t.ticket_type === 'BM_MAINTENANCE' ? 'BM' : (t.ticket_category === 'Refill / HP Test' ? 'REFILL' : (t.ticket_category === 'Installation' ? 'INSTALL' : 'TICKET')),
                label: t.task_name || t.ticket_code,
                ticket_code: t.ticket_code,
                status: t.completed_status,
                date: t.created_at,
                priority: t.priority,
                total_spare_cost: t.total_spare_cost
            })),
            ...rawSpares.map(c => ({
                id: `spare-${c.id}`,
                type: 'SPARE',
                label: `${c.spare?.spare_name || 'Spare'} ×${c.quantity_used}`,
                status: 'Consumed',
                date: c.used_at,
                cost: c.total_cost,
                remarks: c.remarks
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            summary: {
                total_tickets,
                bm_tickets,
                refill_tickets,
                installation_tickets,
                total_spare_cost,
                total_spare_qty,
                unique_spare_types: uniqueSparesCount,
                total_spare_events
            },
            timeline: timeline.slice(0, 5) // Strongly limit for UI inline performance
        };
    } catch (error) {
        console.error('Lifecycle stats query error:', error.message);
        return {
            summary: {
                total_tickets: 0,
                bm_tickets: { total: 0, completed: 0 },
                refill_tickets: { total: 0, completed: 0 },
                installation_tickets: 0,
                total_spare_cost: 0,
                total_spare_qty: 0,
                unique_spare_types: 0,
                total_spare_events: 0
            },
            timeline: []
        };
    }
};

/**
 * Get lifecycle timeline paginated securely
 */
const get_lifecycle_timeline = async (asset_id, filters) => {
    try {
        const { Ticket, AssetSpareConsumption } = require('../../models/tickets');
        const { InventorySpare } = require('../../models');
        
        const { page = 1, limit = 20, type = 'ALL' } = filters;
        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        
        // Items to fetch to ensure correct sorting offset
        const queryLimit = pageNum * limitNum; 
        
        let tickets = [];
        let spares = [];
        
        if (type === 'ALL' || type === 'TICKET' || type === 'BM' || type === 'REFILL') {
            const ticketWhere = { asset_id };
            if (type === 'BM') {
                ticketWhere[Op.or] = [
                    { ticket_category: 'Breakdown Maintenance' },
                    { ticket_type: 'BM_MAINTENANCE' }
                ];
            } else if (type === 'REFILL') {
                ticketWhere.ticket_category = 'Refill / HP Test';
            }
            
            tickets = await Ticket.findAll({
                where: ticketWhere,
                attributes: ['id', 'ticket_code', 'task_name', 'ticket_category', 'completed_status', 'created_at', 'ticket_type', 'total_spare_cost', 'priority', 'bm_state'],
                order: [['created_at', 'DESC']],
                limit: queryLimit
            });
        }
        
        if (type === 'ALL' || type === 'SPARE') {
            spares = await AssetSpareConsumption.findAll({
                where: { asset_id },
                include: [{
                    model: InventorySpare,
                    as: 'spare',
                    attributes: ['id', 'spare_name', 'spare_type', 'unit_of_measurement']
                }],
                attributes: ['id', 'ticket_id', 'quantity_used', 'unit_cost', 'total_cost', 'used_at', 'remarks'],
                order: [['used_at', 'DESC']],
                limit: queryLimit
            });
        }
        
        const timeline = [
            ...tickets.map(t => ({
                id: `ticket-${t.id}`,
                type: t.ticket_type === 'BM_MAINTENANCE' ? 'BM' : (t.ticket_category === 'Refill / HP Test' ? 'REFILL' : (t.ticket_category === 'Installation' ? 'INSTALL' : 'TICKET')),
                label: t.task_name || t.ticket_code,
                ticket_code: t.ticket_code,
                status: t.completed_status,
                date: t.created_at,
                priority: t.priority,
                total_spare_cost: t.total_spare_cost
            })),
            ...spares.map(c => ({
                id: `spare-${c.id}`,
                type: 'SPARE',
                label: `${c.spare?.spare_name || 'Spare'} ×${c.quantity_used}`,
                status: 'Consumed',
                date: c.used_at,
                cost: c.total_cost,
                remarks: c.remarks
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const offset = (pageNum - 1) * limitNum;
        const pagedTimeline = timeline.slice(offset, offset + limitNum);
        
        // Count for total pages
        let totalCount = 0;
        if (type === 'ALL') {
             totalCount = await Ticket.count({ where: { asset_id } }) + await AssetSpareConsumption.count({ where: { asset_id } });
        } else if (type === 'SPARE') {
             totalCount = await AssetSpareConsumption.count({ where: { asset_id } });
        } else {
             const tcWhere = { asset_id };
             if (type === 'BM') {
                 tcWhere[Op.or] = [{ ticket_category: 'Breakdown Maintenance' }, { ticket_type: 'BM_MAINTENANCE' }];
             } else if (type === 'REFILL') {
                 tcWhere.ticket_category = 'Refill / HP Test';
             }
             totalCount = await Ticket.count({ where: tcWhere });
        }
        
        return {
            timeline: pagedTimeline,
            pagination: {
                total: totalCount,
                page: pageNum,
                limit: limitNum,
                total_pages: Math.ceil(totalCount / limitNum)
            }
        };
    } catch (error) {
        console.error('Timeline paginated query error:', error.message);
        throw error;
    }
};

const get_assets_for_bulk_print = async (asset_ids, category_id = null) => {
    const where_clause = { id: { [Op.in]: asset_ids } };
    if (category_id) {
        where_clause.category_id = category_id;
    }

    const assets = await Asset.findAll({
        where: where_clause,
        attributes: ['id', 'asset_code', 'type', 'sub_type', 'location'],
        include: [
            { model: Plant, as: 'plant', attributes: ['id', 'plant_name'] },
            { model: Category, as: 'category', attributes: ['id', 'category_name'] },
            { model: Product, as: 'product', attributes: ['id', 'product_name'] },
            { model: Building, as: 'building', attributes: ['id', 'building_name'] },
            { model: Floor, as: 'floor', attributes: ['id', 'floor_name'] },
            { model: Wing, as: 'wing', attributes: ['id', 'wing_name'] },
            {
                model: AssetSpecValue,
                as: 'spec_values',
                attributes: ['spec_value', 'unit'],
                include: [
                    {
                        model: SpecDefinition,
                        as: 'spec_definition',
                        attributes: ['spec_name']
                    }
                ]
            }
        ]
    });

    return assets;
};

module.exports = {
    create_asset,
    get_all_assets,
    get_asset_by_id,
    update_asset,
    delete_asset,
    restore_asset,
    get_assets_by_floor,
    update_floorplan_position,
    remove_from_floorplan,
    update_geolocation,
    get_status_history,
    get_location_history,
    get_my_assets,
    bulk_create_assets,
    get_asset_counts,
    get_service_history,
    get_assets_for_bulk_print,
    get_lifecycle_stats,
    get_lifecycle_timeline
};
