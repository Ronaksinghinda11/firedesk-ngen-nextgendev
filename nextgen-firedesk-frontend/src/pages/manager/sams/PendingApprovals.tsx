import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { managerApi, PendingApproval } from '@/services/api/samsApi';
import { useToast } from '@/hooks/use-toast';

const PendingApprovals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PendingApproval | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    type: 'capaStep' | 'incident' | null;
    id: string;
    stepId?: string;
    action: 'approve' | 'reject';
    title: string;
  }>({
    open: false,
    type: null,
    id: '',
    action: 'approve',
    title: ''
  });
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await managerApi.getPendingApprovals();
      if (response.success) {
        setData(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching PENDING approvals:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load PENDING approvals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openApprovalDialog = (
    type: 'capaStep' | 'incident',
    id: string,
    stepId: string | undefined,
    action: 'approve' | 'reject',
    title: string
  ) => {
    setApprovalDialog({ open: true, type, id, stepId, action, title });
    setComments('');
  };

  const closeApprovalDialog = () => {
    setApprovalDialog({ open: false, type: null, id: '', action: 'approve', title: '' });
    setComments('');
  };

  const handleApproval = async () => {
    if (!approvalDialog.type) return;

    try {
      setSubmitting(true);
      const approved = approvalDialog.action === 'approve';

      if (approvalDialog.type === 'capaStep' && approvalDialog.stepId) {
        await managerApi.approveCAPAStep(
          approvalDialog.id,
          approvalDialog.stepId,
          approved,
          comments
        );
      } else if (approvalDialog.type === 'incident') {
        await managerApi.approveIncident(
          approvalDialog.id,
          approved,
          approved ? comments : undefined,
          approved ? undefined : comments
        );
      }

      toast({
        title: "Success",
        description: `Successfully ${approved ? 'approved' : 'rejected'}`,
      });

      closeApprovalDialog();
      fetchPendingApprovals();
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to process approval",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PENDING approvals...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve PENDING items requiring your attention</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">CAPA Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{data.summary.totalCAPASteps}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{data.summary.totalIncidents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Audit NCs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{data.summary.totalAuditNCs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different approval types */}
      <Tabs defaultValue="capa" className="space-y-4">
        <TabsList>
          <TabsTrigger value="capa">
            CAPA Steps ({data.summary.totalCAPASteps})
          </TabsTrigger>
          <TabsTrigger value="incidents">
            Incidents ({data.summary.totalIncidents})
          </TabsTrigger>
          <TabsTrigger value="auditNCs">
            Audit NCs ({data.summary.totalAuditNCs})
          </TabsTrigger>
        </TabsList>

        {/* CAPA Steps Tab */}
        <TabsContent value="capa" className="space-y-4">
          {data.capaSteps && data.capaSteps.length > 0 ? (
            data.capaSteps.map((capaStep: any) => (
              <Card key={capaStep.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {capaStep.incident?.incidentNumber} - Step {capaStep.stepNumber}
                      </CardTitle>
                      <CardDescription>
                        {capaStep.definition?.stepName}
                      </CardDescription>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      Pending Approval
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Plant:</span>{' '}
                      <span className="font-medium">{capaStep.incident?.plant?.plantName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Category:</span>{' '}
                      <span className="font-medium">{capaStep.incident?.category?.categoryName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Submitted by:</span>{' '}
                      <span className="font-medium">{capaStep.submitter?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Submitted at:</span>{' '}
                      <span className="font-medium">
                        {new Date(capaStep.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {capaStep.stepResponse && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Response:</Label>
                      <p className="mt-1 text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
                        {capaStep.stepResponse}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      onClick={() => navigate(`/manager/sams/incidents/${capaStep.incident.id}`)}
                      variant="outline"
                    >
                      View Incident
                    </Button>
                    <Button
                      onClick={() =>
                        openApprovalDialog(
                          'capaStep',
                          capaStep.incident.id,
                          capaStep.id,
                          'approve',
                          `CAPA Step ${capaStep.stepNumber}`
                        )
                      }
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() =>
                        openApprovalDialog(
                          'capaStep',
                          capaStep.incident.id,
                          capaStep.id,
                          'reject',
                          `CAPA Step ${capaStep.stepNumber}`
                        )
                      }
                      variant="destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No CAPA steps PENDING approval
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4">
          {data.incidents && data.incidents.length > 0 ? (
            data.incidents.map((incident: any) => (
              <Card key={incident.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{incident.incidentNumber}</CardTitle>
                      <CardDescription>{incident.subtype?.subtypeName}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        incident.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                          incident.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                            incident.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                      }>
                        {incident.severity}
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-800">
                        Pending Approval
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Plant:</span>{' '}
                      <span className="font-medium">{incident.plant?.plantName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Building:</span>{' '}
                      <span className="font-medium">{incident.building?.buildingName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Incident Date:</span>{' '}
                      <span className="font-medium">
                        {new Date(incident.incidentDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Created by:</span>{' '}
                      <span className="font-medium">{incident.creator?.name}</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Description:</Label>
                    <p className="mt-1 text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
                      {incident.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      onClick={() => navigate(`/manager/sams/incidents/${incident.id}`)}
                      variant="outline"
                    >
                      View Details
                    </Button>
                    <Button
                      onClick={() =>
                        openApprovalDialog(
                          'incident',
                          incident.id,
                          undefined,
                          'approve',
                          incident.incidentNumber
                        )
                      }
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve & Close
                    </Button>
                    <Button
                      onClick={() =>
                        openApprovalDialog(
                          'incident',
                          incident.id,
                          undefined,
                          'reject',
                          incident.incidentNumber
                        )
                      }
                      variant="destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject & Reopen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No incidents PENDING approval
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Audit NCs Tab */}
        <TabsContent value="auditNCs" className="space-y-4">
          {data.auditNCs && data.auditNCs.length > 0 ? (
            data.auditNCs.map((nc: any) => (
              <Card key={nc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{nc.ncNumber}</CardTitle>
                      <CardDescription>
                        Audit: {nc.audit?.auditNumber}
                      </CardDescription>
                    </div>
                    <Badge className={
                      nc.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                        nc.severity === 'Major' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                    }>
                      {nc.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Plant:</span>{' '}
                      <span className="font-medium">{nc.audit?.plant?.plantName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Target Date:</span>{' '}
                      <span className="font-medium">
                        {new Date(nc.targetDateToClose).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Observation:</Label>
                    <p className="mt-1 text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
                      {nc.observation}
                    </p>
                  </div>

                  {nc.actionPlan && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Action Plan:</Label>
                      <p className="mt-1 text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
                        {nc.actionPlan}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      onClick={() => navigate(`/manager/sams/audits/${nc.audit.id}`)}
                      variant="outline"
                    >
                      View Audit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No audit NCs PENDING verification
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={closeApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'} {approvalDialog.title}
            </DialogTitle>
            <DialogDescription>
              {approvalDialog.action === 'approve'
                ? 'Add any comments for this approval (optional)'
                : 'Please provide a reason for rejection (required)'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comments">
                {approvalDialog.action === 'approve' ? 'Comments' : 'Rejection Reason'}
                {approvalDialog.action === 'reject' && <span className="text-red-500"> *</span>}
              </Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  approvalDialog.action === 'approve'
                    ? 'Add any additional comments...'
                    : 'Explain why this is being rejected...'
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeApprovalDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleApproval}
              disabled={submitting || (approvalDialog.action === 'reject' && !comments.trim())}
              className={
                approvalDialog.action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {submitting ? 'Processing...' : approvalDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingApprovals;
