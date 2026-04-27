// src/components/generic/types/entity.types.ts
// Extracted from GenericEntityPage.tsx - Lines 83-202

import { Entity, Action } from "@/types/permissions";

// Generic interfaces
export interface BaseEntity {
    id: string;
    name: string;
    status: "Active" | "Inactive";
    createdAt: string;
    createdBy: string;
    updatedAt?: string;
}

export interface Activity {
    id: string;
    action: string;
    entityName: string;
    user: string;
    userAvatar?: string;
    timestamp: string;
    details?: string;
    type: "create" | "update" | "delete" | "comment";
}

export interface EntityField {
    name: string;
    label: string;
    type: "text" | "select" | "textarea" | "date" | "number" | "switch";
    options?: string[];
    required?: boolean;
    referenceData?: any[];
    placeholder?: string;
}

export interface WizardStep {
    id: string;
    name: string;
    description?: string;
}

export interface FormSection {
    id: string;
    title: string;
    description?: string;
    fields?: string[]; // Names of the fields to show in this section (from fields array)
    render?: (formData: any, setFormData: any) => React.ReactNode; // Custom render function for the section
    noHeader?: boolean; // If true, the default section header won't be rendered (useful when component renders its own header)
    maxWidth?: string; // Custom max-width for this section (overrides global formMaxWidth)
}

// View type aliases
export type ViewType = "list" | "create" | "edit" | "preview";
export type ViewMode = "table" | "grid";
export type ArchiveStatus = "active" | "archived";

// Filter options type (legacy, will be replaced by dynamic filters)
export interface FilterOptions {
    status: string;
    dateRange: string;
    sortBy: string;
}

// New Dynamic Filter Types
export type FilterOperator = "is" | "isNot" | "contains" | "before" | "after" | "overdue" | "dueSoon";

export interface FilterAttribute {
    id: string;
    label: string;
    type: "text" | "select" | "date" | "number";
    options?: { label: string; value: string }[] | string[]; // simple string array or object array
    operators?: FilterOperator[];
    mandatory?: boolean; // If true, column cannot be hidden
    hiddenByDefault?: boolean; // If true, column is hidden but available via filter
    filterable?: boolean; // If false, column is display-only and won't appear in filter dropdown (default: true)
    sortable?: boolean; // If false, column header won't be clickable for sorting (default: true)
    dynamicOptionsFromEntities?: boolean; // If true, dropdown options are generated from unique values in the data
    entityField?: string; // Field to use for generating options (defaults to attribute id)
    sticky?: boolean; // If true, column will be sticky to the left
}

export interface ActiveFilter {
    id: string; // Internal unique ID for the row
    attributeId: string;
    operator: FilterOperator;
    value: any;
}

export interface SortConfig {
    field: string;
    direction: "asc" | "desc";
}

export interface ViewConfig {
    visibleColumns: string[];
    filters: ActiveFilter[];
    sorts: SortConfig[];
}

// Settings type
export interface EntitySettings {
    itemsPerPage: string;
    defaultView: string;
}

// Comment type
export interface Comment {
    id: string;
    text: string;
    user: string;
    timestamp: string;
    avatar?: string;
}

export interface EntityConfig {
    entityName: string;
    entityNamePlural: string;
    apiEndpoint?: string; // Optional when customFetchAll is provided
    responseKey?: string;
    fields: EntityField[];
    additionalFields?: React.ReactNode;
    transformData?: (data: any) => any;
    transformResponse?: (response: any) => any;
    customActions?: (entity: BaseEntity) => React.ReactNode;
    customColumns?: (entity: any, isVisible: (fieldId: string) => boolean) => React.ReactNode;
    customHeaders?: string[]; // Custom table headers to match customColumns

    // Archive/Restore configuration
    archiveFields?: string[]; // List of required fields to include when archiving/restoring
    excludeFields?: string[]; // List of fields to exclude when archiving/restoring
    supportsArchive?: boolean; // If false, archive button is hidden (default: false)
    archiveStatusValue?: string; // Custom status value for archived state (e.g., 'Deactive')
    archiveStatusField?: string; // Custom field name for archive status (e.g., 'completedStatus' for tickets, defaults to 'status')

