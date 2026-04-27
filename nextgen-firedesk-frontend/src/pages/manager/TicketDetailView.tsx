/**
 * TicketDetailView — Manager view of a single ticket with task workflow
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BreakdownMaintenanceForm } from '@/components/tickets/BreakdownMaintenanceForm';
import { RefillHPTestForm } from '@/components/tickets/RefillHPTestForm';

import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Play,
  Package,
  User,
  Calendar,
  RefreshCw,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { managerTicketApi } from '@/services/api/managerTicketApi';
import { usePermissions } from '@/hooks/usePermissions';
import { Entity, Action } from '@/types/permissions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TASK_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: 'Pending',
    color: 'bg-slate-100 text-slate-600',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700',
    icon: Play,
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'bg-amber-100 text-amber-700',
    icon: AlertCircle,
  },
  approved: {
    label: 'Approved',
    color: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle,
  },
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TicketDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = usePermissions();
  const canEdit = hasPermission(Entity.TICKETS, Action.UPDATE) || isAdmin();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inventoryUsage, setInventoryUsage] = useState<any[]>([]);
  const [showApproveModal, setShowApproveModal] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [bmDetails, setBmDetails] = useState<any>(null);
  const [loadingBm, setLoadingBm] = useState(false);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res: any = await managerTicketApi.getTicketById(id);
      const fetchedTicket = res.ticket || res.data || res;
      setTicket(fetchedTicket);

      const usage: any = await managerTicketApi.getInventoryUsage(id);
      setInventoryUsage(usage.usage || []);

      if (fetchedTicket.ticket_type === 'BM_MAINTENANCE' || fetchedTicket.ticketCategory === 'Breakdown Maintenance') {
        setLoadingBm(true);
        try {
          const bmRes: any = await managerTicketApi.getBMTicketDetail(id);
          setBmDetails(bmRes.bmDetail || bmRes.data || bmRes);
        } catch (err) {
          console.error("Failed to load BM details", err);
        } finally {
          setLoadingBm(false);
        }
      }
    } catch {
      toast({ title: 'Failed to load ticket', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // -------------------------------------------------------------------------
  // Approval / rejection handlers
  // -------------------------------------------------------------------------

  const handleApproveTask = async (taskId: string) => {
    // Guard: Check for pending spares
    const pending = inventoryUsage.filter((u: any) => u.status === 'pending');
    if (pending.length > 0) {
      toast({ 
        title: 'Cannot approve task', 
        description: 'There are pending spare requests that must be approved or rejected first.', 
        variant: 'destructive' 
      });
      return;
    }

    setSubmitting(true);
    try {
      await managerTicketApi.approveTask(taskId, approvalRemarks || undefined);
      toast({ title: 'Task approved' });
      setShowApproveModal(null);
      setApprovalRemarks('');
      load();
    } catch (e: any) {
      toast({
        title: 'Approval failed',
        description: e?.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    if (!approvalRemarks.trim()) {
      toast({
        title: 'Please provide rejection remarks',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      await managerTicketApi.rejectTask(taskId, approvalRemarks);
      toast({ title: 'Task rejected — sent back to technician' });
      setShowRejectModal(null);
      setApprovalRemarks('');
      load();
    } catch (e: any) {
      toast({
        title: 'Rejection failed',
        description: e?.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Loading / empty states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Loading ticket…
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Ticket not found
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const tasks: any[] = ticket.tasks || [];
  const completedCount = tasks.filter((s) => s.status === 'completed').length;
  const progressPct =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const ticketStatusColor =
    ticket.completedStatus === 'Completed'
      ? 'bg-emerald-100 text-emerald-700'
      : ticket.completedStatus === 'Rejected'
      ? 'bg-red-100 text-red-700'
      : 'bg-blue-100 text-blue-700';

  const getFixedStatusBadge = (response: any) => {
    if (response.isFixed === null || response.isFixed === undefined) return null;

    return (
      <Badge
        variant={response.isFixed ? "default" : "secondary"}
        className="text-xs ml-2"
      >
        {response.isFixed ? '✓ Fixed' : '✗ Not Fixed'}
      </Badge>
    );
  };



  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">

      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-9 w-9 mt-0.5 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{ticket.taskName}</h1>
            {ticket.priority && (
              <Badge
                className={cn(
                  'text-xs',
                  PRIORITY_COLORS[ticket.priority] ?? 'bg-slate-100',
                )}
              >
                {ticket.priority}
              </Badge>
            )}
            {ticket.ticketCategory && (
              <Badge variant="outline" className="text-xs">
                {ticket.ticketCategory}
              </Badge>
            )}
            {ticket.completedStatus && (
              <Badge className={cn('text-xs', ticketStatusColor)}>
                {ticket.completedStatus}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {[
              ticket.ticketCode || ticket.ticket_code,
              ticket.plant?.plantName,
              ticket.targetDate &&
                `Target: ${new Date(ticket.targetDate).toLocaleDateString('en-IN')}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw
            className={cn('h-4 w-4 mr-1', loading && 'animate-spin')}
          />
          Refresh
        </Button>
      </div>

      {/* ── BM Maintenance Form ──────────────────────────────────────────── */}
      {(ticket.ticket_type === 'BM_MAINTENANCE' || ticket.ticketCategory === 'Breakdown Maintenance') && (
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white py-3 px-5">
            <CardTitle className="text-sm font-semibold">Breakdown Maintenance Details</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <BreakdownMaintenanceForm
              ticketId={id!}
              assetId={ticket.asset_id || ticket.assetId}
              initialMeta={ticket.bm_metadata || bmDetails?.bm_metadata || {}}
              readOnly={ticket.completedStatus === 'Completed'}
              ticketStatus={ticket.completedStatus}
              onSaved={load}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Refill / HP Test Form ────────────────────────────────────────── */}
      {ticket.ticketCategory === 'Refill / HP Test' && (
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-5">
            <CardTitle className="text-sm font-semibold">Refill / HP Test Service Form</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <RefillHPTestForm
              ticketId={id!}
              initialMeta={ticket.refill_metadata || {}}
              readOnly={ticket.completedStatus === 'Completed'}
              ticketStatus={ticket.completedStatus}
              onSaved={load}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Progress bar (only if multi-task) ───────────────────────────── */}
      {tasks.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Progress</p>
              <p className="text-sm text-muted-foreground">
                {completedCount}/{tasks.length} tasks complete
              </p>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {ticket.totalSpareCost != null && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                Total Spare Cost:{' '}
                <span className="font-semibold text-emerald-700">
                  ₹{parseFloat(ticket.totalSpareCost).toLocaleString('en-IN')}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Single-step description (no workflow) ───────────────────────── */}
      {tasks.length === 0 && ticket.taskDescription && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm text-muted-foreground">
              {ticket.taskDescription}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Step-by-task workflow ────────────────────────────────────────── */}
      {tasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Workflow Tasks
          </h2>

          {tasks.map((task: any, idx: number) => {
            const sc =
              TASK_STATUS_CONFIG[task.status] ?? TASK_STATUS_CONFIG.pending;
            const Icon = sc.icon;
            const isActive = activeTaskId === task.id;
            const pendingApproval = task.status === 'pending_approval';
            const latestApproval = task.approvals?.[0];

            return (
              <div
                key={task.id}
                className={cn(
                  'border rounded-xl overflow-hidden transition-all',
                  pendingApproval && canEdit
                    ? 'border-amber-200 shadow-sm'
                    : 'border-slate-200',
                )}
              >
                {/* Task header */}
                <div
                  className={cn(
                    'flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50',
                    isActive && 'bg-slate-50',
                  )}
                  onClick={() =>
                    setActiveTaskId(isActive ? null : task.id)
                  }
                >
                  {/* Task number / completed check */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                      task.status === 'completed'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {task.title || `Task ${idx + 1}`}
                      </p>
                      <Badge className={cn('text-xs', sc.color)}>
                        <Icon className="h-3 w-3 mr-1 inline-block" />
                        {sc.label}
                      </Badge>
                      {task.rejection_count > 0 && (
                        <Badge className="text-[10px] bg-red-100 text-red-600">
                          Rejected {task.rejection_count}×
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {task.role_label && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.role_label}
                        </span>
                      )}
                      {task.assignedTechnician && (
                        <span>{task.assignedTechnician.name}</span>
                      )}
                      {task.target_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.target_date).toLocaleDateString(
                            'en-IN',
                          )}
                        </span>
                      )}
                      {task.requires_approval && (
                        <span className="text-amber-600">Needs Approval</span>
                      )}
                      {task.has_checklist && (
                        <span className="text-blue-600">Has Checklist</span>
                      )}
                    </div>
                  </div>

                  {/* Quick approve / reject buttons */}
                  {pendingApproval && canEdit && (
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white h-8"
                        onClick={() => {
                          setShowApproveModal(task.id);
                          setApprovalRemarks('');
                        }}
                      >
                        <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8"
                        onClick={() => {
                          setShowRejectModal(task.id);
                          setApprovalRemarks('');
                        }}
                      >
                        <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded task details */}
                {isActive && (
                  <div className="border-t p-4 space-y-4 bg-white">
                    {task.description && (
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}

                    {/* Latest approval record */}
                    {latestApproval && (
                      <div
                        className={cn(
                          'p-3 rounded-lg text-sm border',
                          latestApproval.status === 'approved'
                            ? 'bg-emerald-50 border-emerald-100'
                            : latestApproval.status === 'rejected'
                            ? 'bg-red-50 border-red-100'
                            : 'bg-amber-50 border-amber-100',
                        )}
                      >
                        <p className="font-medium capitalize">
                          {latestApproval.status === 'pending'
                            ? 'Awaiting approval…'
                            : latestApproval.status}
                        </p>
                        {latestApproval.approvedBy && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            By: {latestApproval.approvedBy.name}
                          </p>
                        )}
                        {latestApproval.remarks && (
                          <p className="text-xs italic mt-1">
                            "{latestApproval.remarks}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Checklist summary */}
                    {task.has_checklist &&
                      task.checklistQuestions?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-600">
                            Checklist
                          </p>
                          {task.checklistQuestions.map((q: any) => {
                            const ans = q.answers?.[0];
                            return (
                              <div
                                key={q.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span
                                  className={cn(
                                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                                    ans?.answer === true
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : ans?.answer === false
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-slate-100 text-slate-400',
                                  )}
                                >
                                  {ans?.answer === true
                                    ? '✓'
                                    : ans?.answer === false
                                    ? '✗'
                                    : '?'}
                                </span>
                                <span className="text-xs text-slate-700">
                                  {q.question_text}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    {/* Technician notes */}
                    {task.technician_notes && (
                      <div className="p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="text-xs font-semibold text-slate-600 mb-1">
                          Technician Notes
                        </p>
                        <p className="text-muted-foreground">
                          {task.technician_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Inventory usage ──────────────────────────────────────────────── */}
      {inventoryUsage.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500" />
              Inventory Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inventoryUsage.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">
                      {u.item_name || u.item_id}
                    </span>
                    <Badge className="text-[10px] bg-slate-100 text-slate-600 shrink-0">
                      {u.item_type}
                    </Badge>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0 ml-4">
                    {u.quantity} × ₹{u.unit_cost ?? 0} ={' '}
                    <span className="font-semibold text-slate-800">
                      ₹{u.total_cost ?? 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Submission History ───────────────────────────────────────────── */}
      {ticket.responses && ticket.responses.length > 0 && (
        <Card className="border-0 shadow-sm mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Submission History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ticket.responses.map((response: any) => (
                <div key={response.id} className="border-l-2 border-emerald-200 pl-4 py-2 relative">
                  <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-emerald-400" />
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-800">
                      {response.respondingTechnician?.user?.name || response.user?.name || 'Technician'}
                    </span>
                    <Badge variant="outline" className="text-xs bg-slate-50">
                      {response.responseType}
                    </Badge>
                    {response.responseType === 'submission' && getFixedStatusBadge(response)}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(response.createdAt).toLocaleString('en-GB')}
                    </span>
                  </div>
                  {response.comment ? (
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-100">
                      {response.comment}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No comments provided</p>
                  )}
                  {response.pictures && response.pictures.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {response.pictures.map((pic: string, idx: number) => (
                        <img 
                          key={idx} 
                          src={pic} 
                          alt="Submission attachment" 
                          className="h-20 w-20 object-cover rounded-md border border-slate-200 hover:opacity-90 cursor-pointer" 
                          onClick={() => window.open(pic, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Approve modal ────────────────────────────────────────────────── */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowApproveModal(null);
              setApprovalRemarks('');
            }}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-semibold">Approve Task</h3>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Remarks (optional)
              </Label>
              <Textarea
                rows={3}
                className="text-sm resize-none"
                placeholder="Add approval remarks…"
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={submitting}
                onClick={() => handleApproveTask(showApproveModal)}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                {submitting ? 'Approving…' : 'Confirm Approve'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveModal(null);
                  setApprovalRemarks('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ─────────────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowRejectModal(null);
              setApprovalRemarks('');
            }}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-semibold">Reject Task</h3>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Reason for rejection{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                rows={3}
                className="text-sm resize-none"
                placeholder="Explain why this task is being rejected…"
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                variant="destructive"
                disabled={submitting}
                onClick={() => handleRejectTask(showRejectModal)}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                {submitting ? 'Rejecting…' : 'Confirm Reject'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(null);
                  setApprovalRemarks('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
