import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import InlineConditionEditor from '@/components/conditions/InlineConditionEditor';
import { Entity } from '@/types/permissions';

const ConditionMaster = () => {
  const conditionMasterConfig: EntityConfig = {
    entityName: 'Condition',
    entityNamePlural: 'Conditions',
    apiEndpoint: '/master-data/conditions',
    responseKey: 'data',
    pagination: true,
    activeParams: { isActive: true },
    archiveParams: { isActive: false },

    // Permission-based access control
    permissionEntity: Entity.CONDITIONS,
    enforcePermissions: true,

    // Archive/Restore configuration - DISABLED
    // archiveFields: ['condition_code', 'condition_name', 'severity_level', 'status'],
    // supportsArchive: true,
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'import', 'bulkActions', 'history'],

    // Filter attributes for sorting and column visibility
    filterAttributes: [
      { id: 'condition_name', label: 'Condition Name', type: 'text' as const, operators: ['contains', 'is', 'isNot'], mandatory: true },
      { id: 'condition_code', label: 'Condition Code', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      {
        id: 'severity_level',
        label: 'Severity',
        type: 'select' as const,
        operators: ['is', 'isNot'],
        options: [
          { label: 'CRITICAL', value: 'CRITICAL' },
          { label: 'HIGH', value: 'HIGH' },
          { label: 'MEDIUM', value: 'MEDIUM' },
          { label: 'LOW', value: 'LOW' },
          { label: 'INFO', value: 'INFO' },
        ]
      },
      { id: 'priority_score', label: 'Priority', type: 'number' as const, operators: ['is', 'isNot'] },
      {
        id: 'health_impact',
        label: 'Health Impact',
        type: 'select' as const,
        operators: ['is', 'isNot'],
        options: [
          { label: 'Healthy', value: 'Healthy' },
          { label: 'Need Attention', value: 'Need Attention' },
          { label: 'Not Working', value: 'Not Working' },
          { label: 'Inventory', value: 'Inventory' },
          { label: 'Under Maintenance', value: 'Under Maintenance' },
          { label: 'De-Active', value: 'De-Active' },
        ]
      },
      { id: 'recommended_action', label: 'Recommended Action', type: 'text' as const, operators: ['contains'], hiddenByDefault: true },
      { id: 'requires_immediate_action', label: 'Immediate Action', type: 'select' as const, operators: ['is'], options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], hiddenByDefault: true },

      { id: 'created_at', label: 'Created At', type: 'date' as const, operators: ['before', 'after'] },
      { id: 'updated_at', label: 'Updated At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    ],
    archiveStatusValue: 'Inactive',

    // Import fields - matching UI form fields
    importFields: [
      // Unique identifier for upsert - if provided and exists, updates the condition
      { id: 'condition_code', label: 'Condition Code' },
      { id: 'condition_name', label: 'Condition Name', required: true },
      { id: 'severity_level', label: 'Severity', required: true },
      { id: 'priority_score', label: 'Priority', required: true },
      { id: 'health_impact', label: 'Health Impact', required: true },
      { id: 'recommended_action', label: 'Recommended Action' },
      { id: 'requires_immediate_action', label: 'Immediate' },
    ],

    fields: [
      {
        name: 'condition_name',
        label: 'Condition Name',
        type: 'text',
        required: true,
      },
      {
        name: 'condition_code',
        label: 'Condition Code',
        type: 'text',
        required: false,
        placeholder: 'Auto-generated if left blank',
      },
      {
        name: 'severity_level',
        label: 'Severity Level',
        type: 'select',
        options: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
        required: true,
      },
      {
        name: 'priority_score',
        label: 'Priority Score',
        type: 'number',
        required: true,
        placeholder: '0-100',
      },
      {
        name: 'health_impact',
        label: 'Health Impact',
        type: 'select',
        options: ['Healthy', 'Need Attention', 'Not Working', 'Inventory', 'Under Maintenance', 'De-Active'],
        required: true,
      },
      {
        name: 'recommended_action',
        label: 'Recommended Action',
        type: 'textarea',
        required: false,
      },

    ],

    formLayout: "sections",

    // Custom form renderer - replaces wizard with Excel-like inline table
    renderCustomForm: ({ editingEntity, onCancel, onSaveComplete }) => (
      <InlineConditionEditor
        editingCondition={editingEntity}
        onCancel={onCancel}
        onSaveComplete={onSaveComplete}
      />
    ),

    formSections: [
      {
        id: "basicInfo",
        title: "Basic Information",
        render: (formData: any, setFormData: (data: any) => void) => (
          <div className="space-y-2 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Condition Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.condition_name || ''}
                  onChange={(e) => setFormData({ ...formData, condition_name: e.target.value })}
                  className="w-full h-8 text-sm px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter condition name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Condition Code
                </label>
                <input
                  type="text"
                  value={formData.condition_code || ''}
                  onChange={(e) => setFormData({ ...formData, condition_code: e.target.value })}
                  className="w-full h-8 text-sm px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Auto-generated if left blank"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Severity Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.severity_level || ''}
                  onChange={(e) => setFormData({ ...formData, severity_level: e.target.value })}
                  className="w-full h-8 text-sm px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">Select severity</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                  <option value="INFO">INFO</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Priority Score <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.priority_score || ''}
                  onChange={(e) => setFormData({ ...formData, priority_score: parseInt(e.target.value) || 0 })}
                  className="w-full h-8 text-sm px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0-100"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Health Impact <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.health_impact || ''}
                  onChange={(e) => setFormData({ ...formData, health_impact: e.target.value })}
                  className="w-full h-8 text-sm px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">Select health impact</option>
                  <option value="Healthy">Healthy</option>
                  <option value="Need Attention">Need Attention</option>
                  <option value="Not Working">Not Working</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="De-Active">De-Active</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-700">
                  Recommended Action
                </label>
                <textarea
                  value={formData.recommended_action || ''}
                  onChange={(e) => setFormData({ ...formData, recommended_action: e.target.value })}
                  className="w-full min-h-[60px] text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter recommended action"
                />
              </div>
            </div>
          </div>
        )
      }
    ],

    transformResponse: (response: any) => {
      console.log('🔍 Raw API response for conditions:', response);

      let conditionData = [];
      if (response && Array.isArray(response.data)) {
        conditionData = response.data;
      } else if (Array.isArray(response)) {
        conditionData = response;
      } else if (response.conditions && Array.isArray(response.conditions)) {
        conditionData = response.conditions;
      }

      const transformedData = conditionData.map((item: any) => ({
        id: item.id,
        name: item.condition_name, // Map for generic component title
        condition_name: item.condition_name,
        condition_code: item.condition_code,
        severity_level: item.severity_level,
        priority_score: item.priority_score,
        health_impact: item.health_impact,
        recommended_action: item.recommended_action,
        requires_immediate_action: item.requires_immediate_action,
        is_active: item.is_active,
        status: item.is_active ? 'Active' : 'Inactive', // Map boolean to string status
        createdAt: item.created_at, // snake_case
        updatedAt: item.updated_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        createdBy: item.created_by,
      }));

      return {
        ...response,
        data: transformedData
      };
    },

    loadEntityData: async (entityId: string) => {
      try {
        console.log('🔍 Loading condition data for ID:', entityId);
        const response: any = await api.get(`/master-data/conditions/${entityId}`);
        console.log('📦 Condition API response:', response);

        if (response.success && response.data) {
          const condition = response.data;

          return {
            id: condition.id,
            condition_name: condition.condition_name,
            condition_code: condition.condition_code,
            severity_level: condition.severity_level,
            priority_score: condition.priority_score,
            health_impact: condition.health_impact,
            recommended_action: condition.recommended_action,
            requires_immediate_action: condition.requires_immediate_action,
            status: condition.is_active ? 'Active' : 'Inactive',
          };
        }
        throw new Error('No condition data in response');
      } catch (error) {
        console.error('❌ Failed to load condition data:', error);
        throw error;
      }
    },

    transformData: (data: any) => {
      console.log('📤 Transform data input:', data);

      return {
        condition_name: data.condition_name || data.name,
        condition_code: data.condition_code,
        severity_level: data.severity_level,
        priority_score: data.priority_score ? parseInt(data.priority_score) : 0,
        health_impact: data.health_impact,
        recommended_action: data.recommended_action,
        is_active: data.status !== undefined ? data.status === 'Active' : true // Default to Active if status is missing (creation)
      };
    },

    // Ensure custom columns check visibility to support "Save View"
    customColumns: (entity: any, isVisible: (field: string) => boolean) => {
      // Severity color mapping (text colors without badges)
      const severityTextColors: Record<string, string> = {
        CRITICAL: 'text-red-600 font-semibold',
        HIGH: 'text-orange-600 font-semibold',
        MEDIUM: 'text-yellow-600',
        LOW: 'text-blue-600',
        INFO: 'text-gray-500',
      };

      // Health impact color mapping (text colors without badges)
      const healthTextColors: Record<string, string> = {
        'Healthy': 'text-green-600',
        'Need Attention': 'text-yellow-600',
        'Not Working': 'text-red-600 font-semibold',
        'Inventory': 'text-blue-600',
        'Under Maintenance': 'text-orange-600',
        'De-Active': 'text-gray-500',
      };

      return (
        <>
          {isVisible('condition_name') && (
            <TableCell className="font-medium text-sm text-gray-700 bg-white sticky left-0 z-10 min-w-[200px] border-r border-gray-100">{entity.condition_name}</TableCell>
          )}
          {isVisible('condition_code') && (
            <TableCell className="font-mono text-xs text-gray-500 whitespace-nowrap">{entity.condition_code || '-'}</TableCell>
          )}
          {isVisible('severity_level') && (
            <TableCell className="text-sm">
              <span className={severityTextColors[entity.severity_level] || 'text-gray-700'}>
                {entity.severity_level}
              </span>
            </TableCell>
          )}
          {/* Priority score isn't in filterAttributes but was in customColumns. Usually columns should match attrs.
              The previous sortableFields contained 'priority_score'. The plan had update for filterAttributes.
              Let's check if priority_score is in the new filterAttributes list. 
              Checking previous step 2344: No, 'priority_score' is NOT in filterAttributes.
              If it's not in filterAttributes, isVisible('priority_score') will likely fail or return false if we strictly follow defaultColumns logic.
              However, EntityTableView defaults include all fields + filterAttributes.
              Wait, Priority Score was in 'fields' list? Yes (line 84 in view 2278).
              So it should be available. I will wrap it in check.
           */}
          {isVisible('priority_score') && (
            <TableCell className="text-sm font-medium text-blue-600">
              {entity.priority_score}
            </TableCell>
          )}
          {isVisible('health_impact') && (
            <TableCell className="text-sm">
              <span className={healthTextColors[entity.health_impact] || 'text-gray-700'}>
                {entity.health_impact}
              </span>
            </TableCell>
          )}
          {isVisible('recommended_action') && (
            <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">
              {entity.recommended_action || '-'}
            </TableCell>
          )}
          {isVisible('requires_immediate_action') && (
            <TableCell className="text-sm font-normal text-gray-700">
              {entity.requires_immediate_action ? 'Yes' : 'No'}
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
      );
    },
  };

  return <GenericEntityPage config={conditionMasterConfig} />;
};

export default ConditionMaster;
