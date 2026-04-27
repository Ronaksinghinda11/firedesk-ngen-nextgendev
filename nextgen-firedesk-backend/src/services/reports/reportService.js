// const { Op } = require('sequelize');
// const ServiceSubmission = require('../../models/service-form/ServiceSubmission');
// const Asset = require('../../models/assets/Asset');
// const Plant = require('../../models/plants/Plant');
// const Technician = require('../../models/user-management/technician');
// const User = require('../../models/user-management/user');
// const Manufacturer = require('../../models/assets/Manufacturer');

const { ServiceSubmission, Manufacturer, Asset, Plant, Technician, AssetMetadata, AssetSpecValue, SpecDefinition, User, Building } = require("../../models");
const buildFilter = require("../../utils/buildFilter");
const { calculateServiceStats, calculateHydroStats, calculateRefillingStats } = require("../../utils/calculateStats");
const { getColumnDefinitions, getDefaultColumns, HYDRO_TEST_COLUMNS, REFILLING_COLUMNS } = require("../../utils/helpers/columnDefinitions");
const parseColumns = require("../../utils/parseColumns");
const { htmlToPdfBuffer } = require("../../utils/pdfGenerator");
const safeGet = require("../../utils/safeGet");
const generateReportHTML = require("./template/reportTemplate");

// const buildFilter = require('../../utils/buildFilter');
// const parseColumns = require('../../utils/parseColumns');
// const { calculateServiceStats, calculateHydroStats, calculateRefillingStats } = require('../../utils/calculateStats');
// const {
//     getColumnDefinitions,
//     getDefaultColumns,
//     HYDRO_TEST_COLUMNS,
//     REFILLING_COLUMNS
// } = require('../../utils/helpers/columnDefinitions');
// const generateReportHTML = require('./template/reportTemplate');
// const { htmlToPdfBuffer } = require('../../utils/pdfGenerator');
// const safeGet = require('../../utils/safeGet');

/**
 * Report Service
 * Handles business logic for generating various reports
 */
class ReportService {

    /**
     * Get Service Report Data (Maintenance, Inspection, Testing)
     */
    async getServiceReportData(params) {
        const { serviceType, page = 0, limit = 50, columns: columnsParam } = params;

        // Get column definitions
        const columnDefs = getColumnDefinitions(serviceType);
        const defaultCols = getDefaultColumns(serviceType);
        const columns = parseColumns(columnsParam, columnDefs, defaultCols);

        // Build filters (use snake_case key)
        const { filter, assetFilters } = buildFilter(params, 'scheduled_date');

        // Add service type filter (use snake_case key)
        filter.inspection_type = serviceType;

        // Count total records
        const total = await ServiceSubmission.count({ where: filter });

        // Fetch data
        const submissions = await ServiceSubmission.findAll({
            where: filter,
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    where: Object.keys(assetFilters).length > 0 ? assetFilters : undefined,
                    attributes: [
                        'id',
                        ['asset_code', 'assetId'],
                        'type',
                        ['sub_type', 'subType'],
                        'location',
                        ['health_status', 'healthStatus'],
                        ['category_id', 'productCategoryId']
                    ],
                    required: true, // Inner join if asset filters exist
                    include: [
                        { model: Manufacturer, as: 'manufacturer', attributes: ['id', 'name'] },
                        { model: AssetMetadata, as: 'metadata', attributes: ['model'] },
                        { model: Building, as: 'building', attributes: ['building_name'] },
                        {
                            model: AssetSpecValue,
                            as: 'spec_values',
                            include: [{ model: SpecDefinition, as: 'spec_definition', attributes: ['spec_name'] }]
                        }
                    ]
                },
                {
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', ['plant_name', 'plantName'], ['address_line1', 'addressLine1']]
                }
            ],
            order: [['scheduled_date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(page) * parseInt(limit)
        });

        // Convert to plain objects
        const plainSubmissions = submissions.map(s => {
            const plain = s.get({ plain: true });

            if (plain.asset) {
                // Map Metadata
                plain.asset.model = plain.asset.metadata?.model || '';

                // Map Capacity
                const capacitySpec = plain.asset.spec_values?.find(sv => sv.spec_definition?.spec_name === 'Capacity');
                plain.asset.capacity = capacitySpec?.spec_value || '';
                plain.asset.capacityUnit = capacitySpec?.unit || '';

                // Map Building
                plain.asset.building = plain.asset.building?.building_name || '';
            }

            // Map Scheduled Date
            plain.scheduledDate = plain.scheduled_date || '';

            return plain;
        });

        // Calculate stats
        const stats = calculateServiceStats(plainSubmissions, serviceType);

        return {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            columns,
            serviceType,
            stats,
            data: plainSubmissions
        };
    }

