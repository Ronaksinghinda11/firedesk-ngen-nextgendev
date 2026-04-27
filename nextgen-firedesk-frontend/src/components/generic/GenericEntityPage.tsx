// src/components/generic/GenericEntityPage.tsx
// MODULAR ORCHESTRATOR - Uses 10 extracted components
// Reduced from 4880 lines to ~550 lines
// Fixed: Restored redirection callbacks (onCreate/onEdit) and initialization logic (getInitialFormData)

import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Action } from "@/types/permissions";
import { usePlantFilter } from "@/contexts/PlantFilterContext";

// Extracted components - ALL 10
import {
  EntityHeader,
  EntityBulkActions,
  EntitySettingsPanel,
  EntityConfirmDialog,
  EntityTableView,
  EntityGridView,
  EntityPagination,
  EntityHistoryDrawer,
  EntityFormView,
  EntityFilterBar,
  EntityDynamicFilterPanel,
  ExportModal,
  ImportModal,
} from "./components";

// Extracted hooks
import { useEntityPermissions } from "./hooks/useEntityPermissions";

// Extracted utilities
import { formatTimestamp, getUserInitials, getActivityIcon, escapeCSV, getFieldValue } from "./utils/entityHelpers";

// Types
import type {
  BaseEntity,
  EntityConfig,
  WizardStep,
  EntityField,
  ActiveFilter,
  SortConfig,
  FilterAttribute,
  FilterOperator,
  ViewConfig
} from "./types/entity.types";
export type {
  BaseEntity,
  EntityConfig,
  WizardStep,
  EntityField,
  ActiveFilter,
  SortConfig,
  FilterAttribute,
  FilterOperator,
  ViewConfig
};

type ViewType = "list" | "create" | "edit" | "preview";
type ViewMode = "table" | "grid";
type ArchiveStatus = "active" | "archived";


interface EntitySettings {
  itemsPerPage: string;
  defaultView: string;
}

