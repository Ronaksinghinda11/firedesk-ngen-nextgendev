/**
 * BreakdownMaintenanceForm.tsx
 *
 * A comprehensive form for Breakdown Maintenance tickets.
 * Designed to be embedded in both Technician TicketDetail and Manager TicketDetailView.
 *
 * Features:
 *  - Problem description, issue type, severity
 *  - Root cause and action type selection
 *  - Work description, start/end time & downtime calculation
 *  - Spare parts request section (links to inventory stock)
 *  - Before/after photo upload
 *  - Save bm_metadata + request spares in one action
 */

import React, { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wrench,
  Plus,
  Trash2,
  Loader2,
  Save,
  Clock,
  AlertTriangle,
  Package,
  ChevronDown,
  ChevronUp,
  Upload,
  Camera,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { managerTicketApi } from "@/services/api/managerTicketApi";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

interface BMMeta {
  // Problem
  problem_description?: string;
  issue_type_id?: string;
  issue_type_name?: string;
  severity?: string;
  is_spare_required?: boolean | null;
  // Root cause & action
  root_cause?: string;
  action_type?: string;
  work_description?: string;
  // Timing
  start_time?: string;
  end_time?: string;
  downtime_minutes?: number;
  // Testing
  test_result?: string;
  system_restored?: boolean;
  // Closure
  final_remarks?: string;
}

interface Props {
  ticketId: string;
  assetId?: string;
  initialMeta?: BMMeta;
  existingSpares?: SparePart[];
  readOnly?: boolean;
  ticketStatus?: string;
  onSaved?: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACTION_TYPES = [
  { value: "repair",          label: "Repair" },
  { value: "replacement",     label: "Replacement" },
  { value: "adjustment",      label: "Adjustment / Calibration" },
  { value: "temporary_fix",   label: "Temporary Fix" },
  { value: "inspection_only", label: "Inspection Only" },
];

const SEVERITY_LEVELS = [
  { value: "low",      label: "Low",      color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "medium",   label: "Medium",   color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "high",     label: "High",     color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700 border-red-200" },
];

const ISSUE_TYPES = [
  "Mechanical Failure",
  "Electrical Fault",
  "Software / Firmware Issue",
  "Corrosion / Wear",
  "Physical Damage",
  "Calibration Drift",
  "Blockage / Obstruction",
  "Communication Failure",
  "Power Issue",
  "Overheating",
  "Leakage",
  "Other",
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function BreakdownMaintenanceForm({
  ticketId,
  assetId,
  initialMeta = {},
  existingSpares = [],
  readOnly = false,
  ticketStatus,
  onSaved,
}: Props) {
  const [meta, setMeta] = useState<BMMeta>(initialMeta);
  const [spareRequests, setSpareRequests] = useState<SparePart[]>(existingSpares);
  const [availableSpares, setAvailableSpares] = useState<SpareItem[]>([]);
  const [loadingSpares, setLoadingSpares] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSpareSection, setShowSpareSection] = useState(existingSpares.length > 0);

  useEffect(() => {
    if (initialMeta && Object.keys(initialMeta).length > 0) {
      setMeta(initialMeta);
    }
  }, []); // Remove initialMeta to prevent re-render state wipe

  useEffect(() => {
    if (existingSpares && existingSpares.length > 0) {
      setSpareRequests(existingSpares);
      setShowSpareSection(true);
    }
  }, []); // Remove existingSpares to prevent re-render state wipe

  const [usageRecords, setUsageRecords] = useState<any[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // ── Downtime auto-calc ──────────────────────────────────────────────────────
  useEffect(() => {
    if (meta.start_time && meta.end_time) {
      const start = new Date(meta.start_time);
      const end = new Date(meta.end_time);
      if (end > start) {
        const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
        setMeta(prev => ({ ...prev, downtime_minutes: diffMin }));
      }
    }
  }, [meta.start_time, meta.end_time]);

  // ── Load usage records ──────────────────────────────────────────────────────
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

  // ── Load available spares from inventory ───────────────────────────────────
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

  // ── Spare helpers ───────────────────────────────────────────────────────────
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

  // ── Save form ───────────────────────────────────────────────────────────────
  const handleSave = async (isFinal: boolean = false) => {
    if (!meta.problem_description?.trim()) {
      toast({ title: "Problem description is required", variant: "destructive" });
      return;
    }

    if (isFinal && (!meta.root_cause?.trim() || !meta.action_type || !meta.start_time || !meta.end_time)) {
      toast({ title: "Please fill out all required execution fields (Root cause, Action Type, Start/End times) before finalizing.", variant: "destructive", duration: 5000 });
      return;
    }

    setSaving(true);
    try {
      const payloadMeta = { ...meta, is_final: isFinal };

      // 1. Save BM metadata
      await managerTicketApi.updateBMMetadata(ticketId, payloadMeta);

      // 2. Request spares if any
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

      toast({ title: isFinal ? "Ticket maintenance flow completed" : "Progress saved", description: (spareRequests.length > 0 && meta.is_spare_required === true) ? "Spare parts have been requested and are pending approval." : undefined });
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Failed to save form", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: keyof BMMeta, value: any) => {
    setMeta(prev => ({ ...prev, [field]: value }));
  };

  const downtimeHours = meta.downtime_minutes
    ? `${Math.floor(meta.downtime_minutes / 60)}h ${meta.downtime_minutes % 60}m`
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
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
      {/* ─── Problem Section ─── */}
      <Card className="border border-orange-100 shadow-sm">
        <CardHeader className="py-3 px-5 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
          <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Problem Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Problem Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Describe the problem or fault observed..."
              value={meta.problem_description || ""}
              onChange={e => setField("problem_description", e.target.value)}
              className="min-h-[90px] text-sm resize-none"
              disabled={readOnly}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Issue Type</Label>
              <Select
                value={meta.issue_type_name || ""}
                onValueChange={v => setField("issue_type_name", v)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Severity</Label>
              <div className="flex gap-2 flex-wrap">
                {SEVERITY_LEVELS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setField("severity", s.value)}
                    className={`
                      px-3 py-1 rounded-full text-xs font-semibold border transition-all
                      ${meta.severity === s.value
                        ? `${s.color} ring-2 ring-offset-1 ring-current scale-105`
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                      }
                    `}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!allSparesApproved && (
            <div className="mt-6 pt-5 border-t border-orange-100">
               <Label className="text-sm font-semibold text-gray-800 mb-3 block">
                 Are spare parts required for this repair? <span className="text-red-500">*</span>
               </Label>
               <div className="flex gap-4">
                   <button type="button" 
                      onClick={() => setField("is_spare_required", true)}
                      className={`px-5 py-2.5 text-sm font-semibold border rounded-lg transition-all ${meta.is_spare_required === true ? 'bg-orange-100 text-orange-800 border-orange-300 ring-2 ring-orange-500 ring-offset-1' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border-gray-200'}`} disabled={readOnly}>Yes, spares required</button>
                   <button type="button" 
                      onClick={() => setField("is_spare_required", false)}
                      className={`px-5 py-2.5 text-sm font-semibold border rounded-lg transition-all ${meta.is_spare_required === false ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500 ring-offset-1' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border-gray-200'}`} disabled={readOnly}>No spares needed</button>
               </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Root Cause & Action ─── */}
      <Card className={cn("border border-blue-100 shadow-sm transition-opacity", isStage2Locked && "opacity-60")}>
        <CardHeader className="py-3 px-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Root Cause & Action Details
            {isStage2Locked && (
               <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-600 border-amber-200">
                 Locked — Waiting for Spares
               </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Root Cause Description</Label>
            <Textarea
              placeholder={isStage2Locked ? "Locked until spares are approved..." : "What caused this breakdown? Be specific..."}
              value={meta.root_cause || ""}
              onChange={e => setField("root_cause", e.target.value)}
              className="min-h-[80px] text-sm resize-none"
              disabled={readOnly || isStage2Locked}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Action Type</Label>
              <Select
                value={meta.action_type || ""}
                onValueChange={v => setField("action_type", v)}
                disabled={readOnly || isStage2Locked}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select action taken" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Test Result</Label>
              <Select
                value={meta.test_result || ""}
                onValueChange={v => setField("test_result", v)}
                disabled={readOnly || isStage2Locked}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="After action test result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass — Fully Restored</SelectItem>
                  <SelectItem value="partial">Partial — Needs Follow-up</SelectItem>
                  <SelectItem value="fail">Fail — Still Faulty</SelectItem>
                  <SelectItem value="not_tested">Not Tested Yet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Work Description</Label>
            <Textarea
              placeholder={isStage2Locked ? "Locked until spares are approved..." : "Describe what was done step-by-step..."}
              value={meta.work_description || ""}
              onChange={e => setField("work_description", e.target.value)}
              className="min-h-[80px] text-sm resize-none"
              disabled={readOnly || isStage2Locked}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Downtime Tracking ─── */}
      <Card className={cn("border border-slate-200 shadow-sm transition-opacity", isStage2Locked && "opacity-60")}>
        <CardHeader className="py-3 px-5 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Downtime Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {isStage2Locked && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-amber-700">Work timings can only be logged once spare parts are issued/approved.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Work Start Time</Label>
              <Input
                type="datetime-local"
                value={meta.start_time || ""}
                onChange={e => setField("start_time", e.target.value)}
                className="h-9 text-sm"
                disabled={readOnly || isStage2Locked}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Work End Time</Label>
              <Input
                type="datetime-local"
                value={meta.end_time || ""}
                onChange={e => setField("end_time", e.target.value)}
                className="h-9 text-sm"
                disabled={readOnly || isStage2Locked}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Total Downtime</Label>
              <div className={`
                flex h-9 items-center px-3 rounded-md border text-sm font-semibold
                ${downtimeHours ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-gray-50 text-gray-400 border-gray-200"}
              `}>
                {downtimeHours
                  ? `⏱ ${downtimeHours} (${meta.downtime_minutes} min)`
                  : "Auto-calculated"}
              </div>
            </div>
          </div>
          {meta.downtime_minutes && (
            <div className="mt-3 flex items-center gap-2">
              <div className={`h-2 rounded-full flex-1 ${meta.downtime_minutes > 480 ? "bg-red-200" : "bg-emerald-100"}`}>
                <div
                  className={`h-2 rounded-full transition-all ${meta.downtime_minutes > 480 ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, (meta.downtime_minutes / 480) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{meta.downtime_minutes > 480 ? "Extended downtime" : "Within 8hr window"}</span>
            </div>
          )}
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
      {readOnly && existingSpares.length > 0 && (
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

      {/* ─── Final Remarks ─── */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="py-3 px-5 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700">Final Remarks</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <Textarea
            placeholder="Closure remarks, recommendations, or follow-up actions..."
            value={meta.final_remarks || ""}
            onChange={e => setField("final_remarks", e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      {/* ─── Save Action ─── */}
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
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 h-10 rounded-lg font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Finalize & Complete Ticket
          </Button>
        </div>
      )}
    </div>
  );
}
