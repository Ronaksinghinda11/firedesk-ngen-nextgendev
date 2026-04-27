// src/components/generic/GenericEntityPage.tsx
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { Entity, Action } from "@/types/permissions";
import { usePlantFilter } from "@/contexts/PlantFilterContext";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  MessageSquare,
  Filter,
  Download,
  Settings,
  Eye,
  Save,
  X,
  FileText,
  Grid3X3,
  List,
  Clock,
  MoreVertical,
  MoreHorizontal,
  Upload,
  Printer,
  Share2,
  RefreshCw,
  Archive,
  HelpCircle,
  Copy,
  Bookmark,
  Flag,
  Lock,
  Mail,
  Link,
  Bell,
  Info,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  type: "text" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  referenceData?: any[];
}

export interface WizardStep {
  id: string;
  name: string;
  description?: string;
}

export interface EntityConfig {
  entityName: string;
  entityNamePlural: string;
  apiEndpoint: string;
  responseKey?: string;
  fields: EntityField[];
  additionalFields?: React.ReactNode;
  transformData?: (data: any) => any;
  transformResponse?: (response: any) => any;
  customActions?: (entity: BaseEntity) => React.ReactNode;
  customColumns?: (entity: BaseEntity) => React.ReactNode;
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

  // Navigation overrides
  onCreate?: () => void;
  onEdit?: (entity: BaseEntity) => void;
  onView?: (entity: BaseEntity) => void;

  // Custom header actions (rendered before the Add button)
  headerActions?: () => React.ReactNode;

  // Hide the default create button (useful when using custom headerActions)
  hideCreateButton?: boolean;

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
  hideListingRowKebab?: boolean; // If true, hides the kebab menu from listing rows
  limitTopMenuItems?: ('export' | 'import' | 'print' | 'share' | 'refresh' | 'bulkActions' | 'settings' | 'help' | 'history')[]; // Limit top menu items to specific actions

  // Custom bulk actions support
  customBulkActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    onClick: (selectedIds: string[], entities: any[], setSelectedEntities?: (ids: Set<string>) => void) => void | Promise<void>;
  }>;
}

type ViewType = "list" | "create" | "edit" | "preview";
type ViewMode = "table" | "grid";
type ArchiveStatus = "active" | "archived";

