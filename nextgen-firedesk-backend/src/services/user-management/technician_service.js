/**
 * Technician Service - Handles technician-specific business logic
 */
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize } = require('../../../config/config');
const {
    Technician, User, Role, Manager,
    TechnicianPlant, TechnicianManager, TechnicianCategory
} = require('../../models/user-management');
const { TechnicianDTO } = require('../../dto');
const { validate_phone_number, normalize_phone } = require('../../utils/phone_validator');

class TechnicianService {
    /**
     * Get all technicians
     * @param {Object} filters - Query filters
     * @param {string} [filters.plant_id] - Filter by plant
     * @param {string} [filters.user_type] - Requesting user type
     * @param {string} [filters.user_id] - Requesting user ID
     * @param {string} [filters.status] - Filter by status (Active/Inactive)
     * @param {string[]} [filters.allowedPlantIds] - Manager's allowed plants (from middleware)
     * @returns {Promise<Technician[]>}
     */
    async get_all(filters = {}) {
        const { plant_id, user_type, user_id, status, allowedPlantIds } = filters;
        let where_condition = {};
        let user_where_condition = {};

        // Apply status filter if provided (Check Technician status first as it's the primary archive flag)
        if (status) {
            // Normalize status (handle case variations)
            const normalized_status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
            where_condition.status = normalized_status;
        }

        // Manager data scoping - use allowedPlantIds from middleware OR user_type check
        // allowedPlantIds is preferred as it comes from the centralized managerPlantFilter middleware
        let manager_plant_ids = [];

        if (allowedPlantIds && allowedPlantIds.length > 0) {
            // Use allowedPlantIds from middleware (more reliable, already validated)
            manager_plant_ids = allowedPlantIds;
            console.log(`[TechnicianService] Using middleware allowedPlantIds: ${manager_plant_ids.join(', ')}`);

            // Validate requested plant_id against allowed plants
            if (plant_id && plant_id !== 'all') {
                if (!manager_plant_ids.includes(plant_id)) {
                    console.warn(`[TechnicianService] Manager tried to access unauthorized plant: ${plant_id}`);
                    return []; // Return empty instead of throwing - consistent with asset service
                }
            }

            // Find technicians assigned to these plants
            const technicians_in_plants = await TechnicianPlant.findAll({
                where: { plant_id: { [Op.in]: manager_plant_ids } },
                attributes: ['technician_id']
            });

            const assigned_technician_ids = technicians_in_plants.map(a => a.technician_id);

            if (assigned_technician_ids.length > 0) {
                where_condition.id = { [Op.in]: [...new Set(assigned_technician_ids)] };
            } else {
                return []; // No technicians in manager's plants
            }
        } else if (['manager', 'Manager'].includes(user_type)) {
            // Fallback: Legacy manager filtering using user_type
            const manager = await Manager.findOne({ where: { user_id } });
            if (!manager) return [];

            manager_plant_ids = await this._get_manager_plant_ids(user_id);

            // Find technicians assigned directly (TechnicianManager)
            const direct_assignments = await TechnicianManager.findAll({
                where: { manager_id: manager.id },
                attributes: ['technician_id']
            });

            // Find technicians assigned to these plants
            let technicians_in_plants = [];
            if (manager_plant_ids.length > 0) {
                technicians_in_plants = await TechnicianPlant.findAll({
                    where: { plant_id: { [Op.in]: manager_plant_ids } },
                    attributes: ['technician_id']
                });
            }

            const assigned_technician_ids = [
                ...direct_assignments.map(a => a.technician_id),
                ...technicians_in_plants.map(a => a.technician_id)
            ];

            // Filter main query by these IDs
            if (assigned_technician_ids.length > 0) {
                where_condition.id = { [Op.in]: [...new Set(assigned_technician_ids)] };
            } else {
                return []; // No technicians assigned
            }

            // manager_plant_ids already fetched above
            if (plant_id && plant_id !== 'all') {
                if (!manager_plant_ids.includes(plant_id)) {
                    throw { status: 403, message: "Access denied. This plant is not assigned to you." };
                }
            }
        }

        console.log('🔍 Technician get_all filters:', { status, plant_id, user_type, user_id });
        console.log('🔍 Where condition:', JSON.stringify(where_condition));
        console.log('🔍 User where condition:', JSON.stringify(user_where_condition));

        const technicians = await Technician.findAll({
            where: where_condition,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'status'],
                    where: Object.keys(user_where_condition).length > 0 ? user_where_condition : undefined,
                    required: Object.keys(user_where_condition).length > 0, // INNER JOIN when filtering by status
                    include: [{
                        model: Role,
                        as: 'role',
                        attributes: ['id', 'name']
                    }]
                },
                {
                    model: TechnicianPlant,
                    as: 'plant_assignments',
                    attributes: ['id', 'plant_id', 'manager_id']
                },
                {
                    model: TechnicianManager,
                    as: 'manager_assignments',
                    attributes: ['id', 'manager_id'],
                    include: [{
                        model: Manager,
                        as: 'manager',
                        attributes: ['id', 'manager_code'],
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name']
                        }]
                    }]
                },
                {
                    model: TechnicianCategory,
                    as: 'category_assignments',
                    attributes: ['id', 'category_id']
                }
            ],
            order: [['created_at', 'DESC']],
            logging: console.log // DEBUG: Print SQL query
        });

        // Additional Frontend Filter support (if needed)
        let result = technicians;
        if (plant_id && plant_id !== 'all') {
            result = technicians.filter(tech => {
                return tech.plant_assignments?.some(pa => pa.plant_id === plant_id);
            });
        }

        return result;
    }

    /**
     * Get technician by ID
     * @param {string} id - Technician ID
     * @returns {Promise<Technician>}
     */
    async get_by_id(id) {
        const technician = await Technician.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'status'],
                    include: [{
                        model: Role,
                        as: 'role',
                        attributes: ['id', 'name']
                    }]
                },
                {
                    model: TechnicianPlant,
                    as: 'plant_assignments'
                },
                {
                    model: TechnicianManager,
                    as: 'manager_assignments',
                    include: [{
                        model: Manager,
                        as: 'manager',
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name']
                        }]
                    }]
                },
                {
                    model: TechnicianCategory,
                    as: 'category_assignments'
                }
            ]
        });

        if (!technician) {
            throw { status: 404, message: "Technician not found" };
        }

        return technician;
    }

    /**
     * Create technician
     * @param {Object} data - Technician data
     * @param {string} created_by - Creator user ID
     * @returns {Promise<Technician>}
     */
    async create(data, created_by) {
        const {
            name, email, phone, password, role_id,
            plant_ids, plant_id, manager_ids, manager_id,
            category_ids, category_id, plant_manager_pairs,
            technician_type, experience, specialization, vendor_id, status
        } = data;

        // Validate email
        const existing_email = await User.findOne({ where: { email } });
        if (existing_email) {
            throw { status: 400, message: "User with this email already exists" };
        }

        // Validate phone
        if (phone) {
            const phone_validation = validate_phone_number(phone);
            if (!phone_validation.isValid) {
                throw { status: 400, message: phone_validation.message };
            }

            const normalized = normalize_phone(phone);
            const existing_phone = await User.findOne({ where: { phone: normalized } });
            if (existing_phone) {
                throw { status: 400, message: "Phone number already registered" };
            }
        }

        const transaction = await sequelize.transaction();

        try {
            // Generate password if not provided
            const final_password = password || `Tech@${phone?.slice(-4) || '0000'}${Math.floor(Math.random() * 1000)}`;
            const hashed_password = await bcrypt.hash(final_password, 10);

            // Create user
            const new_user = await User.create({
                name,
                email,
                phone: normalize_phone(phone),
                password: hashed_password,
                role_id,
                status: status || 'Active'
            }, { transaction });

            // Generate technician code
            const technician_code = await this._generate_code(transaction);

            // Create technician
            const technician = await Technician.create({
                technician_code,
                user_id: new_user.id,
                created_by,
                technician_type: technician_type || 'In House',
                experience,
                specialization,
                vendor_id: technician_type === 'Third Party' ? vendor_id : null,
                status: status || 'Active'
            }, { transaction });

            // Handle associations
            await this._create_associations(technician.id, {
                plant_ids, plant_id, manager_ids, manager_id,
                category_ids, category_id, plant_manager_pairs, technician_type
            }, transaction);

            await transaction.commit();

            return await this.get_by_id(technician.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Update technician
     * @param {string} id - Technician ID
     * @param {Object} data - Update data
     * @returns {Promise<Technician>}
     */
    async update(id, data) {
        const {
            name, email, phone, role_id,
            plant_ids, plant_id, manager_ids, manager_id,
            category_ids, category_id, plant_manager_pairs,
            technician_type, experience, specialization, vendor_id, status
        } = data;

        const technician = await Technician.findByPk(id);
        if (!technician) {
            throw { status: 404, message: "Technician not found" };
        }

        const transaction = await sequelize.transaction();

        try {
            // Update technician record
            await Technician.update({
                technician_type: technician_type || 'In House',
                experience,
                specialization,
                vendor_id: technician_type === 'Third Party' ? vendor_id : null,
                status
            }, { where: { id }, transaction });

            // Update user record (including status for archive/restore)
            if (name || email || phone || role_id || status) {
                const update_data = {};
                if (name) update_data.name = name;
                if (email) update_data.email = email;
                if (phone) update_data.phone = normalize_phone(phone);
                if (role_id) update_data.role_id = role_id;
                if (status) update_data.status = status; // Archive sets User.status to Inactive

                await User.update(update_data, {
                    where: { id: technician.user_id },
                    transaction
                });
            }

            // Update associations ONLY if relevant fields are provided
            // (Prevents wiping out assignments during archive/restore or partial updates)
            const has_association_data =
                plant_ids !== undefined || plant_id !== undefined ||
                manager_ids !== undefined || manager_id !== undefined ||
                category_ids !== undefined || category_id !== undefined ||
                plant_manager_pairs !== undefined;

            if (has_association_data) {
                await this._update_associations(id, {
                    plant_ids, plant_id, manager_ids, manager_id,
                    category_ids, category_id, plant_manager_pairs, technician_type
                }, transaction);
            }

            await transaction.commit();

            return await this.get_by_id(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Update technician data only (not user)
     * @param {string} user_id - User ID
     * @param {Object} data - Update data
     * @returns {Promise<Technician>}
     */
    async update_data(user_id, data) {
        const technician = await Technician.findOne({ where: { user_id } });
        if (!technician) {
            throw { status: 404, message: "Technician record not found" };
        }

        return await this.update(technician.id, data);
    }

    /**
     * Delete technician
     * @param {string} id - Technician ID
     */
    async delete(id) {
        const technician = await Technician.findByPk(id);
        if (!technician) {
            throw { status: 404, message: "Technician not found" };
        }

        const user_id = technician.user_id;
        const transaction = await sequelize.transaction();

        try {
            await Technician.destroy({ where: { id }, transaction });
            await User.destroy({ where: { id: user_id }, transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Create technician associations
     * @private
     */
    async _create_associations(technician_id, data, transaction) {
        const {
            plant_ids, plant_id, manager_ids, manager_id,
            category_ids, category_id, plant_manager_pairs, technician_type
        } = data;

        // Determine final plant IDs
        let final_plant_ids = [];
        if (technician_type === 'In House') {
            if (plant_id) final_plant_ids = [plant_id];
        } else {
            final_plant_ids = plant_ids || [];
        }

        // Collect all manager IDs (direct + from pairs)
        let extracted_manager_ids = [];
        if (manager_ids) extracted_manager_ids = [...manager_ids];
        if (manager_id) extracted_manager_ids.push(manager_id);

        // Plant assignments
        if (plant_manager_pairs && plant_manager_pairs.length > 0) {
            for (const pair of plant_manager_pairs) {
                await TechnicianPlant.create({
                    technician_id,
                    plant_id: pair.plant_id,
                    manager_id: pair.manager_id || null
                }, { transaction });

                if (pair.manager_id) extracted_manager_ids.push(pair.manager_id);
            }
        } else if (final_plant_ids.length > 0) {
            const assignments = final_plant_ids.map(pid => ({
                technician_id,
                plant_id: pid
            }));
            await TechnicianPlant.bulkCreate(assignments, { transaction });
        }

        // Manager assignments (Consolidated)
        const unique_manager_ids = [...new Set(extracted_manager_ids)];
        if (unique_manager_ids.length > 0) {
            const assignments = unique_manager_ids.map(mid => ({
                technician_id,
                manager_id: mid
            }));
            await TechnicianManager.bulkCreate(assignments, { transaction });
        }

        // Category assignments
        const final_category_ids = category_ids || (category_id ? [category_id] : []);
        if (final_category_ids.length > 0) {
            const assignments = final_category_ids.map(cid => ({
                technician_id,
                category_id: cid
            }));
            await TechnicianCategory.bulkCreate(assignments, { transaction });
        }
    }

    /**
     * Update technician associations
     * @private
     */
    async _update_associations(technician_id, data, transaction) {
        const {
            plant_ids, plant_id, manager_ids, manager_id,
            category_ids, category_id, plant_manager_pairs, technician_type
        } = data;

        // Clear existing associations
        await TechnicianPlant.destroy({ where: { technician_id }, transaction });
        await TechnicianManager.destroy({ where: { technician_id }, transaction });
        await TechnicianCategory.destroy({ where: { technician_id }, transaction });

        // Recreate associations
        await this._create_associations(technician_id, data, transaction);
    }

    /**
     * Generate technician code
     * @private
     */
    async _generate_code(transaction = null) {
        const technicians = await Technician.findAll({
            attributes: ['technician_code'],
            transaction
        });

        let max_num = 0;
        technicians.forEach(t => {
            const match = t.technician_code?.match(/TECH(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > max_num) max_num = num;
            }
        });

        return `TECH${(max_num + 1).toString().padStart(4, '0')}`;
    }

    /**
     * Get manager's plant IDs
     * @private
     */
    async _get_manager_plant_ids(user_id) {
        const manager = await Manager.findOne({
            where: { user_id },
            include: [{
                model: require('../../models/user-management').PlantManager,
                as: 'plant_assignments',
                attributes: ['plant_id']
            }]
        });

        if (!manager) return [];
        return manager.plant_assignments?.map(pa => pa.plant_id) || [];
    }
}

module.exports = new TechnicianService();
