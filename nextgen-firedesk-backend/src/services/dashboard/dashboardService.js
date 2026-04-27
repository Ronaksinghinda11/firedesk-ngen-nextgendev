/**
 * Dashboard Service
 *
 * Provides real-time analytics data from PostgreSQL using Sequelize
 * All calculations are based on actual database data
 */

const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');
const moment = require('moment');
const Joi = require('joi');
// const {
//     Asset,
//     Plant,
//     Category,
//     ServiceSubmission,
//     Technician,
//     User,
//     Building,
//     Product,
//     FireSafetyForm,
//     Scheduler,
//     Ticket,
//     Manufacturer
// } = require('../../models');
const { IoTDeviceAssetMap, IoTLiveDataPR } = require('../../models/iot');
const { FireSafetySystem, Building, PlantCategory } = require('../../models/plants');
const { Manufacturer, Asset, AssetSpecValue, AssetMetadata } = require('../../models/assets');
const { Category, Product, SpecDefinition } = require('../../models/master-data');
const { ServiceSubmission, ServiceTechnician } = require('../../models/service-form');
const { Technician, User } = require('../../models/user-management');


const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Helper function to get org_user_id based on user role
 * NOTE: The assets table does NOT have an org_user_id column.
 * Always returns null to avoid "column a.org_user_id does not exist" errors.
 * Scoping is handled via plant_id (from frontend filters) instead.
 */
async function getOrgUserIdForQuery(user, queryOrgUserId) {
    // org_user_id column does not exist on assets table — always return null
    // Scoping by plant_id is the correct approach for all roles
    return null;
}

/**
 * Helper: Calculate health score percentage
 */
function calculateHealthScore(healthy, total) {
    if (total === 0) return 0;
    return Math.round((healthy / total) * 100);
}

/**
 * Helper: Calculate failure impact score
 */
function calculateFailureImpactScore(notWorking, attentionRequired, critical) {
    const totalImpact = (notWorking * 10) + (attentionRequired * 5) + (critical * 3);
    return Math.min(100, totalImpact);
}

/**
 * Helper: Calculate asset readiness
 */
function calculateAssetReadiness(failureImpact) {
    return Math.max(0, 100 - failureImpact);
}

/**
 * Helper: Calculate service compliance rate
 */
function calculateServiceComplianceRate(completed, total) {
    if (total === 0) return 100;
    return Math.round((completed / total) * 100);
}

/**
 * Helper: Calculate trend (percentage change)
 */