export default function GenericEntityPage({
  config,
}: {
  config: EntityConfig;
}) {
  // URL parameters for edit mode navigation
  const [searchParams, setSearchParams] = useSearchParams();

  // Permission hooks
  const { hasPermission, isAdmin } = usePermissions();

  // Plant filter hook (used when enablePlantFilter is true)
  const { selectedPlantId } = usePlantFilter();

  // Check if this is the manager module to customize menu options
  const isManagerModule = window.location.pathname.includes('/manager/') || config.entityName === 'Manager';
  const effectiveConfig = config;

  // Permission checking functions
  const canCreate = config.permissionEntity && config.enforcePermissions
    ? hasPermission(config.permissionEntity, Action.CREATE)
    : true;

  const canUpdate = config.permissionEntity && config.enforcePermissions
    ? hasPermission(config.permissionEntity, Action.UPDATE)
    : true;

  const canDelete = config.permissionEntity && config.enforcePermissions
    ? hasPermission(config.permissionEntity, Action.DELETE)
    : true;

  const [entities, setEntities] = useState<BaseEntity[]>([]);
  const [archivedEntities, setArchivedEntities] = useState<BaseEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>("list");
  const [currentStep, setCurrentStep] = useState<string>("");
  const [wizardSteps, setWizardSteps] = useState<WizardStep[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Initialize viewMode from localStorage settings
    const savedSettings = localStorage.getItem(
      `settings_${config.entityNamePlural}`
    );
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return (parsed.defaultView as ViewMode) || "table";
      } catch {
        return "table";
      }
    }
    return "table";
  });
  const [entityToDelete, setEntityToDelete] = useState<BaseEntity | null>(null);
  const [editingEntity, setEditingEntity] = useState<BaseEntity | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(
    new Set()
  );
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>("active");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const justChangedStepRef = useRef(false);
  // Separate filter state: UI state vs applied state
  const [filterOptions, setFilterOptions] = useState({
    status: "all",
    dateRange: "all",
    sortBy: "name",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    status: "all",
    dateRange: "all",
    sortBy: "name",
  });
  const [settings, setSettings] = useState({
    itemsPerPage: "25",
    defaultView: "table",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [bookmarkedEntities, setBookmarkedEntities] = useState<Set<string>>(
    () => {
      // Load bookmarks from localStorage on mount
      const stored = localStorage.getItem(
        `bookmarks_${config.entityNamePlural}`
      );
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
  );
  const [flaggedEntities, setFlaggedEntities] = useState<Set<string>>(() => {
    // Load flags from localStorage on mount
    const stored = localStorage.getItem(`flags_${config.entityNamePlural}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [isLocked, setIsLocked] = useState(false);
  const [comments, setComments] = useState<Record<string, any[]>>(() => {
    // Load comments from localStorage on mount
    const stored = localStorage.getItem(`comments_${config.entityNamePlural}`);
    return stored ? JSON.parse(stored) : {};
  });
  const [newComment, setNewComment] = useState("");
  const [selectedEntityForComments, setSelectedEntityForComments] = useState<
    string | null
  >(null);

  // Compute filtered entities without modifying the original array
  const getFilteredEntities = () => {
    let filtered = [
      ...(archiveStatus === "active" ? entities : archivedEntities),
    ];

    // Apply status filter using APPLIED filters, not UI filter options
    if (appliedFilters.status !== "all") {
      filtered = filtered.filter(
        (entity) => entity.status === appliedFilters.status
      );
    }

    // Apply date range filter
    if (appliedFilters.dateRange !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((entity) => {
        const entityDate = new Date(entity.createdAt);

        switch (filterOptions.dateRange) {
          case "today":
            // Check if created today
            const entityToday = new Date(
              entityDate.getFullYear(),
              entityDate.getMonth(),
              entityDate.getDate()
            );
            return entityToday.getTime() === today.getTime();

          case "week":
            // Check if created in the last 7 days
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return entityDate >= weekAgo;

          case "month":
            // Check if created in the last 30 days
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);
            return entityDate >= monthAgo;

          default:
            return true;
        }
      });
    }

    // Apply sorting
    if (appliedFilters.sortBy === "name") {
      filtered.sort((a, b) => {
        const aName = a.name || "";
        const bName = b.name || "";
        return aName.localeCompare(bName);
      });
    } else if (appliedFilters.sortBy === "date") {
      filtered.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    return filtered;
  };

  const filteredEntities = getFilteredEntities();

  // Calculate paginated entities
  // Calculate paginated entities
  const itemsPerPage = parseInt(settings.itemsPerPage) || 10;

  let totalPages = 1;
  let paginatedEntities: BaseEntity[] = [];
  let startIndex = 0;
  let endIndex = 0;

  if (config.pagination) {
    // Server-side pagination
    totalPages = serverTotalPages;
    paginatedEntities = filteredEntities; // Entities are already paginated from server
    startIndex = (currentPage - 1) * itemsPerPage;
    endIndex = startIndex + paginatedEntities.length;
  } else {
    // Client-side pagination
    totalPages = Math.ceil(filteredEntities.length / itemsPerPage);
    startIndex = (currentPage - 1) * itemsPerPage;
    endIndex = startIndex + itemsPerPage;
    paginatedEntities = filteredEntities.slice(startIndex, endIndex);
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters, settings.itemsPerPage]);

  // Initialize wizard - only run once when component mounts or when wizard steps are first defined
  useEffect(() => {
    if (
      config.wizardSteps &&
      config.wizardSteps.length > 0 &&
      wizardSteps.length === 0
    ) {
      console.log("🎬 Initializing wizard steps:", config.wizardSteps);
      setWizardSteps(config.wizardSteps);
      setCurrentStep(config.wizardSteps[0].id);
    }
  }, [config.wizardSteps, wizardSteps.length]);

  useEffect(() => {
    loadEntities();
  }, [config.fetchTrigger, config.enablePlantFilter ? selectedPlantId : null, currentPage, itemsPerPage]);

  useEffect(() => {
    if (showHistory) {
      loadActivities();
    }
  }, [showHistory]);



  // Sync viewMode with settings.defaultView on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(
      `settings_${config.entityNamePlural}`
    );
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      setViewMode(parsed.defaultView as ViewMode);
    }
  }, [config.entityNamePlural]);

  const loadEntities = async () => {
    try {
      setLoading(true);
      console.log(
        `🔄 Loading ${config.entityNamePlural} from:`,
        config.apiEndpoint
      );

      let response;

      // Use customFetchAll if provided, otherwise use default endpoint
      if (config.customFetchAll) {
        console.log(`🔧 Using customFetchAll function`);
        response = await config.customFetchAll();
      } else {
        const endpoint = config.apiEndpoint.startsWith("/")
          ? config.apiEndpoint
          : `/${config.apiEndpoint}`;

        // Apply plant filter if enabled
        const params: Record<string, string> = {};
        if (config.enablePlantFilter && selectedPlantId && selectedPlantId !== 'all') {
          const paramName = config.plantFilterParam || 'plantId';
          params[paramName] = selectedPlantId;
          console.log(`🌿 Applying plant filter: ${paramName}=${selectedPlantId}`);
        }

        // Apply pagination if enabled
        if (config.pagination) {
          params.page = currentPage.toString();
          params.limit = itemsPerPage.toString();
          console.log(`📄 Applying pagination: page=${params.page}, limit=${params.limit}`);
        }

        console.log(`🌐 Making API request to:`, endpoint, params);
        response = await api.get(endpoint, { params });
      }

      console.log(`📦 API Response for ${config.entityNamePlural}:`, response);

      // Handle pagination metadata
      if (config.pagination) {
        if (response.count !== undefined) {
          setTotalItems(response.count);
        }
        if (response.totalPages !== undefined) {
          setServerTotalPages(response.totalPages);
        } else if (response.count !== undefined) {
          setServerTotalPages(Math.ceil(response.count / itemsPerPage));
        }
      }

      let entityData;

      if (config.transformResponse) {
        // Apply transformResponse first
        const transformedData = config.transformResponse(response);
        console.log(`🔄 After transformResponse:`, transformedData);

        // Then extract using responseKey
        if (config.responseKey) {
          entityData = transformedData[config.responseKey];
          console.log(
            `🔑 Using responseKey "${config.responseKey}" after transform:`,
            entityData
          );
        } else {
          entityData = transformedData;
          console.log(
            `📋 No responseKey, using transformed data directly:`,
            entityData
          );
        }
      } else if (config.responseKey) {
        entityData = response[config.responseKey];
        console.log(
          `🔑 Using responseKey "${config.responseKey}":`,
          entityData
        );
      } else {
        entityData = response[config.entityNamePlural];
        console.log(
          `🔍 Using entityNamePlural "${config.entityNamePlural}":`,
          entityData
        );
      }

      if (!entityData) {
        console.log(
          `⚠️ No data found with primary methods, trying fallbacks...`
        );

        if (Array.isArray(response)) {
          entityData = response;
          console.log(`📋 Response is an array, using directly:`, entityData);
        }

        if ((response as any).data) {
          if (Array.isArray((response as any).data)) {
            entityData = (response as any).data;
            console.log(`📋 Found array in response.data:`, entityData);
          } else if ((response as any).data[config.entityNamePlural]) {
            entityData = (response as any).data[config.entityNamePlural];
            console.log(
              `📋 Found in response.data[${config.entityNamePlural}]:`,
              entityData
            );
          } else if (
            config.responseKey &&
            (response as any).data[config.responseKey]
          ) {
            entityData = (response as any).data[config.responseKey];
            console.log(
              `📋 Found in response.data[${config.responseKey}]:`,
              entityData
            );
          }
        }
      }

      if (entityData && Array.isArray(entityData)) {
        console.log(
          `✅ ${config.entityNamePlural} loaded successfully:`,
          entityData
        );

        // Filter to show only ACTIVE entities (excluding archived/inactive ones)
        const archiveValue = config.archiveStatusValue || 'Inactive';
        const activeEntities = entityData.filter(entity => {
          // Entity is active if status is NOT the archive status value
          // This ensures archived entities don't appear in the active view
          return entity.status !== archiveValue && entity.status !== 'Inactive';
        });

        console.log(
          `🎯 Filtered to ${activeEntities.length} active entities (excluded ${entityData.length - activeEntities.length} archived)`
        );

        // Debug: Check the first entity's structure
        if (activeEntities.length > 0) {
          console.log(`🔍 First active entity structure:`, activeEntities[0]);
          console.log(`🔍 First active entity name field:`, activeEntities[0].name);
        }

        setEntities(activeEntities);
      } else {
        console.warn(
          `⚠️ No valid ${config.entityNamePlural} data found in response: `,
          response
        );
        console.warn(
          `Expected responseKey: "${config.responseKey}" or entityNamePlural: "${config.entityNamePlural}"`
        );
        setEntities([]);
      }
    } catch (error: any) {
      console.error("❌ Error loading entities:", error);

      if (error.response && error.response.status) {
        console.error("❌ Response error data:", error.response.data);
        console.error("❌ Response error status:", error.response.status);
        console.error("❌ Response error headers:", error.response.headers);

        const errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          error.message ||
          "An error occurred";

        toast({
          title: "API Error",
          description: `Server responded with status ${error.response.status}: ${errorMessage} `,
          variant: "destructive",
        });
      } else if (error.request) {
        console.error(
          "❌ Request error (no response received):",
          error.request
        );

        toast({
          title: "Network Error",
          description:
            "No response received from server. Please check your network connection.",
          variant: "destructive",
        });
      } else {
        console.error("❌ General error:", error.message);

        const errorMessage =
          error.message || `Failed to load ${config.entityNamePlural} `;

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }

      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async (entityId?: string) => {
    try {
      setLoadingActivities(true);

      // Fetch activities from the backend
      const params: any = {
        limit: 50,
        offset: 0,
      };

      // Filter by entity type if available
      if (config.entityName) {
        params.entityType = config.entityName.toLowerCase();
      }

      // Filter by specific entity if ID provided
      if (entityId) {
        params.entityId = entityId;
      }

      const response = await api.get<{
        success: boolean;
        activities: any[];
        total: number;
      }>("/activity", { params });

      if (response.success && response.activities) {
        // Transform backend activities to match our Activity interface
        const transformedActivities: Activity[] = response.activities.map(
          (act: any) => ({
            id: act.id,
            action: act.action || "updated",
            entityName: act.entityName || config.entityName,
            user: act.userName || "System",
            userAvatar: act.userAvatar,
            timestamp: act.createdAt,
            details: act.description || act.metadata?.fieldsChanged?.join(", "),
            type:
              act.action === "created"
                ? "create"
                : act.action === "deleted"
                  ? "delete"
                  : act.action === "commented"
                    ? "comment"
                    : "update",
          })
        );

        setActivities(transformedActivities);
      } else {
        setActivities([]);
      }
    } catch (error: any) {
      console.error("❌ Error loading activities:", error);
      toast({
        title: "Error",
        description: "Failed to load activity history",
        variant: "destructive",
      });
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Double-click handler function
  const handleDoubleClick = (entity: BaseEntity) => {
    if (archiveStatus === "active") {
      // Check if user has update permission
      if (!canUpdate) {
        toast({
          title: "Permission Denied",
          description: `You don't have permission to edit ${config.entityNamePlural}.`,
          variant: "destructive",
        });
        return;
      }

      // Use custom onEdit navigation if provided, otherwise use internal edit view
      if (config.onEdit) {
        config.onEdit(entity);
      } else {
        openEditView(entity);
      }
    }
  };

  // Wizard navigation functions
  const nextStep = async () => {
    console.log("🔄 nextStep called");
    console.log("🔄 Current step:", currentStep);
    console.log("🔄 Wizard steps:", wizardSteps);
    console.log("🔄 Form data:", formData);

    try {
      if (config.onWizardNext) {
        const canProceed = await config.onWizardNext(currentStep, formData);
        console.log("🔄 onWizardNext returned:", canProceed);
        if (!canProceed) {
          console.log("⛔ Cannot proceed - validation failed");
          return;
        }
      }

      const currentIndex = wizardSteps.findIndex(
        (step) => step.id === currentStep
      );
      console.log(
        "🔄 Current index:",
        currentIndex,
        "Total steps:",
        wizardSteps.length
      );

      if (currentIndex < wizardSteps.length - 1) {
        const nextStepId = wizardSteps[currentIndex + 1].id;
        console.log("✅ Moving to next step:", nextStepId);

        // Set flag to prevent immediate submission
        justChangedStepRef.current = true;
        console.log("🚫 Set justChangedStepRef to TRUE");

        setCurrentStep(nextStepId);
        console.log("✅ setCurrentStep called with:", nextStepId);

        // Clear flag after a short delay
        setTimeout(() => {
          justChangedStepRef.current = false;
          console.log("✅ Cleared justChangedStepRef to FALSE");
        }, 500);
      } else {
        console.log("⚠️ Already on last step, cannot proceed");
      }
    } catch (error) {
      console.error("❌ Error in nextStep:", error);
    }
  };

  const prevStep = () => {
    if (config.onWizardBack) {
      config.onWizardBack(currentStep);
    }

    const currentIndex = wizardSteps.findIndex(
      (step) => step.id === currentStep
    );
    if (currentIndex > 0) {
      setCurrentStep(wizardSteps[currentIndex - 1].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📝 handleSubmit called");
    console.log("📝 Current step:", currentStep);
    console.log("📝 Wizard steps length:", wizardSteps.length);
    console.log("📝 Last step ID:", wizardSteps[wizardSteps.length - 1]?.id);
    console.log(
      "📝 Is wizard?",
      config.onWizardSubmit && wizardSteps.length > 0
    );
    console.log("📝 justChangedStepRef.current:", justChangedStepRef.current);

    // If we just changed steps, prevent submission
    if (justChangedStepRef.current) {
      console.warn("🚫 BLOCKED: Just changed steps, preventing submission");
      return;
    }

    // If we're in wizard mode and NOT on the last step, prevent submission
    if (
      config.wizardSteps &&
      config.wizardSteps.length > 0 &&
      currentStep !== wizardSteps[wizardSteps.length - 1]?.id
    ) {
      console.warn(
        "⚠️ Attempted to submit form while not on last step. Ignoring."
      );
      return;
    }

    // Check for duplicate name (case-insensitive)
    // We check against the 'name' field in formData if it exists, or try to find a matching field from config
    let nameToCheck = formData.name;

    // If name is not directly in formData, try to find which field represents the name
    if (!nameToCheck) {
      // Try to find a field with 'name' in it (e.g. industryName, categoryName)
      const nameField = config.fields.find(f => f.name.toLowerCase().includes('name') && f.type === 'text');
      if (nameField) {
        nameToCheck = formData[nameField.name];
      }
    }

    if (nameToCheck && typeof nameToCheck === 'string') {
      const duplicate = entities.find((e) => {
        return e.name &&
          e.name.toLowerCase() === nameToCheck.toLowerCase() &&
          e.id !== editingEntity?.id;
      });

      if (duplicate) {
        toast({
          title: "Validation Error",
          description: "An item with this name already exists (names are case-insensitive).",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Use custom wizard submit if provided
      if (config.onWizardSubmit && wizardSteps.length > 0) {
        console.log("📝 Using wizard submit");
        await config.onWizardSubmit(formData);
      } else {
        console.log("📝 Using standard submit");
        // Use standard submit
        const data = config.transformData
          ? config.transformData(formData)
          : formData;

        if (editingEntity) {
          // Use URL parameter for update (RESTful pattern)
          await api.put(`${config.apiEndpoint}/${editingEntity.id}`, data);
          toast({
            title: "Success",
            description: `${config.entityName} updated successfully`,
          });
        } else {
          await api.post(config.apiEndpoint, data);
          toast({
            title: "Success",
            description: `${config.entityName} created successfully`,
          });
        }
      }

      setFormData({});
      setEditingEntity(null);
      setCurrentView("list");
      if (wizardSteps.length > 0) {
        setCurrentStep(wizardSteps[0].id);
      }
      loadEntities();
    } catch (error: any) {
      console.error("❌ Submit error:", error);
      const errorMessage =
        error.message || error.response?.data?.message || "Operation failed";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!entityToDelete) return;

    try {
      await api.delete(`${config.apiEndpoint}/${entityToDelete.id}`);
      toast({
        title: "Success",
        description: `${config.entityName} deleted successfully`,
      });

      setEntityToDelete(null);
      loadEntities();
    } catch (error: any) {
      console.error("❌ Delete error:", error);
      let errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Delete operation failed";

      // Handle specific error cases
      if (
        errorMessage.includes("constraint") ||
        errorMessage.includes("foreign key")
      ) {
        errorMessage = `Cannot delete ${config.entityName} because it is being used by other records. Please reassign or remove those records first.`;
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("authorized") ||
        error.response?.status === 403
      ) {
        errorMessage = `You don't have permission to delete this ${config.entityName}. Please contact an administrator.`;
      } else if (errorMessage === "Request failed" || error.request) {
        errorMessage = `Failed to delete ${config.entityName}. The server may be unavailable or the ${config.entityName} may not exist.`;
      }

      toast({
        title: "Cannot Delete",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Helper functions
  const openEditView = async (entity: BaseEntity) => {
    setEditingEntity(entity);
    let formDataObj: Record<string, any> = {};

    // ALWAYS include the entity ID for updates
    formDataObj.id = entity.id;

    // Map all fields from the entity to formData
    config.fields.forEach((field) => {
      // For technician, phone might be in entity.user.phone
      if (field.name === "phone" && (entity as any).user?.phone) {
        formDataObj[field.name] = (entity as any).user.phone;
      } else {
        formDataObj[field.name] = (entity as any)[field.name];
      }
    });

    // Also include additional entity-specific fields
    const additionalFields = [
      'experience', 'specialization', 'technicianType', 'status',
      'plantId', 'managerId', 'categoryId', 'productCategoryId', 'productId',
      'assetId', 'building', 'buildingId', 'floorId', 'wingId', 'location', 'condition', 'healthStatus', 'tag',
      'manufacturerName', 'model', 'serialNumber', 'slNo',
      'manufacturingDate', 'installDate', 'warrantyEndDate',
      'amcStartDate', 'amcEndDate', 'lastHPTestDate', 'nextHPTestDueDate', 'lifespanYears',
      'type', 'subType', 'capacity', 'capacityUnit',
      'permissions', 'permissionLevels', 'isDefault',  // For roles
      'taskName', 'taskDescription', 'technicianId', 'targetDate', 'completedStatus'  // For tickets
    ];
    additionalFields.forEach((field) => {
      if ((entity as any)[field] !== undefined) {
        formDataObj[field] = (entity as any)[field];
      }
    });

    // Handle plant, manager, category IDs from nested objects
    if ((entity as any).plant?.id) {
      formDataObj.plantId = (entity as any).plant.id;
    }
    if ((entity as any).manager?.id) {
      formDataObj.managerId = (entity as any).manager.id;
    }
    if ((entity as any).category?.id) {
      formDataObj.categoryId = (entity as any).category.id;
      formDataObj.productCategoryId = (entity as any).category.id;
    }
    if ((entity as any).product?.id) {
      formDataObj.productId = (entity as any).product.id;
    }

    // Handle building/floor/wing IDs from nested objects (for assets)
    if ((entity as any).buildingRef?.id) {
      formDataObj.buildingId = (entity as any).buildingRef.id;
    }
    if ((entity as any).floorRef?.id) {
      formDataObj.floorId = (entity as any).floorRef.id;
    }
    if ((entity as any).wingRef?.id) {
      formDataObj.wingId = (entity as any).wingRef.id;
    }

    // Include vendor details for third party technicians
    if ((entity as any).technicianType === "Third Party") {
      const vendorFields = [
        "venderName",
        "venderNumber",
        "venderEmail",
        "venderAddress",
      ];
      vendorFields.forEach((field) => {
        if ((entity as any)[field] !== undefined) {
          formDataObj[field] = (entity as any)[field];
        }
      });
    }

    // Include variants for products (variants can be in different field names)
    if ((entity as any).variants !== undefined) {
      formDataObj.variants = (entity as any).variants;
      formDataObj.productVariants = (entity as any).variants;
    }
    if ((entity as any).productVariants !== undefined) {
      formDataObj.productVariants = (entity as any).productVariants;
      formDataObj.variants = (entity as any).productVariants;
    }

    // Include plantIds for managers
    if ((entity as any).plantIds !== undefined) {
      formDataObj.plantIds = (entity as any).plantIds;
    }

    // Include permissions for roles
    if ((entity as any).permissions !== undefined) {
      formDataObj.permissions = (entity as any).permissions;
    }

    // Include current role for users (to show what's being changed)
    if ((entity as any).role?.name !== undefined) {
      formDataObj.currentRole = (entity as any).role.name;
    }
    if ((entity as any).roleId !== undefined) {
      formDataObj.roleId = (entity as any).roleId;
    }

    // If config has a custom loadEntityData function, call it to load additional data
    if (config.loadEntityData) {
      console.log("🔄 Calling custom loadEntityData for entity:", entity.id);
      try {
        const additionalData = await config.loadEntityData(entity.id, formDataObj);
        if (additionalData) {
          formDataObj = { ...formDataObj, ...additionalData };
          console.log("✅ Merged additional data from loadEntityData:", additionalData);
        }
      } catch (error) {
        console.error("❌ Error loading entity data:", error);
      }
    }

    console.log("📝 Setting form data for edit:", formDataObj);
    setFormData(formDataObj);
    setCurrentView("edit");
    if (wizardSteps.length > 0) {
      setCurrentStep(wizardSteps[0].id);
    }
  };

  // Handle URL parameters for edit mode (e.g., ?mode=edit&id=123)
  useEffect(() => {
    const mode = searchParams.get('mode');
    const entityId = searchParams.get('id');

    if (mode === 'edit' && entityId && entities.length > 0 && !loading) {
      // Find the entity to edit
      const entityToEdit = entities.find((e) => e.id === entityId);
      if (entityToEdit) {
        console.log('🔄 Opening edit view from URL params for entity:', entityId);
        // Clear URL params to prevent re-triggering
        setSearchParams({});
        // Open edit view
        openEditView(entityToEdit);
      }
    } else if (mode === 'create' && !loading) {
      // Use getInitialFormData if available to pre-populate fields (e.g. role from URL)
      const initialData = config.getInitialFormData ? config.getInitialFormData() : {};

      // If getInitialFormData returns null, it means it's waiting for data (e.g. roles)
      // So we abort and wait for the next render (when config updates)
      if (initialData === null) {
        console.log('⏳ Waiting for reference data before initializing create view...');
        return;
      }

      console.log('🔄 Opening create view from URL params');
      console.log('📝 Initializing form data with:', initialData);

      // Clear URL params to prevent re-triggering
      setSearchParams({});
      // Open create view - but don't call config.onCreate since that would redirect back
      setEditingEntity(null);
      setFormData(initialData);

      setCurrentView("create");
      if (wizardSteps.length > 0) {
        setCurrentStep(wizardSteps[0].id);
      }
    }
  }, [entities, loading, searchParams]);

  const openDeleteConfirm = (entity: BaseEntity) => {
    setEntityToDelete(entity);
  };

  const cancelDelete = () => {
    setEntityToDelete(null);
  };

  const openCreateView = () => {
    // Check for custom navigation first
    if (config.onCreate) {
      config.onCreate();
      return;
    }

    // Fall back to internal state management
    setEditingEntity(null);
    // Use getInitialFormData if available (for URL params like plantId)
    const initialData = config.getInitialFormData ? config.getInitialFormData() : {};
    console.log('📝 openCreateView: Initializing form data with:', initialData);
    setFormData(initialData || {});
    setCurrentView("create");
    if (wizardSteps.length > 0) {
      setCurrentStep(wizardSteps[0].id);
    }
  };

  const backToList = () => {
    setCurrentView("list");
    if (wizardSteps.length > 0) {
      setCurrentStep(wizardSteps[0].id);
    }
  };

  // CSV Escape Helper - properly escape CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }

    // Convert to string
    let strValue = String(value);

    // Handle arrays and objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      strValue = JSON.stringify(value);
    } else if (Array.isArray(value)) {
      strValue = value.join(', ');
    }

    // Escape quotes by doubling them
    strValue = strValue.replace(/"/g, '""');

    // Wrap in quotes if contains comma, newline, or quote
    if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
      return `"${strValue}"`;
    }

    return strValue;
  };

  // Get value from entity using field name
  const getFieldValue = (entity: any, fieldName: string): any => {
    // For reference fields (fields ending in "Id"), try to resolve to display name first
    // e.g., if field is "stateId", check for "stateName" in the entity
    if (fieldName.endsWith('Id')) {
      const baseFieldName = fieldName.slice(0, -2); // Remove "Id" suffix
      const displayNameField = `${baseFieldName}Name`;

      // Check if entity has a corresponding Name field
      if (entity[displayNameField]) {
        return entity[displayNameField];
      }

      // Also check capitalized version (e.g., "State.stateName" for nested)
      const capitalizedName = baseFieldName.charAt(0).toUpperCase() + baseFieldName.slice(1);
      if (entity[capitalizedName] && entity[capitalizedName].name) {
        return entity[capitalizedName].name;
      }
      if (entity[capitalizedName] && entity[capitalizedName][`${baseFieldName}Name`]) {
        return entity[capitalizedName][`${baseFieldName}Name`];
      }
    }

    // Handle nested field paths (e.g., "user.name")
    const parts = fieldName.split('.');
    let value = entity;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return '';
      }
    }

    // Format dates
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-'))) {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    }

    return value;
  };

  // Additional functionality implementations
  const handleExport = () => {
    // Fields to exclude from export
    const excludedFields = ['id', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy', '_id'];

    if (entities.length === 0) {
      toast({
        title: "No Data to Export",
        description: `There are no ${config.entityNamePlural.toLowerCase()} to export`,
        variant: "destructive",
      });
      return;
    }

    // Use ALL entity fields (not just config.fields) to capture status and other important data
    const sampleEntity = entities[0];
    const allFieldNames = Object.keys(sampleEntity).filter(
      (key) => !excludedFields.includes(key)
    );

    // Build headers and field names
    // Try to use labels from config.fields where available, otherwise auto-generate
    const fieldConfigMap = new Map(config.fields.map(f => [f.name, f.label]));

    const headers = allFieldNames.map((fieldName) => {
      // Use configured label if available
      if (fieldConfigMap.has(fieldName)) {
        return fieldConfigMap.get(fieldName)!;
      }
      // Auto-generate readable header from field name
      return fieldName
        .charAt(0).toUpperCase() +
        fieldName.slice(1).replace(/([A-Z])/g, ' $1').trim();
    });

    const fieldNames = allFieldNames;

    // Build CSV data
    const csvData = entities.map((entity) =>
      fieldNames.map((fieldName) => {
        const value = getFieldValue(entity, fieldName);
        return escapeCSV(value);
      })
    );

    // Combine headers and data
    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.entityNamePlural.toLowerCase()}_${new Date().toISOString().split("T")[0]
      }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${entities.length
        } ${config.entityNamePlural.toLowerCase()} to CSV`,
    });
  };

  const handleImport = () => {
    toast({
      title: "Feature Coming Soon",
    });
  };

  const handlePrint = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Print list feature will be added soon.",
    });
  };

  const handleShareList = () => {
    const shareUrl = `${window.location.origin
      }/${config.entityNamePlural.toLowerCase()}`;

    if (navigator.share) {
      navigator.share({
        title: `${config.entityNamePlural} List`,
        text: `Check out this ${config.entityNamePlural.toLowerCase()} list`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: `${config.entityNamePlural} list link copied to clipboard`,
      });
    }
  };

  const handleRefresh = () => {
    loadEntities();
    toast({
      title: "Data Refreshed",
      description: `${config.entityNamePlural} list has been refreshed`,
    });
  };

  const handleBulkActions = () => {
    setShowBulkActions(!showBulkActions);
    if (!showBulkActions) {
      setSelectedEntities(new Set());
    }
  };

  const handleSelectEntity = (entityId: string) => {
    const newSelected = new Set(selectedEntities);
    if (newSelected.has(entityId)) {
      newSelected.delete(entityId);
    } else {
      newSelected.add(entityId);
    }
    setSelectedEntities(newSelected);
  };

  const handleSelectAll = () => {
    const currentPageIds = entities.map((e) => e.id);
    const allCurrentPageSelected = currentPageIds.every((id) => selectedEntities.has(id));

    const newSelected = new Set(selectedEntities);

    if (allCurrentPageSelected) {
      // Deselect all on current page (but keep other pages' selections)
      currentPageIds.forEach((id) => newSelected.delete(id));
    } else {
      // Select all on current page (add to existing selections)
      currentPageIds.forEach((id) => newSelected.add(id));
    }

    setSelectedEntities(newSelected);
  };

  // Select ALL entities across all pages by fetching all IDs from the API
  const handleSelectAllAssets = async () => {
    try {
      toast({
        title: "Loading...",
        description: `Fetching all ${config.entityNamePlural.toLowerCase()}...`,
      });

      // Fetch all entities without pagination to get all IDs
      const response = await api.get(config.apiEndpoint, {
        params: { limit: 10000 } // High limit to get all
      });

      let allEntities: any[] = [];
      const responseKey = config.responseKey || config.entityNamePlural.toLowerCase();

      if (response && typeof response === 'object') {
        if (Array.isArray((response as any)[responseKey])) {
          allEntities = (response as any)[responseKey];
        } else if (Array.isArray((response as any).data)) {
          allEntities = (response as any).data;
        } else if (Array.isArray(response)) {
          allEntities = response;
        }
      }

      const allIds = allEntities.map((e: any) => e.id);
      setSelectedEntities(new Set(allIds));

      toast({
        title: "All Selected",
        description: `Selected ${allIds.length} ${config.entityNamePlural.toLowerCase()}.`,
      });
    } catch (error: any) {
      console.error('Error fetching all entities:', error);
      toast({
        title: "Selection Failed",
        description: "Could not fetch all items. Try selecting page by page.",
        variant: "destructive",
      });
    }
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedEntities(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedEntities.size === 0) {
      toast({
        title: `No ${config.entityNamePlural} Selected`,
        description: `Please select at least one ${config.entityName.toLowerCase()} to delete`,
        variant: "destructive",
      });
      return;
    }

    const selectedCount = selectedEntities.size;

    toast({
      title: "Processing",
      description: `Deleting ${selectedCount} ${config.entityNamePlural.toLowerCase()}...`,
    });

    try {
      // Delete each selected entity via API
      const deletePromises = Array.from(selectedEntities).map((entityId) =>
        api.delete(`${config.apiEndpoint}/${entityId}`)
      );

      await Promise.all(deletePromises);

      // Update UI after successful deletion
      setEntities(entities.filter((e) => !selectedEntities.has(e.id)));
      setSelectedEntities(new Set());
      setShowBulkActions(false);

      toast({
        title: "Bulk Delete Successful",
        description: `Successfully deleted ${selectedCount} ${config.entityNamePlural.toLowerCase()}`,
      });
    } catch (error: any) {
      console.error("❌ Bulk delete error:", error);
      let errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Bulk delete operation failed";

      if (errorMessage.includes("constraint")) {
        errorMessage = `Cannot delete some ${config.entityNamePlural.toLowerCase()} because they are being used by other records. Please reassign those records first.`;
      }

      toast({
        title: "Bulk Delete Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });

      // Refresh to show current state
      loadEntities();
    }
  };

  const handleBulkArchive = async () => {
    if (selectedEntities.size === 0) {
      toast({
        title: `No ${config.entityNamePlural} Selected`,
        description: `Please select at least one ${config.entityName.toLowerCase()} to archive`,
        variant: "destructive",
      });
      return;
    }

    const selectedCount = selectedEntities.size;

    toast({
      title: "Processing",
      description: `Archiving ${selectedCount} ${config.entityNamePlural.toLowerCase()}...`,
    });

    try {
      // Archive by updating status to 'Inactive' for each selected entity
      const archivePromises = Array.from(selectedEntities).map((entityId) => {
        const entity = entities.find((e) => e.id === entityId);
        if (!entity) return Promise.resolve();

        // Use the generic helper function to build update data
        const updateData = buildUpdateData(entity, "Inactive");

        console.log(`📤 Bulk archive data for ${entity.name}:`, updateData);

        return api.put(`${config.apiEndpoint}/${entityId}`, updateData);
      });
      await Promise.all(archivePromises);

      setSelectedEntities(new Set());
      setShowBulkActions(false);

      toast({
        title: "Bulk Archive Successful",
        description: `Successfully archived ${selectedCount} ${config.entityNamePlural.toLowerCase()}`,
      });

      // Reload entities from server to show updated status
      loadEntities();
    } catch (error: any) {
      console.error("❌ Bulk archive error:", error);
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Bulk archive operation failed";

      toast({
        title: "Bulk Archive Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });

      // Refresh to show current state
      loadEntities();
    }
  };

  const handleBulkRestore = async () => {
    if (selectedEntities.size === 0) {
      toast({
        title: `No ${config.entityNamePlural} Selected`,
        description: `Please select at least one ${config.entityName.toLowerCase()} to restore`,
        variant: "destructive",
      });
      return;
    }

    const selectedCount = selectedEntities.size;

    toast({
      title: "Processing",
      description: `Restoring ${selectedCount} ${config.entityNamePlural.toLowerCase()}...`,
    });

    try {
      // Restore by updating status to 'Active' for each selected entity
      const restorePromises = Array.from(selectedEntities).map((entityId) => {
        // Find entity in archivedEntities since we are in archive view
        const entity = archivedEntities.find((e) => e.id === entityId);
        if (!entity) return Promise.resolve();

        // Use the generic helper function to build update data
        const updateData = buildUpdateData(entity, "Active");

        console.log(`📤 Bulk restore data for ${entity.name}:`, updateData);

        return api.put(`${config.apiEndpoint}/${entityId}`, updateData);
      });
      await Promise.all(restorePromises);

      setSelectedEntities(new Set());
      setShowBulkActions(false);

      toast({
        title: "Bulk Restore Successful",
        description: `Successfully restored ${selectedCount} ${config.entityNamePlural.toLowerCase()}`,
      });

      // Reload archived entities to refresh the list
      handleViewArchive();
    } catch (error: any) {
      console.error("❌ Bulk restore error:", error);
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Bulk restore operation failed";

      toast({
        title: "Bulk Restore Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });

      // Refresh to show current state
      handleViewArchive();
    }
  };

  const handleBulkExport = () => {
    if (selectedEntities.size === 0) {
      toast({
        title: `No ${config.entityNamePlural} Selected`,
        description: `Please select at least one ${config.entityName.toLowerCase()} to export`,
        variant: "destructive",
      });
      return;
    }

    // Fields to exclude from export
    const excludedFields = ['id', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy', '_id'];

    // Get selected entities
    const selectedEntitiesData = entities.filter((e) =>
      selectedEntities.has(e.id)
    );

    if (selectedEntitiesData.length === 0) {
      return;
    }

    // Use ALL entity fields (not just config.fields) to capture status and other important data
    const sampleEntity = selectedEntitiesData[0];
    const allFieldNames = Object.keys(sampleEntity).filter(
      (key) => !excludedFields.includes(key)
    );

    // Build headers and field names
    // Try to use labels from config.fields where available, otherwise auto-generate
    const fieldConfigMap = new Map(config.fields.map(f => [f.name, f.label]));

    const headers = allFieldNames.map((fieldName) => {
      // Use configured label if available
      if (fieldConfigMap.has(fieldName)) {
        return fieldConfigMap.get(fieldName)!;
      }
      // Auto-generate readable header from field name
      return fieldName
        .charAt(0).toUpperCase() +
        fieldName.slice(1).replace(/([A-Z])/g, ' $1').trim();
    });

    const fieldNames = allFieldNames;

    // Build CSV data
    const csvData = selectedEntitiesData.map((entity) =>
      fieldNames.map((fieldName) => {
        const value = getFieldValue(entity, fieldName);
        return escapeCSV(value);
      })
    );

    // Combine headers and data
    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `selected_${config.entityNamePlural.toLowerCase()}_${new Date().toISOString().split("T")[0]
      }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${selectedEntities.size
        } ${config.entityNamePlural.toLowerCase()} to CSV`,
    });
  };

  /**
   * Helper function to build update data for archive/restore operations.
   * This makes the archive/restore functionality completely generic.
   *
   * Configuration options in EntityConfig:
   * - archiveFields: string[] - Whitelist of fields to include (recommended)
   * - excludeFields: string[] - Blacklist of fields to exclude (fallback)
   *
   * Example usage in config:
   * archiveFields: ['categoryName', 'formId'] // Only send these fields + status
   * excludeFields: ['id', 'createdAt', 'customField'] // Exclude these fields
   */
  const buildUpdateData = (
    entity: BaseEntity,
    status: "Active" | "Inactive"
  ) => {
    const updateData: Record<string, any> = {};

    console.log(`🔧 buildUpdateData called for ${config.entityName}`);
    console.log(`🔧 Entity:`, entity);
    console.log(`🔧 archiveFields config:`, config.archiveFields);
    console.log(`🔧 Target status:`, status);

    // If archiveFields are specified in config, use only those fields
    if (config.archiveFields && config.archiveFields.length > 0) {
      config.archiveFields.forEach((field) => {
        // Skip 'status' field as we'll set it separately to avoid overwriting
        if (field === "status") return;

        if ((entity as any)[field] !== undefined) {
          updateData[field] = (entity as any)[field];
          console.log(`🔧 Added field "${field}":`, (entity as any)[field]);
        } else {
          console.warn(`⚠️ Field "${field}" is undefined in entity`);
        }
      });

      // Always set status last to ensure it's the target status
      updateData.status = status;
      console.log(`🔧 Set status to:`, status);
      console.log(`🔧 Final updateData:`, updateData);
      return updateData;
    }

    // Default behavior: auto-detect common field patterns
    const entityAny = entity as any;

    // Check for common entity-specific fields
    if (entityAny.categoryName) {
      updateData.categoryName = entityAny.categoryName;
      if (entityAny.formId) updateData.formId = entityAny.formId;
    } else if (entityAny.industryName) {
      updateData.industryName = entityAny.industryName;
    } else if (entityAny.stateName) {
      updateData.stateName = entityAny.stateName;
    } else if (entityAny.cityName) {
      updateData.cityName = entityAny.cityName;
      if (entityAny.stateId) updateData.stateId = entityAny.stateId;
    } else if (entityAny.serviceName) {
      updateData.serviceName = entityAny.serviceName;
    } else {
      // For other entities, use all fields except excluded ones
      const defaultExcludeFields = [
        "id",
        "createdAt",
        "updatedAt",
        "createdBy",
        "name",
        "form",
        "State",
        "category",
        "formName",
        "stateName",
        "slNo",
      ];

      const excludeFields = config.excludeFields || defaultExcludeFields;

      Object.keys(entity).forEach((key) => {
        if (!excludeFields.includes(key)) {
          updateData[key] = (entity as any)[key];
        }
      });
    }

    // Always set status last
    updateData.status = status;

    return updateData;
  };

  const handleViewArchive = async () => {
    setArchiveStatus("archived");

    // Load archived entities (status = 'Inactive')
    try {
      console.log(`📦 Loading archived ${config.entityNamePlural}...`);
      const response = await api.get(config.apiEndpoint, {
        params: { status: config.archiveStatusValue || 'Inactive' }
      });

      let entityData: any[] = [];

      // Extract data using the same logic as loadEntities
      if (config.transformResponse) {
        // Pass the full response object, not response.data
        const transformed = config.transformResponse(response);
        console.log(`🔄 After transformResponse:`, transformed);

        if (config.responseKey && (transformed as any)[config.responseKey]) {
          entityData = (transformed as any)[config.responseKey];
          console.log(
            `🔑 Using responseKey "${config.responseKey}" after transform:`,
            entityData
          );
        } else {
          entityData = transformed;
          console.log(
            `📋 No responseKey, using transformed data directly:`,
            entityData
          );
        }
      } else if (
        config.responseKey &&
        (response as any).data?.[config.responseKey]
      ) {
        entityData = (response as any).data[config.responseKey];
      } else if ((response as any).data?.[config.entityNamePlural]) {
        entityData = (response as any).data[config.entityNamePlural];
      } else if (Array.isArray((response as any).data)) {
        entityData = (response as any).data;
      } else if (
        (response as any).data?.data &&
        Array.isArray((response as any).data.data)
      ) {
        entityData = (response as any).data.data;
      }

      // Ensure entityData is an array before filtering
      if (!Array.isArray(entityData)) {
        console.warn("⚠️ entityData is not an array:", entityData);
        entityData = [];
      }

      // Filter archived entities based on configuration
      const archivedData = entityData.filter((entity) => {
        // If entity has explicit isArchived field
        if (entity.hasOwnProperty("isArchived")) {
          return entity.isArchived === true;
        }

        // If custom archive status is configured (e.g., 'Deactive' for Assets)
        if (
          config.archiveStatusValue &&
          entity.status === config.archiveStatusValue
        ) {
          return true;
        }

        // Show Inactive entities in archive view (default archived status)
        // This applies whether or not supportsArchive is enabled
        if (entity.status === "Inactive") {
          return true;
        }

        return false;
      });

      console.log(
        `📊 Archive filter applied. Found ${archivedData.length} archived entities.`
      );
      console.log(
        `📊 supportsArchive: ${effectiveConfig.supportsArchive}, archiveStatusValue: ${config.archiveStatusValue}`
      );

      console.log(
        `✅ Loaded ${archivedData.length} archived ${config.entityNamePlural}`
      );
      setArchivedEntities(archivedData);

      toast({
        title: "Archive View",
        description: `Found ${archivedData.length
          } archived ${config.entityNamePlural.toLowerCase()}`,
      });
    } catch (error: any) {
      console.error("❌ Error loading archived entities:", error);
      toast({
        title: "Error Loading Archive",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const handleRestoreFromArchive = async (entityId: string) => {
    const entityToRestore = archivedEntities.find((e) => e.id === entityId);
    if (!entityToRestore) return;

    try {
      console.log(`🔄 Restoring ${config.entityName}:`, entityToRestore);

      // Build update data for restoring
      let updateData: Record<string, any> = {};

      // Include all archiveFields specified in config
      if (config.archiveFields && config.archiveFields.length > 0) {
        config.archiveFields.forEach((field) => {
          if (
            field !== "status" &&
            field !== "isArchived" &&
            (entityToRestore as any)[field] !== undefined
          ) {
            updateData[field] = (entityToRestore as any)[field];
          }
        });
      }

      // Determine restore status
      if ((entityToRestore as any).hasOwnProperty("isArchived")) {
        // Entity has explicit isArchived field
        updateData.isArchived = false;
        updateData.status = "Active";
      } else if (config.archiveStatusValue) {
        // Entity was archived with custom status (e.g., 'Deactive')
        // Determine what the default active status should be for this entity type
        // For Assets with 'Deactive', restore to 'In-House' (common default)
        // For Products with 'Deactive', restore to 'Active'
        if (config.entityName === "Asset") {
          updateData.status = "In-House"; // Default active status for Assets
        } else {
          updateData.status = "Active"; // Default for most entities
        }
      } else {
        // Simply restore to Active status
        updateData.status = "Active";
      }

      // Apply transformData if available to clean up the data
      if (config.transformData) {
        updateData = config.transformData(updateData);
      }

      console.log(`📤 Restore data to send:`, updateData);

      // Make API call to update status
      await api.put(`${config.apiEndpoint}/${entityId}`, updateData);

      console.log(`✅ ${config.entityName} restored successfully`);

      // Reload archived entities to refresh the list
      handleViewArchive();

      toast({
        title: `${config.entityName} Restored`,
        description: `${entityToRestore.name} has been restored to active status`,
      });
    } catch (error: any) {
      console.error("❌ Error restoring entity:", error);
      toast({
        title: "Error Restoring",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const handleGetHelp = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Help feature will be added soon.",
    });
  };

  const handleDuplicate = async (entity: BaseEntity) => {
    try {
      // Create a copy of the entity without the id and system fields
      const {
        id,
        createdAt,
        updatedAt,
        createdBy,
        groupId, // Exclude groupId - system generated
        assetId, // Exclude assetId - system generated for assets
        managerId, // Exclude managerId - system generated for managers
        orgUserId, // Exclude orgUserId - system generated
        technicianUserId, // Exclude technicianUserId - system generated
        qrCodeUrl, // Exclude qrCodeUrl - regenerated on creation
        ...entityData
      } = entity as any;

      // Add "Copy" suffix to the name
      const duplicatedData = {
        ...entityData,
        name: `${entity.name} (Copy)`,
      };

      // Transform data if needed
      const dataToSend = config.transformData
        ? config.transformData(duplicatedData)
        : duplicatedData;

      // Create the duplicate via API
      await api.post(config.apiEndpoint, dataToSend);

      toast({
        title: "Success",
        description: `${config.entityName} duplicated successfully`,
      });

      // Reload entities to show the new copy
      loadEntities();
    } catch (error: any) {
      console.error("❌ Duplicate error:", error);
      const errorMessage =
        error.message || error.response?.data?.message || "Duplication failed";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleShareEntity = (entity: BaseEntity) => {
    // Use current path + query params to ensure it opens the correct modal/view
    const shareUrl = `${window.location.origin}${window.location.pathname}?mode=edit&id=${entity.id}`;

    if (navigator.share) {
      navigator.share({
        title: entity.name,
        text: `Check out ${entity.name}`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: `${entity.name} link copied to clipboard`,
      });
    }
  };

  const handleArchive = async (entity: BaseEntity) => {
    try {
      console.log(`📦 Archiving ${config.entityName}:`, entity);

      // Build update data for archiving
      let updateData: Record<string, any> = {};

      // Include all archiveFields specified in config
      if (config.archiveFields && config.archiveFields.length > 0) {
        config.archiveFields.forEach((field) => {
          const value = (entity as any)[field];
          // Only include fields that are not undefined AND not null
          // This prevents sending null values that might fail validation
          if (
            field !== "status" &&
            field !== "isArchived" &&
            value !== undefined &&
            value !== null
          ) {
            updateData[field] = value;
          }
        });
      }

      // Determine archive status
      if ((entity as any).hasOwnProperty("isArchived")) {
        // Entity has explicit isArchived field
        updateData.isArchived = true;
        updateData.status = entity.status; // Keep current status
      } else if (config.archiveStatusValue) {
        // Use custom archive status value (e.g., 'Deactive' for Assets)
        // Use custom field name if specified (e.g., 'completedStatus' for tickets)
        const statusField = config.archiveStatusField || 'status';
        updateData[statusField] = config.archiveStatusValue;
      } else {
        // Default: Most entities don't support true archiving
        // Instead, they just become Inactive (disabled)
        updateData.status = "Inactive";
        console.warn(
          `⚠️ ${config.entityName} doesn't have archive support. Setting status to Inactive instead.`
        );
      }

      // Apply transformData if available to clean up the data
      if (config.transformData) {
        updateData = config.transformData(updateData);
      }

      console.log(`📤 Archive data to send:`, updateData);

      await api.put(`${config.apiEndpoint}/${entity.id}`, updateData);

      const actionLabel = effectiveConfig.supportsArchive ? "Archived" : "Deactivated";
      toast({
        title: `${config.entityName} ${actionLabel}`,
        description: `${entity.name} has been ${actionLabel.toLowerCase()}`,
      });

      // Reload entities from server to show updated status
      loadEntities();
    } catch (error: any) {
      console.error("❌ Archive error:", error);
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Archive operation failed";

      toast({
        title: "Operation Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleViewHistory = (entity: BaseEntity) => {
    setSelectedEntityForComments(entity.id);
    setShowHistory(true);
    loadActivities(entity.id);
    loadCommentsFromBackend(entity.id);
    toast({
      title: "History View",
      description: `Viewing history for ${entity.name}`,
    });
  };

  const handleBookmark = (entity: BaseEntity) => {
    const newBookmarks = new Set(bookmarkedEntities);

    if (newBookmarks.has(entity.id)) {
      newBookmarks.delete(entity.id);
      toast({
        title: "Bookmark Removed",
        description: `${entity.name} removed from bookmarks`,
      });
    } else {
      newBookmarks.add(entity.id);
      toast({
        title: "Bookmarked",
        description: `${entity.name} added to bookmarks`,
      });
    }

    setBookmarkedEntities(newBookmarks);

    // Persist to localStorage
    localStorage.setItem(
      `bookmarks_${config.entityNamePlural}`,
      JSON.stringify(Array.from(newBookmarks))
    );
  };

  const handleFlag = (entity: BaseEntity) => {
    const newFlags = new Set(flaggedEntities);

    if (newFlags.has(entity.id)) {
      newFlags.delete(entity.id);
      toast({
        title: "Flag Removed",
        description: `${entity.name} flag removed`,
      });
    } else {
      newFlags.add(entity.id);
      toast({
        title: `${config.entityName} Flagged`,
        description: `${entity.name} flagged for review`,
      });
    }

    setFlaggedEntities(newFlags);

    // Persist to localStorage
    localStorage.setItem(
      `flags_${config.entityNamePlural}`,
      JSON.stringify(Array.from(newFlags))
    );
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Your changes have been saved as a draft",
    });
  };

  const handlePreviewChanges = () => {
    setCurrentView("preview");
  };

  const handlePreviewButton = () => {
    toast({
      title: "Feature Coming Soon",
      description: "This feature will be added.",
    });
  };

  const handleDocumentsButton = () => {
    toast({
      title: "Feature Coming Soon",
      description: "This feature will be added.",
    });
  };

  const handleResetForm = () => {
    if (editingEntity) {
      const formDataObj: Record<string, any> = {};

      // ALWAYS include the entity ID for updates
      formDataObj.id = editingEntity.id;

      config.fields.forEach((field) => {
        formDataObj[field.name] = (editingEntity as any)[field.name];
      });

      // Also include additional entity-specific fields (same as openEditView)
      const additionalFields = [
        'experience', 'specialization', 'technicianType', 'status',
        'plantId', 'managerId', 'categoryId', 'productCategoryId', 'productId',
        'assetId', 'building', 'location', 'condition', 'healthStatus', 'tag',
        'manufacturerName', 'model', 'serialNumber', 'slNo',
        'manufacturingDate', 'installDate', 'warrantyEndDate',
        'amcStartDate', 'amcEndDate', 'lastHPTestDate', 'nextHPTestDueDate', 'lifespanYears',
        'type', 'subType', 'capacity', 'capacityUnit', 'roleId', 'currentRole',
        'permissions', 'permissionLevels', 'isDefault'  // For roles
      ];
      additionalFields.forEach((field) => {
        if ((editingEntity as any)[field] !== undefined) {
          formDataObj[field] = (editingEntity as any)[field];
        }
      });

      setFormData(formDataObj);
    } else {
      setFormData({});
    }

    toast({
      title: "Form Reset",
      description: "Form has been reset to initial state",
    });
  };

  const handleUploadDocument = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.txt,.jpg,.png";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      toast({
        title: "Document Uploaded",
        description: `${file.name} uploaded successfully`,
      });
    };

    input.click();
  };

  const handleLinkRelated = () => {
    toast({
      title: "Link Related Items",
      description: "Link related items feature coming soon",
    });
  };

  const handleViewTemplates = () => {
    toast({
      title: "View Templates",
      description: "Viewing available templates",
    });
  };

  const handleToggleLock = () => {
    setIsLocked(!isLocked);
    toast({
      title: isLocked
        ? `${config.entityName} Unlocked`
        : `${config.entityName} Locked`,
      description: isLocked
        ? `This ${config.entityName.toLowerCase()} can now be edited by others`
        : `This ${config.entityName.toLowerCase()} is now locked for editing`,
    });
  };

  const handleEmailEntity = () => {
    const subject = `${config.entityName}: ${formData.name || `New ${config.entityName}`
      }`;
    const body = `I wanted to share this ${config.entityName.toLowerCase()} with you: ${formData.name || `New ${config.entityName}`
      }`;

    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  const handleCopyLink = () => {
    const url = editingEntity
      ? `${window.location.origin}/${config.entityNamePlural.toLowerCase()}/${editingEntity.id
      }`
      : `${window.location.origin
      }/${config.entityNamePlural.toLowerCase()}/new`;

    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: `${config.entityName} link copied to clipboard`,
    });
  };

  const handleViewAuditLog = () => {
    toast({
      title: "Audit Log",
      description: `Viewing audit log for this ${config.entityName.toLowerCase()}`,
    });
  };

  const handleSetReminder = () => {
    toast({
      title: "Reminder Set",
      description: `Reminder has been set for this ${config.entityName.toLowerCase()}`,
    });
  };

  const handleViewInfo = () => {
    toast({
      title: `${config.entityName} Information`,
      description: `Viewing additional information about this ${config.entityName.toLowerCase()}`,
    });
  };

  // Comment handlers
  const handleAddComment = async (entityId: string) => {
    if (!newComment.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!entityId) {
      toast({
        title: "Error",
        description: "No entity selected for comment",
        variant: "destructive",
      });
      return;
    }

    // Find the entity to get its name
    const entity =
      entities.find((e) => e.id === entityId) ||
      archivedEntities.find((e) => e.id === entityId);
    const entityName = entity?.name || entityId;
    const commentText = newComment.trim();

    console.log("📝 Posting comment:", {
      entityId,
      entityType: config.entityName,
      entityName,
      comment: commentText,
    });

    try {
      // Call backend API to post comment
      const response = await api.post<{
        success: boolean;
        message: string;
        comment: {
          id: string;
          text: string;
          user: string;
          timestamp: string;
          entityId: string;
          entityType: string;
        };
      }>("/activity/comment", {
        entityId: entityId,
        entityType: config.entityName,
        entityName: entityName,
        comment: commentText,
      });

      console.log("✅ Comment API response:", response);

      if (response && response.success && response.comment) {
        // Create comment object from backend response
        const commentObj = {
          id: response.comment.id,
          text: response.comment.text || commentText,
          user: response.comment.user || "Unknown User",
          timestamp: response.comment.timestamp || new Date().toISOString(),
          avatar: undefined,
        };

        console.log("📝 Created comment object:", commentObj);
        console.log("📝 Entity ID:", entityId);
        console.log("📝 Current comments state:", comments);

        // Update state - use functional update to ensure React sees the change
        setComments((prevComments) => {
          const prevEntityComments = prevComments[entityId] || [];
          const updatedComments = {
            ...prevComments,
            [entityId]: [commentObj, ...prevEntityComments],
          };

          console.log("📝 Updated comments:", updatedComments);
          console.log("📝 Comments for entity:", updatedComments[entityId]);
          console.log(
            "📝 Number of comments:",
            updatedComments[entityId]?.length || 0
          );

          // Persist to localStorage
          localStorage.setItem(
            `comments_${config.entityNamePlural}`,
            JSON.stringify(updatedComments)
          );

          return updatedComments;
        });

        // Clear input AFTER state update
        setNewComment("");

        // Reload comments from backend to ensure consistency
        await loadCommentsFromBackend(entityId);

        toast({
          title: "Comment Posted",
          description: "Your comment has been posted successfully",
        });
      } else {
        console.error("❌ Invalid response format:", response);
        throw new Error(
          response?.message || "Failed to post comment - invalid response"
        );
      }
    } catch (error: any) {
      console.error("❌ Error posting comment:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to post comment. Please try again.";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleDeleteComment = (entityId: string, commentId: string) => {
    const updatedComments = {
      ...comments,
      [entityId]: (comments[entityId] || []).filter((c) => c.id !== commentId),
    };

    setComments(updatedComments);

    // Persist to localStorage
    localStorage.setItem(
      `comments_${config.entityNamePlural}`,
      JSON.stringify(updatedComments)
    );

    toast({
      title: "Comment Deleted",
      description: "Comment has been removed",
    });
  };

  const getEntityComments = (entityId: string) => {
    return comments[entityId] || [];
  };

  // Load comments from backend and merge with local comments
  const loadCommentsFromBackend = async (entityId: string) => {
    try {
      const params: any = {
        limit: 100,
        offset: 0,
        entityId: entityId,
      };

      if (config.entityName) {
        params.entityType = config.entityName.toLowerCase();
      }

      const response = await api.get<{
        success: boolean;
        activities: any[];
        total: number;
      }>("/activity", { params });

      if (response.success && response.activities) {
        // Filter comments (activities with action='commented')
        const commentActivities = response.activities.filter(
          (act: any) => act.action === "commented"
        );

        // Transform to comment format
        const backendComments = commentActivities.map((act: any) => ({
          id: act.id,
          text: act.description || act.metadata?.comment || "",
          user: act.userName || "Unknown User",
          timestamp: act.createdAt,
          avatar: undefined,
        }));

        // Merge with local comments (backend comments take precedence)
        const localComments = comments[entityId] || [];
        const mergedComments = [
          ...backendComments,
          ...localComments.filter(
            (lc) => !backendComments.some((bc) => bc.id === lc.id)
          ),
        ];

        // Sort by timestamp (newest first)
        mergedComments.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Update comments state
        setComments((prevComments) => {
          const updatedComments = {
            ...prevComments,
            [entityId]: mergedComments,
          };

          // Persist to localStorage
          localStorage.setItem(
            `comments_${config.entityNamePlural}`,
            JSON.stringify(updatedComments)
          );

          return updatedComments;
        });
      }
    } catch (error: any) {
      console.error("❌ Error loading comments from backend:", error);
      // Don't show error toast for comments loading - it's not critical
    }
  };

  const applyFilter = () => {
    // Apply the current filter options
    setAppliedFilters(filterOptions);
    setShowFilter(false);

    toast({
      title: "Filter Applied",
      description: `Filters have been applied successfully`,
    });
  };

  const resetFilter = () => {
    const defaultFilters = {
      status: "all",
      dateRange: "all",
      sortBy: "name",
    };
    setFilterOptions(defaultFilters);
    setAppliedFilters(defaultFilters);
    setShowFilter(false);
  };

  const saveSettings = () => {
    // Sync viewMode with settings.defaultView
    setViewMode(settings.defaultView as ViewMode);

    // Persist to localStorage immediately
    localStorage.setItem(
      `settings_${config.entityNamePlural}`,
      JSON.stringify(settings)
    );

    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated",
    });
    setShowSettings(false);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Update settings state
    const newSettings = { ...settings, defaultView: mode };
    setSettings(newSettings);

    // Persist to localStorage immediately
    localStorage.setItem(
      `settings_${config.entityNamePlural}`,
      JSON.stringify(newSettings)
    );
  };

  const toggleHistory = () => {
    const newShowHistory = !showHistory;
    setShowHistory(newShowHistory);

    // If opening history panel and we're in edit view, set the selected entity
    if (newShowHistory && editingEntity && !selectedEntityForComments) {
      setSelectedEntityForComments(editingEntity.id);
      loadActivities(editingEntity.id);
      loadCommentsFromBackend(editingEntity.id);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "create":
        return <Plus className="h-4 w-4 text-green-500" />;
      case "update":
        return <Pencil className="h-4 w-4 text-blue-500" />;
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case "comment":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getUserInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const renderFormField = (field: EntityField) => {
    const value = formData[field.name] || "";

    console.log(`🔍 Rendering field: ${field.name}`, {
      type: field.type,
      value,
      hasReferenceData: !!field.referenceData,
      referenceDataLength: field.referenceData?.length,
      referenceData: field.referenceData,
    });

    switch (field.type) {
      case "select":
        const options = field.referenceData || field.options || [];
        console.log(`📋 Select options for ${field.name}:`, options);

        return (
          <Select
            value={value}
            onValueChange={(v) => setFormData({ ...formData, [field.name]: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: any) => {
                // Handle both object and string options
                const optionValue = option.id || option.value || option;
                const optionLabel =
                  option.stateName ||
                  option.serviceName ||
                  option.name ||
                  option.label ||
                  option;

                console.log(`🎯 Option:`, { optionValue, optionLabel, option });

                return (
                  <SelectItem key={optionValue} value={optionValue}>
                    {optionLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );

      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [field.name]: e.target.value })
            }
            placeholder={`Enter ${field.label}`}
            className="w-full min-h-[80px] p-2 border border-gray-300 rounded-md"
            required={field.required}
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [field.name]: e.target.value })
            }
            placeholder={`Enter ${field.label}`}
            className="h-10"
            required={field.required}
          />
        );
    }
  };

  if (loading && currentView === "list") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
        <span className="ml-2 text-sm text-gray-600">
          Loading {config.entityNamePlural}...
        </span>
      </div>
    );
  }

  // List View
  if (currentView === "list") {
    return (
      <div
        className={`grid ${showHistory ? "grid-cols-12" : "grid-cols-1"
          } gap-4 min-h-screen`}
      >
        {/* Main Content */}
        <div className={`${showHistory ? "col-span-8" : "col-span-1"} px-4 py-3`}>
          <div className="mb-4">
            {/* Page Header with Stats */}
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Page Title */}
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        {archiveStatus === "active"
                          ? config.entityNamePlural
                          : `Archived ${config.entityNamePlural}`}
                      </h1>
                      <p className="text-sm text-gray-600 mt-1">
                        {archiveStatus === "active"
                          ? `Manage and organize your ${config.entityNamePlural.toLowerCase()} efficiently`
                          : `Review and restore archived ${config.entityNamePlural.toLowerCase()}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar - All buttons pushed to right */}
            <div className="bg-white rounded-lg border border-gray-200 py-1.5 px-3">
              <div className="flex items-center justify-between gap-2">
                {/* Stats Section */}
                <div className="flex items-center gap-6">
                  {/* Total Count */}
                  <div className="text-right">
                    <div className="text-gray-900 font-medium text-lg">
                      {archiveStatus === "active"
                        ? (config.pagination ? totalItems : entities.length)
                        : archivedEntities.length}
                    </div>
                    <div className="text-gray-500 text-xs">Total</div>
                  </div>

                  {/* Active/Inactive Counts (only show when viewing active entities) */}
                  {archiveStatus === "active" && (
                    <>
                      <div className="w-px h-8 bg-gray-300"></div>
                      <div className="text-right">
                        <div className="text-green-600 font-medium text-lg">
                          {entities.filter((e) => e.status === "Active").length}
                        </div>
                        <div className="text-gray-500 text-xs">Active</div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-600 font-medium text-lg">
                          {
                            entities.filter((e) => e.status === "Inactive")
                              .length
                          }
                        </div>
                        <div className="text-gray-500 text-xs">Inactive</div>
                      </div>
                    </>
                  )}
                </div>

                {/* All Action Buttons in one line */}
                <div className="flex items-center gap-2">
                  {/* Custom Header Actions */}
                  {config.headerActions && config.headerActions()}

                  {/* Primary Action Button - Check permissions */}
                  {archiveStatus === "active" && !config.hideCreateButton && canCreate && (
                    <Button
                      onClick={openCreateView}
                      className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add {config.entityName}
                    </Button>
                  )}

                  {/* Filter Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilter(!showFilter)}
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    {filterOptions.status !== "all" && (
                      <span className="ml-2 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full text-xs">
                        Active
                      </span>
                    )}
                  </Button>

                  {/* View Toggle */}
                  <div className="flex border border-gray-300 rounded-md bg-white">
                    <Button
                      variant={viewMode === "table" ? "default" : "ghost"}
                      size="sm"
                      className={`rounded-r-none border-0 ${viewMode === "table"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "text-gray-600 hover:text-gray-700"
                        }`}
                      onClick={() => handleViewModeChange("table")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      className={`rounded-l-none border-0 ${viewMode === "grid"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "text-gray-600 hover:text-gray-700"
                        }`}
                      onClick={() => handleViewModeChange("grid")}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Archive Toggle - Always show for all modules */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={
                      archiveStatus === "active"
                        ? handleViewArchive
                        : () => {
                          setArchiveStatus("active");
                          loadEntities(); // Reload active entities
                        }
                    }
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {archiveStatus === "active"
                      ? "View Archive"
                      : "Back to Active"}
                  </Button>

                  {/* More Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* For Manager module, only show specific menu items */}
                      {isManagerModule ? (
                        <>
                          <DropdownMenuItem onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2 text-gray-600" />
                            <span>Export Data</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleBulkActions}>
                            <List className="h-4 w-4 mr-2 text-gray-600" />
                            <span>Bulk Actions</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowHistory(true)}>
                            <Clock className="h-4 w-4 mr-2 text-gray-600" />
                            <span>History & Comments</span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('export')) && (
                            <DropdownMenuItem onClick={handleExport}>
                              <Download className="h-4 w-4 mr-2 text-gray-600" />
                              <span>Export Data</span>
                            </DropdownMenuItem>
                          )}
                          {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('import')) && (
                            <DropdownMenuItem onClick={handleImport}>
                              <Upload className="h-4 w-4 mr-2 text-gray-600" />
                              <span>Import Data</span>
                            </DropdownMenuItem>
                          )}
                          {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('print')) && (
                            <DropdownMenuItem onClick={handlePrint}>
                              <Printer className="h-4 w-4 mr-2 text-gray-600" />
                              <span>Print List</span>
                            </DropdownMenuItem>
                          )}
                          {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('share')) && (
                            <DropdownMenuItem onClick={handleShareList}>
                              <Share2 className="h-4 w-4 mr-2 text-gray-600" />
                              <span>Share List</span>
                            </DropdownMenuItem>
                          )}
                          {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('refresh')) && (
                            <DropdownMenuItem onClick={handleRefresh}>
                              <RefreshCw className="h-4 w-4 mr-2 text-gray-600" />
                              <span>Refresh Data</span>
                            </DropdownMenuItem>
                          )}
                          {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('bulkActions')) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={handleBulkActions}>
                                <List className="h-4 w-4 mr-2 text-gray-600" />
                                <span>Bulk Actions</span>
                              </DropdownMenuItem>
                            </>
                          )}
                          {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('history')) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setShowHistory(true)}>
                                <Clock className="h-4 w-4 mr-2 text-gray-600" />
                                <span>History & Comments</span>
                              </DropdownMenuItem>
                            </>
                          )}
                          {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('settings')) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                                <Settings className="h-4 w-4 mr-2 text-gray-600" />
                                <span>Settings</span>
                              </DropdownMenuItem>
                            </>
                          )}
                          {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('help')) && (
                            <DropdownMenuItem onClick={handleGetHelp}>
                              <HelpCircle className="h-4 w-4 mr-2 text-gray-600" />
                              <span>Get Help</span>
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Enhanced Filter Section */}
              {showFilter && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="status"
                        className="text-sm font-medium text-gray-700"
                      >
                        Status
                      </Label>
                      <Select
                        value={filterOptions.status}
                        onValueChange={(value) =>
                          setFilterOptions({ ...filterOptions, status: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="sortBy"
                        className="text-sm font-medium text-gray-700"
                      >
                        Sort By
                      </Label>
                      <Select
                        value={filterOptions.sortBy}
                        onValueChange={(value) =>
                          setFilterOptions({ ...filterOptions, sortBy: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name (A-Z)</SelectItem>
                          <SelectItem value="date">Date Created</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="dateRange"
                        className="text-sm font-medium text-gray-700"
                      >
                        Date Range
                      </Label>
                      <Select
                        value={filterOptions.dateRange}
                        onValueChange={(value) =>
                          setFilterOptions({
                            ...filterOptions,
                            dateRange: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end gap-2">
                      <Button
                        variant="outline"
                        onClick={resetFilter}
                        className="flex-1 border-gray-300 hover:bg-gray-50"
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={applyFilter}
                        className="flex-1 bg-orange-500 hover:bg-orange-600"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Actions Panel */}
          {showBulkActions && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-orange-800">
                      Bulk Actions
                    </h3>
                    <p className="text-orange-700 text-sm mt-1">
                      {selectedEntities.size} {config.entityName}(s) selected
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {entities.every((e) => selectedEntities.has(e.id))
                        ? "Deselect Page"
                        : "Select Page"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllAssets}
                    >
                      Select All
                    </Button>
                    {selectedEntities.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                        className="text-orange-600"
                      >
                        Clear ({selectedEntities.size})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkExport}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                    {effectiveConfig.supportsArchive && archiveStatus === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkArchive}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                    ) : effectiveConfig.supportsArchive && archiveStatus === "archived" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkRestore}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    ) : null}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    {/* Custom Bulk Actions */}
                    {config.customBulkActions?.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.variant || "outline"}
                        size="sm"
                        onClick={() => {
                          const selectedIds = Array.from(selectedEntities);
                          const selectedEntitiesData = entities.filter((e) =>
                            selectedEntities.has(e.id)
                          );
                          action.onClick(selectedIds, selectedEntitiesData, setSelectedEntities);
                        }}
                        disabled={action.label.includes('Select') ? false : selectedEntities.size === 0}
                      >
                        {action.icon}
                        {action.label}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBulkActions(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings Section */}
          {showSettings && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription>
                  Configure your {config.entityName.toLowerCase()} management
                  preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="itemsPerPage">Items Per Page</Label>
                    <Select
                      value={settings.itemsPerPage}
                      onValueChange={(value) =>
                        setSettings({ ...settings, itemsPerPage: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select items per page" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultView">Default View</Label>
                    <Select
                      value={settings.defaultView}
                      onValueChange={(value) =>
                        setSettings({ ...settings, defaultView: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select default view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table">Table</SelectItem>
                        <SelectItem value="grid">Grid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveSettings}>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delete Confirmation */}
          {entityToDelete && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-800">
                      Delete {config.entityName}
                    </h3>
                    <p className="text-yellow-700 text-sm mt-1">
                      This action cannot be undone. This will permanently delete
                      the {config.entityName.toLowerCase()}{" "}
                      <strong>{entityToDelete.name}</strong>.
                    </p>
                    <p className="text-yellow-600 text-sm mt-2">
                      ⚠️ Note: If this {config.entityName.toLowerCase()} is
                      being used by other records, the deletion will fail.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={cancelDelete}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDelete}>
                        Delete Anyway
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table or Grid View */}
          {viewMode === "table" ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showBulkActions && (
                      <TableHead className="w-[50px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAll}
                        >
                          {selectedEntities.size === entities.length ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </TableHead>
                    )}
                    {config.entityName === "User" ? (
                      <>
                        <TableHead>User</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[130px]">Actions</TableHead>
                      </>
                    ) : config.entityName === "Role" ? (
                      <>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead className="w-[130px]">Actions</TableHead>
                      </>

                    ) : config.entityName === "Product" ? (
                      <>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Test Frequency</TableHead>
                        <TableHead>Variants</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="w-[130px]">Actions</TableHead>
                      </>
                    ) : config.entityName === "Category" ? (
                      <>
                        <TableHead>Category Name</TableHead>
                        <TableHead>Form Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="w-[130px]">Actions</TableHead>
                      </>
                    ) : config.entityName === "City" ? (
                      <>
                        <TableHead>City Name</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="w-[130px]">Actions</TableHead>
                      </>
                    ) : config.entityName === "Manager" ? (
                      <>
                        <TableHead>Manager ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Assigned Plants</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="w-[130px]">Actions</TableHead>
                      </>
                    ) : config.entityName === "Asset" ? (
                      // Use custom headers if provided, otherwise default
                      config.customHeaders ? (
                        <>
                          {config.customHeaders.map((header, index) => (
                            <TableHead key={index}>{header}</TableHead>
                          ))}
                          {/* Only add Status and Created At if NOT excluded */}
                          {!config.excludeFields?.includes('status') && <TableHead>Status</TableHead>}
                          {!config.excludeFields?.includes('createdAt') && <TableHead>Created At</TableHead>}
                          <TableHead className="w-[130px]">Actions</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Asset ID</TableHead>
                          <TableHead>Plant</TableHead>
                          <TableHead>Building</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Maintenance Status</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead className="w-[130px]">Actions</TableHead>
                        </>
                      )
                    ) : config.customHeaders ? (
                      <>
                        {config.customHeaders.map((header, index) => (
                          <TableHead key={index}>{header}</TableHead>
                        ))}
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="w-[130px]">Actions</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="w-[130px]">Actions</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedEntities.length > 0 ? (
                    paginatedEntities.map((entity, index) => (
                      <TableRow
                        key={entity.id}
                        className="cursor-pointer hover:bg-gray-50 group relative"
                        onClick={() => handleDoubleClick(entity)}
                        title="Click to edit"
                      >
                        {showBulkActions && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEntity(entity.id);
                              }}
                            >
                              {selectedEntities.has(entity.id) ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        )}

                        {/* Use customColumns if provided, otherwise use default columns */}
                        {config.customColumns ? (
                          <>
                            {config.customColumns(entity)}
                            {/* Only add Status and Created At if customHeaders are defined AND not excluded */}
                            {config.customHeaders && (
                              <>
                                {!config.excludeFields?.includes('status') && (
                                  <TableCell>
                                    <span
                                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${entity.status === "Active"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                        }`}
                                    >
                                      {entity.status}
                                    </span>
                                  </TableCell>
                                )}
                                {!config.excludeFields?.includes('createdAt') && (
                                  <TableCell>
                                    {(entity as any).createdAt
                                      ? new Date(
                                        (entity as any).createdAt
                                      ).toLocaleDateString()
                                      : "N/A"}
                                  </TableCell>
                                )}
                              </>
                            )}
                          </>
                        ) : config.entityName === "Product" ? (
                          <>
                            {/* Product Name - Use name or productName */}
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {bookmarkedEntities.has(entity.id) && (
                                  <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                                )}
                                {flaggedEntities.has(entity.id) && (
                                  <Flag className="h-4 w-4 text-red-500" />
                                )}
                                {entity.name ||
                                  (entity as any).productName ||
                                  "Unnamed"}
                              </div>
                            </TableCell>

                            {/* Category - Use categoryName directly */}
                            <TableCell>
                              {(entity as any).categoryName ||
                                (entity as any).category?.categoryName ||
                                "N/A"}
                            </TableCell>

                            {/* Test Frequency */}
                            <TableCell>
                              {(entity as any).testFrequency || "N/A"}
                            </TableCell>

                            {/* Variants - Use variants or productVariants */}
                            <TableCell>
                              <div className="flex gap-1">
                                {(
                                  (entity as any).variants ||
                                  (entity as any).productVariants ||
                                  []
                                )
                                  .slice(0, 2)
                                  .map((variant: any, index: number) => (
                                    <span
                                      key={index}
                                      className="text-xs bg-secondary px-2 py-1 rounded"
                                    >
                                      {variant.type ||
                                        variant.variantType ||
                                        variant.name ||
                                        "Variant"}
                                    </span>
                                  ))}
                                {(
                                  (entity as any).variants ||
                                  (entity as any).productVariants ||
                                  []
                                ).length > 2 && (
                                    <span className="text-xs text-muted-foreground">
                                      +
                                      {(
                                        (entity as any).variants ||
                                        (entity as any).productVariants ||
                                        []
                                      ).length - 2}{" "}
                                      more
                                    </span>
                                  )}
                                {(!(entity as any).variants &&
                                  !(entity as any).productVariants) ||
                                  ((entity as any).variants?.length === 0 &&
                                    (entity as any).productVariants?.length ===
                                    0 && (
                                      <span className="text-xs text-muted-foreground">
                                        No variants
                                      </span>
                                    ))}
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${entity.status === "Active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {entity.status}
                              </span>
                            </TableCell>

                            {/* Created At - Handle undefined createdAt */}
                            <TableCell>
                              {(entity as any).createdAt
                                ? new Date(
                                  (entity as any).createdAt
                                ).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                          </>
                        ) : config.entityName === "Category" ? (
                          <>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {bookmarkedEntities.has(entity.id) && (
                                  <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                                )}
                                {flaggedEntities.has(entity.id) && (
                                  <Flag className="h-4 w-4 text-red-500" />
                                )}
                                {entity.name ||
                                  (entity as any).categoryName ||
                                  "Unnamed"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(entity as any).formName || "N/A"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${entity.status === "Active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {entity.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(entity.createdAt).toLocaleDateString()}
                            </TableCell>
                          </>
                        ) : config.entityName === "City" ? (
                          <>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {bookmarkedEntities.has(entity.id) && (
                                  <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                                )}
                                {flaggedEntities.has(entity.id) && (
                                  <Flag className="h-4 w-4 text-red-500" />
                                )}
                                {entity.name ||
                                  (entity as any).cityName ||
                                  "Unnamed"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(entity as any).stateName || "N/A"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${entity.status === "Active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {entity.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(entity.createdAt).toLocaleDateString()}
                            </TableCell>
                          </>
                        ) : config.entityName === "Manager" ? (
                          <>
                            <TableCell className="font-medium">
                              {(entity as any).managerId || "N/A"}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {bookmarkedEntities.has(entity.id) && (
                                  <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                                )}
                                {flaggedEntities.has(entity.id) && (
                                  <Flag className="h-4 w-4 text-red-500" />
                                )}
                                {entity.name || "Unknown"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(entity as any).user?.email || "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {(entity as any).plants
                                  ?.slice(0, 3)
                                  .map((plant: any, index: number) => (
                                    <span
                                      key={index}
                                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                                    >
                                      {plant.plantName}
                                    </span>
                                  ))}
                                {(entity as any).plants?.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{(entity as any).plants.length - 3} more
                                  </span>
                                )}
                                {(!(entity as any).plants ||
                                  (entity as any).plants.length === 0) && (
                                    <span className="text-xs text-muted-foreground">
                                      No plants
                                    </span>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${entity.status === "Active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {entity.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(entity.createdAt).toLocaleDateString()}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {bookmarkedEntities.has(entity.id) && (
                                  <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                                )}
                                {flaggedEntities.has(entity.id) && (
                                  <Flag className="h-4 w-4 text-red-500" />
                                )}
                                {entity.name ||
                                  (entity as any).cityName ||
                                  (entity as any).stateName ||
                                  (entity as any).industryName ||
                                  "Unnamed"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${entity.status === "Active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {entity.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(entity.createdAt).toLocaleDateString()}
                            </TableCell>
                          </>
                        )}

                        {/* Actions column */}
                        <TableCell>
                          <div className="flex space-x-2">
                            {archiveStatus === "active" ? (
                              <>
                                {/* Archive button for each row */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchive(entity);
                                  }}
                                  title="Archive"
                                  className="text-orange-600 hover:text-orange-800 hover:bg-orange-100"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteConfirm(entity);
                                    }}
                                    title={`Delete ${config.entityName}`}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-100"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreFromArchive(entity.id);
                                }}
                                title="Restore"
                                className="text-green-600 hover:text-green-800 hover:bg-green-100"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            {config.customActions &&
                              config.customActions(entity)}
                            {!config.hideListingRowKebab && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  {archiveStatus === "active" ? (
                                    <>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDuplicate(entity);
                                        }}
                                      >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Duplicate
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleShareEntity(entity);
                                        }}
                                      >
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Share
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleArchive(entity);
                                        }}
                                      >
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewHistory(entity);
                                        }}
                                      >
                                        <Clock className="h-4 w-4 mr-2" />
                                        View History
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleBookmark(entity);
                                        }}
                                      >
                                        <Bookmark
                                          className={`h-4 w-4 mr-2 ${bookmarkedEntities.has(entity.id)
                                            ? "fill-orange-500 text-orange-500"
                                            : ""
                                            }`}
                                        />
                                        {bookmarkedEntities.has(entity.id)
                                          ? "Remove Bookmark"
                                          : "Bookmark"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleFlag(entity);
                                        }}
                                      >
                                        <Flag
                                          className={`h-4 w-4 mr-2 ${flaggedEntities.has(entity.id)
                                            ? "text-red-500"
                                            : ""
                                            }`}
                                        />
                                        {flaggedEntities.has(entity.id)
                                          ? "Remove Flag"
                                          : "Flag"}
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRestoreFromArchive(entity.id);
                                      }}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Restore
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={
                          config.customHeaders
                            ? config.customHeaders.length + 3 + (showBulkActions ? 1 : 0)
                            : config.entityName === "Technician"
                              ? showBulkActions
                                ? 6
                                : 5
                              : config.entityName === "Product"
                                ? showBulkActions
                                  ? 8
                                  : 7
                                : config.entityName === "Category"
                                  ? showBulkActions
                                    ? 7
                                    : 6
                                  : config.entityName === "City"
                                    ? showBulkActions
                                      ? 6
                                      : 5
                                    : config.entityName === "Manager"
                                      ? showBulkActions
                                        ? 8
                                        : 7
                                      : showBulkActions
                                        ? 5
                                        : 4
                        }
                        className="text-center py-8 text-muted-foreground"
                      >
                        {archiveStatus === "active"
                          ? `No ${config.entityNamePlural.toLowerCase()} found. Create your first ${config.entityName.toLowerCase()} above.`
                          : `No archived ${config.entityNamePlural.toLowerCase()} found.`}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {paginatedEntities.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
                  {/* Left side - Results info and rows per page */}
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-600">
                      Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                      <span className="font-semibold">
                        {Math.min(startIndex + paginatedEntities.length, config.pagination ? totalItems : filteredEntities.length)}
                      </span>{" "}
                      of <span className="font-semibold">{config.pagination ? totalItems : filteredEntities.length}</span> results
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Rows per page</span>
                      <select
                        value={settings.itemsPerPage}
                        onChange={(e) => {
                          setSettings({ ...settings, itemsPerPage: e.target.value });
                          setCurrentPage(1);
                        }}
                        className="h-7 px-2 pr-6 text-sm border-2 border-orange-400 rounded bg-white font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                  </div>

                  {/* Right side - Page navigation */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      ‹
                    </button>

                    {totalPages > 0 && (
                      <div className="flex items-center gap-1">
                        {(() => {
                          const maxVisible = 5;
                          const pages = [];
                          let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                          let end = Math.min(totalPages, start + maxVisible - 1);
                          if (end - start < maxVisible - 1) {
                            start = Math.max(1, end - maxVisible + 1);
                          }
                          for (let i = start; i <= end; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`w-7 h-7 text-sm rounded font-medium ${currentPage === i
                                  ? "bg-orange-500 text-white"
                                  : "text-gray-600 hover:bg-gray-100"
                                  }`}
                              >
                                {i}
                              </button>
                            );
                          }
                          if (end < totalPages) {
                            pages.push(<span key="dots" className="px-1 text-gray-400">...</span>);
                          }
                          return pages;
                        })()}
                      </div>
                    )}

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage >= totalPages}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedEntities.length > 0 ? (
                paginatedEntities.map((entity) => (
                  <Card
                    key={entity.id}
                    className="hover:shadow-md transition-shadow cursor-pointer group relative"
                    onClick={() => handleDoubleClick(entity)}
                    title="Click to edit"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {showBulkActions && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 -ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEntity(entity.id);
                              }}
                            >
                              {selectedEntities.has(entity.id) ? (
                                <CheckSquare className="h-4 w-4 text-orange-500" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          )}
                          <CardTitle className="text-lg font-semibold">
                            {(entity as any).plantName || entity[`${config.entityName.toLowerCase()}Id`] || entity.name || `#${entity.name}`}
                          </CardTitle>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${entity.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                            }`}
                        >
                          {entity.status}
                        </span>
                      </div>
                      <CardDescription>
                        Created on{" "}
                        {new Date(entity.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-end space-x-2">
                        {archiveStatus === "active" ? (
                          <>
                            {/* Archive button for grid view cards */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(entity);
                              }}
                              title="Archive"
                              className="text-orange-600 hover:text-orange-800 hover:bg-orange-100"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteConfirm(entity);
                                }}
                                title="Delete"
                                className="text-red-600 hover:text-red-800 hover:bg-red-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreFromArchive(entity.id);
                              }}
                              title="Restore"
                              className="text-green-600 hover:text-green-800 hover:bg-green-100"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {config.customActions && config.customActions(entity)}
                        {!config.hideListingRowKebab && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {archiveStatus === "active" ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicate(entity);
                                    }}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareEntity(entity);
                                    }}
                                  >
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share
                                  </DropdownMenuItem>
                                  {/* Archive option removed for grid view - accessible via View Archive button */}
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewHistory(entity);
                                    }}
                                  >
                                    <Clock className="h-4 w-4 mr-2" />
                                    View History
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBookmark(entity);
                                    }}
                                  >
                                    <Bookmark
                                      className={`h-4 w-4 mr-2 ${bookmarkedEntities.has(entity.id)
                                        ? "fill-orange-500 text-orange-500"
                                        : ""
                                        }`}
                                    />
                                    {bookmarkedEntities.has(entity.id)
                                      ? "Remove Bookmark"
                                      : "Bookmark"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFlag(entity);
                                    }}
                                  >
                                    <Flag
                                      className={`h-4 w-4 mr-2 ${flaggedEntities.has(entity.id)
                                        ? "text-red-500"
                                        : ""
                                        }`}
                                    />
                                    {flaggedEntities.has(entity.id)
                                      ? "Remove Flag"
                                      : "Flag"}
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreFromArchive(entity.id);
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {archiveStatus === "active"
                    ? `No ${config.entityNamePlural.toLowerCase()} found. Create your first ${config.entityName.toLowerCase()} above.`
                    : `No archived ${config.entityNamePlural.toLowerCase()} found.`}
                </div>
              )}

              {/* Pagination Controls for Grid View */}
              {totalPages > 1 && paginatedEntities.length > 0 && (
                <div className="col-span-full flex items-center justify-between px-4 py-3 mt-4 border-t">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(startIndex + paginatedEntities.length, filteredEntities.length)} of{" "}
                    {filteredEntities.length} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {(() => {
                        const maxButtons = 5;
                        const buttons = [];
                        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

                        if (endPage - startPage < maxButtons - 1) {
                          startPage = Math.max(1, endPage - maxButtons + 1);
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          buttons.push(
                            <Button
                              key={i}
                              variant={currentPage === i ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(i)}
                              className={
                                currentPage === i
                                  ? "bg-orange-500 hover:bg-orange-600"
                                  : ""
                              }
                            >
                              {i}
                            </Button>
                          );
                        }

                        return (
                          <>
                            {startPage > 1 && <span className="px-2">...</span>}
                            {buttons}
                            {endPage < totalPages && <span className="px-2">...</span>}
                          </>
                        );
                      })()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* History & Comments Panel */}
        {showHistory && (
          <div className="col-span-4 border-l bg-gray-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">History & Comments</h2>
              <Button variant="ghost" size="sm" onClick={toggleHistory}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Tabs defaultValue="history" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="history" className="flex-1">
                  History
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex-1">
                  Comments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4">
                {loadingActivities ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <span className="ml-2">Loading activities...</span>
                  </div>
                ) : activities.length > 0 ? (
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex gap-3 p-3 rounded-lg border bg-white"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getUserInitials(activity.user)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {activity.user}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTimestamp(activity.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900">
                              {activity.action}{" "}
                              <span className="font-medium">
                                {activity.entityName}
                              </span>
                            </p>
                            {activity.details && (
                              <p className="text-sm text-gray-600 mt-1">
                                {activity.details}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No activity history yet.</p>
                    <p className="text-sm">
                      Activities will appear here as you work with{" "}
                      {config.entityNamePlural.toLowerCase()}.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-4">
                {!selectedEntityForComments ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-sm font-medium text-gray-900 mb-1">No entity selected</p>
                    <p className="text-xs text-gray-500">
                      Please select an entity from the table to view or add comments.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4">
                      <Input
                        placeholder="Add a comment..."
                        className="flex-1"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            selectedEntityForComments
                          ) {
                            e.preventDefault();
                            handleAddComment(selectedEntityForComments);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() =>
                          selectedEntityForComments &&
                          handleAddComment(selectedEntityForComments)
                        }
                        disabled={!newComment.trim() || !selectedEntityForComments}
                      >
                        Post
                      </Button>
                    </div>

                    {selectedEntityForComments &&
                      getEntityComments(selectedEntityForComments).length > 0 ? (
                      <ScrollArea className="h-[calc(100vh-300px)]">
                        <div className="space-y-3">
                          {getEntityComments(selectedEntityForComments).map(
                            (comment) => (
                              <div
                                key={comment.id}
                                className="flex gap-3 p-3 rounded-lg border bg-white"
                              >
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarFallback className="text-xs">
                                    {comment.user
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {comment.user}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatTimestamp(comment.timestamp)}
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() =>
                                        handleDeleteComment(
                                          selectedEntityForComments,
                                          comment.id
                                        )
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {comment.text}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No comments yet.</p>
                        <p className="text-sm">
                          Be the first to comment on this{" "}
                          {config.entityName.toLowerCase()}.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    );
  }

  // Create/Edit View
  return (
    <div
      className={`grid ${showHistory ? "grid-cols-12" : "grid-cols-1"
        } gap-6 min-h-screen bg-gray-50`}
    >
      {/* Main Content */}
      <div
        className={`${showHistory ? "col-span-8" : "col-span-1"
          } p-8 pt-4 overflow-y-auto`}
      >
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-xs">
            <button
              onClick={backToList}
              className="text-gray-500 hover:text-gray-700"
            >
              {config.entityNamePlural}
            </button>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900 font-medium">
              {currentView === "edit"
                ? editingEntity?.name
                : `New ${config.entityName}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!config.hideCreateEditButtons?.includes('preview') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-6 px-2"
                onClick={handlePreviewButton}
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
            )}

            {!config.hideCreateEditButtons?.includes('documents') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-6 px-2"
                onClick={handleDocumentsButton}
              >
                <FileText className="h-3 w-3 mr-1" />
                Documents
              </Button>
            )}

            {!config.hideCreateEditButtons?.includes('history') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-6 px-2"
                onClick={toggleHistory}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                History & Comments
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={backToList}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>

            <Button
              size="sm"
              className="text-xs h-6 px-2"
              onClick={handleSubmit}
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>

            {!config.hideCreateEditButtons?.includes('kebab') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleSaveDraft}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePreviewChanges}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Changes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleResetForm}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Form
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleUploadDocument}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLinkRelated}>
                    <Link className="h-4 w-4 mr-2" />
                    Link Related
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleViewTemplates}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Templates
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleToggleLock}>
                    <Lock className="h-4 w-4 mr-2" />
                    {isLocked
                      ? `Unlock ${config.entityName}`
                      : `Lock ${config.entityName}`}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEmailEntity}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email {config.entityName}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Link className="h-4 w-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleViewAuditLog}>
                    <Clock className="h-4 w-4 mr-2" />
                    View Audit Log
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSetReminder}>
                    <Bell className="h-4 w-4 mr-2" />
                    Set Reminder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleGetHelp}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Get Help
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleViewInfo}>
                    <Info className="h-4 w-4 mr-2" />
                    View Info
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-6"></div>

        {/* Wizard Step Navigation */}
        {config.wizardSteps && config.wizardSteps.length > 0 && (
          <div className="flex items-center border-b border-gray-200 mb-6">
            {config.wizardSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`text-sm font-medium pb-2 mr-8 ${currentStep === step.id
                  ? "text-orange-600 border-b-2 border-orange-500"
                  : "text-gray-500"
                  }`}
                onClick={() => setCurrentStep(step.id)}
              >
                {step.name}
              </button>
            ))}
          </div>
        )}

        {/* Form Content */}
        {config.wizardSteps && config.wizardSteps.length > 0 ? (
          <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              // Prevent Enter key from submitting form when not on last step
              if (
                e.key === "Enter" &&
                currentStep !== wizardSteps[wizardSteps.length - 1]?.id
              ) {
                console.log(
                  "⚠️ Enter key pressed while not on last step. Preventing default."
                );
                e.preventDefault();
              }
            }}
            className="space-y-8 max-w-4xl"
          >
            {/* Wizard Step Content */}
            {config.renderWizardStep &&
              config.renderWizardStep(
                currentStep,
                formData,
                setFormData,
                currentStep,
                setCurrentStep
              )}

            {/* Additional Fields */}
            {config.additionalFields}

            {/* Only show status when editing - BUT NOT if custom wizard step already handles it */}
            {currentView === "edit" && !config.renderWizardStep && (
              <div className="space-y-3">
                <Label
                  htmlFor="status"
                  className="text-sm font-medium text-gray-700"
                >
                  Status
                </Label>
                <Select
                  value={formData.status || "Active"}
                  onValueChange={(value: "Active" | "Inactive") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Wizard Navigation Buttons */}
            <div className="flex justify-between gap-4 pt-8 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === wizardSteps[0]?.id}
                className="min-w-[120px]"
              >
                Previous
              </Button>
              <div className="flex gap-4">
                {(() => {
                  const isLastStep =
                    currentStep === wizardSteps[wizardSteps.length - 1]?.id;
                  console.log("🎯 Button render check:");
                  console.log("   Current step:", currentStep);
                  console.log(
                    "   Last step ID:",
                    wizardSteps[wizardSteps.length - 1]?.id
                  );
                  console.log("   Is last step?", isLastStep);
                  console.log(
                    "   All wizard steps:",
                    wizardSteps.map((s) => s.id)
                  );
                  return null;
                })()}
                {currentStep === wizardSteps[wizardSteps.length - 1]?.id ? (
                  <Button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px]"
                  >
                    {editingEntity ? "Update" : "Create"} {config.entityName}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px]"
                  >
                    Save & Continue
                  </Button>
                )}
              </div>
            </div>
          </form>
        ) : (
          // Regular form (without wizard)
          <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
            {config.fields.map((field) => (
              <div key={field.name} className="space-y-3">
                <Label
                  htmlFor={field.name}
                  className="text-sm font-medium text-gray-700"
                >
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </Label>
                {renderFormField(field)}
              </div>
            ))}

            {config.additionalFields}

            {/* Only show status when editing */}
            {currentView === "edit" && (
              <div className="space-y-3">
                <Label
                  htmlFor="status"
                  className="text-sm font-medium text-gray-700"
                >
                  Status
                </Label>
                <Select
                  value={formData.status || "Active"}
                  onValueChange={(value: "Active" | "Inactive") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-8 border-t border-gray-100">
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white min-w-[120px]"
              >
                Save and Continue
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* History & Comments Panel */}
      {showHistory && (
        <div className="col-span-4 border-l bg-gray-50 p-6 h-screen overflow-y-auto sticky top-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">History & Comments</h2>
            <Button variant="ghost" size="sm" onClick={toggleHistory}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Tabs defaultValue="history" className="w-full">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="history" className="flex-1">
                History
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex-1">
                Comments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-4">
              {loadingActivities ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <span className="ml-2">Loading activities...</span>
                </div>
              ) : activities.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-3 p-3 rounded-lg border bg-white"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getUserInitials(activity.user)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {activity.user}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(activity.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900">
                            {activity.action}{" "}
                            <span className="font-medium">
                              {activity.entityName}
                            </span>
                          </p>
                          {activity.details && (
                            <p className="text-sm text-gray-600 mt-1">
                              {activity.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No activity history yet.</p>
                  <p className="text-sm">
                    Activities will appear here as you work with{" "}
                    {config.entityNamePlural.toLowerCase()}.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Input placeholder="Add a comment..." className="flex-1" />
                <Button size="sm">Post</Button>
              </div>

              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No comments yet.</p>
                <p className="text-sm">
                  Be the first to comment on{" "}
                  {config.entityNamePlural.toLowerCase()}.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
