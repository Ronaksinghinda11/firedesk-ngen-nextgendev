// src/pages/admin/Industries.tsx
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { TableCell } from '@/components/ui/table';
import { Entity } from '@/types/permissions';

const industryConfig: EntityConfig = {
  entityName: 'Industry',
  entityNamePlural: 'Industries',
  apiEndpoint: '/master-data/industries',
  responseKey: 'allIndustry',

  // Permission-based access control
  permissionEntity: Entity.INDUSTRIES,
  enforcePermissions: true,

  // Configure fields for archive/restore operations
  archiveFields: ['industry_name', 'status'],
  supportsArchive: true,
  archiveStatusValue: 'Inactive',

  // UI customization: Hide specific buttons on Create/Edit page
  hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],

  // UI customization: Hide kebab menu from listing rows
  hideListingRowKebab: true,

  // UI customization: Limit top menu items to specific actions
  limitTopMenuItems: ['export', 'bulkActions', 'history'],

  // Filter attributes for sorting and column visibility (Matches User/Role pattern)
  filterAttributes: [
    { id: 'industry_name', label: 'Industry Name', type: 'text' as const, operators: ['contains', 'is', 'isNot'], mandatory: true },
    { id: 'industry_code', label: 'Industry Code', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },

    { id: 'created_at', label: 'Created At', type: 'date' as const, operators: ['before', 'after'] },
    { id: 'updated_at', label: 'Updated At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
  ],

  // Import fields - user-fillable fields for import template
  importFields: [
    { id: 'industry_name', label: 'Industry Name', required: true },
    { id: 'industry_code', label: 'Industry Code' },
  ],

  fields: [
    {
      name: 'industry_name',
      label: 'Industry Name',
      type: 'text',
      required: true,
    },
    {
      name: 'industry_code',
      label: 'Industry Code',
      type: 'text',
      required: false,
      placeholder: 'Auto-generated if left blank',
    }
  ],

  formLayout: "sections",
  formSections: [
    {
      id: "basicInfo",
      title: "Basic Information",
      render: (formData: any, setFormData: any) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
          <div className="space-y-1">
            <label htmlFor="industry_name" className="text-xs font-medium text-gray-700">
              Industry Name <span className="text-red-500">*</span>
            </label>
            <input
              id="industry_name"
              type="text"
              value={formData.industry_name || ""}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, industry_name: e.target.value }))}
              placeholder="Enter industry name"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="industry_code" className="text-xs font-medium text-gray-700">
              Industry Code
            </label>
            <input
              id="industry_code"
              type="text"
              value={formData.industry_code || ""}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, industry_code: e.target.value }))}
              placeholder="Auto-generated if left blank"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      )
    }
  ],

  // Transform API response to match GenericEntityPage expectations
  transformResponse: (response: any) => {
    console.log('🔍 Industries - Raw API response:', response);

    let industryData = [];
    if (response && Array.isArray(response.allIndustry)) {
      industryData = response.allIndustry;
    } else if (response.industries && Array.isArray(response.industries)) {
      industryData = response.industries;
    }

    const transformedData = industryData.map((item: any) => ({
      id: item.id,
      name: item.industry_name, // Map industry_name to name for display
      industry_name: item.industry_name,
      industry_code: item.industry_code,
      status: item.status || 'Active',
      createdAt: item.created_at, // Backend uses snake_case created_at
      updatedAt: item.updated_at, // Backend uses snake_case updated_at
      created_at: item.created_at,
      updated_at: item.updated_at,
      createdBy: item.created_by,
    }));

    return {
      ...response,
      allIndustry: transformedData
    };
  },

  // Transform form data before sending to API
  transformData: (data: any) => {
    console.log('📤 Industries - Transforming form data:', data);
    // GenericEntityPage might pass 'name' if we used it as the field key, 
    // but we defined 'industry_name' as the field key so it should be correct.
    return {
      industry_name: data.industry_name || data.name,
      industry_code: data.industry_code,
      status: data.status || 'Active',
    };
  },
  // Ensure custom headers/columns for precise rendering
  // Ensure custom columns check visibility to support "Save View"
  customColumns: (entity: any, isVisible: (field: string) => boolean) => (
    <>
      {isVisible('industry_name') && (
        <TableCell className="font-medium bg-white sticky left-0 z-10 min-w-[200px] border-r border-gray-100">
          {entity.industry_name}
        </TableCell>
      )}
      {isVisible('industry_code') && (
        <TableCell className="font-mono text-xs text-gray-500 whitespace-nowrap">
          {entity.industry_code || '-'}
        </TableCell>
      )}
      {isVisible('status') && (
        <TableCell className="text-sm font-normal text-gray-700">
          <span className={entity.status === 'Active' ? 'text-green-600' : 'text-gray-500'}>
            {entity.status}
          </span>
        </TableCell>
      )}
      {isVisible('created_at') && (
        <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">
          {entity.createdAt ? new Date(entity.createdAt).toLocaleDateString() : 'N/A'}
        </TableCell>
      )}
      {isVisible('updated_at') && (
        <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">
          {entity.updatedAt ? new Date(entity.updatedAt).toLocaleDateString() : 'N/A'}
        </TableCell>
      )}
    </>
  ),
};

export default function IndustriesPage() {
  return <GenericEntityPage config={industryConfig} />;
}