    // Wizard support
    wizardSteps?: WizardStep[];
    renderWizardStep?: (
        step: string,
        formData: any,
        setFormData: any,
        currentStep: string,
        setCurrentStep: any
    ) => React.ReactNode;
    onWizardNext?: (
        currentStep: string,
        formData: any
    ) => boolean | Promise<boolean>;
    onWizardBack?: (currentStep: string) => void;
    onWizardSubmit?: (formData: any) => Promise<void>;

    // Form layout configuration
    formSections?: FormSection[];
    formLayout?: "wizard" | "sections"; // Default: wizard if wizardSteps present, else simple list
    formGridAlignment?: "start" | "stretch"; // How to align form section cards in the grid (default: stretch)

    // Navigation overrides
    onCreate?: () => void;
    onEdit?: (entity: BaseEntity) => void;
    onView?: (entity: BaseEntity) => void;

    customStatusRender?: (entity: BaseEntity) => React.ReactNode;

    // Custom header actions (rendered before the Add button)
    headerActions?: () => React.ReactNode;

    // Hide the default create button (useful when using custom headerActions)
    hideCreateButton?: boolean;

    // List View Configuration
    defaultSort?: { key: string; direction: 'asc' | 'desc' };

    // Permission configuration
    permissionEntity?: Entity; // The entity to check permissions for
    enforcePermissions?: boolean; // If true, enforces permission-based button visibility (default: false)

    // Custom data fetching support
    customFetchAll?: () => Promise<any>; // Custom function to fetch all entities
    fetchTrigger?: any; // Dependency that triggers re-fetch when changed
    // Optional function to get initial form data (e.g. from URL params)
    getInitialFormData?: () => any;
    // Optional function to load additional entity data when editing
    loadEntityData?: (entityId: string, formData?: any) => Promise<any>;

    // Plant filter support
    enablePlantFilter?: boolean; // If true, automatically applies plant filter from context (default: false)
    plantFilterParam?: string; // Custom param name for plant filter (default: 'plantId')

    // Pagination support
    pagination?: boolean; // If true, enables server-side pagination
    itemsPerPage?: number; // Number of items per page (default: 10)

    // UI customization options
    hideCreateEditButtons?: ('preview' | 'documents' | 'history' | 'kebab')[]; // Hide specific buttons on Create/Edit page
    hideDeleteButton?: boolean; // If true, hides the delete button from listing rows
    hideListingRowKebab?: boolean; // If true, hides the kebab menu from listing rows
    limitTopMenuItems?: ('export' | 'import' | 'print' | 'share' | 'refresh' | 'bulkActions' | 'settings' | 'help' | 'history')[]; // Limit top menu items to specific actions

    // New Filter Configuration
    filterAttributes?: FilterAttribute[];
    customEmptyState?: React.ReactNode;

    // Import configuration - defines fields for import template
    // Each field has: id (db column name), label (display name), required (mandatory)
    importFields?: Array<{
        id: string;      // Database field name (snake_case)
        label: string;   // Human-readable label
        required?: boolean; // If true, field is mandatory (marked with *)
    }>;

    // Custom bulk actions support
    customBulkActions?: Array<{
        label: string;
        icon?: React.ReactNode;
        variant?: 'default' | 'outline' | 'ghost' | 'destructive';
        onClick: (selectedIds: string[], entities: any[], setSelectedEntities?: (ids: Set<string>) => void) => void | Promise<void>;
    }>;

    // Custom form renderer (replaces wizard/sections for create/edit view)
    renderCustomForm?: (params: {
        editingEntity: any | null;
        onCancel: () => void;
        onSaveComplete: () => void;
    }) => React.ReactNode;

    // Custom form max width (e.g., "max-w-7xl", "w-full")
    formMaxWidth?: string;

    // If true, skip duplicate name check on create/edit (e.g., for Users where same name is OK)
    allowDuplicateNames?: boolean;

    // Added missing properties found in GenericEntityPage usage
    activeParams?: Record<string, any>;
    archiveParams?: Record<string, any>;
}
