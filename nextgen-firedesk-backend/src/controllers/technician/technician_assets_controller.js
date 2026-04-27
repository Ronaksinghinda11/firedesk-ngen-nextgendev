/**
 * Technician Assets Controller
 * Handles asset operations for technicians
 */
const Joi = require('joi');
const { Op, fn, col } = require('sequelize');
const {
    ServiceSubmission,
    Asset,
    Plant,
    Building,
    Category,
    Product,
    Floor,
    Wing,
    Manufacturer,
    AssetDocument,
    AssetSpecValue,
    SpecDefinition,
    AssetMetadata,
    AssetActiveCondition,
    Condition,

    Technician,
    ServiceTechnician,
    AssetLocationHistory
} = require('../../models');

/**
 * Get all assets assigned to the current technician
 * Assets are derived from services assigned to the technician
 * GET /api/technician/my-assets
 */
const get_my_assets = async (req, res, next) => {
    try {
        const schema = Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(10),
            search: Joi.string().allow('').optional()
        });

        const { error, value } = schema.validate(req.query);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { page, limit, search } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // 1. Get service IDs assigned via junction table
        const junctionAssignments = await ServiceTechnician.findAll({
            where: { technician_id: technician.id },
            attributes: ['service_id']
        });
        const junctionServiceIds = junctionAssignments.map(a => a.service_id);

        // 2. Get assets from services assigned to this technician (direct or via junction)
        const serviceAssets = await ServiceSubmission.findAll({
            where: {
                [Op.or]: [
                    { technician_id: technician.id },
                    { id: { [Op.in]: junctionServiceIds } }
                ]
            },
            attributes: [[fn('DISTINCT', col('asset_id')), 'asset_id']],
            raw: true
        });

        const assetIds = serviceAssets
            .map(s => s.asset_id)
            .filter(id => id != null);

        if (assetIds.length === 0) {
            return res.json({
                success: true,
                myAssets: [],
                pagination: {
                    currentPage: page,
                    totalPages: 0,
                    totalAssets: 0
                }
            });
        }

        // Build where clause
        const whereClause = {
            id: { [Op.in]: assetIds },
            status: { [Op.ne]: 'DEACTIVE' || 'Deactive' }
        };

        // Add search conditions
        if (search) {
            const searchLike = `%${search}%`;
            whereClause[Op.or] = [
                { building: { [Op.iLike]: searchLike } },
                { model: { [Op.iLike]: searchLike } },
                { sl_no: { [Op.iLike]: searchLike } },
                { health_status: { [Op.iLike]: searchLike } },
                { tag: { [Op.iLike]: searchLike } },
                { asset_id: { [Op.iLike]: searchLike } },
                { location: { [Op.iLike]: searchLike } }
            ];
        }

        const totalAssets = await Asset.count({ where: whereClause });

        const assets = await Asset.findAll({
            where: whereClause,
            include: [
                {
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', 'plant_name', 'address_line1']
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'product_name']
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'category_name']
                },
                {
                    model: Building,
                    as: 'building',
                    attributes: ['id', 'building_name']
                }
            ],
            limit,
            offset: (page - 1) * limit,
            order: [['created_at', 'DESC']]
        });

        // Enrich with service dates
        const enrichedAssets = await Promise.all(
            assets.map(async (asset) => {
                const assetJson = asset.toJSON();

                const getNextService = async (type) => {
                    const submission = await ServiceSubmission.findOne({
                        where: {
                            asset_id: asset.id,
                            status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] },
                            inspection_type: { [Op.iLike]: `%${type}%` }
                        },
                        order: [['scheduled_date', 'ASC']],
                        attributes: ['scheduled_date']
                    });
                    return submission?.scheduled_date || null;
                };

                const getLastService = async (type) => {
                    const submission = await ServiceSubmission.findOne({
                        where: {
                            asset_id: asset.id,
                            status: { [Op.in]: ['COMPLETED', 'SUBMITTED'] },
                            inspection_type: { [Op.iLike]: `%${type}%` }
                        },
                        order: [['completed_at', 'DESC']],
                        attributes: ['completed_at', 'scheduled_date']
                    });
                    return submission?.completed_at || submission?.scheduled_date || null;
                };

                assetJson.serviceDates = {
                    nextServiceDates: {
                        inspection: await getNextService('inspection'),
                        testing: await getNextService('testing'),
                        maintenance: await getNextService('maintenance')
                    },
                    lastServiceDates: {
                        inspection: await getLastService('inspection'),
                        testing: await getLastService('testing'),
                        maintenance: await getLastService('maintenance')
                    }
                };

                // Map fields for frontend
                assetJson.assetId = asset.asset_code;
                assetJson.assetName = asset.asset_code;
                assetJson.plantName = asset.plant?.plant_name;
                assetJson.categoryName = asset.category?.category_name;
                assetJson.productName = asset.product?.product_name;

                if (assetJson.plant) {
                    assetJson.plant.plantName = asset.plant.plant_name;
                }
                if (assetJson.category) {
                    assetJson.category.categoryName = asset.category.category_name;
                }
                if (assetJson.product) {
                    assetJson.product.productName = asset.product.product_name;
                }

                return assetJson;
            })
        );

        return res.json({
            success: true,
            myAssets: enrichedAssets,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalAssets / limit),
                totalAssets
            }
        });
    } catch (error) {
        console.error('[Technician Assets] Error fetching assets:', error);
        return next(error);
    }
};

