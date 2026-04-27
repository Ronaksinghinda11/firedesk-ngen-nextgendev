import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  X,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  managerTicketApi,
  CreateTicketPayload,
  TaskPayload,
} from '@/services/api/managerTicketApi';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TICKET_TYPES = [
  {
    value: 'Installation',
    label: 'Installation',
    desc: 'Install new assets from inventory',
    color: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  {
    value: 'Breakdown Maintenance',
    label: 'Breakdown Maintenance',
    desc: 'Reactive maintenance for offline assets',
    color: 'border-orange-500 bg-orange-50 text-orange-700',
  },
  {
    value: 'Refill / HP Test',
    label: 'Refill / HP Test',
    desc: 'Fire Extinguisher refill or testing',
    color: 'border-green-500 bg-green-50 text-green-700',
  },
  {
    value: 'General',
    label: 'General',
    desc: 'General task or work order',
    color: 'border-slate-500 bg-slate-50 text-slate-700',
  },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'text-slate-500' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-blue-500' },
  { value: 'HIGH', label: 'High', color: 'text-amber-500' },
  { value: 'CRITICAL', label: 'Critical', color: 'text-red-600' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DropdownData {
  plants: Array<{ id: string; plantName: string; categoryIds?: string[] }>;
  categories: Array<{ id: string; categoryName: string }>;
  technicians: Array<{
    id: string;
    name: string;
    email: string;
    plantIds?: string[];
  }>;
  features?: {
    enable_bm_maintenance: boolean;
  };
}

interface TaskFormData extends TaskPayload {
  /** Local UI key for React lists — never sent to backend */
  _key: string;
  checklist_questions: Array<{ question_text: string; is_mandatory: boolean }>;
  _expanded: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const newTask = (num: number): TaskFormData => ({
  _key: Math.random().toString(36).slice(2),
  task_number: num,
  title: '',
  description: '',
  role_label: '',
  target_date: '',
  assigned_technician_id: '',
  requires_approval: false,
  has_checklist: false,
  checklist_questions: [],
  _expanded: true,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TicketCreatePage() {
  const navigate = useNavigate();
  const locationPath = useLocation().pathname;
  
  // Determine parent route for navigation (e.g. /admin/tickets, /manager/tickets)
  // Assuming the path is something like /manager/tickets/create
  const parentRoute = locationPath.split('/').slice(0, -1).join('/') || '/tickets';

  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId'); // Optional: handle edit flow via query param later if needed.

  const [saving, setSaving] = useState(false);
  const [dropdownData, setDropdownData] = useState<DropdownData>({
    plants: [],
    categories: [],
    technicians: [],
  });
  const [assets, setAssets] = useState<Array<{ id: string; assetId: string }>>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [inventoryAssets, setInventoryAssets] = useState<Array<{ id: string; assetCode: string; model?: string }>>([]);
  const [loadingInventoryAssets, setLoadingInventoryAssets] = useState(false);

  // Form fields
  const [ticketCategory, setTicketType] = useState<string>('General');
  const [maintenanceType, setMaintenanceType] = useState<'BREAKDOWN' | 'COMPLIANCE'>('BREAKDOWN');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [plantId, setPlantId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [tasks, setTasks] = useState<TaskFormData[]>([]);

  // Additional form fields for installation
  const [inventoryAssetId, setInventoryAssetId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [wingId, setWingId] = useState('');
  const [location, setLocation] = useState('');

  const [buildings, setBuildings] = useState<Array<{ id: string; buildingName: string }>>([]);
  const [floors, setFloors] = useState<Array<{ id: string; floorName: string }>>([]);
  const [wings, setWings] = useState<Array<{ id: string; wingName: string }>>([]);



  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const filteredCategories = (() => {
    let base = dropdownData.categories;
    
    // Plant filtering — only show categories linked to the selected plant
    if (plantId) {
      const plant = dropdownData.plants.find((p) => p.id === plantId);
      if (plant?.categoryIds) {
        base = base.filter((c) => plant.categoryIds!.includes(c.id));
      }
    }
    
    // For Refill / HP Test, only show categories whose name contains "fire extinguisher"
    if (ticketCategory === 'Refill / HP Test') {
      base = base.filter((c) =>
        c.categoryName.toLowerCase().includes('fire extinguisher')
      );
    }
    
    return base;
  })();

  const filteredTechnicians = plantId
    ? dropdownData.technicians.filter(
        (t) => !t.plantIds || t.plantIds.includes(plantId),
      )
    : dropdownData.technicians;

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  useEffect(() => {
    managerTicketApi
      .getDropdownData()
      .then((res: any) => {
        setDropdownData(res);
      })
      .catch(() => {});
  }, []);

  // Load assets when plant + category change
  useEffect(() => {
    if (!plantId || !categoryId) {
      setAssets([]);
      return;
    }
    setLoadingAssets(true);
    managerTicketApi
      .getAssets(plantId, categoryId)
      .then((res: any) => {
        setAssets(res.assets || []);
      })
      .catch(() => setAssets([]))
      .finally(() => setLoadingAssets(false));
  }, [plantId, categoryId]);

  // Load inventory assets
  useEffect(() => {
    if (!plantId) {
      setInventoryAssets([]);
      return;
    }
    setLoadingInventoryAssets(true);
    managerTicketApi
      .getInventoryAssets(plantId, categoryId || undefined)
      .then((res: any) => {
        setInventoryAssets(res.assets || []);
      })
      .catch(() => setInventoryAssets([]))
      .finally(() => setLoadingInventoryAssets(false));
  }, [plantId, categoryId]);

  // Load buildings
  useEffect(() => {
    if (!plantId || ticketCategory !== 'Installation') {
      setBuildings([]);
      return;
    }
    managerTicketApi.getBuildings(plantId).then((res: any) => {
      setBuildings(res.buildings || []);
    }).catch(() => setBuildings([]));
  }, [plantId, ticketCategory]);

  // Load floors
  useEffect(() => {
    if (!buildingId) {
      setFloors([]);
      return;
    }
    managerTicketApi.getFloors(buildingId).then((res: any) => {
      setFloors(res.floors || []);
    }).catch(() => setFloors([]));
  }, [buildingId]);

  // Load wings
  useEffect(() => {
    if (!floorId) {
      setWings([]);
      return;
    }
    managerTicketApi.getWings(floorId).then((res: any) => {
      setWings(res.wings || []);
    }).catch(() => setWings([]));
  }, [floorId]);

  // Reset category/asset if they are no longer in the filtered list (e.g. switching to Refill/HP Test)
  useEffect(() => {
    if (categoryId && !filteredCategories.find(c => c.id === categoryId)) {
      setCategoryId('');
      setAssetId('');
      setInventoryAssetId('');
    }
  }, [ticketCategory, filteredCategories, categoryId]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleBack = () => {
    navigate(parentRoute);
  };

  // Tasks CRUD
  const addTask = () =>
    setTasks((prev) => [...prev, newTask(prev.length + 1)]);

  const removeTask = (key: string) =>
    setTasks((prev) =>
      prev
        .filter((s) => s._key !== key)
        .map((s, i) => ({ ...s, task_number: i + 1 })),
    );

  const toggleTask = (key: string) =>
    setTasks((prev) =>
      prev.map((s) =>
        s._key === key ? { ...s, _expanded: !s._expanded } : s,
      ),
    );

  const updateTask = (key: string, field: keyof TaskFormData, value: any) =>
    setTasks((prev) =>
      prev.map((s) => (s._key === key ? { ...s, [field]: value } : s)),
    );

  // Checklist questions
  const addQuestion = (taskKey: string) =>
    setTasks((prev) =>
      prev.map((s) =>
        s._key === taskKey
          ? {
              ...s,
              checklist_questions: [
                ...s.checklist_questions,
                { question_text: '', is_mandatory: true },
              ],
            }
          : s,
      ),
    );

  const updateQuestion = (
    taskKey: string,
    qIdx: number,
    field: string,
    value: any,
  ) =>
    setTasks((prev) =>
      prev.map((s) => {
        if (s._key !== taskKey) return s;
        const qs = [...s.checklist_questions];
        qs[qIdx] = { ...qs[qIdx], [field]: value };
        return { ...s, checklist_questions: qs };
      }),
    );

  const removeQuestion = (taskKey: string, qIdx: number) =>
    setTasks((prev) =>
      prev.map((s) =>
        s._key !== taskKey
          ? s
          : {
              ...s,
              checklist_questions: s.checklist_questions.filter(
                (_, i) => i !== qIdx,
              ),
            },
      ),
    );

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantId || !taskName || !targetDate) {
      toast({
        title: 'Validation Error',
        description: 'Plant, Task Name, and Target Date are required',
        variant: 'destructive',
      });
      return;
    }

    // Technician is mandatory for BM and Refill ticket types
    if ((ticketCategory === 'Breakdown Maintenance' || ticketCategory === 'Refill / HP Test') && !technicianId) {
      toast({
        title: 'Validation Error',
        description: `A technician must be assigned for ${ticketCategory} tickets`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload: CreateTicketPayload = {
        plantId,
        categoryId: categoryId || (undefined as any),
        assetId: assetId || undefined,
        inventoryAssetId: inventoryAssetId || undefined,
        buildingId: buildingId || undefined,
        floorId: floorId || undefined,
        wingId: wingId || undefined,
        location: location || undefined,
        technicianId: technicianId || undefined,
        taskName,
        taskDescription,
        targetDate,
        ticketCategory: ticketCategory as any,
        maintenance_type: ticketCategory === 'Breakdown Maintenance' ? maintenanceType : undefined,
        priority: priority as any,
        tasks:
          tasks.length > 0
            ? tasks.map((s) => ({
                task_number: s.task_number,
                title: s.title,
                description: s.description,
                role_label: s.role_label,
                target_date: s.target_date,
                assigned_technician_id:
                  s.assigned_technician_id || undefined,
                requires_approval: s.requires_approval,
                has_checklist: s.has_checklist,
                checklist_questions: s.has_checklist
                  ? s.checklist_questions.filter((q) =>
                      q.question_text.trim(),
                    )
                  : [],
              }))
            : undefined,
      };

      if (editId) {
        await managerTicketApi.updateTicket(editId, payload);
        toast({ title: 'Ticket updated successfully' });
      } else {
        await managerTicketApi.createTicket(payload);
        toast({ title: 'Ticket created successfully' });
      }

      navigate(parentRoute);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to save ticket',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };



  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen">
      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="px-2"
          >
            <ArrowLeft className="h-5 w-5 mr-1" /> Back to Tickets
          </Button>
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving…' : editId ? 'Update Ticket' : 'Create Ticket'}
            </Button>
          </div>
        </div>

        <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              {editId ? 'Edit Ticket' : 'Create New Ticket'}
            </h2>
            <p className="text-muted-foreground mt-1">
              Select a ticket category and provide necessary details and workflow tasks.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Ticket Type selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold uppercase text-slate-500 tracking-wider">
              1. Select Ticket Category
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {TICKET_TYPES.map((tt) => (
                <button
                  key={tt.value}
                  type="button"
                  onClick={() => setTicketType(tt.value)}
                  className={cn(
                    'p-5 rounded-xl border-2 text-left transition-all',
                    ticketCategory === tt.value
                      ? tt.color + ' shadow-md scale-[1.02]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <p className="text-base font-bold">{tt.label}</p>
                  <p className="text-xs mt-1.5 opacity-80 leading-relaxed">
                    {tt.desc}
                  </p>
                </button>
              ))}
            </div>

            {ticketCategory === 'Breakdown Maintenance' && (
              <div className="mt-4 p-4 border rounded-xl bg-orange-50/50">
                <Label className="text-sm font-semibold text-orange-800 mb-3 block">
                  Maintenance Type
                </Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="maintenanceType" 
                      value="BREAKDOWN" 
                      checked={maintenanceType === 'BREAKDOWN'} 
                      onChange={() => setMaintenanceType('BREAKDOWN')} 
                      className="accent-orange-600"
                    />
                    <span className="text-sm font-medium">Breakdown (Reactive)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="maintenanceType" 
                      value="COMPLIANCE" 
                      checked={maintenanceType === 'COMPLIANCE'} 
                      onChange={() => setMaintenanceType('COMPLIANCE')}
                      className="accent-orange-600"
                    />
                    <span className="text-sm font-medium">Compliance (Regulatory / Testing)</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="space-y-4 p-6 rounded-2xl border bg-card shadow-sm">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              2. Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

              {/* Plant */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Plant <span className="text-red-500">*</span></Label>
                <Select
                  value={plantId}
                  onValueChange={(v) => {
                    setPlantId(v);
                    setCategoryId('');
                    setAssetId('');
                    setInventoryAssetId('');
                    setBuildingId('');
                    setFloorId('');
                    setWingId('');
                  }}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Select plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.plants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.plantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Priority <span className="text-red-500">*</span></Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className={cn("font-medium", p.color)}>{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category (Skip for General as they might not need typical category/asset constraints) */}
              {ticketCategory !== 'General' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category <span className="text-red-500">*</span></Label>
                  <Select
                    value={categoryId}
                    onValueChange={(v) => {
                      setCategoryId(v);
                      setAssetId('');
                      setInventoryAssetId('');
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Asset (Breakdown / Refill / HP Test) */}
              {(ticketCategory === 'Breakdown Maintenance' || ticketCategory === 'Refill / HP Test') && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Asset <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={assetId}
                    onValueChange={setAssetId}
                    disabled={!categoryId}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue
                        placeholder={loadingAssets ? 'Loading…' : 'Select asset'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.assetId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* General Assign Technician */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Assign Technician
                  {(ticketCategory === 'Breakdown Maintenance' || ticketCategory === 'Refill / HP Test') && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                  {ticketCategory !== 'Breakdown Maintenance' && ticketCategory !== 'Refill / HP Test' && (
                    <span className="text-slate-400 ml-1 text-xs font-normal">(Optional)</span>
                  )}
                </Label>
                <Select
                  value={technicianId}
                  onValueChange={setTechnicianId}
                  disabled={!plantId}
                >
                  <SelectTrigger className={cn("h-10 text-sm", (ticketCategory === 'Breakdown Maintenance' || ticketCategory === 'Refill / HP Test') && !technicianId && "border-red-200 focus:ring-red-100")}>
                    <SelectValue placeholder={!plantId ? 'Select plant first' : (ticketCategory === 'Breakdown Maintenance' || ticketCategory === 'Refill / HP Test') ? 'Select technician (required)' : 'Assign later'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTechnicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(ticketCategory === 'Breakdown Maintenance' || ticketCategory === 'Refill / HP Test') && !technicianId && plantId && (
                  <p className="text-xs text-red-500">A technician must be assigned for this ticket type.</p>
                )}
              </div>


              {/* Installation Specific Fields */}
              {ticketCategory === 'Installation' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Inventory Asset To Install</Label>
                    <Select
                      value={inventoryAssetId}
                      onValueChange={setInventoryAssetId}
                      disabled={!plantId}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue
                          placeholder={loadingInventoryAssets ? 'Loading…' : 'Select inventory asset'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryAssets.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.assetCode} {a.model ? `(${a.model})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Building</Label>
                    <Select
                      value={buildingId}
                      onValueChange={(v) => {
                        setBuildingId(v);
                        setFloorId('');
                        setWingId('');
                      }}
                      disabled={!plantId}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.buildingName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Floor</Label>
                    <Select
                      value={floorId}
                      onValueChange={(v) => {
                        setFloorId(v);
                        setWingId('');
                      }}
                      disabled={!buildingId}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select floor" />
                      </SelectTrigger>
                      <SelectContent>
                        {floors.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.floorName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Wing</Label>
                    <Select
                      value={wingId}
                      onValueChange={setWingId}
                      disabled={!floorId}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select wing" />
                      </SelectTrigger>
                      <SelectContent>
                        {wings.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.wingName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Location / Room</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Room 402, Server Room A"
                      className="h-10 text-sm"
                    />
                  </div>
                </>
              )}

              {/* Task Name & Desc & Date (Primary ticket details) */}
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 pt-4 border-t border-dashed border-slate-200">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Task / Issue Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    placeholder="Brief title of the issue or task"
                    className="h-10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Target Completion Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Detailed explanation..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Workflow Tasks ──────────────────────────────────────────── */}
          <div className="space-y-4 p-6 rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b pb-3 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  3. Workflow Tasks (Optional)
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Break the ticket into actionable assigned tasks with optional validation checklists.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                onClick={addTask}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </div>

            {/* Empty state */}
            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-muted-foreground text-sm">
                <div className="bg-white p-3 rounded-full shadow-sm">
                  <ClipboardList className="h-6 w-6 text-slate-400" />
                </div>
                <p>No workflow tasks added — this ticket will be treated as a single task.</p>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary mt-2"
                  onClick={addTask}
                >
                  Create your first task
                </Button>
              </div>
            )}

            {/* Task cards */}
            <div className="space-y-4">
              {tasks.map((task, idx) => (
                <div
                  key={task._key}
                  className={cn(
                    "border rounded-xl overflow-hidden transition-all duration-200",
                    task._expanded ? "shadow-md border-slate-300" : "bg-slate-50/50 hover:bg-slate-50"
                  )}
                >
                  {/* Task Header */}
                  <div
                    className="flex justify-between items-center bg-slate-100/80 px-4 py-3 cursor-pointer"
                    onClick={() => toggleTask(task._key)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white h-7 w-7 rounded flex items-center justify-center font-bold text-xs text-slate-700 shadow-sm border">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-sm text-slate-800">
                        {task.title || `Task ${idx + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTask(task._key);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="text-slate-400">
                        {task._expanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task Body */}
                  {task._expanded && (
                    <div className="p-5 bg-white border-t space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Task Title *</Label>
                          <Input
                            value={task.title || ''}
                            onChange={(e) =>
                              updateTask(task._key, 'title', e.target.value)
                            }
                            placeholder="e.g. Inspect control panel"
                            className="h-10"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Target Date</Label>
                          <Input
                            type="date"
                            value={task.target_date || ''}
                            onChange={(e) =>
                              updateTask(
                                task._key,
                                'target_date',
                                e.target.value,
                              )
                            }
                            className="h-10"
                          />
                        </div>
                        <div className="col-span-1 md:col-span-2 space-y-2">
                          <Label className="text-sm font-medium">Instructions</Label>
                          <Textarea
                            value={task.description || ''}
                            onChange={(e) =>
                              updateTask(
                                task._key,
                                'description',
                                e.target.value,
                              )
                            }
                            placeholder="Detailed instructions for the technician"
                            className="min-h-[80px]"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Assign Technician</Label>
                          <Select
                            value={task.assigned_technician_id || 'unassigned'}
                            onValueChange={(v) =>
                              updateTask(
                                task._key,
                                'assigned_technician_id',
                                v === 'unassigned' ? '' : v,
                              )
                            }
                          >
                            <SelectTrigger className="h-10 bg-slate-50">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned" className="text-slate-500 italic">
                                Unassigned
                              </SelectItem>
                              {filteredTechnicians.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-6 pt-4 border-t border-slate-100">
                        <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border flex-1">
                          <Switch
                            id={`req-app-${task._key}`}
                            checked={task.requires_approval}
                            onCheckedChange={(c) =>
                              updateTask(task._key, 'requires_approval', c)
                            }
                          />
                          <Label
                            htmlFor={`req-app-${task._key}`}
                            className="text-sm cursor-pointer"
                          >
                            Requires manager approval upon completion
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border flex-1">
                          <Switch
                            id={`chk-${task._key}`}
                            checked={task.has_checklist}
                            onCheckedChange={(c) =>
                              updateTask(task._key, 'has_checklist', c)
                            }
                          />
                          <Label
                            htmlFor={`chk-${task._key}`}
                            className="text-sm cursor-pointer"
                          >
                            Add verification checklist
                          </Label>
                        </div>
                      </div>

                      {/* Checklist Questions */}
                      {task.has_checklist && (
                        <div className="mt-6 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                          <div className="flex items-center justify-between mb-4">
                            <Label className="text-sm font-semibold text-blue-900">
                              Checklist Items
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-blue-200 hover:bg-blue-100 text-blue-700"
                              onClick={() => addQuestion(task._key)}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Question
                            </Button>
                          </div>
                          
                          {task.checklist_questions.length === 0 ? (
                            <div className="text-sm text-blue-700/60 italic p-2 pb-0">
                              No questions added yet.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {task.checklist_questions.map((q, qIdx) => (
                                <div
                                  key={qIdx}
                                  className="flex gap-3 items-start bg-white p-3 rounded-lg border shadow-sm"
                                >
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      value={q.question_text}
                                      onChange={(e) =>
                                        updateQuestion(
                                          task._key,
                                          qIdx,
                                          'question_text',
                                          e.target.value,
                                        )
                                      }
                                      placeholder={`Question ${qIdx + 1}`}
                                      className="h-9"
                                    />
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={q.is_mandatory}
                                        onCheckedChange={(c) =>
                                          updateQuestion(
                                            task._key,
                                            qIdx,
                                            'is_mandatory',
                                            c,
                                          )
                                        }
                                        id={`q-${task._key}-${qIdx}`}
                                      />
                                      <Label
                                        htmlFor={`q-${task._key}-${qIdx}`}
                                        className="text-xs text-muted-foreground"
                                      >
                                        Mandatory
                                      </Label>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-red-500 hover:bg-red-50 mt-0"
                                    onClick={() =>
                                      removeQuestion(task._key, qIdx)
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
