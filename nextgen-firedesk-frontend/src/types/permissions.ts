/**
 * Permission Types
 * Defines all permission-related types for the frontend
 */

export enum PermissionLevel {
  NONE = "none",
  VIEW = "view",
  ASSIGN_UPDATE_VIEW = "assign_update_view",
  FULL_CRUD = "full_crud",
}

export enum Entity {
  USERS = "users",
  ROLES = "roles",
  PERMISSIONS = "permissions",
  PLANTS = "plants",
  MANAGERS = "managers",
  TECHNICIANS = "technicians",
  JOBS = "jobs",
  TASK_STATUS = "taskStatus",
  DASHBOARD = "dashboard",
  REPORTS = "reports",
  CATEGORIES = "categories",
  PRODUCTS = "products",
  VENDORS = "vendors",
  INDUSTRIES = "industries",
  CONDITIONS = "conditions",
  ASSETS = "assets",
  FLOORPLANS = "floorplans",
  SERVICE_FORMS = "serviceForms",
  GROUP_SERVICE = "groupService",
  SERVICES = "services",
  TICKETS = "tickets",
  AUDITS = "audits",
  ARCHIVE = "archive",
  INCIDENTS = "incidents",
  CAPA_STEPS = "capaSteps",
  CALENDAR = "calendar",
  SCHEDULER = "scheduler",
  INVENTORY = "inventory",
}

export enum Action {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  ASSIGN = "assign",
  EXPORT = "export",
}

export interface EntityPermission {
  level: PermissionLevel;
  actions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    assign: boolean;
    export?: boolean;
  };
}

export interface Permissions {
  entities: {
    [key in Entity]?: EntityPermission;
  };
  resources?: {
    plants?: string[];
    categories?: string[];
  };
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permissions;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  displayName?: string;
  userType: "admin" | "manager" | "technician";
  role?: Role;
  createdAt?: string;
  updatedAt?: string;
}

// Permission level labels for UI
export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  [PermissionLevel.NONE]: "No Access",
  [PermissionLevel.VIEW]: "View Only",
  [PermissionLevel.ASSIGN_UPDATE_VIEW]: "Assign/Update/View",
  [PermissionLevel.FULL_CRUD]: "Full Control (CRUD)",
};

// Permission level descriptions for UI
export const PERMISSION_LEVEL_DESCRIPTIONS: Record<PermissionLevel, string> = {
  [PermissionLevel.NONE]: "Cannot access this feature",
  [PermissionLevel.VIEW]: "Can only view, no modifications allowed",
  [PermissionLevel.ASSIGN_UPDATE_VIEW]:
    "Can assign, update, and view (cannot create or delete)",
  [PermissionLevel.FULL_CRUD]: "Complete control: Create, Read, Update, Delete",
};

// Entity labels for UI
export const ENTITY_LABELS: Record<Entity, string> = {
  [Entity.USERS]: "Users",
  [Entity.ROLES]: "Roles",
  [Entity.PERMISSIONS]: "Permissions",
  [Entity.PLANTS]: "Plants",
  [Entity.MANAGERS]: "Managers",
  [Entity.TECHNICIANS]: "Technicians",
  [Entity.JOBS]: "Jobs/Tasks",
  [Entity.TASK_STATUS]: "Task Status",
  [Entity.DASHBOARD]: "Dashboard",
  [Entity.REPORTS]: "Reports",
  [Entity.CATEGORIES]: "Categories",
  [Entity.PRODUCTS]: "Products",
  [Entity.VENDORS]: "Vendors",
  [Entity.INDUSTRIES]: "Industries",
  [Entity.CONDITIONS]: "Conditions",
  [Entity.ASSETS]: "Assets",
  [Entity.FLOORPLANS]: "Floorplans",
  [Entity.SERVICE_FORMS]: "Service Forms",
  [Entity.GROUP_SERVICE]: "Group Service",
  [Entity.SERVICES]: "Services",
  [Entity.TICKETS]: "Tickets",
  [Entity.AUDITS]: "Audits",
  [Entity.ARCHIVE]: "Archive",
  [Entity.INCIDENTS]: "Incidents",
  [Entity.CAPA_STEPS]: "CAPA Steps",
  [Entity.CALENDAR]: "Calendar",
  [Entity.SCHEDULER]: "Scheduler",
  [Entity.INVENTORY]: "Inventory",
};

