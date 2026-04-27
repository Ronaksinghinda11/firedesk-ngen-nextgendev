import React, { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertTriangle,
  Upload,
  Save,
  Loader2,
  FileText,
  Image as ImageIcon,
  Package, Trash2, ChevronDown, ChevronUp, Clock, XCircle, Plus
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { managerTicketApi } from "@/services/api/managerTicketApi";
import { api } from "@/lib/api";


interface SpareItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  available_qty?: number;
}

interface SparePart {
  spare_id: string;
  spare_name: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

interface RefillMeta {
  service_type?: string;
  extinguisher_type?: string;
  capacity?: string;
  serial_number?: string;
  last_service_date?: string;
  due_date?: string;
  activity_performed?: string;
  test_result?: string;
  pressure_reading?: string;
  seal_pin_condition?: string;
  hose_condition?: string;
  cylinder_condition?: string;
  next_due_date?: string;
  vendor_name?: string;
  certificate_url?: string;
  certificate_name?: string;
  before_photo_url?: string;
  after_photo_url?: string;
  remarks?: string;
  is_spare_required?: boolean | null;
  is_final?: boolean;
}

interface Props {
  ticketId: string;
  initialMeta?: RefillMeta;
  existingSpares?: SparePart[];
  readOnly?: boolean;
  ticketStatus?: string;
  onSaved?: () => void;
}

export function RefillHPTestForm({
  ticketId,
  initialMeta = {},
  existingSpares = [],
  readOnly = false,
  ticketStatus,
  onSaved,
}: Props) {
  const [meta, setMeta] = useState<RefillMeta>(initialMeta);
  const [saving, setSaving] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  const [spareRequests, setSpareRequests] = useState<SparePart[]>(existingSpares);
  const [availableSpares, setAvailableSpares] = useState<SpareItem[]>([]);
  const [loadingSpares, setLoadingSpares] = useState(false);
  const [showSpareSection, setShowSpareSection] = useState(existingSpares.length > 0);
  const [usageRecords, setUsageRecords] = useState<any[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    // Only set if we actually have items coming in initially
    if (existingSpares && existingSpares.length > 0) {
      setSpareRequests(existingSpares);
      setShowSpareSection(true);
    }
  }, []); // Remove existingSpares from deps to prevent re-render wipes


