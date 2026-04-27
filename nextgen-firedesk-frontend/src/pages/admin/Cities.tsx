// src/pages/CitiesPage.tsx
import { useEffect, useState } from 'react';
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { api } from '@/lib/api';
import { TableCell } from '@/components/ui/table';

interface State {
  id: string;
  stateName: string;
}

export default function CitiesPage() {
  const [states, setStates] = useState<State[]>([]);

  useEffect(() => {
    loadStates();
  }, []);

  const loadStates = async () => {
    try {
      console.log('🔄 Loading states for dropdown...');

      const response = await api.get('/state/active');
      console.log('📡 States API response:', response);

      // Extract states from response - try different possible structures
      let statesData: State[] = [];

      if (Array.isArray(response)) {
        statesData = response;
      } else if (response.allState) {
        statesData = response.allState;
      } else if (response.data?.allState) {
        statesData = response.data.allState;
      } else if (response.data && Array.isArray(response.data)) {
        statesData = response.data;
      }

      console.log('✅ States loaded for dropdown:', statesData);
      setStates(statesData);

    } catch (error: any) {
      console.error('❌ Error loading states:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const cityConfig: EntityConfig = {
    entityName: 'City',
    entityNamePlural: 'Cities',
    apiEndpoint: '/city',
    responseKey: 'allCity',

    // Configure fields for archive/restore operations
    archiveFields: ['cityName', 'stateId', 'status'],
    supportsArchive: true,

    // UI customization: Hide specific buttons on Create/Edit page
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],

    // UI customization: Hide kebab menu from listing rows
    hideListingRowKebab: true,

    // UI customization: Limit top menu items to specific actions
    limitTopMenuItems: ['export', 'bulkActions', 'history'],

    fields: [
      {
        name: 'name',
        label: 'City Name',
        type: 'text',
        required: true,
      },
      {
        name: 'stateId',
        label: 'State',
        type: 'select',
        required: true,
        referenceData: states,
      },
    ],

    transformResponse: (response: any) => {
      console.log('🔍 Raw API response for Cities:', response);

      if (response && Array.isArray(response.allCity)) {
        console.log('📊 Cities array found, length:', response.allCity.length);

        const transformedData = response.allCity.map((item: any) => ({
          id: item.id,
          name: item.cityName,
          cityName: item.cityName, // Keep original for archive
          stateId: item.stateId,
          status: item.status || 'Active',
          createdAt: item.createdAt,
          createdBy: item.createdBy,
          stateName: item.State?.stateName,
        }));

        console.log('🔄 First city after transform:', transformedData[0]);
        return {
          ...response,
          allCity: transformedData
        };
      }

      console.warn('❌ No cities array found in response');
      return response;
    },

    transformData: (data: any) => {
      const transformed = {
        cityName: data.name || data.cityName,
        stateId: data.stateId,
        status: data.status || 'Active',
      };

      console.log('📤 Data being sent to API:', transformed);
      return transformed;
    },

    // Remove customColumns since it's causing the Status column to be skipped
    // Let the GenericEntityPage handle all columns automatically
  };

  return <GenericEntityPage config={cityConfig} />;
}