// Entity descriptions for UI
export const ENTITY_DESCRIPTIONS: Record<Entity, string> = {
  [Entity.USERS]: "Manage user accounts and profiles",
  [Entity.ROLES]: "Manage roles and permissions",
  [Entity.PERMISSIONS]: "Manage permission definitions",
  [Entity.PLANTS]: "Manage plant facilities",
  [Entity.MANAGERS]: "Manage manager accounts and assignments",
  [Entity.TECHNICIANS]: "Manage technician accounts and assignments",
  [Entity.JOBS]: "Manage job assignments and tasks",
  [Entity.TASK_STATUS]: "Update task and job status",
  [Entity.DASHBOARD]: "Access dashboard and analytics",
  [Entity.REPORTS]: "View and generate reports",
  [Entity.CATEGORIES]: "Manage asset categories",
  [Entity.PRODUCTS]: "Manage products and variants",
  [Entity.VENDORS]: "Manage third-party vendors",
  [Entity.INDUSTRIES]: "Manage industry types",
  [Entity.CONDITIONS]: "Manage condition ratings",
  [Entity.ASSETS]: "Manage assets and equipment",
  [Entity.FLOORPLANS]: "Manage floor plans and layouts",
  [Entity.SERVICE_FORMS]: "Manage service form templates",
  [Entity.GROUP_SERVICE]: "Manage group service schedules",
  [Entity.SERVICES]: "Manage service submissions and schedules",
  [Entity.TICKETS]: "Manage service tickets and requests",
  [Entity.AUDITS]: "Manage audit reports and inspections",
  [Entity.ARCHIVE]: "Access archived documents and records",
  [Entity.INCIDENTS]: "Manage incident reports",
  [Entity.CAPA_STEPS]: "Manage CAPA investigation steps",
  [Entity.CALENDAR]: "View and manage calendar events",
  [Entity.SCHEDULER]: "Manage maintenance schedules",
  [Entity.INVENTORY]: "Manage inventory items and spare parts",
};

// Entities that support assignment
export const ASSIGNABLE_ENTITIES = [
  Entity.PLANTS,
  Entity.MANAGERS,
  Entity.TECHNICIANS,
  Entity.JOBS,
  Entity.VENDORS,
  Entity.ASSETS,
];

// Helper function to check if an entity supports assignment
export function isAssignableEntity(entity: Entity): boolean {
  return ASSIGNABLE_ENTITIES.includes(entity);
}

// Helper function to get permission level options for an entity
export function getPermissionLevelOptions(entity: Entity): PermissionLevel[] {
  // Some entities might not support certain permission levels
  // For example, Dashboard and Reports typically don't need FULL_CRUD
  switch (entity) {
    case Entity.DASHBOARD:
      return [PermissionLevel.NONE, PermissionLevel.VIEW];

    case Entity.REPORTS:
      return [PermissionLevel.NONE, PermissionLevel.VIEW];

    case Entity.TASK_STATUS:
      return [
        PermissionLevel.NONE,
        PermissionLevel.VIEW,
        PermissionLevel.ASSIGN_UPDATE_VIEW,
      ];

    default:
      return [
        PermissionLevel.NONE,
        PermissionLevel.VIEW,
        PermissionLevel.ASSIGN_UPDATE_VIEW,
        PermissionLevel.FULL_CRUD,
      ];
  }
}

// Default actions for each permission level
export const PERMISSION_LEVEL_ACTIONS: Record<
  PermissionLevel,
  EntityPermission["actions"]
> = {
  [PermissionLevel.NONE]: {
    create: false,
    read: false,
    update: false,
    delete: false,
    assign: false,
    export: false,
  },
  [PermissionLevel.VIEW]: {
    create: false,
    read: true,
    update: false,
    delete: false,
    assign: false,
    export: false,
  },
  [PermissionLevel.ASSIGN_UPDATE_VIEW]: {
    create: false,
    read: true,
    update: true,
    delete: false,
    assign: true,
    export: true,
  },
  [PermissionLevel.FULL_CRUD]: {
    create: true,
    read: true,
    update: true,
    delete: true,
    assign: true,
    export: true,
  },
};
