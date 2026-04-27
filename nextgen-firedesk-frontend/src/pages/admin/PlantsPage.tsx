import React, { useEffect, useState, useMemo } from 'react';
import GenericEntityPage from '@/components/generic/GenericEntityPage';
import { EntityConfig } from '@/components/generic/GenericEntityPage';
import { Badge } from '@/components/ui/badge';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Building2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { OrganizationForm } from '@/components/organization-form/OrganizationForm';
import { organizationService } from '@/services/organization.service';
import { Organization } from '@/types/organization.types';
import { useToast } from '@/hooks/use-toast';
import { Entity, Action } from '@/types/permissions';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import { usePermissions } from '@/hooks/usePermissions';

// ... your existing interfaces and helper functions ...

export default function PlantsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedPlantId } = usePlantFilter();
  const { hasPermission } = usePermissions();
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [managers, setManagers] = useState([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isOrganizationDialogOpen, setIsOrganizationDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        setIsLoading(true);

        // Fetch states
        const statesResponse: any = await api.get('/state');
        if (statesResponse?.states) {
          setStates(statesResponse.states.map((state: any) => ({
            id: state.id,
            name: state.stateName
          })));
        }

        // Fetch cities
        const citiesResponse: any = await api.get('/city');
        if (citiesResponse?.cities) {
          setCities(citiesResponse.cities.map((city: any) => ({
            id: city.id,
            name: city.cityName
          })));
        }

        // Fetch industries
        const industriesResponse: any = await api.get('/master-data/industries/active');
        const industriesList = industriesResponse?.industries || industriesResponse?.allIndustry || [];
        if (industriesList.length > 0) {
          setIndustries(industriesList.map((industry: any) => ({
            id: industry.id,
            name: industry.industryName || industry.industry_name
          })));
        }

        // Fetch managers
        const managersResponse: any = await api.get('/manager');
        if (managersResponse?.managers) {
          setManagers(managersResponse.managers.map((manager: any) => ({
            id: manager.id,
            name: manager.user?.name || manager.managerId
          })));
        }

        // Fetch Organization
        try {
          const orgResponse = await organizationService.getOrganization();
          if ((orgResponse as any).success && (orgResponse as any).data) { // Type casting to bypass strict checks if needed
            setOrganization((orgResponse as any).data);
          }
        } catch (error: any) {
          // Silently fail - it's okay if there's no organization yet
          console.log('No organization found or error:', error);
        }
      } catch (error) {
        console.error('Error fetching reference data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferenceData();
  }, []);

  const handleOrganizationSuccess = (updatedOrganization: Organization) => {
    setOrganization(updatedOrganization);
    setIsOrganizationDialogOpen(false);
    toast({
      title: 'Success',
      description: organization ? 'Organization updated successfully' : 'Organization created successfully',
    });
  };

  const handleCreatePlant = () => {
    if (!organization) {
      toast({
        title: 'Organization Required',
        description: 'Please create an Organization before adding individual plants.',
        variant: 'destructive',
      });
      return;
    }
    navigate('/admin/plants/create');
  };

  const plantsConfig = useMemo<EntityConfig>(() => ({
    entityName: 'Plant',
    entityNamePlural: 'Plants',
    apiEndpoint: '/plants', // Changed to /plants
    responseKey: 'plants',

    // Switch to sections layout for professional card UI
    formLayout: "sections",
    formSections: [
      {
        id: "basicInfo",
        title: "Basic Information",
        description: "General details about the plant",
        fields: ["plantName", "industryId", "status", "gstNo"]
      },
      {
        id: "location",
        title: "Location Details",
        description: "Address and location information",
        fields: ["address", "stateId", "cityId", "zipCode"]
      },
      {
        id: "management",
        title: "Management",
        description: "Assign responsible managers",
        fields: ["managerIds"]
      }
    ],

    // Check permissions
    // Note: headerActions closes over this scope, so it can use these variables
    permissionEntity: Entity.PLANTS,
    enforcePermissions: true,

    // Plant filter support - enabled to allow server-side filtering by id/plantId
    enablePlantFilter: true,

    // Filter attributes for sorting and column visibility
    // Default visible columns: Plant Name, Plant Code, Address, City, State, Industry, Status
    // Hidden columns: Country, Postal Code, GST Number, Main Buildings, Sub Buildings, Plant Area, Built Up Area, Created At, Updated At
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

    // Configure fields for archive/restore operations
    archiveFields: ['plantName', 'address', 'stateId', 'cityId', 'industryId', 'managerIds', 'zipCode', 'status'],
    supportsArchive: false,
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'bulkActions', 'history'],
    archiveStatusValue: 'Archived',

    // Removed hideCreateButton: true - let permissions control button visibility

    fields: [
      {
        name: 'plantName',
        label: 'Plant Name',
        type: 'text',
        required: true
      },
      {
        name: 'address',
        label: 'Address',
        type: 'textarea',
        required: true
      },
      {
        name: 'stateId',
        label: 'State',
        type: 'select',
        required: true,
        referenceData: states
      },
      {
        name: 'cityId',
        label: 'City',
        type: 'select',
        required: true,
        referenceData: cities
      },
      {
        name: 'industryId',
        label: 'Industry',
        type: 'select',
        required: true,
        referenceData: industries
      },
      {
        name: 'managerIds',
        label: 'Managers',
        type: 'select',
        required: false,
        referenceData: managers
      },
      {
        name: 'zipCode',
        label: 'Zip Code',
        type: 'text',
        required: false
      },
      {
        name: 'gstNo',
        label: 'GST No',
        type: 'text',
        required: false
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: ['Active', 'Archived', 'Draft'],
        required: true
      }
    ],

    transformResponse: (response: any) => {
      console.log('🔄 Transforming plants response:', response);

      // Handle both array and object response structure
      let plantsData = [];
      if (response.plants && Array.isArray(response.plants)) {
        plantsData = response.plants;
      } else if (Array.isArray(response)) {
        plantsData = response;
      }

      if (plantsData.length > 0) {
        const transformedPlants = plantsData.map((plant: any) => ({
          ...plant,
          id: plant.id,
          name: plant.plant_name || plant.plantName || plant.name || 'Unnamed Plant',
          // Map snake_case backend fields to the same keys for consistency
          plant_name: plant.plant_name || plant.plantName,
          plant_code: plant.plant_code || plant.plantCode,
          address_line1: plant.address_line1 || plant.address,
          city: plant.city,
          state: plant.state,
          country: plant.country || 'India',
          postal_code: plant.postal_code || plant.postalCode || plant.zipCode,
          gst_number: plant.gst_number || plant.gstNumber || plant.gstNo,
          industryId: String(plant.industry_id || plant.industryId || ''),
          industry_id: plant.industry_id || plant.industryId,
          industry: plant.industry,
          organization_id: plant.organization_id || plant.organizationId,
          mainBuildings: plant.mainBuildings || plant.main_buildings_count || 0,
          subBuildings: plant.subBuildings || plant.sub_buildings_count || 0,
          totalPlantArea: plant.totalPlantArea || plant.total_plant_area || 0,
          totalBuiltUpArea: plant.totalBuiltUpArea || plant.total_built_up_area || 0,
          status: plant.status || 'Active',
          created_at: plant.created_at || plant.createdAt,
          updated_at: plant.updated_at || plant.updatedAt,
        }));

        console.log('✅ Transformed plants:', transformedPlants);
        return {
          plants: transformedPlants
        };
      }

      return response;
    },

    customColumns: (entity: any, isVisible: (field: string) => boolean) => {
      // Cast to any to access dynamic properties
      const plant = entity as any;

      return (
        <>
          {/* Plant Name - Sticky */}
          {isVisible('plantName') && (
            <TableCell className="bg-white md:sticky md:left-0 z-10 min-w-[180px] md:border-r border-gray-100 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-medium text-xs flex-shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{plant.plantName || plant.name}</p>
                </div>
              </div>
            </TableCell>
          )}

          {/* Plant Code */}
          {isVisible('plantCode') && (
            <TableCell className="whitespace-nowrap text-sm">
              {plant.plantCode || '-'}
            </TableCell>
          )}

          {/* Address */}
          {isVisible('addressLine1') && (
            <TableCell className="whitespace-nowrap">
              {plant.addressLine1 || plant.address || '-'}
            </TableCell>
          )}

          {/* City */}
          {isVisible('city') && (
            <TableCell className="whitespace-nowrap">{plant.city || '-'}</TableCell>
          )}

          {/* State */}
          {isVisible('state') && (
            <TableCell className="whitespace-nowrap">{plant.state || '-'}</TableCell>
          )}

          {/* Industry */}
          {isVisible('industryId') && (
            <TableCell className="whitespace-nowrap">{plant.industry?.industryName || '-'}</TableCell>
          )}

          {/* Status */}
          {isVisible('status') && (
            <TableCell className="whitespace-nowrap">
              <span
                className={`text-xs font-semibold ${plant.status?.toLowerCase() === "active"
                  ? "text-emerald-600"
                  : "text-red-600"
                  }`}
              >
                {plant.status || "Active"}
              </span>
            </TableCell>
          )}

          {/* Country - Hidden by default */}
          {isVisible('country') && (
            <TableCell className="whitespace-nowrap text-sm">
              {plant.country || 'India'}
            </TableCell>
          )}

          {/* Postal Code - Hidden by default */}
          {isVisible('zipCode') && (
            <TableCell className="whitespace-nowrap text-sm">
              {plant.zipCode || '-'}
            </TableCell>
          )}

          {/* GST Number - Hidden by default */}
          {isVisible('gstNo') && (
            <TableCell className="whitespace-nowrap text-sm">
              {plant.gstNo || '-'}
            </TableCell>
          )}

          {/* Main Buildings - Hidden by default */}
          {isVisible('mainBuildings') && (
            <TableCell className="whitespace-nowrap text-sm text-center">
              {plant.mainBuildings ?? 0}
            </TableCell>
          )}

          {/* Sub Buildings - Hidden by default */}
          {isVisible('subBuildings') && (
            <TableCell className="whitespace-nowrap text-sm text-center">
              {plant.subBuildings ?? 0}
            </TableCell>
          )}

          {/* Total Plant Area - Hidden by default */}
          {isVisible('totalPlantArea') && (
            <TableCell className="whitespace-nowrap text-sm">
              {plant.totalPlantArea ? `${plant.totalPlantArea} sq.ft` : '-'}
            </TableCell>
          )}

          {/* Total Built Up Area - Hidden by default */}
          {isVisible('totalBuiltUpArea') && (
            <TableCell className="whitespace-nowrap text-sm">
              {plant.totalBuiltUpArea || plant.totalBuildUpArea ? `${plant.totalBuiltUpArea || plant.totalBuildUpArea} sq.ft` : '-'}
            </TableCell>
          )}

          {/* Created At - Hidden by default */}
          {isVisible('createdAt') && (
            <TableCell className="whitespace-nowrap text-sm text-gray-600">
              {plant.createdAt
                ? new Date(plant.createdAt).toLocaleDateString()
                : "N/A"}
            </TableCell>
          )}

          {/* Updated At - Hidden by default */}
          {isVisible('updatedAt') && (
            <TableCell className="whitespace-nowrap text-sm text-gray-600">
              {plant.updatedAt
                ? new Date(plant.updatedAt).toLocaleDateString()
                : "N/A"}
            </TableCell>
          )}
        </>
      );
    },

    transformData: (formData: any) => {
      console.log('🔄 Transforming form data for API:', formData);

      // SAFETY: If we are Archiving (status 'Archived'), DO NOT send nested arrays.
      // The backend might interpret [] as "delete all", so we strip them out to force a partial update.
      if (formData.status === 'Archived') {
        const { buildings, entrances, dieselGenerators, fireSafetyForms, complianceForms, ...safeData } = formData;
        console.log('🛡️ Sanitized Archive Payload:', safeData);
        return safeData;
      }

      // Ensure required fields are present
      if (!formData.status) {
        formData.status = 'Active';
      }

      // Ensure plantName is set
      if (!formData.plantName && formData.name) {
        formData.plantName = formData.name;
      }

      console.log('✅ Transformed API data:', formData);
      return formData;
    },

    // Navigation overrides to use your existing pages
    onCreate: handleCreatePlant,

    onEdit: (plant: any) => {
      navigate(`/admin/plants/${plant.id}/edit`);
    },

    headerActions: () => {
      const canCreate = hasPermission(Entity.PLANTS, Action.CREATE);

      if (!canCreate) return null;

      return (
        <div className="flex gap-2">
          {/* Add Plant Button - Disabled until organization exists */}
          {/* <Button
            onClick={handleCreatePlant}
            disabled={!organization || isLoading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4" />
            Add Plant
          </Button> */}

          {/* Organization Button */}
          <Button
            onClick={() => setIsOrganizationDialogOpen(true)}
            variant={organization ? 'outline' : 'default'}
            className={!organization ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-colors' : ''}
          >
            <Building2 className="h-4 w-4 mr-2" />
            {organization ? 'Organization' : 'Setup Organization'}
          </Button>
        </div>
      );
    },

    // Optional: Add a message when no organization exists
    customEmptyState: !organization && !isLoading ? (
      <div className="text-center py-8">
        <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Organization Found
        </h3>
        <p className="text-gray-500 mb-4">
          Please complete the organization setup before adding plants.
        </p>
        <Button
          onClick={() => setIsOrganizationDialogOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Building2 className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>
    ) : undefined
  }), [organization, isLoading, industries, states, cities, managers]);

  return (
    <>
      <GenericEntityPage config={plantsConfig} />

      {/* Organization Dialog */}
      <Dialog open={isOrganizationDialogOpen} onOpenChange={setIsOrganizationDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {organization ? 'Edit Organization' : 'Create Organization'}
            </DialogTitle>
            <DialogDescription>
              {organization
                ? 'Update your Organization details below.'
                : 'Create an Organization before adding individual plants.'}
            </DialogDescription>
          </DialogHeader>
          <OrganizationForm
            existingOrganization={organization}
            onSuccess={handleOrganizationSuccess}
            onCancel={() => setIsOrganizationDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}