  const loadUsage = async () => {
    setLoadingUsage(true);
    try {
      const res: any = await managerTicketApi.getInventoryUsage(ticketId);
      setUsageRecords(res.usage || []);
    } catch (err) {
      console.error("Failed to load usage", err);
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, [ticketId]);

  const pendingRequests = usageRecords.filter(r => r.status === 'pending');
  const rejectedRequests = usageRecords.filter(r => r.status === 'rejected');
  const approvedRequests = usageRecords.filter(r => r.status === 'approved' || r.status === 'consumed');
  const hasPendingSpares = pendingRequests.length > 0;
  const hasRejectedSpares = rejectedRequests.length > 0;
  const hasRequestedSpares = usageRecords.some(r => r.item_type === 'spare') || spareRequests.length > 0;
  
  const allSparesApproved = approvedRequests.length > 0 && pendingRequests.length === 0 && rejectedRequests.length === 0;

  // If spares already approved: unlock everything, no need to ask again
  const isStage2Locked = readOnly ? false :
    allSparesApproved ? false :
    (meta.is_spare_required == null) ||
    (meta.is_spare_required === true && hasRejectedSpares) || 
    (meta.is_spare_required === true && hasPendingSpares) ||
    (meta.is_spare_required === true && !hasRequestedSpares);

  const loadAvailableSpares = async () => {
    setLoadingSpares(true);
    try {
      const res: any = await managerTicketApi.getInventorySpares({ limit: 500 });
      const items: SpareItem[] = (res?.spares ?? res?.data ?? []).map((s: any) => ({
        item_id: s.id,
        item_name: s.spare_name,
        quantity: 1,
        unit: s.unit_of_measurement ?? "pcs",
        unit_price: parseFloat(s.unit_price) || 0,
        available_qty: parseFloat(s.quantity) || 0,
      }));
      setAvailableSpares(items);
    } catch (err) {
      console.error("Failed to load spares", err);
    } finally {
      setLoadingSpares(false);
    }
  };

  const toggleSpareSection = () => {
    if (!showSpareSection && availableSpares.length === 0) {
      loadAvailableSpares();
    }
    setShowSpareSection(v => !v);
  };

  const addSpare = (item: SpareItem) => {
    const exists = spareRequests.find(s => s.spare_id === item.item_id);
    if (exists) {
      setSpareRequests(prev =>
        prev.map(s => s.spare_id === item.item_id ? { ...s, quantity: s.quantity + 1 } : s)
      );
    } else {
      setSpareRequests(prev => [...prev, {
        spare_id: item.item_id,
        spare_name: item.item_name,
        quantity: 1,
        unit: item.unit,
        notes: "",
      }]);
    }
  };

  const removeSpare = (spareId: string) => {
    setSpareRequests(prev => prev.filter(s => s.spare_id !== spareId));
  };

  const updateSpareQty = (spareId: string, qty: number) => {
    setSpareRequests(prev =>
      prev.map(s => s.spare_id === spareId ? { ...s, quantity: Math.max(1, qty) } : s)
    );
  };

  const updateSpareNotes = (spareId: string, notes: string) => {
    setSpareRequests(prev =>
      prev.map(s => s.spare_id === spareId ? { ...s, notes } : s)
    );
  };


  useEffect(() => {
    if (initialMeta && Object.keys(initialMeta).length > 0) {
      setMeta(initialMeta);
    }
  }, []); // Remove initialMeta to prevent re-render state wipe

  const setField = (field: keyof RefillMeta, value: any) => {
    setMeta(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldUrl: keyof RefillMeta,
    fieldName?: keyof RefillMeta,
    setUploading?: (val: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (setUploading) setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Using the generic API instance to upload file to postgres directly
      const response: any = await api.post("/upload", formData);

      if (response && response.data && response.data.url) {
        setMeta(prev => {
           const updated = { ...prev };
           (updated as any)[fieldUrl] = response.data.url;
           if (fieldName) (updated as any)[fieldName] = response.data.originalName || file.name;
           return updated;
        });
        toast({ title: "File uploaded successfully" });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      if (setUploading) setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleSave = async (isFinal: boolean = false) => {
    if (isFinal && (!meta.activity_performed || !meta.test_result)) {
      toast({ title: "Please fill out required execution fields (Activity, Test Result) before finalization.", variant: "destructive", duration: 5000 });
      return;
    }

    setSaving(true);
    try {
      const payloadMeta = { ...meta, is_final: isFinal };
      await managerTicketApi.updateRefillMetadata(ticketId, payloadMeta);

      if (spareRequests.length > 0 && meta.is_spare_required === true) {
        await managerTicketApi.requestSpares(
          ticketId,
          spareRequests.map(s => ({
            item_id: s.spare_id,
            item_name: s.spare_name,
            quantity: s.quantity,
            notes: s.notes,
            item_type: "spare",
          }))
        );
      }

      toast({ title: isFinal ? "Refill form finalized" : "Progress saved" });
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Failed to save form", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      <div className="space-y-4">
        {hasPendingSpares && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-800 tracking-tight">Waiting for Spare Approval</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                Some requested spare parts are pending approval from the inventory manager. You cannot proceed until approved.
              </p>
            </div>
          </div>
        )}

        {hasRejectedSpares && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-800 tracking-tight">Spare Request Rejected</p>
              <p className="text-xs text-red-600 leading-relaxed">
                One or more spare requests were rejected. Please review and request alternative parts to proceed.
              </p>
            </div>
          </div>
        )}

        {allSparesApproved && !readOnly && hasRequestedSpares && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-800 tracking-tight">Spares Approved & Utilized</p>
              <p className="text-xs text-emerald-600 leading-relaxed">
                All requested spare parts have been approved. You may now complete the service details and submit the form.
              </p>
            </div>
          </div>
        )}
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Service Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Row 1 */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Service Type</Label>
              <Select value={meta.service_type || ""} onValueChange={v => setField("service_type", v)} disabled={readOnly || isStage2Locked}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Refill">Refill</SelectItem>
                  <SelectItem value="HP Test">HP Test</SelectItem>
                  <SelectItem value="Refill & HP Test">Refill & HP Test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Extinguisher Type</Label>
              <Select value={meta.extinguisher_type || ""} onValueChange={v => setField("extinguisher_type", v)} disabled={readOnly || isStage2Locked}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABC Powder">ABC Powder</SelectItem>
                  <SelectItem value="CO2">CO2</SelectItem>
                  <SelectItem value="Water">Water</SelectItem>
                  <SelectItem value="Foam">Foam</SelectItem>
                  <SelectItem value="Wet Chemical">Wet Chemical</SelectItem>
                  <SelectItem value="Clean Agent">Clean Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Capacity</Label>
              <Input
                type="text"
                placeholder="e.g. 4.5kg, 9ltr"
                value={meta.capacity || ""}
                onChange={e => setField("capacity", e.target.value)}
                className="h-9 text-sm"
                disabled={readOnly || isStage2Locked}
              />
            </div>

            {/* Row 2 */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Serial Number / Tag</Label>
              <Input
                type="text"
                value={meta.serial_number || ""}
                onChange={e => setField("serial_number", e.target.value)}
                className="h-9 text-sm"
                disabled={readOnly || isStage2Locked}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Last Service Date</Label>
              <Input
                type="date"
                value={meta.last_service_date || ""}
                onChange={e => setField("last_service_date", e.target.value)}
                className="h-9 text-sm"
                disabled={readOnly || isStage2Locked}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Target/Due Date</Label>
              <Input
                type="date"
                value={meta.due_date || ""}
                onChange={e => setField("due_date", e.target.value)}
                className="h-9 text-sm"
                disabled={readOnly || isStage2Locked}
              />
            </div>

            {/* Row 3 */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Activity Performed</Label>
              <Select value={meta.activity_performed || ""} onValueChange={v => setField("activity_performed", v)} disabled={readOnly || isStage2Locked}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Refilled">Refilled</SelectItem>
                  <SelectItem value="Hydro Tested">Hydro Tested</SelectItem>
                  <SelectItem value="Condemned">Condemned</SelectItem>
                  <SelectItem value="Inspected & Passed">Inspected & Passed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Test Result</Label>
              <Select value={meta.test_result || ""} onValueChange={v => setField("test_result", v)} disabled={readOnly || isStage2Locked}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Pass / Fail" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Pressure Reading (HP Test)</Label>
              <Input
                type="text"
                placeholder="e.g. 15 Bar"
                value={meta.pressure_reading || ""}
                onChange={e => setField("pressure_reading", e.target.value)}
                className="h-9 text-sm"
                disabled={readOnly || isStage2Locked}
              />
            </div>
          </div>
        
          {!allSparesApproved && (
            <div className="mt-6 pt-5 border-t border-blue-100">
               <Label className="text-sm font-semibold text-gray-800 mb-3 block">
                 Are spare parts required for this service? <span className="text-red-500">*</span>
               </Label>
               <div className="flex gap-4">
                   <button type="button" 
                      onClick={() => setField("is_spare_required", true)}
                      className={`px-5 py-2.5 text-sm font-semibold border rounded-lg transition-all ${meta.is_spare_required === true ? 'bg-blue-100 text-blue-800 border-blue-300 ring-2 ring-blue-500 ring-offset-1' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border-gray-200'}`} disabled={readOnly}>Yes, spares required</button>
                   <button type="button" 
                      onClick={() => setField("is_spare_required", false)}
                      className={`px-5 py-2.5 text-sm font-semibold border rounded-lg transition-all ${meta.is_spare_required === false ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500 ring-offset-1' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border-gray-200'}`} disabled={readOnly}>No spares needed</button>
               </div>
            </div>
          )}

        </CardContent>
      </Card>

      <Card className={cn("border shadow-sm transition-opacity", isStage2Locked && "opacity-60")}>
        <CardHeader className="py-3 px-5 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Checklist & Next Due
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Seal / Pin Condition</Label>
              <Select value={meta.seal_pin_condition || ""} onValueChange={v => setField("seal_pin_condition", v)} disabled={readOnly || isStage2Locked}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intact">Intact</SelectItem>
                  <SelectItem value="Broken/Missing">Broken/Missing</SelectItem>
                  <SelectItem value="Replaced">Replaced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Hose Condition</Label>
              <Select value={meta.hose_condition || ""} onValueChange={v => setField("hose_condition", v)} disabled={readOnly || isStage2Locked}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Cracked/Damaged">Cracked/Damaged</SelectItem>
                  <SelectItem value="Replaced">Replaced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Cylinder Condition</Label>
              <Select value={meta.cylinder_condition || ""} onValueChange={v => setField("cylinder_condition", v)} disabled={readOnly || isStage2Locked}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good (No dent/rust)</SelectItem>
                  <SelectItem value="Minor Rust">Minor Rust</SelectItem>
                  <SelectItem value="Dented/Corroded">Dented/Corroded</SelectItem>
                  <SelectItem value="Condemned">Condemned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Next Due Date</Label>
              <Input
                type="date"
                value={meta.next_due_date || ""}
                onChange={e => setField("next_due_date", e.target.value)}
                className="h-9 text-sm"
                disabled={readOnly || isStage2Locked}
              />
            </div>
            
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Vendor Name</Label>
              <Input
                type="text"
                placeholder="Vendor performing service"
                value={meta.vendor_name || ""}
                onChange={e => setField("vendor_name", e.target.value)}
                className="h-9 text-sm border-purple-200"
                disabled={readOnly || isStage2Locked}
              />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* ─── Spare Parts Request ─── */}
      {!readOnly && meta.is_spare_required === true && (
        <Card className="border border-purple-100 shadow-sm">
          <CardHeader className="py-3 px-5 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100">
            <button
              type="button"
              className="flex items-center justify-between w-full"
              onClick={toggleSpareSection}
            >
              <CardTitle className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Spare Parts Request
                {spareRequests.length > 0 && (
                  <Badge className="ml-2 bg-purple-600 text-white text-xs">{spareRequests.length}</Badge>
                )}
              </CardTitle>
              {showSpareSection
                ? <ChevronUp className="h-4 w-4 text-purple-500" />
                : <ChevronDown className="h-4 w-4 text-purple-500" />
              }
            </button>
          </CardHeader>

          {showSpareSection && (
            <CardContent className="p-5 space-y-4">
              {allSparesApproved ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Spares have been approved and utilized for this ticket.
                  </div>
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilized Parts</p>
                    {approvedRequests.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="text-sm font-medium text-gray-800">{s.item_name}</span>
                        <span className="text-sm font-bold text-gray-600 px-2 py-1 bg-gray-200 rounded-md">Qty: {s.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Currently requested spares */}
                  {spareRequests.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Requested Parts</p>
                      {spareRequests.map(s => (
                        <div key={s.spare_id} className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-800">{s.spare_name}</div>
                            <Input
                              placeholder="Notes / reason..."
                              value={s.notes || ""}
                              onChange={e => updateSpareNotes(s.spare_id, e.target.value)}
                              className="mt-1.5 h-7 text-xs border-purple-200"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateSpareQty(s.spare_id, s.quantity - 1)}
                              className="h-7 w-7 rounded border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 flex items-center justify-center text-lg leading-none"
                            >−</button>
                            <span className="w-8 text-center font-bold text-sm">{s.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateSpareQty(s.spare_id, s.quantity + 1)}
                              className="h-7 w-7 rounded border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 flex items-center justify-center text-lg leading-none"
                            >+</button>
                            <span className="text-xs text-gray-500 w-8">{s.unit}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSpare(s.spare_id)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inventory spare picker */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      Add from Inventory {loadingSpares && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                    </p>
                    {availableSpares.length === 0 && !loadingSpares ? (
                      <p className="text-sm text-gray-400 italic">No inventory spares available or not loaded.</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2 bg-gray-50">
                        {availableSpares.map(item => {
                          const isAdded = spareRequests.some(s => s.spare_id === item.item_id);
                          return (
                            <div
                              key={item.item_id}
                              className={`flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
                                ${isAdded ? "bg-purple-50 border border-purple-200" : "bg-white border border-transparent hover:border-gray-200 hover:bg-gray-50"}
                              `}
                              onClick={() => addSpare(item)}
                            >
                              <div>
                                <span className="font-medium text-gray-800">{item.item_name}</span>
                                <span className="ml-2 text-xs text-gray-400">{item.unit}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-semibold ${item.available_qty === 0 ? "text-red-500" : "text-gray-500"}`}>
                                  Stock: {item.available_qty}
                                </span>
                                {isAdded
                                  ? <Badge className="bg-purple-100 text-purple-700 text-xs">Added</Badge>
                                  : <Plus className="h-4 w-4 text-gray-400" />
                                }
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Spare parts must be <strong>approved by the inventory manager</strong> before they are deducted. Ticket status will change to "Waiting for spare".</span>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* ─── Read-only Spare Summary ─── */}
      {readOnly && existingSpares?.length > 0 && (
        <Card className="border border-purple-100 shadow-sm">
          <CardHeader className="py-3 px-5 bg-purple-50 border-b border-purple-100">
            <CardTitle className="text-sm font-semibold text-purple-800 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Spare Parts Used ({existingSpares.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-2">
            {existingSpares.map(s => (
              <div key={s.spare_id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                <span className="font-medium text-gray-800">{s.spare_name}</span>
                <span className="text-gray-600 font-bold">{s.quantity} {s.unit || "pcs"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className={cn("border shadow-sm transition-opacity", isStage2Locked && "opacity-60")}>
        <CardHeader className="py-3 px-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
          <CardTitle className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Attachments & Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Certificate */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600 block flex items-center gap-1">
                <FileText className="h-3 w-3" /> Certificate Upload
              </Label>
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 relative overflow-hidden"
                    disabled={uploadingCert}
                  >
                    {uploadingCert ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Upload File
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleFileUpload(e, "certificate_url", "certificate_name", setUploadingCert)}
                    />
                  </Button>
                )}
                {meta.certificate_url && (
                  <a href={meta.certificate_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex-1 truncate">
                    {meta.certificate_name || "View Certificate"}
                  </a>
                )}
              </div>
            </div>

            {/* Before Photo */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600 block flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Before Photo
              </Label>
              <div className="flex items-center gap-2">
                 {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 relative overflow-hidden"
                    disabled={uploadingBefore}
                  >
                    {uploadingBefore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Capture / Upload
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleFileUpload(e, "before_photo_url", undefined, setUploadingBefore)}
                    />
                  </Button>
                )}
                {meta.before_photo_url && (
                  <img src={meta.before_photo_url} alt="Before" className="h-[60px] w-auto border rounded" />
                )}
              </div>
            </div>

            {/* After Photo */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600 block flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> After Photo
              </Label>
              <div className="flex items-center gap-2">
                 {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 relative overflow-hidden"
                    disabled={uploadingAfter}
                  >
                    {uploadingAfter ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Capture / Upload
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleFileUpload(e, "after_photo_url", undefined, setUploadingAfter)}
                    />
                  </Button>
                )}
                {meta.after_photo_url && (
                  <img src={meta.after_photo_url} alt="After" className="h-[60px] w-auto border rounded" />
                )}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="py-3 px-5 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700">Remarks</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <Textarea
            placeholder="Recommendations, or follow-up actions..."
            value={meta.remarks || ""}
            onChange={e => setField("remarks", e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            disabled={readOnly}
          />
        </CardContent>
      </Card>


      {!readOnly && (
        <div className="flex justify-end gap-3 pt-2">
          <Button
            onClick={() => handleSave(false)}
            disabled={saving}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 rounded-lg font-semibold shadow-sm transition-all"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Progress
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || isStage2Locked}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-10 rounded-lg font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Finalize & Complete Ticket
          </Button>
        </div>
      )}

    </div>
  );
}
