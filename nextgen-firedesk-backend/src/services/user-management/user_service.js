/**
 * User Service - Handles user management business logic
 */
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize } = require('../../../config/config');
const {
    User, Role, Manager, Technician,
    TechnicianPlant, TechnicianManager, TechnicianCategory,
    PlantManager
} = require('../../models/user-management');
const { UserDTO } = require('../../dto');
const { validate_phone_number, normalize_phone } = require('../../utils/phone_validator');
const auditService = require('../audit/audit_service');

class UserService {
    /**
     * Get all users with role and role-specific data
     * @param {Object} filters - Query filters
     * @param {string} [filters.plant_id] - Filter by plant
     * @returns {Promise<Object[]>}
     */
    async get_all(filters = {}) {
        const { plant_id } = filters;
        let where_clause = {};

        // If plant_id specified, filter users associated with that plant
        if (plant_id && plant_id !== 'all') {
            // Get manager user IDs for this plant
            const manager_user_ids = await Manager.findAll({
                include: [{
                    model: PlantManager,
                    as: 'plant_assignments',
                    where: { plant_id },
                    attributes: []
                }],
                attributes: ['user_id'],
                raw: true
            });

            // Get technician user IDs for this plant
            const technician_user_ids = await Technician.findAll({
                include: [{
                    model: TechnicianPlant,
                    as: 'plant_assignments',
                    where: { plant_id },
                    attributes: []
                }],
                attributes: ['user_id'],
                raw: true
            });

            const user_ids = [
                ...manager_user_ids.map(m => m.user_id),
                ...technician_user_ids.map(t => t.user_id)
            ];

            const unique_user_ids = [...new Set(user_ids)];

            if (unique_user_ids.length > 0) {
                where_clause.id = { [Op.in]: unique_user_ids };
            } else {
                return [];
            }
        }

        // Filter by status if provided
        if (filters.status) {
            where_clause.status = filters.status;
        }

        const users = await User.findAll({
            where: where_clause,
            attributes: { exclude: ['profile_pic'] },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'description', 'is_default']
            }],
            order: [['created_at', 'DESC']]
        });

        // Enhance users with role-specific data
        const enhanced_users = await Promise.all(users.map(async (user) => {
            const user_data = user.toJSON();

            // If Manager, get plant associations
            if (user_data.role?.name === 'Manager') {
                const manager = await Manager.findOne({
                    where: { user_id: user.id },
                    include: [{
                        model: PlantManager,
                        as: 'plant_assignments'
                    }]
                });

                if (manager) {
                    user_data.manager_id = manager.id;
                    user_data.manager_code = manager.manager_code;
                    user_data.plant_ids = manager.plant_assignments?.map(pa => pa.plant_id) || [];
                }
            }

            // If Technician, get associations
            if (user_data.role?.name === 'Technician') {
                const technician = await Technician.findOne({
                    where: { user_id: user.id },
                    include: [
                        { model: TechnicianPlant, as: 'plant_assignments' },
                        { model: TechnicianManager, as: 'manager_assignments' },
                        { model: TechnicianCategory, as: 'category_assignments' }
                    ]
                });

                if (technician) {
                    user_data.technician_id = technician.id;
                    user_data.technician_code = technician.technician_code;
                    user_data.technician_type = technician.technician_type;
                    user_data.experience = technician.experience;
                    user_data.specialization = technician.specialization;
                    user_data.vendor_id = technician.vendor_id;
                    user_data.plant_ids = technician.plant_assignments?.map(pa => pa.plant_id) || [];
                    user_data.plant_manager_pairs = technician.plant_assignments?.map(pa => ({
                        plant_id: pa.plant_id,
                        manager_id: pa.manager_id
                    })) || [];
                    user_data.manager_ids = technician.manager_assignments?.map(ma => ma.manager_id) || [];
                    user_data.category_ids = technician.category_assignments?.map(ca => ca.category_id) || [];
                }
            }

            return user_data;
        }));

        return enhanced_users;
    }

    /**
     * Get user by ID
     * @param {string} id - User ID
     * @returns {Promise<User>}
     */
    async get_by_id(id) {
        const user = await User.findByPk(id, {
            attributes: { exclude: ['profile_pic'] },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'description', 'is_default']
            }]
        });

        if (!user) {
            throw { status: 404, message: "User not found" };
        }

        const user_data = user.toJSON();

        // If Manager, get plant associations
        if (user_data.role?.name === 'Manager') {
            const manager = await Manager.findOne({
                where: { user_id: user.id },
                include: [{
                    model: PlantManager,
                    as: 'plant_assignments'
                }]
            });

            if (manager) {
                user_data.manager_id = manager.id;
                user_data.manager_code = manager.manager_code;
                user_data.plant_ids = manager.plant_assignments?.map(pa => pa.plant_id) || [];
            }
        }

        // If Technician, get associations
        if (user_data.role?.name === 'Technician') {
            const technician = await Technician.findOne({
                where: { user_id: user.id },
                include: [
                    { model: TechnicianPlant, as: 'plant_assignments' },
                    { model: TechnicianManager, as: 'manager_assignments' },
                    { model: TechnicianCategory, as: 'category_assignments' }
                ]
            });

            if (technician) {
                user_data.technician_id = technician.id;
                user_data.technician_code = technician.technician_code;
                user_data.technician_type = technician.technician_type;
                user_data.experience = technician.experience;
                user_data.specialization = technician.specialization;
                user_data.vendor_id = technician.vendor_id;
                user_data.plant_ids = technician.plant_assignments?.map(pa => pa.plant_id) || [];
                user_data.plant_manager_pairs = technician.plant_assignments?.map(pa => ({
                    plant_id: pa.plant_id,
                    manager_id: pa.manager_id
                })) || [];
                user_data.manager_ids = technician.manager_assignments?.map(ma => ma.manager_id) || [];
                user_data.category_ids = technician.category_assignments?.map(ca => ca.category_id) || [];
            }
        }

        return user_data;
    }

    /**
     * Get user avatar (profile_pic) only
     * @param {string} id - User ID
     * @returns {Promise<string>} Base64 image string or null
     */
    async get_avatar(id) {
        const user = await User.findByPk(id, {
            attributes: ['profile_pic']
        });

        if (!user) {
            throw { status: 404, message: "User not found" };
        }

        return user.profile_pic;
    }

    /**
     * Create a new user
     * @param {Object} data - User data
     * @param {string} created_by - Creator user ID
     * @returns {Promise<User>}
     */
    async create(data, user, _auditSource = 'ui') {
        const created_by = user?.id || user; // Handle both object and ID for backward compat
        const {
            name, email, phone, password, role_id, status,
            plant_ids, plant_id, manager_ids, manager_id,
            category_ids, category_id, plant_manager_pairs,
            technician_type, experience, specialization, vendor_id
        } = data;

        // Validate email uniqueness
        const existing_email = await User.findOne({ where: { email } });
        if (existing_email) {
            throw { status: 400, message: "Email already exists" };
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

        // Validate role
        const role = await Role.findByPk(role_id);
        if (!role) {
            throw { status: 404, message: "Role not found" };
        }

        const transaction = await sequelize.transaction();

        try {
            // Hash password
            const hashed_password = await bcrypt.hash(password, 10);

            // Create user
            const new_user = await User.create({
                name,
                email,
                phone: normalize_phone(phone),
                password: hashed_password,
                role_id,
                status: status || 'Active'
            }, { transaction });

            // Create role-specific records
            if (role.name === 'Manager') {
                const manager_code = await this._generate_manager_code(transaction);

                const manager = await Manager.create({
                    manager_code,
                    user_id: new_user.id,
                    created_by,
                    status: 'Active'
                }, { transaction });

                // Assign plants
                if (plant_ids && plant_ids.length > 0) {
                    const plant_assignments = plant_ids.map(plant_id => ({
                        manager_id: manager.id,
                        plant_id
                    }));
                    await PlantManager.bulkCreate(plant_assignments, { transaction });
                }
            }

            if (role.name === 'Technician') {
                const technician_code = await this._generate_technician_code(transaction);

                const technician = await Technician.create({
                    technician_code,
                    user_id: new_user.id,
                    created_by,
                    technician_type: technician_type || 'In House',
                    experience,
                    specialization,
                    vendor_id,
                    status: 'Active'
                }, { transaction });

                // Handle plant assignments and collect manager IDs
                let extracted_manager_ids = [];
                if (manager_ids) extracted_manager_ids = [...manager_ids];
                if (manager_id) extracted_manager_ids.push(manager_id);

                const final_plant_ids = technician_type === 'In House'
                    ? (plant_id ? [plant_id] : [])
                    : (plant_ids || []);

                if (plant_manager_pairs && plant_manager_pairs.length > 0) {
                    for (const pair of plant_manager_pairs) {
                        await TechnicianPlant.create({
                            technician_id: technician.id,
                            plant_id: pair.plant_id || pair.plantId,
                            manager_id: pair.manager_id || pair.managerId || null
                        }, { transaction });

                        if (pair.manager_id) {
                            extracted_manager_ids.push(pair.manager_id);
                        }
                    }
                } else if (final_plant_ids.length > 0) {
                    // ... existing logic for plant-only assignment ...
                    const plant_assignments = final_plant_ids.map(pid => ({
                        technician_id: technician.id,
                        plant_id: pid
                    }));
                    await TechnicianPlant.bulkCreate(plant_assignments, { transaction });
                }

                // Handle manager assignments (Consolidated)
                const unique_manager_ids = [...new Set(extracted_manager_ids)];
                if (unique_manager_ids.length > 0) {
                    const manager_assignments = unique_manager_ids.map(mid => ({
                        technician_id: technician.id,
                        manager_id: mid
                    }));
                    await TechnicianManager.bulkCreate(manager_assignments, { transaction });
                }

                // Handle category assignments
                const final_category_ids = category_ids || (category_id ? [category_id] : []);
                if (final_category_ids.length > 0) {
                    const category_assignments = final_category_ids.map(cid => ({
                        technician_id: technician.id,
                        category_id: cid
                    }));
                    await TechnicianCategory.bulkCreate(category_assignments, { transaction });
                }
            }

            await transaction.commit();



            // Audit Log
            try {
                const userObj = typeof user === 'object' ? user : { id: user };
                await auditService.log({
                    entityType: 'user',
                    entityId: new_user.id,
                    entityName: new_user.name,
                    action: 'CREATE',
                    user: userObj,
                    source: _auditSource
                });
            } catch (error) {
                console.error('Audit log failed for create user:', error.message);
            }

            return await this.get_by_id(new_user.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Update user
     * @param {string} id - User ID
     * @param {Object} data - Update data
     * @returns {Promise<User>}
     */
    async update(id, data, user, _auditSource = 'ui') {
        const { name, email, phone, status } = data;

        const existing_user = await User.findByPk(id);
        if (!existing_user) {
            throw { status: 404, message: "User not found" };
        }

        // Check email uniqueness
        if (email && email !== existing_user.email) {
            const existing = await User.findOne({
                where: { email, id: { [Op.ne]: id } }
            });
            if (existing) {
                throw { status: 400, message: "Email already exists" };
            }
        }

        // Check phone uniqueness
        if (phone !== undefined && phone !== null && phone.trim()) {
            const phone_validation = validate_phone_number(phone);
            if (!phone_validation.isValid) {
                throw { status: 400, message: phone_validation.message };
            }

            const normalized = normalize_phone(phone);
            const existing = await User.findOne({
                where: { phone: normalized, id: { [Op.ne]: id } }
            });
            if (existing) {
                throw { status: 400, message: "Phone number already registered" };
            }
        }

        // Update user
        const update_data = {};
        if (name) update_data.name = name;
        if (email) update_data.email = email;
        if (phone !== undefined) update_data.phone = normalize_phone(phone);
        if (status) update_data.status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

        await User.update(update_data, { where: { id } });

        // Sync status with Manager/Technician
        if (status) {
            const normalized_status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

            const user_with_role = await this.get_by_id(id);
            if (user_with_role.role?.name === 'Manager') {
                await Manager.update({ status: normalized_status }, { where: { user_id: id } });
            } else if (user_with_role.role?.name === 'Technician') {
                await Technician.update({ status: normalized_status }, { where: { user_id: id } });
            }
        }

        // Audit Log
        try {
            const changes = auditService.calculateChanges(existing_user.toJSON(), update_data);
            if (changes) {
                await auditService.log({
                    entityType: 'user',
                    entityId: id,
                    entityName: existing_user.name,
                    action: 'UPDATE',
                    changes,
                    user,
                    source: _auditSource
                });
            }
        } catch (error) {
            console.error('Audit log failed for update user:', error.message);
        }

        return await this.get_by_id(id);
    }

    /**
     * Update user role
     * @param {string} id - User ID
     * @param {string} role_id - New role ID
     * @param {string} updated_by - User performing the update
     * @returns {Promise<User>}
     */
    async update_role(id, role_id, user) {
        const updated_by = user?.id || user;
        const target_user = await User.findByPk(id, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!target_user) {
            throw { status: 404, message: "User not found" };
        }

        const new_role = await Role.findByPk(role_id);
        if (!new_role) {
            throw { status: 404, message: "Role not found" };
        }

        const old_role = target_user.role;
        const transaction = await sequelize.transaction();

        try {
            // Update user role
            await User.update({ role_id }, { where: { id }, transaction });

            // Handle role transitions
            if (old_role?.name === 'Manager' && new_role.name !== 'Manager') {
                await Manager.destroy({ where: { user_id: id }, transaction });
            }

            if (old_role?.name === 'Technician' && new_role.name !== 'Technician') {
                await Technician.destroy({ where: { user_id: id }, transaction });
            }

            // Create new role record if needed
            if (new_role.name === 'Manager') {
                const existing = await Manager.findOne({ where: { user_id: id }, transaction });
                if (!existing) {
                    const manager_code = await this._generate_manager_code(transaction);
                    await Manager.create({
                        manager_code,
                        user_id: id,
                        created_by: updated_by,
                        status: 'Active'
                    }, { transaction });
                }
            }

            if (new_role.name === 'Technician') {
                const existing = await Technician.findOne({ where: { user_id: id }, transaction });
                if (!existing) {
                    const technician_code = await this._generate_technician_code(transaction);
                    await Technician.create({
                        technician_code,
                        user_id: id,
                        created_by: updated_by,
                        technician_type: 'In House',
                        status: 'Active'
                    }, { transaction });
                }
            }

            await transaction.commit();

            // Audit Log
            try {
                const userObj = typeof user === 'object' ? user : { id: user };
                await auditService.log({
                    entityType: 'user',
                    entityId: id,
                    entityName: target_user.name,
                    action: 'UPDATE',
                    fieldName: 'role',
                    oldValue: old_role?.name,
                    newValue: new_role.name,
                    user: userObj,
                    source: 'ui',
                    metadata: { message: `Role changed from ${old_role?.name} to ${new_role.name}` }
                });
            } catch (error) {
                console.error('Audit log failed for update_role:', error.message);
            }

            return await this.get_by_id(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Delete user
     * @param {string} id - User ID
     * @param {string} deleted_by - User performing deletion
     */
    async delete(id, user) {
        const deleted_by = user?.id || user;
        const target_user = await User.findByPk(id);
        if (!target_user) {
            throw { status: 404, message: "User not found" };
        }

        if (id === deleted_by) {
            throw { status: 400, message: "You cannot delete your own account" };
        }

        const transaction = await sequelize.transaction();

        try {
            // Helper function: Safely execute SQL with SAVEPOINT to prevent transaction abortion
            const safeUpdate = async (tableName, columnName) => {
                const savepointName = `sp_${tableName}_${columnName}`.replace(/[^a-zA-Z0-9_]/g, '_');
                try {
                    await sequelize.query(`SAVEPOINT ${savepointName}`, { transaction });
                    await sequelize.query(
                        `UPDATE "${tableName}" SET "${columnName}" = NULL WHERE "${columnName}" = :userId`,
                        { replacements: { userId: id }, transaction }
                    );
                    await sequelize.query(`RELEASE SAVEPOINT ${savepointName}`, { transaction });
                } catch (err) {
                    // Rollback to savepoint if this specific update fails
                    await sequelize.query(`ROLLBACK TO SAVEPOINT ${savepointName}`, { transaction });
                    console.log(`[User Delete] Skipping ${tableName}.${columnName}: ${err.message}`);
                }
            };

            // ============================================
            // STEP 1: Delete transient data (notifications, tokens)
            // ============================================
            const Notification = require('../../models/notifications/Notification');
            await Notification.destroy({ where: { user_id: id }, transaction });
            await Notification.update({ triggered_by: null }, { where: { triggered_by: id }, transaction });

            const RefreshToken = require('../../models/user-management/refresh_token');
            await RefreshToken.destroy({ where: { user_id: id }, transaction });

            // ============================================
            // STEP 2: Nullify audit/history references (preserve history)
            // ============================================
            const AuditLog = require('../../models/audit/AuditLog');
            await AuditLog.update({ user_id: null }, { where: { user_id: id }, transaction });

            const Comment = require('../../models/comments/Comment');
            await Comment.update({ user_id: null }, { where: { user_id: id }, transaction });

            // ============================================
            // STEP 3: Nullify FK references in entity tables
            // Using SAVEPOINTs to handle missing tables/columns gracefully
            // ============================================

            // Assets
            await safeUpdate('assets', 'created_by');

            // Asset history tables
            await safeUpdate('asset_status_history', 'changed_by');
            await safeUpdate('asset_location_history', 'recorded_by');
            await safeUpdate('asset_floorplan_position', 'updated_by');

            // Tickets
            await safeUpdate('tickets', 'created_by');

            // Incidents
            await safeUpdate('incidents', 'reported_by');
            await safeUpdate('incidents', 'acknowledged_by');
            await safeUpdate('incidents', 'closed_by');

            // Incident related tables
            await safeUpdate('incident_capa_steps', 'assigned_to');
            await safeUpdate('incident_capa_steps', 'completed_by');
            await safeUpdate('incident_capa_steps', 'approved_by');
            await safeUpdate('incident_activities', 'user_id');
            await safeUpdate('incident_assignments', 'user_id');
            await safeUpdate('incident_assignments', 'assigned_by');

            // Service related
            await safeUpdate('service_submissions', 'approved_by');

            // Files
            await safeUpdate('uploaded_files', 'uploaded_by');

            // Master data tables
            await safeUpdate('forms', 'created_by');
            await safeUpdate('questions', 'created_by');
            await safeUpdate('categories', 'created_by');
            await safeUpdate('products', 'created_by');
            await safeUpdate('vendors', 'created_by');
            await safeUpdate('condition_masters', 'created_by');
            await safeUpdate('industries', 'created_by');
            await safeUpdate('organizations', 'created_by');
            await safeUpdate('incident_types', 'created_by');
            await safeUpdate('incident_subtypes', 'created_by');
            await safeUpdate('capa_step_definitions', 'created_by');
            await safeUpdate('schedulers', 'created_by');

            // ============================================
            // STEP 4: Clean up Manager/Technician junction tables
            // ============================================
            const manager = await Manager.findOne({ where: { user_id: id }, transaction });
            const technician = await Technician.findOne({ where: { user_id: id }, transaction });

            if (manager) {
                await PlantManager.destroy({ where: { manager_id: manager.id }, transaction });
                await TechnicianManager.destroy({ where: { manager_id: manager.id }, transaction });
            }

            if (technician) {
                await TechnicianPlant.destroy({ where: { technician_id: technician.id }, transaction });
                await TechnicianManager.destroy({ where: { technician_id: technician.id }, transaction });
                await TechnicianCategory.destroy({ where: { technician_id: technician.id }, transaction });
            }

            // ============================================
            // STEP 5: Delete Manager/Technician/User records
            // ============================================
            await Manager.destroy({ where: { user_id: id }, transaction });
            await Technician.destroy({ where: { user_id: id }, transaction });
            await User.destroy({ where: { id }, transaction });

            await transaction.commit();

            // Audit Log (outside transaction - already committed)
            try {
                const userObj = typeof user === 'object' ? user : { id: user };
                await auditService.log({
                    entityType: 'user',
                    entityId: id,
                    entityName: target_user.name,
                    action: 'DELETE',
                    user: userObj,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for delete user:', error.message);
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Restore user - reactivate inactive user
     * @param {string} id - User ID
     * @param {Object} user - User performing the restore
     */
    async restore(id, user) {
        const target_user = await User.findByPk(id, {
            include: [{ model: Role, as: 'role' }]
        });

        if (!target_user) {
            throw { status: 404, message: "User not found" };
        }

        if (target_user.status === 'Active') {
            throw { status: 400, message: "User is already active" };
        }

        const transaction = await sequelize.transaction();

        try {
            // Update user status to Active
            await User.update({ status: 'Active' }, { where: { id }, transaction });

            // Sync status with Manager/Technician
            if (target_user.role?.name === 'Manager') {
                await Manager.update({ status: 'Active' }, { where: { user_id: id }, transaction });
            } else if (target_user.role?.name === 'Technician') {
                await Technician.update({ status: 'Active' }, { where: { user_id: id }, transaction });
            }

            await transaction.commit();

            // Audit Log
            try {
                const userObj = typeof user === 'object' ? user : { id: user };
                await auditService.log({
                    entityType: 'user',
                    entityId: id,
                    entityName: target_user.name,
                    action: 'RESTORE',
                    user: userObj,
                    source: 'ui',
                    metadata: { message: `User restored from ${target_user.status} to Active` }
                });
            } catch (error) {
                console.error('Audit log failed for restore user:', error.message);
            }

            return await this.get_by_id(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Check phone availability
     * @param {string} phone - Phone number to check
     * @param {string} [exclude_user_id] - User ID to exclude
     * @returns {Promise<Object>}
     */
    async check_phone(phone, exclude_user_id = null) {
        const phone_validation = validate_phone_number(phone);
        if (!phone_validation.isValid) {
            return {
                exists: false,
                available: false,
                valid: false,
                message: phone_validation.message
            };
        }

        const normalized = normalize_phone(phone);
        const where_clause = { phone: { [Op.ne]: null } };
        if (exclude_user_id) {
            where_clause.id = { [Op.ne]: exclude_user_id };
        }

        const users = await User.findAll({
            attributes: ['id', 'phone'],
            where: where_clause
        });

        const existing = users.find(u => {
            if (!u.phone) return false;
            return normalize_phone(u.phone) === normalized;
        });

        return {
            exists: !!existing,
            available: !existing,
            valid: true,
            message: existing
                ? "Phone number already registered"
                : "Phone number is available"
        };
    }

    /**
     * Generate manager code
     * @private
     */
    async _generate_manager_code(transaction = null) {
        const managers = await Manager.findAll({
            attributes: ['manager_code'],
            transaction
        });

        let max_num = 0;
        managers.forEach(m => {
            const match = m.manager_code?.match(/MGR(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > max_num) max_num = num;
            }
        });

        return `MGR${(max_num + 1).toString().padStart(4, '0')}`;
    }

    /**
     * Generate technician code
     * @private
     */
    async _generate_technician_code(transaction = null) {
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
     * Update manager specific data
     */
    async update_manager_data(user_id, data, user) {
        const { plant_ids } = data;

        const manager = await Manager.findOne({ where: { user_id } });
        if (!manager) throw { status: 404, message: "Manager profile not found" };

        const transaction = await sequelize.transaction();
        try {
            // Update plants
            if (plant_ids) {
                await PlantManager.destroy({ where: { manager_id: manager.id }, transaction });

                if (plant_ids.length > 0) {
                    const assignments = plant_ids.map(plant_id => ({
                        manager_id: manager.id,
                        plant_id
                    }));
                    await PlantManager.bulkCreate(assignments, { transaction });
                }
            }
            await transaction.commit();

            // Audit Log
            try {
                await auditService.log({
                    entityType: 'user',
                    entityId: user_id,
                    entityName: manager.name || 'Manager',
                    action: 'UPDATE',
                    fieldName: 'plants',
                    user: typeof user === 'object' ? user : { id: user },
                    source: 'ui',
                    changes: { plant_ids: { old: 'N/A', new: data.plant_ids } }
                });
            } catch (error) {
                console.error('Audit log failed for update_manager_data:', error.message);
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    /**
     * Update technician specific data
     */
    async update_technician_data(user_id, data, user) {
        console.log(`[USER_SERVICE] Updating technician data for user ${user_id}`, JSON.stringify(data, null, 2));
        const technician = await Technician.findOne({ where: { user_id } });
        if (!technician) throw { status: 404, message: "Technician profile not found" };

        const {
            technicianType, type, // handle both
            experience, specialization,
            vendorId, vendor_id,
            plantManagerPairs, plantIds, plantId,
            categoryIds, managerIds
        } = data;

        const final_type = technicianType || type || technician.technician_type;
        const final_vendor = vendorId || vendor_id || technician.vendor_id;

        const transaction = await sequelize.transaction();
        try {
            // Update basic fields
            await technician.update({
                technician_type: final_type,
                experience: experience || technician.experience,
                specialization: specialization || technician.specialization,
                vendor_id: final_vendor
            }, { transaction });

            // Update Plants
            if (plantManagerPairs || plantIds || plantId) {
                await TechnicianPlant.destroy({ where: { technician_id: technician.id }, transaction });

                const final_plant_ids = final_type === 'In-House' || final_type === 'In House'
                    ? (plantId ? [plantId] : [])
                    : (plantIds || []);

                if (plantManagerPairs && plantManagerPairs.length > 0) {
                    // Normalize and Deduplicate pairs
                    // Priority: Use the last occurrence for a given plant (latest update)
                    const normalizedPairs = new Map();

                    plantManagerPairs.forEach(pair => {
                        const pId = pair.plantId || pair.plant_id;
                        const mId = pair.managerId || pair.manager_id || null;
                        if (pId) {
                            normalizedPairs.set(pId, { plant_id: pId, manager_id: mId });
                        }
                    });

                    for (const pair of normalizedPairs.values()) {
                        await TechnicianPlant.create({
                            technician_id: technician.id,
                            plant_id: pair.plant_id,
                            manager_id: pair.manager_id
                        }, { transaction });
                    }
                } else if (final_plant_ids.length > 0) {
                    const assignments = final_plant_ids.map(pid => ({
                        technician_id: technician.id,
                        plant_id: pid
                    }));
                    await TechnicianPlant.bulkCreate(assignments, { transaction });
                }
            }

            // Update Managers (if direct assignment)
            if (managerIds) {
                await TechnicianManager.destroy({ where: { technician_id: technician.id }, transaction });
                if (managerIds.length > 0) {
                    const assignments = managerIds.map(mid => ({
                        technician_id: technician.id,
                        manager_id: mid
                    }));
                    await TechnicianManager.bulkCreate(assignments, { transaction });
                }
            }

            // Update Categories
            if (categoryIds) {
                await TechnicianCategory.destroy({ where: { technician_id: technician.id }, transaction });
                if (categoryIds.length > 0) {
                    const assignments = categoryIds.map(cid => ({
                        technician_id: technician.id,
                        category_id: cid
                    }));
                    await TechnicianCategory.bulkCreate(assignments, { transaction });
                }
            }

            await transaction.commit();

            // Audit Log
            try {
                // Determine what changed for metadata
                const metadata = { type: final_type, vendor: final_vendor };

                await auditService.log({
                    entityType: 'user',
                    entityId: user_id,
                    entityName: technician.name || 'Technician',
                    action: 'UPDATE',
                    fieldName: 'technician_data',
                    user: typeof user === 'object' ? user : { id: user },
                    source: 'ui',
                    changes: data
                });
            } catch (error) {
                console.error('Audit log failed for update_technician_data:', error.message);
            }
        } catch (error) {
            console.error('[USER_SERVICE] Error updating technician data:', error);
            if (error.errors) {
                console.error('[USER_SERVICE] Validation errors:', error.errors.map(e => e.message));
            }
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Bulk import users (with upsert by email)
     * If email exists, updates user data (EXCLUDING password for security).
     * Otherwise, creates a new user.
     * @param {Array} rawRecords - Raw records from import
     * @param {string} createdBy - User ID who is creating
     * @returns {Object} - Results with created/updated counts and errors
     */
    async bulkImportUsers(rawRecords, user) {
        // Accept either full user object or just user ID for backward compatibility
        const createdBy = user?.id || user;
        const results = { created: 0, updated: 0, errors: [] };

        // Pre-fetch all roles for resolution
        const roles = await Role.findAll();
        const roleMap = new Map();
        roles.forEach(role => {
            roleMap.set(role.name.toLowerCase(), role.id);
        });
        const availableRoles = Array.from(roleMap.keys());

        // Pre-fetch existing users by email for upsert
        const emailsToCheck = rawRecords
            .map(r => r.email || r.Email || r['Email Address'])
            .filter(e => e && e.trim() !== '');

        const existingByEmail = new Map();
        if (emailsToCheck.length > 0) {
            const existingUsers = await User.findAll({
                where: { email: { [Op.in]: emailsToCheck } },
                attributes: ['id', 'email']
            });
            existingUsers.forEach(u => {
                existingByEmail.set(u.email.toLowerCase(), u);
            });
        }

        // Helper to get field from record using multiple possible keys
        const getField = (record, ...keys) => {
            // Check exact keys first
            for (const key of keys) {
                if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
                if (record[key + ' *'] !== undefined && record[key + ' *'] !== null && record[key + ' *'] !== '') return record[key + ' *'];
            }

            // Check normalized keys (case-insensitive, ignoring spaces/underscores)
            const normalizedRecord = {};
            Object.keys(record).forEach(k => {
                const val = record[k];
                if (val === undefined || val === null || val === '') return;

                const cleanKey = k.replace(/ \**$/, '').replace(/\*$/, '').toLowerCase().trim();
                normalizedRecord[cleanKey] = val;
                normalizedRecord[cleanKey.replace(/_/g, '')] = val;
                normalizedRecord[cleanKey.replace(/\s+/g, '')] = val;
                normalizedRecord[cleanKey.replace(/\s+/g, '_')] = val;
            });

            for (const key of keys) {
                const lowerKey = key.toLowerCase();
                if (normalizedRecord[lowerKey]) return normalizedRecord[lowerKey];
                if (normalizedRecord[lowerKey.replace(/_/g, '')]) return normalizedRecord[lowerKey.replace(/_/g, '')];
                if (normalizedRecord[lowerKey.replace(/\s+/g, '')]) return normalizedRecord[lowerKey.replace(/\s+/g, '')];
            }
            return undefined;
        };

        for (let i = 0; i < rawRecords.length; i++) {
            const record = rawRecords[i];
            try {
                // Normalize field names
                const name = getField(record, 'name', 'Name', 'Full Name');
                const email = getField(record, 'email', 'Email', 'Email Address');
                const phone = getField(record, 'phone', 'Phone', 'Phone Number', 'phone_number');
                const password = getField(record, 'password', 'Password');
                let roleInput = getField(record, 'role', 'Role', 'User Role'); // Name
                let roleId = getField(record, 'role_id', 'roleId', 'Role ID');
                const status = getField(record, 'status', 'Status');

                if (!email) throw new Error('Email is required');

                // Check if email already exists for upsert
                const existingUser = existingByEmail.get(email.toLowerCase());

                if (existingUser) {
                    // === UPDATE EXISTING USER ===
                    // For update, we only populate fields that are provided
                    const updateData = {};
                    if (name) updateData.name = name;
                    if (phone) updateData.phone = phone;
                    if (status) updateData.status = status;

                    // Allow status update (defaulting to Active only on CREATE)
                    // If provided status, use it.

                    // Check if we actually have data to update
                    if (Object.keys(updateData).length > 0) {
                        await this.update(existingUser.id, updateData, user, 'import');
                        results.updated++;
                    } else {
                        // No changes provided
                        results.updated++;
                    }

                    // Optional: Handle Role Update
                    if (roleId || roleInput) {
                        try {
                            if (!roleId && roleInput) {
                                const roleName = roleInput.toString().toLowerCase().trim();
                                roleId = roleMap.get(roleName);
                            }
                            if (roleId && existingUser.role_id !== roleId) {
                                // Logic to update role if you want to support it
                                // But keeping it safe based on previous comments
                            }
                        } catch (e) {
                            // ignore role lookup error for existing user if unnecessary
                        }
                    }

                } else {
                    // === CREATE NEW USER ===
                    if (!name) throw new Error('Name is required');
                    if (!password) throw new Error('Password is required for new users');

                    // Resolve Role (Mandatory for Create)
                    if (!roleId && roleInput) {
                        const roleName = roleInput.toString().toLowerCase().trim();
                        roleId = roleMap.get(roleName);
                        if (!roleId) {
                            throw new Error(`Role "${roleInput}" not found. Available: ${availableRoles.join(', ')}`);
                        }
                    } else if (!roleId) {
                        throw new Error(`Role is required. Provide 'Role' (name) or 'Role ID'. Available: ${availableRoles.join(', ')}`);
                    }

                    const userData = {
                        name,
                        email,
                        phone,
                        password,
                        role_id: roleId,
                        status: status || 'Active'
                    };

                    await this.create(userData, user, 'import');
                    results.created++;
                }

            } catch (err) {
                results.errors.push({
                    row: i + 1,
                    data: { name: record.name, email: record.email },
                    error: err.message
                });
            }
        }

        // Add imported count for backward compatibility
        results.imported = results.created + results.updated;
        return results;
    }
}

module.exports = new UserService();
