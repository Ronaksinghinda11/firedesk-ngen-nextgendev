import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { managerApi, Audit } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';

const AuditView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAudit();
    }
  }, [id]);

  const fetchAudit = async () => {
    try {
      setLoading(true);
      const response = await managerApi.audits.getById(id!);
      setAudit(response.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load audit",
        variant: "destructive"
      });
      navigate('/manager/sams/audits');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'CAPA Required': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Pending Approval': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Closed': return 'bg-green-100 text-green-800 border-green-300';
      case 'Reopened': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getNCSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'Major': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Minor': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getNCStatusIcon = (status: string) => {
    switch (status) {
      case 'Closed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!audit) {
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
            onClick={() => navigate('/manager/sams/audits')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{audit.auditNumber}</h1>
            <p className="text-gray-600">{audit.auditName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{audit.auditType}</Badge>
          <Badge variant="outline" className={getStatusColor(audit.status)}>
            {audit.status}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="ncs">
            Non-Conformities ({audit.ncs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Scheduled Date</p>
                  <p className="mt-1">{new Date(audit.scheduledDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Audit Type</p>
                  <p className="mt-1">{audit.auditType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Plant</p>
                  <p className="mt-1">{audit.plantId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Building</p>
                  <p className="mt-1">{audit.buildingId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Auditor</p>
                  <p className="mt-1">{audit.auditorUserId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Auditee</p>
                  <p className="mt-1">{audit.auditeeUserId || 'N/A'}</p>
                </div>
              </div>

              {audit.purpose && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Purpose</p>
                    <p className="text-gray-900">{audit.purpose}</p>
                  </div>
                </>
              )}

              {audit.conclusion && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Conclusion</p>
                    <p className="text-gray-900">{audit.conclusion}</p>
                  </div>
                </>
              )}

              {audit.reportUrl && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Audit Report</p>
                    <a
                      href={audit.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Report
                    </a>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ncs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Non-Conformities (NCs)</CardTitle>
              <CardDescription>
                Issues and observations identified during the audit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!audit.ncs || audit.ncs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No non-conformities recorded</p>
              ) : (
                <div className="space-y-4">
                  {audit.ncs.map((nc) => (
                    <div
                      key={nc.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getNCStatusIcon(nc.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">
                            NC #{nc.ncNumber}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getNCSeverityColor(nc.severity)}>
                              {nc.severity}
                            </Badge>
                            <Badge variant="outline">{nc.status}</Badge>
                          </div>
                        </div>

                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">Observation:</p>
                          <p className="text-sm text-gray-900">{nc.observation}</p>
                        </div>

                        {nc.actionPlan && (
                          <div className="mt-2 p-3 bg-white rounded border">
                            <p className="text-sm font-medium text-gray-700 mb-1">Action Plan:</p>
                            <p className="text-sm text-gray-900">{nc.actionPlan}</p>
                          </div>
                        )}

                        {nc.targetDateToClose && (
                          <div className="mt-2 text-xs text-gray-500">
                            Target Date: {new Date(nc.targetDateToClose).toLocaleDateString()}
                          </div>
                        )}

                        {nc.capaSteps && nc.capaSteps.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              CAPA Steps ({nc.capaSteps.length}):
                            </p>
                            <div className="space-y-2">
                              {nc.capaSteps.map((step, idx) => (
                                <div key={step.id} className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline" size="sm">
                                    Step {idx + 1}
                                  </Badge>
                                  <span className="text-gray-700">{step.stepName}</span>
                                  <Badge variant="outline" size="sm">{step.status}</Badge>
                                </div>
                              ))}
                            </div>
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

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>History of actions taken on this audit</CardDescription>
            </CardHeader>
            <CardContent>
              {!audit.activities || audit.activities.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {audit.activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-orange-600"></div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-600">{activity.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.performedBy} • {new Date(activity.createdAt).toLocaleString()}
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
    </div>
  );
};

export default AuditView;
