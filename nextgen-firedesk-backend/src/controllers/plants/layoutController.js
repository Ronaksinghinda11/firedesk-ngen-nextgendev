/**
 * Layout Controller
 * Handles HTTP requests for layout operations
 */

const layoutService = require('../../services/plants/layoutService');
const { cleanupTempFile } = require('../../utils/layoutStorage');

const layoutController = {
    /**
     * Create a new layout
     */
    async create(req, res) {
        try {
            const layout = await layoutService.create(req.body, req.user);

            return res.status(201).json({
                success: true,
                message: 'Layout created successfully',
                data: layout
            });
        } catch (error) {
            console.error('Error creating layout:', error);
            return res.status(error.message.includes('not found') ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to create layout',
                error: error.message
            });
        }
    },

    /**
     * Get all layouts with optional filters
     */
    async getAll(req, res) {
        try {
            const layouts = await layoutService.getAll(req.query);

            return res.status(200).json({
                success: true,
                data: layouts
            });
        } catch (error) {
            console.error('Error fetching layouts:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch layouts',
                error: error.message
            });
        }
    },

    /**
     * Get a single layout by ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const managerPlantIds = req.managerPlantIds || null;

            const layout = await layoutService.getById(id, { managerPlantIds });

            if (!layout) {
                return res.status(404).json({
                    success: false,
                    message: 'Layout not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: layout
            });
        } catch (error) {
            console.error('Error fetching layout:', error);

            if (error.message.includes('Access denied')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch layout',
                error: error.message
            });
        }
    },

    /**
     * Get layout by floor ID
     */
    async getByFloorId(req, res) {
        try {
            const { floorId } = req.params;
            const managerPlantIds = req.managerPlantIds || null;

            const layout = await layoutService.getByFloorId(floorId, { managerPlantIds });

            if (!layout) {
                return res.status(404).json({
                    success: false,
                    message: 'No layout found for this floor',
                    data: null
                });
            }

            return res.status(200).json({
                success: true,
                data: layout
            });
        } catch (error) {
            console.error('Error fetching layout by floor:', error);

            if (error.message.includes('Access denied')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch layout',
                error: error.message
            });
        }
    },

    /**
     * Get all layouts for a plant
     */
    async getByPlantId(req, res) {
        try {
            const { plantId } = req.params;

            const layouts = await layoutService.getByPlantId(plantId);

            return res.status(200).json({
                success: true,
                data: layouts
            });
        } catch (error) {
            console.error('Error fetching layouts:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch layouts',
                error: error.message
            });
        }
    },

    /**
     * Update a layout
     */
    async update(req, res) {
        try {
            const { id } = req.params;

            const layout = await layoutService.update(id, req.body, req.user);

            return res.status(200).json({
                success: true,
                message: 'Layout updated successfully',
                data: layout
            });
        } catch (error) {
            console.error('Error updating layout:', error);
            return res.status(error.message.includes('not found') ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to update layout',
                error: error.message
            });
        }
    },

    /**
     * Delete a layout
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            await layoutService.delete(id, req.user);

            return res.status(200).json({
                success: true,
                message: 'Layout deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting layout:', error);
            return res.status(error.message.includes('not found') ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to delete layout',
                error: error.message
            });
        }
    },

    /**
     * Upload or replace layout for a floor
     */
    async uploadLayout(req, res) {
        let tempFilePath = null;

        try {
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const { floorId } = req.body;
            if (!floorId) {
                cleanupTempFile(file.path);
                return res.status(400).json({
                    success: false,
                    message: 'floorId is required'
                });
            }

            tempFilePath = file.path;

            const result = await layoutService.uploadLayout(req.body, file, req.user);

            return res.status(result.isUpdate ? 200 : 201).json({
                success: true,
                message: result.isUpdate ? 'Layout updated successfully' : 'Layout uploaded successfully',
                data: result
            });
        } catch (error) {
            // Cleanup temp file on error
            if (tempFilePath) {
                cleanupTempFile(tempFilePath);
            }

            console.error('Error uploading layout:', error);

            // Handle unique constraint violation
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({
                    success: false,
                    message: 'A layout already exists for this floor. This should not happen - contact support.'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to upload layout',
                error: error.message
            });
        }
    }
};

module.exports = layoutController;