/**
 * Get asset by ID
 * POST /api/technician/asset-detail/:assetId
 */
const get_asset_by_id = async (req, res, next) => {
    try {
        const { assetId } = req.params;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        const asset = await Asset.findOne({
            where: {
                [Op.or]: [
                    { id: assetId },
                    { asset_code: assetId }
                ]
            },
            include: [
                { model: Plant, as: 'plant' },
                { model: Category, as: 'category' },
                { model: Product, as: 'product' },
                { model: Building, as: 'building' },
                { model: Floor, as: 'floor' },
                { model: Wing, as: 'wing' },
                { model: Manufacturer, as: 'manufacturer' },
                { model: AssetDocument, as: 'documents' },
                { model: AssetMetadata, as: 'metadata' },
                {
                    model: AssetSpecValue,
                    as: 'spec_values',
                    include: [{ model: SpecDefinition, as: 'spec_definition' }]
                },
                {
                    model: AssetActiveCondition,
                    as: 'active_conditions',
                    include: [{ model: Condition, as: 'condition' }]
                }
            ]
        });

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Service Date Calculations
        const getNextService = async (type) => {
            const submission = await ServiceSubmission.findOne({
                where: {
                    asset_id: asset.id,
                    status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] },
                    inspection_type: { [Op.iLike]: `%${type}%` }
                },
                order: [['scheduled_date', 'ASC']],
                attributes: ['scheduled_date']
            });
            return submission?.scheduled_date || null;
        };

        const getLastService = async (type) => {
            const submission = await ServiceSubmission.findOne({
                where: {
                    asset_id: asset.id,
                    status: { [Op.in]: ['COMPLETED', 'SUBMITTED'] },
                    inspection_type: { [Op.iLike]: `%${type}%` }
                },
                order: [['completed_at', 'DESC']],
                attributes: ['completed_at', 'scheduled_date']
            });
            return submission?.completed_at || submission?.scheduled_date || null;
        };

        // Fetch service dates concurrently
        const [
            nextHPTest, lastHPTest,
            nextRefill, lastRefill
        ] = await Promise.all([
            getNextService('testing'), getLastService('testing'),     // For HP Test
            getNextService('refill'), getLastService('refill')        // For Refill
        ]);

        const assetJson = asset.toJSON();

        // Transform Specs
        // Transform Specs
        const specValues = asset.spec_values?.map(sv => ({
            id: sv.id,
            value: sv.spec_value,
            unit: sv.unit,
            specDefinition: {
                label: sv.spec_definition?.spec_label || sv.spec_definition?.spec_name || 'Unknown'
            }
        })) || [];

        // Transform Documents
        const documents = asset.documents?.map(doc => ({
            id: doc.id,
            description: doc.description || doc.file_name,
            documentUrl: doc.file_url
        })) || [];

        // Transform Active Conditions
        const activeConditions = asset.active_conditions?.map(ac =>
            ac.condition?.condition_name
        ).filter(Boolean) || [];

        const transformedAsset = {
            ...assetJson,
            assetId: asset.asset_code,
            assetName: asset.asset_code,
            plantName: asset.plant?.plant_name,
            categoryName: asset.category?.category_name,
            productName: asset.product?.product_name,
            plant: asset.plant ? {
                ...asset.plant.toJSON(),
                plantName: asset.plant.plant_name
            } : undefined,
            category: asset.category ? {
                ...asset.category.toJSON(),
                categoryName: asset.category.category_name
            } : undefined,
            product: asset.product ? {
                ...asset.product.toJSON(),
                productName: asset.product.product_name
            } : undefined,

            // Mobile App Mappings
            healthStatus: asset.health_status,
            floor: asset.floor?.floor_name,
            wing: asset.wing?.wing_name,

            // Type & SubType
            subType: asset.sub_type,

            manufacturer: asset.manufacturer ? { name: asset.manufacturer.name } : null,

            // Fields from Metadata
            model: asset.metadata?.model,
            slNo: asset.metadata?.serial_number,
            tag: asset.metadata?.tag,

            activeConditions,
            specValues,
            documents,

            // Dates through specialized fields if needed, but they are in root JSON too
            lastHPTestDate: lastHPTest,
            nextHPTestDueDate: nextHPTest,
            lastRefillDate: lastRefill,
            nextRefillDate: nextRefill
        };

        return res.json({
            success: true,
            asset: transformedAsset
        });
    } catch (error) {
        console.error('[Technician Assets] Error fetching asset by ID:', error);
        return next(error);
    }
};

