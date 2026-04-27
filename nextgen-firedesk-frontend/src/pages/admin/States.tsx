// src/pages/StatesPage.tsx
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';

const stateConfig: EntityConfig = {
  entityName: 'State',
  entityNamePlural: 'States',
  apiEndpoint: '/state',
  responseKey: 'allState',

  // Configure fields for archive/restore operations
  archiveFields: ['stateName', 'status'],
  supportsArchive: true, // Enable archive functionality

  // UI customization: Hide specific buttons on Create/Edit page
  hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],

  // UI customization: Hide kebab menu from listing rows
  hideListingRowKebab: true,

  // UI customization: Limit top menu items to specific actions
  limitTopMenuItems: ['export', 'bulkActions', 'history'],

  fields: [
    {
      name: 'name',
      label: 'State Name',
      type: 'text',
      required: true,
    },
  ],

  transformResponse: (response: any) => {
    console.log('🔍 Raw API response for States:', response);

    if (response && Array.isArray(response.allState)) {
      console.log('📊 First state item before transform:', response.allState[0]);

      const transformedData = response.allState.map((item: any) => ({
        id: item.id,
        name: item.stateName, // Map stateName to name
        status: item.status,
        createdAt: item.createdAt,
        createdBy: item.createdBy,
        // Include the original stateName as well for debugging
        stateName: item.stateName,
      }));

      console.log('🔄 First state item after transform:', transformedData[0]);

      // Return the transformed data in the expected structure
      return {
        ...response,
        allState: transformedData
      };
    }

    console.warn('❌ No states array found in response');
    return response;
  },

  transformData: (data: any) => {
    const transformed = {
      stateName: data.name || data.stateName, // Map name back to stateName for API
      status: data.status || 'Active',
    };

    console.log('📤 Data being sent to API:', transformed);
    return transformed;
  },
};

export default function StatesPage() {
  return <GenericEntityPage config={stateConfig} />;
}