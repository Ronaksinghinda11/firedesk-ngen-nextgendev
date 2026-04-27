
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { Entity } from '@/types/permissions';
import { TableCell } from "@/components/ui/table";
import { api } from '@/lib/api';

const incidentTypesConfig: EntityConfig = {
    entityName: 'Incident Type',
    entityNamePlural: 'Incident Types',
    apiEndpoint: '/sams/admin/incident-type',

    // Permission-based access control
    permissionEntity: Entity.INCIDENTS,
    enforcePermissions: true,

    // Archive/Restore support - uses 'status' field for GenericEntityPage compatibility
    supportsArchive: true,
    archiveStatusValue: 'Inactive',
    archiveParams: { isActive: 'false' },
    archiveFields: ['typeName', 'status'],

    // Transform response to add 'status' field from 'isActive' for archive filtering
    transformResponse: (response: any) => {
        const data = response.data || response;
        if (Array.isArray(data)) {
            return data.map((item: any) => ({
                ...item,
                status: item.isActive ? 'Active' : 'Inactive'
            }));
        }
        return data;
    },

    // Required 'fields' for GenericEntityPage
    fields: [
        { name: 'typeName', label: 'Type Name', type: 'text', required: true, placeholder: 'e.g., Safety Violation' },
        { name: 'typeCode', label: 'Type Code', type: 'text', placeholder: 'e.g., SAFE' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this incident type...' }
    ],

    // Filter attributes for headers and visibility
    filterAttributes: [
        { id: 'typeName', label: 'Type Name', type: 'text', sortable: true, mandatory: true },
        { id: 'typeCode', label: 'Type Code', type: 'text', sortable: true },
        { id: 'description', label: 'Description', type: 'text', sortable: false },

    ],

    // UI Configuration
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'bulkActions', 'history'],

    // Layout
    formLayout: "sections",
    formSections: [
        { id: "basicInfo", title: "Basic Information", fields: ["typeName", "typeCode"] },
        { id: "details", title: "Additional Details", fields: ["description"] }
    ],

    // Load entity data for editing
    loadEntityData: async (id: string) => {
        const response: any = await api.get(`/sams/admin/incident-type/${id}`);
        const data = response.data || response;
        return data;
    },

    // Transform data before sending to API - handles both form data and archive/restore
    transformData: (data: any) => {
        const result: any = { ...data };
        // Handle isActive from form (string 'Active'/'Inactive' or boolean)
        if (data.isActive !== undefined) {
            result.isActive = data.isActive === 'Active' || data.isActive === true;
        }
        // Handle status from archive/restore - convert to isActive for backend
        if (data.status !== undefined) {
            result.isActive = data.status === 'Active';
            delete result.status; // Backend doesn't have status field
        }
        return result;
    },

    // Custom columns - Function
    customColumns: (item: any, isVisible: (field: string) => boolean) => (
        <>
            {isVisible('typeName') && (
                <TableCell className="font-medium bg-white sticky left-0 z-10 min-w-[150px] border-r border-gray-100">
                    {item.typeName}
                </TableCell>
            )}
            {isVisible('typeCode') && (
                <TableCell className="text-sm font-mono text-gray-600">
                    {item.typeCode || '-'}
                </TableCell>
            )}
            {isVisible('description') && (
                <TableCell className="text-sm text-gray-600">
                    <span className="max-w-xs truncate block" title={item.description}>
                        {item.description || '-'}
                    </span>
                </TableCell>
            )}
            {isVisible('isActive') && (
                <TableCell>
                    <span className={`text-xs font-semibold ${item.isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                </TableCell>
            )}
        </>
    ),
};

const IncidentTypesPage = () => {
    return <GenericEntityPage config={incidentTypesConfig} />;
};

export default IncidentTypesPage;
