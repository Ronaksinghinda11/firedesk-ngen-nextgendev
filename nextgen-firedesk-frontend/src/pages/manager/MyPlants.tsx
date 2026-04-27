/**
 * Manager My Plants Page
 *
 * View plants assigned to the current manager.
 * Uses GenericEntityPage template for consistency with admin module.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Factory, MapPin, Building2 } from 'lucide-react';

export default function ManagerMyPlants() {
  const { user } = useAuth();
  const [assignedPlantIds, setAssignedPlantIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadManagerPlants();
  }, []);

  const loadManagerPlants = async () => {
    try {
      setLoading(true);
      console.log('🏭 Loading manager plants...');

      // Fetch manager details with assigned plants
      const managerResponse = await api.get('/manager');
      const managers = managerResponse.allManager || [];
      const currentManager = managers.find((m: any) => m.userId === user?.id);

      if (currentManager && currentManager.plants) {
        const plantIds = currentManager.plants.map((p: any) => p.id);
        setAssignedPlantIds(plantIds);
        console.log('✅ Assigned plant IDs:', plantIds);
      }
    } catch (error) {
      console.error('❌ Error loading manager plants:', error);
    } finally {
      setLoading(false);
    }
  };

  const myPlantsConfig: EntityConfig = {
    entityName: 'Plant',
    entityNamePlural: 'My Plants',
    apiEndpoint: '/plant',
    responseKey: 'allPlants',

    // Hide create button - managers can't create plants
    hideCreateButton: true,

    // Filter to show only assigned plants
    transformResponse: (response) => {
      const allPlants = response.allPlants || response.plants || [];
      const filteredPlants = allPlants.filter((plant: any) =>
        assignedPlantIds.includes(plant.id)
      );

      console.log('🔍 All plants:', allPlants.length);
      console.log('✅ Filtered plants:', filteredPlants.length);

      return {
        ...response,
        allPlants: filteredPlants
      };
    },

    // Custom columns matching admin plants view
    customColumns: (entity: any) => (
      <>
        <TableCell>
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{entity.plantName}</div>
              <div className="text-xs text-muted-foreground">{entity.plantId}</div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              {entity.address}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{entity.industry?.industryName || 'N/A'}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={entity.status === 'Active' ? 'default' : 'secondary'}>
            {entity.status}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="text-sm">
            <div className="font-medium">{entity.mainBuildings || 0} Buildings</div>
            <div className="text-xs text-muted-foreground">{entity.totalPlantArea || 0} sq ft</div>
          </div>
        </TableCell>
      </>
    ),

    customHeaders: [
      'Plant Name',
      'Address',
      'Industry',
      'Status',
      'Details'
    ],

    // No fields needed - read-only for managers
    fields: [],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return <GenericEntityPage config={myPlantsConfig} />;
}
