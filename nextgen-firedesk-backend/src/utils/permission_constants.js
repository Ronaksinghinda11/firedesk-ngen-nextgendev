/**
 * Permission Constants
 * Defines all entities, actions, and permission levels in the system
 */

const ENTITIES = {
  USERS: "users",
  ROLES: "roles",
  PERMISSIONS: "permissions",
  PLANTS: "plants",
  MANAGERS: "managers",
  TECHNICIANS: "technicians",
  JOBS: "jobs",
  TASK_STATUS: "taskStatus",
  DASHBOARD: "dashboard",
  REPORTS: "reports",
  CATEGORIES: "categories",
  PRODUCTS: "products",
  VENDORS: "vendors",
  INDUSTRIES: "industries",
  CONDITIONS: "conditions",
  ASSETS: "assets",
  SERVICE_FORMS: "serviceForms",
  GROUP_SERVICE: "groupService",
  SERVICES: "services",
  TICKETS: "tickets",
  AUDITS: "audits",
  ARCHIVE: "archive",
  FLOORPLANS: "floorplans",
  INCIDENTS: "incidents",
  CAPA_STEPS: "capaSteps",
  CALENDAR: "calendar",
  SCHEDULER: "scheduler",
  INVENTORY: "inventory",
};

const ACTIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  ASSIGN: "assign",
  EXPORT: "export",
};

const PERMISSION_LEVELS = {
  NONE: "none",
  VIEW: "view",
  ASSIGN_UPDATE_VIEW: "assign_update_view",
  FULL_CRUD: "full_crud",
};

/**
 * Map permission levels to actions
 * This defines what actions are allowed for each permission level
 */
const PERMISSION_LEVEL_ACTIONS = {
  [PERMISSION_LEVELS.NONE]: {
    create: false,
    read: false,
    update: false,
    delete: false,
    assign: false,
    export: false,
  },
  [PERMISSION_LEVELS.VIEW]: {
    create: false,
    read: true,
    update: false,
    delete: false,
    assign: false,
    export: false,
  },
  [PERMISSION_LEVELS.ASSIGN_UPDATE_VIEW]: {
    create: false,
    read: true,
    update: true,
    delete: false,
    assign: true,
    export: true,
  },
  [PERMISSION_LEVELS.FULL_CRUD]: {
    create: true,
    read: true,
    update: true,
    delete: true,
    assign: true,
    export: true,
  },
};

/**
 * Entity labels for display purposes
 */
const ENTITY_LABELS = {
  [ENTITIES.USERS]: "Users",
  [ENTITIES.ROLES]: "Roles",
  [ENTITIES.PERMISSIONS]: "Permissions",
  [ENTITIES.PLANTS]: "Plants",
  [ENTITIES.MANAGERS]: "Managers",
  [ENTITIES.TECHNICIANS]: "Technicians",
  [ENTITIES.JOBS]: "Jobs/Tasks",
  [ENTITIES.TASK_STATUS]: "Task Status",
  [ENTITIES.DASHBOARD]: "Dashboard",
  [ENTITIES.REPORTS]: "Reports",
  [ENTITIES.CATEGORIES]: "Categories",
  [ENTITIES.PRODUCTS]: "Products",
  [ENTITIES.VENDORS]: "Vendors",
  [ENTITIES.INDUSTRIES]: "Industries",
  [ENTITIES.CONDITIONS]: "Conditions",
  [ENTITIES.ASSETS]: "Assets",
  [ENTITIES.SERVICE_FORMS]: "Service Forms",
  [ENTITIES.GROUP_SERVICE]: "Group Service",
  [ENTITIES.SERVICES]: "Services",
  [ENTITIES.TICKETS]: "Tickets",
  [ENTITIES.AUDITS]: "Audits",
  [ENTITIES.ARCHIVE]: "Archive",
  [ENTITIES.FLOORPLANS]: "Floorplans",
  [ENTITIES.INCIDENTS]: "Incidents",
  [ENTITIES.CAPA_STEPS]: "CAPA Steps",
  [ENTITIES.CALENDAR]: "Calendar",
  [ENTITIES.SCHEDULER]: "Scheduler",
  [ENTITIES.INVENTORY]: "Inventory",
};

/**
 * Permission level labels for display
 */
const PERMISSION_LEVEL_LABELS = {
  [PERMISSION_LEVELS.NONE]: "No Access",
  [PERMISSION_LEVELS.VIEW]: "View Only",
  [PERMISSION_LEVELS.ASSIGN_UPDATE_VIEW]: "Assign/Update/View",
  [PERMISSION_LEVELS.FULL_CRUD]: "Full Control (CRUD)",
};

/**
 * Permission level descriptions
 */
const PERMISSION_LEVEL_DESCRIPTIONS = {
  [PERMISSION_LEVELS.NONE]: "Cannot access this feature",
  [PERMISSION_LEVELS.VIEW]: "Can only view, no modifications allowed",
  [PERMISSION_LEVELS.ASSIGN_UPDATE_VIEW]:
    "Can assign, update, and view (cannot create or delete)",
  [PERMISSION_LEVELS.FULL_CRUD]:
    "Complete control: Create, Read, Update, Delete",
};

module.exports = {
  ENTITIES,
  ACTIONS,
  PERMISSION_LEVELS,
  PERMISSION_LEVEL_ACTIONS,
  ENTITY_LABELS,
  PERMISSION_LEVEL_LABELS,
  PERMISSION_LEVEL_DESCRIPTIONS,
};
