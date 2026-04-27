import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, UserPlus, ThumbsUp, ThumbsDown, Download } from 'lucide-react';
import { managerApi, Incident, IncidentCapaStep } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import TeamAssignmentDialog from '@/components/manager/TeamAssignmentDialog';

const IncidentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showTeamAssignment, setShowTeamAssignment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchIncident();
    }
  }, [id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const response = await managerApi.incidents.getById(id!);
      setIncident(response.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load incident",
        variant: "destructive"
      });
      navigate('/manager/sams/incidents');
    } finally {
      setLoading(false);
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

  const handleApproveCapaStep = async (step: IncidentCapaStep) => {
    try {
      setApproving(step.id);
      await managerApi.incidents.reviewCapaStep(id!, step.id, true);

      toast({
        title: "Success",
        description: "CAPA step approved successfully"
      });

      // Refresh incident data
      await fetchIncident();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to approve CAPA step",
        variant: "destructive"
      });
    } finally {
      setApproving(null);
    }
  };

  const handleRejectCapaStep = async (step: IncidentCapaStep) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive"
      });
      return;
    }

    try {
      await managerApi.incidents.reviewCapaStep(id!, step.id, false, rejectionReason);

      toast({
        title: "Success",
        description: "CAPA step rejected"
      });

      setRejecting(null);
      setRejectionReason('');

      // Refresh incident data
      await fetchIncident();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to reject CAPA step",
        variant: "destructive"
      });
    }
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
            onClick={() => navigate('/manager/sams/incidents')}
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
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
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

              {incident.assignedManager && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Assigned Manager</p>
                    <p className="text-gray-900">{incident.assignedManager?.user?.name}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CAPA Steps</CardTitle>
              <CardDescription>
                Corrective and Preventive Actions for this incident
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!incident.capaSteps || incident.capaSteps.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No CAPA steps defined yet</p>
              ) : (
                <div className="space-y-4">
                  {incident.capaSteps
                    .sort((a, b) => a.stepNumber - b.stepNumber)
                    .map((step) => (
                      <div
                        key={step.id}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getCapaStepIcon(step.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">
                              Step {step.stepNumber}: {step.definition?.stepName}
                            </h4>
                            <Badge variant="outline">{step.status}</Badge>
                          </div>
                          {step.definition?.stepDescription && (
                            <p className="text-sm text-gray-600 mb-2">
                              {step.definition.stepDescription}
                            </p>
                          )}
                          {step.stepResponse && (
                            <div className="mt-2 p-3 bg-white rounded border">
                              <p className="text-sm font-medium text-gray-700 mb-1">Response:</p>
                              <p className="text-sm text-gray-900">{step.stepResponse}</p>
                            </div>
                          )}
                          {step.documentsData && (() => {
                            try {
                              const documents = JSON.parse(step.documentsData);
                              if (documents && documents.length > 0) {
                                return (
                                  <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                                    <p className="text-sm font-medium text-blue-900 mb-2">Attachments:</p>
                                    <div className="space-y-2">
                                      {documents.map((doc: { name: string; data: string }, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                          <span className="text-sm text-gray-700 truncate flex-1">{doc.name}</span>
                                          <a
                                            href={doc.data}
                                            download={doc.name}
                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                          >
                                            <Download className="h-4 w-4" />
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                            } catch (e) {
                              return null;
                            }
                            return null;
                          })()}
                          {step.rejectionReason && (
                            <div className="mt-2 p-3 bg-red-50 rounded border border-red-200">
                              <p className="text-sm font-medium text-red-700 mb-1">
                                Rejection Reason:
                              </p>
                              <p className="text-sm text-red-900">{step.rejectionReason}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            {step.submittedBy && (
                              <span>Submitted by: {step.submitter?.name}</span>
                            )}
                            {step.approvedBy && (
                              <span>Approved by: {step.approver?.name}</span>
                            )}
                          </div>

                          {step.status === 'Pending Approval' && (
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveCapaStep(step)}
                                disabled={approving === step.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {approving === step.id ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <ThumbsUp className="h-4 w-4 mr-2" />
                                    Approve
                                  </>
                                )}
                              </Button>

                              <Dialog open={rejecting === step.id} onOpenChange={(open) => !open && setRejecting(null)}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setRejecting(step.id)}
                                  >
                                    <ThumbsDown className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reject CAPA Step</DialogTitle>
                                    <DialogDescription>
                                      Please provide a reason for rejecting this CAPA step submission.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                                      <Textarea
                                        id="rejection-reason"
                                        placeholder="Explain why this step is being rejected..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows={4}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setRejecting(null);
                                        setRejectionReason('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleRejectCapaStep(step)}
                                      disabled={!rejectionReason.trim()}
                                    >
                                      Reject Step
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assigned Team</CardTitle>
                <CardDescription>Team members working on this incident</CardDescription>
              </div>
              {incident.status === 'Open' && (
                <Button onClick={() => setShowTeamAssignment(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Team
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!incident.assignments || incident.assignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No team members assigned yet</p>
                  {incident.status === 'Open' && (
                    <Button onClick={() => setShowTeamAssignment(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Team
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {incident.assignments
                    .filter((a) => a.isActive)
                    .map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {assignment.assignedUser?.name || assignment.externalPersonName}
                            </p>
                            {assignment.isTeamLeader && (
                              <Badge className="bg-blue-600">Team Leader</Badge>
                            )}
                          </div>
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

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>History of actions taken on this incident</CardDescription>
            </CardHeader>
            <CardContent>
              {!incident.activities || incident.activities.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {incident.activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-orange-600"></div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-600">{activity.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.performer?.name} •{' '}
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Team Assignment Dialog */}
      <TeamAssignmentDialog
        open={showTeamAssignment}
        onOpenChange={setShowTeamAssignment}
        incidentId={id!}
        plantId={incident.plantId}
        onSuccess={fetchIncident}
      />
    </div>
  );
};

export default IncidentView;