/**
 * Update asset location
 * PUT /api/technician/update-location
 */
/**
 * Update asset location
 * PUT /api/technician/update-location
 */
const update_location = async (req, res, next) => {
    try {
        const schema = Joi.object({
            assetId: Joi.string().required(),
            lat: Joi.number().required(),
            long: Joi.number().required(),
            remark: Joi.string().optional().allow('')
        });

        const { error, value } = schema.validate(req.body);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { assetId, lat, long, remark } = value;

        const asset = await Asset.findByPk(assetId);
        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Get the FIRST (original) location entry from history - this is the permanent baseline
        const originalLocation = await AssetLocationHistory.findOne({
            where: { asset_id: assetId },
            order: [['created_at', 'ASC']],  // Oldest first = original location
            attributes: ['latitude', 'longitude', 'created_at']
        });

        // Count total location updates for info
        const previousLocationsCount = await AssetLocationHistory.count({
            where: { asset_id: assetId }
        });

        // Determine if this is the first capture
        // First capture = no original location exists yet
        const isFirstCapture = !originalLocation;

        // Update location (this records a new history entry)
        const asset_service = require('../../services/assets/asset_service');
        await asset_service.update_geolocation(assetId, lat, long, req.user.id);

        // Return the ORIGINAL (first) location for comparison, not the previous scan
        // This ensures the 5m threshold is always compared against the registered location
        return res.json({
            success: true,
            message: 'Asset location updated successfully',
            data: {
                id: asset.id,
                assetId: asset.asset_code,
                assetName: asset.asset_code,
                lat: String(lat),
                long: String(long),
                latLongRemark: remark || null,
                previousLocations: previousLocationsCount,
                isFirstCapture,
                // Return ORIGINAL location (not previous scan) for displacement comparison
                previousLat: originalLocation ? String(originalLocation.latitude) : null,
                previousLong: originalLocation ? String(originalLocation.longitude) : null,
                // Additional info for debugging
                originalLocationDate: originalLocation?.created_at || null,
                // Return location context for incident creation
                plantId: asset.plant_id,
                buildingId: asset.building_id,
                floorId: asset.floor_id
            }
        });
    } catch (error) {
        console.error('[Technician Assets] Error updating location:', error);
        return next(error);
    }
};

/**
 * Get assets details by scanner ID
 * GET /api/technician/get-assets-details-by-scanner-id/:id
 */
const get_assets_by_scanner_id = async (req, res, next) => {
    try {
        const { id } = req.params;

        const asset = await Asset.findOne({
            where: {
                [Op.or]: [
                    { asset_code: id },
                    { tag: id },
                    { sl_no: id }
                ]
            },
            include: [
                { model: Plant, as: 'plant' },
                { model: Category, as: 'category' },
                { model: Product, as: 'product' },
                { model: Building, as: 'building' }
            ]
        });

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        const assetJson = asset.toJSON();
        const transformedAsset = {
            ...assetJson,
            assetId: asset.asset_code,
            assetName: asset.asset_code,
            plantName: asset.plant?.plant_name,
            categoryName: asset.category?.category_name,
            productName: asset.product?.product_name,
            plant: asset.plant ? {
                ...asset.plant,
                plantName: asset.plant.plant_name
            } : undefined,
            category: asset.category ? {
                ...asset.category,
                categoryName: asset.category.category_name
            } : undefined,
            product: asset.product ? {
                ...asset.product,
                productName: asset.product.product_name
            } : undefined
        };

        return res.json({
            success: true,
            asset: transformedAsset
        });
    } catch (error) {
        console.error('[Technician Assets] Error fetching asset by scanner ID:', error);
        return next(error);
    }
};

module.exports = {
    get_my_assets,
    get_asset_by_id,
    update_location,
    get_assets_by_scanner_id
};
