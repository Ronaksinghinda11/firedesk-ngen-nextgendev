/**
 * Permission Service - Handles permission management business logic
 */
const { Permission, Role, RolePermission } = require('../../models/user-management');

class PermissionService {
    /**
     * Get all permissions
     * @returns {Promise<Permission[]>}
     */
    async get_all() {
        const permissions = await Permission.findAll({
            order: [['entity_name', 'ASC'], ['action_name', 'ASC']]
        });

        return permissions;
    }

    /**
     * Get permission by ID
     * @param {string} id - Permission ID
     * @returns {Promise<Permission>}
     */
    async get_by_id(id) {
        const permission = await Permission.findByPk(id);

        if (!permission) {
            throw { status: 404, message: "Permission not found" };
        }

        return permission;
    }

    /**
     * Get permissions grouped by entity
     * @returns {Promise<Object>}
     */
    async get_grouped_by_entity() {
        const permissions = await this.get_all();

        const grouped = {};
        permissions.forEach(permission => {
            const entity = permission.entity_name;
            if (!grouped[entity]) {
                grouped[entity] = [];
            }
            grouped[entity].push(permission);
        });

        return grouped;
    }

    /**
     * Create a new permission
     * @param {Object} data - Permission data
     * @param {string} data.entity_name - Entity name
     * @param {string} data.action_name - Action name
     * @returns {Promise<Permission>}
     */
    async create(data) {
        const { entity_name, action_name } = data;

        // Check if permission already exists
        const existing = await Permission.findOne({
            where: { entity_name, action_name }
        });

        if (existing) {
            throw { status: 400, message: "Permission already exists for this entity and action" };
        }

        const permission = await Permission.create({
            entity_name,
            action_name
        });

        return permission;
    }

    /**
     * Create multiple permissions for an entity
     * @param {string} entity_name - Entity name
     * @param {string[]} actions - Array of action names
     * @returns {Promise<Permission[]>}
     */
    async create_for_entity(entity_name, actions) {
        const permissions = [];

        for (const action_name of actions) {
            // Check if already exists
            let permission = await Permission.findOne({
                where: { entity_name, action_name }
            });

            if (!permission) {
                permission = await Permission.create({
                    entity_name,
                    action_name
                });
            }

            permissions.push(permission);
        }

        return permissions;
    }

    /**
     * Delete a permission
     * @param {string} id - Permission ID
     */
    async delete(id) {
        const permission = await Permission.findByPk(id);
        if (!permission) {
            throw { status: 404, message: "Permission not found" };
        }

        // Remove from all role_permissions first
        await RolePermission.destroy({
            where: { permission_id: id }
        });

        await Permission.destroy({ where: { id } });
    }

    /**
     * Get permissions for a role
     * @param {string} role_id - Role ID
     * @returns {Promise<Permission[]>}
     */
    async get_by_role(role_id) {
        const role = await Role.findByPk(role_id, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }]
        });

        if (!role) {
            throw { status: 404, message: "Role not found" };
        }

        return role.permissions;
    }

    /**
     * Sync default permissions (create if not exists)
     * @param {Object} entities - Entity definitions { ENTITY_NAME: 'entity_name' }
     * @param {Object} actions - Action definitions { ACTION_NAME: 'action_name' }
     */
    async sync_defaults(entities, actions) {
        const entity_values = Object.values(entities);
        const action_values = Object.values(actions);

        for (const entity_name of entity_values) {
            for (const action_name of action_values) {
                const existing = await Permission.findOne({
                    where: { entity_name, action_name }
                });

                if (!existing) {
                    await Permission.create({ entity_name, action_name });
                }
            }
        }
    }
}

module.exports = new PermissionService();
