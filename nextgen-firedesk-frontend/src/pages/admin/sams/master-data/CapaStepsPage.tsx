
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { Entity } from '@/types/permissions';
import { TableCell } from "@/components/ui/table";
import { api } from '@/lib/api';

const capaStepsConfig: EntityConfig = {
    entityName: 'CAPA Step',
    entityNamePlural: 'CAPA Steps',
    apiEndpoint: '/sams/admin/capa-step',

    permissionEntity: Entity.CAPA_STEPS,
    enforcePermissions: true,

    // Archive/Restore support - uses 'status' field for GenericEntityPage compatibility
    supportsArchive: true,
    archiveStatusValue: 'Inactive',
    archiveParams: { isActive: 'false' },
    archiveFields: ['stepName', 'status'],

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

    fields: [
        { name: 'stepNumber', label: 'Step Number', type: 'number', required: true },
        { name: 'stepName', label: 'Step Name', type: 'text', required: true },
        { name: 'stepCode', label: 'Step Code', type: 'text' },
        { name: 'stepDescription', label: 'Description', type: 'textarea' },
        {
            name: 'isDocumentRequired',
            label: 'Document Required',
            type: 'select',
            options: ['Yes', 'No'] as any
        },
        {
            name: 'isApprovalRequired',
            label: 'Approval Required',
            type: 'select',
            options: ['Yes', 'No'] as any
        }
    ],

    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'bulkActions', 'history'],

    formLayout: "sections",
    formSections: [
        { id: "basicInfo", title: "Basic Information", fields: ["stepNumber", "stepName", "stepCode"] },
        { id: "requirements", title: "Requirements", fields: ["isDocumentRequired", "isApprovalRequired"] },
        { id: "details", title: "Details", fields: ["stepDescription"] }
    ],

    filterAttributes: [
        { id: 'stepNumber', label: 'Step #', type: 'number', sortable: true, mandatory: true },
        { id: 'stepName', label: 'Step Name', type: 'text', sortable: true },
        { id: 'stepDescription', label: 'Description', type: 'text', sortable: false },
        { id: 'isDocumentRequired', label: 'Document', type: 'select', sortable: true, options: [{ value: 'true', label: 'Required' }, { value: 'false', label: 'Optional' }] },
        { id: 'isApprovalRequired', label: 'Approval', type: 'select', sortable: true, options: [{ value: 'true', label: 'Required' }, { value: 'false', label: 'Auto' }] },

    ],

    // Load entity data for editing - transform booleans to strings for dropdowns
    loadEntityData: async (id: string) => {
        const response: any = await api.get(`/sams/admin/capa-step/${id}`);
        const data = response.data || response;
        return {
            ...data,
            isDocumentRequired: data.isDocumentRequired ? 'Yes' : 'No',
            isApprovalRequired: data.isApprovalRequired ? 'Yes' : 'No'
        };
    },

    // Transform data before sending to API - handles both form data and archive/restore
    transformData: (data: any) => {
        const result: any = { ...data };
        // Only transform fields that exist in the data
        if (data.isDocumentRequired !== undefined) {
            result.isDocumentRequired = data.isDocumentRequired === 'Yes' || data.isDocumentRequired === true;
        }
        if (data.isApprovalRequired !== undefined) {
            result.isApprovalRequired = data.isApprovalRequired === 'Yes' || data.isApprovalRequired === true;
        }
        if (data.isActive !== undefined) {
            result.isActive = data.isActive === 'Active' || data.isActive === true;
        }
        // Handle status from archive/restore - convert to isActive for backend
        if (data.status !== undefined) {
            result.isActive = data.status === 'Active';
            delete result.status;
        }
        if (data.stepNumber !== undefined && data.stepNumber !== null && data.stepNumber !== '') {
            result.stepNumber = Number(data.stepNumber);
        }
        return result;
    },

    customColumns: (item: any, isVisible: (field: string) => boolean) => (
        <>
            {isVisible('stepNumber') && (
                <TableCell className="font-mono font-medium bg-white sticky left-0 z-10 w-[80px] border-r border-gray-100 text-center">
                    {item.stepNumber}
                </TableCell>
            )}
            {isVisible('stepName') && <TableCell className="font-medium">{item.stepName}</TableCell>}
            {isVisible('stepDescription') && <TableCell className="text-sm text-gray-600">{item.stepDescription || '-'}</TableCell>}
            {isVisible('isDocumentRequired') && (
                <TableCell>
                    <span className={`text-xs ${item.isDocumentRequired ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                        {item.isDocumentRequired ? 'Required' : 'Optional'}
                    </span>
                </TableCell>
            )}
            {isVisible('isApprovalRequired') && (
                <TableCell>
                    <span className={`text-xs ${item.isApprovalRequired ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                        {item.isApprovalRequired ? 'Required' : 'Auto'}
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

const CapaStepsPage = () => {
    return <GenericEntityPage config={capaStepsConfig} />;
};

export default CapaStepsPage;
