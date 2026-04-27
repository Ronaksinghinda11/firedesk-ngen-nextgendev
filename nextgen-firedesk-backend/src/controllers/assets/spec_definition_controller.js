/**
 * Spec Definition Controller
 * Handles HTTP requests and responses for spec definition operations
 */

const spec_definition_service = require('../../services/assets/spec_definition_service');

/**
 * Get all spec definitions
 */
const get_all = async (req, res) => {
    try {
        const result = await spec_definition_service.get_all(req.query);

        return res.status(200).json({
            success: true,
            data: result.specs,
            pagination: result.pagination
        });

    } catch (error) {
        console.error('Error fetching all spec definitions:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch spec definitions',
            error: error.message
        });
    }
};

/**
 * Get all spec definitions for a category
 */
const get_by_category = async (req, res) => {
    try {
        const { category_id } = req.params;
        const specs = await spec_definition_service.get_by_category(category_id);

        return res.status(200).json({
            success: true,
            data: specs
        });

    } catch (error) {
        console.error('Error fetching spec definitions:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch spec definitions',
            error: error.message
        });
    }
};

/**
 * Get single spec definition
 */
const get_by_id = async (req, res) => {
    try {
        const { id } = req.params;
        const spec = await spec_definition_service.get_by_id(id);

        if (!spec) {
            return res.status(404).json({
                success: false,
                message: 'Spec definition not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: spec
        });

    } catch (error) {
        console.error('Error fetching spec definition:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch spec definition',
            error: error.message
        });
    }
};

/**
 * Create spec definition
 */
const create = async (req, res) => {
    try {
        const spec = await spec_definition_service.create_spec(req.body, req.user);

        return res.status(201).json({
            success: true,
            message: 'Spec definition created successfully',
            data: spec
        });

    } catch (error) {
        console.error('Error creating spec definition:', error);

        if (error.message === 'Category not found') {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to create spec definition',
            error: error.message
        });
    }
};

/**
 * Update spec definition
 */
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const spec = await spec_definition_service.update_spec(id, req.body, req.user);

        return res.status(200).json({
            success: true,
            message: 'Spec definition updated successfully',
            data: spec
        });

    } catch (error) {
        console.error('Error updating spec definition:', error);

        if (error.message === 'Spec definition not found') {
            return res.status(404).json({
                success: false,
                message: 'Spec definition not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to update spec definition',
            error: error.message
        });
    }
};

/**
 * Delete spec definition
 */
const delete_spec = async (req, res) => {
    try {
        const { id } = req.params;
        await spec_definition_service.delete_spec(id, req.user);

        return res.status(200).json({
            success: true,
            message: 'Spec definition deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting spec definition:', error);

        if (error.message === 'Spec definition not found') {
            return res.status(404).json({
                success: false,
                message: 'Spec definition not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to delete spec definition',
            error: error.message
        });
    }
};

/**
 * Bulk create spec definitions for a category
 */
const bulk_create = async (req, res) => {
    try {
        const { category_id, specs } = req.body;
        const created_specs = await spec_definition_service.bulk_create_specs(category_id, specs, req.user);

        return res.status(201).json({
            success: true,
            message: `${created_specs.length} spec definitions created successfully`,
            data: created_specs
        });

    } catch (error) {
        console.error('Error bulk creating spec definitions:', error);

        if (error.message === 'Category not found') {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to bulk create spec definitions',
            error: error.message
        });
    }
};

/**
 * Get unique ITM parameters for autocomplete
 */
const get_itm_parameters = async (req, res) => {
    try {
        const { SpecDefinition } = require('../../models');
        const { Op } = require('sequelize');

        // Get all spec_unit values that are non-null arrays
        const specs = await SpecDefinition.findAll({
            where: {
                spec_unit: { [Op.not]: null }
            },
            attributes: ['spec_unit'],
            raw: true
        });

        // Extract unique values from all spec_unit arrays
        const allParameters = new Set();
        specs.forEach(spec => {
            if (Array.isArray(spec.spec_unit)) {
                spec.spec_unit.forEach(param => {
                    if (param && typeof param === 'string' && param.trim()) {
                        allParameters.add(param.trim());
                    }
                });
            }
        });

        return res.status(200).json({
            success: true,
            itmParameters: Array.from(allParameters).sort()
        });

    } catch (error) {
        console.error('Error fetching ITM parameters:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch ITM parameters',
            error: error.message
        });
    }
};

module.exports = {
    get_all,
    get_by_category,
    get_by_id,
    create,
    update,
    delete: delete_spec,
    bulk_create,
    get_itm_parameters
};
