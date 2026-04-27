import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { Entity } from '@/types/permissions';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { incidentSubtypeApi } from '@/services/api/samsApi';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// --- Custom Render Components ---

// 1. Location Section (Cascading)
const LocationFields = ({ formData, setFormData }: { formData: any, setFormData: any }) => {
  const [plants, setPlants] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);

  useEffect(() => {
    // Load Plants (Active)
    api.get<any>('/plants/active')
      .then(res => {
        const plantList = res.plants || res.data?.plants || (Array.isArray(res.data) ? res.data : []) || [];
        setPlants(plantList);
      })
      .catch(err => console.error("Failed to load plants:", err));
  }, []);

  useEffect(() => {
    if (formData.plantId) {
      api.get<any>('/buildings', { params: { plantId: formData.plantId } })
        .then(res => {
          setBuildings(res.data || []);
        })
        .catch(err => console.error("Failed to load buildings:", err));
    } else {
      setBuildings([]);
    }
  }, [formData.plantId]);

  useEffect(() => {
    if (formData.buildingId) {
      console.log('Fetching floors for buildingId:', formData.buildingId);
      api.get<any>('/sams/floors', { params: { buildingId: formData.buildingId } })
        .then(res => {
          console.log('Floors API response:', res);
          const floorsData = res.data || res.floors || [];
          console.log('Parsed floors data:', floorsData);
          setFloors(floorsData);
        })
        .catch(err => console.error("Failed to load floors:", err));
    } else {
      setFloors([]);
    }
  }, [formData.buildingId]);

  const handlePlantChange = (val: string) => {
    setFormData({ ...formData, plantId: val, buildingId: '', floorId: '' });
  };

  const handleBuildingChange = (val: string) => {
    setFormData({ ...formData, buildingId: val, floorId: '' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Plant <span className="text-red-500">*</span></Label>
        <Select value={formData.plantId} onValueChange={handlePlantChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select plant" /></SelectTrigger>
          <SelectContent>
            {plants.map(p => (
              <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                {p.plantName || p.plant_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Building</Label>
        <Select value={formData.buildingId} onValueChange={handleBuildingChange} disabled={!formData.plantId}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select building" /></SelectTrigger>
          <SelectContent>
            {buildings.map(b => (
              <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                {b.buildingName || b.building_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Floor</Label>
        <Select value={formData.floorId} onValueChange={(val) => setFormData({ ...formData, floorId: val })} disabled={!formData.buildingId}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select floor" /></SelectTrigger>
          <SelectContent>
            {floors.map(f => (
              <SelectItem key={f.id} value={String(f.id)} className="text-xs">
                {f.floorName || f.floor_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// 2. Subtype, Date & Severity
const BasicInfoFields = ({ formData, setFormData }: { formData: any, setFormData: any }) => {
  const [subtypes, setSubtypes] = useState<any[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    incidentSubtypeApi.getAll({ isActive: true })
      .then(res => {
        setSubtypes(res.data || []);
      })
      .catch(err => console.error("Failed to load incident subtypes:", err));
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Incident Subtype <span className="text-red-500">*</span></Label>
        <Select value={formData.incidentSubtypeId} onValueChange={(val) => setFormData({ ...formData, incidentSubtypeId: val })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {subtypes.map(st => (
              <SelectItem key={st.id} value={String(st.id)} className="text-xs">{st.subtypeName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Incident Date <span className="text-red-500">*</span></Label>
        <Popover open={isDatePickerOpen} onOpenChange={(open) => {
          setIsDatePickerOpen(open);
          if (open) setTempDate(formData.incidentDate ? new Date(formData.incidentDate) : undefined);
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-8 justify-start text-left font-normal text-xs",
                !formData.incidentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.incidentDate ? (
                format(new Date(formData.incidentDate), "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={tempDate}
              onSelect={setTempDate}
              initialFocus
            />
            <div className="flex items-center justify-end gap-2 p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempDate(formData.incidentDate ? new Date(formData.incidentDate) : undefined);
                  setIsDatePickerOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => {
                  setFormData({ ...formData, incidentDate: tempDate ? format(tempDate, "yyyy-MM-dd") : "" });
                  setIsDatePickerOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Severity <span className="text-red-500">*</span></Label>
        <Select
          value={formData.severity || 'Medium'}
          onValueChange={(val) => setFormData({ ...formData, severity: val })}
        >
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Low" className="text-xs">Low</SelectItem>
            <SelectItem value="Medium" className="text-xs">Medium</SelectItem>
            <SelectItem value="High" className="text-xs">High</SelectItem>
            <SelectItem value="Critical" className="text-xs">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// 3. Details (Description & Impact)
const DetailsFields = ({ formData, setFormData }: { formData: any, setFormData: any }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Incident Description <span className="text-red-500">*</span></Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-[100px] text-xs resize-y"
          placeholder="Describe the incident..."
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Impact</Label>
        <Textarea
          value={formData.impact}
          onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
          className="min-h-[60px] text-xs resize-y"
          placeholder="Describe the impact (e.g., potential downtime, safety risks)..."
        />
      </div>
    </div>
  );
};

import { usePlantFilter } from '@/contexts/PlantFilterContext';

// ... (existing imports)

const IncidentsList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedPlantId } = usePlantFilter();
  const [subtypes, setSubtypes] = useState<any[]>([]);

  useEffect(() => {
    incidentSubtypeApi.getAll({ isActive: true })
      .then(res => {
        setSubtypes(res.data || []);
      })
      .catch(err => console.error("Failed to load incident subtypes:", err));
  }, []);

  const incidentsConfig: EntityConfig = {
    entityName: 'Incident',
    entityNamePlural: 'Incidents',
    // Fix: apiEndpoint must be a clean URL path (no query string) for correct ID appending during update/delete
    apiEndpoint: '/sams/incident',

    // Pass filters via activeParams instead
    activeParams: selectedPlantId && selectedPlantId !== 'all' ? { plantId: selectedPlantId } : {},

    // Trigger refetch when plant changes
    fetchTrigger: selectedPlantId,

    permissionEntity: Entity.INCIDENTS,
    enforcePermissions: true,
    hideDeleteButton: location.pathname.includes('/manager'),

    // Archive Support
    supportsArchive: false,

    // Enable Sections Layout
    formLayout: "sections",
    formMaxWidth: 'max-w-4xl',

    customActions: (entity) => (
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`${location.pathname}/${entity.id}`);
        }}
        title="View Details"
        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        <Eye className="h-4 w-4" />
      </Button>
    ),

    getInitialFormData: () => ({
      severity: 'Medium',
      incidentDate: new Date().toISOString().split('T')[0]
    }),

    // Check GenericEntityPage support for this hook!
    transformData: (data: any) => {
      return {
        ...data,
        // Sanitize UUID fields to prevent "invalid input syntax for type uuid"
        incidentSubtypeId: data.incidentSubtypeId === '' ? null : data.incidentSubtypeId,
        plantId: data.plantId === '' ? null : data.plantId,
        buildingId: data.buildingId === '' ? null : data.buildingId,
        floorId: data.floorId === '' ? null : data.floorId,
        wingId: data.wingId === '' ? null : data.wingId,
      };
    },

    // Load entity data for editing - ensure IDs are strings for Select components
    loadEntityData: async (id: string) => {
      const response: any = await api.get(`/sams/incident/${id}`);
      const data = response.data || response;
      return {
        ...data,
        // Convert IDs to strings for Select components
        plantId: data.plantId ? String(data.plantId) : '',
        buildingId: data.buildingId ? String(data.buildingId) : '',
        floorId: data.floorId ? String(data.floorId) : '',
        incidentSubtypeId: data.incidentSubtypeId ? String(data.incidentSubtypeId) : '',
        // Format date for input
        incidentDate: data.incidentDate ? new Date(data.incidentDate).toISOString().split('T')[0] : '',
      };
    },

    formSections: [
      {
        id: 'basicInfo',
        title: 'Basic Information',
        render: (formData, setFormData) => <BasicInfoFields formData={formData} setFormData={setFormData} />
      },
      {
        id: 'location',
        title: 'Location',
        render: (formData, setFormData) => <LocationFields formData={formData} setFormData={setFormData} />
      },
      {
        id: 'details',
        title: 'Incident Details',
        render: (formData, setFormData) => <DetailsFields formData={formData} setFormData={setFormData} />
      }
    ],

    fields: [
      { name: 'incidentNumber', label: 'Incident #', type: 'text' },
      { name: 'incidentSubtypeId', label: 'Type', type: 'select' },
      { name: 'incidentDate', label: 'Date', type: 'date' },
      { name: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
      { name: 'plantId', label: 'Plant', type: 'select' },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],

    filterAttributes: [
      { id: 'incidentNumber', label: 'Incident #', type: 'text', sortable: true, mandatory: true },
      { id: 'plantId', label: 'Plant', type: 'text', sortable: true },
      {
        id: 'incidentSubtypeId',
        label: 'Subtype',
        type: 'select',
        sortable: true,
        options: subtypes.map(st => ({ value: String(st.id), label: st.subtypeName }))
      },
      {
        id: 'severity',
        label: 'Severity',
        type: 'select',
        sortable: true,
        options: [
          { value: 'Critical', label: 'Critical' },
          { value: 'High', label: 'High' },
          { value: 'Medium', label: 'Medium' },
          { value: 'Low', label: 'Low' }
        ]
      },

      { id: 'incidentDate', label: 'Date', type: 'date', sortable: true }
    ],

    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'bulkActions'],

    customColumns: (incident: any, isVisible: (field: string) => boolean) => {
      return (
        <>
          {isVisible('incidentNumber') && (
            <TableCell className="font-medium bg-white sticky left-0 z-10 min-w-[120px] border-r border-gray-100">
              {incident.incidentNumber}
            </TableCell>
          )}

          {isVisible('plantId') && (
            <TableCell className="text-sm text-gray-600">
              {incident.plant?.plantName || incident.plant?.plant_name || 'N/A'}
            </TableCell>
          )}
          {isVisible('incidentSubtypeId') && (
            <TableCell className="text-sm text-gray-600">
              {incident.subtype?.subtypeName || incident.incidentType?.typeName || 'N/A'}
            </TableCell>

          )}
          {isVisible('severity') && (
            <TableCell>
              <span className={
                incident.severity === 'Critical' ? 'text-red-700 font-medium' :
                  incident.severity === 'High' ? 'text-orange-600 font-medium' :
                    incident.severity === 'Medium' ? 'text-blue-600 font-medium' :
                      'text-gray-600'
              }>
                {incident.severity}
              </span>
            </TableCell>
          )}
          {isVisible('status') && (
            <TableCell>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${incident.status === 'Open' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                incident.status === 'In Progress' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  incident.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                    'bg-gray-50 text-gray-700 border-gray-200'
                }`}>
                {incident.status}
              </span>
            </TableCell>
          )}
          {isVisible('incidentDate') && (
            <TableCell className="text-sm text-gray-600">
              {incident.incidentDate ? new Date(incident.incidentDate).toLocaleDateString() : '-'}
            </TableCell>
          )}
        </>
      );
    }
  };
  return <GenericEntityPage config={incidentsConfig} />;
};

export default IncidentsList;