function calculateTrend(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

class DashboardService {
    /**
     * GET /api/organization/dashboard/system/health
     * System Overview with Health Score, Failure Impact, Service Compliance
     */
    async getSystemHealth(filters, user) {
        try {
            // Accept both plantId (from frontend) and plant_id
            const plant_id = filters.plant_id || filters.plantId;
            const { startDate, endDate, building, building_id, categoryId, product_id, type, capacity, granularity, org_user_id: queryOrgUserId } = filters;

            console.log('[getSystemHealth] Called with plant_id:', plant_id, 'categoryId:', categoryId);
            const org_user_id = await getOrgUserIdForQuery(user, queryOrgUserId);

            // Calculate date range based on granularity if not provided
            let effectiveStartDate = startDate;
            let effectiveEndDate = endDate;

            if (granularity && (!startDate || !endDate)) {
                const now = moment().startOf('day'); // Start from "Today" 00:00
                effectiveStartDate = now.toISOString();

                // "Day" means Today (00:00 - 23:59)
                // "Week" means Today + 7 days
                // "Month" means Today + 30 days
                switch (granularity) {
                    case 'day':
                        effectiveEndDate = moment(now).endOf('day').toISOString();
                        break;
                    case 'week':
                        effectiveEndDate = moment(now).add(1, 'week').endOf('day').toISOString();
                        break;
                    case 'month':
                    default:
                        effectiveEndDate = moment(now).add(1, 'month').endOf('day').toISOString();
                        break;
                }
            }

            // Build asset filter
            const assetFilter = {
                status: { [Op.ne]: 'DEACTIVE' }
            };
            if (org_user_id) assetFilter.org_user_id = org_user_id;
            if (plant_id) assetFilter.plant_id = plant_id;
            if (building_id) assetFilter.building_id = building_id;
            if (categoryId) assetFilter.category_id = categoryId;
            if (product_id) assetFilter.product_id = product_id;
            if (type) assetFilter.type = type;
            // if (capacity) assetFilter.capacity = capacity; // FIXME: capacity is in AssetSpecValue
            // If building name is provided, resolve to its UUID
            if (building) {
                const buildingRecord = await Building.findOne({ where: { building_name: building } });
                if (buildingRecord) assetFilter.building_id = buildingRecord.id;
            }
            // Fetch all assets with category
            const assets = await Asset.findAll({
                where: assetFilter,
                include: [{
                    model: Category,
                    as: 'category',
                    attributes: ['category_name']
                }],
                attributes: ['health_status', 'status', 'plant_id']
            });

            console.log('[getSystemHealth] Found', assets.length, 'assets. Sample plant_ids:', [...new Set(assets.map(a => a.plant_id))]);

            const totalAssets = assets.length;

            // Calculate health status counts
            const healthyCount = assets.filter(a => a.health_status === 'HEALTHY').length;
            const attentionCount = assets.filter(a =>
                a.health_status === 'NEEDS_ATTENTION' || a.health_status === 'NEEDS_ATTENTION'
            ).length;
            const notWorkingCount = assets.filter(a =>
                a.health_status === 'NOT_WORKING' || a.health_status === 'NOT_WORKING'
            ).length;
            const criticalCount = attentionCount + notWorkingCount;

            // Calculate metrics
            const healthScore = calculateHealthScore(healthyCount, totalAssets);
            const failureImpactScore = calculateFailureImpactScore(notWorkingCount, attentionCount, 0);
            const assetReadiness = calculateAssetReadiness(failureImpactScore);

            // Service compliance calculation -need to join with Asset for building filter
            const serviceFilter = {};
            if (plant_id) serviceFilter.plant_id = plant_id;

            // USE scheduled_date instead of created_at
            if (effectiveStartDate && effectiveEndDate) {
                serviceFilter.scheduled_date = {
                    [Op.between]: [new Date(effectiveStartDate), new Date(effectiveEndDate)]
                };
            }

            const serviceInclude = [];

            // If asset filter is needed (building, category, etc.), join with Asset
            if (building || building_id || org_user_id || categoryId || product_id || type || capacity) {
                const assetWhere = {};
                if (building) assetWhere.building = building;
                if (building_id) assetWhere.building_id = building_id;
                if (org_user_id) assetWhere.org_user_id = org_user_id;
                if (categoryId) assetWhere.category_id = categoryId;
                if (product_id) assetWhere.product_id = product_id;
                if (type) assetWhere.type = type;
                if (capacity) assetWhere.capacity = capacity;

                serviceInclude.push({
                    model: Asset,
                    as: 'asset',
                    attributes: [],
                    where: assetWhere,
                    required: true
                });
            }

            const totalServices = await ServiceSubmission.count({
                where: serviceFilter,
                include: serviceInclude.length > 0 ? serviceInclude : undefined,
                distinct: true
            });

            // DONE: Services scheduled in range AND completed
            // Explicitly use the scheduled_date filter defined above
            const completedServices = await ServiceSubmission.count({
                where: {
                    ...serviceFilter,
                    status: {
                        [Op.or]: [
                            { [Op.iLike]: 'COMPLETED' },
                            { [Op.iLike]: 'APPROVED' }
                        ]
                    } // Handle case variance
                },
                include: serviceInclude.length > 0 ? serviceInclude : undefined,
                distinct: true
            });

            // ACTIVE: Services scheduled in range but NOT completed
            const activeServices = await ServiceSubmission.count({
                where: {
                    ...serviceFilter,
                    status: {
                        [Op.and]: [
                            { [Op.notILike]: 'COMPLETED' },
                            { [Op.notILike]: 'APPROVED' },
                            { [Op.notILike]: 'REJECTED' },
                            { [Op.notILike]: 'CANCELLED' }
                        ]
                    }
                },
                include: serviceInclude.length > 0 ? serviceInclude : undefined,
                distinct: true
            });

            // LATER: Services scheduled STRICTLY AFTER the current range end date
            const laterServicesFilter = { ...serviceFilter };
            delete laterServicesFilter.scheduled_date; // Remove the standard "in range" filter

            const laterServices = await ServiceSubmission.count({
                where: {
                    ...laterServicesFilter,
                    scheduled_date: { [Op.gt]: new Date(effectiveEndDate) },
                    status: {
                        [Op.and]: [
                            { [Op.notILike]: 'REJECTED' },
                            { [Op.notILike]: 'CANCELLED' }
                        ]
                    }
                },
                include: serviceInclude.length > 0 ? serviceInclude : undefined,
                distinct: true
            });



            const serviceComplianceRate = calculateServiceComplianceRate(completedServices, totalServices);

            // Trend calculations (compare with previous period)
            const oneWeekAgo = moment().subtract(1, 'week').toDate();
            const previousAssets = await Asset.count({
                where: {
                    ...assetFilter,
                    health_status: 'HEALTHY',
                    updated_at: { [Op.lt]: oneWeekAgo }
                }
            });

            const healthTrend = calculateTrend(healthyCount, previousAssets);

            const result = {
                totalAssets,
                healthScore,
                failureImpactScore,
                assetReadiness,
                serviceComplianceRate,
                criticalAlerts: criticalCount,
                breakdown: {
                    healthy: healthyCount,
                    attentionRequired: attentionCount,
                    notWorking: notWorkingCount
                },
                trends: {
                    health: healthTrend,
                    period: 'week'
                },
                services: {
                    total: activeServices + completedServices + laterServices,
                    completed: completedServices, // Count of 'Done'
                    PENDING: activeServices,      // Count of 'Active' - UPPERCASE to match frontend
                    scheduled: laterServices      // Count of 'Later'
                }
            };

            console.log('DEBUG: System Health result:', JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            console.error('System Health Error:', error);
            throw error;
        }
    }

    /**
     * GET /api/organization/dashboard/tests/hydrostatic
     * Hydrostatic Test Overview with Completion Efficiency
     * 
     * NEW LOGIC:
     * - Last HP Test Date = manufacturing_date
     * - Next HP Test Due Date = manufacturing_date + 5 years
     */
    async getHydrostaticTests_SIMPLIFIED(filters, user) {
        try {
            const {
                plantId: plant_id,
                buildingId: building_id,
                categoryId,
                productId: product_id,
                type,
                capacity,
                startDate,
                endDate
            } = filters;

            const org_user_id = await getOrgUserIdForQuery(user, filters.orgUserId);

            // Build asset filter
            const assetFilter = {
                status: { [Op.ne]: 'DEACTIVE' }
            };

            if (org_user_id) assetFilter.org_user_id = org_user_id;
            if (plant_id) assetFilter.plant_id = plant_id;
            if (building_id) assetFilter.building_id = building_id;
            if (categoryId) assetFilter.category_id = categoryId;
            if (product_id) assetFilter.product_id = product_id;
            if (type) assetFilter.type = type;
            if (capacity) assetFilter.capacity = capacity;

            // Fetch all assets with manufacturing_date
            const assets = await Asset.findAll({
                where: assetFilter,
                attributes: ['id', 'asset_code', 'manufacturing_date', 'category_id'],
                raw: true
            });

            console.log(`[HP Tests] Found ${assets.length} assets`);

            // Calculate HP test dates
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            let totalScheduled = 0;
            let totalCompleted = 0;
            let upcoming = 0;
            let overdue = 0;

            // Monthly data for chart
            const monthlyData = {};

            assets.forEach(asset => {
                if (!asset.manufacturing_date) return;

                const mfgDate = new Date(asset.manufacturing_date);
                const nextDueDate = new Date(mfgDate);
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 5);

                // Check if test is scheduled (due date is within our date range or in the future)
                const isScheduled = nextDueDate >= (startDate ? new Date(startDate) : new Date(0));

                if (!isScheduled) return;

                totalScheduled++;

                // Check if test is completed (considering last test = mfg date, if due date hasn't passed, it's completed)
                const isCompleted = now < nextDueDate;

                if (isCompleted) {
                    totalCompleted++;
                } else {
                    overdue++;
                }

                // Check if upcoming (due in next 30 days)
                const daysUntilDue = Math.ceil((nextDueDate - now) / (1000 * 60 * 60 * 24));
                if (daysUntilDue > 0 && daysUntilDue <= 30) {
                    upcoming++;
                }

                // Group by month for chart data
                const dueMonth = nextDueDate.getMonth();
                const dueYear = nextDueDate.getFullYear();
                const monthKey = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { scheduled: 0, completed: 0, efficiency: 0 };
                }

                monthlyData[monthKey].scheduled++;
                if (isCompleted) {
                    monthlyData[monthKey].completed++;
                }
            });

            // Calculate efficiency for each month
            const chartData = Object.keys(monthlyData)
                .sort()
                .map(monthKey => {
                    const data = monthlyData[monthKey];
                    data.efficiency = data.scheduled > 0
                        ? Math.round((data.completed / data.scheduled) * 100)
                        : 0;
                    return {
                        month: monthKey,
                        ...data
                    };
                });

            // Overall efficiency
            const testCompletionEfficiency = totalScheduled > 0
                ? Math.round((totalCompleted / totalScheduled) * 100)
                : 0;

            // Delay index (percentage of overdue tests)
            const delayIndex = totalScheduled > 0
                ? Math.round((overdue / totalScheduled) * 100)
                : 0;

            return {
                totalScheduled,
                totalCompleted,
                testCompletionEfficiency,
                delayIndex,
                chartData,
                summary: { upcoming, overdue },
                filterOptions: {
                    buildings: [],
                    locations: [],
                    products: [],
                    types: [],
                    subTypes: [],
                    hpStatuses: [],
                    manufacturers: [],
                    capacities: []
                }
            };

        } catch (error) {
            console.error('[HP Tests] Error:', error);
            throw error;
        }
    }

    // GET /api/organization/dashboard/tests/hydrostatic - ACTIVE Implementation using manufacturing_date + 5 years
    async getHydrostaticTests(filters, user) {
        try {
            const {
                plantId, building, building_id, location,
                categoryId, product_id, type, subType,
                hpStatus, manufacturer_id, manufacturerId, capacity, startDate, endDate, granularity,
                groupBy = 'building',
                org_user_id: queryOrgUserId
            } = filters;

            // Map manufacturerId (from frontend) to manufacturer_id if needed
            const effectiveManufacturerId = manufacturer_id || manufacturerId;
            console.log('DEBUG: getHydrostaticTests called');
            console.log('DEBUG: filters object keys:', Object.keys(filters));
            console.log('DEBUG: manufacturer params:', { manufacturer_id, manufacturerId, effectiveManufacturerId });
            console.log('DEBUG: filters:', filters);

            const org_user_id = await getOrgUserIdForQuery(user, queryOrgUserId);

            // Build base asset filter (without date initially)
            const assetFilter = {
                status: { [Op.ne]: 'DEACTIVE' }
            };
            if (org_user_id) assetFilter.org_user_id = org_user_id;
            if (plantId) assetFilter.plant_id = plantId;
            if (building_id) assetFilter.building_id = building_id;
            if (location) assetFilter.location = location;
            if (categoryId) assetFilter.category_id = categoryId;
            if (product_id) assetFilter.product_id = product_id;
            if (type) assetFilter.type = type;
            if (subType) assetFilter.sub_type = subType; // ✅ FIXED
            if (effectiveManufacturerId) assetFilter.manufacturer_id = effectiveManufacturerId;
            // Capacity removed - doesn't exist in assets table

            // Resolve building name to UUID if provided
            if (building) {
                console.log('DEBUG: Looking up building with name:', building, 'in plant:', plantId);
                const buildingWhere = {
                    building_name: { [Op.iLike]: building } // Case-insensitive search
                };
                // CRITICAL: If plantId is provided, ensure we find the building within that plant
                // This handles cases where multiple buildings have the same name across different plants
                if (plantId) {
                    buildingWhere.plant_id = plantId;
                }

                const buildingRecord = await Building.findOne({
                    where: buildingWhere
                });
                if (buildingRecord) {
                    console.log('DEBUG: Found building:', buildingRecord.id, buildingRecord.building_name);
                    assetFilter.building_id = buildingRecord.id;
                } else {
                    console.log('DEBUG: Building not found with name:', building, 'in plant:', plantId);
                }
            }

            console.log('DEBUG: assetFilter before date:', JSON.stringify(assetFilter, null, 2));
            console.log('DEBUG: assetFilter.manufacturer_id:', assetFilter.manufacturer_id);

            // Date range for HP tests - filter by manufacturing_date only
            // Note: nextHPTestDueDate_CALCULATED is calculated AFTER fetch, not a DB column
            /* 
            // REMOVED: This strictly filters by manufacturing date, excluding assets that have 
            // scheduled tests due in the range but were manufactured earlier.
            if (startDate && endDate) {
                assetFilter.manufacturing_date = {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                };
            }
            */

            // Fetch assets with all needed attributes for filtering
            let assets = await Asset.findAll({
                where: assetFilter,
                attributes: [
                    'id', 'manufacturing_date',
                    'building_id', 'location',
                    'product_id', 'category_id', 'type', 'sub_type',
                    'health_status', 'manufacturer_id'
                ],
                include: [
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'product_name']
                    },
                    {
                        model: Building,
                        as: 'building',
                        attributes: ['id', 'building_name']
                    },
                    {
                        model: Manufacturer,
                        as: 'manufacturer',
                        attributes: ['id', 'name']
                    },
                    {
                        model: AssetSpecValue,
                        as: 'spec_values',
                        attributes: ['spec_value'],
                        required: !!capacity, // If capacity is filtered, this join is required
                        where: capacity ? { spec_value: typeof capacity === 'string' ? capacity : String(capacity) } : undefined,
                        include: [{
                            model: SpecDefinition,
                            as: 'spec_definition',
                            attributes: ['spec_name'],
                            where: { spec_name: 'Capacity' },
                            required: !!capacity // Ensure we only match 'Capacity' specs
                        }]
                    }
                ]
            });

            console.log(`DEBUG: Found ${assets.length} assets for Hydrostatic Tests`);

            // DIAGNOSTIC: Check if assets exist without building filter
            if (assets.length === 0 && assetFilter.building_id) {
                const diagnosticFilter = { ...assetFilter };
                delete diagnosticFilter.building_id;

                const assetsWithoutBuilding = await Asset.count({ where: diagnosticFilter });
                console.log(`DIAGNOSTIC: Assets for this plant+category WITHOUT building filter: ${assetsWithoutBuilding}`);

                if (assetsWithoutBuilding > 0) {
                    // Check which buildings have assets for this plant+category
                    const buildingDistribution = await Asset.findAll({
                        where: diagnosticFilter,
                        attributes: ['building_id'],
                        include: [{
                            model: Building,
                            as: 'building',
                            attributes: ['building_name']
                        }],
                        group: ['building_id', 'building.id', 'building.building_name'],
                        raw: false
                    });
                    console.log('DIAGNOSTIC: Assets found in buildings:', buildingDistribution.map(a => ({
                        building_id: a.building_id,
                        building_name: a.building?.building_name
                    })));
                }
            }

            // Helper function: Calculate nextHPTestDueDate from manufacturing_date + 5 years
            const enrichAssetWithHPDueDate = (asset) => {
                if (asset.manufacturing_date) {
                    const mfgDate = moment(asset.manufacturing_date);
                    const nextDueDate = mfgDate.clone().add(5, 'years').toDate();
                    asset.nextHPTestDueDate_CALCULATED = nextDueDate;
                } else {
                    asset.nextHPTestDueDate_CALCULATED = null;
                }
                return asset;
            };

            // Enrich all fetched assets with calculated due date
            assets = assets.map(enrichAssetWithHPDueDate);

            // If no assets match with date filter, fetch without date for filter options
            let allAssets = assets;
            if (assets.length === 0 && (startDate && endDate)) {
                const filterWithoutDate = { ...assetFilter };
                delete filterWithoutDate[Op.or];

                allAssets = await Asset.findAll({
                    where: filterWithoutDate,
                    attributes: [
                        'id', 'manufacturing_date',
                        'building_id', 'location',
                        'product_id', 'category_id', 'type', 'sub_type',
                        'health_status', 'manufacturer_id'
                    ],
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'product_name']
                        },
                        {
                            model: Building,
                            as: 'building',
                            attributes: ['id', 'building_name']
                        },
                        {
                            model: Manufacturer,
                            as: 'manufacturer',
                            attributes: ['id', 'name']
                        }
                    ]
                });
                console.log(`DEBUG: Fetched ${allAssets.length} assets without date filter for options`);

                // Enrich allAssets too
                allAssets = allAssets.map(enrichAssetWithHPDueDate);
            }

            // Filter by HP Status if provided
            if (hpStatus && assets.length > 0) {
                const now = moment();
                assets = assets.filter(asset => {
                    switch (hpStatus.toLowerCase()) {
                        case 'completed':
                            return asset.manufacturing_date && moment(asset.manufacturing_date).isAfter(moment().subtract(1, 'year'));
                        case 'scheduled':
                            return asset.nextHPTestDueDate_CALCULATED != null;
                        case 'overdue':
                            return asset.nextHPTestDueDate_CALCULATED && moment(asset.nextHPTestDueDate_CALCULATED).isBefore(now);
                        case 'upcoming':
                            return asset.nextHPTestDueDate_CALCULATED && moment(asset.nextHPTestDueDate_CALCULATED).isAfter(now);
                        default:
                            return true;
                    }
                });
                console.log(`DEBUG: After HP status filter (${hpStatus}): ${assets.length} assets`);
            }

            // ========== BULLETPROOF DATE RANGE HANDLING ==========
            const now = moment();

            // Parse date range - handle multiple formats
            let startMoment = null;
            let endMoment = null;

            if (startDate) {
                startMoment = moment(startDate);
                if (!startMoment.isValid()) {
                    startMoment = moment(startDate, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY']);
                }
                startMoment = startMoment.startOf('day');
            }

            if (endDate) {
                endMoment = moment(endDate);
                if (!endMoment.isValid()) {
                    endMoment = moment(endDate, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY']);
                }
                endMoment = endMoment.endOf('day');
            }

            // If only startDate provided, default endDate to end of that year
            if (startMoment && !endMoment) {
                endMoment = startMoment.clone().endOf('year');
                console.log('DEBUG: endDate not provided, defaulting to end of year:', endMoment.format('YYYY-MM-DD'));
            }

            // If neither date provided, use current year
            if (!startMoment && !endMoment) {
                startMoment = moment().startOf('year');
                endMoment = moment().endOf('year');
                console.log('DEBUG: No dates provided, using current year');
            }

            console.log('========== HP TEST DEBUG START ==========');
            console.log('Date range params:', { startDate, endDate });
            console.log('Parsed dates:', {
                start: startMoment?.format('YYYY-MM-DD HH:mm:ss'),
                end: endMoment?.format('YYYY-MM-DD HH:mm:ss'),
                startValid: startMoment?.isValid(),
                endValid: endMoment?.isValid()
            });
            console.log('Total assets from DB:', assets.length);

            // Helper function to check if a date is in range
            const isDateInRange = (dateValue) => {
                if (!dateValue) return false;
                if (!startMoment || !endMoment) return true; // No filter = all dates valid

                const dateMoment = moment(dateValue);
                if (!dateMoment.isValid()) {
                    console.log('DEBUG: Invalid date value:', dateValue);
                    return false;
                }

                const isInRange = dateMoment.isSameOrAfter(startMoment) && dateMoment.isSameOrBefore(endMoment);
                return isInRange;
            };

            // Group by dynamic dimension based on groupBy parameter
            const testsByGroup = {};

            // Define grouping function based on groupBy parameter
            const getGroupKey = (asset) => {
                switch (groupBy) {
                    case 'location':
                        return asset.location || 'Unknown Location';
                    case 'product':
                        return asset.product?.product_name || 'Unknown Product';
                    case 'type':
                        return asset.type || 'Unknown Type';
                    case 'subType':
                        return asset.sub_type || 'Unknown Sub-Type'; // ✅ FIXED
                    case 'hpStatus':
                        if (asset.manufacturing_date && moment(asset.manufacturing_date).isAfter(moment().subtract(1, 'year'))) {
                            return 'Completed';
                        } else if (asset.nextHPTestDueDate_CALCULATED) {
                            if (moment(asset.nextHPTestDueDate_CALCULATED).isBefore(now)) {
                                return 'Overdue';
                            }
                            return 'Scheduled';
                        }
                        return 'Unknown';
                    case 'month':
                        if (asset.manufacturing_date) {
                            return moment(asset.manufacturing_date).format('YYYY-MM');
                        } else if (asset.nextHPTestDueDate_CALCULATED) {
                            return moment(asset.nextHPTestDueDate_CALCULATED).format('YYYY-MM');
                        }
                        return 'Unknown';
                    case 'building':
                    default:
                        return asset.building?.building_name || 'Unknown Building';
                }
            };

            // Track totals
            let totalScheduled = 0;
            let totalCompleted = 0;

            // Process each asset
            assets.forEach((asset, index) => {
                const groupKey = getGroupKey(asset);
                if (!testsByGroup[groupKey]) {
                    testsByGroup[groupKey] = { scheduled: 0, completed: 0 };
                }

                const lastTestDate = asset.manufacturing_date;
                const nextDueDate = asset.nextHPTestDueDate_CALCULATED;

                const lastTestInRange = isDateInRange(lastTestDate);
                const nextDueInRange = isDateInRange(nextDueDate);

                console.log(`Asset ${index + 1}:`, {
                    groupKey,
                    manufacturing_date: lastTestDate ? moment(lastTestDate).format('YYYY-MM-DD') : null,
                    nextHPTestDueDate_CALCULATED: nextDueDate ? moment(nextDueDate).format('YYYY-MM-DD') : null,
                    lastTestInRange,
                    nextDueInRange
                });

                // Count completed tests (manufacturing_date in range)
                if (lastTestInRange) {
                    testsByGroup[groupKey].completed++;
                    totalCompleted++;
                    console.log(`  -> Counted as COMPLETED for ${groupKey}`);
                }

                // Count scheduled tests (nextHPTestDueDate_CALCULATED in range)
                if (nextDueInRange) {
                    testsByGroup[groupKey].scheduled++;
                    totalScheduled++;
                    console.log(`  -> Counted as SCHEDULED for ${groupKey}`);
                }
            });

            console.log('Final testsByGroup:', JSON.stringify(testsByGroup, null, 2));
            console.log('Final totals:', { totalScheduled, totalCompleted });
            console.log('========== HP TEST DEBUG END ==========');

            const testCompletionEfficiency = totalScheduled > 0
                ? Math.round((totalCompleted / totalScheduled) * 100)
                : 0;

            // Calculate delay index
            const delayedTests = assets.filter(a =>
                a.manufacturing_date && a.nextHPTestDueDate_CALCULATED &&
                moment(a.manufacturing_date).isAfter(moment(a.nextHPTestDueDate_CALCULATED))
            ).length;
            const delayIndex = totalScheduled > 0
                ? Math.round((delayedTests / totalScheduled) * 100)
                : 0;

            // Filter out groups with 0 counts to avoid showing empty categories
            const chartData = Object.keys(testsByGroup)
                .filter(group => {
                    const counts = testsByGroup[group];
                    return counts.scheduled > 0 || counts.completed > 0;
                })
                .sort()
                .map(group => ({
                    name: group,
                    scheduled: testsByGroup[group].scheduled,
                    completed: testsByGroup[group].completed,
                    displayMonth: group
                }));

            const upcoming = assets.filter(a =>
                a.nextHPTestDueDate_CALCULATED && moment(a.nextHPTestDueDate_CALCULATED).isAfter(now)
            ).length;

            const overdue = assets.filter(a =>
                a.nextHPTestDueDate_CALCULATED && moment(a.nextHPTestDueDate_CALCULATED).isBefore(now)
            ).length;

            // Generate filter options from allAssets
            // Deduplicate products, types, subTypes, manufacturers, capacities
            const productsMap = new Map();
            const manufacturersMap = new Map();
            const capacities = new Set();
            allAssets.forEach(a => {
                if (a.product_id && a.product?.product_name) {
                    if (!productsMap.has(a.product.product_name)) {
                        productsMap.set(a.product.product_name, { id: a.product_id, name: a.product.product_name });
                    }
                }
                if (a.manufacturer && a.manufacturer.id && a.manufacturer.name) {
                    manufacturersMap.set(a.manufacturer.id, { id: a.manufacturer.id, name: a.manufacturer.name });
                }
                if (a.capacity) {
                    capacities.add(a.capacity);
                }
            });

            const buildingsMap = new Map();
            allAssets.forEach(a => {
                if (a.building_id && a.building?.building_name) {
                    if (!buildingsMap.has(a.building_id)) {
                        buildingsMap.set(a.building_id, { id: a.building_id, name: a.building.building_name });
                    }
                }
            });

            const filterOptions = {
                buildings: Array.from(buildingsMap.values()),
                locations: [...new Set(allAssets.map(a => a.location).filter(Boolean))],
                products: Array.from(productsMap.values()),
                types: [...new Set(allAssets.map(a => a.type).filter(Boolean))],
                subTypes: [...new Set(allAssets.map(a => a.sub_type).filter(Boolean))], // ✅ FIXED
                hpStatuses: ['Completed', 'Scheduled', 'Overdue', 'Upcoming'],
                manufacturers: Array.from(manufacturersMap.values()),
                capacities: Array.from(capacities).sort((a, b) => a - b)
            };

            const result = {
                totalScheduled: totalScheduled,
                totalCompleted: totalCompleted,
                testCompletionEfficiency,
                delayIndex,
                chartData,
                summary: {
                    upcoming,
                    overdue
                },
                filterOptions
            };

            console.log('DEBUG: Hydrostatic result:', JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            console.error('Hydrostatic Tests Error:', error);
            throw error;
        }
    }


    /**
     * GET /api/organization/dashboard/refill/status
     * Re-Fill Status Summary with Refill Rate
     * 
     * NEW LOGIC:
     * - Last Refill Date = manufacturing_date
     * - Next Refill Due Date = null (not calculated yet)
     */
    async getRefillStatus_SIMPLIFIED(filters, user) {
        try {
            const {
                plantId: plant_id,
                buildingId: building_id,
                categoryId,
                productId: product_id,
                type,
                capacity,
                startDate,
                endDate
            } = filters;

            const org_user_id = await getOrgUserIdForQuery(user, filters.orgUserId);

            // Build asset filter
            const assetFilter = {
                status: { [Op.ne]: 'DEACTIVE' }
            };

            if (org_user_id) assetFilter.org_user_id = org_user_id;
            if (plant_id) assetFilter.plant_id = plant_id;
            if (building_id) assetFilter.building_id = building_id;
            if (categoryId) assetFilter.category_id = categoryId;
            if (product_id) assetFilter.product_id = product_id;
            if (type) assetFilter.type = type;
            if (capacity) assetFilter.capacity = capacity;

            // Fetch all assets with manufacturing_date
            const assets = await Asset.findAll({
                where: assetFilter,
                attributes: ['id', 'asset_code', 'manufacturing_date', 'category_id', 'capacity'],
                raw: true
            });

            console.log(`[Refill Status] Found ${assets.length} assets`);

            // Since nextRefillDueDate_NULL is null, we'll treat all as completed
            // (no scheduled refills to track yet)
            const now = new Date();
            let totalAssets = assets.length;
            let totalCapacity = 0;
            let totalCompleted = assets.length; // All considered completed since no due dates
            let totalScheduled = 0; // No scheduled refills yet

            // Monthly data for chart
            const monthlyData = {};

            assets.forEach(asset => {
                // Sum up total capacity
                if (asset.capacity) {
                    totalCapacity += parseFloat(asset.capacity) || 0;
                }

                // Since we have no due dates, we'll group by manufacturing month
                // to show historical data
                if (asset.manufacturing_date) {
                    const mfgDate = new Date(asset.manufacturing_date);
                    const mfgMonth = mfgDate.getMonth();
                    const mfgYear = mfgDate.getFullYear();
                    const monthKey = `${mfgYear}-${String(mfgMonth + 1).padStart(2, '0')}`;

                    if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = { scheduled: 0, completed: 0, efficiency: 0 };
                    }

                    // Count as completed (last refill = mfg date)
                    monthlyData[monthKey].completed++;
                }
            });

            // Calculate efficiency for each month
            const chartData = Object.keys(monthlyData)
                .sort()
                .map(monthKey => {
                    const data = monthlyData[monthKey];
                    // Since all are completed and no scheduled, efficiency is 100%
                    data.efficiency = 100;
                    return {
                        month: monthKey,
                        ...data
                    };
                });

            // Refill rate (completions per asset)
            const refillRate = totalAssets > 0 ? (totalCompleted / totalAssets) : 0;

            // Cylinder usage efficiency (100% since all are in use)
            const cylinderUsageEfficiency = 100;

            // Average refills per asset (1 since only manufacturing date)
            const avgRefillsPerAsset = 1;

            return {
                totalScheduled,
                totalCompleted,
                refillRate: Math.round(refillRate * 100),
                cylinderUsageEfficiency,
                chartData,
                summary: {
                    totalAssets,
                    totalCapacity: Math.round(totalCapacity),
                    avgRefillsPerAsset
                },
                filterOptions: {
                    buildings: [],
                    locations: [],
                    products: [],
                    types: [],
                    subTypes: [],
                    refillStatuses: [],
                    manufacturers: [],
                    capacities: []
                },
                message: 'Refill tracking based on manufacturing date only. Next due dates not configured.'
            };

        } catch (error) {
            console.error('[Refill Status] Error:', error);
            throw error;
        }
    }

    // GET /api/organization/dashboard/refill/status - ACTIVE Implementation using manufacturing_date
    async getRefillStatus(filters, user) {
        try {
            console.log('DEBUG: getRefillStatus called');
            console.log('DEBUG: filters:', filters);
            const {
                plantId, building, building_id, location,
                categoryId, product_id, type, subType,
                refillStatus, manufacturer_id, manufacturerId, capacity, startDate, endDate, granularity,
                groupBy = 'building',
                org_user_id: queryOrgUserId
            } = filters;

            // Map manufacturerId (from frontend) to manufacturer_id if needed
            const effectiveManufacturerId = manufacturer_id || manufacturerId;
            const org_user_id = await getOrgUserIdForQuery(user, queryOrgUserId);

            // Get Fire Extinguisher category or use provided categoryId
            let targetCategoryId = categoryId;
            if (!targetCategoryId) {
                const fireExtCategory = await Category.findOne({
                    where: { category_name: 'Fire Extinguishers' }
                });
                console.log('DEBUG: Fire Extinguisher category:', fireExtCategory);
                targetCategoryId = fireExtCategory?.id;
            }
            console.log('DEBUG: targetCategoryId:', targetCategoryId);

            if (!targetCategoryId) {
                console.log('DEBUG: No Fire Extinguisher category found, returning empty data');
                return {
                    totalScheduled: 0,
                    totalCompleted: 0,
                    refillRate: 0,
                    cylinderUsageEfficiency: 0,
                    chartData: [],
                    summary: { totalAssets: 0, totalCapacity: 0, avgRefillsPerAsset: 0 },
                    filterOptions: { buildings: [], locations: [], products: [], types: [], subTypes: [], refillStatuses: [] }
                };
            }

            // Build asset filter
            const assetFilter = {
                category_id: targetCategoryId,
                status: { [Op.ne]: 'DEACTIVE' }
            };
            if (org_user_id) assetFilter.org_user_id = org_user_id;
            if (plantId) assetFilter.plant_id = plantId;
            if (building_id) assetFilter.building_id = building_id;
            if (location) assetFilter.location = location;
            if (product_id) assetFilter.product_id = product_id;
            if (type) assetFilter.type = type;
            if (subType) assetFilter.sub_type = subType; // ✅ FIXED: sub_type not subType
            if (effectiveManufacturerId) assetFilter.manufacturer_id = effectiveManufacturerId;
            // Note: Capacity is filtered via JOIN to asset_spec_values below

            // Resolve building name to UUID if provided
            if (building) {
                console.log('DEBUG [Refill]: Looking up building with name:', building, 'in plant:', plantId);
                const buildingWhere = {
                    building_name: { [Op.iLike]: building } // Case-insensitive search
                };
                // CRITICAL: If plantId is provided, ensure we find the building within that plant
                if (plantId) {
                    buildingWhere.plant_id = plantId;
                }

                const buildingRecord = await Building.findOne({
                    where: buildingWhere
                });
                if (buildingRecord) {
                    console.log('DEBUG [Refill]: Found building:', buildingRecord.id, buildingRecord.building_name);
                    assetFilter.building_id = buildingRecord.id;
                } else {
                    console.log('DEBUG [Refill]: Building not found with name:', building, 'in plant:', plantId);
                }
            }

            // Get all fire extinguisher assets with refill date fields using raw query
            const [assets] = await sequelize.query(`
        SELECT 
          a.id, a.type, a.sub_type,
          a."building_id", a.location,
          a."product_id", a."category_id", a."manufacturer_id",
          a."manufacturing_date",
          p.id as "product_id", p."product_name" as "product_name",
          b.id as "building_id", b."building_name" as "building_name",
          m.id as "manufacturer_id", m.name as "manufacturer_name",
          asv.spec_value as "capacity"
        FROM assets a
        LEFT JOIN products p ON a."product_id" = p.id
        LEFT JOIN buildings b ON a."building_id" = b.id
        LEFT JOIN manufacturers m ON a."manufacturer_id" = m.id
        LEFT JOIN asset_spec_values asv ON a.id = asv.asset_id
        LEFT JOIN spec_definitions sd ON asv.spec_definition_id = sd.id AND sd.spec_name = 'Capacity'
        WHERE a."category_id" = :targetCategoryId
          AND a.status != 'DEACTIVE'
          ${org_user_id ? 'AND a."org_user_id" = :org_user_id' : ''}
          ${plantId ? 'AND a."plant_id" = :plant_id' : ''}
          ${building_id ? 'AND a."building_id" = :building_id' : ''}
          ${location ? 'AND a.location = :location' : ''}
          ${product_id ? 'AND a."product_id" = :product_id' : ''}
          ${type ? 'AND a.type = :type' : ''}
          ${subType ? 'AND a.sub_type = :subType' : ''} 
          ${effectiveManufacturerId ? 'AND a."manufacturer_id" = :manufacturer_id' : ''}
          ${capacity ? 'AND asv.spec_value = :capacity' : ''}
      `, {
                replacements: {
                    targetCategoryId,
                    ...(org_user_id && { org_user_id }),
                    ...(plantId && { plant_id: plantId }),
                    ...(building_id && { building_id }),
                    ...(location && { location }),
                    ...(product_id && { product_id }),
                    ...(type && { type }),
                    ...(subType && { subType }),
                    ...(effectiveManufacturerId && { manufacturer_id: effectiveManufacturerId }),
                    ...(capacity && { capacity })
                }
            });

            // Transform to expected structure - use only actual data from database
            // nextRefillDueDate_NULL doesn't exist in DB - always set to null
            const transformedAssets = assets.map(a => ({
                ...a,
                nextRefillDueDate_NULL: null, // Column doesn't exist in database
                product: { id: a.product_id, product_name: a.product_name },
                building: { id: a.building_id, building_name: a.building_name },
                manufacturer: { id: a.manufacturer_id, name: a.manufacturer_name }
            }));

            console.log('DEBUG: Found', transformedAssets.length, 'fire extinguisher assets');

            // Calculate refill status based on manufacturing_date and nextRefillDueDate_NULL
            const now = new Date();
            const startDateObj = startDate ? new Date(startDate) : null;
            const endDateObj = endDate ? new Date(endDate) : null;

            // Group assets by refill status
            let completedRefills = 0;
            let scheduledRefills = 0;
            let overdueRefills = 0;

            const refillsByGroup = {};

            // Define grouping function based on groupBy parameter
            const getGroupKey = (asset) => {
                switch (groupBy) {
                    case 'location':
                        return asset.location || 'Unknown Location';
                    case 'product':
                        return asset.product?.product_name || 'Unknown Product';
                    case 'type':
                        return asset.type || 'Unknown Type';
                    case 'subType':
                        return asset.sub_type || 'Unknown Sub-Type'; // ✅ FIXED: sub_type not subType
                    case 'refillStatus':
                        // Calculate status for this asset
                        if (asset.manufacturing_date && startDateObj && endDateObj) {
                            const refilledDate = new Date(asset.manufacturing_date);
                            if (refilledDate >= startDateObj && refilledDate <= endDateObj) {
                                return 'Completed';
                            }
                        }
                        if (asset.nextRefillDueDate_NULL) {
                            const nextDue = new Date(asset.nextRefillDueDate_NULL);
                            if (nextDue < now) return 'Overdue';
                            return 'Scheduled';
                        }
                        return 'Not Scheduled';
                    case 'month':
                        if (asset.manufacturing_date) {
                            return moment(asset.manufacturing_date).format('YYYY-MM');
                        }
                        return 'No Refill Date';
                    case 'building':
                    default:
                        return asset.building?.building_name || 'Unknown Building'; // ✅ Already correct
                }
            };

            // Process each asset
            transformedAssets.forEach(asset => {
                const groupKey = getGroupKey(asset);

                if (!refillsByGroup[groupKey]) {
                    refillsByGroup[groupKey] = { scheduled: 0, completed: 0, overdue: 0 };
                }

                // COMPLETED: Based on manufacturing_date within the date range
                const hasRefilledInRange = asset.manufacturing_date && startDateObj && endDateObj &&
                    new Date(asset.manufacturing_date) >= startDateObj &&
                    new Date(asset.manufacturing_date) <= endDateObj;

                // nextRefillDueDate_NULL (calculated or from DB)
                const nextDue = asset.nextRefillDueDate_NULL;

                // SCHEDULED: nextRefillDueDate_NULL is in the future AND within the date range
                const isScheduled = nextDue && nextDue > now &&
                    (!startDateObj || nextDue >= startDateObj) &&
                    (!endDateObj || nextDue <= endDateObj);

                // OVERDUE: nextRefillDueDate_NULL is in the past
                const isOverdue = nextDue && nextDue < now;

                // Count based on status - each asset gets ONE status only
                if (hasRefilledInRange) {
                    completedRefills++;
                    refillsByGroup[groupKey].completed++;
                } else if (isOverdue) {
                    overdueRefills++;
                    refillsByGroup[groupKey].overdue++;
                } else if (isScheduled) {
                    scheduledRefills++;
                    refillsByGroup[groupKey].scheduled++;
                }
            });

            const totalScheduled = scheduledRefills + overdueRefills;
            const refillRate = totalScheduled > 0
                ? Math.round((completedRefills / (totalScheduled + completedRefills)) * 100)
                : 0;

            // Calculate cylinder usage efficiency
            const totalCapacity = transformedAssets.reduce((sum, a) => sum + (parseFloat(a.capacity) || 0), 0);
            const avgRefillsPerAsset = transformedAssets.length > 0 ? completedRefills / transformedAssets.length : 0;

            const chartData = Object.keys(refillsByGroup).sort().map(group => ({
                name: group,
                scheduled: refillsByGroup[group].scheduled,
                completed: refillsByGroup[group].completed,
                overdue: refillsByGroup[group].overdue,
                total: refillsByGroup[group].scheduled + refillsByGroup[group].completed + refillsByGroup[group].overdue,
                displayMonth: group
            }));

            // Generate filter options from transformed assets
            const refillProductsMap = new Map();
            const refillManufacturersMap = new Map();
            const refillCapacities = new Set();

            transformedAssets.forEach(a => {
                if (a.product_id && a.product?.product_name) {
                    if (!refillProductsMap.has(a.product.product_name)) {
                        refillProductsMap.set(a.product.product_name, { id: a.product_id, name: a.product.product_name });
                    }
                }
                if (a.manufacturer && a.manufacturer.id && a.manufacturer.name) {
                    refillManufacturersMap.set(a.manufacturer_id, { id: a.manufacturer_id, name: a.manufacturer.name });
                }
                if (a.capacity) {
                    refillCapacities.add(a.capacity);
                }
            });

            const refillBuildingsMap = new Map();
            transformedAssets.forEach(a => {
                if (a.building_id && a.building?.building_name) {
                    if (!refillBuildingsMap.has(a.building_id)) {
                        refillBuildingsMap.set(a.building_id, { id: a.building_id, name: a.building.building_name });
                    }
                }
            });

            const filterOptions = {
                buildings: Array.from(refillBuildingsMap.values()),
                locations: [...new Set(transformedAssets.map(a => a.location).filter(Boolean))],
                products: Array.from(refillProductsMap.values()),
                types: [...new Set(transformedAssets.map(a => a.type).filter(Boolean))],
                subTypes: [...new Set(transformedAssets.map(a => a.sub_type).filter(Boolean))], // ✅ FIXED: sub_type not subType
                refillStatuses: ['Completed', 'Scheduled', 'Overdue'],
                manufacturers: Array.from(refillManufacturersMap.values()),
                capacities: Array.from(refillCapacities).sort((a, b) => a - b)
            };

            const result = {
                totalScheduled: scheduledRefills,
                totalCompleted: completedRefills,
                totalOverdue: overdueRefills,
                refillRate,
                cylinderUsageEfficiency: Math.round(avgRefillsPerAsset * 100),
                chartData,
                summary: {
                    totalAssets: transformedAssets.length,
                    totalCapacity: Math.round(totalCapacity * 10) / 10,
                    avgRefillsPerAsset: Math.round(avgRefillsPerAsset * 100) / 100
                },
                filterOptions
            };

            return result;
        } catch (error) {
            console.error('Refill Status Error:', error);
            throw error;
        }
    }
    /**
     * GET /api/organization/dashboard/assets/distribution
     * Asset Distribution with Ageing Score and Condition Index
     */
    async getAssetDistribution(filters, user) {
        try {
            // Accept both plantId (from frontend) and plant_id
            const plant_id = filters.plant_id || filters.plantId;
            const { categoryId, building_id, floor, status, health_status, product_id, type, manufacturer_id, serviceStatus, org_user_id: queryOrgUserId } = filters;
            const org_user_id = await getOrgUserIdForQuery(user, queryOrgUserId);

            console.log('DEBUG: getAssetDistribution called with filters:', filters);

            // Build filter
            const assetFilter = {
                status: { [Op.ne]: 'DEACTIVE' } // Only show active assets
            };
            if (org_user_id) assetFilter.org_user_id = org_user_id;
            if (plant_id) assetFilter.plant_id = plant_id;
            if (categoryId) assetFilter.category_id = categoryId;
            if (building_id) assetFilter.building_id = building_id;
            if (status) assetFilter.status = status;
            if (health_status) assetFilter.health_status = health_status;
            if (product_id) assetFilter.product_id = product_id;
            if (type) assetFilter.type = type;
            // Note: capacity is not a direct column on Asset table - it's in asset_spec_values
            if (manufacturer_id) assetFilter.manufacturer_id = manufacturer_id;

            console.log('DEBUG: assetFilter:', JSON.stringify(assetFilter, null, 2));

            const assets = await Asset.findAll({
                where: assetFilter,
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'category_name']
                    },
                    {
                        model: Manufacturer,
                        as: 'manufacturer',
                        attributes: ['id', 'name']
                    },
                    {
                        model: Building,
                        as: 'building',
                        attributes: ['id', 'building_name']
                    }
                ],
                attributes: ['id', 'health_status', 'status', 'install_date', 'lifespan_years', 'building_id', 'type', 'manufacturer_id', 'location', 'plant_id', 'category_id']
            });

            console.log('DEBUG: Found', assets.length, 'assets for distribution');

            // Filter by service status if provided - simplified since we removed ServiceSubmission include
            let filteredAssets = assets;

            // Calculate metrics for each asset
            const assetsWithMetrics = filteredAssets.map(asset => {
                const installDate = asset.install_date ? moment(asset.install_date) : null;
                const lifespan = asset.lifespan_years || 10;

                // Ageing score (0-100, where 100 is oldest)
                let ageingScore = 0;
                if (installDate) {
                    const ageInYears = moment().diff(installDate, 'years', true);
                    ageingScore = Math.min(100, Math.round((ageInYears / lifespan) * 100));
                }

                // Last service days - using created_at as proxy since last_inspection_date doesn't exist
                const lastServiceDays = 9999; // Default - would need separate query to get last service date

                // Condition index (0-100, where 100 is best condition)
                let conditionIndex = 50; // default
                if (asset.health_status === 'HEALTHY') conditionIndex = 90;
                else if (asset.health_status === 'NEEDS_ATTENTION' || asset.health_status === 'NEEDS_ATTENTION') conditionIndex = 50;
                else if (asset.health_status === 'NOT_WORKING' || asset.health_status === 'NOT_WORKING') conditionIndex = 10;

                // Adjust for last service
                if (lastServiceDays < 90) conditionIndex = Math.min(100, conditionIndex + 10);
                else if (lastServiceDays > 180) conditionIndex = Math.max(0, conditionIndex - 20);

                // Lifecycle remaining (percentage)
                let lifecycleRemaining = 100;
                if (installDate) {
                    const ageInYears = moment().diff(installDate, 'years', true);
                    lifecycleRemaining = Math.max(0, Math.round(((lifespan - ageInYears) / lifespan) * 100));
                }

                return {
                    ageingScore,
                    conditionIndex,
                    lifecycleRemaining,
                    health_status: asset.health_status,
                    building_id: asset.building_id,
                    building_name: asset.building?.building_name || 'Unassigned',
                    type: asset.type,
                    location: asset.location,
                    category_name: asset.category?.category_name
                };
            });

            // Calculate averages
            const avgAgeingScore = assetsWithMetrics.length > 0
                ? assetsWithMetrics.reduce((sum, a) => sum + a.ageingScore, 0) / assetsWithMetrics.length
                : 0;

            const avgConditionIndex = assetsWithMetrics.length > 0
                ? assetsWithMetrics.reduce((sum, a) => sum + a.conditionIndex, 0) / assetsWithMetrics.length
                : 0;

            const avgLifecycleRemaining = assetsWithMetrics.length > 0
                ? assetsWithMetrics.reduce((sum, a) => sum + a.lifecycleRemaining, 0) / assetsWithMetrics.length
                : 0;

            // Distribution by building (using building name from included Building model)
            const byBuilding = {};
            assetsWithMetrics.forEach(a => {
                const key = a.building_name || 'Unassigned';
                if (!byBuilding[key]) byBuilding[key] = { total: 0, healthy: 0, attention: 0, notWorking: 0 };
                byBuilding[key].total++;
                if (a.health_status === 'HEALTHY') byBuilding[key].healthy++;
                else if (a.health_status === 'NEEDS_ATTENTION') byBuilding[key].attention++;
                else byBuilding[key].notWorking++;
            });

            // Distribution by type
            const byType = {};
            assetsWithMetrics.forEach(a => {
                const key = a.type || 'Other';
                if (!byType[key]) byType[key] = { total: 0 };
                byType[key].total++;
            });

            // Generate filter options
            const manufacturersMap = new Map();
            const serviceStatuses = new Set();

            assets.forEach(a => {
                if (a.manufacturer) {
                    manufacturersMap.set(a.manufacturer.id, { id: a.manufacturer.id, name: a.manufacturer.name });
                }
                if (a.lastService && a.lastService.status) {
                    serviceStatuses.add(a.lastService.status);
                }
            });

            const result = {
                totalAssets: assetsWithMetrics.length,
                avgAgeingScore: Math.round(avgAgeingScore * 10) / 10,
                avgConditionIndex: Math.round(avgConditionIndex * 10) / 10,
                avgLifecycleRemaining: Math.round(avgLifecycleRemaining * 10) / 10,
                distributionByBuilding: byBuilding,
                distributionByType: byType,
                ageGroups: {
                    new: assetsWithMetrics.filter(a => a.ageingScore < 30).length,
                    moderate: assetsWithMetrics.filter(a => a.ageingScore >= 30 && a.ageingScore < 70).length,
                    old: assetsWithMetrics.filter(a => a.ageingScore >= 70).length
                },
                filterOptions: {
                    manufacturers: Array.from(manufacturersMap.values()),
                    serviceStatuses: Array.from(serviceStatuses)
                }
            };

            return result;
        } catch (error) {
            console.error('Asset Distribution Error:', error);
            throw error;
        }
    }

    /**
     * GET /api/organization/dashboard/tasks/overview
     * Task Overview with Completion Efficiency and Technician Performance
     */
    // async getTasksOverview(filters, user) {
    //     try {
    //         console.log('DEBUG: getTasksOverview called');
    //         console.log('DEBUG: filters:', filters);
    //         const { plant_id, building_id, categoryId, product_id, type, capacity, startDate, endDate, org_user_id: queryOrgUserId } = filters;
    //         const org_user_id = await getOrgUserIdForQuery(user, queryOrgUserId);
    //         console.log('DEBUG: org_user_id:', org_user_id);

    //         // Get service submissions as tasks (ServiceSubmission doesn't have org_user_id)
    //         const taskFilter = {};
    //         if (plant_id) taskFilter.plant_id = plant_id;
    //         // Use scheduled_date for date filtering (consistent with System Health)
    //         if (startDate && endDate) {
    //             taskFilter.scheduled_date = {
    //                 [Op.between]: [new Date(startDate), new Date(endDate)]
    //             };
    //         }
    //         console.log('DEBUG: taskFilter:', JSON.stringify(taskFilter));

    //         const taskInclude = [{
    //             model: Technician,
    //             as: 'technician',
    //             attributes: ['id', 'user_id'],
    //             include: [{
    //                 model: User,
    //                 as: 'user',
    //                 attributes: ['id', 'name', 'email']
    //             }]
    //         }, {
    //             model: Asset,
    //             as: 'asset',
    //             attributes: ['id', 'asset_code', 'type', 'building_id'],
    //             required: false
    //         }];

    //         // If org_user_id, building_id, categoryId, product_id, type, or capacity filter is needed, add where clause to Asset
    //         if (org_user_id || building_id || categoryId || product_id || type || capacity) {
    //             const assetWhere = {};
    //             if (org_user_id) assetWhere.org_user_id = org_user_id;
    //             if (building_id) assetWhere.building_id = building_id;
    //             if (categoryId) assetWhere.category_id = categoryId;
    //             if (product_id) assetWhere.product_id = product_id;
    //             if (type) assetWhere.type = type;
    //             // if (capacity) assetWhere.capacity = capacity; // FIXME: capacity is in AssetSpecValue

    //             // Update the asset include with where clause
    //             const assetInclude = taskInclude.find(inc => inc.as === 'asset');
    //             if (assetInclude) {
    //                 assetInclude.where = assetWhere;
    //                 assetInclude.required = true;
    //             }
    //         }

    //         const tasks = await ServiceSubmission.findAll({
    //             where: taskFilter,
    //             include: taskInclude,
    //             attributes: ['id', 'status', 'scheduled_date', 'completed_at', 'created_at', 'technician_id', 'inspection_type', 'submitted_by']
    //         });

    //         console.log('[getTasksOverview] Found', tasks.length, 'tasks');
    //         if (tasks.length === 0) {
    //             // Debug: check total tasks without date filter
    //             const total = await ServiceSubmission.count({ where: { plant_id: plant_id || null } });
    //             console.log('[getTasksOverview] Total tasks for plant (no date filter):', total);
    //         }


    //         const totalTasks = tasks.length;
    //         const completedTasks = tasks.filter(t => ['COMPLETED', 'APPROVED'].includes((t.status || '').toUpperCase())).length;

    //         const now = moment();
    //         // Pending tasks: PENDING or IN_PROGRESS but NOT overdue
    //         const pendingTasks = tasks.filter(t => {
    //             const status = (t.status || '').toUpperCase();
    //             return (status === 'PENDING' || status === 'IN_PROGRESS' || status === 'SUBMITTED' || status === 'DRAFT') &&
    //                 !(t.scheduled_date && moment(t.scheduled_date).isBefore(now));
    //         }).length;
    //         const scheduledTasks = tasks.filter(t =>
    //             t.scheduled_date && moment(t.scheduled_date).isSameOrAfter(moment(), 'day')
    //         ).length;


    //         const overdueTasks = tasks.filter(t =>
    //             t.scheduled_date &&
    //             moment(t.scheduled_date).isBefore(now) &&
    //             (t.status || '').toUpperCase() !== 'COMPLETED'
    //         );

    //         // Updated efficiency formula: completed / (completed + lapsed) * 100
    //         const lapsedTasks = overdueTasks.length;
    //         const taskCompletionEfficiency = (completedTasks + lapsedTasks) > 0
    //             ? Math.round((completedTasks / (completedTasks + lapsedTasks)) * 100)
    //             : 0;

    //         // Calculate avg completion time
    //         const completedWithDates = tasks.filter(t => t.completed_at && t.created_at);
    //         const avgCompletionDays = completedWithDates.length > 0
    //             ? completedWithDates.reduce((sum, t) =>
    //                 sum + moment(t.completed_at).diff(moment(t.created_at), 'days'), 0
    //             ) / completedWithDates.length
    //             : 0;

    //         const productivityScore = Math.max(0, Math.min(100,
    //             taskCompletionEfficiency - (avgCompletionDays * 2)
    //         ));

    //         const overdueTaskSeverity = overdueTasks.length > 0
    //             ? Math.min(100, overdueTasks.length * 5)
    //             : 0;

    //         // Technician performance
    //         const technicianStats = {};
    //         tasks.forEach(task => {
    //             const techId = task.technician_id;
    //             if (!techId) return;

    //             if (!technicianStats[techId]) {
    //                 technicianStats[techId] = {
    //                     name: task.technician?.user?.name || 'Unknown',
    //                     total: 0,
    //                     completed: 0,
    //                     onTime: 0,
    //                     overdue: 0
    //                 };
    //             }

    //             // Assignment logic (based on primary technician_id)
    //             // Note: For more accurate assignment tracking, use getTechnicianPerformance
    //             technicianStats[techId].total++;

    //             const status = (task.status || '').toUpperCase();
    //             const isCompleted = status === 'COMPLETED' || status === 'APPROVED';

    //             if (isCompleted) {
    //                 // Credit completion to the person who submitted it (or fallback to assigned tech)
    //                 const completerId = task.submitted_by || task.technician_id;

    //                 if (completerId) {
    //                     // Ensure stat entry exists for completer (might be ad-hoc)
    //                     if (!technicianStats[completerId]) {
    //                         // We might not have the name if they weren't the primary tech, but we'll try
    //                         technicianStats[completerId] = {
    //                             name: (completerId === task.technician_id ? task.technician?.user?.name : 'Ad-Hoc Tech') || 'Unknown',
    //                             total: 0, // Not assigned primarily
    //                             completed: 0,
    //                             onTime: 0,
    //                             overdue: 0
    //                         };
    //                     }

    //                     technicianStats[completerId].completed++;

    //                     // Check if completed on or before scheduled date
    //                     if (task.completed_at && task.scheduled_date && moment(task.completed_at).isSameOrBefore(moment(task.scheduled_date), 'day')) {
    //                         technicianStats[completerId].onTime++;
    //                     }
    //                 }
    //             }

    //             // Count overdue tasks for this technician
    //             if (task.scheduled_date && moment(task.scheduled_date).isBefore(now) && !isCompleted && status !== 'REJECTED' && status !== 'CANCELLED') {
    //                 technicianStats[techId].overdue++;
    //             }
    //         });

    //         const technicianPerformance = Object.entries(technicianStats).map(([id, stats]) => {
    //             const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    //             const onTimeRate = stats.completed > 0 ? (stats.onTime / stats.completed) * 100 : 0;

    //             // Performance score: 60% completion rate + 40% on-time rate
    //             const performanceScore = Math.round((completionRate * 0.6) + (onTimeRate * 0.4));

    //             // Calculate pending tasks (total - completed)
    //             const pendingTasks = stats.total - stats.completed;

    //             // Efficiency: same as on-time percentage (how often they complete on time)
    //             const efficiency = Math.round(onTimeRate);

    //             // Rating: 0-5 scale based on performance score
    //             const rating = Math.min(5, Math.max(0, performanceScore / 20));

    //             return {
    //                 technicianId: id,
    //                 name: stats.name,
    //                 performanceScore,
    //                 completedTasks: stats.completed,
    //                 totalTasks: stats.total,
    //                 pendingTasks,
    //                 overdueTasks: stats.overdue,
    //                 onTimePercentage: Math.round(onTimeRate),
    //                 efficiency,
    //                 rating: Math.round(rating * 10) / 10 // Round to 1 decimal
    //             };
    //         }).sort((a, b) => b.performanceScore - a.performanceScore);

    //         // Recent activity - show upcoming services (today and future) instead of past
    //         const today = moment().startOf('day').toDate();
    //         const upcomingTasks = tasks.filter(t =>
    //             t.scheduled_date && moment(t.scheduled_date).isSameOrAfter(today, 'day')
    //         );

    //         const recentActivity = upcomingTasks
    //             .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date)) // Ascending - soonest first
    //             .slice(0, 10)
    //             .map(t => ({
    //                 id: t.id,
    //                 status: t.status,
    //                 created_at: t.created_at,
    //                 scheduled_date: t.scheduled_date,
    //                 technician: t.technician?.user?.name || 'Unassigned',
    //                 asset_code: t.asset?.asset_code || '',
    //                 assetTag: t.asset?.tag || '',
    //                 assetType: t.asset?.type || '',
    //                 building: t.asset?.building_id || '',
    //                 serviceType: t.inspection_type || 'Maintenance'
    //             }));

    //         // Service type breakdown - Robust handling for case/whitespace/nulls
    //         const serviceTypeBreakdown = {
    //             maintenance: tasks.filter(t => {
    //                 const type = (t.inspection_type || '').trim().toLowerCase();
    //                 return type === 'maintenance' || type === '';
    //             }).length,
    //             inspection: tasks.filter(t => (t.inspection_type || '').trim().toLowerCase() === 'inspection').length,
    //             testing: tasks.filter(t => (t.inspection_type || '').trim().toLowerCase() === 'testing').length
    //         };

    //         console.log('DEBUG: TaskOverview Calculated Breakdown:', JSON.stringify(serviceTypeBreakdown, null, 2));

    //         // Detailed task status breakdown
    //         const inProgressTasks = tasks.filter(t => (t.status || '').toUpperCase() === 'IN_PROGRESS').length;
    //         const waitingApprovalTasks = tasks.filter(t =>
    //             (t.status || '').toUpperCase() === 'SUBMITTED' || (t.approval_status || '').toUpperCase() === 'PENDING'
    //         ).length;
    //         const rejectedTasks = tasks.filter(t =>
    //             (t.status || '').toUpperCase() === 'REJECTED' || (t.approval_status || '').toUpperCase() === 'REJECTED'
    //         ).length;

    //         // Overdue tasks time bucketing - how long ago they became overdue
    //         const overdueTaskBuckets = {
    //             last3Days: overdueTasks.filter(t => {
    //                 const daysOverdue = now.diff(moment(t.scheduled_date), 'days');
    //                 return daysOverdue >= 0 && daysOverdue <= 3;
    //             }).length,
    //             last4to7Days: overdueTasks.filter(t => {
    //                 const daysOverdue = now.diff(moment(t.scheduled_date), 'days');
    //                 return daysOverdue > 3 && daysOverdue <= 7;
    //             }).length,
    //             moreThan7Days: overdueTasks.filter(t => {
    //                 const daysOverdue = now.diff(moment(t.scheduled_date), 'days');
    //                 return daysOverdue > 7;
    //             }).length
    //         };

    //         const result = {
    //             totalTasks,
    //             completedTasks,
    //             pendingTasks,
    //             inProgressTasks,
    //             lapsedTasks,
    //             waitingApprovalTasks,
    //             rejectedTasks,
    //             overdueTasks: overdueTasks.length,
    //             overdueTaskBuckets,
    //             taskCompletionEfficiency,
    //             productivityScore: Math.round(productivityScore),
    //             overdueTaskSeverity,
    //             avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
    //             serviceTypeBreakdown,
    //             technicianPerformance,
    //             recentActivity
    //         };

    //         return result;
    //     } catch (error) {
    //         console.error('Tasks Overview Error:', error);
    //         throw error;
    //     }
    // }

    /**
     * GET /api/organization/dashboard/technician/performance
     * Technician Performance Metrics - Separated endpoint for improved performance
     * Returns only technician-specific data without task distribution metrics
     */
    async getTechnicianPerformance(filters, user) {
        try {
            console.log('DEBUG: getTechnicianPerformance called');
            console.log('DEBUG: filters:', filters);
            const plant_id = filters.plant_id || filters.plantId;
            const { building_id, categoryId, product_id, type, capacity, startDate, endDate, org_user_id: queryOrgUserId } = filters;
            const org_user_id = await getOrgUserIdForQuery(user, queryOrgUserId);
            console.log('DEBUG: org_user_id:', org_user_id);

            const todayStart = moment().startOf('day').toDate();

            // Build WHERE conditions for SQL
            const whereConditions = [];
            const replacements = { todayStart };

            if (plant_id) {
                whereConditions.push('ss.plant_id = :plant_id');
                replacements.plant_id = plant_id;
            }
            if (startDate && endDate) {
                whereConditions.push('ss.created_at BETWEEN :startDate AND :endDate');
                replacements.startDate = new Date(startDate);
                replacements.endDate = new Date(endDate);
            }

            // Asset filters
            const assetJoinConditions = [];
            if (org_user_id) {
                assetJoinConditions.push('a.org_user_id = :org_user_id');
                replacements.org_user_id = org_user_id;
            }
            if (building_id) {
                assetJoinConditions.push('a.building_id = :building_id');
                replacements.building_id = building_id;
            }
            if (categoryId) {
                assetJoinConditions.push('a.category_id = :categoryId');
                replacements.categoryId = categoryId;
            }
            if (product_id) {
                assetJoinConditions.push('a.product_id = :product_id');
                replacements.product_id = product_id;
            }
            if (type) {
                assetJoinConditions.push('a.type = :type');
                replacements.type = type;
            }

            const assetJoin = assetJoinConditions.length > 0
                ? `INNER JOIN assets a ON ss.asset_id = a.id AND a.deleted_at IS NULL AND ${assetJoinConditions.join(' AND ')}`
                : '';

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Optimized SQL query with aggregations
            const query = `
                SELECT 
                    st.technician_id,
                    u.name AS technician_name,
                    COUNT(DISTINCT st.service_id) AS total_tasks,
                    COUNT(DISTINCT CASE 
                        WHEN UPPER(ss.status) IN ('COMPLETED', 'APPROVED') 
                        AND (ss.submitted_by = st.technician_id OR (ss.submitted_by IS NULL AND ss.technician_id = st.technician_id))
                        THEN st.service_id 
                    END) AS completed_tasks,
                    COUNT(DISTINCT CASE 
                        WHEN UPPER(ss.status) IN ('COMPLETED', 'APPROVED')
                        AND (ss.submitted_by = st.technician_id OR (ss.submitted_by IS NULL AND ss.technician_id = st.technician_id))
                        AND ss.completed_at IS NOT NULL 
                        AND ss.scheduled_date IS NOT NULL
                        AND ss.completed_at <= ss.scheduled_date
                        THEN st.service_id 
                    END) AS on_time_tasks,
                    COUNT(DISTINCT CASE 
                        WHEN ss.scheduled_date < :todayStart
                        AND UPPER(ss.status) NOT IN ('COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED')
                        THEN st.service_id 
                    END) AS overdue_tasks
                FROM service_technicians st
                INNER JOIN service_submissions ss ON st.service_id = ss.id
                INNER JOIN technicians t ON st.technician_id = t.id
                INNER JOIN users u ON t.user_id = u.id
                ${assetJoin}
                ${whereClause}
                GROUP BY st.technician_id, u.name
                HAVING COUNT(DISTINCT st.service_id) > 0
                ORDER BY st.technician_id
            `;

            console.log('[getTechnicianPerformance] Executing optimized SQL query');
            const results = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT
            });

            console.log('[getTechnicianPerformance] Found', results.length, 'technicians from DB');

            // Calculate performance metrics from aggregated data
            const technicianPerformance = results.map(row => {
                const totalTasks = parseInt(row.total_tasks) || 0;
                const completedTasks = parseInt(row.completed_tasks) || 0;
                const onTimeTasks = parseInt(row.on_time_tasks) || 0;
                const overdueTasks = parseInt(row.overdue_tasks) || 0;

                const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                const onTimeRate = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;

                // Performance score: 60% completion rate + 40% on-time rate
                const performanceScore = Math.round((completionRate * 0.6) + (onTimeRate * 0.4));

                // Calculate pending tasks (total - completed)
                const pendingTasks = totalTasks - completedTasks;

                // Efficiency: same as on-time percentage
                const efficiency = Math.round(onTimeRate);

                // Rating: 0-5 scale based on performance score
                const rating = Math.min(5, Math.max(0, performanceScore / 20));

                return {
                    technicianId: row.technician_id,
                    name: row.technician_name || 'Unknown',
                    performanceScore,
                    completedTasks,
                    totalTasks,
                    pendingTasks,
                    overdueTasks,
                    onTimePercentage: Math.round(onTimeRate),
                    efficiency,
                    rating: Math.round(rating * 10) / 10 // Round to 1 decimal
                };
            }).sort((a, b) => b.performanceScore - a.performanceScore);

            const result = {
                technicianPerformance
            };

            console.log('[getTechnicianPerformance] Returning', technicianPerformance.length, 'technicians');
            if (technicianPerformance.length > 0) {
                console.log('[getTechnicianPerformance] Sample result:', technicianPerformance[0]);
            }

            return result;
        } catch (error) {
            console.error('Technician Performance Error:', error);
            throw error;
        }
    }

    /**
     * GET /api/organization/dashboard/tasks/distribution
     * Task Distribution and Statistics - Separated endpoint for improved performance
     * Returns task metrics, breakdowns, and recent activity without technician performance data
     */
    async getTaskDistribution(filters, user) {
        try {
            console.log('DEBUG: getTaskDistribution called (OPTIMIZED)');
            console.log('DEBUG: filters:', filters);
            const plant_id = filters.plant_id || filters.plantId;
            const { building_id, categoryId, product_id, type, capacity, startDate, endDate, org_user_id: queryOrgUserId } = filters;
            const org_user_id = await getOrgUserIdForQuery(user, queryOrgUserId);
            console.log('DEBUG: org_user_id:', org_user_id);

            const todayStart = moment().startOf('day').toDate();
            const THREE_DAYS_AGO = moment().subtract(3, 'days').startOf('day').toDate();
            const SEVEN_DAYS_AGO = moment().subtract(7, 'days').startOf('day').toDate();

            // Build WHERE conditions for SQL
            const whereConditions = [];
            const replacements = {
                todayStart,
                threeDaysAgo: THREE_DAYS_AGO,
                sevenDaysAgo: SEVEN_DAYS_AGO
            };

            if (plant_id) {
                whereConditions.push('ss.plant_id = :plant_id');
                replacements.plant_id = plant_id;
            }
            if (startDate && endDate) {
                whereConditions.push('ss.scheduled_date BETWEEN :startDate AND :endDate');
                replacements.startDate = new Date(startDate);
                replacements.endDate = new Date(endDate);
            }

            // Asset filters
            const assetJoinConditions = [];
            if (org_user_id) {
                assetJoinConditions.push('a.org_user_id = :org_user_id');
                replacements.org_user_id = org_user_id;
            }
            if (building_id) {
                assetJoinConditions.push('a.building_id = :building_id');
                replacements.building_id = building_id;
            }
            if (categoryId) {
                assetJoinConditions.push('a.category_id = :categoryId');
                replacements.categoryId = categoryId;
            }
            if (product_id) {
                assetJoinConditions.push('a.product_id = :product_id');
                replacements.product_id = product_id;
            }
            if (type) {
                assetJoinConditions.push('a.type = :type');
                replacements.type = type;
            }

            const assetJoin = assetJoinConditions.length > 0
                ? `INNER JOIN assets a ON ss.asset_id = a.id AND a.deleted_at IS NULL AND ${assetJoinConditions.join(' AND ')}`
                : '';

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // 1. Main Aggregation Query
            // Calculates all counts and averages in a single DB round-trip
            const query = `
                SELECT 
                    COUNT(DISTINCT ss.id) AS total_tasks,
                    
                    COUNT(DISTINCT CASE 
                        WHEN UPPER(ss.status) IN ('COMPLETED', 'APPROVED') THEN ss.id 
                    END) AS completed_tasks,
                    
                    COUNT(DISTINCT CASE 
                        WHEN UPPER(ss.status) = 'IN_PROGRESS' THEN ss.id 
                    END) AS in_progress_tasks,
                    
                    COUNT(DISTINCT CASE 
                        WHEN UPPER(ss.status) IN ('PENDING', 'SUBMITTED', 'DRAFT') 
                        AND (ss.scheduled_date IS NULL OR ss.scheduled_date >= :todayStart)
                        THEN ss.id 
                    END) AS pending_tasks,
                    
                    COUNT(DISTINCT CASE 
                        WHEN ss.scheduled_date < :todayStart 
                        AND UPPER(ss.status) NOT IN ('COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED')
                        THEN ss.id 
                    END) AS lapsed_tasks,
                    
                    COUNT(DISTINCT CASE 
                        WHEN UPPER(ss.status) = 'SUBMITTED' OR UPPER(ss.approval_status) = 'PENDING' THEN ss.id 
                    END) AS waiting_approval_tasks,
                    
                    COUNT(DISTINCT CASE 
                        WHEN UPPER(ss.status) = 'REJECTED' OR UPPER(ss.approval_status) = 'REJECTED' THEN ss.id 
                    END) AS rejected_tasks,
                    
                    COUNT(DISTINCT CASE 
                        WHEN LOWER(TRIM(COALESCE(ss.inspection_type, ''))) IN ('maintenance', '') THEN ss.id 
                    END) AS maintenance_tasks,
                    
                    COUNT(DISTINCT CASE 
                        WHEN LOWER(TRIM(ss.inspection_type)) = 'inspection' THEN ss.id 
                    END) AS inspection_tasks,
                    
                    COUNT(DISTINCT CASE 
                        WHEN LOWER(TRIM(ss.inspection_type)) = 'testing' THEN ss.id 
                    END) AS testing_tasks,
                    
                    COUNT(DISTINCT CASE 
                        WHEN ss.scheduled_date < :todayStart AND ss.scheduled_date >= :threeDaysAgo
                        AND UPPER(ss.status) NOT IN ('COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED')
                        THEN ss.id 
                    END) AS last_3_days_overdue,
                    
                    COUNT(DISTINCT CASE 
                        WHEN ss.scheduled_date < :threeDaysAgo AND ss.scheduled_date >= :sevenDaysAgo
                        AND UPPER(ss.status) NOT IN ('COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED')
                        THEN ss.id 
                    END) AS last_4_7_days_overdue,
                    
                    COUNT(DISTINCT CASE 
                        WHEN ss.scheduled_date < :sevenDaysAgo
                        AND UPPER(ss.status) NOT IN ('COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED')
                        THEN ss.id 
                    END) AS more_than_7_days_overdue,

                    AVG(CASE 
                        WHEN UPPER(ss.status) = 'COMPLETED' AND ss.completed_at IS NOT NULL AND ss.created_at IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (ss.completed_at - ss.created_at)) / 86400.0
                    END) AS avg_completion_days
                    
                FROM service_submissions ss
                ${assetJoin}
                ${whereClause}
            `;

            console.log('[getTaskDistribution] Executing optimized SQL query');
            const [aggResult] = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT
            });

            // Parse results (everything comes back as string from COUNT/AVG)
            const stats = {
                totalTasks: parseInt(aggResult.total_tasks || 0),
                completedTasks: parseInt(aggResult.completed_tasks || 0),
                inProgressTasks: parseInt(aggResult.in_progress_tasks || 0),
                pendingTasks: parseInt(aggResult.pending_tasks || 0),
                lapsedTasks: parseInt(aggResult.lapsed_tasks || 0),
                waitingApprovalTasks: parseInt(aggResult.waiting_approval_tasks || 0),
                rejectedTasks: parseInt(aggResult.rejected_tasks || 0),

                maintenanceTasks: parseInt(aggResult.maintenance_tasks || 0),
                inspectionTasks: parseInt(aggResult.inspection_tasks || 0),
                testingTasks: parseInt(aggResult.testing_tasks || 0),

                last3DaysOverdue: parseInt(aggResult.last_3_days_overdue || 0),
                last4to7DaysOverdue: parseInt(aggResult.last_4_7_days_overdue || 0),
                moreThan7DaysOverdue: parseInt(aggResult.more_than_7_days_overdue || 0),

                avgCompletionDays: parseFloat(aggResult.avg_completion_days || 0)
            };

            // 2. Recent Activity Query (Separate because it needs specific rows, not aggregates)
            // Reusing the include structure but optimizing attributes

            const assetWhere = {};
            if (org_user_id) assetWhere.org_user_id = org_user_id;
            if (building_id) assetWhere.building_id = building_id;
            if (categoryId) assetWhere.category_id = categoryId;
            if (product_id) assetWhere.product_id = product_id;
            if (type) assetWhere.type = type;

            const taskInclude = [{
                model: Technician,
                as: 'technician',
                attributes: ['id', 'user_id'],
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                }]
            }, {
                model: Asset,
                as: 'asset',
                attributes: ['id', 'asset_code', 'type', 'building_id'],
                required: assetJoinConditions.length > 0,
                ...(assetJoinConditions.length > 0 && { where: assetWhere })
            }];

            const taskFilter = {};
            if (plant_id) taskFilter.plant_id = plant_id;
            if (startDate && endDate) {
                taskFilter.scheduled_date = { [Op.between]: [new Date(startDate), new Date(endDate)] };
            }

            // const upcomingTasks = await ServiceSubmission.findAll({
            //     where: {
            //         ...taskFilter,
            //         scheduled_date: { [Op.gte]: todayStart }
            //     },
            //     include: taskInclude,
            //     attributes: ['id', 'status', 'scheduled_date', 'created_at', 'inspection_type'],
            //     order: [['scheduled_date', 'ASC']],
            //     limit: 10
            // });

            // const recentActivity = upcomingTasks.map(t => ({
            //     id: t.id,
            //     status: t.status,
            //     created_at: t.created_at,
            //     scheduled_date: t.scheduled_date,
            //     technician: t.technician?.user?.name || 'Unassigned',
            //     asset_code: t.asset?.asset_code || '',
            //     assetTag: t.asset?.tag || '',
            //     assetType: t.asset?.type || '',
            //     building: t.asset?.building_id || '',
            //     serviceType: t.inspection_type || 'Maintenance'
            // }));

            // Derived Metrics
            const taskCompletionEfficiency = (stats.completedTasks + stats.lapsedTasks) > 0
                ? Math.round((stats.completedTasks / (stats.completedTasks + stats.lapsedTasks)) * 100)
                : 0;

            const productivityScore = Math.max(0, Math.min(100,
                taskCompletionEfficiency - (stats.avgCompletionDays * 2)
            ));

            const overdueTaskSeverity = stats.lapsedTasks > 0
                ? Math.min(100, stats.lapsedTasks * 5)
                : 0;

            const result = {
                totalTasks: stats.totalTasks,
                completedTasks: stats.completedTasks,
                PENDINGTasks: stats.pendingTasks,
                inProgressTasks: stats.inProgressTasks,
                lapsedTasks: stats.lapsedTasks,
                waitingApprovalTasks: stats.waitingApprovalTasks,
                rejectedTasks: stats.rejectedTasks,
                overdueTasks: stats.lapsedTasks, // Same as lapsed
                overdueTaskBuckets: {
                    last3Days: stats.last3DaysOverdue,
                    last4to7Days: stats.last4to7DaysOverdue,
                    moreThan7Days: stats.moreThan7DaysOverdue
                },
                taskCompletionEfficiency,
                productivityScore: Math.round(productivityScore),
                overdueTaskSeverity,
                avgCompletionDays: Math.round(stats.avgCompletionDays * 10) / 10,
                serviceTypeBreakdown: {
                    maintenance: stats.maintenanceTasks,
                    inspection: stats.inspectionTasks,
                    testing: stats.testingTasks
                },
                // recentActivity
            };

            console.log('DEBUG: TaskDistribution optimized result:', JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            console.error('Task Distribution Error:', error);
            throw error;
        }
    }

    /**
     * GET /api/organization/dashboard/maintenance/summary
     * Maintenance Overview with Category-wise Efficiency and SLA Compliance
     * OPTIMIZED: Uses raw SQL aggregation instead of fetching all rows into JS
     */
    async getMaintenanceSummary(filters, user) {
        try {
            const plant_id = filters.plant_id || filters.plantId;
            const { categoryId, serviceType, product_id, type, capacity, startDate, endDate, org_user_id: queryOrgUserId } = filters;

            console.log('[getMaintenanceSummary] Called with plant_id:', plant_id, 'serviceType:', serviceType);
            const org_user_id = await getOrgUserIdForQuery(user, queryOrgUserId);

            const todayStart = moment().startOf('day').toDate();
            const thisMonthStart = moment().startOf('month').toDate();
            const lastMonthStart = moment().subtract(1, 'month').startOf('month').toDate();
            const lastMonthEnd = moment().subtract(1, 'month').endOf('month').toDate();

            // Build WHERE conditions for raw SQL
            const whereConditions = [];
            const replacements = { todayStart, thisMonthStart, lastMonthStart, lastMonthEnd };

            if (plant_id) {
                whereConditions.push('ss.plant_id = :plant_id');
                replacements.plant_id = plant_id;
            }
            if (startDate && endDate) {
                whereConditions.push('ss.scheduled_date BETWEEN :startDate AND :endDate');
                replacements.startDate = new Date(startDate);
                replacements.endDate = new Date(endDate);
            }

            // ServiceType filter on inspection_type
            if (serviceType) {
                const typeLower = serviceType.toLowerCase().trim();
                if (typeLower === 'maintenance') {
                    whereConditions.push(`(LOWER(TRIM(ss.inspection_type)) = 'maintenance' OR ss.inspection_type IS NULL OR TRIM(ss.inspection_type) = '')`);
                } else {
                    whereConditions.push(`LOWER(TRIM(ss.inspection_type)) = :serviceTypeLower`);
                    replacements.serviceTypeLower = typeLower;
                }
            }

            // Asset filters
            const assetJoinConditions = [];
            if (org_user_id) {
                assetJoinConditions.push('a.org_user_id = :org_user_id');
                replacements.org_user_id = org_user_id;
            }
            if (categoryId) {
                assetJoinConditions.push('a.category_id = :categoryId');
                replacements.categoryId = categoryId;
            }
            if (product_id) {
                assetJoinConditions.push('a.product_id = :product_id');
                replacements.product_id = product_id;
            }
            if (type) {
                assetJoinConditions.push('a.type = :type');
                replacements.type = type;
            }

            const assetJoin = assetJoinConditions.length > 0
                ? `INNER JOIN assets a ON ss.asset_id = a.id AND a.deleted_at IS NULL AND ${assetJoinConditions.join(' AND ')}`
                : '';

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // 1. Main aggregation query - all summary metrics in one DB round-trip
            const mainQuery = `
                SELECT
                    COUNT(DISTINCT ss.id) AS total_maintenance,

                    COUNT(DISTINCT CASE
                        WHEN UPPER(ss.status) IN ('COMPLETED', 'APPROVED') THEN ss.id
                    END) AS completed_maintenance,

                    COUNT(DISTINCT CASE
                        WHEN UPPER(ss.status) NOT IN ('COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED') THEN ss.id
                    END) AS scheduled_maintenance,

                    COUNT(DISTINCT CASE
                        WHEN UPPER(ss.status) = 'IN_PROGRESS' THEN ss.id
                    END) AS in_progress_maintenance,

                    COUNT(DISTINCT CASE
                        WHEN UPPER(ss.status) IN ('COMPLETED', 'APPROVED')
                        AND ss.scheduled_date IS NOT NULL AND ss.completed_at IS NOT NULL
                        AND ss.completed_at > ss.scheduled_date
                        THEN ss.id
                    END) AS delayed_services,

                    COUNT(DISTINCT CASE
                        WHEN UPPER(ss.status) IN ('COMPLETED', 'APPROVED')
                        AND ss.scheduled_date IS NOT NULL AND ss.completed_at IS NOT NULL
                        AND ss.completed_at < ss.scheduled_date
                        THEN ss.id
                    END) AS sla_compliant_services,

                    COUNT(DISTINCT CASE
                        WHEN ss.scheduled_date IS NOT NULL
                        AND ss.scheduled_date < :todayStart
                        AND UPPER(ss.status) NOT IN ('COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED')
                        THEN ss.id
                    END) AS overdue_tasks
                FROM service_submissions ss
                ${assetJoin}
                ${whereClause}
            `;

            // 2. Category breakdown query - aggregated in SQL with JOIN
            const categoryQuery = `
                SELECT
                    COALESCE(c.category_name, 'Other') AS category_name,
                    COUNT(DISTINCT ss.id) AS total,
                    COUNT(DISTINCT CASE
                        WHEN UPPER(ss.status) IN ('COMPLETED', 'APPROVED') THEN ss.id
                    END) AS completed,
                    COUNT(DISTINCT CASE
                        WHEN UPPER(ss.status) IN ('COMPLETED', 'APPROVED')
                        AND ss.scheduled_date IS NOT NULL AND ss.completed_at IS NOT NULL
                        AND ss.completed_at > ss.scheduled_date
                        THEN ss.id
                    END) AS delayed
                FROM service_submissions ss
                LEFT JOIN assets a2 ON ss.asset_id = a2.id AND a2.deleted_at IS NULL
                LEFT JOIN categories c ON a2.category_id = c.id
                ${assetJoinConditions.length > 0 ? `INNER JOIN assets a ON ss.asset_id = a.id AND a.deleted_at IS NULL AND ${assetJoinConditions.join(' AND ')}` : ''}
                ${whereClause}
                GROUP BY COALESCE(c.category_name, 'Other')
                ORDER BY COUNT(DISTINCT CASE WHEN UPPER(ss.status) IN ('COMPLETED', 'APPROVED') THEN ss.id END)::float
                    / NULLIF(COUNT(DISTINCT ss.id), 0) DESC NULLS LAST
            `;

            // 3. Overdue timeline query - weekly breakdown for this month and last month
            const timelineQuery = `
                SELECT
                    LEAST(FLOOR(EXTRACT(EPOCH FROM (ss.scheduled_date - :thisMonthStart::timestamp)) / 86400 / 7) + 1, 4) AS week_num,
                    'thisMonth' AS period,
                    COUNT(DISTINCT ss.id) AS cnt
                FROM service_submissions ss
                ${assetJoin}
                ${whereClause}
                ${whereConditions.length > 0 ? 'AND' : 'WHERE'}
                    ss.scheduled_date IS NOT NULL
                    AND ss.scheduled_date >= :thisMonthStart
                    AND ss.scheduled_date <= NOW()
                    AND ss.scheduled_date < :todayStart
                    AND UPPER(ss.status) NOT IN ('COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED')
                GROUP BY week_num

                UNION ALL

                SELECT
                    LEAST(FLOOR(EXTRACT(EPOCH FROM (ss.scheduled_date - :lastMonthStart::timestamp)) / 86400 / 7) + 1, 4) AS week_num,
                    'lastMonth' AS period,
                    COUNT(DISTINCT ss.id) AS cnt
                FROM service_submissions ss
                ${assetJoin}
                ${whereClause}
                ${whereConditions.length > 0 ? 'AND' : 'WHERE'}
                    ss.scheduled_date IS NOT NULL
                    AND ss.scheduled_date >= :lastMonthStart
                    AND ss.scheduled_date <= :lastMonthEnd
                    AND ss.scheduled_date < :todayStart
                    AND UPPER(ss.status) NOT IN ('COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED')
                GROUP BY week_num
            `;


            // Execute all three queries in parallel
            const [mainResults, categoryResults, timelineResults] = await Promise.all([
                sequelize.query(mainQuery, { replacements, type: QueryTypes.SELECT }),
                sequelize.query(categoryQuery, { replacements, type: QueryTypes.SELECT }),
                sequelize.query(timelineQuery, { replacements, type: QueryTypes.SELECT })
            ]);

            // Parse main aggregation
            const agg = mainResults[0] || {};
            const totalMaintenance = parseInt(agg.total_maintenance) || 0;
            const completedMaintenance = parseInt(agg.completed_maintenance) || 0;
            const scheduledMaintenance = parseInt(agg.scheduled_maintenance) || 0;
            const inProgressMaintenance = parseInt(agg.in_progress_maintenance) || 0;
            const delayedServices = parseInt(agg.delayed_services) || 0;
            const slaCompliantServices = parseInt(agg.sla_compliant_services) || 0;
            const overdueTasks = parseInt(agg.overdue_tasks) || 0;

            const maintenanceEfficiency = totalMaintenance > 0
                ? Math.round((completedMaintenance / totalMaintenance) * 100)
                : 0;

            const delayRate = completedMaintenance > 0
                ? Math.round((delayedServices / completedMaintenance) * 100)
                : 0;

            const slaCompliance = completedMaintenance > 0
                ? Math.round((slaCompliantServices / completedMaintenance) * 100)
                : 0;

            // Parse category breakdown
            const categoryBreakdown = categoryResults.map(row => {
                const total = parseInt(row.total) || 0;
                const completed = parseInt(row.completed) || 0;
                const delayed = parseInt(row.delayed) || 0;
                return {
                    category: row.category_name,
                    total,
                    completed,
                    efficiency: total > 0 ? Math.round((completed / total) * 100) : 0,
                    delayRate: completed > 0 ? Math.round((delayed / completed) * 100) : 0
                };
            });

            const byServiceType = {
                all: {
                    total: totalMaintenance,
                    completed: completedMaintenance
                }
            };

            // Parse overdue timeline into weekly format
            const weeklyData = {};
            for (let i = 1; i <= 4; i++) {
                weeklyData[i] = { thisMonth: 0, lastMonth: 0 };
            }
            timelineResults.forEach(row => {
                const weekNum = Math.max(1, Math.min(4, parseInt(row.week_num) || 1));
                const count = parseInt(row.cnt) || 0;
                if (row.period === 'thisMonth') {
                    weeklyData[weekNum].thisMonth += count;
                } else {
                    weeklyData[weekNum].lastMonth += count;
                }
            });

            const overdueTimeline = Object.entries(weeklyData).map(([weekNum, counts]) => ({
                date: `Week ${weekNum}`,
                thisMonth: counts.thisMonth,
                lastMonth: counts.lastMonth,
                count: counts.thisMonth
            }));

            const result = {
                totalMaintenance,
                completedMaintenance,
                scheduledMaintenance,
                inProgressMaintenance,
                maintenanceEfficiency,
                delayRate,
                slaCompliance,
                categoryBreakdown,
                serviceTypeBreakdown: byServiceType,
                overdueTimeline,
                overdueTasks
            };

            console.log('[getMaintenanceSummary] Result:', JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            console.error('Maintenance Summary Error:', error);
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/system-overview
     * Pump System Overview - Health Status, Notifications, Service Summary
     */
    async getPumpSystemOverview(data, user) {
        try {
            // Accept both plantId (from frontend) and plant_id
            const plant_id = data.plant_id || data.plantId;
            const { categoryId, interval } = data;

            console.log('[getPumpSystemOverview] Called with plant_id:', plant_id, 'categoryId:', categoryId, 'interval:', interval);

            if (!categoryId || !plant_id || !interval) {
                throw new Error(JSON.stringify({
                    message: "category, plant and interval fields are required",
                }));
            }

            const org_user_id = await getOrgUserIdForQuery(user, data.org_user_id);

            let startDate = new Date();
            const endDate = new Date();
            switch (interval) {
                case "Day":
                    startDate.setDate(startDate.getDate() - 1);
                    break;
                case "Week":
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case "Month":
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                default:
                    throw new Error(JSON.stringify({
                        message: "Invalid interval. Use Day, Week, or Month.",
                    }));
            }

            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            // 1. Health Status Counts
            const assetFilter = {
                plant_id,
                category_id: categoryId,
            };
            if (org_user_id) assetFilter.org_user_id = org_user_id;

            const assets = await Asset.findAll({
                where: assetFilter,
                attributes: ['health_status'],
            });

            const healthStatusCounts = assets.reduce((acc, asset) => {
                const status = asset.health_status || 'Unknown';
                const existing = acc.find(item => item.health_status === status);
                if (existing) {
                    existing.count++;
                } else {
                    acc.push({ health_status: status, count: 1 });
                }
                return acc;
            }, []);

            healthStatusCounts.sort((a, b) => b.count - a.count);

            // 2. Notification Counts (using ServiceSubmission as proxy since Notification model is placeholder)
            // Note: Adjust this if actual Notification model exists with proper schema
            const notificationCounts = [];

            // 3. Service Summary Count - using ServiceSubmission
            const serviceFilter = {
                plant_id,
                created_at: { [Op.between]: [startDate, endDate] },
            };

            // Join with Asset to filter by category
            const services = await ServiceSubmission.findAll({
                where: serviceFilter,
                include: [{
                    model: Asset,
                    as: 'asset',
                    where: { category_id: categoryId },
                    attributes: [],
                    required: true,
                }],
                attributes: ['status'],
            });

            const serviceSummaryCount = services.reduce((acc, service) => {
                const status = service.status || 'PENDING';
                const existing = acc.find(item => item.completedStatus === status);
                if (existing) {
                    existing.count++;
                } else {
                    acc.push({ completedStatus: status, count: 1 });
                }
                return acc;
            }, []);

            console.log('[getPumpSystemOverview] Result:', JSON.stringify({ healthStatusCounts, notificationCounts, serviceSummaryCount }, null, 2));

            return {
                healthStatusCounts,
                notificationCounts,
                serviceSummaryCount,
            };
        } catch (error) {
            console.error('[getPumpSystemOverview] Error:', error);
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/water-level-trend
     * Water Level Sensor (WLS) Trend Analysis
     */
    async getWaterLevelTrend(data, user) {
        try {
            // Accept both plantId (from frontend) and plant_id
            const plantId = data.plant_id || data.plantId;
            const { categoryId, timeframe, deviceId: requestedDeviceId } = data;

            console.log('[getWaterLevelTrend] Called with plantId:', plantId, 'categoryId:', categoryId, 'timeframe:', timeframe);

            if (!plantId || !categoryId || !timeframe) {
                throw new Error("plantId, categoryId and timeframe is required");
            }

            let startDate = new Date();
            const endDate = new Date();
            switch (timeframe) {
                case "Day":
                    startDate.setDate(startDate.getDate() - 1);
                    break;
                case "Week":
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case "Last 30 Days":
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                default:
                    throw new Error("Invalid timeframe. Use Day, Week, or Last 30 Days.");
            }

            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            // Use deviceId from request, or get first available device from IoTDeviceAssetMap
            let deviceId = requestedDeviceId;

            if (!deviceId) {
                // Get first device mapped to this plant/category
                const deviceMapping = await IoTDeviceAssetMap.findOne({
                    where: { category_key: 'pr' },
                    include: [{
                        model: Asset,
                        as: 'asset',
                        where: { plant_id: plantId },
                        required: true
                    }]
                });
                deviceId = deviceMapping?.device_id;
            }

            if (!deviceId) {
                console.log("[getWaterLevelTrend] No device found for plant:", plantId);
                return { WLSHistory: [], avgWLS: 0, maxWLS: 0, deviceId: null, startDate, endDate };
            }

            console.log("[getWaterLevelTrend] Using device:", deviceId);

            const pumpData = await IoTLiveDataPR.findOne({
                where: { device_id: deviceId },
                attributes: ['history'],
            });

            if (!pumpData?.history?.WLS) {
                return { WLSHistory: [], avgWLS: 0, maxWLS: 0, deviceId, startDate, endDate };
            }

            // Filter history entries by date range
            const WLSHistory = pumpData.history.WLS.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            });

            // Calculate average and max
            const values = WLSHistory.map(item => parseFloat(item.data) || 0);
            const avgWLS = values.length > 0
                ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
                : 0;
            const maxWLS = values.length > 0 ? Math.max(...values) : 0;

            return { WLSHistory, avgWLS, maxWLS, deviceId, startDate, endDate };
        } catch (error) {
            console.error('[getWaterLevelTrend] Error:', error);
            throw error;
        }
    }
    /**
     * POST /api/organization/dashboard/pump/diesel-level-trend
     * Diesel Level Sensor (DLS) Trend Analysis
     */
    async getDieselLevelTrend(data, user) {
        try {
            // Accept both plantId (from frontend) and plant_id
            const plantId = data.plant_id || data.plantId;
            const { categoryId, timeframe, deviceId: requestedDeviceId } = data;

            console.log('[getDieselLevelTrend] Called with plantId:', plantId, 'categoryId:', categoryId, 'timeframe:', timeframe);

            if (!plantId || !categoryId || !timeframe) {
                throw new Error("plantId, categoryId and timeframe is required");
            }

            let startDate = new Date();
            const endDate = new Date();
            switch (timeframe) {
                case "Day":
                    startDate.setDate(startDate.getDate() - 1);
                    break;
                case "Week":
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case "Last 30 Days":
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                default:
                    throw new Error("Invalid timeframe. Use Day, Week, or Last 30 Days.");
            }

            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            // Use deviceId from request, or get first available device from IoTDeviceAssetMap
            let deviceId = requestedDeviceId;

            if (!deviceId) {
                const deviceMapping = await IoTDeviceAssetMap.findOne({
                    where: { category_key: 'pr' },
                    include: [{
                        model: Asset,
                        as: 'asset',
                        where: { plant_id: plantId },
                        required: true
                    }]
                });
                deviceId = deviceMapping?.device_id;
            }

            if (!deviceId) {
                console.log("[getDieselLevelTrend] No device found for plant:", plantId);
                return { DLSHistory: [], avgDLS: 0, maxDLS: 0, deviceId: null, startDate, endDate };
            }

            console.log("[getDieselLevelTrend] Using device:", deviceId);

            const pumpData = await IoTLiveDataPR.findOne({
                where: { device_id: deviceId },
                attributes: ['history'],
            });

            if (!pumpData?.history?.DLS) {
                return { DLSHistory: [], avgDLS: 0, maxDLS: 0, deviceId, startDate, endDate };
            }

            // Filter history entries by date range
            const DLSHistory = pumpData.history.DLS.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            });

            // Calculate average and max
            const values = DLSHistory.map(item => parseFloat(item.data) || 0);
            const avgDLS = values.length > 0
                ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
                : 0;
            const maxDLS = values.length > 0 ? Math.max(...values) : 0;

            return { DLSHistory, avgDLS, maxDLS, deviceId, startDate, endDate };
        } catch (error) {
            console.error('[getDieselLevelTrend] Error:', error);
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/header-pressure-trend
     * Header Pressure Sensor (PLS) Trend Analysis
     */
    async getHeaderPressureTrend(data, user) {
        try {
            // Accept both plantId (from frontend) and plant_id
            const plantId = data.plant_id || data.plantId;
            const { categoryId, timeframe, deviceId: requestedDeviceId } = data;

            console.log('[getHeaderPressureTrend] Called with plantId:', plantId, 'categoryId:', categoryId, 'timeframe:', timeframe);

            if (!plantId || !categoryId || !timeframe) {
                throw new Error("plantId, categoryId and timeframe is required");
            }

            let startDate = new Date();
            const endDate = new Date();
            switch (timeframe) {
                case "Day":
                    startDate.setDate(startDate.getDate() - 1);
                    break;
                case "Week":
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case "Last 30 Days":
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                default:
                    throw new Error("Invalid timeframe. Use Day, Week, or Last 30 Days.");
            }

            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            // Get header pressure from FireSafetySystem
            const fireSafetyData = await FireSafetySystem.findOne({
                where: { plant_id: plantId },
                attributes: ['header_pressure_value']
            });

            const headerPressureBar = fireSafetyData?.header_pressure_value || null;
            console.log('[getHeaderPressureTrend] headerPressureBar:', headerPressureBar);

            // Use deviceId from request, or get first available device from IoTDeviceAssetMap
            let deviceId = requestedDeviceId;

            if (!deviceId) {
                const deviceMapping = await IoTDeviceAssetMap.findOne({
                    where: { category_key: 'pr' },
                    include: [{
                        model: Asset,
                        as: 'asset',
                        where: { plant_id: plantId },
                        required: true
                    }]
                });
                deviceId = deviceMapping?.device_id;
            }

            if (!deviceId) {
                console.log("[getHeaderPressureTrend] No device found for plant:", plantId);
                return {
                    PLSHistory: [],
                    avgPLS: 0,
                    maxPLS: 0,
                    deviceId: null,
                    headerPressureUnit: headerPressureBar,
                    startDate,
                    endDate
                };
            }

            console.log("[getHeaderPressureTrend] Using device:", deviceId);

            const pumpData = await IoTLiveDataPR.findOne({
                where: { device_id: deviceId },
                attributes: ['history'],
            });

            if (!pumpData?.history?.PLS) {
                return {
                    PLSHistory: [],
                    avgPLS: 0,
                    maxPLS: 0,
                    deviceId,
                    headerPressureUnit: headerPressureBar,
                    startDate,
                    endDate
                };
            }

            // Filter history entries by date range
            const PLSHistory = pumpData.history.PLS.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            });

            // Calculate average and max
            const values = PLSHistory.map(item => parseFloat(item.data) || 0);
            const avgPLS = values.length > 0
                ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
                : 0;
            const maxPLS = values.length > 0 ? Math.max(...values) : 0;

            return {
                PLSHistory,
                avgPLS,
                maxPLS,
                deviceId,
                headerPressureUnit: headerPressureBar,
                startDate,
                endDate,
            };
        } catch (error) {
            console.error('[getHeaderPressureTrend] Error:', error);
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/maintenance-overview
     * Pump Maintenance Overview with Service Statistics
     */
    async getPumpMaintenanceOverviewData(data, user) {
        try {
            // Accept both plantId (from frontend) and plant_id
            const plant_id = data.plant_id || data.plantId;
            const { categoryId } = data;

            console.log('[getPumpMaintenanceOverviewData] Called with plant_id:', plant_id, 'categoryId:', categoryId);

            if (!plant_id || !categoryId) {
                throw new Error(JSON.stringify({
                    message: "plant_id and categoryId are required",
                }));
            }

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
            );

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Build filter for services
            const serviceFilter = {
                plant_id,
                created_at: { [Op.between]: [startOfMonth, endOfMonth] },
            };

            // Get all services with asset and technician data
            const services = await ServiceSubmission.findAll({
                where: serviceFilter,
                include: [
                    {
                        model: Asset,
                        as: 'asset',
                        where: { category_id: categoryId },
                        attributes: ['asset_code'],
                        required: true,
                    },
                    {
                        model: Technician,
                        as: 'submittedByTechnician',
                        attributes: ['id'],
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name'],
                        }],
                        required: false,
                    },
                ],
                attributes: ['id', 'status', 'scheduled_date', 'inspection_type', 'technician_id', 'created_at'],
            });

            // 1. Service Type Counts
            const serviceTypeCounts = services.reduce((acc, service) => {
                const type = service.inspection_type || 'maintenance';
                const existing = acc.find(item => item.id === type);
                if (existing) {
                    existing.count++;
                } else {
                    acc.push({ id: type, count: 1 });
                }
                return acc;
            }, []);

            // 2. Status Counts
            const statusCounts = services.reduce((acc, service) => {
                const status = service.status || 'PENDING';
                const existing = acc.find(item => item.id === status);
                if (existing) {
                    existing.count++;
                } else {
                    acc.push({ id: status, count: 1 });
                }
                return acc;
            }, []);

            // 3. Pending by Range
            const pendingServices = services.filter(s => s.status === 'PENDING');
            const pendingByRange = pendingServices.reduce((acc, service) => {
                if (!service.scheduled_date) return acc;

                const daysFromToday = Math.ceil(
                    (new Date(service.scheduled_date) - today) / (1000 * 60 * 60 * 24)
                );

                let dayRange;
                if (daysFromToday <= 3) {
                    dayRange = "Next 3 Days";
                } else if (daysFromToday > 3 && daysFromToday <= 7) {
                    dayRange = "Next 4–7 Days";
                } else if (daysFromToday > 7) {
                    dayRange = "More Than 7 Days";
                } else {
                    dayRange = "Invalid";
                }

                const existing = acc.find(item => item._id === dayRange);
                if (existing) {
                    existing.count++;
                } else {
                    acc.push({ _id: dayRange, count: 1 });
                }
                return acc;
            }, []);

            // 4. Technician Status Counts
            const completedServices = services.filter(s =>
                ['COMPLETED', 'REJECTED', 'SUBMITTED'].includes(s.status) && s.technician_id
            );

            const technicianStats = {};
            completedServices.forEach(service => {
                const techId = service.technician_id;
                const techName = service.submittedByTechnician?.user?.name || 'Unknown';
                const status = service.status;

                if (!technicianStats[techId]) {
                    technicianStats[techId] = {
                        technicianId: techId,
                        name: techName,
                        statuses: [],
                    };
                }

                const existingStatus = technicianStats[techId].statuses.find(s => s.status === status);
                if (existingStatus) {
                    existingStatus.count++;
                } else {
                    technicianStats[techId].statuses.push({ status, count: 1 });
                }
            });

            const technicianStatusCounts = Object.values(technicianStats);

            // 5. Recent Activities
            const recentServices = services
                .filter(s => s.status !== 'PENDING')
                .sort((a, b) => new Date(b.scheduled_date || b.created_at) - new Date(a.scheduled_date || a.created_at))
                .slice(0, 5);

            const recentActivities = recentServices.map(service => ({
                completedStatus: service.status,
                date: service.scheduled_date || service.created_at,
                serviceFrequency: null, // Not available in ServiceSubmission
                serviceType: service.inspection_type || 'maintenance',
                serviceDoneBy: service.submittedByTechnician?.user?.name || null,
                assets: [service.asset?.asset_code],
            }));

            return {
                serviceTypeCounts,
                statusCounts,
                pendingByRange,
                technicianStatusCounts,
                recentActivities,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/know-more
     * Detailed Asset Analysis with IoT Data
     */
    async getPumpKnowMoreData(data, user) {
        try {
            const { asset_code } = data;

            if (!asset_code) {
                throw new Error(JSON.stringify({
                    message: "asset_code is required",
                }));
            }

            const assetData = await Asset.findOne({
                where: { asset_code },
                attributes: ['id', 'asset_code', 'install_date', 'plant_id'],  // Added 'id'
            });

            if (!assetData) {
                throw new Error(JSON.stringify({ message: "Asset not found" }));
            }

            const asset_id = assetData.id;  // Extract asset ID for ServiceSubmission queries

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const startOfNextMonth = new Date(startOfMonth);
            startOfNextMonth.setMonth(startOfMonth.getMonth() + 1);

            // Get service data
            const serviceFilter = {
                asset_id,  // ServiceSubmission uses asset_id, not asset_code
                created_at: { [Op.between]: [startOfMonth, startOfNextMonth] },
            };

            const [lastServiceActivity, lastFiveServiceActivity, serviceTypeCountData, completedStatusCountData, pendingByRangeData] = await Promise.all([
                // Last completed service
                ServiceSubmission.findOne({
                    where: { asset_id, status: 'COMPLETED' },  // ServiceSubmission uses asset_id
                    include: [
                        {
                            model: Technician,
                            as: 'submitter',  // Changed from 'submittedByTechnician' to match model
                            attributes: ['id'],
                            include: [{ model: User, as: 'user', attributes: ['name'] }],
                        },
                    ],
                    attributes: ['scheduled_date', 'technician_id'],
                    order: [['scheduled_date', 'DESC']],
                }),

                // Last 5 service activities
                ServiceSubmission.findAll({
                    where: {
                        asset_id,  // ServiceSubmission uses asset_id
                        status: { [Op.ne]: 'PENDING' },
                    },
                    include: [
                        {
                            model: Asset,
                            as: 'asset',
                            attributes: ['id', 'asset_code'],  // Asset table has 'id' and 'asset_code', not 'asset_id'
                        },
                        {
                            model: Technician,
                            as: 'submitter',  // Changed from 'submittedByTechnician' to match model
                            attributes: ['id'],
                            include: [{ model: User, as: 'user', attributes: ['name'] }],
                        },
                    ],
                    attributes: ['scheduled_date', 'status', 'updated_at'],
                    order: [['updated_at', 'DESC']],
                    limit: 5,
                }),

                // Service type counts this month
                ServiceSubmission.findAll({
                    where: serviceFilter,
                    attributes: [
                        'inspection_type',
                        [fn('COUNT', col('id')), 'count'],
                    ],
                    group: ['inspection_type'],
                    raw: true,
                }),

                // Completed status counts this month
                ServiceSubmission.findAll({
                    where: serviceFilter,
                    attributes: [
                        'status',
                        [fn('COUNT', col('id')), 'count'],
                    ],
                    group: ['status'],
                    raw: true,
                }),

                // Pending by range
                ServiceSubmission.findAll({
                    where: {
                        asset_id,  // ServiceSubmission uses asset_id
                        status: 'PENDING',
                        created_at: { [Op.between]: [startOfMonth, startOfNextMonth] },
                    },
                    attributes: ['scheduled_date'],
                    raw: true,
                }),
            ]);

            // Process pending by range
            const today = new Date();
            const pendingByRange = pendingByRangeData.reduce((acc, item) => {
                if (!item.scheduled_date) return acc;

                const daysFromToday = Math.ceil(
                    (new Date(item.scheduled_date) - today) / (1000 * 60 * 60 * 24)
                );

                let dayRange;
                if (daysFromToday <= 3) {
                    dayRange = "Next 3 Days";
                } else if (daysFromToday > 3 && daysFromToday <= 7) {
                    dayRange = "Next 4–7 Days";
                } else if (daysFromToday > 7) {
                    dayRange = "More Than 7 Days";
                } else {
                    return acc;
                }

                const existing = acc.find(r => r.id === dayRange);
                if (existing) {
                    existing.count++;
                } else {
                    acc.push({ id: dayRange, count: 1 });
                }
                return acc;
            }, []);

            // Calculate asset age
            const installDate = new Date(assetData.install_date);
            const todayDate = new Date();

            const diffTime = Math.abs(todayDate - installDate);
            const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const years = Math.floor(totalDays / 365);
            const months = Math.floor((totalDays % 365) / 30);
            const ageString = `${years} Year${years !== 1 ? "s" : ""} ${months} Month${months !== 1 ? "s" : ""} (${totalDays} Days)`;

            // Calculate total ON hours from IoT data
            let hours = 0;
            let minutes = 0;

            // Fetch IoT device mapping for this specific asset
            const deviceMapping = await IoTDeviceAssetMap.findOne({
                where: { asset_code: assetData.asset_code }
            });

            console.log("[getPumpKnowMoreData] Asset Code:", assetData.asset_code);
            console.log("[getPumpKnowMoreData] Device Mapping:", deviceMapping ? `${deviceMapping.device_id} → ${deviceMapping.data_key}` : "Not Found");

            if (deviceMapping) {
                const { device_id, data_key } = deviceMapping;
                const iotKey = data_key.replace('AS', 'PS');  // AS1 → PS1, AS2 → PS2, AS3 → PS3

                console.log("[getPumpKnowMoreData] Using device:", device_id, "with key:", iotKey);

                const pumpData = await IoTLiveDataPR.findOne({
                    where: { device_id },
                    attributes: ['history', 'device_data', 'updated_at'],
                });

                const history = pumpData?.history?.[iotKey] || [];
                const currentDeviceStatus = Number(pumpData?.device_data?.[iotKey]);
                const deviceLastUpdated = pumpData?.updated_at ? new Date(pumpData.updated_at) : null;

                // Filter history to only include data AFTER the pump's installation date
                const installDate = new Date(assetData.install_date);
                const filteredHistory = history.filter(entry => new Date(entry.date) >= installDate);

                console.log(`[getPumpKnowMoreData] Total history entries: ${history.length}, After install date filter: ${filteredHistory.length}`);

                // Sort by date
                filteredHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

                let totalOnTimeMs = 0;
                let onStartTime = null;

                for (let i = 0; i < filteredHistory.length; i++) {
                    const val = Number(filteredHistory[i].data);
                    const date = filteredHistory[i].date;

                    if (val === 0 && !onStartTime) {
                        // PS=0 means pump is ON
                        onStartTime = new Date(date);
                    }

                    if (val === 1 && onStartTime) {
                        // PS=1 means pump turned OFF - normal cycle
                        const endTime = new Date(date);
                        totalOnTimeMs += endTime - onStartTime;
                        onStartTime = null;
                    }
                }

                // If last history entry was ON, check current device_data to determine actual state
                if (onStartTime) {
                    if (currentDeviceStatus === 1) {
                        // Device is currently OFF — history missed the OFF transition
                        // Use the device's last update time as the OFF point
                        const offTime = deviceLastUpdated || new Date();
                        totalOnTimeMs += offTime - onStartTime;
                        console.log(`[Lifetime Runtime] History shows ON since ${onStartTime.toISOString()}, but device_data is OFF. Capping at updated_at: ${offTime.toISOString()} (${((offTime - onStartTime) / (1000 * 60 * 60)).toFixed(2)}h)`);
                    } else {
                        // Device is genuinely still ON — include ongoing runtime
                        const now = new Date();
                        totalOnTimeMs += now - onStartTime;
                        console.log(`[Lifetime Runtime] Pump still ON since ${onStartTime.toISOString()}, adding ongoing runtime: ${((now - onStartTime) / (1000 * 60 * 60)).toFixed(2)}h`);
                    }
                }

                const totalOnHours = Math.round((totalOnTimeMs / (1000 * 60 * 60)) * 100) / 100;
                hours = Math.floor(totalOnHours);
                minutes = Math.round((totalOnHours - hours) * 60);
            }

            // Format service type and status counts
            const serviceTypeCount = serviceTypeCountData.map(item => ({
                id: item.inspection_type || 'maintenance',
                count: parseInt(item.count),
            }));

            const completedStatusCount = completedStatusCountData.map(item => ({
                id: item.status,
                count: parseInt(item.count),
            }));

            // Format last service activity
            const formattedLastService = lastServiceActivity ? {
                date: lastServiceActivity.scheduled_date,
                serviceDoneBy: lastServiceActivity.submitter?.user || null,
                // submittedFormId: {
                //   technicianRemark: lastServiceActivity.technicianRemark,
                // },
            } : null;

            // Format last five activities
            const formattedLastFive = lastFiveServiceActivity.map(service => ({
                assetsId: service.asset?.asset_code ? [{ asset_code: service.asset.asset_code }] : [],
                serviceDoneBy: service.submitter?.user || null,
                date: service.scheduled_date,
                completedStatus: service.status,
            }));

            return {
                totalOnHours: `${hours} hours ${minutes} minutes`,
                ageString,
                lastServiceActivity: formattedLastService,
                lastFiveServiceActivity: formattedLastFive,
                serviceTypeCount,
                completedStatusCount,
                pendingByRange,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/mode-status-trend
     * Asset Mode Status Trend (AS1, AS2, AS3)
     */
    async getPumpModeStatusTrend(data, user) {
        try {
            const { selectedAsset, modeTime } = data;

            if (!selectedAsset || !modeTime) {
                throw new Error(JSON.stringify({
                    message: "selectedAsset and modeTime are required",
                }));
            }

            const assetData = await Asset.findByPk(selectedAsset, {
                attributes: ['plant_id', 'asset_code'],
            });

            if (!assetData) {
                return [];
            }

            // Get device mapping for this asset
            const deviceMapping = await IoTDeviceAssetMap.findOne({
                where: { asset_code: assetData.asset_code }
            });

            if (!deviceMapping) {
                console.log('[getPumpModeStatusTrend] No device mapping for:', assetData.asset_code);
                return [];
            }

            const deviceId = deviceMapping.device_id;
            const dataKey = deviceMapping.data_key; // e.g., "AS1", "AS2", "AS3"

            console.log('[getPumpModeStatusTrend] Device:', deviceId, 'Data Key:', dataKey);

            // Determine date range
            const now = new Date();
            let startDate;

            switch (modeTime) {
                case "Day":
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 1);
                    break;
                case "Week":
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 7);
                    break;
                case "Month":
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                default:
                    throw new Error(JSON.stringify({ message: "Invalid modeTime value" }));
            }

            const pumpData = await IoTLiveDataPR.findOne({
                where: { device_id: deviceId },
                attributes: ['history'],
            });

            if (!pumpData?.history?.[dataKey]) {
                console.log('[getPumpModeStatusTrend] No history for key:', dataKey);
                return [];
            }

            // Filter trend data by date
            const trend = pumpData.history[dataKey].filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= startDate;
            });

            return trend;
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/condition-log
     * Get pump condition log data (power status and trip status)
     */
    /**
     * POST /api/organization/dashboard/pump/condition-log
     * Get pump condition log data (power status and trip status)
     */
    async getPumpConditionLogData(data, user) {
        try {
            const { selectedAsset, startDate, endDate } = data;

            if (!selectedAsset || !startDate || !endDate) {
                throw new Error(JSON.stringify({
                    message: "selectedAsset, startDate, and endDate are required"
                }));
            }

            // Get asset data with product info
            const assetData = await Asset.findByPk(selectedAsset, {
                attributes: ['asset_code'],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['product_name']
                }]
            });

            if (!assetData) {
                return { data: [], pumpType: "" };
            }

            // Get IoT device mapping
            const deviceMapping = await IoTDeviceAssetMap.findOne({
                where: { asset_code: assetData.asset_code }
            });

            if (!deviceMapping) {
                console.log(`[getPumpConditionLogData] No device mapping for: ${assetData.asset_code}`);
                return { data: [], pumpType: "" };
            }

            const { device_id, data_key } = deviceMapping;

            // Find IoT device
            const iotDevice = await IoTLiveDataPR.findOne({
                where: { device_id },
                attributes: ['history']
            });

            if (!iotDevice || !iotDevice.history) {
                return { data: [], pumpType: "" };
            }

            const history = iotDevice.history;
            const psKey = data_key.replace('AS', 'PS');  // AS1 → PS1
            const tsKey = data_key.replace('AS', 'TS');  // AS1 → TS1
            const psData = history[psKey] || [];
            const tsData = history[tsKey] || [];

            // Combine and filter data within range (plus one before start to establish value at start)
            const startDateTime = new Date(startDate).getTime();
            const endDateTime = new Date(endDate).getTime();

            // Sort all data first
            const sortedPs = [...psData].sort((a, b) => new Date(a.date || a.timestamp).getTime() - new Date(b.date || b.timestamp).getTime());
            const sortedTs = [...tsData].sort((a, b) => new Date(a.date || a.timestamp).getTime() - new Date(b.date || b.timestamp).getTime());

            // Get initial states before start date
            // PS=0 means ON, PS=1 means OFF. Default to 1 (OFF) when no data exists
            let currentPs = 1; // Default OFF (PS=1)
            let currentTs = 0; // Default NOT TRIPPED

            // Find last known state before startDate
            for (let i = 0; i < sortedPs.length; i++) {
                if (new Date(sortedPs[i].date || sortedPs[i].timestamp).getTime() <= startDateTime) {
                    currentPs = Number(sortedPs[i].data);
                } else {
                    break;
                }
            }
            for (let i = 0; i < sortedTs.length; i++) {
                if (new Date(sortedTs[i].date || sortedTs[i].timestamp).getTime() <= startDateTime) {
                    currentTs = Number(sortedTs[i].data);
                } else {
                    break;
                }
            }

            // Collect all relevant data points within the range
            const timePoints = new Set();
            timePoints.add(startDateTime);
            // We also want to end exactly at endDate, so add it
            timePoints.add(endDateTime);

            const relevantPs = sortedPs.filter(d => {
                const t = new Date(d.date || d.timestamp).getTime();
                return t > startDateTime && t <= endDateTime;
            });
            const relevantTs = sortedTs.filter(d => {
                const t = new Date(d.date || d.timestamp).getTime();
                return t > startDateTime && t <= endDateTime;
            });

            relevantPs.forEach(d => timePoints.add(new Date(d.date || d.timestamp).getTime()));
            relevantTs.forEach(d => timePoints.add(new Date(d.date || d.timestamp).getTime()));

            const sortedTimePoints = Array.from(timePoints).sort((a, b) => a - b);

            const resultData = [];

            // Re-evaluate state for each time point to build the timeline
            // Optimization: use indices to avoid rescanning
            let psIdx = 0;
            let tsIdx = 0;

            // Advance indices to the first point > startDateTime in the sorted original arrays
            while (psIdx < sortedPs.length && new Date(sortedPs[psIdx].date || sortedPs[psIdx].timestamp).getTime() <= startDateTime) psIdx++;
            while (tsIdx < sortedTs.length && new Date(sortedTs[tsIdx].date || sortedTs[tsIdx].timestamp).getTime() <= startDateTime) tsIdx++;

            // We need to keep track of the "last applied" state to ensure step property
            let activePs = currentPs;
            let activeTs = currentTs;

            // Add the initial point at startDate
            resultData.push({
                timestamp: new Date(startDate).toISOString(),
                status: activePs,  // Changed from powerStatus - contains PS (ON/OFF) data
                tripStatus: activeTs
            });

            for (const time of sortedTimePoints) {
                if (time === startDateTime) continue; // Already added

                // Check if any change occurred at this exact timestamp
                let psChanged = false;
                let tsChanged = false;

                // Process all PS events at this timestamp (in case duplicates, take latest)
                while (psIdx < sortedPs.length) {
                    const t = new Date(sortedPs[psIdx].date || sortedPs[psIdx].timestamp).getTime();
                    if (t === time) {
                        activePs = Number(sortedPs[psIdx].data);
                        psChanged = true;
                        psIdx++;
                    } else if (t < time) {
                        // specific edge case: data point skipped? shouldn't happen with sortedTimePoints logic
                        // but if it does, update state
                        activePs = Number(sortedPs[psIdx].data);
                        psIdx++;
                    } else {
                        break; // t > time
                    }
                }

                while (tsIdx < sortedTs.length) {
                    const t = new Date(sortedTs[tsIdx].date || sortedTs[tsIdx].timestamp).getTime();
                    if (t === time) {
                        activeTs = Number(sortedTs[tsIdx].data);
                        tsChanged = true;
                        tsIdx++;
                    } else if (t < time) {
                        activeTs = Number(sortedTs[tsIdx].data);
                        tsIdx++;
                    } else {
                        break; // t > time
                    }
                }

                resultData.push({
                    timestamp: new Date(time).toISOString(),
                    status: activePs,  // Contains PS (ON/OFF) data - 0=ON, 1=OFF
                    tripStatus: activeTs
                });
            }

            // Determine pump type from product name
            const productName = assetData?.product?.product_name?.toUpperCase() || "";
            const pumpType = productName.includes("JOCKEY") ? "JOCKEY PUMP" :
                productName.includes("ELECTRIC") ? "ELECTRIC DRIVEN" :
                    productName.includes("DIESEL") ? "DIESEL DRIVEN" : "UNKNOWN";

            return {
                data: resultData,
                pumpType: pumpType
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/runtime-data
     * Get pump runtime data
     */
    async getPumpRuntimeData(data, user) {
        try {
            const { selectedAsset, timeframe } = data;

            if (!selectedAsset || !timeframe) {
                throw new Error(JSON.stringify({
                    message: "selectedAsset and timeframe are required"
                }));
            }

            // Get asset data with product info
            const assetData = await Asset.findByPk(selectedAsset, {
                attributes: ['asset_code'],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['product_name']
                }]
            });

            if (!assetData) {
                return {
                    data: [],
                    average: "0 Hrs",
                    pumpType: ""
                };
            }

            // Get IoT device mapping for this asset
            const deviceMapping = await IoTDeviceAssetMap.findOne({
                where: { asset_code: assetData.asset_code }
            });

            if (!deviceMapping) {
                console.log(`[getPumpRuntimeData] No device mapping for asset: ${assetData.asset_code}`);
                return {
                    data: [],
                    average: "0 Hrs",
                    pumpType: ""
                };
            }

            const { device_id, data_key } = deviceMapping;
            const iotKey = data_key.replace('AS', 'PS');  // AS1 → PS1

            // Find the IoT device using device_id from mapping
            const iotDevice = await IoTLiveDataPR.findOne({
                where: { device_id },
                attributes: ['history', 'device_data', 'updated_at']
            });

            if (!iotDevice || !iotDevice.history) {
                return {
                    data: [],
                    average: "0 Hrs",
                    pumpType: ""
                };
            }

            const history = iotDevice.history;
            const psData = history[iotKey] || [];
            const currentDeviceStatus = Number(iotDevice.device_data?.[iotKey]);
            const deviceLastUpdated = iotDevice.updated_at ? new Date(iotDevice.updated_at) : null;

            if (psData.length === 0) {
                return {
                    data: [],
                    average: "0 Hrs",
                    pumpType: ""
                };
            }

            // Sort PS data by date in ascending order
            const sortedPsData = [...psData].sort((a, b) => {
                const dateA = new Date(a.date || a.timestamp);
                const dateB = new Date(b.date || b.timestamp);
                return dateA - dateB;
            });

            // Calculate runtime for a specific period
            const calculateRuntimeForPeriod = (periodStart, periodEnd, periodLabel = '') => {
                const periodData = sortedPsData.filter(entry => {
                    const entryDate = new Date(entry.date || entry.timestamp);
                    return entryDate >= periodStart && entryDate <= periodEnd;
                });

                console.log(`\n=== RUNTIME CALC [${periodLabel}] ===`);
                console.log(`Period: ${periodStart.toISOString()} -> ${periodEnd.toISOString()}`);
                console.log(`Data points in period: ${periodData.length}`);

                // Determine carry-over state: was the pump ON when this period started?
                // Find the last data point BEFORE periodStart
                let carryOverState = null;
                for (let i = sortedPsData.length - 1; i >= 0; i--) {
                    const entryDate = new Date(sortedPsData[i].date || sortedPsData[i].timestamp);
                    if (entryDate < periodStart) {
                        carryOverState = Number(sortedPsData[i].data);
                        console.log(`  Carry-over state from ${entryDate.toISOString()}: PS=${carryOverState} (${carryOverState === 0 ? 'ON' : 'OFF'})`);
                        break;
                    }
                }

                let totalRuntime = 0;
                let onStartTime = null;
                let onOffCycles = [];

                // If pump was already ON (PS=0) before this period started, count from periodStart
                if (carryOverState === 0) {
                    onStartTime = periodStart;
                    console.log(`  [carry-over] Pump was already ON at period start ${periodStart.toISOString()}`);
                }

                // If no data points in this period but pump was ON, count entire period
                // (or up to deviceLastUpdated / now)
                if (periodData.length === 0) {
                    if (onStartTime) {
                        // Pump was ON entering this period with no changes during it
                        let endTime;
                        if (currentDeviceStatus === 1 && deviceLastUpdated && deviceLastUpdated >= periodStart && deviceLastUpdated <= periodEnd) {
                            endTime = deviceLastUpdated;
                        } else if (currentDeviceStatus === 1 && deviceLastUpdated && deviceLastUpdated < periodStart) {
                            // Device went OFF before this period — no runtime
                            console.log(`  No data, device went OFF before period`);
                            return 0;
                        } else {
                            endTime = periodEnd < new Date() ? periodEnd : new Date();
                        }
                        const runtimeHours = (endTime - onStartTime) / (1000 * 60 * 60);
                        totalRuntime += Math.max(0, runtimeHours);
                        console.log(`  No data in period but pump was ON. Runtime: ${runtimeHours.toFixed(2)}h (end: ${endTime.toISOString()})`);
                    } else {
                        console.log(`  No data for period [${periodLabel}]`);
                    }
                    return Math.max(0, totalRuntime);
                }

                for (let i = 0; i < periodData.length; i++) {
                    const { date, timestamp } = periodData[i];
                    const val = Number(periodData[i].data);
                    const entryTime = new Date(date || timestamp);

                    if (val === 0 && !onStartTime) {
                        // PS=0 means pump is ON
                        onStartTime = entryTime;
                        console.log(`  [${i}] Pump ON (PS=0) at ${entryTime.toISOString()}`);
                    }

                    if (val === 1 && onStartTime) {
                        // PS=1 means pump turned OFF
                        const endTime = entryTime;
                        const runtimeHours = (endTime - onStartTime) / (1000 * 60 * 60);
                        totalRuntime += runtimeHours;

                        onOffCycles.push({
                            start: onStartTime.toISOString(),
                            end: endTime.toISOString(),
                            hours: runtimeHours.toFixed(2),
                            isEndOfPeriod: false
                        });

                        console.log(`  [${i}] Pump OFF (PS=1) at ${endTime.toISOString()} | Runtime: ${runtimeHours.toFixed(2)}h`);
                        onStartTime = null;
                    }
                }

                // Handle case where pump is still ON at end of period data
                if (onStartTime) {
                    let endTime;
                    if (currentDeviceStatus === 1 && deviceLastUpdated) {
                        // Device is currently OFF — cap at device update time or period end
                        endTime = deviceLastUpdated < periodEnd ? deviceLastUpdated : periodEnd;
                    } else {
                        // Device is still ON — cap at period end or now (whichever is earlier)
                        endTime = periodEnd < new Date() ? periodEnd : new Date();
                    }
                    const runtimeHours = (endTime - onStartTime) / (1000 * 60 * 60);
                    totalRuntime += Math.max(0, runtimeHours);

                    onOffCycles.push({
                        start: onStartTime.toISOString(),
                        end: endTime.toISOString(),
                        hours: runtimeHours.toFixed(2),
                        isEndOfPeriod: true
                    });

                    console.log(`  [end] Pump still ON, capped at ${endTime.toISOString()} | Runtime: ${runtimeHours.toFixed(2)}h`);
                    onStartTime = null;
                }

                console.log(`Total ON/OFF cycles: ${onOffCycles.length}`);
                console.log(`Total runtime: ${totalRuntime.toFixed(2)}h`);

                // Validation: Runtime should never exceed period length
                const periodLengthHours = (periodEnd - periodStart) / (1000 * 60 * 60);
                if (totalRuntime > periodLengthHours) {
                    console.warn(`⚠️ WARNING: Runtime ${totalRuntime.toFixed(2)}h exceeds period length ${periodLengthHours.toFixed(2)}h!`);
                    console.warn(`This indicates a calculation bug or data corruption`);
                }

                return Math.max(0, totalRuntime);
            };

            const groupedData = [];
            let totalRuntime = 0;
            const now = new Date();

            if (timeframe === "Day") {
                // Group by 4-hour intervals
                for (let hour = 0; hour < 24; hour += 4) {
                    const intervalStart = new Date(now);
                    intervalStart.setHours(hour, 0, 0, 0);
                    const intervalEnd = new Date(intervalStart);
                    intervalEnd.setHours(hour + 3, 59, 59, 999);

                    const label = `${hour.toString().padStart(2, '0')}:00-${(hour + 3).toString().padStart(2, '0')}:59`;
                    const runtime = calculateRuntimeForPeriod(intervalStart, intervalEnd, `DAY ${label}`);
                    totalRuntime += runtime;

                    groupedData.push({
                        label: `${hour.toString().padStart(2, '0')}:00-${(hour + 3).toString().padStart(2, '0')}:59`,
                        runtime: Math.round(runtime * 10) / 10
                    });
                }
            } else if (timeframe === "Week") {
                // Group by days of the week
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - 6); // Last 7 days
                weekStart.setHours(0, 0, 0, 0);

                for (let i = 0; i < 7; i++) {
                    const dayStart = new Date(weekStart);
                    dayStart.setDate(weekStart.getDate() + i);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(dayStart);
                    dayEnd.setHours(23, 59, 59, 999);

                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayLabel = dayNames[dayStart.getDay()];
                    const runtime = calculateRuntimeForPeriod(dayStart, dayEnd, `WEEK Day ${i + 1} (${dayLabel})`);
                    totalRuntime += runtime;

                    groupedData.push({
                        label: dayLabel,
                        runtime: Math.round(runtime * 10) / 10
                    });
                }
            } else if (timeframe === "Month") {
                // Group by weeks - exactly as shown in the screenshot
                const monthStart = new Date(now);
                monthStart.setDate(now.getDate() - 27); // Last 28 days (4 weeks)
                monthStart.setHours(0, 0, 0, 0);

                for (let week = 1; week <= 4; week++) {
                    const weekStart = new Date(monthStart);
                    weekStart.setDate(monthStart.getDate() + (week - 1) * 7);
                    weekStart.setHours(0, 0, 0, 0);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    weekEnd.setHours(23, 59, 59, 999);

                    const runtime = calculateRuntimeForPeriod(weekStart, weekEnd);
                    totalRuntime += runtime;

                    groupedData.push({
                        label: `Week ${week}`,
                        runtime: Math.round(runtime * 10) / 10
                    });
                }
            }

            // Summary logging
            console.log(`\n========== RUNTIME SUMMARY ==========`);
            console.log(`Timeframe: ${timeframe}`);
            console.log(`Total periods: ${groupedData.length}`);
            console.log(`Total runtime: ${totalRuntime.toFixed(2)} hours`);
            console.log(`Average per period: ${groupedData.length > 0 ? (totalRuntime / groupedData.length).toFixed(2) : 0} hours`);
            console.log(`Grouped data:`, groupedData);
            console.log(`=====================================\n`);

            const averageRuntime = groupedData.length > 0 ? (totalRuntime / groupedData.length).toFixed(1) : "0";

            // Determine pump type from product name
            const productName = assetData?.product?.product_name?.toUpperCase() || "";
            const pumpType = productName.includes("JOCKEY") ? "JOCKEY PUMP" :
                productName.includes("ELECTRIC") ? "ELECTRIC DRIVEN" :
                    productName.includes("DIESEL") ? "DIESEL DRIVEN" : "UNKNOWN";

            return {
                data: groupedData,
                average: `${averageRuntime} Hrs`,
                pumpType: pumpType
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/auto-manual-status
     * Get pump auto/manual status data
     */
    /**
     * POST /api/organization/dashboard/pump/auto-manual-status
     * Get pump auto/manual status data
     */
    async getPumpAutoManualStatusData(data, user) {
        try {
            const { selectedAsset, startDate, endDate } = data;

            if (!selectedAsset || !startDate || !endDate) {
                throw new Error(JSON.stringify({
                    message: "selectedAsset, startDate and endDate are required"
                }));
            }

            // Get asset data
            const assetData = await Asset.findByPk(selectedAsset, {
                attributes: ['asset_code']
            });

            if (!assetData) {
                return { data: [] };
            }

            // Get IoT device mapping
            const deviceMapping = await IoTDeviceAssetMap.findOne({
                where: { asset_code: assetData.asset_code }
            });

            if (!deviceMapping) {
                return { data: [] };
            }

            const { device_id, data_key } = deviceMapping;

            // Find IoT device
            const iotDevice = await IoTLiveDataPR.findOne({
                where: { device_id },
                attributes: ['history']
            });

            if (!iotDevice || !iotDevice.history) {
                return { data: [] };
            }

            const history = iotDevice.history;
            const asKey = data_key;  // AS1, AS2, AS3
            const asData = history[asKey] || [];

            // Combine and filter data within range (plus one before start)
            const startDateTime = new Date(startDate).getTime();
            const endDateTime = new Date(endDate).getTime();

            // Sort data
            const sortedAs = [...asData].sort((a, b) => new Date(a.date || a.timestamp).getTime() - new Date(b.date || b.timestamp).getTime());

            // Get initial state before start date
            let currentStatus = 0; // Default Manual (0)

            for (let i = 0; i < sortedAs.length; i++) {
                if (new Date(sortedAs[i].date || sortedAs[i].timestamp).getTime() <= startDateTime) {
                    currentStatus = sortedAs[i].data;
                } else {
                    break;
                }
            }

            // Collect time points
            const timePoints = new Set();
            timePoints.add(startDateTime);
            timePoints.add(endDateTime);

            const relevantAs = sortedAs.filter(d => {
                const t = new Date(d.date || d.timestamp).getTime();
                return t > startDateTime && t <= endDateTime;
            });

            relevantAs.forEach(d => timePoints.add(new Date(d.date || d.timestamp).getTime()));

            const sortedTimePoints = Array.from(timePoints).sort((a, b) => a - b);

            const resultData = [];
            let asIdx = 0;

            // Advance index
            while (asIdx < sortedAs.length && new Date(sortedAs[asIdx].date || sortedAs[asIdx].timestamp).getTime() <= startDateTime) asIdx++;

            let activeStatus = currentStatus;

            // Add initial point
            resultData.push({
                timestamp: new Date(startDate).toISOString(),
                powerStatus: activeStatus  // Changed from status - contains AS (Auto/Manual) data
            });

            for (const time of sortedTimePoints) {
                if (time === startDateTime) continue;

                let statusChanged = false;

                while (asIdx < sortedAs.length) {
                    const t = new Date(sortedAs[asIdx].date || sortedAs[asIdx].timestamp).getTime();
                    if (t === time) {
                        activeStatus = sortedAs[asIdx].data;
                        statusChanged = true;
                        asIdx++;
                    } else if (t < time) {
                        activeStatus = sortedAs[asIdx].data;
                        asIdx++;
                    } else {
                        break;
                    }
                }

                resultData.push({
                    timestamp: new Date(time).toISOString(),
                    powerStatus: activeStatus  // Changed from status - contains AS (Auto/Manual) data
                });
            }

            return { data: resultData };
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/auto-manual-duration
     * Get pump auto/manual duration data
     */
    async getPumpAutoManualDurationData(data, user) {
        try {
            const { selectedAsset, timeframe } = data;

            if (!selectedAsset || !timeframe) {
                throw new Error(JSON.stringify({
                    message: "selectedAsset and timeframe are required"
                }));
            }

            // Get asset data
            const assetData = await Asset.findByPk(selectedAsset, {
                attributes: ['asset_code']
            });

            if (!assetData) {
                return { data: [] };
            }

            // Get IoT device mapping
            const deviceMapping = await IoTDeviceAssetMap.findOne({
                where: { asset_code: assetData.asset_code }
            });

            if (!deviceMapping) {
                return { data: [] };
            }

            const { device_id, data_key } = deviceMapping;

            // Find IoT device
            const iotDevice = await IoTLiveDataPR.findOne({
                where: { device_id },
                attributes: ['history']
            });

            if (!iotDevice || !iotDevice.history) {
                return { data: [] };
            }

            const history = iotDevice.history;
            const asKey = data_key;  // AS1, AS2, AS3
            const asData = history[asKey] || [];

            if (asData.length === 0) {
                return { data: [] };
            }

            // Sort AS data by date
            const sortedAsData = [...asData].sort((a, b) => {
                const dateA = new Date(a.date || a.timestamp);
                const dateB = new Date(b.date || b.timestamp);
                return dateA - dateB;
            });

            if (sortedAsData.length === 0) {
                return { data: [] };
            }

            // Calculate duration for a specific period
            const calculateDurationForPeriod = (periodStart, periodEnd) => {
                const periodData = sortedAsData.filter(entry => {
                    const entryDate = new Date(entry.date || entry.timestamp);
                    return entryDate >= periodStart && entryDate <= periodEnd;
                });

                let autoHours = 0;
                let manualHours = 0;

                if (periodData.length === 0) {
                    return { autoHours: 0, manualHours: 0 };
                }

                // Add period boundaries to data
                const allEntries = [
                    { date: periodStart, data: periodData[0].data },
                    ...periodData,
                    { date: periodEnd, data: periodData[periodData.length - 1].data }
                ];

                for (let i = 0; i < allEntries.length - 1; i++) {
                    const currentEntry = allEntries[i];
                    const nextEntry = allEntries[i + 1];

                    const currentTime = new Date(currentEntry.date);
                    const nextTime = new Date(nextEntry.date);

                    const duration = (nextTime - currentTime) / (1000 * 60 * 60); // Convert to hours

                    if (currentEntry.data === 1) {
                        autoHours += duration;
                    } else {
                        manualHours += duration;
                    }
                }

                return {
                    autoHours: Math.max(0, autoHours),
                    manualHours: Math.max(0, manualHours)
                };
            };

            const groupedData = [];
            const now = new Date();

            if (timeframe === "Day") {
                // Group by 4-hour intervals
                for (let hour = 0; hour < 24; hour += 4) {
                    const intervalStart = new Date(now);
                    intervalStart.setHours(hour, 0, 0, 0);
                    const intervalEnd = new Date(intervalStart);
                    intervalEnd.setHours(hour + 3, 59, 59, 999);

                    const duration = calculateDurationForPeriod(intervalStart, intervalEnd);

                    groupedData.push({
                        label: `${hour.toString().padStart(2, '0')}:00`,
                        autoHours: Math.round(duration.autoHours * 100) / 100,
                        manualHours: Math.round(duration.manualHours * 100) / 100
                    });
                }
            } else if (timeframe === "Week") {
                // Group by days
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                for (let i = 0; i < 7; i++) {
                    const dayStart = new Date(now);
                    dayStart.setDate(now.getDate() - (6 - i));
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(dayStart);
                    dayEnd.setHours(23, 59, 59, 999);

                    const duration = calculateDurationForPeriod(dayStart, dayEnd);

                    groupedData.push({
                        label: days[dayStart.getDay()],
                        autoHours: Math.round(duration.autoHours * 100) / 100,
                        manualHours: Math.round(duration.manualHours * 100) / 100
                    });
                }
            } else if (timeframe === "Month") {
                // Group by weeks
                for (let week = 1; week <= 4; week++) {
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - ((4 - week + 1) * 7));
                    weekStart.setHours(0, 0, 0, 0);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    weekEnd.setHours(23, 59, 59, 999);

                    const duration = calculateDurationForPeriod(weekStart, weekEnd);

                    groupedData.push({
                        label: `Week ${week}`,
                        autoHours: Math.round(duration.autoHours * 100) / 100,
                        manualHours: Math.round(duration.manualHours * 100) / 100
                    });
                }
            }

            return { data: groupedData };
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/dashboard/pump/dashboard-data
     * Get Pump Dashboard Data (Plant Data, Assets, Service Counts)
     * Migrated from MongoDB to PostgreSQL/Sequelize
     */
    async getPumpDashboardData(data, user) {
        // Accept both plantId (from frontend) and plant_id
        const normalizedData = {
            plant_id: data.plant_id || data.plantId,
            categoryId: data.categoryId,
            device_id: data.device_id || data.deviceId || data.device_code || data.deviceCode // Accept both device_id and device_code for compatibility
        };

        const dashboardSchema = Joi.object({
            plant_id: Joi.string().pattern(uuidPattern).required(),
            categoryId: Joi.string().pattern(uuidPattern).required(),
            device_id: Joi.string().optional() // Optional for backward compatibility
        });

        const { error } = dashboardSchema.validate(normalizedData);

        if (error) {
            throw error;
        }

        const { plant_id, categoryId, device_id } = normalizedData;
        try {
            // Fetch plant data from FireSafetyForm (pump room specific data is stored here)
            const fireSafetyData = await FireSafetySystem.findOne({
                where: { plant_id },
                attributes: [
                    'diesel_tank_1',
                    'diesel_tank_2',
                    'header_pressure_value',
                    'prime_over_tank',
                    'terrace_tank'
                ],
            });

            // Map FireSafetyForm fields to match expected response structure


            const plantData = fireSafetyData ? {
                dieselStorage: parseFloat(fireSafetyData.diesel_tank_1) || parseFloat(fireSafetyData.diesel_tank_2) || 0,
                headerPressure: fireSafetyData.header_pressure_value,
                mainWaterStorage: parseFloat(fireSafetyData.prime_over_tank) || parseFloat(fireSafetyData.terrace_tank) || 0,
                pressureUnit: 'bar', // Default unit as it's stored in headerPressureBar
            } : {
                dieselStorage: 0,
                headerPressure: 0,
                mainWaterStorage: 0,
                pressureUnit: 'bar',
            };



            // Find category by ID instead of hardcoded name
            const categoryData = await Category.findOne({
                where: { id: categoryId },
                attributes: ['id', 'category_name'],
            });

            if (!categoryData) {
                throw new Error('Category not found');
            }

            // Count total pump assets (excluding Deactive status)
            const totalPumpAssets = await Asset.count({
                where: {
                    status: { [Op.ne]: 'DEACTIVE' },
                    plant_id,
                    category_id: categoryData.id,
                },
            });

            // Count healthy pump assets
            const totalPumpHealthyAssets = await Asset.count({
                where: {
                    status: { [Op.ne]: 'DEACTIVE' },
                    plant_id,
                    category_id: categoryData.id,
                    health_status: 'HEALTHY',
                },
            });

            // Fetch all pump assets with product details
            const assets = await Asset.findAll({
                where: {
                    status: { [Op.ne]: 'DEACTIVE' },
                    plant_id,
                    category_id: categoryData.id,
                },
                include: [
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['product_name', 'variants'],
                    },
                ],
                attributes: ['id', 'product_id', 'asset_code', 'building_id', 'location', 'health_status', 'type', 'last_service_date'],
            });

            // Get asset IDs for service count queries
            const assetIds = assets.map((asset) => asset.id);

            // Fetch pump capacities from asset spec values
            // Find capacity spec definition
            const capacitySpec = await SpecDefinition.findOne({
                where: {
                    category_id: categoryId,
                    spec_name: { [Op.iLike]: '%capacity%' }
                },
                attributes: ['id']
            });

            let assetCapacities = {};
            let dataKeyToAssetCode = {};

            if (capacitySpec && assetIds.length > 0) {
                console.log('[BACKEND] Fetching capacity with device_id:', device_id);

                // Fetch all device mappings for this plant/category to identify pump types
                const deviceMappings = await IoTDeviceAssetMap.findAll({
                    where: {
                        plant_id,
                        category_id: categoryId,
                        ...(device_id && { device_id }) // Filter by device if provided
                    },
                    attributes: ['asset_code', 'data_key'],
                    include: [{
                        model: Asset,
                        as: 'asset',
                        attributes: ['id', 'asset_code']
                    }]
                });

                // Map data_key to pump types:
                // AS1/PS1/TS1 = Jockey Pump
                // AS2/PS2/TS2 = Electric Pump
                // AS3/PS3/TS3 = Diesel Pump

                // Fetch capacity for each individual asset
                for (const mapping of deviceMappings) {
                    if (!mapping.asset) continue;

                    const assetId = mapping.asset.id;
                    const assetCode = mapping.asset.asset_code;
                    const dataKey = mapping.data_key;

                    // Map data_key to asset_code for frontend lookup
                    if (dataKey) {
                        dataKeyToAssetCode[dataKey] = assetCode;
                    }

                    // Fetch capacity for this asset
                    const capSpec = await AssetSpecValue.findOne({
                        where: {
                            asset_id: assetId,
                            spec_definition_id: capacitySpec.id
                        },
                        attributes: ['spec_value', 'asset_id']
                    });

                    if (capSpec) {
                        assetCapacities[assetCode] = parseFloat(capSpec.spec_value);
                    }
                }

                // DEBUG: Also check what OTHER assets have capacity values
                const allCapacities = await AssetSpecValue.findAll({
                    where: {
                        spec_definition_id: capacitySpec.id
                    },
                    include: [{
                        model: Asset,
                        as: 'asset',
                        attributes: ['asset_code'],
                        where: {
                            plant_id,
                            category_id: categoryId
                        }
                    }],
                    attributes: ['spec_value', 'asset_id']
                });

                console.log('[BACKEND] ALL assets with capacity in this plant/category:',
                    allCapacities.map(c => ({ asset_code: c.asset?.asset_code, value: c.spec_value }))
                );
            }

            // Add capacities and mappings to plantData
            plantData.assetCapacities = assetCapacities;
            plantData.dataKeyToAssetCode = dataKeyToAssetCode;

            console.log('[BACKEND DEBUG] Returning plantData:', {
                assetCapacities,
                dataKeyToAssetCode,
                dieselStorage: plantData.dieselStorage,
                mainWaterStorage: plantData.mainWaterStorage
            });

            // Count lapsed services
            const lapsedServiceCount = await ServiceSubmission.count({
                where: {
                    plant_id,
                    asset_id: { [Op.in]: assetIds },
                    status: { [Op.or]: ['Lapsed', 'LAPSED', 'lapsed'] },
                },
            });

            // Count total services
            const totalServiceCount = await ServiceSubmission.count({
                where: {
                    plant_id,
                    asset_id: { [Op.in]: assetIds },
                },
            });

            return {
                pumpData: plantData, // Renamed to match frontend expectation
                totalPumpAssets,
                totalPumpHealthyAssets,
                assets,
                lapsedServiceCount,
                totalServiceCount,
            };
        } catch (error) {
            throw error;
        }
    }

    // ==================================================================================
    // FILTER HELPER FUNCTIONS (merged from dashboardController.js)
    // ==================================================================================

    /**
     * POST /api/organization/get-products-by-plant-and-category
     * Get products available in a specific plant and category
     */
    async getProductsByPlantAndCategory(data, user) {
        // Accept both plantId (from frontend) and plant_id
        const plant_id = data.plant_id || data.plantId;
        const { categoryId } = data;
        try {


            // First, get all unique product IDs for assets in this plant and category
            const assets = await Asset.findAll({
                where: {
                    plant_id,
                    category_id: categoryId,
                    status: { [Op.ne]: 'DEACTIVE' },
                    product_id: { [Op.ne]: null }
                },
                attributes: ['product_id'],
                raw: true
            });

            // Extract unique product IDs
            const productIds = [...new Set(assets.map(a => a.product_id).filter(Boolean))];

            if (productIds.length === 0) {
                return [];
            }

            // Fetch the actual products
            const products = await Product.findAll({
                where: {
                    id: { [Op.in]: productIds }
                },
                attributes: ['id', 'product_name'],
                order: [['product_name', 'ASC']]
            });

            // Format response to match expected structure
            const formattedProducts = products.map(p => ({
                _id: p.id,
                product_name: p.product_name
            }));

            return formattedProducts;
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/get-types-by-plant-and-category
     * Get asset types available in a specific plant and category
     */
    async getTypesByPlantAndCategory(data, user) {
        // Accept both plantId (from frontend) and plant_id
        const plant_id = data.plant_id || data.plantId;
        const { categoryId } = data;
        try {
            const assets = await Asset.findAll({
                where: {
                    plant_id,
                    category_id: categoryId,
                    status: { [Op.ne]: 'DEACTIVE' },
                    type: { [Op.ne]: null }
                },
                attributes: ['type'],
                raw: true
            });

            const types = [...new Set(assets.map((a) => a.type).filter(Boolean))];
            return types.sort();
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/get-capacitys-by-plant-and-category
     * Get asset capacities available in a specific plant and category
     */
    async getCapacitysByPlantAndCategory(data, user) {
        // Accept both plantId (from frontend) and plant_id
        const plant_id = data.plant_id || data.plantId;
        const { categoryId } = data;
        try {
            // Capacity is stored in AssetSpecValue, not Asset table
            const specValues = await AssetSpecValue.findAll({
                include: [
                    {
                        model: Asset,
                        as: 'asset',
                        where: {
                            plant_id,
                            category_id: categoryId,
                            status: { [Op.ne]: 'DEACTIVE' }
                        },
                        attributes: []
                    },
                    {
                        model: SpecDefinition,
                        as: 'spec_definition',
                        where: {
                            spec_label: { [Op.iLike]: 'Capacity' }
                        },
                        attributes: []
                    }
                ],
                attributes: ['spec_value'],
                raw: true
            });

            const capacities = [...new Set(specValues.map((sv) => sv.spec_value).filter(Boolean))];

            // Sort numerically if possible, otherwise alphabetically
            capacities.sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return String(a).localeCompare(String(b));
            });
            return capacities;
        } catch (error) {
            console.error('[getCapacitysByPlantAndCategory] Error:', error);
            throw error;
        }
    }

    /**
     * POST /api/organization/get-categories-by-plant
     * Get categories associated with a specific plant (from PlantCategory table)
     * Returns all associated categories, even if no assets exist yet
     */
    async getCategoriesByPlant(data, user) {
        // Accept both plantId (from frontend) and plant_id
        const plant_id = data.plant_id || data.plantId;
        console.log('[getCategoriesByPlant] Called with plant_id:', plant_id, 'raw data:', data);
        try {
            // Get category IDs from PlantCategory junction table
            // This returns ALL categories associated with the plant, regardless of assets
            const plantCategories = await PlantCategory.findAll({
                where: { plant_id },
                attributes: ['category_id'],
                raw: true
            });

            console.log('[getCategoriesByPlant] Found plant-category associations:', plantCategories);

            const categoryIds = [...new Set(plantCategories.map(pc => pc.category_id).filter(Boolean))];

            if (categoryIds.length === 0) {
                console.log('[getCategoriesByPlant] No categories associated with this plant');
                return [];
            }

            // Fetch category details
            const categories = await Category.findAll({
                where: {
                    id: { [Op.in]: categoryIds }
                },
                attributes: ['id', 'category_name'],
                order: [['category_name', 'ASC']]
            });

            console.log('[getCategoriesByPlant] Returning categories:', categories.map(c => c.category_name));

            // Transform to match frontend expectations (camelCase)
            return categories.map(c => ({
                id: c.id,
                categoryName: c.category_name
            }));
        } catch (error) {
            console.error('[getCategoriesByPlant] Error:', error);
            throw error;
        }
    }

    /**
     * POST /api/organization/get-locations-by-building
     * Get locations available in a specific building
     */
    async getLocationsByBuilding(data, user) {
        // Accept both plantId (from frontend) and plant_id
        const plant_id = data.plant_id || data.plantId;
        const { building_id } = data;
        try {
            const assets = await Asset.findAll({
                where: {
                    plant_id,
                    building_id,
                    status: { [Op.ne]: 'DEACTIVE' },
                    location: { [Op.ne]: null }
                },
                attributes: ['location'],
                raw: true
            });

            // Get unique locations
            const locations = [...new Set(assets.map((a) => a.location).filter(Boolean))];

            // Format as objects with id and locationName for consistency
            const formattedLocations = locations.sort().map(loc => ({
                id: loc,
                locationName: loc
            }));

            return formattedLocations;
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/get-subtypes-by-type
     * Get asset subtypes for a specific type
     */
    async getSubTypesByType(data, user) {
        // Accept both plantId (from frontend) and plant_id
        const plant_id = data.plant_id || data.plantId;
        const { categoryId, type } = data;
        try {
            const assets = await Asset.findAll({
                where: {
                    plant_id,
                    category_id: categoryId,
                    type,
                    status: { [Op.ne]: 'DEACTIVE' },
                    sub_type: { [Op.ne]: null }
                },
                attributes: ['sub_type'],
                raw: true
            });

            const subTypes = [...new Set(assets.map((a) => a.sub_type).filter(Boolean))];
            return subTypes.sort();
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST /api/organization/get-manufacturers-by-category
     * Get manufacturers for products in a specific category
     */
    // async getManufacturersByCategory(data, user) {
    //     const { plant_id, categoryId } = data;
    //     try {


    //         // First, get unique product IDs for assets in this plant and category
    //         const assets = await Asset.findAll({
    //             where: {
    //                 plant_id,
    //                 category_id: categoryId,
    //                 status: { [Op.ne]: 'DEACTIVE' },
    //                 product_id: { [Op.ne]: null }
    //             },
    //             attributes: ['product_id'],
    //             raw: true
    //         });

    //         const productIds = [...new Set(assets.map(a => a.product_id).filter(Boolean))];

    //         if (productIds.length === 0) {
    //             return [];
    //         }

    //         // Fetch products with manufacturers
    //         const products = await Product.findAll({
    //             where: {
    //                 id: { [Op.in]: productIds },
    //                 manufacturer: { [Op.ne]: null }
    //             },
    //             attributes: ['manufacturer'],
    //             raw: true
    //         });

    //         // Get unique manufacturers
    //         const manufacturers = [...new Set(products.map(p => p.manufacturer).filter(Boolean))];
    //         return manufacturers.sort();
    //     } catch (error) {
    //         throw error;
    //     }
    // }
    async getManufacturersByCategory(data, user) {
        // Accept both plantId (from frontend) and plant_id
        const plant_id = data.plant_id || data.plantId;
        const { categoryId } = data;
        try {
            // Get unique manufacturer IDs from assets in this plant and category
            const assets = await Asset.findAll({
                where: {
                    plant_id,
                    category_id: categoryId,
                    status: { [Op.ne]: 'DEACTIVE' },
                    manufacturer_id: { [Op.ne]: null }
                },
                attributes: ['manufacturer_id'],
                raw: true
            });

            const manufacturerIds = [...new Set(assets.map(a => a.manufacturer_id).filter(Boolean))];

            if (manufacturerIds.length === 0) {
                return [];
            }

            // Fetch actual manufacturer records
            const manufacturers = await Manufacturer.findAll({
                where: {
                    id: { [Op.in]: manufacturerIds }
                },
                attributes: ['id', 'name'],
                order: [['name', 'ASC']]
            });

            // Format response to match expected structure
            const formattedManufacturers = manufacturers.map(m => ({
                _id: m.id,
                name: m.name
            }));

            return formattedManufacturers;
        } catch (error) {
            throw error;
        }
    }
    /**
     * POST /api/organization/get-all-assets-for-filtering
     * Get all assets for a plant and category with all fields needed for filtering
     * Used for client-side cascading filters
     */
    async getAllAssetsForFiltering(data, user) {
        try {
            // Accept both plantId (from frontend) and plant_id
            const plant_id = data.plant_id || data.plantId;
            const categoryId = data.categoryId;

            console.log('[getAllAssetsForFiltering] Called with:', { plant_id, categoryId, raw_data: data });

            if (!plant_id || !categoryId) {
                console.log('[getAllAssetsForFiltering] Missing required params - plant_id:', plant_id, 'categoryId:', categoryId);
                throw new Error(JSON.stringify({ error: 'plant_id and categoryId are required' }));
            }

            // Fetch category to get category name
            const categoryData = await Category.findByPk(categoryId, {
                attributes: ['id', 'category_name']
            });

            // 1. Fetch Assets with Building and other associations
            // FIX: Remove ServiceSubmission from include to prevent circular reference stack overflow
            const assets = await Asset.findAll({
                where: {
                    plant_id,
                    category_id: categoryId,
                    status: { [Op.ne]: 'DEACTIVE' } // Only active assets
                },
                include: [
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'product_name']
                    },
                    {
                        model: Manufacturer,
                        as: 'manufacturer',
                        attributes: ['id', 'name']
                    },
                    {
                        model: Building,
                        as: 'building',
                        attributes: ['id', 'building_name']
                    },
                    {
                        model: AssetMetadata,
                        as: 'metadata',
                        attributes: ['model', 'tag', 'serial_number'],
                        required: false  // Not all assets have metadata
                    }
                    // REMOVED: ServiceSubmission include as it was causing stack overflow
                    // We'll fetch this separately below
                ],
                attributes: [
                    'id',
                    'building_id',
                    'location',
                    'type',
                    'sub_type',
                    // 'capacity', // NOTE: capacity is in asset_spec_values, not Asset table
                    'health_status',
                    'manufacturing_date',
                    'product_id',
                    'manufacturer_id',
                ],
                order: [['type', 'ASC']]
            });

            console.log('[getAllAssetsForFiltering] Found', assets.length, 'assets');

            // 2. Fetch AssetSpecValues for all assets
            const assetIds = assets.map(a => a.id);
            let assetSpecValuesMap = {};

            if (assetIds.length > 0) {
                // Fetch AssetSpecValues for all assets
                const assetSpecValues = await AssetSpecValue.findAll({
                    where: {
                        asset_id: { [Op.in]: assetIds }
                    },
                    include: [
                        {
                            model: SpecDefinition,
                            as: 'spec_definition',
                            attributes: ['id', 'spec_label', 'category_id'],
                            where: {
                                category_id: categoryId
                            }
                        }
                    ],
                    attributes: ['id', 'asset_id', 'spec_definition_id', 'spec_value']
                });

                console.log('[getAllAssetsForFiltering] Found', assetSpecValues.length, 'spec values for', assetIds.length, 'assets');
                if (assetSpecValues.length > 0) {
                    console.log('[getAllAssetsForFiltering] Sample spec value:', assetSpecValues[0].toJSON());
                }

                // Group spec values by asset_code and then by label
                assetSpecValues.forEach(specValue => {
                    if (!assetSpecValuesMap[specValue.asset_id]) {
                        assetSpecValuesMap[specValue.asset_id] = {};
                    }
                    if (specValue.spec_definition) {
                        assetSpecValuesMap[specValue.asset_id][specValue.spec_definition.spec_label] = specValue.spec_value;
                    }
                });

                console.log('[getAllAssetsForFiltering] Spec values map:', Object.keys(assetSpecValuesMap).length, 'assets have spec values');
                const firstAssetWithSpecs = Object.keys(assetSpecValuesMap)[0];
                if (firstAssetWithSpecs) {
                    console.log('[getAllAssetsForFiltering] Sample asset spec values:', assetSpecValuesMap[firstAssetWithSpecs]);
                }
            }

            // 4. Merge and Transform (with field mappings for frontend)
            const transformedAssets = assets.map(asset => {
                const assetData = asset.toJSON();
                const specValues = assetSpecValuesMap[asset.id] || {};

                // Debug first asset
                if (asset.id === assetIds[0]) {
                    console.log('[getAllAssetsForFiltering] First asset metadata:', assetData.metadata);
                    console.log('[getAllAssetsForFiltering] First asset spec values:', specValues);
                }

                return {
                    ...assetData,
                    // Map building_id to buildingId (camelCase for frontend)
                    buildingId: assetData.building_id,
                    // Map building.building_name to building (string for frontend)
                    building: assetData.building?.building_name || null,
                    // Map sub_type to subType (camelCase for frontend)
                    subType: assetData.sub_type,
                    // Map health_status to healthStatus (camelCase for frontend)
                    healthStatus: assetData.health_status,
                    // Map manufacturing_date to manufacturingDate (camelCase for frontend)
                    manufacturingDate: assetData.manufacturing_date,
                    // Include model from metadata
                    model: assetData.metadata?.model || null,
                    // Product mapping for frontend
                    productId: assetData.product ? {
                        _id: assetData.product.id,
                        productName: assetData.product.product_name
                    } : null,
                    // Manufacturer already comes as object with id and name
                    manufacturer: assetData.manufacturer,
                    manufacturerId: assetData.manufacturer_id,
                    // Attach spec values for filtering (e.g., Operating Pressure, Size, capacity)
                    specValues: specValues,
                    // Include capacity from spec values if available
                    capacity: specValues['Capacity'] || specValues['capacity'] || null
                };
            });

            console.log('[DashboardController] Filter Assets Result Count:', transformedAssets.length);

            return {
                assets: transformedAssets,
                categoryName: categoryData ? categoryData.category_name : null
            };
        } catch (error) {
            console.error('Error fetching assets for filtering:', error);
            throw error;
        }
    }
};

module.exports = new DashboardService();



