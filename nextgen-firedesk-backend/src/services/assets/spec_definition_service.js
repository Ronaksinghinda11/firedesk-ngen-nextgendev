/**
 * Spec Definition Service
 * Business logic for spec definition operations
 */

const { SpecDefinition, Category } = require('../../models');
const auditService = require('../audit/audit_service');

/**
 * Get all spec definitions with optional filtering
 */
const get_all = async (filters = {}) => {
    const { category_id, page = 1, limit = 50 } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (category_id) {
        where.category_id = category_id;
    }

    const { count, rows: specs } = await SpecDefinition.findAndCountAll({
        where,
        include: [{ model: Category, as: 'category', attributes: ['id', 'category_name'] }],
        order: [['category_id', 'ASC'], ['display_order', 'ASC'], ['spec_name', 'ASC']],
        limit: parseInt(limit),
        offset
    });

    return {
        specs,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(count / parseInt(limit))
        }
    };
};

/**
 * Get all spec definitions for a category
 */
const get_by_category = async (category_id) => {
    return await SpecDefinition.findAll({
        where: { category_id },
        order: [['display_order', 'ASC'], ['spec_name', 'ASC']]
    });
};

/**
 * Get single spec definition
 */
const get_by_id = async (id) => {
    return await SpecDefinition.findByPk(id, {
        include: [{ model: Category, as: 'category' }]
    });
};

/**
 * Create spec definition
 * If display_order is provided, shifts existing specs at that position and after
 */
const create_spec = async (spec_data, user = null) => {
    const {
        category_id,
        spec_name,
        spec_label,
        spec_type,
        spec_unit,
        is_required,
        display_order,
        select_options
    } = spec_data;

    // Verify category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
        throw new Error('Category not found');
    }

    // If display_order is provided, shift existing specs
    if (display_order !== undefined && display_order !== null) {
        // Get all specs at or after the target position
        const specsToShift = await SpecDefinition.findAll({
            where: {
                category_id,
                display_order: { [require('sequelize').Op.gte]: display_order }
            },
            order: [['display_order', 'DESC']] // Update from highest first to avoid conflicts
        });

        // Shift each spec's display_order by 1
        for (const spec of specsToShift) {
            await spec.update({ display_order: spec.display_order + 1 });
        }
    } else {
        // If no display_order provided, set it to max + 1
        const maxOrderSpec = await SpecDefinition.findOne({
            where: { category_id },
            order: [['display_order', 'DESC']]
        });
        spec_data.display_order = (maxOrderSpec?.display_order || 0) + 1;
    }

    const newSpec = await SpecDefinition.create({
        category_id,
        spec_name,
        spec_label,
        spec_type,
        spec_unit,
        is_required: is_required || false,
        display_order: spec_data.display_order,
        select_options
    });

    // Audit Log - Log under category for visibility
    try {
        await auditService.log({
            entityType: 'category',
            entityId: category_id,
            entityName: category.category_name,
            action: 'UPDATE',
            fieldName: 'spec_definitions',
            oldValue: null,
            newValue: spec_name,
            user: user ? { id: user.id, name: user.name, type: user.userType } : null,
            source: 'ui',
            metadata: { specAction: 'CREATE', specId: newSpec.id, specName: spec_name }
        });
    } catch (error) {
        console.error('Audit log failed for create_spec:', error.message);
    }

    return newSpec;
};

/**
 * Update spec definition
 * If display_order changes, reorders other specs accordingly
 */
