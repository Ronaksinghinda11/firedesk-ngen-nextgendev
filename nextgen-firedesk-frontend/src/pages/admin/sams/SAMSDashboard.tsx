import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ClipboardCheck, GraduationCap, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { incidentApi, auditApi, trainingApi } from '@/services/api/samsApi';
import { usePlantFilter } from '@/contexts/PlantFilterContext';

const SAMSDashboard = () => {
  const navigate = useNavigate();
  const { selectedPlantId } = usePlantFilter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    incidents: { total: 0, open: 0, critical: 0 },
    audits: { total: 0, planned: 0, inProgress: 0 },
    trainings: { total: 0, scheduled: 0, completed: 0 }
  });
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);

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

      // Fetch incidents with plant filter
      const incidentsResponse = await incidentApi.getAll({ limit: 5, ...queryParams });
      const incidents = incidentsResponse.data || [];
      setRecentIncidents(incidents.slice(0, 5));

      // Fetch audits with plant filter
      const auditsResponse = await auditApi.getAll(queryParams);
      const audits = auditsResponse.data || [];
      setRecentAudits(audits.slice(0, 5));

      // Fetch trainings with plant filter
      const trainingsResponse = await trainingApi.getAll(queryParams);
      const trainings = trainingsResponse.data || [];

      // Calculate stats
      setStats({
        incidents: {
          total: incidents.length,
          open: incidents.filter((i: any) => i.status === 'Open' || i.status === 'Assigned').length,
          critical: incidents.filter((i: any) => i.severity === 'Critical').length
        },
        audits: {
          total: audits.length,
          planned: audits.filter((a: any) => a.status === 'Planned').length,
          inProgress: audits.filter((a: any) => a.status === 'In Progress').length
        },
        trainings: {
          total: trainings.length,
          scheduled: trainings.filter((t: any) => t.status === 'Scheduled').length,
          completed: trainings.filter((t: any) => t.status === 'Completed').length
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Safety & Audit Management System</h1>
        <p className="text-gray-600 mt-1">Monitor incidents, audits, and trainings across your organization</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Incidents Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" //onClick={() => navigate('/admin/sams/incidents')}
          >
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
                <span className="text-gray-600">{stats.incidents.open} Open</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audits Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" //onClick={() => navigate('/admin/sams/audits')}
          >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audits</CardTitle>
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.audits.total}</div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-gray-600">{stats.audits.planned} Planned</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-gray-600">{stats.audits.inProgress} In Progress</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trainings Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" //onClick={() => navigate('/admin/sams/trainings')}
          >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trainings</CardTitle>
            <GraduationCap className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.trainings.total}</div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-gray-600">{stats.trainings.scheduled} Scheduled</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">{stats.trainings.completed} Completed</span>
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
              //onClick={() => navigate('/admin/sams/incidents/create')}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report Incident
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              //onClick={() => navigate('/admin/sams/audits/create')}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Schedule Audit
            </Button>
            <Button
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              //onClick={() => navigate('/admin/sams/trainings/create')}
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
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/sams/incidents')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No incidents reported</p>
            ) : (
              <div className="space-y-4">
                {recentIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/sams/incidents/${incident.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{incident.incidentNumber}</span>
                        <Badge variant="outline" className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{incident.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(incident.incidentDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audits */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Audits</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/sams/audits')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAudits.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No audits scheduled</p>
            ) : (
              <div className="space-y-4">
                {recentAudits.map((audit) => (
                  <div
                    key={audit.id}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/sams/audits/${audit.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{audit.auditNumber}</span>
                        <Badge variant="outline">{audit.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{audit.auditName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(audit.scheduledDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SAMSDashboard;
