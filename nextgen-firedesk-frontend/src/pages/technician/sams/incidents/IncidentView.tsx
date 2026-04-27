import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Send,
  Upload,
  X,
  Info,
  ShieldAlert,
  Calendar,
  Building2,
  User,
  Users,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { userApi, Incident, IncidentCapaStep } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';

const IncidentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Record<string, { name: string; data: string }[]>>({});

  useEffect(() => {
    if (id) {
      fetchIncident();
    }
  }, [id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const response = await userApi.getIncidentById(id!);
      setIncident(response.data);

      const initialResponses: Record<string, string> = {};
      response.data.capaSteps?.forEach((step: IncidentCapaStep) => {
        if (step.stepResponse) {
          initialResponses[step.id] = step.stepResponse;
        }
      });
      setResponses(initialResponses);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load incident",
        variant: "destructive"
      });
      navigate('/technician/sams/incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (stepId: string, value: string) => {
    setResponses(prev => ({ ...prev, [stepId]: value }));
  };

  const handleFileUpload = async (stepId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const filePromises = fileArray.map(file => {
      return new Promise<{ name: string; data: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            data: reader.result as string
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    try {
      const uploadedFiles = await Promise.all(filePromises);
      setDocuments(prev => ({
        ...prev,
        [stepId]: [...(prev[stepId] || []), ...uploadedFiles]
      }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive"
      });
    }
  };

  const handleRemoveDocument = (stepId: string, index: number) => {
    setDocuments(prev => ({
      ...prev,
      [stepId]: prev[stepId].filter((_, i) => i !== index)
    }));
  };

  const handleSubmitCapaStep = async (step: IncidentCapaStep) => {
    if (!responses[step.id]?.trim()) {
      toast({
        title: "Input Required",
        description: "Please provide a response before submitting",
        variant: "destructive"
      });
      return;
    }

    if (step.isDocumentRequired && (!documents[step.id] || documents[step.id].length === 0)) {
      toast({
        title: "Evidence Required",
        description: "This CAPA step requires document/photo attachment.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(step.id);
      const documentsData = documents[step.id] ? JSON.stringify(documents[step.id]) : undefined;

      await userApi.submitCapaStep(id!, step.id, {
        stepResponse: responses[step.id],
        documentsData
      });

      const successMessage = step.isApprovalRequired
        ? "Verification request transmitted to management"
        : "CAPA step recorded and finalized";

      toast({
        title: "Transmission Successful",
        description: successMessage
      });

      await fetchIncident();
    } catch (error: any) {
      toast({
        title: "Transmission Failure",
        description: error.response?.data?.message || "Failed to commit CAPA step",
        variant: "destructive"
      });
    } finally {
      setSubmitting(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical': return <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold uppercase tracking-widest text-[10px] px-3">Critical</Badge>;
      case 'High': return <Badge className="bg-orange-100 text-orange-800 border-orange-300 font-bold uppercase tracking-widest text-[10px] px-3">High</Badge>;
      case 'Medium': return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold uppercase tracking-widest text-[10px] px-3">Medium</Badge>;
      case 'Low': return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold uppercase tracking-widest text-[10px] px-3">Low</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-800 border-slate-300 font-bold uppercase tracking-widest text-[10px] px-3">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Closed': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold uppercase pb-1 tracking-tighter">Workflow Closed</Badge>;
      case 'Open': return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold uppercase pb-1 tracking-tighter">Protocol Open</Badge>;
      default: return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-bold uppercase pb-1 tracking-tighter">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500"></div>
        <p className="mt-6 text-slate-500 font-bold uppercase tracking-widest animate-pulse">Syncing Audit Trail...</p>
      </div>
    );
  }

  if (!incident) return null;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/technician/sams/incidents')}
            className="h-12 w-12 rounded-xl border-slate-200 hover:bg-white hover:shadow-md transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              {incident.incidentNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-500 font-medium">{incident.subtype?.subtypeName}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300 mx-1" />
              {getSeverityBadge(incident.severity)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(incident.status)}
        </div>
      </div>

      {/* Global Tabs */}
      <Tabs defaultValue="details" className="space-y-8">
        <TabsList className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-100 shadow-sm h-auto">
          <TabsTrigger value="details" className="rounded-xl px-8 py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all uppercase tracking-widest text-[10px]">Registry Logs</TabsTrigger>
          <TabsTrigger value="capa" className="rounded-xl px-8 py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all uppercase tracking-widest text-[10px]">
            CAPA Operations ({incident.capaSteps?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-xl px-8 py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all uppercase tracking-widest text-[10px]">Assigned Personnel</TabsTrigger>
        </TabsList>

        {/* Details Content */}
        <TabsContent value="details" className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2.5rem]">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-indigo-500" />
                    <CardTitle className="text-xl font-bold">Comprehensive Description</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <p className="text-slate-700 text-lg leading-relaxed italic">"{incident.description}"</p>
                  {incident.impact && (
                    <div className="mt-8 p-6 bg-rose-50/50 border border-rose-100 rounded-3xl">
                      <Label className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 block">Systemic Impact</Label>
                      <p className="text-slate-600 font-medium leading-relaxed">{incident.impact}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl sticky top-24">
                <CardHeader className="bg-slate-900 text-white py-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Deployment Metadata</span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all">
                      <Calendar className="h-5 w-5 text-indigo-500 mt-0.5" />
                      <div>
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Observation Date</Label>
                        <p className="text-sm font-bold text-slate-900">{new Date(incident.incidentDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all">
                      <User className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Originating Officer</Label>
                        <p className="text-sm font-bold text-slate-900">{incident.creator?.name || 'Automated System'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all">
                      <Building2 className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Facility Locus</Label>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900 leading-none">{incident.plant?.plantName || 'Unknown Site'}</p>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">{incident.building?.buildingName}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* CAPA Content */}
        <TabsContent value="capa" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-0 shadow-2xl overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2.5rem]">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 p-3 rounded-2xl">
                  <CheckCircle2 className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">CAPA Workflow Implementation</CardTitle>
                  <CardDescription className="font-medium text-slate-500">Corrective and Preventive Action Protocol Synchronization</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {!incident.capaSteps || incident.capaSteps.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest">Protocol Generation Pending</p>
                </div>
              ) : (
                <div className="space-y-10 relative before:absolute before:inset-0 before:left-6 before:w-[2px] before:bg-slate-100 before:z-0">
                  {incident.capaSteps
                    .sort((a, b) => a.stepNumber - b.stepNumber)
                    .map((step) => {
                      const isCanSubmit = ['Not Started', 'In Progress', 'Rejected'].includes(step.status);
                      const isPending = step.status === 'Pending Approval';
                      const isApproved = step.status === 'Approved';
                      const isRejected = step.status === 'Rejected';

                      return (
                        <div key={step.id} className="relative z-10 pl-16 group">
                          <div className={`absolute left-4 top-0 h-6 w-6 rounded-full border-4 border-white shadow-md ring-4 ${isApproved ? 'bg-emerald-500 ring-emerald-50' :
                            isRejected ? 'bg-rose-500 ring-rose-50' :
                              isPending ? 'bg-amber-400 ring-amber-50' : 'bg-slate-200 ring-slate-50'
                            }`} />

                          <div className={`p-8 rounded-[2rem] border-2 transition-all duration-300 ${isCanSubmit ? 'bg-white border-indigo-100 shadow-xl group-hover:border-indigo-300' :
                            isApproved ? 'bg-emerald-50/30 border-emerald-100 shadow-sm' : 'bg-slate-50/50 border-slate-100'
                            }`}>
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">PHASE {step.stepNumber}</span>
                                  <h4 className="font-extrabold text-xl text-slate-900 tracking-tight">
                                    {step.stepName || step.definition?.stepName}
                                  </h4>
                                </div>
                                {(step.stepDescription || step.definition?.stepDescription) && (
                                  <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
                                    {step.stepDescription || step.definition?.stepDescription}
                                  </p>
                                )}
                              </div>
                              <Badge className={`px-4 py-1.5 rounded-xl font-bold uppercase tracking-tighter text-[10px] ${isApproved ? 'bg-emerald-500 text-white' :
                                isRejected ? 'bg-rose-500 text-white' :
                                  isPending ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                {step.status}
                              </Badge>
                            </div>

                            {isCanSubmit ? (
                              <div className="mt-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center gap-3">
                                  <Info className="h-4 w-4 text-blue-500" />
                                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">
                                    {step.isApprovalRequired ? "SUBMISSION REQUIRES SENIOR OFFICER VERIFICATION" : "THIS PHASE SUPPORTS AUTOMATED FINALIZATION"}
                                  </p>
                                </div>

                                <div className="space-y-3">
                                  <Label htmlFor={`response-${step.id}`} className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Technical Response *</Label>
                                  <Textarea
                                    id={`response-${step.id}`}
                                    placeholder="Document technical interventions, findings, and resolutions..."
                                    value={responses[step.id] || ''}
                                    onChange={(e) => handleResponseChange(step.id, e.target.value)}
                                    rows={4}
                                    className="resize-none rounded-2xl border-slate-200 bg-white p-6 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                                  />
                                </div>

                                {/* File Ops */}
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                      Evidence Upload
                                      {step.isDocumentRequired && (
                                        <Badge className="bg-rose-100 text-rose-600 border-rose-200 ml-2 animate-pulse">Required</Badge>
                                      )}
                                    </Label>
                                  </div>

                                  <div
                                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${step.isDocumentRequired && (!documents[step.id] || documents[step.id].length === 0)
                                        ? 'border-rose-300 bg-rose-50/30'
                                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                      }`}
                                  >
                                    <input
                                      id={`documents-${step.id}`}
                                      type="file"
                                      multiple
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      onChange={(e) => handleFileUpload(step.id, e.target.files)}
                                    />

                                    <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                                      <div className={`p-3 rounded-full ${step.isDocumentRequired && (!documents[step.id] || documents[step.id].length === 0)
                                          ? 'bg-rose-100 text-rose-500'
                                          : 'bg-indigo-100 text-indigo-500'
                                        }`}>
                                        <Upload className="h-6 w-6" />
                                      </div>

                                      <div className="space-y-1">
                                        <p className="font-bold text-slate-700">
                                          {step.isDocumentRequired && (!documents[step.id] || documents[step.id].length === 0)
                                            ? "Evidence Required"
                                            : "Click or Drag Files Here"}
                                        </p>
                                        <p className="text-xs text-slate-400 font-medium">Support for Images, PDF, Docs</p>
                                      </div>
                                    </div>
                                  </div>

                                  {step.isDocumentRequired && (!documents[step.id] || documents[step.id].length === 0) && (
                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5 px-2">
                                      <ShieldAlert className="h-3 w-3" />
                                      Submission Blocked: Mandatory Evidence Missing
                                    </p>
                                  )}

                                  {documents[step.id] && documents[step.id].length > 0 && (
                                    <div className="flex flex-col gap-2 pt-2">
                                      {documents[step.id].map((doc, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl group/file hover:bg-indigo-50 transition-colors">
                                          <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="bg-white p-2 rounded-lg border border-indigo-100 text-indigo-600">
                                              <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-sm font-bold text-slate-700 truncate">{doc.name}</p>
                                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Ready for Upload</p>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleRemoveDocument(step.id, index)}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {isRejected && step.rejectionReason && (
                                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                                    <div className="flex items-center gap-2 text-rose-600 mb-1">
                                      <AlertCircle className="h-4 w-4" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Rejection Feedback</span>
                                    </div>
                                    <p className="text-sm text-rose-800 font-medium italic">"{step.rejectionReason}"</p>
                                  </div>
                                )}

                                <Button
                                  onClick={() => handleSubmitCapaStep(step)}
                                  disabled={submitting === step.id || !responses[step.id]?.trim() || (step.isDocumentRequired && (!documents[step.id] || documents[step.id].length === 0))}
                                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black h-14 rounded-2xl shadow-lg transition-all"
                                >
                                  {submitting === step.id ? (
                                    <Activity className="h-5 w-5 animate-spin mr-3" />
                                  ) : (
                                    <Send className="h-5 w-5 mr-3" />
                                  )}
                                  {step.isApprovalRequired ? "TRANSMIT FOR APPROVAL" : "FINALIZE PHASE"}
                                </Button>
                              </div>
                            ) : (
                              <div className="mt-6 space-y-6">
                                {step.stepResponse && (
                                  <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-inner">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Technician Log</Label>
                                    <p className="text-slate-800 font-medium leading-relaxed">{step.stepResponse}</p>
                                  </div>
                                )}

                                {isPending && (
                                  <div className="inline-flex items-center gap-3 bg-amber-50 px-5 py-2.5 rounded-full text-amber-700 border border-amber-100 animate-pulse">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Verifying Compliance Signature...</span>
                                  </div>
                                )}

                                {isApproved && (
                                  <div className="flex items-center gap-4 py-4 px-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                                    <div className="bg-emerald-500 p-2 rounded-full text-white">
                                      <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Protocol Verified</p>
                                      <p className="text-sm font-bold text-slate-900">Approved by {step.approver?.name || 'Authorized Supervisor'}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Content */}
        <TabsContent value="team" className="animate-in fade-in zoom-in-95 duration-500">
          <Card className="border-0 shadow-2xl overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2.5rem]">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-2xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Investigation Task Force</CardTitle>
                  <CardDescription className="font-medium text-slate-500">Personnel authorized for onsite operations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {!incident.assignments || incident.assignments.length === 0 ? (
                <p className="text-center text-slate-400 py-12 italic">No active personnel assignments in registry.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {incident.assignments
                    .filter((a) => a.isActive)
                    .map((assignment) => (
                      <div key={assignment.id} className="group relative bg-slate-50 border border-slate-100 p-6 rounded-3xl hover:bg-white hover:shadow-xl hover:border-indigo-100 transition-all duration-300">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <User className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="bg-white border-slate-200 text-[10px] font-bold uppercase tracking-tighter px-3">
                              {assignment.role}
                            </Badge>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 leading-tight">
                              {assignment.assignedUser?.name || assignment.externalPersonName}
                            </h4>
                            <p className="text-sm font-semibold text-slate-500 mt-1 opacity-80">
                              {assignment.assignedUser?.email || assignment.externalPersonEmail}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default IncidentView;
