const { Op } = require('sequelize');

/**
 * Build Sequelize filter object from query parameters
 * Supports date ranges, status filters, and various asset properties
 *
 * @param {Object} query - Request query parameters
 * @param {string} dateField - Name of the date field to filter on (e.g., 'scheduledDate', 'lastHPTestDate')
 * @returns {Object} - Object with main filter and asset-level filters
 */
function buildFilter(query, dateField = 'scheduledDate') {
    const {
        startDate,
        endDate,
        plantId: plantIdParam,
        plantIds,
        serviceType,
        categoryId,
        building,
        location,
        status,
        healthStatus,
        type,
        capacity,
        capacityUnit,
        productCategory,
        subType
    } = query;

    const filter = {};
    const assetFilters = {};

    // Resolve plantId from either plantId or plantIds parameter
    const plantId = plantIdParam || plantIds;

    // Service-specific filters (for ServiceSubmission reports)
    if (serviceType) filter.inspection_type = serviceType;
    if (plantId) filter.plant_id = plantId;

    // Asset-level filters (moved categoryId here as category_id)
    if (categoryId) assetFilters.category_id = categoryId;

    // Status filters
    if (status) {
        // Map common status values
        const statusMap = {
            'Completed': 'COMPLETED',
            'Pending': 'PENDING',
            'In Progress': 'IN_PROGRESS',
            'Approved': 'APPROVED',
            'Submitted': 'SUBMITTED'
        };
        filter.status = statusMap[status] || status;
    }

    // Date range filter
    if (startDate && endDate) {
        filter[dateField] = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    } else if (startDate) {
        filter[dateField] = {
            [Op.gte]: new Date(startDate)
        };
    } else if (endDate) {
        filter[dateField] = {
            [Op.lte]: new Date(endDate)
        };
    }

    // Asset-level filters (for direct Asset queries)
    if (type) assetFilters.type = type;
    if (building) assetFilters.building_id = building;
    if (location) assetFilters.location = location;
    if (healthStatus) assetFilters.health_status = healthStatus;
    if (capacity) assetFilters.capacity = capacity; // Note: capacity is not an Asset column, handled separately or via join
    if (capacityUnit) assetFilters.capacityUnit = capacityUnit;
    if (productCategory) assetFilters.category_id = productCategory;
    if (subType) assetFilters.sub_type = subType;

    return { filter, assetFilters };
}

module.exports = buildFilter;
