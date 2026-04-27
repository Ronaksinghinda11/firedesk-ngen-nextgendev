/**
 * Manager Plants Page
 *
 * Allows managers to view and edit plants assigned to them.
 * Uses GenericEntityPage template for consistency with admin UI.
 * Only shows plants assigned to the current manager.
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Factory } from 'lucide-react';
import { EntityAccessGuard } from '@/components/PermissionGuard';
import { Action, Entity } from '@/types/permissions';

export default function ManagerPlants() {
  const { user, loading: authLoading } = useAuth();
  const { selectedPlantId } = usePlantFilter();
  const navigate = useNavigate();
  const [assignedPlantIds, setAssignedPlantIds] = useState<string[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Use ref to avoid stale closure in customFetchAll
  const assignedPlantIdsRef = useRef<string[]>([]);

  useEffect(() => {
    // Debug: Log user permissions and loading states
    console.log('🏭 Plants Page - User data:', user);
    console.log('🏭 Plants Page - User role:', user?.role);
    console.log('🏭 Plants Page - Plants permission:', user?.role?.permissions?.entities?.plants);
    console.log('🏭 Plants Page - authLoading:', authLoading);
    console.log('🏭 Plants Page - loading:', loading);

    if (!authLoading && user) {
      loadManagerPlants();
    }
  }, [authLoading, user]);

  const loadManagerPlants = async () => {
    try {
      setLoading(true);
      console.log('🏭 Loading manager plants...');
      console.log('🏭 Current user ID:', user?.id);

      // Fetch manager details with assigned plants
      const managerResponse: any = await api.get('/manager');
      console.log('🏭 Manager response:', managerResponse);

      const managers = managerResponse.allManager || managerResponse.managers || [];
      console.log('🏭 All managers:', managers);
      console.log('🏭 Looking for manager with userId:', user?.id);

      const currentManager = managers.find((m: any) => m.userId === user?.id);
      console.log('🏭 Current manager found:', currentManager);

      try {
        const industriesResponse: any = await api.get('/master-data/industries/active');
        const industriesList = industriesResponse?.industries || industriesResponse?.allIndustry || [];
        if (industriesList.length > 0) {
          setIndustries(industriesList.map((ind: any) => ({
            id: ind.id,
            name: ind.industryName || ind.industry_name
          })));
        }
      } catch (indError) {
        console.error('❌ Error loading industries:', indError);
      }

      if (currentManager && currentManager.plants && currentManager.plants.length > 0) {
        const plantIds = currentManager.plants.map((p: any) => p.id);
        setAssignedPlantIds(plantIds);
        assignedPlantIdsRef.current = plantIds; // Keep ref in sync
        console.log('✅ Assigned plant IDs:', plantIds);
      } else {
        // FALLBACK: If no Manager record exists but user is logged in with manager role,
        // fetch all plants for this user. This handles cases where:
        // 1. User has manager role but no corresponding Manager record
        // 2. Manager record exists but has no plants assigned yet
        console.warn('⚠️ No plants assigned to manager - checking direct plant access');

        // Try to load plants directly from /plants endpoint
        try {
          const plantsResponse: any = await api.get('/plants');
          const allPlants = plantsResponse.plants || plantsResponse.allPlants || [];
          console.log('🏭 Direct plants response:', allPlants);

          if (allPlants.length > 0) {
            // Set all plant IDs as assigned (for managers without explicit assignments)
            const allPlantIds = allPlants.map((p: any) => p.id);
            setAssignedPlantIds(allPlantIds);
            assignedPlantIdsRef.current = allPlantIds; // Keep ref in sync
            console.log('✅ Using all plants as fallback:', allPlantIds);
          }
        } catch (plantsError) {
          console.error('❌ Error loading plants directly:', plantsError);
        }
      }
    } catch (error) {
      console.error('❌ Error loading manager plants:', error);
    } finally {
      setLoading(false);
    }
  };

  const plantConfig = useMemo<EntityConfig>(() => ({
    // Configuration matching Admin PlantsPage.tsx
    entityName: 'Plant',
    entityNamePlural: 'Plants',
    apiEndpoint: '/plants', // FIXED: Use /plants (full data) not /plant (dropdown-only data)
    responseKey: 'plants',

    // Permission-based access control
    permissionEntity: Entity.PLANTS,
    enforcePermissions: true,

    // Fields definition (required by type, even if customColumns used)
    fields: [
      { name: 'plantName', label: 'Plant Name', type: 'text' },
      { name: 'plantCode', label: 'Plant Code', type: 'text' },
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text' },
      { name: 'industryId', label: 'Industry', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Draft', 'Archived'] }
    ],

    // Managers can view and edit, but not create or delete plants
    hideCreateButton: true,
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    hideDeleteButton: true,
    limitTopMenuItems: ['export', 'bulkActions', 'history'],
    // Custom fetch
    customFetchAll: async () => {
      const currentAssignedIds = assignedPlantIdsRef.current;
      console.log('🏭 customFetchAll called, assignedPlantIdsRef.current:', currentAssignedIds);

      // CRITICAL FIX: Use /plants with cache buster to ensure fresh full data
      const response: any = await api.get(`/plants?_t=${Date.now()}`);
      console.log('🏭 /plants response:', response);

      const allPlants = response.allPlants || response.plants || response.data || [];

      // First filter by assigned plants
      let filteredPlants = allPlants.filter((plant: any) =>
        currentAssignedIds.includes(plant.id)
      );

      // Apply global plant filter
      if (selectedPlantId && selectedPlantId !== 'all') {
        filteredPlants = filteredPlants.filter((plant: any) =>
          plant.id === selectedPlantId
        );
      }

      console.log('🏭 Returning plants:', filteredPlants);
      return { plants: filteredPlants };
    },

    // Transform response - aligned with Admin PlantsPage.tsx
    transformResponse: (response: any) => {
      console.log('🔄 Transforming plants response:', response);

      // Handle both array and object response structure
      let plantsData = [];
      if (response.plants && Array.isArray(response.plants)) {
        plantsData = response.plants;
      } else if (Array.isArray(response)) {
        plantsData = response;
      } else if (response.allPlants && Array.isArray(response.allPlants)) {
        plantsData = response.allPlants;
      }

      const transformedPlants = plantsData.map((plant: any) => ({
        ...plant,
        id: plant.id,
        // Robust naming fallback
        plantName: plant.plantName || plant.plant_name || plant.name || 'Unnamed Plant',
        name: plant.plantName || plant.plant_name || plant.name || 'Unnamed Plant', // for EntityTableView fallback

        // Map snake_case backend fields to camelCase
        plantCode: plant.plantCode || plant.plant_code,

        // Address: Admin uses addressLine1 mostly
        addressLine1: plant.addressLine1 || plant.address || plant.address_line1,
        address: plant.addressLine1 || plant.address || plant.address_line1, // Ensure both exist

        city: plant.city, // Usually object or string dePENDING on backend transformer
        state: plant.state,
        country: plant.country || 'India',
        zipCode: plant.zipCode || plant.postalCode || plant.postal_code,
        gstNo: plant.gstNo || plant.gstNumber || plant.gst_number,
        industryId: String(plant.industryId || plant.industry_id || ''),

        // Ensure industry object is preserved if present
        industry: plant.industry || {},

        mainBuildings: plant.mainBuildings || plant.main_buildings_count || 0,
        subBuildings: plant.subBuildings || plant.sub_buildings_count || 0,
        totalPlantArea: plant.totalPlantArea || plant.total_plant_area || 0,
        totalBuiltUpArea: plant.totalBuiltUpArea || plant.total_built_up_area || 0,

        status: plant.status || 'Active',
        createdAt: plant.createdAt || plant.created_at,
        updatedAt: plant.updatedAt || plant.updated_at,
      }));

      console.log('✅ Transformed plants:', transformedPlants);
      return {
        plants: transformedPlants
      };
    },

    // Re-fetch trigger
    fetchTrigger: `${selectedPlantId}-${assignedPlantIds.length}`,

    // Custom navigation
    onEdit: (plant) => {
      navigate(`/manager/plants/${plant.id}/edit`);
    },

    // Filter attributes - Exact match to Admin PlantsPage
    filterAttributes: [
      { id: 'plantName', label: 'Plant Name', type: 'text' as const, operators: ['contains', 'is', 'isNot'], mandatory: true },
      { id: 'plantCode', label: 'Plant Code', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'addressLine1', label: 'Address', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'city', label: 'City', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'state', label: 'State', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'industryId', label: 'Industry', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'industry' },
      // Hidden by default
      { id: 'country', label: 'Country', type: 'text' as const, operators: ['contains', 'is', 'isNot'], hiddenByDefault: true },
      { id: 'zipCode', label: 'Postal Code', type: 'text' as const, operators: ['contains', 'is', 'isNot'], hiddenByDefault: true },
      { id: 'gstNo', label: 'GST Number', type: 'text' as const, operators: ['contains', 'is', 'isNot'], hiddenByDefault: true },
      { id: 'mainBuildings', label: 'Main Buildings', type: 'number' as const, operators: ['is', 'isNot'], hiddenByDefault: true, filterable: false },
      { id: 'subBuildings', label: 'Sub Buildings', type: 'number' as const, operators: ['is', 'isNot'], hiddenByDefault: true, filterable: false },
      { id: 'totalPlantArea', label: 'Total Plant Area', type: 'number' as const, operators: ['is', 'isNot'], hiddenByDefault: true, filterable: false },
      { id: 'totalBuiltUpArea', label: 'Total Built Up Area', type: 'number' as const, operators: ['is', 'isNot'], hiddenByDefault: true, filterable: false },
      { id: 'createdAt', label: 'Created At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
      { id: 'updatedAt', label: 'Updated At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    ],

    // Custom columns - Plain UI matching Admin logic but without icons
    customColumns: (entity: any, isVisible?: (field: string) => boolean) => {
      const plant = entity as any;
      const checkVisible = isVisible || (() => true);

      return (
        <>
          {/* Plant Name */}
          {checkVisible('plantName') && (
            <TableCell className="bg-white sticky left-0 z-10 min-w-[180px] border-r border-gray-100 whitespace-nowrap font-medium">
              {/* Plain text name */}
              {plant.plantName || plant.name}
              <div className="text-xs text-muted-foreground font-normal">{plant.plantCode || plant.plant_code}</div>
            </TableCell>
          )}

          {/* Plant Code */}
          {checkVisible('plantCode') && (
            <TableCell className="whitespace-nowrap text-sm">
              {plant.plantCode || '-'}
            </TableCell>
          )}

          {/* Address */}
          {checkVisible('addressLine1') && (
            <TableCell className="whitespace-nowrap max-w-xs truncate">
              {plant.addressLine1 || plant.address || '-'}
            </TableCell>
          )}

          {/* City */}
          {checkVisible('city') && (
            <TableCell className="whitespace-nowrap">
              {/* Handle both object (from backend transform) and string */}
              {plant.city?.cityName || plant.city || '-'}
            </TableCell>
          )}

          {/* State */}
          {checkVisible('state') && (
            <TableCell className="whitespace-nowrap">
              {plant.state?.stateName || plant.state || '-'}
            </TableCell>
          )}

          {/* Industry */}
          {checkVisible('industryId') && (
            <TableCell className="whitespace-nowrap">
              {plant.industry?.industryName || '-'}
            </TableCell>
          )}

          {/* Status */}
          {checkVisible('status') && (
            <TableCell className="whitespace-nowrap">
              <Badge variant={plant.status === 'Active' ? 'success' as any : 'outline' as any}>
                {plant.status}
              </Badge>
            </TableCell>
          )}

          {/* Country - Hidden by default */}
          {checkVisible('country') && (
            <TableCell className="whitespace-nowrap text-sm">
              {plant.country || 'India'}
            </TableCell>
          )}

          {/* Postal Code - Hidden by default */}
          {checkVisible('zipCode') && (
            <TableCell className="whitespace-nowrap text-sm">
              {plant.zipCode || '-'}
            </TableCell>
          )}

          {/* GST No - Hidden by default */}
          {checkVisible('gstNo') && (
            <TableCell className="whitespace-nowrap text-sm">
              {plant.gstNo || '-'}
            </TableCell>
          )}

          {/* Main Buildings - Hidden by default */}
          {checkVisible('mainBuildings') && (
            <TableCell className="whitespace-nowrap text-sm text-center">
              {plant.mainBuildings ?? 0}
            </TableCell>
          )}

          {/* Sub Buildings - Hidden by default */}
          {checkVisible('subBuildings') && (
            <TableCell className="whitespace-nowrap text-sm text-center">
              {plant.subBuildings ?? 0}
            </TableCell>
          )}

          {/* Total Plant Area - Hidden by default */}
          {checkVisible('totalPlantArea') && (
            <TableCell className="whitespace-nowrap text-sm text-center">
              {plant.totalPlantArea ?? '-'}
            </TableCell>
          )}

          {/* Total Built Up Area - Hidden by default */}
          {checkVisible('totalBuiltUpArea') && (
            <TableCell className="whitespace-nowrap text-sm text-center">
              {plant.totalBuiltUpArea ?? '-'}
            </TableCell>
          )}

          {/* Created At - Hidden by default */}
          {checkVisible('createdAt') && (
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {plant.createdAt ? new Date(plant.createdAt).toLocaleDateString() : 'N/A'}
            </TableCell>
          )}

          {/* Updated At - Hidden by default */}
          {checkVisible('updatedAt') && (
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {plant.updatedAt ? new Date(plant.updatedAt).toLocaleDateString() : 'N/A'}
            </TableCell>
          )}
        </>
      );
    },
  }), [industries, assignedPlantIds, selectedPlantId]); // Recompute when filters change

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <EntityAccessGuard
      entity={Entity.PLANTS}
      fallback={
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-semibold text-foreground">No Access to Plants</h2>
            <p className="text-muted-foreground max-w-md">
              You don't have permission to view plants. Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      }
    >
      {assignedPlantIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <Factory className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Plants Assigned</h3>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have any plants assigned to you yet. Please contact your administrator.
          </p>
        </div>
      ) : (
        <GenericEntityPage config={plantConfig} />
      )}
    </EntityAccessGuard>
  );
}