export default function GenericEntityPage({ config }: { config: EntityConfig }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission, isAdmin } = usePermissions();
  const { selectedPlantId, availablePlants } = usePlantFilter();
  const isManagerModule = window.location.pathname.includes('/manager/') || config.entityName === 'Manager';
  const { canCreate, canUpdate, canDelete } = useEntityPermissions({
    permissionEntity: config.permissionEntity,
    enforcePermissions: config.enforcePermissions,
  });

  // State: Entities
  const [entities, setEntities] = useState<BaseEntity[]>([]);
  const [archivedEntities, setArchivedEntities] = useState<BaseEntity[]>([]);
  const [loading, setLoading] = useState(true);
  // Cache full entity list for building filter options (before backend filters narrow results)
  const [entitiesForOptions, setEntitiesForOptions] = useState<BaseEntity[]>([]);

  // State: Views
  // State: Views
  const [currentView, setCurrentView] = useState<ViewType>("list");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Auto-switch to Grid view on mobile
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setViewMode("grid");
      } else {
        // Restore from settings or default to table on desktop
        const saved = localStorage.getItem(`settings_${config.entityNamePlural}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.defaultView) {
              setViewMode(parsed.defaultView as ViewMode);
            } else {
              setViewMode("table");
            }
          } catch {
            setViewMode("table");
          }
        } else {
          setViewMode("table");
        }
      }
    };

    checkMobile(); // Check on mount

    // Optional: listen for resize
    const handleResize = () => checkMobile();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // State: UI Panels
  const [showFilter, setShowFilter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>("active");
  const [settings, setSettings] = useState<EntitySettings>(() => {
    // Load settings from localStorage
    const storageKey = `settings_${config.entityNamePlural || config.entityName + 's'}`.toLowerCase();
    console.log(`[GenericEntityPage] Initializing settings from ${storageKey}`);
    const saved = localStorage.getItem(storageKey);
    console.log(`[GenericEntityPage] Raw saved value for ${storageKey}:`, saved);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('[GenericEntityPage] Parsed settings:', parsed);
        return {
          itemsPerPage: String(parsed.itemsPerPage || "10"),
          defaultView: parsed.defaultView || "table"
        };
      } catch (e) {
        console.error("[GenericEntityPage] Error parsing settings from localStorage", e);
      }
    }
    console.log('[GenericEntityPage] No saved settings or parse error, using defaults.');
    return { itemsPerPage: "10", defaultView: "table" };
  });

  // Reload settings if config changes (e.g. navigation without remount)
  useEffect(() => {
    const storageKey = `settings_${config.entityNamePlural || config.entityName + 's'}`.toLowerCase();
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.itemsPerPage !== settings.itemsPerPage || parsed.defaultView !== settings.defaultView) {
          console.log(`[GenericEntityPage] Config changed, reloading settings from ${storageKey}`);
          setSettings({
            itemsPerPage: String(parsed.itemsPerPage || "10"),
            defaultView: parsed.defaultView || "table"
          });
        }
      } catch (e) {
        console.error("Error reloading settings", e);
      }
    }
  }, [config.entityNamePlural, config.entityName]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const storageKey = `settings_${config.entityNamePlural || config.entityName + 's'}`.toLowerCase();
    console.log(`[GenericEntityPage] Saving settings to ${storageKey}:`, settings);
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, config.entityNamePlural, config.entityName]);

  // Globally filter out redundant 'plantId' from attributes (as we have a global plant filter)
  const filteredAttributes = useMemo(() =>
    (config.filterAttributes || []).filter(attr => attr.id !== "plantId"),
    [config.filterAttributes]
  );

  // New Dynamic Filter & View State
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [sorts, setSorts] = useState<SortConfig[]>([]);
  // Helper: Get default visible columns
  const getDefaultColumns = () => {
    const fieldNames = (config.fields || []).map(f => f.name);
    const filterNames = filteredAttributes.map(a => a.id);

    // Combine all potential column names that might need visibility toggling
    // Include all hardcoded entity-specific field IDs
    const allPossible = Array.from(new Set([
      ...fieldNames,
      ...filterNames,
      // Common columns
      'name', 'status', 'createdAt',
      // User columns
      'phone', 'role', 'roleId',
      // Role columns
      'description', 'isDefault', 'permissions',
      // Product columns
      'categoryId', 'testFrequency', 'variants',
      // Category columns
      'formName',
      // City columns
      'stateName',
      // Manager columns
      'managerId', 'email', 'plantIds',
    ]));

    // Filter out explicitly excluded fields
    return allPossible.filter(col => !config.excludeFields?.includes(col as any));
  };


  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    // localStorage key for this entity
    const storageKey = `firedesk_columns_${config.entityName}`;

    // Get default columns (excluding hiddenByDefault)
    const getDefaultVisibleColumns = () =>
      filteredAttributes.filter(a => !a.hiddenByDefault).map(a => a.id);

    // If entity has filterAttributes, use those as the source of truth
    // This ensures we don't use stale localStorage data from before filterAttributes were added
    if (filteredAttributes.length > 0) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Get all non-hidden-by-default filter IDs (the expected defaults)
          const defaultIds = getDefaultVisibleColumns();

          // Check if saved data has the same structure as current defaults
          // If a new column was added or hiddenByDefault changed, clear cache
          const savedSet = new Set(parsed);
          const defaultSet = new Set(defaultIds);
          const hasNewDefaults = defaultIds.some(id => !savedSet.has(id) && !filteredAttributes.find(a => a.id === id)?.hiddenByDefault);

          if (Array.isArray(parsed) && parsed.length > 0 && !hasNewDefaults) {
            // Valid cache - filter out any columns that don't exist anymore
            const validColumns = parsed.filter((col: string) =>
              filteredAttributes.some(a => a.id === col)
            );
            if (validColumns.length > 0) {
              return validColumns;
            }
          }
          // Stale data detected - clear it and use defaults
          console.log(`🔄 Clearing stale column preferences for ${config.entityName}`);
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error('Error loading column preferences from localStorage:', error);
      }
      // Return filterAttribute IDs as defaults (excluding hiddenByDefault)
      return getDefaultVisibleColumns();
    }

    // For entities without filterAttributes, use the old logic
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading column preferences from localStorage:', error);
    }

    // Fall back to defaults
    return getDefaultColumns();
  });
  const [globalSearch, setGlobalSearch] = useState("");
  const [debouncedGlobalSearch, setDebouncedGlobalSearch] = useState("");

  // Debounce global search - only update after user stops typing for 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedGlobalSearch(globalSearch);
    }, 500);

    return () => clearTimeout(timer);
  }, [globalSearch]);

  // State: Selection & Markers
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [bookmarkedEntities, setBookmarkedEntities] = useState<Set<string>>(new Set());
  const [flaggedEntities, setFlaggedEntities] = useState<Set<string>>(new Set());

  // State: Create/Edit Form
  const [editingEntity, setEditingEntity] = useState<BaseEntity | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState<string>("");
  const [wizardSteps, setWizardSteps] = useState<WizardStep[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const justChangedStepRef = useRef(false); // Prevents double submission when step changes

  // Auto-save column visibility to localStorage
  useEffect(() => {
    const storageKey = `firedesk_columns_${config.entityName}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    } catch (error) {
      console.error('Error saving column preferences to localStorage:', error);
    }
  }, [visibleColumns, config.entityName]);

  // State: Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = parseInt(settings.itemsPerPage) || 10;

  // State: Confirmation
  const [entityToDelete, setEntityToDelete] = useState<BaseEntity | null>(null);

  // State: Import/Export Modals
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // State: History & Comments
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [selectedEntityForComments, setSelectedEntityForComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState("");

  // Derived state - Use archivedEntities when in archive view
  const sourceEntities = archiveStatus === "archived" ? archivedEntities : entities;

  // Backend-handled filters: filters that the backend can process efficiently
  // Map of frontend filter IDs to backend query parameter names
  const backendFilterMap: Record<string, { param: string; operators: string[] }> = {
    'assetId': { param: 'search', operators: ['contains'] },
    'plant': { param: 'plant_id', operators: ['is', 'isNot'] },
    'building': { param: 'building_id', operators: ['is', 'isNot'] },
    'floor': { param: 'floor_id', operators: ['is', 'isNot'] },
    'wing': { param: 'wing_id', operators: ['is', 'isNot'] },
    'category': { param: 'category_id', operators: ['is', 'isNot'] },
    'product': { param: 'product_id', operators: ['is', 'isNot'] },
    'manufacturer': { param: 'manufacturer_id', operators: ['is', 'isNot'] },
    'status': { param: 'status', operators: ['is', 'isNot'] },
    'healthStatus': { param: 'health_status', operators: ['is', 'isNot'] },
    'maintenanceStatus': { param: 'maintenance_status', operators: ['is', 'isNot'] },
    'capacity': { param: 'capacity', operators: ['is', 'isNot'] }, // Now backend supports both!
    'type': { param: 'type', operators: ['is', 'isNot'] },
    'subType': { param: 'sub_type', operators: ['is', 'isNot'] },
    'location': { param: 'location', operators: ['is', 'isNot'] },
  };

  // Separate backend vs client-side filters
  const backendFilters = activeFilters.filter(f => {
    const mapping = backendFilterMap[f.attributeId];
    return mapping && mapping.operators.includes(f.operator);
  });

  // Client-side filters: "isNot" and other operators that backend can't handle
  const clientSideFilters = activeFilters.filter(f => {
    const mapping = backendFilterMap[f.attributeId];
    return !mapping || !mapping.operators.includes(f.operator);
  });

  // Only consider non-bypass client filters as "active" for pagination logic
  const hasActiveFilters = clientSideFilters.length > 0 || debouncedGlobalSearch.length > 0;

  // 1. Apply Global Search & Dynamic Filters (client-side only)
  const filteredEntities = sourceEntities.filter((e, idx) => {
    // Debug first entity's filter matching
    if (idx === 0 && clientSideFilters.length > 0) {
      console.log('🔍 [Filter Debug] First entity:', e);
      console.log('🔍 [Filter Debug] Client-side filters:', clientSideFilters);
      clientSideFilters.forEach(f => {
        console.log(`🔍 [Filter Debug] Filter "${f.attributeId}" = entity[${f.attributeId}] = "${(e as any)[f.attributeId]}"`);
      });
    }

    // Global Search
    if (debouncedGlobalSearch) {
      const searchTerms = debouncedGlobalSearch.toLowerCase();
      const match = Object.values(e).some(val =>
        String(val).toLowerCase().includes(searchTerms)
      );
      if (!match) return false;
    }


    // Dynamic Filters (only client-side filters, backend filters already applied)
    return clientSideFilters.every(filter => {
      // 1. Try exact field match first (crucial for simple string fields like type, subType, location)
      let val = (e as any)[filter.attributeId];

      // Special handling for capacity - it's extracted from spec_values in transformResponse
      // The value format is "12 Kg" or just "12"
      if (filter.attributeId === 'capacity' && !val) {
        // Fallback: extract from spec_values if not already in transformed data
        const specValues = (e as any).spec_values || (e as any).specValues || [];
        if (Array.isArray(specValues)) {
          const capacitySpec = specValues.find((spec: any) => {
            const specName = spec.specDefinition?.spec_name ||
              spec.spec_definition?.spec_name ||
              spec.specDefinition?.spec_label ||
              spec.spec_definition?.spec_label || '';
            return specName.toLowerCase().includes('capacity');
          });
          if (capacitySpec) {
            const specVal = capacitySpec.spec_value || capacitySpec.value || '';
            const unit = capacitySpec.unit || '';
            val = unit ? `${specVal} ${unit}` : specVal;
          }
        }
      }

      // 2. If valid value found and it's NOT an object, stick with it
      if (val !== null && val !== undefined && typeof val !== 'object') {
        // Keep val as is
      }
      // 3. Handle nested objects: if val is an object, try to get the name
      // Also fall back to {field}Name if the field is an object
      else if (val !== null && val !== undefined && typeof val === 'object') {
        // Try common name patterns
        val = val.name || val.plantName || val.plant_name ||
          val.buildingName || val.building_name ||
          val.categoryName || val.category_name ||
          val.productName || val.product_name ||
          val.floorName || val.floor_name ||
          val.wingName || val.wing_name ||
          val.manufacturerName || val;
      }
      // 4. If still no value, try {attributeId}Name field (e.g., plantName, buildingName)
      else if ((val === null || val === undefined) && filter.attributeId) {
        const nameField = filter.attributeId + 'Name';
        const altVal = (e as any)[nameField];
        if (altVal && typeof altVal === 'string') {
          val = altVal;
        }
      }

      // 5. Last resort: Try snake_case version of the attribute ID (e.g. subType -> sub_type)
      if (val === null || val === undefined) {
        const snakeCase = filter.attributeId.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if ((e as any)[snakeCase] !== undefined) {
          val = (e as any)[snakeCase];
        }
      }

      // Handle null/undefined specially for 'is' and 'isNot' operators
      if (filter.operator === 'is' || filter.operator === 'isNot') {
        // Special whitespace handling: trim values before comparison
        let entityVal = val === null || val === undefined ? '' : String(val).toLowerCase().trim();
        let filterVal = String(filter.value).toLowerCase().trim();

        // Special handling for capacity: extract numeric part for comparison
        // Capacity is stored as "12 Kg" but users might filter by "12"
        if (filter.attributeId === 'capacity') {
          // For "is not" operator, assets without capacity should be INCLUDED (they don't have the filtered value)
          if (filter.operator === 'isNot' && !entityVal) {
            if (idx === 0) console.log(`🔍 [Capacity Filter] Including asset without capacity data for "is not" filter`);
            return true; // Asset has no capacity, include in "is not X" results
          }

          // For "is" operator, assets without capacity should be EXCLUDED
          if (filter.operator === 'is' && !entityVal) {
            if (idx === 0) console.log(`🔍 [Capacity Filter] Excluding asset without capacity data for "is" filter`);
            return false; // Asset has no capacity, exclude from "is X" results
          }

          // Extract just the numeric part from both values
          const entityNumeric = entityVal.split(/\s+/)[0]; // "12 kg" -> "12"
          const filterNumeric = filterVal.split(/\s+/)[0]; // "12" -> "12"

          if (idx === 0) {
            console.log(`🔍 [Capacity Filter] Entity: "${entityVal}" (numeric: "${entityNumeric}") vs Filter: "${filterVal}" (numeric: "${filterNumeric}")`);
          }

          entityVal = entityNumeric;
          filterVal = filterNumeric;
        }

        if (filter.operator === 'is') {
          return entityVal === filterVal;
        } else { // isNot
          return entityVal !== filterVal;
        }
      }

      // For other operators, skip if value is null/undefined
      if (val === undefined || val === null) {
        if (idx === 0) console.log(`⚠️ [Filter Debug] Field "${filter.attributeId}" is undefined/null, returning false`);
        return false;
      }

      const entityVal = String(val).toLowerCase();
      const filterVal = String(filter.value).toLowerCase();

      switch (filter.operator) {
        case "contains": return entityVal.includes(filterVal);
        case "before": {
          const d1 = new Date(val);
          const d2 = new Date(filter.value);
          d1.setHours(0, 0, 0, 0);
          d2.setHours(0, 0, 0, 0);
          return d1 < d2;
        }
        case "after": {
          const d1 = new Date(val);
          const d2 = new Date(filter.value);
          d1.setHours(0, 0, 0, 0);
          d2.setHours(0, 0, 0, 0);
          return d1 > d2;
        }
        case "overdue": return new Date(entityVal) < new Date();
        case "dueSoon": {
          const dueDate = new Date(entityVal);
          const now = new Date();
          const in30Days = new Date();
          in30Days.setDate(now.getDate() + 30);
          return dueDate > now && dueDate <= in30Days;
        }
        default: return true;
      }
    });
  });

  // 2. Apply Multi-level Sorting with type-aware comparison
  // Helper to get sortable value from nested fields
  const getSortValue = (entity: any, field: string) => {
    // Direct field access for simple fields (healthStatus, maintenanceStatus, status, location, assetId, type, subType, dates)
    // Check direct field first before trying mappings
    const directFields = [
      'healthStatus', 'maintenanceStatus', 'status', 'location', 'assetId', 'conditions',
      'health_status', 'maintenance_status', 'type', 'subType', 'sub_type',
      'manufacturingDate', 'installDate', 'warrantyEndDate', 'lastRefillDate', 'lifespanYears',
      'manufacturing_date', 'install_date', 'warranty_end_date', 'last_refill_date', 'lifespan_years',
      'createdAt', 'updatedAt', 'created_at', 'updated_at'
    ];
    if (directFields.includes(field)) {
      // Try camelCase first, then snake_case
      const value = entity[field] || entity[field.replace(/([A-Z])/g, '_$1').toLowerCase()];
      // For conditions, it's an array - return first element or join
      if (field === 'conditions' && Array.isArray(entity.conditions || entity.activeConditions)) {
        const conditions = entity.conditions || entity.activeConditions || [];
        return conditions.length > 0 ? conditions.join(', ') : '';
      }
      // For assetId, try multiple field names
      if (field === 'assetId') {
        return entity.assetId || entity.asset_code || entity.name || '';
      }
      // Fix: Health/Maintenance status might be nested or snake_case
      if (field === 'healthStatus') return entity.healthStatus || entity.health_status || '';
      if (field === 'maintenanceStatus') return entity.maintenanceStatus || entity.maintenance_status || '';

      return value || '';
    }

    // Handle common ID fields that should sort by display name
    const nestedFieldMappings: Record<string, { objectPath: string; displayField: string; altFields?: string[] }> = {
      'plantId': { objectPath: 'plant', displayField: 'plantName', altFields: ['plant_name'] },
      'buildingId': { objectPath: 'buildingRef', displayField: 'name' },
      'categoryId': { objectPath: 'category', displayField: 'categoryName', altFields: ['category_name'] },
      'productCategoryId': { objectPath: 'category', displayField: 'categoryName', altFields: ['category_name'] },
      'productId': { objectPath: 'product', displayField: 'productName', altFields: ['product_name'] },
      'floorId': { objectPath: 'floorRef', displayField: 'name' },
      'wingId': { objectPath: 'wingRef', displayField: 'name' },
      'managerId': { objectPath: 'manager', displayField: 'name' },
      'technicianId': { objectPath: 'technician', displayField: 'name' },
      'vendorId': { objectPath: 'vendor', displayField: 'name' },
      'roleId': { objectPath: 'role', displayField: 'name' },
      // Incident-specific field mappings
      'incidentSubtypeId': { objectPath: 'subtype', displayField: 'subtypeName' },
      // Asset-specific direct object field mappings
      'plant': { objectPath: 'plant', displayField: 'plantName', altFields: ['plant_name'] },
      'building': { objectPath: 'building', displayField: 'building_name', altFields: ['buildingName', 'name'] },
      'floor': { objectPath: 'floor', displayField: 'floor_name', altFields: ['floorName', 'name'] },
      'wing': { objectPath: 'wing', displayField: 'wing_name', altFields: ['wingName', 'name'] },
      'category': { objectPath: 'category', displayField: 'categoryName', altFields: ['category_name'] },
      'product': { objectPath: 'product', displayField: 'productName', altFields: ['product_name'] },
      'manufacturer': { objectPath: 'manufacturer', displayField: 'name' },
    };

    const mapping = nestedFieldMappings[field];
    if (mapping) {
      const nestedObj = entity[mapping.objectPath];

      // If the field is already a string (not an object), return it directly
      if (typeof nestedObj === 'string') {
        return nestedObj;
      }

      // If it's an object, try to get the display field
      if (nestedObj && typeof nestedObj === 'object') {
        if (nestedObj[mapping.displayField]) {
          return nestedObj[mapping.displayField];
        }
        // Try alternative field names
        if (mapping.altFields) {
          for (const altField of mapping.altFields) {
            if (nestedObj[altField]) {
              return nestedObj[altField];
            }
          }
        }
      }
    }

    // Handle snake_case to camelCase conversion for common date fields
    const snakeToCamelMappings: Record<string, string> = {
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'created_by': 'createdBy',
      'updated_by': 'updatedBy',
    };

    if (snakeToCamelMappings[field]) {
      const camelValue = entity[snakeToCamelMappings[field]];
      if (camelValue !== undefined) {
        return camelValue;
      }
    }

    // Direct field access - try both snake_case and the original field
    if (entity[field] !== undefined) {
      return entity[field];
    }

    // Try converting snake_case to camelCase generically
    if (field.includes('_')) {
      const camelCase = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (entity[camelCase] !== undefined) {
        return entity[camelCase];
      }
    }

    // Try converting camelCase to snake_case
    const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (entity[snakeCase] !== undefined) {
      return entity[snakeCase];
    }

    return entity[field] || '';
  };

  const sortedEntities = [...filteredEntities].sort((a, b) => {
    if (sorts.length === 0) return 0;

    for (const sort of sorts) {
      const valA = getSortValue(a, sort.field);
      const valB = getSortValue(b, sort.field);

      if (valA === valB) continue;
      if (valA === null || valA === undefined) return sort.direction === 'asc' ? 1 : -1;
      if (valB === null || valB === undefined) return sort.direction === 'asc' ? -1 : 1;

      let comparison = 0;

      // Determine field type from filterAttributes or infer from field name
      const fieldConfig = filteredAttributes.find(attr => attr.id === sort.field);
      const fieldType = fieldConfig?.type || 'text';
      const fieldName = sort.field.toLowerCase();

      // Check if it's a date field
      if (fieldType === 'date' || fieldName.includes('date') || fieldName.includes('at') || fieldName.endsWith('at')) {
        const dateA = new Date(valA);
        const dateB = new Date(valB);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          comparison = dateA.getTime() - dateB.getTime();
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
      } else if (fieldType === 'number') {
        // Numeric comparison
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          comparison = numA - numB;
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
      } else {
        // Text comparison (case-insensitive)
        comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
      }

      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });

  // 3. Paginate the result
  // If server-side pagination is active and NO filters, the data is already paginated
  // Otherwise, we perform client-side slicing
  const paginatedEntities = (config.pagination && !hasActiveFilters && archiveStatus === "active")
    ? sortedEntities
    : sortedEntities.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

  const startIndex = (currentPage - 1) * itemsPerPage;

  // Sync wizard steps with config
  useEffect(() => {
    if (config.wizardSteps && config.wizardSteps.length > 0) {
      setWizardSteps(config.wizardSteps);
      if (!currentStep) setCurrentStep(config.wizardSteps[0].id);
    }
  }, [config.wizardSteps]);

  // Reset pagination when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters, debouncedGlobalSearch]);

  // (This was a dummy step to access tools, switching to grep)
  useEffect(() => {
    const mode = searchParams.get('mode');
    const entityId = searchParams.get('id');

    if (mode === 'edit' && entityId && entities.length > 0 && !loading) {
      const entityToEdit = entities.find((e) => e.id === entityId);
      if (entityToEdit) {
        // Clear only redirection params, keep filters/sorts
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('mode');
        newParams.delete('id');
        setSearchParams(newParams, { replace: true });
        openEditView(entityToEdit);
      }
    } else if (mode === 'create' && !loading) {
      const initialData = config.getInitialFormData ? config.getInitialFormData() : {};
      if (initialData === null) return; // Wait for reference data

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('mode');
      setSearchParams(newParams, { replace: true });

      setEditingEntity(null);
      setFormData(initialData || {});
      setCurrentView("create");
      if (config.wizardSteps?.length) setCurrentStep(config.wizardSteps[0].id);
    }
  }, [entities, loading, searchParams, config]);

  // Initial load from URL search params
  useEffect(() => {
    const filtersParam = searchParams.get("filters");
    const sortsParam = searchParams.get("sorts");
    const columnsParam = searchParams.get("columns");
    const searchParam = searchParams.get("q");

    if (filtersParam) {
      try { setActiveFilters(JSON.parse(filtersParam)); } catch (e) { console.error("Error parsing filters from URL", e); }
    }
    if (sortsParam) {
      try { setSorts(JSON.parse(sortsParam)); } catch (e) { console.error("Error parsing sorts from URL", e); }
    }
    if (columnsParam) {
      try {
        const urlColumns = JSON.parse(columnsParam);
        // Merge URL columns with current defaults to preserve new hardcoded columns
        setVisibleColumns(prev => Array.from(new Set([...prev, ...urlColumns])));
      } catch (e) { console.error("Error parsing columns from URL", e); }
    }
    if (searchParam) {
      setGlobalSearch(searchParam);
    }
  }, []); // Only once on mount

  // Sync state to URL search params
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;

    const updateParam = (key: string, value: string | null) => {
      const current = params.get(key);
      if (value === null) {
        if (current !== null) {
          params.delete(key);
          changed = true;
        }
      } else if (current !== value) {
        params.set(key, value);
        changed = true;
      }
    };

    updateParam("filters", activeFilters.length > 0 ? JSON.stringify(activeFilters) : null);
    updateParam("sorts", sorts.length > 0 ? JSON.stringify(sorts) : null);

    const defaultColumns = (config.fields || []).map(f => f.name);
    const isDefaultColumns = JSON.stringify(visibleColumns) === JSON.stringify(defaultColumns);
    updateParam("columns", isDefaultColumns ? null : JSON.stringify(visibleColumns));

    updateParam("q", debouncedGlobalSearch || null);

    if (changed) {
      setSearchParams(params, { replace: true });
    }
  }, [activeFilters, sorts, visibleColumns, debouncedGlobalSearch, config.fields, setSearchParams]);

  // Handlers: Dynamic Filtering
  const handleAddFilter = (attributeId: string) => {
    const attribute = filteredAttributes.find(a => a.id === attributeId);
    if (!attribute) return;

    // Provide default operators based on attribute type if not specified
    const defaultOperators: Record<string, FilterOperator[]> = {
      text: ["contains", "is", "isNot"],
      select: ["is", "isNot"],
      date: ["is", "before", "after"],
      number: ["is", "isNot"]
    };
    const operators = attribute.operators || defaultOperators[attribute.type] || ["is"];

    const newFilter: ActiveFilter = {
      id: Math.random().toString(36).substr(2, 9),
      attributeId,
      operator: operators[0],
      value: ""
    };
    setActiveFilters([...activeFilters, newFilter]);
    setShowFilter(true);
  };

  const handleUpdateFilter = (id: string, updates: Partial<ActiveFilter>) => {
    setActiveFilters(activeFilters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveFilter = (id: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== id));
  };

  const handleClearAllFilters = () => {
    setActiveFilters([]);
    setGlobalSearch("");
  };

  // Handlers: Sorting
  const handleUpdateSorts = (newSorts: SortConfig[]) => {
    setSorts(newSorts);
  };

  // Handlers: View Configuration (Columns)
  const handleToggleColumn = (field: string) => {
    // Check if column is mandatory
    const attribute = filteredAttributes.find(a => a.id === field);
    if (attribute?.mandatory) {
      toast({ title: "Cannot hide mandatory column", description: `The ${attribute.label} column is required`, variant: "destructive" });
      return;
    }

    if (visibleColumns.includes(field)) {
      if (visibleColumns.length > 1) {
        setVisibleColumns(visibleColumns.filter(c => c !== field));
      } else {
        toast({ title: "Cannot hide all columns", variant: "destructive" });
      }
    } else {
      setVisibleColumns([...visibleColumns, field]);
    }
  };

  const isVisible = (field: string) => !visibleColumns || visibleColumns.includes(field);

  const handleResetColumns = () => {
    const defaults = getDefaultColumns();
    setVisibleColumns(defaults);

    // Clear localStorage
    const storageKey = `firedesk_columns_${config.entityName}`;
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing column preferences from localStorage:', error);
    }
  };

  const handleSaveView = () => {
    const view: ViewConfig = {
      visibleColumns,
      filters: activeFilters,
      sorts
    };
    localStorage.setItem(`view_${config.entityNamePlural}_default`, JSON.stringify(view));
    toast({ title: "View saved successfully" });
  };

  // Utility: Escape CSV value
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    let strValue = String(value);
    if (typeof value === 'object' && !Array.isArray(value)) strValue = JSON.stringify(value);
    else if (Array.isArray(value)) strValue = value.join(', ');
    strValue = strValue.replace(/"/g, '""');
    if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) return `"${strValue}"`;
    return strValue;
  };

  // Utility: Get field value (handles nesting and reference names)
  const getFieldValue = (entity: any, fieldName: string): any => {
    if (fieldName.endsWith('Id')) {
      const baseFieldName = fieldName.slice(0, -2);
      const displayNameField = `${baseFieldName}Name`;
      if (entity[displayNameField]) return entity[displayNameField];
      const capitalizedName = baseFieldName.charAt(0).toUpperCase() + baseFieldName.slice(1);
      if (entity[capitalizedName] && entity[capitalizedName].name) return entity[capitalizedName].name;
      if (entity[capitalizedName] && entity[capitalizedName][`${baseFieldName}Name`]) return entity[capitalizedName][`${baseFieldName}Name`];
    }
    const parts = fieldName.split('.');
    let value = entity;
    for (const part of parts) {
      if (value && typeof value === 'object') value = value[part];
      else return '';
    }
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-'))) {
      try { return new Date(value).toLocaleDateString(); } catch { return value; }
    }
    return value;
  };

  // Handlers: Utility Actions
  const handleExport = () => {
    // Open export modal instead of direct export
    setShowExportModal(true);
  };

  const handleImport = () => {
    // Open import modal
    setShowImportModal(true);
  };

  const handleImportComplete = () => {
    // Refresh data after successful import
    loadEntities();
  };
  const handlePrint = () => toast({ title: "Feature Coming Soon", description: "Print list feature will be added soon." });
  const handleShareList = () => {
    const shareUrl = `${window.location.origin}/${config.entityNamePlural.toLowerCase()}`;
    if (navigator.share) navigator.share({ title: `${config.entityNamePlural} List`, text: `Check out this ${config.entityNamePlural.toLowerCase()} list`, url: shareUrl });
    else {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link Copied", description: `${config.entityNamePlural} list link copied to clipboard` });
    }
  };

  const handleRefresh = () => {
    loadEntities();
    toast({ title: "Data Refreshed", description: `${config.entityNamePlural} list has been refreshed` });
  };

  const handleBulkActions = () => {
    setShowBulkActions(!showBulkActions);
    if (!showBulkActions) setSelectedEntities(new Set());
  };

  const handleGetHelp = () => toast({ title: "Feature Coming Soon", description: "Help feature will be added soon." });

  // Load entities
  const loadEntities = async (pageOverride?: number) => {
    try {
      setLoading(true);
      const params: any = { ...config.activeParams }; // Apply default active params
      if (config.enablePlantFilter) {
        if (selectedPlantId) {
          params.plantId = selectedPlantId;
          console.log(`[GenericEntityPage] Applying Plant Filter: ${selectedPlantId}`);
        } else if (!isAdmin() && availablePlants.length > 0) {
          // For non-admin users (managers, technicians, custom roles),
          // "All" means "All MY assigned plants", not "All system plants".
          // We must pass the list of assigned plant IDs to restrict the query.
          params.plantIds = availablePlants.map(p => p.id);
          console.log(`[GenericEntityPage] Applying User Scope Filter (All assigned plants): ${params.plantIds.length} plants`);
        } else {
          console.log(`[GenericEntityPage] Plant Filter NOT applied (Admin or no plants). Config: ${config.enablePlantFilter}, Selected: ${selectedPlantId}`);
        }
      }

      const pageToUse = pageOverride !== undefined ? pageOverride : currentPage;

      // Send sort parameters to backend for server-side sorting
      // This ensures sorting happens globally across all data, not just the current page
      if (sorts.length > 0) {
        const primarySort = sorts[0]; // Use the first sort as primary

        // Map frontend field names to backend field names (handle camelCase to snake_case)
        const backendFieldMap: Record<string, string> = {
          'assetId': 'asset_code',
          'plantId': 'plant_id',
          'buildingId': 'building_id',
          'floorId': 'floor_id',
          'wingId': 'wing_id',
          'categoryId': 'category_id',
          'productId': 'product_id',
          'manufacturerId': 'manufacturer_id',
          'healthStatus': 'health_status',
          'maintenanceStatus': 'maintenance_status',
          'manufacturingDate': 'manufacturing_date',
          'installDate': 'install_date',
          'warrantyEndDate': 'warranty_end_date',
          'lifespanYears': 'lifespan_years',
          'lastRefillDate': 'last_refill_date',
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
          // For nested fields, map to the association name that Sequelize can sort by
          'plant': 'plant_id',
          'building': 'building_id',
          'floor': 'floor_id',
          'wing': 'wing_id',
          'category': 'category_id',
          'product': 'product_id',
          'manufacturer': 'manufacturer_id',
        };

        const backendField = backendFieldMap[primarySort.field] || primarySort.field;
        params.sort_by = backendField;
        params.sort_order = primarySort.direction.toUpperCase();

        console.log(`[GenericEntityPage] Applying server-side sort: ${backendField} ${primarySort.direction.toUpperCase()}`);
      }

      // Send backend-handled filters as query parameters
      console.log('[GenericEntityPage] Active filters:', activeFilters);
      console.log('[GenericEntityPage] Backend filters:', backendFilters);
      console.log('[GenericEntityPage] Client-side filters:', clientSideFilters);
      backendFilters.forEach(filter => {
        const mapping = backendFilterMap[filter.attributeId];
        if (mapping) {
          let valueToSend = filter.value;

          // Special handling for relationship filters: convert name to ID
          // For filters like 'plant', 'building', etc., we need to send the ID, not the name
          const relationshipFieldMap: Record<string, string> = {
            'plant': 'plantId',
            'building': 'buildingId',
            'floor': 'floorId',
            'wing': 'wingId',
            'category': 'categoryId',
            'product': 'productId',
            'manufacturer': 'manufacturerId',
          };

          if (relationshipFieldMap[filter.attributeId]) {
            // Find the entity that matches this filter value (by name)
            const idField = relationshipFieldMap[filter.attributeId];
            const nameField = filter.attributeId === 'plant' ? 'plantName' :
              filter.attributeId === 'building' ? 'buildingName' :
                filter.attributeId === 'floor' ? 'floorName' :
                  filter.attributeId === 'wing' ? 'wingName' :
                    filter.attributeId === 'category' ? 'categoryName' :
                      filter.attributeId === 'product' ? 'productName' :
                        filter.attributeId === 'manufacturer' ? 'manufacturerName' :
                          filter.attributeId;

            // Try to find entity with matching name to get its ID
            const matchingEntity = (entitiesForOptions.length > 0 ? entitiesForOptions : entities).find((e: any) => {
              const entityValue = e[nameField];
              return entityValue === filter.value;
            });

            if (matchingEntity && (matchingEntity as any)[idField]) {
              valueToSend = (matchingEntity as any)[idField];
              console.log(`[GenericEntityPage] Converted ${filter.attributeId} name "${filter.value}" to ID "${valueToSend}"`);
            } else {
              console.warn(`[GenericEntityPage] Could not find ID for ${filter.attributeId} = "${filter.value}"`);
            }
          }

          // For "isNot" operator, use the "_not" suffix parameter
          const paramName = filter.operator === 'isNot' ? `${mapping.param}_not` : mapping.param;
          params[paramName] = valueToSend;
          console.log(`[GenericEntityPage] Sending backend filter: ${filter.attributeId} (${filter.operator}) -> ${paramName}=${valueToSend}`);
        }
      });

      // Only use server pagination if NO client-side filters are active
      if (config.pagination && !hasActiveFilters) {
        params.page = pageToUse;
        params.limit = itemsPerPage;
      } else if (config.pagination && hasActiveFilters) {
        // When client-side filters are active, fetch all data with high limit
        params.limit = 10000; // High limit to get all entities for client-side filtering
      }

      let response: any;

      if (config.customFetchAll) {
        console.log('[GenericEntityPage] Using customFetchAll');
        response = await config.customFetchAll();
      } else {
        if (!config.apiEndpoint) {
          console.error('[GenericEntityPage] No apiEndpoint or customFetchAll provided');
          setLoading(false);
          return;
        }
        response = await api.get(config.apiEndpoint, { params });
      }

      // Extract pagination metadata (fixed to match monolithic extraction)
      // Extract pagination metadata
      if (config.pagination) {
        if (response.pagination) {
          console.log('[GenericEntityPage] Found response.pagination:', response.pagination);
          if (response.pagination.total !== undefined) setTotalItems(response.pagination.total);

          if (response.pagination.totalPages !== undefined) {
            setTotalPages(response.pagination.totalPages);
          } else if (response.pagination.total_pages !== undefined) {
            console.log('[GenericEntityPage] Found snake_case total_pages:', response.pagination.total_pages);
            setTotalPages(response.pagination.total_pages);
          }
        } else {
          console.log('[GenericEntityPage] No response.pagination, checking flat fields. Count:', response.count, 'ItemsPerPage:', itemsPerPage);
          if (response.count !== undefined) setTotalItems(response.count);
          if (response.totalPages !== undefined) {
            console.log('[GenericEntityPage] Found response.totalPages:', response.totalPages);
            setTotalPages(response.totalPages);
          }
          else if (response.count !== undefined) {
            const calculatedPages = Math.ceil(response.count / itemsPerPage);
            console.log('[GenericEntityPage] Calculated totalPages:', calculatedPages);
            setTotalPages(calculatedPages);
          }
        }
      }

      let entityData: any[] = [];
      const rawData = response.data || response;

      console.log('[GenericEntityPage] Raw API response:', response);
      console.log('[GenericEntityPage] rawData (response.data || response):', rawData);

      // Handle response transformation
      let processedData = rawData;
      if (config.transformResponse) {
        processedData = config.transformResponse(rawData);
        console.log('[GenericEntityPage] After transformResponse:', processedData);
      }

      // Extract entities array
      if (config.responseKey) {
        entityData = processedData?.[config.responseKey];
        console.log(`[GenericEntityPage] Extracted with responseKey "${config.responseKey}":`, entityData?.length, 'items');
      } else if (Array.isArray(processedData)) {
        entityData = processedData;
      } else if (processedData && Array.isArray(processedData.data)) {
        // Auto-unwrap standard ApiResponse format { success: true, data: [...] }
        entityData = processedData.data;
      } else {
        // Fallback or empty
        entityData = [];
        console.warn('GenericEntityPage: Could not extract entity array from response', processedData);
      }

      // Debug first entity to show available fields
      if (entityData?.length > 0) {
        console.log('[GenericEntityPage] First entity fields:', Object.keys(entityData[0]));
        console.log('[GenericEntityPage] First entity assetId:', entityData[0].assetId);
      }

      // Filter to show only ACTIVE entities (excluding archived/inactive ones)
      if (Array.isArray(entityData)) {
        // Patch missing camelCase fields from snake_case equivalents (Fix for Assets filters)
        // Only patch simple fields, don't overwrite nested objects
        entityData.forEach(entity => {
          if (entity && typeof entity === 'object') {
            // Asset ID
            if (entity.assetId === undefined && entity.asset_code) {
              entity.assetId = entity.asset_code;
            }
            // IDs from snake_case
            if (entity.plantId === undefined && entity.plant_id) {
              entity.plantId = entity.plant_id;
            }
            if (entity.buildingId === undefined && entity.building_id) {
              entity.buildingId = entity.building_id;
            }
            if (entity.floorId === undefined && entity.floor_id) {
              entity.floorId = entity.floor_id;
            }
            if (entity.wingId === undefined && entity.wing_id) {
              entity.wingId = entity.wing_id;
            }
            if (entity.categoryId === undefined && entity.category_id) {
              entity.categoryId = entity.category_id;
            }
            if (entity.productId === undefined && entity.product_id) {
              entity.productId = entity.product_id;
            }
            if (entity.manufacturerId === undefined && entity.manufacturer_id) {
              entity.manufacturerId = entity.manufacturer_id;
            }
            // Health status
            if (entity.healthStatus === undefined && entity.health_status) {
              entity.healthStatus = entity.health_status;
            }
            // Extract name strings for filters (stored in separate fields, not overwriting objects)
            if (entity.plantName === undefined && entity.plant && typeof entity.plant === 'object') {
              entity.plantName = entity.plant.plant_name || entity.plant.plantName || '';
            }
            if (entity.buildingName === undefined && entity.building && typeof entity.building === 'object') {
              entity.buildingName = entity.building.building_name || entity.building.buildingName || '';
            }
            if (entity.floorName === undefined && entity.floor && typeof entity.floor === 'object') {
              entity.floorName = entity.floor.floor_name || entity.floor.floorName || '';
            }
            if (entity.wingName === undefined && entity.wing && typeof entity.wing === 'object') {
              entity.wingName = entity.wing.wing_name || entity.wing.wingName || '';
            }
            if (entity.categoryName === undefined && entity.category && typeof entity.category === 'object') {
              entity.categoryName = entity.category.category_name || entity.category.categoryName || '';
            }
            if (entity.productName === undefined && entity.product && typeof entity.product === 'object') {
              entity.productName = entity.product.product_name || entity.product.productName || '';
            }
            if (entity.manufacturerName === undefined && entity.manufacturer && typeof entity.manufacturer === 'object') {
              entity.manufacturerName = entity.manufacturer.name || entity.manufacturer.manufacturerName || '';
            }
          }
        });

        const archiveValue = config.archiveStatusValue || 'Inactive';

        const activeEntities = entityData.filter(entity => {
          // 1. Status Check: Entity is active if status is NOT the archive status value
          const isActive = entity.status !== archiveValue && entity.status !== 'Inactive';
          if (!isActive) return false;

          // 2. Plant Permission Check: For non-admins, ensure entity belongs to an assigned plant
          // This is a safety net in case the backend returns all data (which is happening now)
          if (config.enablePlantFilter && !isAdmin() && availablePlants.length > 0) {
            // If a specific plant filter is active, we assume backend filtered it correctly (or we can double check)
            // But if we are in "All My Plants" mode, we MUST filter out entities from unassigned plants

            // Extract plant ID from entity (handle various formats)
            const entityPlantId = entity.plantId || entity.plant_id || (entity.plant?.id);

            // If entity has no plant (e.g. global data), should we show it? 
            // Usually data without plant is invalid or global. Let's show it to be safe unless it explicitly has a wrong plant ID.
            if (!entityPlantId) return true;

            // Check if this plant ID exists in user's available plants
            // Use loose comparison (String) to handle number vs string IDs
            const isAssigned = availablePlants.some(p => String(p.id) === String(entityPlantId));

            return isAssigned;
          }

          return true;
        });
        console.log(`🎯 Filtered to ${activeEntities.length} active entities (excluded ${entityData.length - activeEntities.length} archived)`);

        // Debug: Check if entities have capacity field
        if (activeEntities.length > 0) {
          const sampleEntity = activeEntities[0];
          console.log('[GenericEntityPage] Sample entity:', sampleEntity);
          console.log('[GenericEntityPage] Sample capacity:', sampleEntity?.capacity);
          const capacityCount = activeEntities.filter((e: any) => e.capacity).length;
          console.log(`[GenericEntityPage] Entities with capacity: ${capacityCount}/${activeEntities.length}`);
        }

        setEntities(activeEntities);

        // Cache full entity list when NO backend filters active (for building filter dropdowns)
        if (backendFilters.length === 0) {
          setEntitiesForOptions(activeEntities);
          console.log('[GenericEntityPage] Cached full entity list for filter options:', activeEntities.length);
        }
        // When filters are active or no server pagination, calculate client-side
        if (!config.pagination || hasActiveFilters) {
          setTotalPages(Math.ceil(activeEntities.length / itemsPerPage));
          setTotalItems(activeEntities.length);
        }
      } else {
        setEntities([]);
        if (!config.pagination || hasActiveFilters) {
          setTotalPages(1);
          setTotalItems(0);
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || `Failed to load ${config.entityNamePlural.toLowerCase()}`, variant: "destructive" });
      setEntities([]);
    } finally { setLoading(false); }
  };

  // Use stable dependencies to prevent excessive re-renders
  const activeFiltersKey = useMemo(() => JSON.stringify(activeFilters), [activeFilters]);
  const sortsKey = useMemo(() => JSON.stringify(sorts), [sorts]);

  useEffect(() => {
    if (currentView === "list") loadEntities();
  }, [currentView, selectedPlantId, currentPage, itemsPerPage, activeFiltersKey, debouncedGlobalSearch, sortsKey]);

  // Recalculate pagination based on filtered/sorted entities when client-side filtering is active
  // This ensures pagination always reflects the actual data being displayed
  useEffect(() => {
    // Only recalculate if we're doing client-side pagination (filters or search active)
    if (hasActiveFilters || archiveStatus === "archived") {
      const filteredCount = sortedEntities.length;
      const calculatedPages = Math.ceil(filteredCount / itemsPerPage) || 1;

      console.log(`[Pagination Recalc] Filtered count: ${filteredCount}, Pages: ${calculatedPages}, ItemsPerPage: ${itemsPerPage}`);

      setTotalItems(filteredCount);
      setTotalPages(calculatedPages);

      // If current page exceeds new total pages, reset to page 1
      if (currentPage > calculatedPages) {
        setCurrentPage(1);
      }
    }
  }, [sortedEntities.length, itemsPerPage, hasActiveFilters, archiveStatus]);

  // Handlers: Archive (Full original implementation)
  const handleViewArchive = async () => {
    if (archiveStatus === "archived") {
      setArchiveStatus("active");
      loadEntities();
      return;
    }

    setArchiveStatus("archived");
    try {
      console.log(`📦 Loading archived ${config.entityNamePlural}...`);
      const params = config.archiveParams ? config.archiveParams : { status: config.archiveStatusValue || 'Inactive' };

      const response = await api.get(config.apiEndpoint, { params });

      const rawData = (response as any).data || response;
      let entityData: any[] = [];

      if (config.transformResponse) {
        const transformed = config.transformResponse(rawData);
        if (config.responseKey && (transformed as any)[config.responseKey]) {
          entityData = (transformed as any)[config.responseKey];
        } else {
          entityData = transformed;
        }
      } else if (config.responseKey && rawData?.[config.responseKey]) {
        entityData = rawData[config.responseKey];
      } else if (rawData?.[config.entityNamePlural]) {
        entityData = rawData[config.entityNamePlural];
      } else if (Array.isArray(rawData)) {
        entityData = rawData;
      } else if (rawData?.data && Array.isArray(rawData.data)) {
        entityData = rawData.data;
      }

      if (!Array.isArray(entityData)) {
        console.warn("⚠️ entityData is not an array:", entityData);
        entityData = [];
      }

      const archivedData = entityData.filter((entity) => {
        if (entity.hasOwnProperty("isArchived")) return entity.isArchived === true;
        if (config.archiveStatusValue && entity.status === config.archiveStatusValue) return true;
        if (entity.status === "Inactive") return true;
        return false;
      });

      console.log(`✅ Loaded ${archivedData.length} archived ${config.entityNamePlural}`);
      setArchivedEntities(archivedData);

      // Update pagination for archive view
      setCurrentPage(1);
      setTotalItems(archivedData.length);
      setTotalPages(Math.ceil(archivedData.length / itemsPerPage));

      toast({ title: "Archive View", description: `Found ${archivedData.length} archived ${config.entityNamePlural.toLowerCase()}` });
    } catch (error: any) {
      console.error("❌ Error loading archived entities:", error);
      toast({ title: "Error Loading Archive", description: error.response?.data?.message || error.message, variant: "destructive" });
    }
  };

  const handleArchive = async (entity: BaseEntity) => {
    try {
      console.log(`📦 Archiving ${config.entityName}:`, entity);

      // First, update status to DEACTIVE
      let updateData: Record<string, any> = {};

      if (config.archiveFields && config.archiveFields.length > 0) {
        config.archiveFields.forEach((field) => {
          const value = (entity as any)[field];
          if (field !== "status" && field !== "isArchived" && value !== undefined && value !== null) {
            updateData[field] = value;
          }
        });
      }

      if ((entity as any).hasOwnProperty("isArchived")) {
        updateData.isArchived = true;
        updateData.status = entity.status;
      } else if (config.archiveStatusValue) {
        const statusField = (config as any).archiveStatusField || 'status';
        updateData[statusField] = config.archiveStatusValue;
      } else {
        updateData.status = "Inactive";
      }

      if (config.transformData) {
        updateData = config.transformData(updateData);
      }

      console.log(`📤 Archive data to send:`, updateData);

      // Update status first
      await api.put(`${config.apiEndpoint}/${entity.id}`, updateData);

      // Only perform DELETE if we are NOT using status-based archiving
      // For Assets, archiveStatusValue is 'DEACTIVE', so we skip DELETE (which is a hard delete in backend)
      // We only DELETE if no specific archive status is configured and no isArchived flag is present
      // This preserves the record in the database with the inactive/archive status
      if (!config.archiveStatusValue && !updateData.isArchived) {
        await api.delete(`${config.apiEndpoint}/${entity.id}`);
      }

      const actionLabel = config.supportsArchive ? "Archived" : "Deactivated";
      const displayName = entity.name || entity.industry_name || entity.plantName || entity.category_name || entity.vendorName || "Item";
      toast({ title: `${config.entityName} ${actionLabel}`, description: `${displayName} has been ${actionLabel.toLowerCase()}` });
      loadEntities();
    } catch (error: any) {
      console.error("❌ Archive error:", error);
      toast({ title: "Operation Failed", description: error.message || error.response?.data?.message || "Archive operation failed", variant: "destructive", duration: 5000 });
    }
  };

  const handleRestoreFromArchive = async (entityId: string) => {
    const entityToRestore = archivedEntities.find((e) => e.id === entityId);
    if (!entityToRestore) return;

    try {
      console.log(`🔄 Restoring ${config.entityName}:`, entityToRestore);
      let updateData: Record<string, any> = {};

      if (config.archiveFields && config.archiveFields.length > 0) {
        config.archiveFields.forEach((field) => {
          if (field !== "status" && field !== "isArchived" && (entityToRestore as any)[field] !== undefined) {
            updateData[field] = (entityToRestore as any)[field];
          }
        });
      }

      if ((entityToRestore as any).hasOwnProperty("isArchived")) {
        updateData.isArchived = false;
        updateData.status = "Active";
      } else if (config.archiveStatusValue) {
        // For assets, restore to ACTIVE status
        updateData.status = "ACTIVE";
      } else {
        updateData.status = "Active";
      }

      if (config.transformData) {
        updateData = config.transformData(updateData);
      }

      console.log(`📤 Restore data to send:`, updateData);

      // Use restore endpoint instead of PUT
      await api.post(`${config.apiEndpoint}/${entityId}/restore`, updateData);

      console.log(`✅ ${config.entityName} restored successfully`);
      handleViewArchive();
      const displayName = entityToRestore.name || (entityToRestore as any).industry_name || (entityToRestore as any).plantName || (entityToRestore as any).category_name || (entityToRestore as any).vendorName || "Item";
      toast({ title: `${config.entityName} Restored`, description: `${displayName} has been restored to active status` });
    } catch (error: any) {
      console.error("❌ Error restoring entity:", error);
      toast({ title: "Error Restoring", description: error.response?.data?.message || error.message, variant: "destructive" });
    }
  };


  // Handlers: Create/Edit
  const openCreateView = () => {
    if (config.onCreate) { config.onCreate(); return; }

    setEditingEntity(null);
    const initialData = config.getInitialFormData ? config.getInitialFormData() : {};
    setFormData(initialData || {});
    setCurrentView("create");
    if (config.wizardSteps?.length) setCurrentStep(config.wizardSteps[0].id);
  };

  const openEditView = async (entity: BaseEntity) => {
    setEditingEntity(entity);
    let formDataObj: Record<string, any> = { id: entity.id };

    // Priority: Use getInitialFormData if it handles entities (UsersPage pattern)
    if (config.getInitialFormData) {
      const customInitialData = config.getInitialFormData(entity);
      if (customInitialData) {
        formDataObj = { ...formDataObj, ...customInitialData };
      }
    }

    // Deep mapping identical to original monolithic logic (957-1053)
    (config.fields || []).forEach((field) => {
      if (field.name === "phone" && (entity as any).user?.phone) {
        formDataObj[field.name] = (entity as any).user.phone;
      } else {
        formDataObj[field.name] = (entity as any)[field.name];
      }
    });

    const additionalFields = [
      'experience', 'specialization', 'technicianType', 'status', 'plantId', 'managerId', 'categoryId',
      'productCategoryId', 'productId', 'assetId', 'building', 'buildingId', 'floorId', 'wingId',
      'location', 'condition', 'healthStatus', 'tag', 'manufacturerName', 'model', 'serialNumber', 'slNo',
      'manufacturingDate', 'installDate', 'warrantyEndDate', 'amcStartDate', 'amcEndDate', 'lastHPTestDate',
      'nextHPTestDueDate', 'lifespanYears', 'type', 'subType', 'capacity', 'capacityUnit',
      'permissions', 'permissionLevels', 'isDefault', 'taskName', 'taskDescription', 'technicianId', 'targetDate', 'completedStatus'
    ];
    additionalFields.forEach((f) => { if ((entity as any)[f] !== undefined) formDataObj[f] = (entity as any)[f]; });

    // Nested ID extractions (985-1010)
    if ((entity as any).plant?.id) formDataObj.plantId = (entity as any).plant.id;
    if ((entity as any).manager?.id) formDataObj.managerId = (entity as any).manager.id;
    if ((entity as any).category?.id) { formDataObj.categoryId = (entity as any).category.id; formDataObj.productCategoryId = (entity as any).category.id; }
    if ((entity as any).product?.id) formDataObj.productId = (entity as any).product.id;
    if ((entity as any).buildingRef?.id) formDataObj.buildingId = (entity as any).buildingRef.id;
    if ((entity as any).floorRef?.id) formDataObj.floorId = (entity as any).floorRef.id;
    if ((entity as any).wingRef?.id) formDataObj.wingId = (entity as any).wingRef.id;

    // Vendor fields for third-party technicians (1016-1028 from backup)
    if ((entity as any).technicianType === "Third Party") {
      const vendorFields = ["venderName", "venderNumber", "venderEmail", "venderAddress"];
      vendorFields.forEach((field) => { if ((entity as any)[field] !== undefined) formDataObj[field] = (entity as any)[field]; });
    }

    // Product variants (1031-1039 from backup)
    if ((entity as any).variants !== undefined) { formDataObj.variants = (entity as any).variants; formDataObj.productVariants = (entity as any).variants; }
    if ((entity as any).productVariants !== undefined) { formDataObj.productVariants = (entity as any).productVariants; formDataObj.variants = (entity as any).productVariants; }

    // PlantIds for managers (1041-1043 from backup)
    if ((entity as any).plantIds !== undefined) formDataObj.plantIds = (entity as any).plantIds;

    // Permissions & Roles (1042-1052)
    if ((entity as any).permissions !== undefined) formDataObj.permissions = (entity as any).permissions;
    if ((entity as any).role?.name !== undefined) formDataObj.currentRole = (entity as any).role.name;
    if ((entity as any).roleId !== undefined) formDataObj.roleId = (entity as any).roleId;

    // Custom load if provided (1055)
    if (config.loadEntityData) {
      const extra = await config.loadEntityData(entity.id, formDataObj);
      if (extra) formDataObj = { ...formDataObj, ...extra };
    }

    setFormData(formDataObj);
    setCurrentView("edit");
    if (config.wizardSteps?.length) setCurrentStep(config.wizardSteps[0].id);
  };

  const handleDoubleClick = (entity: BaseEntity) => {
    if (archiveStatus !== "active") return;
    if (!canUpdate) { toast({ title: "Permission Denied", variant: "destructive" }); return; }

    if (config.onEdit) {
      config.onEdit(entity);
    } else {
      openEditView(entity);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // If we just changed steps, prevent submission
    if (justChangedStepRef.current) {
      console.warn("🚫 BLOCKED: Just changed steps, preventing submission");
      return;
    }

    // If we're in wizard mode and NOT on the last step, prevent submission
    // EXCEPTION: If formLayout is "sections", we show all steps at once, so we can submit from anywhere
    if (
      config.wizardSteps &&
      config.wizardSteps.length > 0 &&
      config.formLayout !== "sections" &&
      currentStep !== wizardSteps[wizardSteps.length - 1]?.id
    ) {
      console.warn("⚠️ Attempted to submit form while not on last step. Ignoring.");
      return;
    }

    // Check for duplicate name (case-insensitive) — skip if config allows duplicates (e.g., Users)
    if (!config.allowDuplicateNames) {
      let nameToCheck = formData.name;
      if (!nameToCheck) {
        const nameField = (config.fields || []).find(f => f.name.toLowerCase().includes('name') && f.type === 'text');
        if (nameField) nameToCheck = formData[nameField.name];
      }

      if (nameToCheck && typeof nameToCheck === 'string') {
        const duplicate = entities.find((entity) => {
          return entity.name &&
            entity.name.toLowerCase() === nameToCheck.toLowerCase() &&
            entity.id !== editingEntity?.id;
        });

        if (duplicate) {
          toast({ title: "Validation Error", description: "An item with this name already exists (names are case-insensitive).", variant: "destructive" });
          return;
        }
      }
    }

    try {
      // Run custom validation if provided
      if (config.validateBeforeSubmit) {
        const isValid = await config.validateBeforeSubmit(formData);
        if (!isValid) {
          console.log('❌ Validation failed, not submitting');
          return;
        }
      }

      // Use custom wizard submit if provided
      if (config.onWizardSubmit && wizardSteps.length > 0) {
        await config.onWizardSubmit(formData);
      } else {
        const apiData = config.transformData ? config.transformData(formData) : formData;
        if (currentView === "edit" && editingEntity) {
          await api.put(`${config.apiEndpoint}/${editingEntity.id}`, apiData);
          toast({ title: "Success", description: `${config.entityName} updated` });
        } else {
          await api.post(config.apiEndpoint, apiData);
          toast({ title: "Success", description: `${config.entityName} created` });
        }
      }

      setFormData({});
      setEditingEntity(null);
      setCurrentView("list");
      if (wizardSteps.length > 0) setCurrentStep(wizardSteps[0].id);
      loadEntities();
    } catch (error: any) {
      console.error("❌ Submit error:", error);
      // Prioritize specific 'error' field if present, as 'message' might be generic
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Operation failed";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  // Handlers: Delete
  const openDeleteConfirm = (entity: BaseEntity) => setEntityToDelete(entity);
  const handleDelete = async () => {
    if (!entityToDelete) return;
    try {
      await api.delete(`${config.apiEndpoint}/${entityToDelete.id}`);
      toast({ title: "Success", description: `${config.entityName} deleted successfully` });
      setEntityToDelete(null);
      loadEntities();
    } catch (error: any) {
      console.error("❌ Delete error:", error);
      let errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Delete operation failed";

      // Handle specific error cases
      if (errorMessage.includes("constraint") || errorMessage.includes("foreign key")) {
        errorMessage = `Cannot delete ${config.entityName} because it is being used by other records. Please reassign or remove those records first.`;
      } else if (errorMessage.includes("permission") || errorMessage.includes("authorized") || error.response?.status === 403) {
        errorMessage = `You don't have permission to delete this ${config.entityName}. Please contact an administrator.`;
      } else if (errorMessage === "Request failed" || error.request) {
        errorMessage = `Failed to delete ${config.entityName}. The server may be unavailable.`;
      }

      toast({ title: "Cannot Delete", description: errorMessage, variant: "destructive", duration: 5000 });
    }
  };

  // Handlers: Selection
  const handleSelectAll = () => {
    // User Request: "if i select page on it should select assets of that page and when i go on other page it should select all asset of that page"
    // Implementation: Toggle selection for CURRENT PAGE only (paginatedEntities), cumulatively.
    const pageIds = paginatedEntities.map(e => e.id);
    if (pageIds.length === 0) return;

    const allPageSelected = pageIds.every(id => selectedEntities.has(id));
    const newSelected = new Set(selectedEntities);

    if (allPageSelected) {
      // Deselect all on current page
      pageIds.forEach(id => newSelected.delete(id));
      // toast({ title: "Selection", description: `Deselected ${pageIds.length} items` });
    } else {
      // Select all on current page (add to existing selection)
      pageIds.forEach(id => newSelected.add(id));
      // toast({ title: "Selection", description: `Selected ${pageIds.length} items` });
    }
    setSelectedEntities(newSelected);
  };
  const handleSelectAllAssets = async () => {
    // Check if we need to fetch all (server pagination active and we don't have all items)
    // Archive view always uses client-side selection since archived entities are loaded entirely
    const isServerPagination = config.pagination && !hasActiveFilters && archiveStatus === "active" && totalItems > sourceEntities.length;

    if (isServerPagination) {
      toast({ title: "Selecting All", description: `Fetching all ${totalItems} items...` });
      try {
        const params: any = { ...config.activeParams, limit: 100000 };
        if (config.enablePlantFilter && selectedPlantId) {
          params.plantId = selectedPlantId;
        }

        // Use the configured endpoint
        if (!config.apiEndpoint) return;

        const response: any = await api.get(config.apiEndpoint, { params });
        const rawData = response.data || response;

        let dataToProcess = rawData;
        if (config.transformResponse) {
          dataToProcess = config.transformResponse(rawData);
        }

        let allItems: any[] = [];
        // Extract array using same logic as loadEntities
        if (config.responseKey && (dataToProcess as any)[config.responseKey]) {
          allItems = (dataToProcess as any)[config.responseKey];
        } else if (Array.isArray(dataToProcess)) {
          allItems = dataToProcess;
        } else if (dataToProcess?.data && Array.isArray(dataToProcess.data)) {
          allItems = dataToProcess.data;
        } else if (dataToProcess?.[config.entityNamePlural]) {
          allItems = dataToProcess[config.entityNamePlural];
        }

        const allIds = allItems.map(item => item.id).filter(id => id);

        if (allIds.length > 0) {
          setSelectedEntities(new Set(allIds));
          toast({ title: "Selected All", description: `${allIds.length} items selected` });
        } else {
          toast({ title: "Selection Warning", description: "No item IDs found to select", variant: "destructive" });
        }

      } catch (error) {
        console.error("Failed to fetch all assets for selection", error);
        toast({ title: "Selection Failed", description: "Could not fetch all items", variant: "destructive" });
      }
    } else {
      // Client-side selection - use sourceEntities which respects archiveStatus
      // sourceEntities is either entities (active) or archivedEntities (archived)
      const allIds = sourceEntities.map(e => e.id).filter(id => id);
      setSelectedEntities(new Set(allIds));
      toast({ title: "Selected All", description: `${allIds.length} items selected` });
    }
  };
  const handleSelectEntity = (id: string) => { const n = new Set(selectedEntities); n.has(id) ? n.delete(id) : n.add(id); setSelectedEntities(n); };
  const handleClearSelection = () => setSelectedEntities(new Set());

  // Helper: Build update data for archive/restore (matches monolithic lines 1693-1770)
  const buildUpdateData = (entity: BaseEntity, status: "Active" | "Inactive") => {
    const updateData: Record<string, any> = {};

    if (config.archiveFields && config.archiveFields.length > 0) {
      config.archiveFields.forEach((field) => {
        if (field === "status") return;
        if ((entity as any)[field] !== undefined) {
          updateData[field] = (entity as any)[field];
        }
      });
      updateData.status = status;
      return updateData;
    }

    // Default: use status field only
    updateData.status = status;
    return updateData;
  };

  // Handlers: Bulk Actions
  const handleBulkExport = () => toast({ title: "Success", description: `Exported ${selectedEntities.size} items` });
  const handleBulkArchive = async () => {
    const selectedCount = selectedEntities.size;
    toast({ title: "Processing", description: `Archiving ${selectedCount} ${config.entityNamePlural.toLowerCase()}...` });
    try {
      const archivePromises = Array.from(selectedEntities).map((entityId) => {
        const entity = entities.find((e) => e.id === entityId);
        if (!entity) return Promise.resolve();
        let updateData = buildUpdateData(entity, "Inactive");
        // Apply transformData so entity-specific field mapping (e.g. status → isActive)
        // is handled consistently with single-item archive
        if (config.transformData) {
          updateData = config.transformData(updateData);
        }
        return api.put(`${config.apiEndpoint}/${entityId}`, updateData);
      });
      await Promise.all(archivePromises);
      setSelectedEntities(new Set());
      setShowBulkActions(false);
      toast({ title: "Bulk Archive Successful", description: `Successfully archived ${selectedCount} ${config.entityNamePlural.toLowerCase()}` });
      loadEntities();
    } catch (error: any) {
      toast({ title: "Bulk Archive Failed", description: error.message || "Operation failed", variant: "destructive" });
      loadEntities();
    }
  };
  const handleBulkRestore = async () => {
    const selectedCount = selectedEntities.size;
    toast({ title: "Processing", description: `Restoring ${selectedCount} ${config.entityNamePlural.toLowerCase()}...` });
    try {
      const restorePromises = Array.from(selectedEntities).map((entityId) => {
        const entity = archivedEntities.find((e) => e.id === entityId);
        if (!entity) return Promise.resolve();
        let updateData = buildUpdateData(entity, "Active");
        // Apply transformData so entity-specific field mapping (e.g. status → isActive)
        // is handled consistently with single-item restore
        if (config.transformData) {
          updateData = config.transformData(updateData);
        }
        return api.put(`${config.apiEndpoint}/${entityId}`, updateData);
      });
      await Promise.all(restorePromises);
      setSelectedEntities(new Set());
      setShowBulkActions(false);
      toast({ title: "Bulk Restore Successful", description: `Successfully restored ${selectedCount} ${config.entityNamePlural.toLowerCase()}` });
      handleViewArchive();
    } catch (error: any) {
      toast({ title: "Bulk Restore Failed", description: error.message || "Operation failed", variant: "destructive" });
      handleViewArchive();
    }
  };
  const handleBulkDelete = async () => { await Promise.all(Array.from(selectedEntities).map(id => api.delete(`${config.apiEndpoint}/${id}`))); setSelectedEntities(new Set()); loadEntities(); toast({ title: "Success", description: `Deleted ${selectedEntities.size} items` }); };

  // Handlers: Actions
  const handleDuplicate = (entity: BaseEntity) => { const d = { ...entity }; delete (d as any).id; (d as any).name = `${entity.name} (Copy)`; setFormData(d); setCurrentView("create"); };
  const handleShareEntity = (entity: BaseEntity) => { navigator.clipboard.writeText(`${window.location.origin}/${config.entityNamePlural.toLowerCase()}/${entity.id}`); toast({ title: "Success", description: "Link copied" }); };
  const handleBookmark = (entity: BaseEntity) => { const n = new Set(bookmarkedEntities); n.has(entity.id) ? n.delete(entity.id) : n.add(entity.id); setBookmarkedEntities(n); };
  const handleFlag = (entity: BaseEntity) => { const n = new Set(flaggedEntities); n.has(entity.id) ? n.delete(entity.id) : n.add(entity.id); setFlaggedEntities(n); };
  const handleViewHistory = (entity: BaseEntity) => { setShowHistory(true); setSelectedEntityForComments(entity.id); };

  // Handlers: Settings/Filter
  const saveSettings = () => { localStorage.setItem(`settings_${config.entityNamePlural}`, JSON.stringify(settings)); setShowSettings(false); setViewMode(settings.defaultView as ViewMode); toast({ title: "Success", description: "Settings saved" }); };
  const handleViewModeChange = (mode: ViewMode) => setViewMode(mode);

  const backToList = () => { setCurrentView("list"); setSearchParams({}); };
  const toggleHistory = () => { if (!showHistory) setSelectedEntityForComments(null); setShowHistory(!showHistory); };

  // Handlers: Comments
  const getEntityComments = (entityId: string) => comments[entityId] || [];
  const handleAddComment = (entityId: string) => { if (!newComment.trim()) return; setComments({ ...comments, [entityId]: [...(comments[entityId] || []), { id: Date.now().toString(), user: "Current User", timestamp: new Date().toISOString(), text: newComment }] }); setNewComment(""); };
  const handleDeleteComment = (entityId: string, commentId: string) => setComments({ ...comments, [entityId]: (comments[entityId] || []).filter(c => c.id !== commentId) });

  // Handlers: Wizard Navigation (matches monolithic lines 738-799)
  const prevStep = () => {
    if (config.onWizardBack) config.onWizardBack(currentStep);
    const idx = wizardSteps.findIndex(s => s.id === currentStep);
    if (idx > 0) setCurrentStep(wizardSteps[idx - 1].id);
  };
  const nextStep = async () => {
    try {
      if (config.onWizardNext) {
        const canProceed = await config.onWizardNext(currentStep, formData);
        if (!canProceed) return;
      }
      const currentIndex = wizardSteps.findIndex(s => s.id === currentStep);
      if (currentIndex < wizardSteps.length - 1) {
        justChangedStepRef.current = true;
        setCurrentStep(wizardSteps[currentIndex + 1].id);
        setTimeout(() => { justChangedStepRef.current = false; }, 500);
      }
    } catch (error) { console.error("❌ Error in nextStep:", error); }
  };

  // ======= RENDER =======

  // Calculate dynamic options for filters (must be before early returns - React Rules of Hooks)
  const attributesWithDynamicOptions = useMemo(() => {
    // Use cached full list if available, otherwise use current entities
    // This ensures dropdowns show all options even when backend filters narrow results
    const sourceForOptions = entitiesForOptions.length > 0 ? entitiesForOptions : entities;

    return filteredAttributes.map(attr => {
      if (!attr.dynamicOptionsFromEntities) return attr;

      const optionMap = new Map<string, string>();

      sourceForOptions.forEach(e => {
        let valId = (e as any)[attr.id];

        // Fallback to snake_case if value is missing
        if (valId === undefined || valId === null) {
          const snakeCase = attr.id.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          if ((e as any)[snakeCase] !== undefined) {
            valId = (e as any)[snakeCase];
          }
        }

        if (valId !== undefined && valId !== null && valId !== '') {
          let valueStr = '';

          if (typeof valId === 'object') {
            valueStr = String(valId.id || valId.name || valId.plantName || valId.buildingName || valId.industryName || valId.industry_name || valId.categoryName || valId);
          } else if (attr.id === 'capacity') {
            valueStr = String(valId).trim().split(/\s+/)[0];
          } else {
            valueStr = String(valId);
          }

          let labelStr = valueStr;

          // If entityField is provided, attempt to extract the label from it
          if (attr.entityField && (e as any)[attr.entityField] !== undefined && (e as any)[attr.entityField] !== null) {
            const labelObj = (e as any)[attr.entityField];
            if (typeof labelObj === 'object') {
              labelStr = labelObj.name || labelObj.plantName || labelObj.buildingName || labelObj.industryName || labelObj.industry_name || labelObj.categoryName || labelStr;
            } else {
              labelStr = String(labelObj);
            }
          } else if (typeof valId === 'object') {
            // Also attempt to get a friendly label if valId was already an object
            labelStr = valId.name || valId.plantName || valId.buildingName || valId.industryName || valId.industry_name || valId.categoryName || labelStr;
          }

          optionMap.set(valueStr, labelStr);
        }
      });

      const options = Array.from(optionMap.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const result = {
        ...attr,
        options
      };

      // Debug log for capacity options
      if (attr.id === 'capacity') {
        console.log('[GenericEntityPage] Capacity filter options from:', entitiesForOptions.length > 0 ? 'cached' : 'current', 'entities');
        console.log('[GenericEntityPage] Capacity filter options:', result.options);
      }

      return result;
    });
  }, [filteredAttributes, entities, entitiesForOptions]);

  // Loading State - Only show global spinner on initial load to prevent focus loss during search
  if (loading && entities.length === 0 && currentView === "list") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
        <span className="ml-2 text-sm text-gray-500 font-normal">Loading {config.entityNamePlural}...</span>
      </div>
    );
  }



  // List View - Uses MODULAR COMPONENTS
  if (currentView === "list") {
    return (
      <div className={`grid ${showHistory ? "grid-cols-12" : "grid-cols-1"} gap-0 bg-white`}>
        <div className={`${showHistory ? "col-span-8" : "col-span-1"} p-0 pt-0 space-y-1`}>
          <EntityHeader
            config={config}
            archiveStatus={archiveStatus}
            viewMode={viewMode}
            showFilter={showFilter}
            activeFilterCount={activeFilters.length}
            canCreate={canCreate}
            isLoading={loading}
            onAddNew={openCreateView}
            onToggleFilter={() => setShowFilter(!showFilter)}
            onViewModeChange={handleViewModeChange}
            onToggleArchiveView={handleViewArchive}
            onExport={handleExport}
            onImport={handleImport}
            onPrint={handlePrint}
            onShare={handleShareList}
            onRefresh={handleRefresh}
            onBulkActions={handleBulkActions}
            onSettings={() => setShowSettings(true)}
            onHelp={handleGetHelp}
            onHistory={() => setShowHistory(true)}
          />
          {/* The following block was previously inside a div with mb-8, now removed */}
          {/* New Compact Filter Bar - Only shown when Filter button is clicked */}
          {showFilter && (
            <EntityFilterBar
              activeFilterCount={activeFilters.length}
              showFilterPanel={showFilter}
              onToggleFilterPanel={() => setShowFilter(!showFilter)}
              onClearAllFilters={handleClearAllFilters}
              onSaveView={handleSaveView}
              globalSearch={globalSearch}
              onGlobalSearchChange={setGlobalSearch}
              // Sort props
              sorts={sorts}
              sortAttributes={filteredAttributes}
              onUpdateSorts={handleUpdateSorts}
              // Column props
              fields={config.fields}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
              onResetColumns={handleResetColumns}
            />
          )}

          {/* Dynamic Filter Panel (OpenProject Style) */}
          {showFilter && (
            <EntityDynamicFilterPanel
              attributes={attributesWithDynamicOptions}
              activeFilters={activeFilters}
              onAddFilter={handleAddFilter}
              onUpdateFilter={handleUpdateFilter}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
              onApply={() => setShowFilter(false)}
            />
          )}

          {showBulkActions && <EntityBulkActions config={config} selectedEntities={selectedEntities} entities={paginatedEntities} archiveStatus={archiveStatus} effectiveConfig={config} onSelectAll={handleSelectAll} onSelectAllAssets={handleSelectAllAssets} onClearSelection={handleClearSelection} onBulkExport={handleBulkExport} onBulkArchive={handleBulkArchive} onBulkRestore={handleBulkRestore} onBulkDelete={handleBulkDelete} onClose={() => setShowBulkActions(false)} onSetSelectedEntities={setSelectedEntities} />}

          {/* Export/Import Modals */}
          <ExportModal
            open={showExportModal}
            onOpenChange={setShowExportModal}
            entities={sortedEntities}
            filterAttributes={filteredAttributes}
            visibleColumns={visibleColumns}
            entityName={config.entityName}
            entityNamePlural={config.entityNamePlural}
          />
          <ImportModal
            open={showImportModal}
            onOpenChange={setShowImportModal}
            filterAttributes={filteredAttributes}
            importFields={config.importFields}
            entityName={config.entityName}
            entityNamePlural={config.entityNamePlural}
            apiEndpoint={config.apiEndpoint}
            onImportComplete={handleImportComplete}
          />
          {showSettings && <EntitySettingsPanel config={config} settings={settings} onSettingsChange={setSettings} onSave={saveSettings} onCancel={() => setShowSettings(false)} />}
          {entityToDelete && <EntityConfirmDialog config={config} entity={entityToDelete} onConfirm={handleDelete} onCancel={() => setEntityToDelete(null)} />}

          {viewMode === "table" ? (
            <EntityTableView
              config={config}
              paginatedEntities={paginatedEntities}
              showBulkActions={showBulkActions}
              selectedEntities={selectedEntities}
              entities={entities}
              archiveStatus={archiveStatus}
              bookmarkedEntities={bookmarkedEntities}
              flaggedEntities={flaggedEntities}
              canDelete={canDelete}
              onSelectAll={handleSelectAll}
              onSelectEntity={handleSelectEntity}
              onRowClick={handleDoubleClick}
              onArchive={handleArchive}
              onRestore={handleRestoreFromArchive}
              onDelete={openDeleteConfirm}
              onDuplicate={handleDuplicate}
              onShare={handleShareEntity}
              onViewHistory={handleViewHistory}
              onBookmark={handleBookmark}
              onFlag={handleFlag}
              visibleColumns={visibleColumns}
              isVisible={isVisible}
              sorts={sorts}
              onUpdateSorts={handleUpdateSorts}
            />
          ) : (
            <EntityGridView config={config} paginatedEntities={paginatedEntities} archiveStatus={archiveStatus} showBulkActions={showBulkActions} selectedEntities={selectedEntities} bookmarkedEntities={bookmarkedEntities} flaggedEntities={flaggedEntities} canDelete={canDelete} onCardClick={handleDoubleClick} onSelectEntity={handleSelectEntity} onArchive={handleArchive} onRestore={handleRestoreFromArchive} onDelete={openDeleteConfirm} onDuplicate={handleDuplicate} onShare={handleShareEntity} onViewHistory={handleViewHistory} onBookmark={handleBookmark} onFlag={handleFlag} />
          )}

          <EntityPagination
            config={config}
            currentPage={currentPage}
            totalPages={config.pagination ? totalPages : (Math.ceil(sortedEntities.length / itemsPerPage) || 1)}
            startIndex={startIndex}
            paginatedEntitiesLength={paginatedEntities.length}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            filteredEntitiesLength={sortedEntities.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setSettings(prev => ({ ...prev, itemsPerPage: String(val) }));
              setCurrentPage(1); // Reset to first page on change
            }}
          />
        </div>


        {showHistory && (
          <div className="col-span-4 border-l bg-white sticky top-0 h-screen overflow-hidden">
            <EntityHistoryDrawer
              config={config}
              selectedEntityForComments={selectedEntityForComments}
              selectedEntityName={
                selectedEntityForComments
                  ? (() => {
                    const entity = entities.find(e => e.id === selectedEntityForComments) as any;
                    if (!entity) return null;

                    // Entity-specific overrides based on config.entityName
                    if (config.entityName === 'Asset') return entity.assetId || entity.asset_code || entity.name;
                    if (config.entityName === 'Ticket') return entity.ticketId || entity.id;
                    if (config.entityName === 'Incident') return entity.incidentId || entity.incidentNumber || entity.id;

                    // For Questions, try to use the question text
                    if (config.entityName === 'Question') return entity.question || entity.questionText;

                    // Generic fallback with better precedence (specific IDs/Names first, container names last)
                    return entity.name ||
                      entity.title ||
                      entity.assetId ||
                      entity.asset_code ||
                      entity.ticketId ||
                      entity.incidentId ||
                      entity.question ||
                      entity.category_name ||
                      entity.vendorName ||
                      entity.email ||
                      entity.plantName || // Move plantName to the end as a fallback
                      null;
                  })()
                  : null
              }
              onToggleHistory={toggleHistory}
            />
          </div>
        )}
      </div>
    );
  }

  // Create/Edit View - Uses custom form if provided, else MODULAR EntityFormView
  if (config.renderCustomForm) {
    return config.renderCustomForm({
      editingEntity,
      onCancel: backToList,
      onSaveComplete: () => {
        loadEntities();
        backToList();
      }
    });
  }

  return (
    <EntityFormView
      config={config}
      currentView={currentView as "create" | "edit"}
      editingEntity={editingEntity}
      formData={formData}
      setFormData={setFormData}
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
      wizardSteps={wizardSteps}
      showHistory={showHistory}
      activities={activities}
      loadingActivities={loadingActivities}
      isLocked={isLocked}
      onBackToList={backToList}
      onSubmit={handleSubmit}
      onToggleHistory={toggleHistory}
      onPrevStep={prevStep}
      onNextStep={nextStep}
      onToggleLock={() => setIsLocked(!isLocked)}
    />
  );
}
