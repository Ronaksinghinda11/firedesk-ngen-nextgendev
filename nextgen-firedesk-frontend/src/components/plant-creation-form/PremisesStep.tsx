// PremisesStep.tsx - Ultra-compact layout
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X, Pencil } from "lucide-react";
import React, { useState, useEffect, FormEvent } from "react";

interface PremisesStepProps { formData: any; setFormData: (data: any) => void; }

const floorUsageOptions = [
  { value: "production", label: "Production" }, { value: "storage", label: "Storage" },
  { value: "office", label: "Office" }, { value: "laboratory", label: "Laboratory" },
  { value: "warehouse", label: "Warehouse" }, { value: "others", label: "Others" },
];
const wingOptions = ["A", "B", "C", "D"];

const SubSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="border border-gray-200 rounded-md p-2 shadow-sm bg-white h-full">
    <h4 className="text-sm font-semibold text-gray-900 mb-2 pb-1 border-b border-gray-100">{title}</h4>
    <div className="">{children}</div>
  </div>
);

export function PremisesStep({ formData, setFormData }: PremisesStepProps) {
  // Initialize nested arrays if they don't exist
  useEffect(() => {
    if (!formData.buildings) setFormData((prev: any) => ({ ...prev, buildings: [] }));
    if (!formData.entrances) setFormData((prev: any) => ({ ...prev, entrances: [] }));
  }, []); // Run once on mount

  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [showEntranceForm, setShowEntranceForm] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [building, setBuilding] = useState({ buildingName: "", numFloors: "", buildingHeight: "", staircaseAvailable: "no", staircaseQuantity: "", staircaseType: "", staircaseWidth: "", staircaseFireRating: "", staircasePressurization: "no", staircaseEmergencyLighting: "no", liftAvailable: "no", liftQuantity: "", floors: [] as any[] });
  const [floor, setFloor] = useState({ floorName: "", floorUsage: "", floorArea: "", wings: [] as string[] });
  const [entrance, setEntrance] = useState({ entranceName: "", entranceWidth: "" });

  const handleChange = (field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value }));

  // Prevent negative numeric input
  const clampNonNegative = (e: FormEvent<HTMLInputElement>) => {
    const val = Number(e.currentTarget.value);
    if (val < 0) e.currentTarget.value = '0';
  };
  const resetBuilding = () => { setBuilding({ buildingName: "", numFloors: "", buildingHeight: "", staircaseAvailable: "no", staircaseQuantity: "", staircaseType: "", staircaseWidth: "", staircaseFireRating: "", staircasePressurization: "no", staircaseEmergencyLighting: "no", liftAvailable: "no", liftQuantity: "", floors: [] }); setEditingBuildingId(null); };

  const handleAddBuilding = () => {
    const newBuilding = { ...building, id: editingBuildingId || Date.now().toString() };
    if (editingBuildingId) setFormData((prev: any) => ({ ...prev, buildings: (prev.buildings || []).map((b: any) => b.id === editingBuildingId ? newBuilding : b) }));
    else setFormData((prev: any) => ({ ...prev, buildings: [...(prev.buildings || []), newBuilding] }));
    resetBuilding(); setShowBuildingForm(false);
  };

  const handleEditBuilding = (b: any) => {
    setBuilding({ buildingName: b.buildingName || "", numFloors: b.numFloors || "", buildingHeight: b.buildingHeight || "", staircaseAvailable: b.staircaseAvailable || "no", staircaseQuantity: b.staircaseQuantity || "", staircaseType: b.staircaseType || "", staircaseWidth: b.staircaseWidth || "", staircaseFireRating: b.staircaseFireRating || "", staircasePressurization: b.staircasePressurization || "no", staircaseEmergencyLighting: b.staircaseEmergencyLighting || "no", liftAvailable: b.liftAvailable || "no", liftQuantity: b.liftQuantity || "", floors: b.floors || [] });
    setEditingBuildingId(b.id); setShowBuildingForm(true);
  };

  const removeBuilding = (id: string) => setFormData((prev: any) => ({ ...prev, buildings: prev.buildings?.filter((b: any) => b.id !== id) || [] }));
  const handleAddFloor = () => { if (!floor.floorName || !floor.floorUsage) return; setBuilding((prev) => ({ ...prev, floors: [...prev.floors, { ...floor, id: Date.now().toString() }] })); setFloor({ floorName: "", floorUsage: "", floorArea: "", wings: [] }); };
  const removeFloor = (idx: number) => setBuilding((prev) => ({ ...prev, floors: prev.floors.filter((_, i) => i !== idx) }));
  const toggleWing = (wing: string) => setFloor((prev) => ({ ...prev, wings: prev.wings.includes(wing) ? prev.wings.filter(w => w !== wing) : [...prev.wings, wing] }));
  const handleAddEntrance = () => { if (!entrance.entranceName || !entrance.entranceWidth) return; setFormData((prev: any) => ({ ...prev, entrances: [...(prev.entrances || []), { ...entrance, id: Date.now().toString() }] })); setEntrance({ entranceName: "", entranceWidth: "" }); setShowEntranceForm(false); };
  const removeEntrance = (id: string) => setFormData((prev: any) => ({ ...prev, entrances: prev.entrances?.filter((e: any) => e.id !== id) || [] }));
  const isBuildingValid = building.buildingName && building.numFloors && building.buildingHeight;

  return (
    <div className="space-y-4">
      {/* 1. Plant Infrastructure Summary */}
      <SubSection title="Plant Infrastructure Summary">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">Main Buildings</Label><Input type="number" min="0" value={formData.mainBuildings || ""} onChange={(e) => handleChange("mainBuildings", e.target.value)} onInput={clampNonNegative} className="h-9 text-sm" placeholder="0" /></div>
          <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">Sub Buildings</Label><Input type="number" min="0" value={formData.subBuildings || ""} onChange={(e) => handleChange("subBuildings", e.target.value)} onInput={clampNonNegative} className="h-9 text-sm" placeholder="0" /></div>
          <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">Total Plant Area (sq.m)</Label><Input id="field-totalPlantArea" type="number" min="0" value={formData.totalPlantArea || ""} onChange={(e) => handleChange("totalPlantArea", e.target.value)} onInput={clampNonNegative} className="h-9 text-sm" placeholder="0" /></div>
          <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">Built-Up Area (sq.m)</Label><Input id="field-totalBuildUpArea" type="number" min="0" value={formData.totalBuildUpArea || ""} onChange={(e) => handleChange("totalBuildUpArea", e.target.value)} onInput={clampNonNegative} className="h-9 text-sm" placeholder="0" /></div>
          <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">DG Available</Label><Select value={formData.dgAvailable || "no"} onValueChange={(v) => { handleChange("dgAvailable", v); if (v === "no") handleChange("dgQuantity", 0); }}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
          <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">DG Quantity</Label><Input type="number" min="0" value={formData.dgQuantity || ""} onChange={(e) => handleChange("dgQuantity", e.target.value)} onInput={clampNonNegative} disabled={formData.dgAvailable !== "yes"} className="h-9 text-sm" placeholder="0" /></div>
        </div>
      </SubSection>

      {/* 2. Buildings */}
      <SubSection title={`Buildings (${(formData.buildings || []).length})`}>
        {/* List of Buildings */}
        {formData.buildings?.length > 0 && (
          <div className="space-y-2 mb-4">
            {formData.buildings.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-md">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{b.buildingName}</span>
                  <span className="text-xs text-gray-500">{b.numFloors} Floors, {b.buildingHeight}m Height {b.staircaseAvailable === "yes" && ` • ${b.staircaseQuantity} Stairs`} {b.liftAvailable === "yes" && ` • ${b.liftQuantity} Lifts`}</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleEditBuilding(b)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"><Pencil className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeBuilding(b.id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-800"><X className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Building Button */}
        {!showBuildingForm && (
          <Button type="button" variant="outline" size="sm" className="w-full border-dashed h-9 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900" onClick={() => { setShowBuildingForm(true); resetBuilding(); }}><Plus className="h-4 w-4 mr-2" />Add New Building</Button>
        )}

        {/* Building Form */}
        {showBuildingForm && (
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50/50 space-y-2 mt-2">
            <h5 className="text-sm font-medium text-gray-900 border-b pb-1 mb-1">{editingBuildingId ? "Edit Building" : "New Building Details"}</h5>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4 space-y-1"><Label className="text-sm font-medium">Building Name <span className="text-red-500">*</span></Label><Input value={building.buildingName} onChange={(e) => setBuilding({ ...building, buildingName: e.target.value })} className="h-9 text-sm" placeholder="Block A" /></div>
              <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">Floors <span className="text-red-500">*</span></Label><Input type="number" min="0" value={building.numFloors} onChange={(e) => setBuilding({ ...building, numFloors: e.target.value })} onInput={clampNonNegative} className="h-9 text-sm" placeholder="5" /></div>
              <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">Height (M) <span className="text-red-500">*</span></Label><Input type="number" min="0" value={building.buildingHeight} onChange={(e) => setBuilding({ ...building, buildingHeight: e.target.value })} onInput={clampNonNegative} className="h-9 text-sm" placeholder="20" /></div>
              <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">Lift Available</Label><Select value={building.liftAvailable} onValueChange={(v) => setBuilding({ ...building, liftAvailable: v, liftQuantity: v === "no" ? "" : building.liftQuantity })}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
              <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">Lift Qty</Label><Input type="number" min="0" value={building.liftQuantity} onChange={(e) => setBuilding({ ...building, liftQuantity: e.target.value })} onInput={clampNonNegative} disabled={building.liftAvailable === "no"} className="h-9 text-sm" placeholder="2" /></div>
            </div>

            {/* Floors Sub-section */}
            <div className="bg-white border rounded-md p-2">
              <h6 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Detailed Floors</h6>
              <div className="grid grid-cols-12 gap-2 items-end mb-2">
                <div className="col-span-3 space-y-1"><Label className="text-xs font-medium">Floor Name</Label><Input value={floor.floorName} onChange={(e) => setFloor({ ...floor, floorName: e.target.value })} className="h-8 text-xs" placeholder="Ground" /></div>
                <div className="col-span-3 space-y-1"><Label className="text-xs font-medium">Usage</Label><Select value={floor.floorUsage} onValueChange={(v) => setFloor({ ...floor, floorUsage: v })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{floorUsageOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="col-span-2 space-y-1"><Label className="text-xs font-medium">Area (Sq.M)</Label><Input type="number" min="0" value={floor.floorArea} onChange={(e) => setFloor({ ...floor, floorArea: e.target.value })} onInput={clampNonNegative} className="h-8 text-xs" placeholder="500" /></div>
                <div className="col-span-3 space-y-1"><Label className="text-xs font-medium">Wings</Label><div className="flex gap-1 h-8 items-center">{wingOptions.map((w) => <button key={w} type="button" onClick={() => toggleWing(w)} className={`px-2 h-7 text-xs rounded border ${floor.wings.includes(w) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{w}</button>)}</div></div>
                <div className="col-span-1"><Button type="button" size="sm" className="w-full h-8 bg-gray-900 text-white hover:bg-gray-800" onClick={handleAddFloor} disabled={!floor.floorName || !floor.floorUsage}><Plus className="h-4 w-4" /></Button></div>
              </div>
              {building.floors.length > 0 && <div className="flex flex-wrap gap-2">{building.floors.map((f, i) => <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-700 font-medium">{f.floorName} ({floorUsageOptions.find(o => o.value === f.floorUsage)?.label}) {f.floorArea && `${f.floorArea}m²`} {f.wings?.length > 0 && `[${f.wings.join(",")}]`}<button type="button" onClick={() => removeFloor(i)} className="text-gray-400 hover:text-red-500"><X className="h-3 w-3" /></button></span>)}</div>}
            </div>

            {/* Staircase Sub-section */}
            <div className="bg-white border rounded-md p-2">
              <h6 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Staircase Details</h6>
              <div className="grid grid-cols-7 gap-2">
                <div className="col-span-1 space-y-1"><Label className="text-xs font-medium">Staircase</Label><Select value={building.staircaseAvailable} onValueChange={(v) => setBuilding({ ...building, staircaseAvailable: v, staircaseQuantity: v === "no" ? "" : building.staircaseQuantity })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
                <div className="col-span-1 space-y-1"><Label className="text-xs font-medium">Qty</Label><Input type="number" min="0" value={building.staircaseQuantity} onChange={(e) => setBuilding({ ...building, staircaseQuantity: e.target.value })} onInput={clampNonNegative} disabled={building.staircaseAvailable === "no"} className="h-8 text-xs" placeholder="2" /></div>
                <div className="col-span-1 space-y-1"><Label className="text-xs font-medium">Type</Label><Select value={building.staircaseType} onValueChange={(v) => setBuilding({ ...building, staircaseType: v })} disabled={building.staircaseAvailable === "no"}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="enclosed">Enclosed</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="spiral">Spiral</SelectItem></SelectContent></Select></div>
                <div className="col-span-1 space-y-1"><Label className="text-xs font-medium">Width (M)</Label><Input type="number" min="0" value={building.staircaseWidth} onChange={(e) => setBuilding({ ...building, staircaseWidth: e.target.value })} onInput={clampNonNegative} disabled={building.staircaseAvailable === "no"} className="h-8 text-xs" placeholder="1.2" /></div>
                <div className="col-span-1 space-y-1"><Label className="text-xs font-medium">Fire Rating</Label><Select value={building.staircaseFireRating} onValueChange={(v) => setBuilding({ ...building, staircaseFireRating: v })} disabled={building.staircaseAvailable === "no"}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Mins" /></SelectTrigger><SelectContent><SelectItem value="60">60</SelectItem><SelectItem value="90">90</SelectItem><SelectItem value="120">120</SelectItem></SelectContent></Select></div>
                <div className="col-span-1 space-y-1"><Label className="text-xs font-medium">Pressurization</Label><Select value={building.staircasePressurization} onValueChange={(v) => setBuilding({ ...building, staircasePressurization: v })} disabled={building.staircaseAvailable === "no"}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
                <div className="col-span-1 space-y-1"><Label className="text-xs font-medium">Emg Light</Label><Select value={building.staircaseEmergencyLighting} onValueChange={(v) => setBuilding({ ...building, staircaseEmergencyLighting: v })} disabled={building.staircaseAvailable === "no"}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => { setShowBuildingForm(false); resetBuilding(); }} className="h-9">Cancel</Button>
              <Button type="button" size="sm" className="h-9 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleAddBuilding} disabled={!isBuildingValid}>{editingBuildingId ? "Update" : "Add"} Building</Button>
            </div>
          </div>
        )}
      </SubSection>

      {/* 3. Entrances */}
      <SubSection title={`Entrances (${(formData.entrances || []).length})`}>
        {formData.entrances?.length > 0 && <div className="flex flex-wrap gap-2 mb-4">{formData.entrances.map((e: any) => <span key={e.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">{e.entranceName} - {e.entranceWidth}m<button type="button" onClick={() => removeEntrance(e.id)} className="text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button></span>)}</div>}

        {!showEntranceForm ? (
          <Button type="button" variant="outline" size="sm" className="w-full border-dashed h-9 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900" onClick={() => setShowEntranceForm(true)}><Plus className="h-4 w-4 mr-2" />Add New Entrance</Button>
        ) : (
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50/50 mt-2">
            <h5 className="text-sm font-medium text-gray-900 border-b pb-2 mb-2">New Entrance Details</h5>
            <div className="grid grid-cols-4 gap-4 items-end">
              <div className="col-span-2 space-y-1"><Label className="text-sm font-medium">Entrance Name <span className="text-red-500">*</span></Label><Input value={entrance.entranceName} onChange={(e) => setEntrance({ ...entrance, entranceName: e.target.value })} className="h-9 text-sm" placeholder="Main Gate" /></div>
              <div className="col-span-1 space-y-1"><Label className="text-sm font-medium">Width (M) <span className="text-red-500">*</span></Label><Input type="number" min="0" value={entrance.entranceWidth} onChange={(e) => setEntrance({ ...entrance, entranceWidth: e.target.value })} onInput={clampNonNegative} className="h-9 text-sm" placeholder="6" /></div>
              <div className="col-span-1 flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1 h-9" onClick={() => setShowEntranceForm(false)}>Cancel</Button>
                <Button type="button" size="sm" className="flex-1 h-9 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleAddEntrance} disabled={!entrance.entranceName || !entrance.entranceWidth}>Add</Button>
              </div>
            </div>
          </div>
        )}
      </SubSection>
    </div>
  );
}

export default PremisesStep;