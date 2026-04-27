/**
 * Role Service - Handles role management business logic
 */
const { Role, Permission, RolePermission, User } = require('../../models/user-management');
const { sequelize } = require('../../../config/config');
const auditService = require('../audit/audit_service');

class RoleService {
    /**
     * Get all roles
     * @returns {Promise<Role[]>}
     */
    async get_all() {
        const roles = await Role.findAll({
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }],
            order: [['created_at', 'DESC']]
        });

        return roles;
    }

    /**
     * Get role by ID
     * @param {string} id - Role ID
     * @returns {Promise<Role>}
     */
    async get_by_id(id) {
        const role = await Role.findByPk(id, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }]
        });

        if (!role) {
            throw { status: 404, message: "Role not found" };
        }

        return role;
    }

    /**
     * Create a new role
     * @param {Object} data - Role data
     * @param {string} data.name - Role name
     * @param {string} [data.description] - Role description
     * @returns {Promise<Role>}
     */
    async create(data, user) {
        const { name, description } = data;

        // Check if role name already exists
        const existing = await Role.findOne({ where: { name } });
        if (existing) {
            throw { status: 400, message: "Role with this name already exists" };
        }

        const role = await Role.create({
            name,
            description: description || '',
            is_default: false
        });

        // Handle permissions if provided
        if (data.permissions && data.permissions.entities) {
            await this._resolve_and_update_permissions(role.id, data.permissions.entities);
        }

        // Audit Log
        try {
            const userObj = typeof user === 'object' ? user : { id: user };
            await auditService.log({
                entityType: 'role',
                entityId: role.id,
                entityName: role.name,
                action: 'CREATE',
                user: userObj,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for create role:', error.message);
        }

        return await this.get_by_id(role.id);
    }

    /**
     * Update a role
     * @param {string} id - Role ID
     * @param {Object} data - Update data
     * @returns {Promise<Role>}
     */
    async update(id, data, user) {
        const { name, description } = data;

        const role = await Role.findByPk(id);
        if (!role) {
            throw { status: 404, message: "Role not found" };
        }

        // Prevent changing name of default roles
        if (role.is_default && name && name !== role.name) {
            throw { status: 400, message: "Cannot change the name of default roles (Admin, Manager, Technician)" };
        }

        // Check if new name already exists
        if (!role.is_default && name && name !== role.name) {
            const existing = await Role.findOne({ where: { name } });
            if (existing) {
                throw { status: 400, message: "Role with this name already exists" };
            }
        }

        // Prepare update data
        const update_data = {};
        if (description !== undefined) update_data.description = description;
        if (!role.is_default && name) update_data.name = name;

        await Role.update(update_data, { where: { id } });

        // Handle permissions update if provided
        if (data.permissions && data.permissions.entities) {
            await this._resolve_and_update_permissions(id, data.permissions.entities);
        }

        // Audit Log
        try {
            // Re-fetch updated role for logging if needed, or rely on update data
            const updatedRole = await Role.findByPk(id);
            const changes = auditService.calculateChanges(role.toJSON(), updatedRole.toJSON());

            if (changes || (data.permissions && data.permissions.entities)) {
                await auditService.log({
                    entityType: 'role',
                    entityId: id,
                    entityName: updatedRole.name,
                    action: 'UPDATE',
                    changes: changes || { permissions: 'Updated' },
                    user,
                    source: 'ui'
                });
            }
        } catch (error) {
            console.error('Audit log failed for update role:', error.message);
        }

        return await this.get_by_id(id);
    }

    /**
     * Helper to resolve frontend permissions to DB IDs and update
     * @param {string} role_id 
     * @param {Object} entities_payload 
     */
    async _resolve_and_update_permissions(role_id, entities_payload) {
        // 1. Fetch ALL permissions to create lookup map
        const all_permissions = await Permission.findAll();
        const permission_map = {}; // Key: "entity:action" -> ID

        all_permissions.forEach(p => {
            if (p.entity_name && p.action_name) {
                const key = `${p.entity_name.toLowerCase()}:${p.action_name.toLowerCase()}`;
                permission_map[key] = p.id;
            }
        });

        const permission_ids_to_assign = [];

        // Entity Name Mapping (Frontend -> Backend/DB)
        const ENTITY_DB_MAP = {
            'users': 'User',
            'roles': 'Role',
            'plants': 'Plant', // Assuming this exists
            'managers': 'Manager',
            'technicians': 'Technician',
            // Add mappings for other entities as they appear in DB
            // Using a heuristic as fallback
        };

        // 2. Iterate payload
        for (const [entity_key, data] of Object.entries(entities_payload)) {
            // Determine DB Entity Name
            let db_entity_name = ENTITY_DB_MAP[entity_key];

            if (!db_entity_name) {
                // Heuristic: remove 's' and capitalize (e.g. 'reports' -> 'Report')
                // This matches the DB seeding pattern seen in logs (e.g. "Report", "Dashboard")
                if (entity_key.endsWith('s')) {
                    db_entity_name = entity_key.slice(0, -1);
                } else {
                    db_entity_name = entity_key;
                }
                // Capitalize first letter
                db_entity_name = db_entity_name.charAt(0).toUpperCase() + db_entity_name.slice(1);
            }

            // Also check for direct matches in case mapping is off (e.g. "Dashboard" -> "Dashboard")
            const direct_match = all_permissions.find(p => p.entity_name.toLowerCase() === entity_key.toLowerCase());
            if (direct_match) {
                db_entity_name = direct_match.entity_name;
            }

            if (data.actions) {
                for (const [action, is_enabled] of Object.entries(data.actions)) {
                    if (is_enabled === true) {
                        const lookup_key = `${db_entity_name.toLowerCase()}:${action.toLowerCase()}`;
                        const perm_id = permission_map[lookup_key];

                        if (perm_id) {
                            permission_ids_to_assign.push(perm_id);
                        }
                    }
                }
            }
        }

        // 3. Update permissions using existing logic
        if (permission_ids_to_assign.length > 0) {
            await this.assign_permissions(role_id, permission_ids_to_assign);
        } else {
            // If payload explicitly cleared permissions, we should clear them
            // But be careful not to accidental clear if payload was malformed.
            // For now, if valid payload yielded 0 IDs, it means no permissions.
            await this.assign_permissions(role_id, []);
        }
    }

    /**
     * Delete a role
     * @param {string} id - Role ID
     */
    async delete(id, user) {
        const role = await Role.findByPk(id);
        if (!role) {
            throw { status: 404, message: "Role not found" };
        }

        // Prevent deletion of default roles
        if (role.is_default) {
            throw { status: 400, message: "Cannot delete default roles (Admin, Manager, Technician)" };
        }

        // Check if any users are assigned to this role
        const users_count = await User.count({ where: { role_id: id } });
        if (users_count > 0) {
            throw { status: 400, message: "Cannot delete role. Users are assigned to this role." };
        }

        await Role.destroy({ where: { id } });

        // Audit Log
        try {
            const userObj = typeof user === 'object' ? user : { id: user };
            await auditService.log({
                entityType: 'role',
                entityId: id,
                entityName: role.name,
                action: 'DELETE',
                user: userObj,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for delete role:', error.message);
        }
    }

    /**
     * Assign permissions to a role
     * @param {string} role_id - Role ID
     * @param {string[]} permission_ids - Array of permission IDs
     */
    async assign_permissions(role_id, permission_ids, user) {
        const role = await Role.findByPk(role_id);
        if (!role) {
            throw { status: 404, message: "Role not found" };
        }

        const transaction = await sequelize.transaction();

        try {
            // Remove existing role permissions
            await RolePermission.destroy({
                where: { role_id },
                transaction
            });

            // Add new permissions
            if (permission_ids && permission_ids.length > 0) {
                const role_permissions = permission_ids.map(permission_id => ({
                    role_id,
                    permission_id
                }));

                await RolePermission.bulkCreate(role_permissions, { transaction });
            }

            await transaction.commit();



            // Audit Log
            try {
                const userObj = typeof user === 'object' ? user : { id: user };
                await auditService.log({
                    entityType: 'role',
                    entityId: role_id,
                    entityName: role.name,
                    action: 'UPDATE',
                    fieldName: 'permissions',
                    user: userObj,
                    source: 'ui',
                    metadata: { message: `Updated permissions` }
                });
            } catch (error) {
                console.error('Audit log failed for assign_permissions:', error.message);
            }

            return await this.get_by_id(role_id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new RoleService();
