import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  technicianTicketApi,
  Ticket,
  TicketResponse,
  TicketStep,
} from "@/services/api/technicianTicketApi";
import { managerTicketApi } from "@/services/api/managerTicketApi";
import { uploadApi } from "@/lib/api";
import { BreakdownMaintenanceForm } from "@/components/tickets/BreakdownMaintenanceForm";
import { RefillHPTestForm } from "@/components/tickets/RefillHPTestForm";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Building,
  User,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Upload,
  X,
  Loader2,
  Activity,
  ClipboardList,
  Info,
  Camera,
  Send,
  Check,
  ChevronDown,
  ChevronUp,
  ListChecks,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Step status display config ─────────────────────────────────────────────
const STEP_STATUS = {
  pending: { label: "Pending", bg: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In Progress", bg: "bg-blue-100 text-blue-700" },
  pending_approval: {
    label: "Pending Approval",
    bg: "bg-amber-100 text-amber-700",
  },
  approved: { label: "Approved", bg: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", bg: "bg-red-100 text-red-700" },
  completed: { label: "Completed", bg: "bg-emerald-100 text-emerald-700" },
} as const;

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isFixed, setIsFixed] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // ── Step workflow state ──────────────────────────────────────────────────
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const [bmDetails, setBmDetails] = useState<any>(null); // BM Specific Details
  const [bmNextState, setBmNextState] = useState<string>('');
  const [bmMetadataUpdate, setBmMetadataUpdate] = useState<string>('');
  const [checklistAnswers, setChecklistAnswers] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [stepSubmitting, setStepSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTicket();
    }
  }, [id]);

  // ── Step handlers ────────────────────────────────────────────────────────

  const handleStartStep = async (stepId: string) => {
    setStepSubmitting(stepId);
    try {
      await technicianTicketApi.startStep(stepId);
      toast.success("Step started");
      
      // Clear local state for fresh resubmission (especially after rejection)
      setChecklistAnswers((prev) => {
        const updated = { ...prev };
        delete updated[stepId];
        return updated;
      });
      setStepNotes((prev) => {
        const updated = { ...prev };
        delete updated[stepId];
        return updated;
      });
      
      fetchTicket();
    } catch (err: any) {
      toast.error(err?.message || "Failed to start step");
    } finally {
      setStepSubmitting(null);
    }
  };

  const handleSubmitStep = async (step: TicketStep) => {
    // If has_checklist, validate all mandatory questions are answered
    if (step.has_checklist && step.checklistQuestions) {
      const mandatory = step.checklistQuestions.filter((q) => q.is_mandatory);
      const answers = checklistAnswers[step.id] || {};
      const unanswered = mandatory.filter((q) => answers[q.id] === undefined);
      if (unanswered.length > 0) {
        toast.error(
          `Please answer all ${unanswered.length} mandatory checklist question(s) first`,
        );
        return;
      }
      // Save checklist answers first
      setStepSubmitting(step.id);
      try {
        const answerPayload = step.checklistQuestions.map((q) => ({
          question_id: q.id,
          answer: answers[q.id] ?? false,
        }));
        await technicianTicketApi.saveChecklist(step.id, answerPayload);
      } catch (err: any) {
        toast.error(err?.message || "Failed to save checklist");
        setStepSubmitting(null);
        return;
      }
    } else {
      setStepSubmitting(step.id);
    }

    // BLOCKER: Check for pending spares if this is a BM ticket
    const isBM = (ticket as any)?.ticket_type === 'BM_MAINTENANCE' || ticket?.ticketCategory === 'Breakdown Maintenance';
    if (isBM) {
      try {
        const usageRes: any = await managerTicketApi.getInventoryUsage(id!);
        const pending = (usageRes.usage || []).filter((r: any) => r.status === 'pending');
        if (pending.length > 0) {
          toast.error("Cannot submit! You have pending spare part requests waiting for approval.");
          setStepSubmitting(null);
          return;
        }
      } catch (err) {
        console.error("Failed to check spares before submission", err);
      }
    }

    try {
      await technicianTicketApi.submitStep(step.id, stepNotes[step.id]);
      toast.success(
        step.requires_approval
          ? "Step submitted for approval"
          : "Step completed!",
      );
      setStepNotes((prev) => {
        const n = { ...prev };
        delete n[step.id];
        return n;
      });
      fetchTicket();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit step");
    } finally {
      setStepSubmitting(null);
    }
  };

  const setChecklistAnswer = (
    stepId: string,
    questionId: string,
    value: boolean,
  ) => {
    setChecklistAnswers((prev) => ({
      ...prev,
      [stepId]: { ...(prev[stepId] || {}), [questionId]: value },
    }));
  };

  const fetchTicket = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await technicianTicketApi.getTicketById(id);
      const fetchedTicket = response.data;
      setTicket(fetchedTicket);

      // Check if it's a BM maintaining ticket
      if ((fetchedTicket as any).ticket_type === 'BM_MAINTENANCE' || fetchedTicket.ticketCategory === 'Breakdown Maintenance') {
        try {
          const bmRes: any = await technicianTicketApi.getBMTicketDetail(id);
          setBmDetails(bmRes.bmDetail || bmRes.data || bmRes);
        } catch (err) {
          console.error("Failed to fetch BM details", err);
        }
      }

    } catch (error) {
      console.error("Failed to fetch ticket:", error);
      toast.error("Failed to load ticket details");
      navigate("/technician/tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTicket = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await technicianTicketApi.startTicket(id);
      toast.success("Ticket started successfully");
      fetchTicket();
    } catch (error) {
      console.error("Failed to start ticket:", error);
      toast.error("Failed to start ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return [];

    setUploadingPhotos(true);
    const urls: string[] = [];

    try {
      for (const photo of photos) {
        const response = await uploadApi.uploadFile(photo);
        if (response.success) {
          urls.push(response.data.url);
        } else {
          toast.error(`Failed to upload ${photo.name}`);
        }
      }
      return urls;
    } catch (error) {
      console.error("Photo upload failed:", error);
      toast.error("Failed to upload some photos");
      return urls;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleAddComment = async () => {
    if (!id || !comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      setSubmitting(true);
      await technicianTicketApi.addComment(id, comment);
      toast.success("Comment added successfully");
      setComment("");
      fetchTicket();
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!id || !comment.trim()) {
      toast.error("Please enter a completion comment");
      return;
    }

    if (isFixed === null) {
      toast.error("Please specify whether the ticket was fixed or not");
      return;
    }

    try {
      setShowSubmitDialog(false);
      setSubmitting(true);

      // Upload photos first
      let uploadedUrls: string[] = [];
      if (photos.length > 0) {
        uploadedUrls = await uploadPhotos();
        if (uploadedUrls.length !== photos.length) {
          toast.warning(
            "Some photos failed to upload, submitting with successful ones.",
          );
        }
      }

      await technicianTicketApi.submitTicket(
        id,
        comment,
        isFixed,
        uploadedUrls,
      );
      toast.success("Ticket submitted for approval");
      setComment("");
      setIsFixed(null);
      setPhotos([]);
      navigate("/technician/tickets");
    } catch (error: any) {
      console.error("Failed to submit ticket:", error);
      toast.error(error.response?.data?.message || "Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300 px-3 py-1">
            Pending
          </Badge>
        );
      case "In Progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 px-3 py-1 font-bold">
            In Progress
          </Badge>
        );
      case "Waiting for approval":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 px-3 py-1">
            Waiting Approval
          </Badge>
        );
      case "Completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 px-3 py-1">
            Completed
          </Badge>
        );
      case "Rejected":
        return (
          <Badge variant="destructive" className="px-3 py-1">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="px-3 py-1">
            {status}
          </Badge>
        );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-6 w-6 text-orange-500" />;
      case "In Progress":
        return <Play className="h-6 w-6 text-blue-500" />;
      case "Waiting for approval":
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case "Completed":
        return <CheckCircle className="h-6 w-6 text-emerald-500" />;
      case "Rejected":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return null;
    }
  };

  // Handled by BreakdownMaintenanceForm component

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="h-8 w-8 text-indigo-400" />
          </div>
        </div>
        <p className="mt-6 text-slate-500 font-bold uppercase tracking-widest animate-pulse">
          Synchronizing Ticket Details...
        </p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200">
        <AlertCircle className="h-16 w-16 text-rose-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Ticket Not Found</h2>
        <p className="text-slate-500 mb-6">
          The requested ticket might have been deleted or moved.
        </p>
        <Button onClick={() => navigate("/technician/tickets")}>
          Back to Tickets
        </Button>
      </div>
    );
  }

  const canStart = ticket.completedStatus === "Pending";
  const canSubmit =
    ticket.completedStatus === "In Progress" ||
    ticket.completedStatus === "Rejected" ||
    ticket.completedStatus === "Waiting for spare";
  const isWaiting = ticket.completedStatus === "Waiting for approval";
  const isCompleted = ticket.completedStatus === "Completed";
  const isBMTicket = (ticket as any).ticketCategory === "Breakdown Maintenance" || (ticket as any).ticket_type === "BM_MAINTENANCE";

  // Has the ticket been enhanced with steps?
  const hasSteps =
    Array.isArray((ticket as any).steps) && (ticket as any).steps.length > 0;
  const steps: TicketStep[] = hasSteps ? (ticket as any).steps : [];
  const completedSteps = steps.filter((s) => s.status === "completed").length;

  return (
    <>
      <div className="max-w-5xl mx-auto pb-12">
        {/* Enhanced Top Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/technician/tickets")}
              className="h-12 w-12 rounded-xl border-slate-200 hover:bg-white hover:shadow-md transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="hidden sm:block">
                  {getStatusIcon(ticket.completedStatus)}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  {ticket.taskName}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {ticket.ticketId}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                {getStatusBadge(ticket.completedStatus)}
              </div>
            </div>
          </div>

          {canStart && (
            <Button
              onClick={handleStartTicket}
              disabled={submitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 px-8 py-6 rounded-xl font-bold text-lg"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Play className="h-5 w-5 mr-3 fill-current" />
              )}
              Start Ticket Work
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* ── BM MAINTENANCE FORM (if applicable) ──────────────── */}
            {isBMTicket && (
              <Card className="border-0 shadow-xl overflow-hidden mb-8">
                <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Breakdown Maintenance Form</CardTitle>
                      <p className="text-orange-100 text-xs mt-0.5">Fill in the maintenance details below</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <BreakdownMaintenanceForm
                    ticketId={id!}
                    assetId={(ticket as any).assetId || (ticket as any).asset_id}
                    initialMeta={(ticket as any).bm_metadata || bmDetails?.bm_metadata || {}}
                    readOnly={isCompleted}
                    ticketStatus={ticket.completedStatus}
                    onSaved={fetchTicket}
                  />
                </CardContent>
              </Card>
            )}

            {/* ── REFILL / HP TEST FORM (if applicable) ─────────────── */}
            {(ticket as any).ticketCategory === 'Refill / HP Test' && (
              <Card className="border-0 shadow-xl overflow-hidden mb-8">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Refill / HP Test Service Form</CardTitle>
                      <p className="text-blue-100 text-xs mt-0.5">Fill in the service details, upload certificates and photos.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <RefillHPTestForm
                    ticketId={id!}
                    initialMeta={(ticket as any).refill_metadata || {}}
                    readOnly={isCompleted}
                    ticketStatus={ticket.completedStatus}
                    onSaved={fetchTicket}
                  />
                </CardContent>
              </Card>
            )}

            {/* ── STEP WORKFLOW (shown when ticket has steps) ────────── */}
            {hasSteps && (
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <ListChecks className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">
                          Workflow Steps
                        </CardTitle>
                        <p className="text-slate-300 text-xs mt-0.5">
                          {completedSteps}/{steps.length} steps completed
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white text-xs">
                      {Math.round((completedSteps / steps.length) * 100)}%
                    </Badge>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((completedSteps / steps.length) * 100)}%`,
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100">
                  {steps.map((step, idx) => {
                    const sc = STEP_STATUS[step.status] || STEP_STATUS.pending;
                    const isExpanded = expandedStep === step.id;
                    const canStartThis =
                      step.status === "pending" || step.status === "rejected";
                    const canSubmitThis = step.status === "in_progress";
                    const isPendingApproval =
                      step.status === "pending_approval";
                    const isStepDone =
                      step.status === "completed" || step.status === "approved";

                    return (
                      <div key={step.id}>
                        {/* Step row header */}
                        <div
                          className={cn(
                            "flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors",
                            isExpanded && "bg-slate-50",
                          )}
                          onClick={() =>
                            setExpandedStep(isExpanded ? null : step.id)
                          }
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                              isStepDone
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-200 text-slate-600",
                            )}
                          >
                            {isStepDone ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {step.title || `Step ${idx + 1}`}
                              </p>
                              <Badge className={cn("text-[10px] px-2", sc.bg)}>
                                {sc.label}
                              </Badge>
                              {step.rejection_count > 0 && (
                                <Badge className="text-[10px] bg-red-100 text-red-600">
                                  Rejected ×{step.rejection_count}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                              {step.role_label && (
                                <span>{step.role_label}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(step.target_date).toLocaleDateString(
                                  "en-IN",
                                )}
                              </span>
                              {step.requires_approval && (
                                <span className="text-amber-600 font-medium">
                                  Needs Approval
                                </span>
                              )}
                              {step.has_checklist && (
                                <span className="text-blue-600 font-medium">
                                  Has Checklist
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canStartThis && (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={stepSubmitting === step.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartStep(step.id);
                                }}
                              >
                                {stepSubmitting === step.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 mr-1 fill-current" />{" "}
                                    Start
                                  </>
                                )}
                              </Button>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded step body */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-1 space-y-4 bg-white border-t border-slate-100">
                            {step.description && (
                              <p className="text-sm text-slate-600 italic">
                                {step.description}
                              </p>
                            )}

                            {/* Pending approval notice */}
                            {isPendingApproval && (
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                This step is waiting for manager approval.
                              </div>
                            )}

                            {/* Latest approval rejection note */}
                            {step.status === "rejected" &&
                              step.approvals?.[0]?.remarks && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
                                  <p className="font-semibold text-red-700 mb-1">
                                    Rejection Reason
                                  </p>
                                  <p className="text-red-600 italic">
                                    "{step.approvals[0].remarks}"
                                  </p>
                                </div>
                              )}

                            {/* Checklist */}
                            {step.has_checklist &&
                              step.checklistQuestions &&
                              step.checklistQuestions.length > 0 &&
                              canSubmitThis && (
                                <div className="space-y-3">
                                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                                    <ListChecks className="h-3.5 w-3.5" />{" "}
                                    Checklist
                                  </p>
                                  {step.checklistQuestions.map((q) => {
                                    const ans =
                                      checklistAnswers[step.id]?.[q.id];
                                    return (
                                      <div
                                        key={q.id}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                                      >
                                        <div className="flex-1 text-sm text-slate-700 pt-0.5">
                                          {q.question_text}
                                          {q.is_mandatory && (
                                            <span className="text-red-500 ml-1">
                                              *
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setChecklistAnswer(
                                                step.id,
                                                q.id,
                                                true,
                                              )
                                            }
                                            className={cn(
                                              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all",
                                              ans === true
                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                : "bg-white border-slate-200 text-slate-500 hover:border-emerald-400",
                                            )}
                                          >
                                            <Check className="h-3 w-3" /> Yes
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setChecklistAnswer(
                                                step.id,
                                                q.id,
                                                false,
                                              )
                                            }
                                            className={cn(
                                              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all",
                                              ans === false
                                                ? "bg-red-500 border-red-500 text-white"
                                                : "bg-white border-slate-200 text-slate-500 hover:border-red-400",
                                            )}
                                          >
                                            <X className="h-3 w-3" /> No
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                            {/* Completed checklist read-only */}
                            {step.has_checklist &&
                              step.checklistQuestions &&
                              step.checklistQuestions.length > 0 &&
                              isStepDone && (
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                    Checklist Answers
                                  </p>
                                  {step.checklistQuestions.map((q) => {
                                    const saved = q.answers?.[0];
                                    return (
                                      <div
                                        key={q.id}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <span
                                          className={cn(
                                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                            saved?.answer === true
                                              ? "bg-emerald-100 text-emerald-700"
                                              : saved?.answer === false
                                                ? "bg-red-100 text-red-700"
                                                : "bg-slate-100 text-slate-400",
                                          )}
                                        >
                                          {saved?.answer === true
                                            ? "✓"
                                            : saved?.answer === false
                                              ? "✗"
                                              : "?"}
                                        </span>
                                        <span className="text-slate-700">
                                          {q.question_text}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                            {/* Notes + Submit */}
                            {canSubmitThis && (
                              <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-slate-600">
                                    Notes (optional)
                                  </Label>
                                  <Textarea
                                    className="text-sm resize-none"
                                    rows={2}
                                    placeholder="Describe what was done…"
                                    value={stepNotes[step.id] || ""}
                                    onChange={(e) =>
                                      setStepNotes((prev) => ({
                                        ...prev,
                                        [step.id]: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <Button
                                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold"
                                  disabled={stepSubmitting === step.id}
                                  onClick={() => handleSubmitStep(step)}
                                >
                                  {stepSubmitting === step.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                                      Submitting…
                                    </>
                                  ) : step.requires_approval ? (
                                    <>
                                      <ThumbsUp className="h-4 w-4 mr-2" />{" "}
                                      Submit for Approval
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />{" "}
                                      Mark Step Complete
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}

                            {/* Technician notes (read-only after submission) */}
                            {step.technician_notes && isStepDone && (
                              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                                <p className="text-xs font-semibold text-slate-500 mb-1">
                                  Your Notes
                                </p>
                                <p className="text-slate-700 italic">
                                  "{step.technician_notes}"
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
            {/* ── END STEP WORKFLOW ──────────────────────────────────── */}

            {/* Task Description Card */}
            {ticket.taskDescription && (
              <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <ClipboardList className="h-5 w-5 text-indigo-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Task Overview
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap italic">
                    "{ticket.taskDescription}"
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── ACTION SECTION / COMPLETION REPORT — commented out, tickets now complete via BM/Refill form finalization
            {canSubmit && (
              <Card className="border-0 shadow-2xl overflow-hidden ring-4 ring-indigo-50">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">
                      {ticket.completedStatus === "Rejected"
                        ? "Revision Submission"
                        : "Completion Report"}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-indigo-100 font-medium opacity-90">
                    Describe your Work and attach necessary evidence for
                    approval.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  ...
                </CardContent>
              </Card>
            )}
            ─── END COMMENTED ── */}

            {/* Status Notices */}
            {isWaiting && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-3xl p-8 shadow-inner">
                <div className="flex items-start gap-4">
                  <div className="bg-amber-100 p-3 rounded-2xl">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-amber-900 mb-1">
                      Waiting for Manager Approval
                    </h3>
                    <p className="text-amber-700 leading-relaxed font-medium">
                      Your completion report has been submitted. The system will
                      unlock further actions once the manager reviews and
                      approves your work.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-8 shadow-inner">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-100 p-3 rounded-2xl">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900 mb-1">
                      Ticket Fully Resolved
                    </h3>
                    <p className="text-emerald-700 leading-relaxed font-medium">
                      This ticket has been officially closed and approved.
                      Professional standards were met according to the audit
                      trail.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline / Activity Section */}
            <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <Activity className="h-5 w-5 text-slate-600" />
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900">
                    Activity Timeline
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {ticket.responses && ticket.responses.length > 0 ? (
                  <div className="space-y-8 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-100 before:z-0">
                    {ticket.responses.map((response: TicketResponse) => (
                      <div
                        key={response.id}
                        className="relative z-10 pl-10 group"
                      >
                        <div
                          className={`absolute left-1 top-0 h-4 w-4 rounded-full border-2 border-white shadow-sm ring-2 ${
                            response.responseType === "rejection"
                              ? "bg-rose-500 ring-rose-100"
                              : response.responseType === "submission"
                                ? "bg-indigo-500 ring-indigo-100"
                                : "bg-slate-400 ring-slate-100"
                          }`}
                        />

                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                              <User className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm">
                                  {response.user?.name || "Unknown User"}
                                </span>
                                {response.responseType === "submission" && (
                                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold uppercase">
                                    Work Submission
                                  </Badge>
                                )}
                                {response.responseType === "rejection" && (
                                  <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] font-bold uppercase">
                                    Rejected
                                  </Badge>
                                )}
                                {response.responseType === "submission" &&
                                  response.isFixed !== null && (
                                    <Badge
                                      variant={
                                        response.isFixed
                                          ? "default"
                                          : "secondary"
                                      }
                                      className={`text-[10px] font-bold uppercase ${response.isFixed ? "bg-emerald-500" : "bg-slate-200"}`}
                                    >
                                      {response.isFixed ? "Fixed" : "Open"}
                                    </Badge>
                                  )}
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                {new Date(response.createdAt).toLocaleString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-md transition-all">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {response.comment}
                          </p>

                          {/* Response Photos */}
                          {response.photoUrls &&
                            response.photoUrls.length > 0 && (
                              <div className="mt-4 flex gap-3 flex-wrap">
                                {response.photoUrls.map((url, idx) => (
                                  <a
                                    href={url}
                                    key={idx}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block relative h-20 w-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:ring-2 hover:ring-indigo-400 transition-all group/img"
                                  >
                                    <img
                                      src={url}
                                      alt={`Evidence ${idx + 1}`}
                                      className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                      <Info className="h-5 w-5 text-white" />
                                    </div>
                                  </a>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-50/30 rounded-2xl border-2 border-dashed border-slate-100">
                    <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">
                      No Activity Recorded
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Info Card - High priority data */}
            <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-sm sticky top-24">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  Ticket Registry
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {/* Target Date */}
                  <div className="p-4 flex items-start gap-4">
                    <div className="bg-indigo-50 p-2.5 rounded-xl">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Target Completion
                      </p>
                      <p className="text-sm font-bold text-slate-900 leading-tight">
                        {new Date(ticket.targetDate).toLocaleDateString(
                          "en-GB",
                          {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Asset Information */}
                  {ticket.asset && (
                    <div className="p-4 flex items-start gap-4">
                      <div className="bg-blue-50 p-2.5 rounded-xl">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Primary Asset
                        </p>
                        <p className="text-sm font-bold text-slate-900 truncate mb-1">
                          {ticket.asset.assetId}
                        </p>
                        {ticket.asset.plant && (
                          <div className="flex items-center gap-1.5 opacity-70">
                            <Building className="h-3 w-3" />
                            <span className="text-xs font-semibold">
                              {ticket.asset.plant.plantName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Location Specifics */}
                  {(ticket.asset?.location || ticket.building) && (
                    <div className="p-4 flex items-start gap-4">
                      <div className="bg-orange-50 p-2.5 rounded-xl">
                        <MapPin className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Deployment Spot
                        </p>
                        <p className="text-sm font-bold text-slate-900 leading-tight">
                          {ticket.asset?.location ||
                            ticket.building?.buildingName}
                        </p>
                        {ticket.asset?.location && ticket.building && (
                          <p className="text-[10px] font-semibold text-slate-500 mt-1">
                            {ticket.building.buildingName}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Category */}
                  {ticket.category && (
                    <div className="p-4 flex items-start gap-4">
                      <div className="bg-purple-50 p-2.5 rounded-xl">
                        <Info className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Classification
                        </p>
                        <p className="text-sm font-bold text-slate-900 leading-tight">
                          {ticket.category.categoryName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-900 text-white">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                      Audit Mode Active
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-slate-900">
              Final Submission Approval?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-base">
              You are about to submit this ticket for manager review. This
              action will finalize your current entries and photos. You will be
              unable to modify these details until the manager provide feedback.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel
              disabled={submitting}
              className="rounded-xl font-bold py-6"
            >
              Wait, not yet
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitTicket}
              disabled={submitting}
              className="rounded-xl font-bold py-6 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting
                ? "Authenticating Submission..."
                : "Yes, Submit for Review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
