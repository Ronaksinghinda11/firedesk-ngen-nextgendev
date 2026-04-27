// src/pages/UsersPage.tsx
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import GenericEntityPage, {
  EntityConfig,
} from "@/components/generic/GenericEntityPage";
import { api } from "@/lib/api";
import { usePlantFilter } from "@/contexts/PlantFilterContext";
import { TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UserCheck, Building2, Wrench, Users, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Entity } from "@/types/permissions";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: any;
}

interface Plant {
  id: string;
  plantName: string;
  plantId: string;
  industry: {
    industryName: string;
  };
}

interface Category {
  id: string;
  categoryName: string;
  category_name?: string;
  description: string;
}

interface Manager {
  id: string;
  managerId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Vendor {
  id: string;
  vendorName: string;
  vendor_name?: string; // Backend property
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  userType: string;
  status: string;
  roleId: string;
  role: Role;
  created_at: string;
}

export const UsersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { selectedPlantId } = usePlantFilter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);


  useEffect(() => {
    loadReferenceData();
  }, []);

  // Pre-load categories when component mounts to ensure they're available
  useEffect(() => {
    // Pre-fetch categories so they're available when technician role is selected
    fetchCategories();
  }, []);

  const loadReferenceData = async () => {
    try {
      console.log("🔄 Loading reference data for users...");

      // Backend: GET /roles
      const rolesResponse = await api.get<{ success: boolean; count: number; roles: Role[] }>("/roles");
      console.log("📡 Roles response:", rolesResponse);
      setRoles(rolesResponse.roles || []);

      // Load other reference data immediately to avoid render-cycle fetches
      // These functions have internal "already loaded" checks so they are safe to call
      fetchPlants();
      fetchManagers();
      fetchCategories();
      fetchVendors();

    } catch (error: any) {
      console.error("❌ Error loading reference data:", error);
    }
  };

  const fetchPlants = async () => {
    // Skip if already loading or data already exists
    if (loadingPlants || plants.length > 0) return;

    try {
      setLoadingPlants(true);
      const response: any = await api.get("/plants");
      console.log("Plants response:", response);
      setPlants(response.plants || []);
    } catch (error: any) {
      console.error("Failed to fetch plants:", error);
      setPlants([]);
    } finally {
      setLoadingPlants(false);
    }
  };

  const fetchCategories = async () => {
    // Skip if already loading or data already exists
    if (loadingCategories || categories.length > 0) return;

    try {
      setLoadingCategories(true);
      const response: any = await api.get("/master-data/categories/active");
      console.log("Categories response:", response);
      // API returns { activeCategories: [...] }
      const categoriesData =
        response.activeCategories ||
        response.allCategory ||
        response.categories ||
        [];
      console.log("Categories data:", categoriesData);
      setCategories(categoriesData);
    } catch (error: any) {
      console.warn("Failed to fetch categories (route might be missing):", error);
      setCategories([]); // graceful fallback
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchManagers = async () => {
    // Skip if already loading
    if (loadingManagers) return;

    try {
      setLoadingManagers(true);
      // Backend: GET /managers
      const response = await api.get<{ success: boolean; count: number; managers: Manager[]; data?: Manager[] }>("/managers");
      console.log("Managers response:", response);
      // Handle both response.managers and response.data formats
      const rawManagers = response.managers || (response as any).data || [];
      console.log("Raw Managers Count:", rawManagers.length, "First:", rawManagers[0]);

      // Transform plant_assignments to plants structure expected by UI
      const managersData = rawManagers.map((m: any) => ({
        ...m,
        plants: m.plant_assignments?.map((pa: any) => ({ id: pa.plant_id })) || []
      }));

      console.log("Managers data parsed:", managersData.length, "First transformed:", managersData[0]);
      setManagers(managersData);
    } catch (error: any) {
      console.error("Failed to fetch managers:", error);
      setManagers([]);
    } finally {
      setLoadingManagers(false);
    }
  };

  const fetchVendors = async () => {
    // Skip if already loading
    if (loadingVendors) return;

    try {
      setLoadingVendors(true);
      const response: any = await api.get("/master-data/vendors/active");
      console.log("Vendors response:", response);
      // Handle multiple possible response formats
      const vendorsData = response.vendors || response.activeVendors || response.data || [];
      console.log("Vendors data parsed:", vendorsData);
      setVendors(vendorsData);
    } catch (error: any) {
      console.warn("Failed to fetch vendors (route might be missing):", error);
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const userConfig: EntityConfig = {
    entityName: "User",
    entityNamePlural: "Users",
    // Backend: /users
    apiEndpoint: "/users",
    responseKey: "users",

    // Permission-based access control
    permissionEntity: Entity.USERS,
    enforcePermissions: true,

    // Plant filter support
    enablePlantFilter: true,

    // Allow duplicate names - users can have the same name (uniqueness enforced on email/phone by backend)
    allowDuplicateNames: true,

    // Configure fields for archive/restore operations
    supportsArchive: true,
    archiveStatusValue: 'Inactive',
    archiveFields: ["name", "email", "phone", "status"],
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'import', 'bulkActions', 'history'],

    // Filter attributes for sorting and column visibility
    filterAttributes: [
      { id: 'name', label: 'Name', type: 'text' as const, operators: ['contains', 'is', 'isNot'], mandatory: true },
      { id: 'email', label: 'Email', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'phone', label: 'Phone', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'roleId', label: 'Role', type: 'select' as const, operators: ['is', 'isNot'], options: roles.map(r => ({ value: r.id, label: r.name })) },

      { id: 'created_at', label: 'Created At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
      { id: 'updated_at', label: 'Updated At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    ],

    // Import fields - ALL database fields that can be filled from the form (for import template)
    // Excludes: created_at, updated_at, status (system-managed fields)
    // Note: Use 'role' (name) not 'role_id' - backend will resolve name to ID
    importFields: [
      { id: 'name', label: 'Name', required: true },
      { id: 'email', label: 'Email', required: true },
      { id: 'phone', label: 'Phone', required: true },
      { id: 'password', label: 'Password', required: true },
      { id: 'role', label: 'Role' }, // Users enter role name (Admin, Manager, Technician), not UUID
    ],

    fields: [
      {
        name: "name",
        label: "Full Name",
        type: "text",
        required: true,
      },
      {
        name: "email",
        label: "Email",
        type: "text",
        required: true,
      },
      {
        name: "phone",
        label: "Phone",
        type: "text",
        required: true,
      },
      {
        name: "status",
        label: "Status",
        type: "text",
        required: false,
      },
      {
        name: "password",
        label: "Password",
        type: "text",
        required: true,
      },
      // Hidden fields for technician associations - needed for edit mode (type must be valid but won't be rendered)
      {
        name: "managerIds",
        label: "Manager IDs",
        type: "text",
        required: false,
      },
      {
        name: "categoryIds",
        label: "Category IDs",
        type: "text",
        required: false,
      },
      {
        name: "plantIds",
        label: "Plant IDs",
        type: "text",
        required: false,
      },
      {
        name: "technicianType",
        label: "Technician Type",
        type: "text",
        required: false,
      },
      {
        name: "vendorId",
        label: "Vendor ID",
        type: "text",
        required: false,
      },
      {
        name: "experience",
        label: "Experience",
        type: "text",
        required: false,
      },
      {
        name: "specialization",
        label: "Specialization",
        type: "text",
        required: false,
      },
    ],

    // Pre-fill form data based on URL parameters (e.g., ?role=manager or ?role=technician)
    getInitialFormData: (entity?: any) => {
      const roleParam = searchParams.get('role');

      // If editing an existing entity, transform it for the form
      if (entity) {
        console.log("🔍 UsersPage: getInitialFormData called with entity:", entity);
        console.log("🔍 UsersPage: entity keys:", Object.keys(entity));
        console.log("🔍 UsersPage: entity.roleId:", entity.roleId);
        console.log("🔍 UsersPage: entity.role_id:", entity.role_id);
        console.log("🔍 UsersPage: entity.plantIds:", entity.plantIds);
        console.log("🔍 UsersPage: entity.plant_ids:", entity.plant_ids);

        const formData: any = {
          id: entity.id,
          name: entity.name,
          email: entity.email,
          phone: entity.phone,
          // Fallback to nested role object if direct ID is missing
          roleId: entity.roleId || entity.role_id || entity.role?.id,
          status: entity.status,
        };

        // Manager-specific data
        // Backend returns plant_ids for managers
        if (entity.plantIds || entity.plant_ids) {
          formData.plantIds = entity.plantIds || entity.plant_ids;
        }

        // Technician-specific data
        // Backend returns technician_type, plant_ids, etc.
        const isTechnicianRole = entity.role?.name === 'Technician';
        if (entity.technicianType || entity.technician_type || entity.technicianProfile || isTechnicianRole) {
          formData.technicianType = entity.technicianType || entity.technician_type || entity.technicianProfile?.technicianType || 'In House';

          // Handle plant associations based on technicianType
          if (formData.technicianType === 'In House') {
            // For In House: single plant (plantId)
            formData.plantId = entity.plantId || entity.plant_id || entity.technicianProfile?.plantId;
            // If plantId not found but plantIds has items, use first one
            const pIds = entity.plantIds || entity.plant_ids || [];
            if (!formData.plantId && pIds.length > 0) {
              formData.plantId = pIds[0];
            }
            if (!formData.plantId && entity.technicianProfile?.plantIds && entity.technicianProfile.plantIds.length > 0) {
              formData.plantId = entity.technicianProfile.plantIds[0];
            }
          } else if (formData.technicianType === 'Third Party') {
            // For Third Party: multiple plants (plantIds)
            formData.plantIds = entity.plantIds || entity.plant_ids || entity.technicianProfile?.plantIds || [];
          }

          // Extract category IDs - try all possible sources
          let techCategoryIds = [];
          if (entity.categoryIds || entity.category_ids) {
            techCategoryIds = entity.categoryIds || entity.category_ids || [];
          } else if (entity.technicianProfile?.categories && entity.technicianProfile.categories.length > 0) {
            techCategoryIds = entity.technicianProfile.categories.map((c: any) => c.id);
          } else if (entity.categories && entity.categories.length > 0) {
            techCategoryIds = entity.categories.map((c: any) => c.id);
          }
          formData.categoryIds = techCategoryIds;

          formData.vendorId = entity.vendorId || entity.vendor_id || entity.technicianProfile?.vendorId;
          formData.experience = entity.experience || entity.technicianProfile?.experience;
          formData.specialization = entity.specialization || entity.technicianProfile?.specialization;

          // Helper to get manager IDs
          if (entity.managerIds || entity.manager_ids) {
            formData.managerIds = entity.managerIds || entity.manager_ids || [];
          }

          // Extract plant-manager pairs - check if transformResponse already created it
          if (entity.plantManagerPairs || entity.plant_manager_pairs) {
            const rawPairs = entity.plantManagerPairs || entity.plant_manager_pairs;
            // Normalize to camelCase
            formData.plantManagerPairs = rawPairs.map((p: any) => ({
              plantId: p.plantId || p.plant_id,
              managerId: p.managerId || p.manager_id
            }));
          } else {
            // Fallback: extract from junction table data
            const plants = entity.technicianProfile?.plants || entity.plants || [];
            if (plants.length > 0) {
              const pairs = plants
                .filter((p: any) => {
                  const hasManager = p.TechnicianPlant?.manager?.id || p.TechnicianPlant?.managerId;
                  return hasManager;
                })
                .map((p: any) => {
                  const managerId = p.TechnicianPlant?.manager?.id || p.TechnicianPlant?.managerId;
                  return {
                    plantId: p.id,
                    managerId: managerId
                  };
                });
              if (pairs.length > 0) {
                formData.plantManagerPairs = pairs;
              }
            }
          }
        }

        return formData;
      }

      // If role is requested but roles aren't loaded yet, return null to signal "not ready"
      if (roleParam && roles.length === 0) {
        return null;
      }

      const initialData: any = {};

      // Pre-select role if URL parameter provided
      if (roleParam && roles.length > 0) {
        const matchingRole = roles.find(r => r.name.toLowerCase() === roleParam.toLowerCase());
        if (matchingRole) {
          initialData.roleId = matchingRole.id;
        }
      }

      return initialData;
    },

    // Wizard configuration (used as Sections in 'sections' layout)
    // Explicit form sections to allow per-section styling
    formSections: [
      { id: "basicInfo", title: "Basic Information", maxWidth: "w-full" },
      { id: "roleSpecific", title: "Role Details", maxWidth: "max-w-2xl" },
    ],

    // wizardSteps kept for Wizard mode (if needed later) or reference, but formSections takes precedence in 'sections' layout
    wizardSteps: [
      { id: "basicInfo", name: "Basic Information" },
      { id: "roleSpecific", name: "Role Details" },
    ],



    formLayout: "sections",

    renderWizardStep: (
      step: string,
      formData: any,
      setFormData: any,
      currentStep: string,
      setCurrentStep: any
    ) => {
      const selectedRole = roles.find((role) => role.id === formData.roleId);
      const isManager = selectedRole?.name === "Manager";
      const isTechnician = selectedRole?.name === "Technician";

      switch (step) {
        case "basicInfo":
          return (
            <div className="space-y-3 w-full">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                {/* 1. Full Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="name"
                    className="text-xs font-medium text-gray-700"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter full name"
                    className="h-9 text-sm"
                    required
                  />
                </div>

                {/* 2. Phone */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="phone"
                    className="text-xs font-medium text-gray-700"
                  >
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                      setFormData((prev) => ({ ...prev, phone: value }));
                    }}
                    placeholder="10-digit phone"
                    className="h-9 text-sm"
                    maxLength={10}
                    required
                  />
                  {/* Validation messages */}
                  {formData.phone && formData.phone.length > 0 && formData.phone.length < 10 && (
                    <p className="text-[10px] text-red-600 mt-1">
                      Must be 10 digits
                    </p>
                  )}
                  {formData.phone && formData.phone.length > 0 && !['6', '7', '8', '9'].includes(formData.phone[0]) && (
                    <p className="text-[10px] text-red-600 mt-1">
                      Must start with 6-9
                    </p>
                  )}
                </div>

                {/* 3. Email */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-xs font-medium text-gray-700"
                  >
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Enter email address"
                    className="h-9 text-sm"
                    required
                  />
                  {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                    <p className="text-[10px] text-red-600 mt-1">
                      Invalid email
                    </p>
                  )}
                </div>

                {/* 4. Password (Create) OR Status (Edit) */}
                {/* Note: In 5-col grid, we place Password/Status here, then Role last? Or Role 4th, Password 5th? */}
                {/* Request: Create -> Name, Phone, Email, Password, Role */}
                {/* Request: Edit -> Name, Phone, Email, Role, Status */}
                {/* Layout order needs to be dynamic or positioned */}

                {!formData.id ? (
                  // CREATE MODE: Password is 4th
                  <div className="space-y-1.5" key="password-field-container">
                    <Label
                      htmlFor="password"
                      className="text-xs font-medium text-gray-700"
                    >
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="Password"
                        className="h-9 text-sm pr-8"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-9 w-9 px-2 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // EDIT MODE: Role is 4th (moved below), Status is 5th?
                  // Wait, Edit Request: Name, Phone, Email, Role, Status.
                  // So 4th col should be Role in Edit mode?
                  // And 5th col Status.
                  // Unlike Create: 4th col Password, 5th col Role.
                  // I'll swap positions based on ID presence? 
                  // Let's render Role 4th for Edit, Password 4th for Create.
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="role"
                      className="text-xs font-medium text-gray-700"
                    >
                      Role <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.roleId || ""}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          roleId: value,
                          // Clear ALL role-specific fields when role changes
                          plantIds: [],
                          plantId: null,
                          managerId: null,
                          categoryId: null,
                          vendorId: null,
                          technicianType: 'In House',
                          experience: null,
                          specialization: null,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 5. Role (Create) OR Status (Edit) */}
                {!formData.id ? (
                  // CREATE MODE: Role is 5th
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="role"
                      className="text-xs font-medium text-gray-700"
                    >
                      Role <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.roleId || ""}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          roleId: value,
                          plantIds: [],
                          plantId: null,
                          managerId: null,
                          categoryId: null,
                          vendorId: null,
                          technicianType: 'In House',
                          experience: null,
                          specialization: null,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  // EDIT MODE: Status is 5th
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="status"
                      className="text-xs font-medium text-gray-700"
                    >
                      Status
                    </Label>
                    <Select
                      value={formData.status || "Active"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          );



        case "roleSpecific":
          // Load reference data when this step is rendered
          // This ensures data is available when editing existing users or when role is pre-selected via URL

          // DYNAMIC ROLE-SPECIFIC FIELDS
          // Reference data is pre-loaded by loadReferenceData() on mount

          // DYNAMIC ROLE-SPECIFIC FIELDS
          // Always show role-specific fields based on selected role (for both create and edit modes)
          if (isManager) {
            // Manager Specific Fields
            return (
              <div className="space-y-4 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <Building2 className="h-4 w-4 text-slate-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Manager Assignment
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700">
                    Assign Plants <span className="text-gray-500">(optional, multiple)</span>
                  </Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {loadingPlants ? (
                      <p className="text-sm text-gray-500">Loading plants...</p>
                    ) : plants.length === 0 ? (
                      <p className="text-sm text-gray-500">No plants available</p>
                    ) : (
                      plants.map((plant) => {
                        const isChecked = (formData.plantIds || []).includes(plant.id);
                        // Reduced logging to avoid spam, but log the FIRST plant to verify structure
                        if (plants.indexOf(plant) === 0) {
                          console.log("🔍 Render Checkbox:", {
                            plantName: plant.plantName,
                            plantId: plant.id,
                            formDataPlantIds: formData.plantIds,
                            isChecked
                          });
                        }
                        return (
                          <div key={plant.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`plant-${plant.id}`}
                              checked={isChecked}
                              onChange={(e) => {
                                const currentPlants = formData.plantIds || [];
                                if (e.target.checked) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    plantIds: [...currentPlants, plant.id],
                                  }));
                                } else {
                                  setFormData((prev) => ({
                                    ...prev,
                                    plantIds: currentPlants.filter((id: string) => id !== plant.id),
                                  }));
                                }
                              }}
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor={`plant-${plant.id}`}
                              className="text-sm text-gray-700 cursor-pointer"
                            >
                              {plant.plantName} - {plant.industry?.industryName}
                            </label>
                          </div>
                        )
                      })
                    )}
                  </div>
                  {(formData.plantIds || []).length > 0 && (
                    <p className="text-xs text-gray-600">
                      {(formData.plantIds || []).length} plant{(formData.plantIds || []).length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              </div>
            );
          }

          if (isTechnician) {
            // Technician Specific Fields
            return (
              <div className="space-y-4 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <Wrench className="h-4 w-4 text-slate-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Technician Assignment
                  </h3>
                </div>

                {/* Row 1: Technician Type + Plant (or Vendor for Third Party) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 1. Technician Type */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      Technician Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.technicianType || ""}
                      onValueChange={(value: "In House" | "Third Party") => {
                        console.log('🔄 Technician type changed to:', value);
                        setFormData((prev) => ({
                          ...prev,
                          technicianType: value,
                          // Clear plant selections when switching types
                          plantId: value === "In House" ? prev.plantId : undefined,
                          plantIds: value === "Third Party" ? prev.plantIds : [],
                        }));
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In House">In House</SelectItem>
                        <SelectItem value="Third Party">Third Party</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Vendor - Conditional (only Third Party) */}
                  {formData.technicianType === "Third Party" && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700">
                        Select Vendor <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.vendorId || ""}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, vendorId: value }))
                        }
                        disabled={loadingVendors}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue
                            placeholder={
                              loadingVendors
                                ? "Loading vendors..."
                                : vendors.length === 0
                                  ? "No vendors available"
                                  : "Select vendor"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingVendors ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              Loading vendors...
                            </div>
                          ) : vendors.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              No vendors available
                            </div>
                          ) : (
                            vendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.vendor_name || vendor.vendorName || "Unknown Vendor"}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Plant for In House (single select) - in the same grid row */}
                  {formData.technicianType === "In House" && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700">
                        Plant <span className="text-gray-500 text-[10px]">(optional)</span>
                      </Label>
                      <Select
                        value={formData.plantId || ""}
                        onValueChange={(value) => {
                          console.log('🏭 Single plant selected:', value);
                          setFormData((prev) => {
                            if (prev.plantId !== value) {
                              return { ...prev, plantId: value, plantManagerPairs: [] };
                            } else {
                              return { ...prev, plantId: value };
                            }
                          });
                        }}
                        disabled={loadingPlants}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue
                            placeholder={
                              loadingPlants
                                ? "Loading plants..."
                                : plants.length === 0
                                  ? "No plants available"
                                  : "Select plant"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingPlants ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              Loading plants...
                            </div>
                          ) : plants.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              No plants available
                            </div>
                          ) : (
                            plants.map((plant) => (
                              <SelectItem key={plant.id} value={plant.id}>
                                {plant.plantName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Manager for In House - Single manager based on selected plant */}
                {formData.technicianType === "In House" && formData.plantId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700">
                        Manager <span className="text-gray-500 text-[10px]">(optional)</span>
                      </Label>
                      <Select
                        value={(() => {
                          const pair = (formData.plantManagerPairs || []).find((p: any) => p.plantId === formData.plantId);
                          const managerValue = pair?.managerId || "none";
                          return managerValue;
                        })()}
                        onValueChange={(value) => {
                          setFormData((prev: any) => {
                            if (value === "none") {
                              return { ...prev, plantManagerPairs: [] };
                            } else {
                              return {
                                ...prev,
                                plantManagerPairs: [{ plantId: formData.plantId, managerId: value }]
                              };
                            }
                          });
                        }}
                        disabled={loadingManagers}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {loadingManagers ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">Loading managers...</div>
                          ) : managers.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">No managers available</div>
                          ) : (
                            managers
                              .filter((manager: any) =>
                                !formData.plantId ||
                                manager.plants?.some((p: any) => p.id === formData.plantId)
                              )
                              .map((manager: any) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.user?.name || manager.name || manager.managerId}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Third Party: Multi-select plants */}
                {formData.technicianType === "Third Party" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-700">
                      Assign Plants <span className="text-gray-500">(optional, multiple selection)</span>
                    </Label>
                    <div className="max-h-60 overflow-y-auto border rounded-lg p-3 bg-white">
                      {loadingPlants ? (
                        <div className="text-sm text-gray-500">Loading plants...</div>
                      ) : plants.length === 0 ? (
                        <div className="text-sm text-gray-500">No plants available</div>
                      ) : (
                        <div className="space-y-2">
                          {plants.map((plant) => (
                            <div key={plant.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`plant-${plant.id}`}
                                checked={(formData.plantIds || []).includes(plant.id)}
                                onChange={(e) => {
                                  const currentPlants = formData.plantIds || [];
                                  if (e.target.checked) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      plantIds: [...currentPlants, plant.id],
                                    }));
                                  } else {
                                    setFormData((prev) => ({
                                      ...prev,
                                      plantIds: currentPlants.filter((id) => id !== plant.id),
                                    }));
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label
                                htmlFor={`plant-${plant.id}`}
                                className="text-sm text-gray-700 cursor-pointer"
                              >
                                {plant.plantName}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {(formData.plantIds && formData.plantIds.length > 0) && (
                      <p className="text-xs text-gray-500">
                        {formData.plantIds.length} plant{formData.plantIds.length !== 1 ? "s" : ""} selected
                      </p>
                    )}

                    {/* Manager selection for each selected plant */}
                    {formData.plantIds && formData.plantIds.length > 0 && (
                      <div className="space-y-1.5 border-t pt-2 mt-2">
                        <Label className="text-xs font-medium text-gray-700">
                          Assign Manager per Plant <span className="text-gray-500">(optional)</span>
                        </Label>
                        <p className="text-xs text-gray-500">
                          Select one manager for each plant. Only managers assigned to each plant are shown.
                        </p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {formData.plantIds.map((plantId: string) => {
                            const plant = plants.find((p) => p.id === plantId);
                            // Get current manager for this plant
                            const currentPair = (formData.plantManagerPairs || []).find(
                              (pair: any) => pair.plantId === plantId
                            );

                            // Filter managers who are assigned to this specific plant
                            const managersForPlant = managers.filter((manager: any) => {
                              const hasPlant = manager.plants?.some((p: any) => p.id === plantId);
                              if (manager.id === currentPair?.managerId) {
                                console.log(`Checking Assigned Manager ${manager.name}: Plant Match? ${hasPlant}`, manager.plants);
                              }
                              return hasPlant;
                            });

                            return (
                              <div key={plantId} className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg bg-white">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-700">{plant?.plantName}</p>
                                </div>
                                <div className="flex-1">
                                  <Select
                                    value={currentPair?.managerId || "none"}
                                    onValueChange={(value) => {
                                      setFormData((prev: any) => {
                                        const pairs = prev.plantManagerPairs || [];
                                        const existingPairIndex = pairs.findIndex(
                                          (p: any) => p.plantId === plantId
                                        );

                                        let newPairs;
                                        if (value === "none") {
                                          // Remove the pair if "none" selected
                                          newPairs = pairs.filter((p: any) => p.plantId !== plantId);
                                        } else {
                                          if (existingPairIndex >= 0) {
                                            // Update existing pair
                                            newPairs = [...pairs];
                                            newPairs[existingPairIndex] = { plantId: plantId, managerId: value };
                                          } else {
                                            // Add new pair
                                            newPairs = [...pairs, { plantId: plantId, managerId: value }];
                                          }
                                        }

                                        return { ...prev, plantManagerPairs: newPairs };
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Select manager (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {managersForPlant.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-gray-500">
                                          No managers assigned to this plant
                                        </div>
                                      ) : (
                                        managersForPlant.map((manager: any) => (
                                          <SelectItem key={manager.id} value={manager.id}>
                                            {manager.user?.name || manager.managerId}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Categories - Always Multi-Select */}
                <div className="space-y-1 max-w-sm">
                  <Label className="text-xs font-medium text-gray-700">
                    Assign Categories <span className="text-gray-500 text-[10px]">(optional)</span>
                  </Label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 bg-white">
                    {loadingCategories ? (
                      <div className="text-sm text-gray-500">Loading categories...</div>
                    ) : categories.length === 0 ? (
                      <div className="text-sm text-gray-500">No categories available</div>
                    ) : (
                      <div className="space-y-2">
                        {categories.map((category) => {
                          const isChecked = (formData.categoryIds || []).includes(category.id);
                          return (
                            <div key={category.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`category-${category.id}`}
                                checked={isChecked}
                                onChange={(e) => {
                                  const currentCategories = formData.categoryIds || [];
                                  if (e.target.checked) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      categoryIds: [...currentCategories, category.id],
                                    }));
                                  } else {
                                    setFormData((prev) => ({
                                      ...prev,
                                      categoryIds: currentCategories.filter((id) => id !== category.id),
                                    }));
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label
                                htmlFor={`category-${category.id}`}
                                className="text-sm text-gray-700 cursor-pointer"
                              >
                                {category.categoryName || category.category_name}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {(formData.categoryIds && formData.categoryIds.length > 0) && (
                    <p className="text-xs text-gray-500">
                      {formData.categoryIds.length} category
                      {formData.categoryIds.length !== 1 ? "ies" : ""} selected
                    </p>
                  )}
                </div>

                {/* 6. Experience and Specialization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      Experience
                    </Label>
                    <Input
                      value={formData.experience || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          experience: e.target.value,
                        }))
                      }
                      placeholder="e.g., 5 years"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      Specialization
                    </Label>
                    <Input
                      value={formData.specialization || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          specialization: e.target.value,
                        }))
                      }
                      placeholder="e.g., Electrical Systems"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div >
            );
          }

          // Regular User or Admin - No additional fields needed
          return null;


        default:
          return null;
      }
    },

    onWizardNext: async (
      currentStep: string,
      formData: any
    ): Promise<boolean> => {
      if (currentStep === "basicInfo") {
        if (
          !formData.name ||
          !formData.email ||
          !formData.phone ||
          !formData.roleId || // Validate Role
          (!formData.id && !formData.password)
        ) {
          alert("Please fill in all required fields (Name, Phone, Email, Role, Password)");
          return false;
        }

        // Validate phone number format
        if (formData.phone) {
          if (formData.phone.length !== 10) {
            alert("Phone number must be exactly 10 digits");
            return false;
          }
          if (!/^[6-9]/.test(formData.phone)) {
            alert("Phone number must start with 6, 7, 8, or 9");
            return false;
          }
          if (/^(\d)\1{9}$/.test(formData.phone)) {
            alert("Please enter a valid phone number. Repetitive numbers are not allowed");
            return false;
          }
          // Check for common dummy patterns
          const dummyPatterns = [
            "1234567890", "0987654321", "0000000000", "1111111111",
            "2222222222", "3333333333", "4444444444", "5555555555",
            "6666666666", "7777777777", "8888888888", "9999999999"
          ];
          if (dummyPatterns.includes(formData.phone)) {
            alert("Please enter a valid phone number. Test numbers and repetitive sequences are not allowed");
            return false;
          }
        }

        // Load data if role requires it (moved from roleSelection step which is now removed)
        const selectedRole = roles.find((r) => r.id === formData.roleId);
        if (selectedRole?.name === "Manager") {
          // Load plants for manager assignment
          console.log('🔄 Loading plants for Manager role...');
          await fetchPlants();
          console.log('✅ Plants loaded for Manager:', plants.length);
        } else if (selectedRole?.name === "Technician") {
          // Load all reference data for technician assignment
          console.log('🔄 Loading reference data for Technician role...');
          await Promise.all([
            fetchPlants(),
            fetchCategories(),
            fetchManagers(),
            fetchVendors(),
          ]);
          console.log('✅ Reference data loaded for Technician');
        }

      } else if (currentStep === "roleSpecific" && !formData.id) {
        // Validate role-specific fields for new users
        const selectedRole = roles.find((r) => r.id === formData.roleId);

        // Plant association is OPTIONAL for managers
        // No validation needed for optional fields

        if (selectedRole?.name === "Technician") {
          // Only technicianType is required, other fields are optional
          if (!formData.technicianType) {
            alert("Please select technician type");
            return false;
          }
        }
      }
      return true;
    },

    onWizardSubmit: async (formData: any) => {
      const selectedRole = roles.find((role) => role.id === formData.roleId);
      const isManager = selectedRole?.name === "Manager";
      const isTechnician = selectedRole?.name === "Technician";

      console.log("Form data:", formData);
      console.log("Selected role:", selectedRole);
      console.log("Is technician:", isTechnician);
      console.log("Role ID being sent:", formData.roleId);

      if (formData.id) {
        // Update user - use general update endpoint for basic info
        await api.put(`/admin/users/${formData.id}`, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status || "Active",
        });

        // Always update role first (backend handles creating new records)
        if (formData.roleId) {
          await api.put(`/admin/users/${formData.id}/role`, {
            roleId: formData.roleId,
          });
        }

        // ALWAYS call role-specific updates for the NEW role
        // This allows assigning plants/vendor during role change
        if (isManager) {
          // Update manager's plant associations
          await api.put(`/admin/users/${formData.id}/manager-data`, {
            plantIds: formData.plantIds || [],
          });
        } else if (isTechnician) {
          // Update technician-specific fields
          await api.put(`/admin/users/${formData.id}/technician-data`, {
            // Plant associations (conditional based on technicianType)
            plantId: formData.technicianType === 'In House' ? (formData.plantId || null) : null,
            plantIds: formData.technicianType === 'Third Party' ? (formData.plantIds || []) : [],
            // Category associations (NEW M:M - always array)
            categoryIds: formData.categoryIds || [],
            // Plant-specific manager assignments (OPTIONAL)
            plantManagerPairs: formData.plantManagerPairs || [],
            // Other fields
            technicianType: formData.technicianType || 'In House',
            vendorId: formData.vendorId || null,
            experience: formData.experience || null,
            specialization: formData.specialization || null,
          });
        }
      } else {
        // Set default status to 'Active' for new users
        const defaultStatus = "Active";

        // UNIFIED USER CREATION - Always use /admin/users endpoint for all roles
        const userData: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          roleId: formData.roleId,
          status: defaultStatus,
        };

        // Add role-specific optional fields if provided
        if (isTechnician) {
          // Technician-specific fields (all optional except technicianType)
          // Plant associations (conditional based on technicianType)
          if (formData.technicianType === 'In House' && formData.plantId) {
            userData.plantId = formData.plantId;
          } else if (formData.technicianType === 'Third Party' && formData.plantIds && formData.plantIds.length > 0) {
            userData.plantIds = formData.plantIds;
          }
          // Category associations (NEW M:M - always array)
          if (formData.categoryIds && formData.categoryIds.length > 0) {
            userData.categoryIds = formData.categoryIds;
          }
          // Plant-specific manager assignments (OPTIONAL)
          if (formData.plantManagerPairs && formData.plantManagerPairs.length > 0) {
            userData.plantManagerPairs = formData.plantManagerPairs;
          }
          // Other fields
          if (formData.technicianType) userData.technicianType = formData.technicianType;
          if (formData.experience) userData.experience = formData.experience;
          if (formData.specialization) userData.specialization = formData.specialization;
          // For Third Party technicians, send vendorId reference
          if (formData.vendorId) userData.vendorId = formData.vendorId;
        } else if (isManager) {
          // Manager-specific fields (plant association is optional, supports multiple)
          if (formData.plantIds && formData.plantIds.length > 0) {
            userData.plantIds = formData.plantIds;
          }
        }

        console.log("Creating user with unified endpoint:", userData);
        await api.post("/admin/users", userData);
      }
    },

    transformResponse: (response: any) => {
      // Map the backend response structure to our frontend entity structure
      const transformedData = (response.users || response.data || response).map((item: any) => {
        // Extract all plant IDs from various possible sources
        let plantIdsArray: string[] = [];
        if (item.plant_ids && Array.isArray(item.plant_ids)) {
          plantIdsArray = item.plant_ids;
        } else if (item.plantIds && Array.isArray(item.plantIds)) {
          plantIdsArray = item.plantIds;
        } else if (item.plants && Array.isArray(item.plants)) {
          plantIdsArray = item.plants.map((p: any) => p.id);
        } else if (item.technicianProfile?.plantIds) {
          plantIdsArray = item.technicianProfile.plantIds;
        }

        // Parse plant-manager pairs if they exist
        let plantManagerPairs: any[] = [];
        if (item.plantManagerPairs) {
          plantManagerPairs = item.plantManagerPairs;
        } else if (item.plant_manager_pairs) {
          plantManagerPairs = item.plant_manager_pairs;
        }

        // Helper to extract nested objects for Technician
        const technicianPlants = item.technicianProfile?.plants || item.plants || [];
        const technicianManagers = item.technicianProfile?.managers || item.managers || [];
        const technicianCategories = item.technicianProfile?.categories || item.categories || [];

        return {
          id: item.id,
          name: item.name || "Unnamed",
          email: item.email || "N/A",
          phone: item.phone || "No phone",
          userType: item.userType || "User",
          status: item.status || "active",
          roleId: item.roleId || item.role?.id || item.role_id,
          originalRoleId: item.roleId || item.role?.id || item.role_id,
          role: item.role,
          createdAt: item.created_at || item.createdAt || new Date().toISOString(),
          created_at: item.created_at || item.createdAt || new Date().toISOString(),
          updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
          updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
          // Plant data (used by both Manager and Technician)
          plantIds: plantIdsArray,
          plants: item.plants || technicianPlants,
          // Technician-specific single plant (backward compatibility for In-House)
          plantId: item.technicianProfile?.plantId || item.plantId,
          // Plant-specific manager assignments
          plantManagerPairs: plantManagerPairs,
          // Manager associations
          managerId: item.technicianProfile?.managerId || item.managerId,
          managerIds: technicianManagers.map((m: any) => m.id),
          managers: technicianManagers,
          // Category associations
          categoryId: item.technicianProfile?.categoryId || item.categoryId,
          categoryIds: technicianCategories.map((c: any) => c.id),
          categories: technicianCategories,
          // Other technician fields
          vendorId: item.technicianProfile?.vendorId || item.vendorId,
          technicianType: item.technicianProfile?.technicianType || item.technicianType,
          experience: item.technicianProfile?.experience || item.experience,
          specialization: item.technicianProfile?.specialization || item.specialization,
        };
      });

      return {
        ...response,
        users: transformedData,
      };
    },

    // Custom loader to ensure we get fresh, detailed data when editing
    loadEntityData: async (entityId: string, currentFormData: any) => {
      try {
        console.log("🔄 loadEntityData called for:", entityId);
        const response: any = await api.get(`/users/${entityId}`);
        const user = response.user || response.data?.user || response;

        if (!user) {
          return {};
        }

        const extraData: any = {};

        // 1. Fix Role ID
        if (user.role?.id) extraData.roleId = user.role.id;
        else if (user.role_id) extraData.roleId = user.role_id;

        // 2. Manager & Technician: Map plant_ids to plantIds
        if (user.plant_ids && Array.isArray(user.plant_ids)) {
          extraData.plantIds = user.plant_ids;
        }

        // 3. Technician Fields
        if (user.technician_type) extraData.technicianType = user.technician_type;
        if (user.vendor_id) extraData.vendorId = user.vendor_id;

        // Handle Technician In-House logic
        if (user.plant_ids && user.plant_ids.length > 0) {
          extraData.plantIds = user.plant_ids;
          if ((extraData.technicianType === 'In House' || user.technician_type === 'In House') && !extraData.plantId) {
            extraData.plantId = user.plant_ids[0];
          }
        }

        // 4. Other Arrays
        if (user.manager_ids) extraData.managerIds = user.manager_ids;
        if (user.category_ids) extraData.categoryIds = user.category_ids;

        return extraData;
      } catch (error) {
        console.error("❌ Error in loadEntityData:", error);
        return {};
      }
    },




    transformData: (data: any) => {
      // This will be handled by onWizardSubmit for users
      return data;
    },

    customColumns: (entity: any, isVisible: (field: string) => boolean) => (
      <>
        {/* User Column - Sticky */}
        {isVisible('name') && (
          <TableCell className="bg-white md:sticky md:left-0 z-10 min-w-[180px] md:border-r border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-medium text-xs flex-shrink-0">
                {(() => {
                  const name = entity.name || 'U';
                  const parts = name.split(' ').filter((p: string) => p.length > 0);
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[1][0]).toUpperCase();
                  }
                  return name.substring(0, 2).toUpperCase();
                })()}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{entity.name}</p>
              </div>
            </div>
          </TableCell>
        )}

        {/* Email Column */}
        {isVisible('email') && (
          <TableCell>
            <p>{entity.email || "N/A"}</p>
          </TableCell>
        )}

        {/* Contact Column - phone only */}
        {isVisible('phone') && (
          <TableCell>
            <p>{entity.phone || "No phone"}</p>
          </TableCell>
        )}

        {/* Role Column */}
        {isVisible('roleId') && (
          <TableCell>
            {entity.role ? (
              <span
                className={`text-xs font-semibold ${entity.role.name === "Admin"
                  ? "text-red-700 font-bold"
                  : entity.role.name === "Manager"
                    ? "text-indigo-600 font-bold"
                    : entity.role.name === "Technician"
                      ? "text-orange-600 font-bold"
                      : "text-gray-600 font-bold"
                  }`}
              >
                {entity.role.name}
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-400">
                No Role
              </span>
            )}
          </TableCell>
        )}

        {/* Status Column */}
        {isVisible('status') && (
          <TableCell>
            <span
              className={`text-xs font-semibold ${entity.status === "Active"
                ? "text-emerald-600"
                : "text-red-600"
                }`}
            >
              {entity.status || "Active"}
            </span>
          </TableCell>
        )}

        {/* Created At Column */}
        {isVisible('created_at') && (
          <TableCell className="text-sm text-gray-600">
            {entity.created_at
              ? new Date(entity.created_at).toLocaleDateString()
              : "N/A"}
          </TableCell>
        )}

        {/* Updated At Column */}
        {isVisible('updated_at') && (
          <TableCell className="text-sm text-gray-600">
            {entity.updated_at
              ? new Date(entity.updated_at).toLocaleDateString()
              : "N/A"}
          </TableCell>
        )}

        {/* Actions column will be added automatically */}
      </>
    ),
  };

  // Plant filter now handled automatically by GenericEntityPage
  const configWithPlantFilter: EntityConfig = {
    ...userConfig,
    enablePlantFilter: true,
  };

  return <GenericEntityPage config={configWithPlantFilter} />;
};
