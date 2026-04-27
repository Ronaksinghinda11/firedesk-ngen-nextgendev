/**
 * Manufacturer Controller
 * Handles manufacturer CRUD operations - validation only, logic in service
 */

const manufacturerService = require('../../services/assets/manufacturer_service');

/**
 * Get all manufacturers
 */
const getAll = async (req, res) => {
    try {
        const result = await manufacturerService.getAllManufacturers(req.query);

        res.status(200).json({
            success: true,
            data: result.manufacturers,
            manufacturers: result.manufacturers,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching manufacturers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch manufacturers',
            error: error.message
        });
    }
};

/**
 * Get manufacturer by ID
 */
const getById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer ID is required'
            });
        }

        const manufacturer = await manufacturerService.getManufacturerById(id);

        if (!manufacturer) {
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found'
            });
        }

        res.status(200).json({
            success: true,
            data: manufacturer
        });
    } catch (error) {
        console.error('Error fetching manufacturer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch manufacturer',
            error: error.message
        });
    }
};

/**
 * Create new manufacturer
 */
const create = async (req, res) => {
    try {
        const { name } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer name is required'
            });
        }

        const result = await manufacturerService.createManufacturer(name);

        res.status(result.isNew ? 201 : 200).json({
            success: true,
            data: result.manufacturer,
            message: result.isNew ? 'Manufacturer created successfully' : 'Manufacturer already exists'
        });
    } catch (error) {
        console.error('Error creating manufacturer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create manufacturer',
            error: error.message
        });
    }
};

/**
 * Update manufacturer
 */
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer ID is required'
            });
        }

        const manufacturer = await manufacturerService.updateManufacturer(id, { name });

        res.status(200).json({
            success: true,
            data: manufacturer,
            message: 'Manufacturer updated successfully'
        });
    } catch (error) {
        if (error.message === 'Manufacturer not found') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        console.error('Error updating manufacturer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update manufacturer',
            error: error.message
        });
    }
};

/**
 * Delete manufacturer
 */
const deleteManufacturer = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer ID is required'
            });
        }

        await manufacturerService.deleteManufacturer(id);

        res.status(200).json({
            success: true,
            message: 'Manufacturer deleted successfully'
        });
    } catch (error) {
        if (error.message === 'Manufacturer not found') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        console.error('Error deleting manufacturer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete manufacturer',
            error: error.message
        });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteManufacturer
};