const update_spec = async (id, spec_data, user = null) => {
    const {
        spec_name,
        spec_label,
        spec_type,
        spec_unit,
        is_required,
        display_order,
        select_options
    } = spec_data;

    const spec = await SpecDefinition.findByPk(id, {
        include: [{ model: Category, as: 'category' }]
    });
    if (!spec) {
        throw new Error('Spec definition not found');
    }

    // Capture old values for audit
    const oldValues = spec.toJSON();

    const oldOrder = spec.display_order;
    const newOrder = display_order;

    // Handle reordering if display_order changed
    if (newOrder !== undefined && newOrder !== null && newOrder !== oldOrder) {
        const { Op } = require('sequelize');

        if (newOrder < oldOrder) {
            // Moving up: shift specs between newOrder and oldOrder-1 down by 1
            await SpecDefinition.increment('display_order', {
                by: 1,
                where: {
                    category_id: spec.category_id,
                    id: { [Op.ne]: id },
                    display_order: {
                        [Op.gte]: newOrder,
                        [Op.lt]: oldOrder
                    }
                }
            });
        } else {
            // Moving down: shift specs between oldOrder+1 and newOrder up by 1
            await SpecDefinition.increment('display_order', {
                by: -1,
                where: {
                    category_id: spec.category_id,
                    id: { [Op.ne]: id },
                    display_order: {
                        [Op.gt]: oldOrder,
                        [Op.lte]: newOrder
                    }
                }
            });
        }
    }

    await spec.update({
        spec_name,
        spec_label,
        spec_type,
        spec_unit,
        is_required,
        display_order,
        select_options
    });

    // Audit Log - Log under category for visibility
    try {
        const changes = auditService.calculateChanges(oldValues, spec.toJSON());
        if (changes) {
            await auditService.log({
                entityType: 'category',
                entityId: spec.category_id,
                entityName: spec.category?.category_name || 'Unknown Category',
                action: 'UPDATE',
                fieldName: 'spec_definitions',
                changes,
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui',
                metadata: { specAction: 'UPDATE', specId: id, specName: spec.spec_name }
            });
        }
    } catch (error) {
        console.error('Audit log failed for update_spec:', error.message);
    }

    return spec;
};

/**
 * Delete spec definition
 */
const delete_spec = async (id, user = null) => {
    const spec = await SpecDefinition.findByPk(id, {
        include: [{ model: Category, as: 'category' }]
    });
    if (!spec) {
        throw new Error('Spec definition not found');
    }

    const specName = spec.spec_name;
    const categoryId = spec.category_id;
    const categoryName = spec.category?.category_name || 'Unknown Category';

    await spec.destroy();

    // Audit Log - Log under category for visibility
    try {
        await auditService.log({
            entityType: 'category',
            entityId: categoryId,
            entityName: categoryName,
            action: 'UPDATE',
            fieldName: 'spec_definitions',
            oldValue: specName,
            newValue: null,
            user: user ? { id: user.id, name: user.name, type: user.userType } : null,
            source: 'ui',
            metadata: { specAction: 'DELETE', specId: id, specName: specName }
        });
    } catch (error) {
        console.error('Audit log failed for delete_spec:', error.message);
    }

    return true;
};

/**
 * Bulk create spec definitions for a category
 */
const bulk_create_specs = async (category_id, specs, user = null) => {
    // Verify category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
        throw new Error('Category not found');
    }

    const createdSpecs = await SpecDefinition.bulkCreate(
        specs.map((spec, index) => ({
            category_id,
            spec_name: spec.spec_name,
            spec_label: spec.spec_label,
            spec_type: spec.spec_type,
            spec_unit: spec.spec_unit,
            is_required: spec.is_required || false,
            display_order: spec.display_order || index + 1,
            select_options: spec.select_options
        }))
    );

    // Audit Log - Log under category for visibility
    try {
        await auditService.log({
            entityType: 'category',
            entityId: category_id,
            entityName: category.category_name,
            action: 'UPDATE',
            fieldName: 'spec_definitions',
            oldValue: null,
            newValue: `${createdSpecs.length} specs added`,
            user: user ? { id: user.id, name: user.name, type: user.userType } : null,
            source: 'ui',
            metadata: {
                specAction: 'BULK_CREATE',
                specsCreated: createdSpecs.length,
                specNames: specs.map(s => s.spec_name)
            }
        });
    } catch (error) {
        console.error('Audit log failed for bulk_create_specs:', error.message);
    }

    return createdSpecs;
};

module.exports = {
    get_all,
    get_by_category,
    get_by_id,
    create_spec,
    update_spec,
    delete_spec,
    bulk_create_specs
};
