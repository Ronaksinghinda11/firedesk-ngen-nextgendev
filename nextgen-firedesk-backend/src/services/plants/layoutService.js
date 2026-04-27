/**
 * Layout Service
 * Business logic for layout operations
 */

const { Layout, Floor, Building, Plant, Wing } = require('../../models/plants');
const auditService = require('../audit/audit_service');
const { storeFileInDatabase, getBinaryAsDataUrl, cleanupTempFile, validateLayoutFile } = require('../../utils/layoutStorage');

/**
 * Create a new layout
 * @param {Object} layoutData - Layout data
 * @returns {Promise<Object>} Created layout
 */
const create = async (layoutData, user = null) => {
    const { plantId, buildingId, floorId, wingId, health, svgPicture, layoutType, layoutUrl } = layoutData;

    // Verify plant exists
    const plant = await Plant.findByPk(plantId);
    if (!plant) {
        throw new Error('Plant not found');
    }

    const layout = await Layout.create({
        plant_id: plantId,
        building_id: buildingId,
        floor_id: floorId,
        wing_id: wingId || null,
        health,
        svg_picture: svgPicture,
        layout_type: layoutType,
        layout_url: layoutUrl
    });

    // Audit Log
    try {
        await auditService.log({
            entityType: 'floor',
            entityId: layout.id,
            entityName: `Layout for Floor ${floorId}`,
            action: 'CREATE',
            user: user ? { id: user.id, name: user.name, type: user.userType } : null,
            source: 'ui',
            metadata: { plantId, buildingId, floorId, layoutType, isLayout: true }
        });
    } catch (error) {
        console.error('Audit log failed for create layout:', error.message);
    }

    return layout;
};

/**
 * Get all layouts with optional filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of layouts
 */
const getAll = async (filters = {}) => {
    const { plantId, buildingId, floorId, wingId } = filters;

    const whereClause = {};
    if (plantId) whereClause.plant_id = plantId;
    if (buildingId) whereClause.building_id = buildingId;
    if (floorId) whereClause.floor_id = floorId;
    if (wingId) whereClause.wing_id = wingId;

    const layouts = await Layout.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        attributes: { exclude: ['svg_binary'] } // Exclude large binary from list
    });

    return layouts;
};

/**
 * Get layout by ID with full relations
 * @param {string} id - Layout UUID
 * @param {Object} options - Additional options
 * @returns {Promise<Object|null>} Layout with dataUrl or null
 */
const getById = async (id, options = {}) => {
    const { managerPlantIds = null } = options;

    const layout = await Layout.findByPk(id, {
        include: [
            { model: Floor, as: 'floor' },
            { model: Building, as: 'building' },
            { model: Plant, as: 'plant' },
            { model: Wing, as: 'wing' }
        ]
    });

    if (!layout) {
        return null;
    }

    // Check manager access
    if (managerPlantIds && !managerPlantIds.includes(layout.plant_id)) {
        throw new Error('Access denied. This plant is not assigned to you.');
    }

    // Get raw JSON data
    const rawData = layout.toJSON();

    // Transform snake_case to camelCase for frontend compatibility
    const responseData = {
        id: rawData.id,
        plantId: rawData.plant_id,
        buildingId: rawData.building_id,
        floorId: rawData.floor_id,
        wingId: rawData.wing_id,
        svgPicture: rawData.svg_picture,
        fileName: rawData.file_name,
        fileSizeBytes: rawData.file_size_bytes,
        mimeType: rawData.mime_type,
        healthStatus: rawData.health_status,
        createdAt: rawData.created_at,
        updatedAt: rawData.updated_at,
        // Include related models (already camelCase from Sequelize associations)
        floor: rawData.floor,
        building: rawData.building ? {
            ...rawData.building,
            buildingName: rawData.building.building_name
        } : null,
        plant: rawData.plant ? {
            ...rawData.plant,
            plantName: rawData.plant.plant_name
        } : null,
        wing: rawData.wing,
        // Add data URL for SVG
        dataUrl: getBinaryAsDataUrl(layout)
    };

    return responseData;
};

