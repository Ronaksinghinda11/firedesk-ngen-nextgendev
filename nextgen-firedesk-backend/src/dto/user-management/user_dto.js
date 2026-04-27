/**
 * User DTO - Data Transfer Object for User responses
 */
class UserDTO {
  constructor(user) {
    this.id = user.id;
    this.name = user.name || "";
    this.display_name = user.display_name || "";
    this.email = user.email || "";
    this.phone = user.phone || "";
    this.profile_pic = user.profile_pic || "";
    this.status = user.status || "Active";
    this.user_type = user.user_type || this._derive_user_type(user);
    this.created_at = user.created_at || null;
    this.updated_at = user.updated_at || null;

    // Include role with permissions for granular permission checking
    if (user.role) {
      this.role = {
        id: user.role.id,
        name: user.role.name,
        permissions: this._transform_permissions(user.role.permissions),
        is_default: user.role.is_default || false,
        description: user.role.description || "",
      };
    }

    // Include role_id for reference
    this.role_id = user.role_id || null;
  }

  /**
   * Transform backend permissions (array) to frontend format (object)
   * Handles casing normalization and robust mapping
   */
  _transform_permissions(permissions) {
    if (!permissions || !Array.isArray(permissions)) {
      // Fallback for old Format (JSON object)
      if (permissions && permissions.entities) {
        return permissions;
      }
      return { entities: {} };
    }

    const entities = {};
    const ENTITY_MAP = {
      // Singular to plural mappings
      user: "users",
      role: "roles",
      permission: "permissions",
      plant: "plants",
      manager: "managers",
      technician: "technicians",
      job: "jobs",
      task: "taskStatus",
      taskstatus: "taskStatus",
      dashboard: "dashboard",
      report: "reports",
      category: "categories",
      vendor: "vendors",
      asset: "assets",
      product: "products",
      industry: "industries",
      condition: "conditions",
      serviceform: "serviceForms",
      groupservice: "groupService",
      service: "services",
      ticket: "tickets",
      audit: "audits",
      archive: "archive",
      floorplan: "floorplans",
      incident: "incidents",
      capastep: "capaSteps",
      calendar: "calendar",
      // camelCase mappings (from permission_constants.js - preserve case)
      serviceForms: "serviceForms",
      groupService: "groupService",
      taskStatus: "taskStatus",
      capaSteps: "capaSteps",
      floorplans: "floorplans",
      // PascalCase mappings (from legacy/seeder data)
      User: "users",
      Role: "roles",
      Permission: "permissions",
      Plant: "plants",
      Manager: "managers",
      Technician: "technicians",
      Dashboard: "dashboard",
      Report: "reports",
      Category: "categories",
      Product: "products",
      Vendor: "vendors",
      Asset: "assets",
      Industry: "industries",
      Condition: "conditions",
      Incident: "incidents",
      CapaStep: "capaSteps",
      Floorplan: "floorplans",
      ServiceForm: "serviceForms",
      GroupService: "groupService",
      Service: "services",
      Ticket: "tickets",
      Audit: "audits",
      Archive: "archive",
      Calendar: "calendar",
      // Singular entities that should NOT be pluralized
      scheduler: "scheduler",
      Scheduler: "scheduler",
      // Inventory (already correct, must not become 'inventorys')
      inventory: "inventory",
      Inventory: "inventory",
    };

    permissions.forEach((perm) => {
      if (!perm.entity_name || !perm.action_name) return;

      // Normalize entity name: try original name first (for PascalCase), then lowercase
      const originalName = perm.entity_name;
      const lowercaseName = perm.entity_name.toLowerCase();

      let entityKey;

      // 1. Check original name in map (for PascalCase entries like 'Permission' -> 'permissions')
      if (ENTITY_MAP[originalName]) {
        entityKey = ENTITY_MAP[originalName];
      }
      // 2. Check lowercase in map (for 'permission' -> 'permissions')
      else if (ENTITY_MAP[lowercaseName]) {
        entityKey = ENTITY_MAP[lowercaseName];
      }
      // 3. If already plural and valid, use as-is
      else if (
        lowercaseName.endsWith("s") ||
        ["dashboard", "archive", "calendar"].includes(lowercaseName)
      ) {
        entityKey = lowercaseName;
      }
      // 4. Otherwise add 's' for plural
      else {
        entityKey = lowercaseName + "s";
      }

      const action = perm.action_name.toLowerCase();

      if (!entities[entityKey]) {
        entities[entityKey] = {
          level: "none",
          actions: {},
        };
      }

      entities[entityKey].actions[action] = true;
    });

    // Calculate permission levels based on actions
    Object.keys(entities).forEach((key) => {
      const actions = entities[key].actions;
      if (actions.create && actions.read && actions.update && actions.delete) {
        entities[key].level = "full_crud";
      } else if (actions.update || actions.assign) {
        entities[key].level = "assign_update_view";
      } else if (actions.read) {
        entities[key].level = "view";
      }
    });

    return { entities };
  }

  /**
   * Derive user type from role name if not explicitly set
   */
  _derive_user_type(user) {
    if (user.role && user.role.name) {
      return user.role.name.toLowerCase();
    }
    return "user";
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      display_name: this.display_name,
      email: this.email,
      phone: this.phone,
      profile_pic: this.profile_pic,
      status: this.status,
      user_type: this.user_type,
      role_id: this.role_id,
      role: this.role,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = UserDTO;
