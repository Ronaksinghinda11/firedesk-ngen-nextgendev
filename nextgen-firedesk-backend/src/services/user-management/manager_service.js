/**
 * Manager Service - Handles manager-specific business logic
 */
const { sequelize } = require('../../../config/config');
const { Manager, User, PlantManager, Role } = require('../../models/user-management');

const { ManagerDTO } = require('../../dto');
const plant_service = require('../plants/plant_service');

class ManagerService {
    /**
     * Get all managers
     * @param {Object} filters - Query filters
     * @param {string} [filters.plant_id] - Filter by plant
     * @returns {Promise<Manager[]>}
     */
    async get_all(filters = {}) {
        const { plant_id } = filters;

        const include_options = [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email', 'phone', 'status']
            },
            {
                model: PlantManager,
                as: 'plant_assignments',
                attributes: ['id', 'plant_id', 'assigned_at']
            }
        ];

        // Filter by plant if specified
        if (plant_id && plant_id !== 'all') {
            include_options[1] = {
                ...include_options[1],
                where: { plant_id },
                required: true
            };
        }

        const managers = await Manager.findAll({
            include: include_options,
            order: [['created_at', 'DESC']]
        });

        return managers;
    }

    /**
     * Get manager by ID
     * @param {string} id - Manager ID
     * @returns {Promise<Manager>}
     */
    async get_by_id(id) {
        const manager = await Manager.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'status']
                },
                {
                    model: PlantManager,
                    as: 'plant_assignments'
                }
            ]
        });

        if (!manager) {
            throw { status: 404, message: "Manager not found" };
        }

        return manager;
    }

    /**
     * Get manager by user ID
     * @param {string} user_id - User ID
     * @returns {Promise<Manager>}
     */
    async get_by_user_id(user_id) {
        const manager = await Manager.findOne({
            where: { user_id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'status']
                },
                {
                    model: PlantManager,
                    as: 'plant_assignments'
                }
            ]
        });

        if (!manager) {
            throw { status: 404, message: "Manager not found for this user" };
        }

        return manager;
    }

    /**
     * Update manager data (plant associations)
     * @param {string} user_id - User ID
     * @param {Object} data - Update data
     * @param {string[]} [data.plant_ids] - Plant IDs to assign
     * @returns {Promise<Manager>}
     */
    async update_data(user_id, data) {
        const { plant_ids = [] } = data;

        const manager = await Manager.findOne({ where: { user_id } });
        if (!manager) {
            throw { status: 404, message: "Manager record not found" };
        }

        const transaction = await sequelize.transaction();

        try {
            // Remove existing plant assignments
            await PlantManager.destroy({
                where: { manager_id: manager.id },
                transaction
            });

            // Add new plant assignments
            if (plant_ids.length > 0) {
                const assignments = plant_ids.map(plant_id => ({
                    manager_id: manager.id,
                    plant_id,
                    assigned_at: new Date()
                }));
                await PlantManager.bulkCreate(assignments, { transaction });
            }

            await transaction.commit();

            return await this.get_by_id(manager.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Update manager status
     * @param {string} id - Manager ID
     * @param {string} status - New status
     * @returns {Promise<Manager>}
     */
    async update_status(id, status) {
        const manager = await Manager.findByPk(id);
        if (!manager) {
            throw { status: 404, message: "Manager not found" };
        }

        await Manager.update(
            { status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() },
            { where: { id } }
        );

        // Sync with user status
        await User.update(
            { status: status.toLowerCase() },
            { where: { id: manager.user_id } }
        );

        return await this.get_by_id(id);
    }

    /**
     * Get plant IDs for a manager (by user ID)
     * @param {string} user_id - User ID
     * @returns {Promise<string[]>}
     */
    async get_plant_ids(user_id) {
        const manager = await Manager.findOne({
            where: { user_id },
            include: [{
                model: PlantManager,
                as: 'plant_assignments',
                attributes: ['plant_id']
            }]
        });

        if (!manager) {
            return [];
        }

        return manager.plant_assignments?.map(pa => pa.plant_id) || [];
    }

    /**
     * Delete manager and associated user
     * @param {string} id - Manager ID
     */
    async delete(id) {
        const manager = await Manager.findByPk(id);
        if (!manager) {
            throw { status: 404, message: "Manager not found" };
        }

        const user_id = manager.user_id;
        const transaction = await sequelize.transaction();

        try {
            // Remove plant assignments
            await PlantManager.destroy({
                where: { manager_id: id },
                transaction
            });

            // Delete manager
            await Manager.destroy({ where: { id }, transaction });

            // Delete user
            await User.destroy({ where: { id: user_id }, transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Get assigned plants with full details for a manager (by user ID)
     * @param {string} user_id - User ID
     * @returns {Promise<Object[]>}
     */
    async get_assigned_plants_with_details(user_id) {
        // 1. Get assigned plant IDs
        const plantIds = await this.get_plant_ids(user_id);

        if (!plantIds || plantIds.length === 0) {
            return [];
        }

        // 2. Fetch plant details using plant service
        // We pass the IDs as a filter.
        const result = await plant_service.getAllPlants({ id: plantIds, limit: 1000 });
        const plants = result.plants || [];

        // 3. Sort alphabetically
        plants.sort((a, b) => (a.plant_name || '').localeCompare(b.plant_name || ''));

        return plants;
    }
}

module.exports = new ManagerService();