/**
 * Get layout by floor ID (one-to-one relationship)
 * @param {string} floorId - Floor UUID
 * @param {Object} options - Additional options
 * @returns {Promise<Object|null>} Layout with dataUrl or null
 */
const getByFloorId = async (floorId, options = {}) => {
    const { managerPlantIds = null } = options;

    const layout = await Layout.findOne({
        where: { floor_id: floorId },
        include: [
            { model: Floor, as: 'floor' },
            { model: Building, as: 'building' },
            { model: Plant, as: 'plant' },
            { model: Wing, as: 'wing' }
        ]
    });

    if (!layout) {
        return null;
    }

    // Check manager access
    if (managerPlantIds && !managerPlantIds.includes(layout.plant_id)) {
        throw new Error('Access denied. This plant is not assigned to you.');
    }

    // Get raw JSON data
    const rawData = layout.toJSON();

    // Transform snake_case to camelCase for frontend compatibility
    const responseData = {
        id: rawData.id,
        plantId: rawData.plant_id,
        buildingId: rawData.building_id,
        floorId: rawData.floor_id,
        wingId: rawData.wing_id,
        svgPicture: rawData.svg_picture,
        fileName: rawData.file_name,
        fileSizeBytes: rawData.file_size_bytes,
        mimeType: rawData.mime_type,
        healthStatus: rawData.health_status,
        createdAt: rawData.created_at,
        updatedAt: rawData.updated_at,
        // Include related models
        floor: rawData.floor,
        building: rawData.building ? {
            ...rawData.building,
            buildingName: rawData.building.building_name
        } : null,
        plant: rawData.plant ? {
            ...rawData.plant,
            plantName: rawData.plant.plant_name
        } : null,
        wing: rawData.wing,
        // Add data URL for SVG
        dataUrl: getBinaryAsDataUrl(layout)
    };

    return responseData;
};

/**
 * Get all layouts for a plant
 * @param {string} plantId - Plant UUID
 * @returns {Promise<Array>} Array of layouts with dataUrls
 */
const getByPlantId = async (plantId) => {
    const layouts = await Layout.findAll({
        where: { plant_id: plantId },
        include: [
            { model: Floor, as: 'floor' },
            { model: Building, as: 'building' },
            { model: Wing, as: 'wing' }
        ]
    });

    return layouts.map(layout => {
        const rawData = layout.toJSON();

        // Transform snake_case to camelCase
        const data = {
            id: rawData.id,
            plantId: rawData.plant_id,
            buildingId: rawData.building_id,
            floorId: rawData.floor_id,
            wingId: rawData.wing_id,
            floor: rawData.floor ? {
                ...rawData.floor,
                floorName: rawData.floor.floor_name
            } : null,
            building: rawData.building ? {
                ...rawData.building,
                buildingName: rawData.building.building_name
            } : null,
            wing: rawData.wing,
            dataUrl: getBinaryAsDataUrl(layout)
        };

        return data;
    });
};

/**
 * Update a layout
 * @param {string} id - Layout UUID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated layout
 */
const update = async (id, updateData, user = null) => {
    const layout = await Layout.findByPk(id);

    if (!layout) {
        throw new Error('Layout not found');
    }

    const { plantId, buildingId, floorId, wingId, health, svgPicture, layoutType, layoutUrl } = updateData;

    // If plantId is being updated, verify it exists
    if (plantId && plantId !== layout.plant_id) {
        const plant = await Plant.findByPk(plantId);
        if (!plant) {
            throw new Error('Plant not found');
        }
    }

    await layout.update({
        plant_id: plantId !== undefined ? plantId : layout.plant_id,
        building_id: buildingId !== undefined ? buildingId : layout.building_id,
        floor_id: floorId !== undefined ? floorId : layout.floor_id,
        wing_id: wingId !== undefined ? wingId : layout.wing_id,
        health: health !== undefined ? health : layout.health,
        svg_picture: svgPicture !== undefined ? svgPicture : layout.svg_picture,
        layout_type: layoutType !== undefined ? layoutType : layout.layout_type,
        layout_url: layoutUrl !== undefined ? layoutUrl : layout.layout_url
    });

    // Audit Log
    try {
        await auditService.log({
            entityType: 'floor',
            entityId: layout.id,
            entityName: `Layout ${layout.file_name || id}`,
            action: 'UPDATE', // Layout update is conceptually updating the floor's representation
            user: user ? { id: user.id, name: user.name, type: user.userType } : null,
            source: 'ui',
            metadata: { updateData, isLayout: true }
        });
    } catch (error) {
        console.error('Audit log failed for update layout:', error.message);
    }

    return layout;
};

