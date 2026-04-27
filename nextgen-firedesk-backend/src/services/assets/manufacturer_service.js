/**
 * Manufacturer Service
 * Business logic for manufacturer operations
 */

const { Op } = require('sequelize');
const { Manufacturer } = require('../../models');

/**
 * Get all manufacturers with optional search
 */
const getAllManufacturers = async (filters = {}) => {
    const { search, page = 1, limit = 100 } = filters;

    const where = {};
    if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: manufacturers } = await Manufacturer.findAndCountAll({
        where,
        attributes: ['id', 'name', 'created_at', 'updated_at'],
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset
    });

    return {
        manufacturers,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
        }
    };
};

/**
 * Get manufacturer by ID
 */
const getManufacturerById = async (id) => {
    return await Manufacturer.findByPk(id);
};

/**
 * Create or find existing manufacturer
 */
const createManufacturer = async (name) => {
    if (!name || !name.trim()) {
        throw new Error('Manufacturer name is required');
    }

    const trimmedName = name.trim();

    // Check if manufacturer already exists (case-insensitive)
    const existing = await Manufacturer.findOne({
        where: { name: { [Op.iLike]: trimmedName } }
    });

    if (existing) {
        return { manufacturer: existing, isNew: false };
    }

    // Create new manufacturer
    const manufacturer = await Manufacturer.create({ name: trimmedName });
    return { manufacturer, isNew: true };
};

/**
 * Update manufacturer
 */
const updateManufacturer = async (id, data) => {
    const manufacturer = await Manufacturer.findByPk(id);

    if (!manufacturer) {
        throw new Error('Manufacturer not found');
    }

    if (data.name) {
        manufacturer.name = data.name.trim();
        await manufacturer.save();
    }

    return manufacturer;
};

/**
 * Delete manufacturer
 */
const deleteManufacturer = async (id) => {
    const manufacturer = await Manufacturer.findByPk(id);

    if (!manufacturer) {
        throw new Error('Manufacturer not found');
    }

    await manufacturer.destroy();
    return true;
};

module.exports = {
    getAllManufacturers,
    getManufacturerById,
    createManufacturer,
    updateManufacturer,
    deleteManufacturer
};