    /**
     * Generate Service Report PDF
     */
    async generateServiceReportPDF(params) {
        const { serviceType, startDate, endDate, plantId: plantIdParam, plantIds, columns: columnsParam } = params;
        const plantId = plantIdParam || plantIds;

        // Get column definitions
        const columnDefs = getColumnDefinitions(serviceType);
        const defaultCols = getDefaultColumns(serviceType);
        const columns = parseColumns(columnsParam, columnDefs, defaultCols);

        // Build filters
        const { filter, assetFilters } = buildFilter(params, 'scheduled_date');
        filter.inspection_type = serviceType;

        // Fetch plant details if needed
        let plantDetails = null;
        if (plantId) {
            plantDetails = await Plant.findByPk(plantId, {
                attributes: [['plant_name', 'plantName'], ['address_line1', 'addressLine1']]
            });
        }

        // Fetch all data (no pagination)
        const submissions = await ServiceSubmission.findAll({
            where: filter,
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    where: Object.keys(assetFilters).length > 0 ? assetFilters : undefined,
                    attributes: [
                        'id',
                        ['asset_code', 'assetId'],
                        'type',
                        ['sub_type', 'subType'],
                        'location',
                        ['health_status', 'healthStatus'],
                        ['category_id', 'productCategoryId']
                    ],
                    required: true,
                    include: [
                        { model: Manufacturer, as: 'manufacturer', attributes: ['id', 'name'] },
                        { model: AssetMetadata, as: 'metadata', attributes: ['model'] },
                        { model: Building, as: 'building', attributes: ['building_name'] },
                        {
                            model: AssetSpecValue,
                            as: 'spec_values',
                            include: [{ model: SpecDefinition, as: 'spec_definition', attributes: ['spec_name'] }]
                        }
                    ]
                },
                {
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', ['plant_name', 'plantName'], ['address_line1', 'addressLine1']]
                },
                {
                    model: Technician,
                    as: 'technician',
                    include: [{ model: User, as: 'user', attributes: ['name'] }]
                }
            ],
            order: [['scheduled_date', 'DESC']]
        });

        const plainSubmissions = submissions.map(s => {
            const plain = s.get({ plain: true });

            if (plain.asset) {
                // Map Metadata
                plain.asset.model = plain.asset.metadata?.model || '';

                // Map Capacity
                const capacitySpec = plain.asset.spec_values?.find(sv => sv.spec_definition?.spec_name === 'Capacity');
                plain.asset.capacity = capacitySpec?.spec_value || '';
                plain.asset.capacityUnit = capacitySpec?.unit || '';

                // Map Building
                plain.asset.building = plain.asset.building?.building_name || '';
            }

            // Map Scheduled Date
            plain.scheduledDate = plain.scheduled_date || '';

            return plain;
        });
        const stats = calculateServiceStats(plainSubmissions, serviceType);

        // Generate Stats HTML
        let statsHTML = '';
        if (serviceType === 'Inspection') {
            statsHTML = `
                <div class="stat-box"><div class="stat-value">${stats.totalRecords}</div><div class="stat-label">Total Inspections</div></div>
                <div class="stat-box"><div class="stat-value">${stats.completed}</div><div class="stat-label">Completed</div></div>
                <div class="stat-box"><div class="stat-value">${stats.healthyAssets || 0}</div><div class="stat-label">Healthy Assets</div></div>
                <div class="stat-box"><div class="stat-value">${stats.unhealthyAssets || 0}</div><div class="stat-label">Unhealthy Assets</div></div>
            `;
        } else if (serviceType === 'Testing') {
            statsHTML = `
                <div class="stat-box"><div class="stat-value">${stats.totalRecords}</div><div class="stat-label">Total Tests</div></div>
                <div class="stat-box"><div class="stat-value">${stats.passed || 0}</div><div class="stat-label">Passed</div></div>
                <div class="stat-box"><div class="stat-value">${stats.failed || 0}</div><div class="stat-label">Failed</div></div>
                <div class="stat-box"><div class="stat-value">${stats.inProgress || 0}</div><div class="stat-label">In Progress</div></div>
            `;
        } else if (serviceType === 'Maintenance') {
            statsHTML = `
                <div class="stat-box"><div class="stat-value">${stats.totalRecords}</div><div class="stat-label">Total Maintenance</div></div>
                <div class="stat-box"><div class="stat-value">${stats.completed}</div><div class="stat-label">Completed</div></div>
                <div class="stat-box"><div class="stat-value">${stats.scheduled || 0}</div><div class="stat-label">Scheduled</div></div>
                <div class="stat-box"><div class="stat-value">${stats.inProgress || 0}</div><div class="stat-label">In Progress</div></div>
            `;
        }

        // Get plant info
        const plantName = plantDetails ? plantDetails.get('plantName') : (plainSubmissions.length > 0 ? safeGet(plainSubmissions[0], 'plant.plantName') : 'N/A');
        const plantAddress = plantDetails ? plantDetails.get('addressLine1') : (plainSubmissions.length > 0 ? safeGet(plainSubmissions[0], 'plant.addressLine1') : 'N/A');

        const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString() : 'N/A';
        const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString() : 'N/A';

        // Generate HTML
        const html = generateReportHTML({
            title: `${serviceType} Report`,
            subtitle: 'Service Records',
            meta: {
                reportPeriod: `${formattedStartDate} to ${formattedEndDate}`,
                serviceType,
                generatedOn: new Date().toLocaleString(),
                plant: plantName,
                address: plantAddress
            },
            statsHTML,
            columns,
            columnDefs,
            data: plainSubmissions,
            serviceType
        });

        return await htmlToPdfBuffer(html, {
            format: 'A4',
            printBackground: true,
            landscape: columns.length > 8
        });
    }

    /**
     * Get Hydrostatic Report Data
     */
    async getHydroReportData(params) {
        const { page = 0, limit = 50, columns: columnsParam } = params;

        const defaultCols = getDefaultColumns('Hydro');
        const columns = parseColumns(columnsParam, HYDRO_TEST_COLUMNS, defaultCols);

        // Filter by manufacturing_date as proxy for lastHPTestDate
        const { filter, assetFilters } = buildFilter(params, 'manufacturing_date');
        const whereClause = { ...filter, ...assetFilters };

        const total = await Asset.count({ where: whereClause });

        const assets = await Asset.findAll({
            where: whereClause,
            include: [
                { model: Plant, as: 'plant', attributes: ['id', ['plant_name', 'plantName'], ['address_line1', 'addressLine1']] },
                { model: Manufacturer, as: 'manufacturer', attributes: ['id', 'name'] },
                { model: AssetMetadata, as: 'metadata', attributes: ['model'] },
                { model: Building, as: 'building', attributes: ['building_name'] },
                {
                    model: AssetSpecValue,
                    as: 'spec_values',
                    include: [{ model: SpecDefinition, as: 'spec_definition', attributes: ['spec_name'] }]
                }
            ],
            attributes: [
                'id',
                ['asset_code', 'assetId'],
                'type',
                ['sub_type', 'subType'],
                'location',
                ['health_status', 'healthStatus'],
                ['manufacturing_date', 'manufacturingDate'],
                ['category_id', 'productCategoryId']
            ],
            order: [['manufacturing_date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(page) * parseInt(limit)
        });

        const plainAssets = assets.map(a => {
            const plain = a.get({ plain: true });

            // Map Metadata
            plain.model = plain.metadata?.model || '';

            // Map Capacity from Spec Values
            const capacitySpec = plain.spec_values?.find(sv => sv.spec_definition?.spec_name === 'Capacity');
            plain.capacity = capacitySpec?.spec_value || '';
            plain.capacityUnit = capacitySpec?.unit || '';

            // Map Building
            plain.building = plain.building?.building_name || '';

            // Calculate Dates
            if (plain.manufacturingDate) {
                // lastHPTestDate is the manufacturing date
                plain.lastHPTestDate = plain.manufacturingDate;

                // Next HP Test Due = Mfg Date + 5 Years
                const mfgDate = new Date(plain.manufacturingDate);
                const nextDueDate = new Date(mfgDate);
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 5);
                plain.nextHPTestDueDate = nextDueDate.toISOString().split('T')[0];
            }

            return plain;
        });

        const stats = calculateHydroStats(plainAssets);

        return {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            columns,
            stats,
            data: plainAssets
        };
    }

    /**
     * Generate Hydrostatic Report PDF
     */
    async generateHydroReportPDF(params) {
        const { startDate, endDate, plantId: plantIdParam, plantIds, columns: columnsParam } = params;
        const plantId = plantIdParam || plantIds;

        const defaultCols = getDefaultColumns('Hydro');
        const columns = parseColumns(columnsParam, HYDRO_TEST_COLUMNS, defaultCols);

        // Filter by manufacturing_date
        const { filter, assetFilters } = buildFilter(params, 'manufacturing_date');
        const whereClause = { ...filter, ...assetFilters };

        let plantDetails = null;
        if (plantId) {
            plantDetails = await Plant.findByPk(plantId, { attributes: [['plant_name', 'plantName'], ['address_line1', 'addressLine1']] });
        }

        const assets = await Asset.findAll({
            where: whereClause,
            include: [
                { model: Plant, as: 'plant', attributes: ['id', ['plant_name', 'plantName'], ['address_line1', 'addressLine1']] },
                { model: Manufacturer, as: 'manufacturer', attributes: ['id', 'name'] },
                { model: AssetMetadata, as: 'metadata', attributes: ['model'] },
                { model: Building, as: 'building', attributes: ['building_name'] },
                {
                    model: AssetSpecValue,
                    as: 'spec_values',
                    include: [{ model: SpecDefinition, as: 'spec_definition', attributes: ['spec_name'] }]
                }
            ],
            attributes: [
                'id',
                ['asset_code', 'assetId'],
                'type',
                ['sub_type', 'subType'],
                'location',
                ['health_status', 'healthStatus'],
                ['manufacturing_date', 'manufacturingDate'],
                ['category_id', 'productCategoryId']
            ],
            order: [['manufacturing_date', 'DESC']]
        });

        const plainAssets = assets.map(a => {
            const plain = a.get({ plain: true });

            // Map Metadata
            plain.model = plain.metadata?.model || '';

            // Map Capacity from Spec Values
            const capacitySpec = plain.spec_values?.find(sv => sv.spec_definition?.spec_name === 'Capacity');
            plain.capacity = capacitySpec?.spec_value || '';
            plain.capacityUnit = capacitySpec?.unit || '';

            // Map Building
            plain.building = plain.building?.building_name || '';

            // Calculate Dates
            if (plain.manufacturingDate) {
                plain.lastHPTestDate = plain.manufacturingDate;

                const mfgDate = new Date(plain.manufacturingDate);
                const nextDueDate = new Date(mfgDate);
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 5);
                plain.nextHPTestDueDate = nextDueDate.toISOString().split('T')[0];
            }

            return plain;
        });

        const stats = calculateHydroStats(plainAssets);

        const statsHTML = `
            <div class="stat-box"><div class="stat-value">${stats.totalAssets}</div><div class="stat-label">Total Assets</div></div>
            <div class="stat-box"><div class="stat-value">${stats.testedInPeriod}</div><div class="stat-label">Tested in Period</div></div>
            <div class="stat-box"><div class="stat-value">${stats.overdueTests}</div><div class="stat-label">Overdue Tests</div></div>
            <div class="stat-box"><div class="stat-value">${stats.upcomingTests}</div><div class="stat-label">Due Soon (30 days)</div></div>
        `;

        const plantName = plantDetails ? plantDetails.get('plantName') : (plainAssets.length > 0 ? safeGet(plainAssets[0], 'plant.plantName') : 'N/A');
        const plantAddress = plantDetails ? plantDetails.get('addressLine1') : (plainAssets.length > 0 ? safeGet(plainAssets[0], 'plant.addressLine1') : 'N/A');

        const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString() : 'N/A';
        const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString() : 'N/A';

        const html = generateReportHTML({
            title: 'Hydrostatic Test Report',
            subtitle: 'Fire Extinguisher Maintenance',
            meta: {
                reportPeriod: `${formattedStartDate} to ${formattedEndDate}`,
                generatedOn: new Date().toLocaleString(),
                plant: plantName,
                address: plantAddress
            },
            statsHTML,
            columns,
            columnDefs: HYDRO_TEST_COLUMNS,
            data: plainAssets,
            serviceType: 'Hydro'
        });

        return await htmlToPdfBuffer(html, {
            format: 'A4',
            printBackground: true,
            landscape: columns.length > 8
        });
    }

    /**
     * Get Refilling Report Data
     */
    async getRefillingReportData(params) {
        const { page = 0, limit = 50, columns: columnsParam } = params;

        const defaultCols = getDefaultColumns('Refilling');
        const columns = parseColumns(columnsParam, REFILLING_COLUMNS, defaultCols);

        // Filter by manufacturing_date as proxy for lastRefilledDate
        const { filter, assetFilters } = buildFilter(params, 'manufacturing_date');
        const whereClause = { ...filter, ...assetFilters };

        const total = await Asset.count({ where: whereClause });

        const assets = await Asset.findAll({
            where: whereClause,
            include: [
                { model: Plant, as: 'plant', attributes: ['id', ['plant_name', 'plantName'], ['address_line1', 'addressLine1']] },
                { model: Manufacturer, as: 'manufacturer', attributes: ['id', 'name'] },
                { model: AssetMetadata, as: 'metadata', attributes: ['model'] },
                { model: Building, as: 'building', attributes: ['building_name'] },
                {
                    model: AssetSpecValue,
                    as: 'spec_values',
                    include: [{ model: SpecDefinition, as: 'spec_definition', attributes: ['spec_name'] }]
                }
            ],
            attributes: [
                'id',
                ['asset_code', 'assetId'],
                'type',
                ['sub_type', 'subType'],
                'location',
                ['health_status', 'healthStatus'],
                ['manufacturing_date', 'manufacturingDate'],
                ['category_id', 'productCategoryId']
            ],
            order: [['manufacturing_date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(page) * parseInt(limit)
        });

        const plainAssets = assets.map(a => {
            const plain = a.get({ plain: true });

            // Map Metadata
            plain.model = plain.metadata?.model || '';

            // Map Capacity
            const capacitySpec = plain.spec_values?.find(sv => sv.spec_definition?.spec_name === 'Capacity');
            plain.capacity = capacitySpec?.spec_value || '';
            plain.capacityUnit = capacitySpec?.unit || '';

            // Map Building
            plain.building = plain.building?.building_name || '';

            // Calculate Dates
            if (plain.manufacturingDate) {
                // lastRefilledDate is the manufacturing date
                plain.lastRefilledDate = plain.manufacturingDate;

                // Next Refill Due - Assuming 1 year from manufacturing date for now based on typical cycles
                const mfgDate = new Date(plain.manufacturingDate);
                const nextDueDate = new Date(mfgDate);
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
                plain.nextRefillDueDate = nextDueDate.toISOString().split('T')[0];
            }

            return plain;
        });

        const stats = calculateRefillingStats(plainAssets);

        return {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            columns,
            stats,
            data: plainAssets
        };
    }

    /**
     * Generate Refilling Report PDF
     */
    async generateRefillingReportPDF(params) {
        const { startDate, endDate, plantId: plantIdParam, plantIds, columns: columnsParam } = params;
        const plantId = plantIdParam || plantIds;

        const defaultCols = getDefaultColumns('Refilling');
        const columns = parseColumns(columnsParam, REFILLING_COLUMNS, defaultCols);

        // Filter by manufacturing_date as proxy for lastRefilledDate
        const { filter, assetFilters } = buildFilter(params, 'manufacturing_date');
        const whereClause = { ...filter, ...assetFilters };

        let plantDetails = null;
        if (plantId) {
            plantDetails = await Plant.findByPk(plantId, { attributes: [['plant_name', 'plantName'], ['address_line1', 'addressLine1']] });
        }

        const assets = await Asset.findAll({
            where: whereClause,
            include: [
                { model: Plant, as: 'plant', attributes: ['id', ['plant_name', 'plantName'], ['address_line1', 'addressLine1']] },
                { model: Manufacturer, as: 'manufacturer', attributes: ['id', 'name'] },
                { model: AssetMetadata, as: 'metadata', attributes: ['model'] },
                { model: Building, as: 'building', attributes: ['building_name'] },
                {
                    model: AssetSpecValue,
                    as: 'spec_values',
                    include: [{ model: SpecDefinition, as: 'spec_definition', attributes: ['spec_name'] }]
                }
            ],
            attributes: [
                'id',
                ['asset_code', 'assetId'],
                'type',
                ['sub_type', 'subType'],
                'location',
                ['health_status', 'healthStatus'],
                ['manufacturing_date', 'manufacturingDate'],
                ['category_id', 'productCategoryId']
            ],
            order: [['manufacturing_date', 'DESC']]
        });

        const plainAssets = assets.map(a => {
            const plain = a.get({ plain: true });

            // Map Metadata
            plain.model = plain.metadata?.model || '';

            // Map Capacity
            const capacitySpec = plain.spec_values?.find(sv => sv.spec_definition?.spec_name === 'Capacity');
            plain.capacity = capacitySpec?.spec_value || '';
            plain.capacityUnit = capacitySpec?.unit || '';

            // Map Building
            plain.building = plain.building?.building_name || '';

            // Calculate Dates
            if (plain.manufacturingDate) {
                // lastRefilledDate is the manufacturing date
                plain.lastRefilledDate = plain.manufacturingDate;

                // Next Refill Due
                const mfgDate = new Date(plain.manufacturingDate);
                const nextDueDate = new Date(mfgDate);
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
                plain.nextRefillDueDate = nextDueDate.toISOString().split('T')[0];
            }

            return plain;
        });
        const stats = calculateRefillingStats(plainAssets);

        const statsHTML = `
            <div class="stat-box"><div class="stat-value">${stats.totalAssets}</div><div class="stat-label">Total Assets</div></div>
            <div class="stat-box"><div class="stat-value">${stats.refilledInPeriod}</div><div class="stat-label">Refilled in Period</div></div>
            <div class="stat-box"><div class="stat-value">${stats.refilledLast30Days}</div><div class="stat-label">Refilled Last 30 Days</div></div>
            <div class="stat-box"><div class="stat-value">${stats.neverRefilled}</div><div class="stat-label">Never Refilled</div></div>
        `;

        const plantName = plantDetails ? plantDetails.get('plantName') : (plainAssets.length > 0 ? safeGet(plainAssets[0], 'plant.plantName') : 'N/A');
        const plantAddress = plantDetails ? plantDetails.get('addressLine1') : (plainAssets.length > 0 ? safeGet(plainAssets[0], 'plant.addressLine1') : 'N/A');

        const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString() : 'N/A';
        const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString() : 'N/A';

        const html = generateReportHTML({
            title: 'Refill Status Report',
            subtitle: 'Fire Extinguisher Maintenance',
            meta: {
                reportPeriod: `${formattedStartDate} to ${formattedEndDate}`,
                generatedOn: new Date().toLocaleString(),
                plant: plantName,
                address: plantAddress
            },
            statsHTML,
            columns,
            columnDefs: REFILLING_COLUMNS,
            data: plainAssets,
            serviceType: 'Refilling'
        });

        return await htmlToPdfBuffer(html, {
            format: 'A4',
            printBackground: true,
            landscape: columns.length > 8
        });
    }
}

module.exports = new ReportService();
