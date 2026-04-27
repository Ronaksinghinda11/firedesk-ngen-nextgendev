import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ClipboardCheck, GraduationCap, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { managerApi, DashboardStats } from '@/services/api/samsApi';
import { useToast } from '@/hooks/use-toast';
import { usePlantFilter } from '@/contexts/PlantFilterContext';

const SAMSDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedPlantId } = usePlantFilter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPlantId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Build query params for plant filtering
      const queryParams: any = {};
      if (selectedPlantId && selectedPlantId !== 'all') {
        queryParams.plantId = selectedPlantId;
      }

      const response = await managerApi.getDashboard(queryParams);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load dashboard data",
        variant: "destructive"
      });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
      case 'Assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
      case 'Under Review':
        return 'bg-blue-100 text-blue-800';
      case 'Pending Approval':
        return 'bg-purple-100 text-purple-800';
      case 'Closed':
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
      case 'Reopened':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
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
        <h1 className="text-3xl font-bold text-gray-900">Safety & Audit Management System</h1>
        <p className="text-gray-600 mt-1">Monitor and manage safety incidents, audits, and trainings for your plants</p>
      </div>

      {/* Pending Approvals Alert */}
      {stats.PENDINGApprovals.total > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg text-orange-900">
                  Pending Approvals
                </CardTitle>
              </div>
              <Button
                onClick={() => navigate('/manager/sams/incidents')}
                className="bg-orange-600 hover:bg-orange-700"
              >
                View All ({stats.PENDINGApprovals.total})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                <span className="text-gray-700">
                  {stats.PENDINGApprovals.capaSteps} CAPA steps awaiting approval
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                <span className="text-gray-700">
                  {stats.PENDINGApprovals.incidents} incidents awaiting closure
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Incidents Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/manager/sams/incidents')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.incidents.total}</div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-gray-600">{stats.incidents.critical} Critical</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
                <span className="text-gray-600">
                  {(stats.incidents.byStatus['Open'] || 0) + (stats.incidents.byStatus['Assigned'] || 0)} Open
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audits Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/manager/sams/audits')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audits</CardTitle>
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.audits.total}</div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-gray-600">{stats.audits.upcoming} Upcoming</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-gray-600">{stats.audits.byStatus['In Progress'] || 0} In Progress</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trainings Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/manager/sams/trainings')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trainings</CardTitle>
            <GraduationCap className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.trainings.total}</div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-gray-600">{stats.trainings.upcoming} Upcoming</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              onClick={() => navigate('/manager/sams/incidents/create')}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report Incident
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              onClick={() => navigate('/manager/sams/audits/create')}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Schedule Audit
            </Button>
            <Button
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              onClick={() => navigate('/manager/sams/trainings/create')}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Schedule Training
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Incidents</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/manager/sams/incidents')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.incidents.recent && stats.incidents.recent.length > 0 ? (
              <div className="space-y-3">
                {stats.incidents.recent.map((incident: any) => (
                  <div
                    key={incident.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/manager/sams/incidents/${incident.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{incident.incidentNumber}</span>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {incident.subtype?.subtypeName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {incident.plant?.plantName}
                      </p>
                    </div>
                    <Badge className={getStatusColor(incident.status)}>
                      {incident.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent incidents</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Audits */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Audits</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/manager/sams/audits')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.audits.recent && stats.audits.recent.length > 0 ? (
              <div className="space-y-3">
                {stats.audits.recent.map((audit: any) => (
                  <div
                    key={audit.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/manager/sams/audits/${audit.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{audit.auditNumber}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {audit.auditName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {audit.plant?.plantName} • {new Date(audit.scheduledDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(audit.status)}>
                      {audit.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent audits</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SAMSDashboard;
