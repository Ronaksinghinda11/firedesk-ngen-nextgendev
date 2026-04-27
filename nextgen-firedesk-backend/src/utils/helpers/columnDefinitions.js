/**
 * Column definitions for different report types
 * Each column has: label, path, alwaysShow, isDate, isStatus
 */

const SERVICE_INSPECTION_COLUMNS = {
    assetId: { label: 'Asset ID', path: 'asset.assetId', alwaysShow: true },
    type: { label: 'Type', path: 'asset.type' },
    capacity: { label: 'Capacity', path: 'asset.capacity' },
    capacityUnit: { label: 'Unit', path: 'asset.capacityUnit' },
    building: { label: 'Building', path: 'asset.building' },
    location: { label: 'Location', path: 'asset.location' },
    healthStatus: { label: 'Health Status', path: 'asset.healthStatus', isStatus: true },
    plantName: { label: 'Plant', path: 'plant.plantName' },
    inspector: { label: 'Inspector', path: 'technician.user.name' },
    scheduledDate: { label: 'Inspection Date', path: 'scheduledDate', isDate: true, alwaysShow: true },
    status: { label: 'Status', path: 'status', isStatus: true, alwaysShow: true }
};

const SERVICE_TESTING_COLUMNS = {
    assetId: { label: 'Asset ID', path: 'asset.assetId', alwaysShow: true },
    subType: { label: 'Sub Type', path: 'asset.subType' },
    capacity: { label: 'Capacity', path: 'asset.capacity' },
    capacityUnit: { label: 'Unit', path: 'asset.capacityUnit' },
    building: { label: 'Building', path: 'asset.building' },
    location: { label: 'Location', path: 'asset.location' },
    manufacturer: { label: 'Manufacturer', path: 'asset.manufacturer.name' },
    model: { label: 'Model', path: 'asset.model' },
    testType: { label: 'Test Type', path: 'inspectionType' },
    plantName: { label: 'Plant', path: 'plant.plantName' },
    testedBy: { label: 'Tested By', path: 'technician.user.name' },
    scheduledDate: { label: 'Test Date', path: 'scheduledDate', isDate: true, alwaysShow: true },
    result: { label: 'Result', path: 'status', isStatus: true, alwaysShow: true }
};

const SERVICE_MAINTENANCE_COLUMNS = {
    assetId: { label: 'Asset ID', path: 'asset.assetId', alwaysShow: true },
    subType: { label: 'Sub Type', path: 'asset.subType' },
    capacity: { label: 'Capacity', path: 'asset.capacity' },
    capacityUnit: { label: 'Unit', path: 'asset.capacityUnit' },
    building: { label: 'Building', path: 'asset.building' },
    location: { label: 'Location', path: 'asset.location' },
    manufacturer: { label: 'Manufacturer', path: 'asset.manufacturer.name' },
    model: { label: 'Model', path: 'asset.model' },
    healthStatus: { label: 'Health Status', path: 'asset.healthStatus', isStatus: true },
    maintenanceType: { label: 'Maintenance Type', path: 'inspectionType' },
    plantName: { label: 'Plant', path: 'plant.plantName' },
    technician: { label: 'Technician', path: 'technician.user.name' },
    scheduledDate: { label: 'Maintenance Date', path: 'scheduledDate', isDate: true, alwaysShow: true },
    status: { label: 'Status', path: 'status', isStatus: true, alwaysShow: true }
};

const HYDRO_TEST_COLUMNS = {
    assetId: { label: 'Asset ID', path: 'assetId', alwaysShow: true },
    type: { label: 'Type', path: 'type' },
    subType: { label: 'Sub Type', path: 'subType' },
    capacity: { label: 'Capacity', path: 'capacity' },
    capacityUnit: { label: 'Capacity Unit', path: 'capacityUnit' },
    location: { label: 'Location', path: 'location' },
    building: { label: 'Building', path: 'building' },
    manufacturer: { label: 'Manufacturer', path: 'manufacturer.name' },
    model: { label: 'Model', path: 'model' },
    lastHPTestDate: { label: 'Last HP Test', path: 'lastHPTestDate', isDate: true, alwaysShow: true },
    nextHPTestDueDate: { label: 'Next HP Test Due', path: 'nextHPTestDueDate', isDate: true, alwaysShow: true },
    hpTestStatus: { label: 'Status', path: 'healthStatus', isStatus: true, alwaysShow: true }
};

const REFILLING_COLUMNS = {
    assetId: { label: 'Asset ID', path: 'assetId', alwaysShow: true },
    type: { label: 'Type', path: 'type' },
    subType: { label: 'Sub Type', path: 'subType' },
    capacity: { label: 'Capacity', path: 'capacity' },
    capacityUnit: { label: 'Capacity Unit', path: 'capacityUnit' },
    location: { label: 'Location', path: 'location' },
    building: { label: 'Building', path: 'building' },
    manufacturer: { label: 'Manufacturer', path: 'manufacturer.name' },
    model: { label: 'Model', path: 'model' },
    lastRefilledDate: { label: 'Last Refill Date', path: 'lastRefilledDate', isDate: true, alwaysShow: true },
    nextRefillDueDate: { label: 'Next Refill Due', path: 'nextRefillDueDate', isDate: true },
    refillStatus: { label: 'Status', path: 'healthStatus', isStatus: true, alwaysShow: true }
};

/**
 * Get default columns for a given service type
 */
function getDefaultColumns(serviceType) {
    switch (serviceType) {
        case 'Inspection':
            return ['assetId', 'type', 'capacity', 'building', 'location', 'healthStatus', 'inspector', 'scheduledDate', 'status'];
        case 'Testing':
            return ['assetId', 'type', 'capacity', 'building', 'location', 'testType', 'testedBy', 'scheduledDate', 'result'];
        case 'Maintenance':
            return ['assetId', 'type', 'capacity', 'building', 'location', 'healthStatus', 'technician', 'scheduledDate', 'status'];
        case 'Hydro':
            return ['assetId', 'type', 'capacity', 'location', 'building', 'lastHPTestDate', 'nextHPTestDueDate', 'hpTestStatus'];
        case 'Refilling':
            return ['assetId', 'type', 'capacity', 'location', 'building', 'lastRefilledDate', 'refillStatus'];
        default:
            return [];
    }
}

/**
 * Get column definitions for a given service type
 */
function getColumnDefinitions(serviceType) {
    switch (serviceType) {
        case 'Inspection':
            return SERVICE_INSPECTION_COLUMNS;
        case 'Testing':
            return SERVICE_TESTING_COLUMNS;
        case 'Maintenance':
            return SERVICE_MAINTENANCE_COLUMNS;
        case 'Hydro':
            return HYDRO_TEST_COLUMNS;
        case 'Refilling':
            return REFILLING_COLUMNS;
        default:
            return {};
    }
}

module.exports = {
    SERVICE_INSPECTION_COLUMNS,
    SERVICE_TESTING_COLUMNS,
    SERVICE_MAINTENANCE_COLUMNS,
    HYDRO_TEST_COLUMNS,
    REFILLING_COLUMNS,
    getDefaultColumns,
    getColumnDefinitions
};
