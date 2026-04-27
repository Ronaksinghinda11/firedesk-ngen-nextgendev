/**
 * Manager Technicians Page
 * 
 * UI Structure matches Admin UsersPage for consistent experience:
 * - Basic Information: Name, Phone, Email, Password (5-col grid)
 * - Role Details: Technician Assignment (same fields as Admin)
 * 
 * Uses GenericEntityPage with 'sections' layout
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import { api } from '@/lib/api';
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { TableCell } from '@/components/ui/table';
import { Entity } from '@/types/permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Wrench } from 'lucide-react';
import { vendorService, type Vendor } from '@/services/vendor.service';

interface Plant {
  id: string;
  plantName: string;
}

interface Category {
  id: string;
  categoryName: string;
  category_name?: string;
}

interface Manager {
  id: string;
  user: {
    name: string;
  };
  plants?: any[];
}

interface Role {
  id: string;
  name: string;
}

export default function ManagerTechnicians() {
  const { user } = useAuth();
  const { selectedPlantId } = usePlantFilter();
  const [assignedPlantIds, setAssignedPlantIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);

  useEffect(() => {
    loadManagerData();
  }, []);

  const loadManagerData = async () => {
    try {
      setLoading(true);
      console.log('👷 Loading manager data for technicians...');

      const managerResponse: any = await api.get('/manager');
      const managersData = managerResponse.allManager || managerResponse.managers || [];
      const currentManager = managersData.find((m: any) => m.userId === user?.id);

      if (currentManager && currentManager.plants && currentManager.plants.length > 0) {
        const plantIds = currentManager.plants.map((p: any) => p.id);
        setAssignedPlantIds(plantIds);
      } else {
        // Fallback: fetch all plants if no specific manager record found (prevents empty list)
        console.warn('⚠️ No plants assigned to manager - checking direct plant access');
        try {
          const plantsResponse: any = await api.get('/plants');
          const allPlants = plantsResponse.plants || plantsResponse.allPlants || [];
          if (allPlants.length > 0) {
            const allPlantIds = allPlants.map((p: any) => p.id);
            setAssignedPlantIds(allPlantIds);
          }
        } catch (e) {
          console.error('Error in fallback plant fetch:', e);
        }
      }

      await loadReferenceData();
    } catch (error) {
      console.error('❌ Error loading manager data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    // Load plants
    try {
      setLoadingPlants(true);
      const plantsResponse: any = await api.get('/plants');
      setPlants(plantsResponse?.plants || plantsResponse?.allPlants || []);
    } catch (e) {
      console.error('Failed to load plants', e);
    } finally {
      setLoadingPlants(false);
    }

    // Load categories
    try {
      setLoadingCategories(true);
      const categoriesResponse: any = await api.get('/master-data/categories/active');
      setCategories(categoriesResponse?.activeCategories || categoriesResponse?.categories || []);
    } catch (e) {
      console.error('Failed to load categories', e);
    } finally {
      setLoadingCategories(false);
    }

    // Load managers
    try {
      setLoadingManagers(true);
      // Use standard /managers endpoint
      const managersResponse: any = await api.get('/managers');
      const rawManagers = managersResponse?.managers || [];

      // Transform and filter active managers
      const formattedManagers = rawManagers
        .filter((m: any) => m.user?.status === 'Active')
        .map((m: any) => ({
          ...m,
          plants: m.plant_assignments?.map((pa: any) => ({ id: pa.plant_id })) || []
        }));

      setManagers(formattedManagers);
    } catch (e) {
      console.error('Failed to load managers', e);
    } finally {
      setLoadingManagers(false);
    }

    // Load roles
    try {
      const rolesResponse: any = await api.get('/roles');
      setRoles(rolesResponse?.roles || []);
    } catch (e) {
      console.error('Failed to load roles', e);
    }

    // Load vendors
    try {
      setLoadingVendors(true);
      const vendorsResponse = await vendorService.getActiveVendors();
      setVendors(vendorsResponse?.vendors || []);
    } catch (e) {
      console.error('Failed to load vendors', e);
    } finally {
      setLoadingVendors(false);
    }
  };

  const technicianConfig: EntityConfig = {
    entityName: 'Technician',
    entityNamePlural: 'Technicians',
    // Use /technicians for full CRUD operations (supports all technician fields)
    apiEndpoint: '/technicians',
    customFetchAll: async () => {
      try {
        const response: any = await api.get('/users');
        const users = response.users || response.data?.users || [];

        // Filter for users with Technician role
        const technicians = users.filter((user: any) =>
          user.role?.name === 'Technician' || user.role?.name?.toLowerCase() === 'technician'
        );

        console.log(`📋 Fetched ${users.length} users, filtered to ${technicians.length} technicians`);

        // Transform to match expected technician format
        // IMPORTANT: id must be technician_id for /technicians endpoint CRUD
        return {
          technicians: technicians.map((user: any) => ({
            id: user.technician_id || user.id, // Use technician_id for /technicians endpoint
            technicianId: user.technician_id,
            userId: user.id,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
            name: user.name,
            email: user.email,
            phone: user.phone,
            technicianType: user.technician_type || 'In House',
            technician_type: user.technician_type || 'In House',
            technicianCode: user.technician_code || user.technicianCode || 'N/A',
            experience: user.experience,
            specialization: user.specialization,
            vendorId: user.vendor_id,
            vendor_id: user.vendor_id,
            status: user.status || 'Active',
            plants: (user.plant_ids || []).map((pid: string) => ({ id: pid, plant_id: pid })),
            plant_assignments: (user.plant_ids || []).map((pid: string) => ({ plant_id: pid })),
            plant_ids: user.plant_ids || [],
            plant_manager_pairs: user.plant_manager_pairs || [],
            category_ids: user.category_ids || [],
            categories: (user.category_ids || []).map((cid: string) => ({ id: cid })),
          })),
          total: technicians.length
        };
      } catch (error) {
        console.error('❌ Error fetching technicians via /users:', error);
        return { technicians: [], total: 0 };
      }
    },
    // Use 'technicians' response key because customFetchAll returns { technicians: [...] }
    responseKey: 'technicians',

    permissionEntity: Entity.TECHNICIANS,
    enforcePermissions: true,

    supportsArchive: true,
    archiveStatusValue: 'Inactive',
    archiveFields: ['status'], // Only send status for archive (minimal payload)
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'bulkActions', 'history'],
    // Sections layout like Admin UsersPage
    formLayout: "sections",
    transformData: (formData: any) => {
      // ARCHIVE/RESTORE OPERATION: If only status is being set (no name/email/phone), pass through
      // This happens when GenericEntityPage calls transformData for archive action
      if (formData.status && !formData.name && !formData.email && !formData.phone) {
        console.log("📤 Technician transformData (ARCHIVE/RESTORE):", formData);
        return { status: formData.status }; // Only send status for archive/restore
      }

      // Get Technician role for CREATE (update doesn't need role_id)
      const technicianRole = roles.find(r => r.name === 'Technician' || r.name.toLowerCase() === 'technician');
      const roleId = technicianRole?.id;

      // Build payload with SNAKE_CASE fields (/technicians endpoint expects snake_case)
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        technician_type: formData.technicianType || formData.technician_type || 'In House',
        experience: formData.experience || null,
        specialization: formData.specialization || null,
        status: formData.status || 'Active',
        category_ids: formData.categoryIds || formData.category_ids || [],
      };

      // Handle plant assignments based on technician type
      const techType = formData.technicianType || formData.technician_type || 'In House';
      if (techType === 'Third Party') {
        payload.plant_ids = formData.plantIds || formData.plant_ids || [];
        payload.vendor_id = formData.vendorId || formData.vendor_id || null;
        if (formData.plantManagerPairs && formData.plantManagerPairs.length > 0) {
          payload.plant_manager_pairs = formData.plantManagerPairs.map((pair: any) => ({
            plant_id: pair.plantId || pair.plant_id,
            manager_id: pair.managerId || pair.manager_id || null
          }));
        }
      } else {
        // In House: single plant
        payload.plant_id = formData.plantId || formData.plant_id || null;
        if (formData.managerId || formData.manager_id) {
          payload.manager_id = formData.managerId || formData.manager_id;
        }
      }

      // CREATE MODE: Add role_id and password (required for user creation)
      if (!formData.id) {
        if (!roleId) {
          console.error("❌ Technician role not found in roles:", roles);
        }
        payload.role_id = roleId;
        if (formData.password) {
          payload.password = formData.password;
        }
        console.log("📤 Technician transformData (CREATE):", payload);
      } else {
        console.log("📤 Technician transformData (UPDATE):", payload);
      }

      return payload;
    },
    formSections: [
      { id: "basicInfo", title: "Basic Information", maxWidth: "w-full" },
      { id: "roleSpecific", title: "Role Details", maxWidth: "max-w-2xl" },
    ],

    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'text', required: true }, // Required for /users endpoint (type 'text' for EntityConfig compatibility)
      { name: 'phone', label: 'Phone', type: 'text', required: true },
      { name: 'technicianType', label: 'Type', type: 'text' },
    ],

    transformResponse: (response: any) => {
      let techniciansData = [];
      if (Array.isArray(response.technicians)) techniciansData = response.technicians;
      else if (Array.isArray(response.data?.technicians)) techniciansData = response.data.technicians;


      const filtered = techniciansData.filter((tech: any) => {
        // 1. Filter by Global Plant Filter (selectedPlantId)
        if (selectedPlantId && selectedPlantId !== 'all') {
          const techPlantId = tech.plantId || tech.plant_id;
          const techPlants = tech.plants || tech.plant_assignments || [];

          const hasDirectPlant = techPlantId === selectedPlantId;
          const hasAssignedPlant = techPlants.some((p: any) => (p.plantId || p.plant_id || p.id || p) === selectedPlantId);

          if (!hasDirectPlant && !hasAssignedPlant) return false;
        }

        // 2. Filter by Manager's Assigned Plants (if no global filter or for extra security)
        // If the manager has assigned plants, they should only see techs in those plants
        if (assignedPlantIds.length > 0) {
          const techPlantId = tech.plantId || tech.plant_id;
          const techPlants = tech.plants || tech.plant_assignments || [];

          const isInAssignedDirectly = techPlantId && assignedPlantIds.includes(techPlantId);
          const isInAssignedList = techPlants.some((p: any) => {
            const pId = p.plantId || p.plant_id || p.id;
            return pId && assignedPlantIds.includes(pId);
          });

          if (!isInAssignedDirectly && !isInAssignedList) return false;
        }

        return true;
      });

      console.log(`✅ Filtered from ${techniciansData.length} to ${filtered.length} technicians`);

      return {
        ...response,
        technicians: filtered.map((item: any) => ({
          id: item.id,
          name: item.user?.name || 'Unknown',
          technicianId: item.technicianId,
          userId: item.userId,
          email: item.user?.email || 'N/A',
          phone: item.user?.phone || 'N/A',
          plants: (item.plant_ids || item.plants || []).map((pid: any) => {
            const id = typeof pid === 'object' ? (pid.id || pid.plant_id) : pid;
            const plantDef = plants.find(p => p.id === id);
            return {
              id: id,
              plantName: plantDef?.plantName || 'Unknown Plant',
              name: plantDef?.plantName // Fallback for some generic views
            };
          }),
          technicianType: item.technicianType || item.technician_type || 'In House',
          technicianCode: item.technicianCode || item.technician_code || 'N/A',
          vendor: item.vendor,
          vendorId: item.vendorId || item.vendor?.id,
          specialization: item.specialization,
          experience: item.experience,
          status: item.status || 'Active',
          plantManagerPairs: item.plant_manager_pairs || [],
          categoryIds: item.category_ids || item.categories?.map((c: any) => c.id) || [],
        }))
      };
    },

    getInitialFormData: (entity?: any) => {
      if (!entity) return { technicianType: 'In House', status: 'Active' };

      const formData: any = {
        id: entity.id,
        name: entity.name,
        email: entity.email,
        phone: entity.phone,
        technicianType: entity.technicianType || 'In House',
        vendorId: entity.vendorId || entity.vendor?.id || '',
        experience: entity.experience || '',
        specialization: entity.specialization || '',
        status: entity.status || 'Active',
      };

      // Handle plant associations based on technicianType
      if (formData.technicianType === 'In House') {
        // Try direct plantId first, then from plants array
        formData.plantId = entity.plantId || entity.plant_id;
        // plants array item could be object or ID
        if (!formData.plantId && entity.plants && entity.plants.length > 0) {
          const p = entity.plants[0];
          formData.plantId = p.id || p.plant_id || p;
        }
      } else {
        formData.plantIds = entity.plants?.map((p: any) => p.id || p.plant_id || p) || [];
      }

      formData.categoryIds = entity.categoryIds || entity.categories?.map((c: any) => c.id) || [];

      // Normalize plantManagerPairs to camelCase
      const rawPairs = entity.plantManagerPairs || entity.plant_manager_pairs || [];
      formData.plantManagerPairs = rawPairs.map((pair: any) => ({
        plantId: pair.plantId || pair.plant_id,
        managerId: pair.managerId || pair.manager_id
      }));

      return formData;
    },

    renderWizardStep: (step: string, formData: any, setFormData: any) => {
      switch (step) {
        case 'basicInfo':
          // 4-column grid: Name, Phone, Email, Password (no Status - use archive)
          return (
            <div className="space-y-3 w-full">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                {/* 1. Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    className="h-9 text-sm"
                    required
                  />
                </div>

                {/* 2. Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-medium text-gray-700">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: value });
                    }}
                    placeholder="10-digit phone"
                    className="h-9 text-sm"
                    maxLength={10}
                    required
                  />
                </div>

                {/* 3. Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email"
                    className="h-9 text-sm"
                    required
                  />
                </div>

                {/* 4. Password (create only) */}
                {!formData.id && (
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium text-gray-700">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Password"
                        className="h-9 text-sm pr-8"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-9 w-9 px-2 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );

        case 'roleSpecific':
          // Technician Assignment section - matching Admin UsersPage
          return (
            <div className="space-y-4 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <Wrench className="h-4 w-4 text-slate-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Technician Assignment</h3>
              </div>

              {/* Row 1: Technician Type + Vendor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">
                    Technician Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.technicianType || 'In House'}
                    onValueChange={(value: 'In House' | 'Third Party') => {
                      setFormData({
                        ...formData,
                        technicianType: value,
                        plantId: value === 'In House' ? formData.plantId : undefined,
                        plantIds: value === 'Third Party' ? formData.plantIds : [],
                        plantManagerPairs: [],
                      });
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

                {formData.technicianType === 'Third Party' && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      Select Vendor <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.vendorId || ''}
                      onValueChange={(value) => setFormData({ ...formData, vendorId: value })}
                      disabled={loadingVendors}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={loadingVendors ? 'Loading...' : 'Select vendor'} />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.technicianType === 'In House' && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      Plant <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.plantId || ''}
                      onValueChange={(value) => setFormData({ ...formData, plantId: value, plantManagerPairs: [] })}
                      disabled={loadingPlants}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={loadingPlants ? 'Loading...' : 'Select plant'} />
                      </SelectTrigger>
                      <SelectContent>
                        {plants
                          .filter(p => assignedPlantIds.includes(p.id))
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.plantName}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Manager for In House */}
              {formData.technicianType === 'In House' && formData.plantId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      Manager <span className="text-gray-500 text-[10px]">(optional)</span>
                    </Label>
                    <Select
                      value={(() => {
                        const pair = (formData.plantManagerPairs || []).find((p: any) => p.plantId === formData.plantId);
                        return pair?.managerId || 'none';
                      })()}
                      onValueChange={(value) => {
                        if (value === 'none') {
                          setFormData({ ...formData, plantManagerPairs: [] });
                        } else {
                          setFormData({ ...formData, plantManagerPairs: [{ plantId: formData.plantId, managerId: value }] });
                        }
                      }}
                      disabled={loadingManagers}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {managers
                          .filter((m: any) =>
                            !formData.plantId ||
                            m.plants?.some((p: any) => p.id === formData.plantId)
                          )
                          .map((m: any) => (
                            <SelectItem key={m.id} value={m.id}>{m.user?.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Plants for Third Party */}
              {formData.technicianType === 'Third Party' && (
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
                                const current = formData.plantIds || [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, plantIds: [...current, plant.id] });
                                } else {
                                  setFormData({ ...formData, plantIds: current.filter((id: string) => id !== plant.id) });
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`plant-${plant.id}`} className="text-sm text-gray-700 cursor-pointer">
                              {plant.plantName}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {(formData.plantIds && formData.plantIds.length > 0) && (
                    <p className="text-xs text-gray-500">{formData.plantIds.length} plant{formData.plantIds.length !== 1 ? 's' : ''} selected</p>
                  )}

                  {/* Manager per Plant */}
                  {formData.plantIds && formData.plantIds.length > 0 && (
                    <div className="space-y-1.5 border-t pt-2 mt-2">
                      <Label className="text-xs font-medium text-gray-700">
                        Assign Manager per Plant <span className="text-gray-500">(optional)</span>
                      </Label>
                      <p className="text-xs text-gray-500">Select one manager for each plant. Only managers assigned to each plant are shown.</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {formData.plantIds.map((plantId: string) => {
                          const plant = plants.find((p) => p.id === plantId);
                          const managersForPlant = managers.filter((m: any) => m.plants?.some((p: any) => p.id === plantId));
                          const currentPair = (formData.plantManagerPairs || []).find((pair: any) => pair.plantId === plantId);

                          return (
                            <div key={plantId} className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg bg-white">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700">{plant?.plantName}</p>
                              </div>
                              <div className="flex-1">
                                <Select
                                  value={currentPair?.managerId || 'none'}
                                  onValueChange={(value) => {
                                    const pairs = formData.plantManagerPairs || [];
                                    const existingIdx = pairs.findIndex((p: any) => p.plantId === plantId);
                                    let newPairs;
                                    if (value === 'none') {
                                      newPairs = pairs.filter((p: any) => p.plantId !== plantId);
                                    } else if (existingIdx >= 0) {
                                      newPairs = [...pairs];
                                      newPairs[existingIdx] = { plantId, managerId: value };
                                    } else {
                                      newPairs = [...pairs, { plantId, managerId: value }];
                                    }
                                    setFormData({ ...formData, plantManagerPairs: newPairs });
                                  }}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select manager" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {managersForPlant.map((m: any) => (
                                      <SelectItem key={m.id} value={m.id}>{m.user?.name}</SelectItem>
                                    ))}
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

              {/* Categories */}
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
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`category-${category.id}`}
                            checked={(formData.categoryIds || []).includes(category.id)}
                            onChange={(e) => {
                              const current = formData.categoryIds || [];
                              if (e.target.checked) {
                                setFormData({ ...formData, categoryIds: [...current, category.id] });
                              } else {
                                setFormData({ ...formData, categoryIds: current.filter((id: string) => id !== category.id) });
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={`category-${category.id}`} className="text-sm text-gray-700 cursor-pointer">
                            {category.categoryName || category.category_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Experience and Specialization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">Experience</Label>
                  <Input
                    value={formData.experience || ''}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g., 5 years"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">Specialization</Label>
                  <Input
                    value={formData.specialization || ''}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="e.g., Electrical Systems"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          );

        default:
          return null;
      }
    },

    // onWizardSubmit is used when wizardSteps.length > 0
    // This handles the actual form submission with proper validation
    onWizardSubmit: async (formData: any) => {
      // 1. Validation
      if (!formData.name || !formData.email || !formData.phone) {
        throw new Error('Please fill in all required fields (Name, Email, Phone)');
      }

      // Allow missing password for edit mode
      if (!formData.id && !formData.password && formData.status !== 'Inactive') {
        throw new Error('Password is required for new technicians');
      }

      if (formData.technicianType === 'Third Party') {
        if (!formData.vendorId) throw new Error('Vendor is required for Third Party technicians');
        if (!formData.plantIds || formData.plantIds.length === 0) throw new Error('At least one plant is required for Third Party technicians');
      } else {
        if (!formData.plantId) throw new Error('Plant is required for In House technicians');
      }

      // UPDATE MODE: Backend /users/:id PUT only accepts { name, email, phone, status }
      if (formData.id) {
        const updatePayload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status || 'Active',
        };

        console.log('📤 Updating technician (limited fields):', updatePayload);
        await api.put(`/users/${formData.id}`, updatePayload);
        return; // Early return for update
      }

      // CREATE MODE: Full payload with all technician-specific fields (snake_case for backend)
      // Get Technician Role
      let technicianRole = roles.find(r => r.name.toLowerCase() === 'technician');

      if (!technicianRole) {
        console.log('📡 Technician role not in state, fetching from API...');
        try {
          const rolesResponse: any = await api.get('/roles');
          const allRoles = rolesResponse?.roles || [];
          technicianRole = allRoles.find((r: any) => r.name.toLowerCase() === 'technician');
        } catch (err) {
          console.error('❌ Failed to fetch roles:', err);
        }
      }

      if (!technicianRole?.id) {
        throw new Error('Technician role not found in system. Please contact admin.');
      }

      // Prepare CREATE payload with SNAKE_CASE fields (backend uses snake_case in create)
      const createPayload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role_id: technicianRole.id, // Backend expects snake_case for create
        technician_type: formData.technicianType || 'In House',
        experience: formData.experience || null,
        specialization: formData.specialization || null,
        status: 'Active',
        category_ids: formData.categoryIds || [],
      };

      if (formData.technicianType === 'Third Party') {
        createPayload.plant_ids = formData.plantIds || [];
        createPayload.vendor_id = formData.vendorId || null;
        // Convert plantManagerPairs to snake_case format
        if (formData.plantManagerPairs && formData.plantManagerPairs.length > 0) {
          createPayload.plant_manager_pairs = formData.plantManagerPairs.map((pair: any) => ({
            plant_id: pair.plantId || pair.plant_id,
            manager_id: pair.managerId || pair.manager_id || null
          }));
        }
      } else {
        createPayload.plant_id = formData.plantId || null;
        // For In House, extract manager if specified
        if (formData.managerId) {
          createPayload.manager_id = formData.managerId;
        } else if (formData.plantManagerPairs && formData.plantManagerPairs.length > 0) {
          createPayload.manager_id = formData.plantManagerPairs[0]?.managerId || formData.plantManagerPairs[0]?.manager_id || null;
        }
      }

      console.log('📤 Creating technician via /users:', JSON.stringify(createPayload, null, 2));
      await api.post('/users', createPayload);
    },

    // Define filterAttributes for Generic functionality (Columns/Filters)
    // Define filterAttributes for Generic functionality (Columns/Filters)
    filterAttributes: [
      { id: 'technicianCode', label: 'ID', type: 'text', sortable: true, sticky: true },
      { id: 'name', label: 'Name', type: 'text', sortable: true },
      { id: 'email', label: 'Email', type: 'text', sortable: true },
      { id: 'phone', label: 'Phone', type: 'text', sortable: true },
      { id: 'technicianType', label: 'Type', type: 'select', options: ['In House', 'Third Party'], sortable: true },
      { id: 'plants', label: 'Plants', type: 'text', sortable: false },
      { id: 'specialization', label: 'Specialization', type: 'text', sortable: true },
      { id: 'experience', label: 'Experience', type: 'text', sortable: true },

    ],

    customColumns: (entity: any, isVisible?: (id: string) => boolean) => {
      const checkVisible = isVisible || (() => true);
      return (
        <>
          {/* ID */}
          {checkVisible('technicianCode') && (
            <TableCell className="font-medium whitespace-nowrap sticky left-0 z-30 bg-white shadow-[1px_0_0_0_#f3f4f6]">
              {entity.technicianCode || '-'}
            </TableCell>
          )}

          {/* Name */}
          {checkVisible('name') && (
            <TableCell className="font-medium whitespace-nowrap">
              {entity.name}
            </TableCell>
          )}

          {/* Email */}
          {checkVisible('email') && (
            <TableCell>
              {entity.email}
            </TableCell>
          )}

          {/* Phone */}
          {checkVisible('phone') && (
            <TableCell className="whitespace-nowrap">
              {entity.phone || '-'}
            </TableCell>
          )}

          {/* Type */}
          {checkVisible('technicianType') && (
            <TableCell className="whitespace-nowrap">
              {entity.technicianType}
            </TableCell>
          )}

          {/* Plants - Text only, no badges */}
          {checkVisible('plants') && (
            <TableCell className="max-w-[200px] truncate" title={entity.plants?.map((p: any) => p.plantName || p.plant_name).join(', ')}>
              {entity.plants?.length > 0
                ? entity.plants.map((p: any) => p.plantName || p.plant_name).join(', ')
                : '-'}
            </TableCell>
          )}

          {/* Specialization */}
          {checkVisible('specialization') && (
            <TableCell className="whitespace-nowrap">
              {entity.specialization || '-'}
            </TableCell>
          )}

          {/* Experience */}
          {checkVisible('experience') && (
            <TableCell className="whitespace-nowrap">
              {entity.experience || '-'}
            </TableCell>
          )}

          {/* Status - Text only, no badges */}
          {checkVisible('status') && (
            <TableCell className="whitespace-nowrap">
              <span className={entity.status === 'Active' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                {entity.status}
              </span>
            </TableCell>
          )}
        </>
      )
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <GenericEntityPage config={technicianConfig} />
  );
}