/**
 * Delete a layout
 * @param {string} id - Layout UUID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteLayout = async (id, user = null) => {
    const layout = await Layout.findByPk(id);

    if (!layout) {
        throw new Error('Layout not found');
    }

    const layoutName = layout.file_name || `Layout ${id}`;
    const plantId = layout.plant_id;

    await layout.destroy();

    // Audit Log
    try {
        await auditService.log({
            entityType: 'floor',
            entityId: id,
            entityName: layoutName,
            action: 'DELETE',
            user: user ? { id: user.id, name: user.name, type: user.userType } : null,
            source: 'ui',
            metadata: { plantId, isLayout: true }
        });
    } catch (error) {
        console.error('Audit log failed for delete layout:', error.message);
    }

    return true;
};

/**
 * Upload or replace layout for a floor (binary storage)
 * @param {Object} data - Layout data
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} Created or updated layout with dataUrl
 */
const uploadLayout = async (data, file, user = null) => {
    const { plantId, buildingId, floorId, wingId, layoutType, health } = data;

    // Validate file (accepts SVG and PDF)
    validateLayoutFile(file);

    // Verify floor exists
    const floor = await Floor.findByPk(floorId);
    if (!floor) {
        throw new Error(`Floor not found with ID: ${floorId}. Please refresh the page and try again.`);
    }

    // Store file data in binary format
    const fileData = await storeFileInDatabase(file.path, file.originalname);

    // Check for existing layout
    const existingLayout = await Layout.findOne({
        where: {
            floor_id: floorId,
            wing_id: wingId || null
        }
    });

    let layout;
    let isUpdate = false;

    if (existingLayout) {
        // Update existing layout
        await existingLayout.update({
            ...fileData,
            layout_type: layoutType || existingLayout.layout_type,
            health: health || existingLayout.health,
            plant_id: plantId || existingLayout.plant_id,
            building_id: buildingId || existingLayout.building_id
        });
        layout = existingLayout;
        isUpdate = true;
    } else {
        // Create new layout
        layout = await Layout.create({
            plant_id: plantId,
            building_id: buildingId,
            floor_id: floorId,
            wing_id: wingId || null,
            layout_type: layoutType || 'floorplan',
            health: health || 'good',
            ...fileData
        });
    }

    // Audit Log
    try {
        const action = isUpdate ? 'UPDATE' : 'CREATE';
        await auditService.log({
            entityType: 'floor',
            entityId: layout.id,
            entityName: file.originalname,
            action: action,
            fieldName: 'file',
            user: user ? { id: user.id, name: user.name, type: user.userType } : null,
            source: 'ui',
            metadata: {
                fileSize: file.size,
                mimeType: file.mimetype,
                plantId: layout.plant_id,
                floorId: layout.floor_id,
                isLayout: true
            }
        });
    } catch (error) {
        console.error('Audit log failed for upload layout:', error.message);
    }

    // Cleanup temp file
    cleanupTempFile(file.path);

    // Prepare response with data URL
    const responseData = {
        ...layout.toJSON(),
        dataUrl: getBinaryAsDataUrl(layout),
        isUpdate
    };

    // Remove binary from response
    delete responseData.svg_binary;

    return responseData;
};

module.exports = {
    create,
    getAll,
    getById,
    getByFloorId,
    getByPlantId,
    update,
    delete: deleteLayout,
    uploadLayout
};
