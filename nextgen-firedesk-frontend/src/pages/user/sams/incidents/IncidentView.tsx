import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, Send, Upload, X, Info } from 'lucide-react';
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

      // Initialize responses for existing step responses
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
      navigate('/user/sams/incidents');
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
        title: "Error",
        description: "Please provide a response before submitting",
        variant: "destructive"
      });
      return;
    }

    // Validate document requirement
    if (step.requiresDocument && (!documents[step.id] || documents[step.id].length === 0)) {
      toast({
        title: "Document Required",
        description: "This CAPA step requires document upload. Please attach required documents.",
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

      const successMessage = step.requiresApproval 
        ? "CAPA step submitted for manager approval" 
        : "CAPA step submitted and auto-approved";

      toast({
        title: "Success",
        description: successMessage
      });

      // Refresh incident data
      await fetchIncident();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit CAPA step",
        variant: "destructive"
      });
    } finally {
      setSubmitting(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCapaStepIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'Pending Approval': return <Clock className="h-5 w-5 text-yellow-600" />;
      default: return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const canSubmitStep = (step: IncidentCapaStep) => {
    return ['Not Started', 'In Progress', 'Rejected'].includes(step.status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!incident) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/user/sams/incidents')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{incident.incidentNumber}</h1>
            <p className="text-gray-600">{incident.subtype?.subtypeName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getSeverityColor(incident.severity)}>
            {incident.severity}
          </Badge>
          <Badge variant="outline">{incident.status}</Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="capa">
            CAPA ({incident.capaSteps?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Incident Date</p>
                  <p className="mt-1">{new Date(incident.incidentDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Reported By</p>
                  <p className="mt-1">{incident.creator?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Plant</p>
                  <p className="mt-1">{incident.plant?.plantName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Building</p>
                  <p className="mt-1">{incident.building?.buildingName || 'N/A'}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
                <p className="text-gray-900">{incident.description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CAPA Steps</CardTitle>
              <CardDescription>
                Complete each CAPA step by providing your response
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!incident.capaSteps || incident.capaSteps.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No CAPA steps defined yet</p>
              ) : (
                <div className="space-y-6">
                  {incident.capaSteps
                    .sort((a, b) => a.stepNumber - b.stepNumber)
                    .map((step) => (
                      <div
                        key={step.id}
                        className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {getCapaStepIcon(step.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">
                                Step {step.stepNumber}: {step.stepName || step.definition?.stepName}
                              </h4>
                              <Badge variant="outline">{step.status}</Badge>
                            </div>

                            {(step.stepDescription || step.definition?.stepDescription) && (
                              <p className="text-sm text-gray-600 mb-3">
                                {step.stepDescription || step.definition?.stepDescription}
                              </p>
                            )}

                            {/* Show approval requirement info */}
                            {canSubmitStep(step) && (
                              <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                                <Info className="h-4 w-4 text-blue-600" />
                                <p className="text-sm text-blue-700">
                                  {step.requiresApproval 
                                    ? "This step requires manager approval after submission" 
                                    : "This step will be auto-approved upon submission"}
                                </p>
                              </div>
                            )}

                            {canSubmitStep(step) ? (
                              <div className="space-y-3 mt-4">
                                <Label htmlFor={`response-${step.id}`}>Your Response *</Label>
                                <Textarea
                                  id={`response-${step.id}`}
                                  placeholder="Enter your response for this CAPA step..."
                                  value={responses[step.id] || ''}
                                  onChange={(e) => handleResponseChange(step.id, e.target.value)}
                                  rows={4}
                                  className="resize-none"
                                />

                                {/* Document Upload - Required or Optional */}
                                <div className="space-y-2">
                                  <Label htmlFor={`documents-${step.id}`}>
                                    Attachments {step.requiresDocument ? <span className="text-red-500">*</span> : '(Optional)'}
                                  </Label>
                                  {step.requiresDocument && (
                                    <p className="text-sm text-red-600">Document upload is required for this step</p>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <input
                                      id={`documents-${step.id}`}
                                      type="file"
                                      multiple
                                      onChange={(e) => handleFileUpload(step.id, e.target.files)}
                                      className="hidden"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => document.getElementById(`documents-${step.id}`)?.click()}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload Files
                                    </Button>
                                    <span className="text-sm text-gray-500">
                                      {documents[step.id]?.length || 0} file(s) selected
                                    </span>
                                  </div>
                                  {documents[step.id] && documents[step.id].length > 0 && (
                                    <div className="space-y-1 mt-2">
                                      {documents[step.id].map((doc, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                          <span className="text-sm text-gray-700 truncate flex-1">{doc.name}</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveDocument(step.id, index)}
                                            className="h-6 w-6 p-0"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {step.rejectionReason && (
                                  <div className="p-3 bg-red-50 rounded border border-red-200">
                                    <p className="text-sm font-medium text-red-700 mb-1">
                                      Previous Rejection Reason:
                                    </p>
                                    <p className="text-sm text-red-900">{step.rejectionReason}</p>
                                  </div>
                                )}
                                <Button
                                  onClick={() => handleSubmitCapaStep(step)}
                                  disabled={submitting === step.id || !responses[step.id]?.trim()}
                                  className="mt-2"
                                >
                                  {submitting === step.id ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-2" />
                                      Submit for Approval
                                    </>
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <>
                                {step.stepResponse && (
                                  <div className="mt-2 p-3 bg-white rounded border">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Your Response:</p>
                                    <p className="text-sm text-gray-900">{step.stepResponse}</p>
                                  </div>
                                )}
                                {step.status === 'Pending Approval' && (
                                  <p className="text-sm text-yellow-600 mt-2">
                                    Waiting for manager approval...
                                  </p>
                                )}
                                {step.status === 'Approved' && step.approver?.name && (
                                  <p className="text-sm text-green-600 mt-2">
                                    Approved by {step.approver.name}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Team</CardTitle>
              <CardDescription>Team members working on this incident</CardDescription>
            </CardHeader>
            <CardContent>
              {!incident.assignments || incident.assignments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No team members assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {incident.assignments
                    .filter((a) => a.isActive)
                    .map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">
                            {assignment.assignedUser?.name || assignment.externalPersonName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {assignment.assignedUser?.email || assignment.externalPersonEmail}
                          </p>
                        </div>
                        <Badge variant="outline">{assignment.role}</Badge>
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
};

export default IncidentView;
