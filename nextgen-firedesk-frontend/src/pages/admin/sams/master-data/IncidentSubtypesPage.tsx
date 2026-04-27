
import { useEffect, useState } from 'react';
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { Entity } from '@/types/permissions';
import { TableCell } from "@/components/ui/table";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { incidentTypeApi } from '@/services/api/samsApi';
import { api } from '@/lib/api';

interface IncidentType {
    id: string;
    typeName: string;
    isActive: boolean;
}

const IncidentSubtypesPage = () => {
    const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);

    useEffect(() => {
        loadIncidentTypes();
    }, []);

    const loadIncidentTypes = async () => {
        try {
            const response = await incidentTypeApi.getAll();
            const types = response.data || [];
            // Only show active types
            setIncidentTypes(types.filter((t: IncidentType) => t.isActive));
        } catch (error) {
            console.error('Failed to load incident types', error);
        }
    };

    const incidentSubtypesConfig: EntityConfig = {
        entityName: 'Incident Subtype',
        entityNamePlural: 'Incident Subtypes',
        apiEndpoint: '/sams/admin/incident-subtype',

        permissionEntity: Entity.INCIDENTS,
        enforcePermissions: true,

        // Archive/Restore support - uses 'status' field for GenericEntityPage compatibility
        supportsArchive: true,
        archiveStatusValue: 'Inactive',
        archiveParams: { isActive: 'false' },
        archiveFields: ['subtypeName', 'status'],

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
            { name: 'incidentTypeId', label: 'Incident Type', type: 'select', required: true, options: [] },
            { name: 'subtypeName', label: 'Subtype Name', type: 'text', required: true },
            { name: 'subtypeCode', label: 'Subtype Code', type: 'text' },
            { name: 'description', label: 'Description', type: 'textarea' }
        ],

        filterAttributes: [
            { id: 'subtypeName', label: 'Subtype Name', type: 'text', sortable: true, mandatory: true },
            { id: 'incidentTypeId', label: 'Incident Type', type: 'text', sortable: true },
            { id: 'subtypeCode', label: 'Subtype Code', type: 'text', sortable: true },
            { id: 'description', label: 'Description', type: 'text', sortable: false },

        ],

        hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
        hideListingRowKebab: true,
        limitTopMenuItems: ['export', 'bulkActions', 'history'],

        formLayout: "sections",
        formSections: [
            {
                id: "basicInfo",
                title: "Basic Information",
                render: (formData: any, setFormData: any) => (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700">
                                Incident Type <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.incidentTypeId || ''}
                                onValueChange={(value) => setFormData((prev: any) => ({ ...prev, incidentTypeId: value }))}
                            >
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Select incident type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {incidentTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.typeName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700">
                                Subtype Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={formData.subtypeName || ''}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, subtypeName: e.target.value }))}
                                placeholder="Enter subtype name"
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700">Subtype Code</Label>
                            <Input
                                value={formData.subtypeCode || ''}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, subtypeCode: e.target.value }))}
                                placeholder="Sub-type code"
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>
                )
            },
            {
                id: "details",
                title: "Additional Details",
                render: (formData: any, setFormData: any) => (
                    <div className="max-w-3xl">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700">Description</Label>
                            <Textarea
                                value={formData.description || ''}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe this subtype..."
                                className="min-h-[80px] text-sm"
                            />
                        </div>
                    </div>
                )
            }
        ],

        // Load entity data for editing
        loadEntityData: async (id: string) => {
            const response: any = await api.get(`/sams/admin/incident-subtype/${id}`);
            const data = response.data || response;
            return data;
        },

        // Transform data before sending to API - handles both form data and archive/restore
        transformData: (data: any) => {
            const result: any = { ...data };
            if (data.isActive !== undefined) {
                result.isActive = data.isActive === 'Active' || data.isActive === true;
            }
            // Handle status from archive/restore - convert to isActive for backend
            if (data.status !== undefined) {
                result.isActive = data.status === 'Active';
                delete result.status;
            }
            return result;
        },

        customColumns: (item: any, isVisible: (field: string) => boolean) => (
            <>
                {isVisible('subtypeName') && (
                    <TableCell className="font-medium bg-white sticky left-0 z-10 min-w-[150px] border-r border-gray-100">
                        {item.subtypeName}
                    </TableCell>
                )}
                {isVisible('incidentTypeId') && (
                    <TableCell className="text-sm text-gray-700">
                        {item.incidentType?.typeName || 'Unknown'}
                    </TableCell>
                )}
                {isVisible('subtypeCode') && (
                    <TableCell className="text-sm font-mono text-gray-600">
                        {item.subtypeCode || '-'}
                    </TableCell>
                )}
                {isVisible('description') && <TableCell className="text-sm text-gray-600">{item.description || '-'}</TableCell>}
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

    return <GenericEntityPage config={incidentSubtypesConfig} />;
};

export default IncidentSubtypesPage;
