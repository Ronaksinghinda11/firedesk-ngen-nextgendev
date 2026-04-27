import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, AlertCircle } from 'lucide-react';
import { userApi, Incident } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';

const MyIncidents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, PENDINGApproval: 0 });

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await userApi.getMyIncidents();
      setIncidents(response.data);

      // Calculate stats
      const total = response.data.length;
      const inProgress = response.data.filter((i: Incident) =>
        ['Assigned', 'Under Review', 'In CAPA'].includes(i.status)
      ).length;
      const PENDINGApproval = response.data.filter((i: Incident) =>
        i.status === 'Pending Approval'
      ).length;

      setStats({ total, inProgress, PENDINGApproval });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load assigned incidents",
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
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'Assigned': return 'bg-purple-100 text-purple-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      case 'In CAPA': return 'bg-orange-100 text-orange-800';
      case 'Pending Approval': return 'bg-indigo-100 text-indigo-800';
      case 'Closed': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCapaProgress = (incident: Incident) => {
    if (!incident.capaSteps || incident.capaSteps.length === 0) return 'No CAPA';

    const approved = incident.capaSteps.filter(s => s.status === 'Approved').length;
    const total = incident.capaSteps.length;

    return `${approved}/${total}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Assigned Incidents</h1>
        <p className="text-gray-600 mt-1">View and manage incidents assigned to you</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Assigned</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Approval</CardDescription>
            <CardTitle className="text-3xl">{stats.PENDINGApproval}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Incidents</CardTitle>
          <CardDescription>Incidents where you are part of the assigned team</CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Incidents</h3>
              <p className="text-gray-600">You don't have any incidents assigned to you yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incident Number</TableHead>
                    <TableHead>Subtype</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>CAPA Progress</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-medium">{incident.incidentNumber}</TableCell>
                      <TableCell>{incident.subtype?.subtypeName}</TableCell>
                      <TableCell>{incident.plant?.plantName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(incident.status)}>
                          {incident.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{getCapaProgress(incident)}</TableCell>
                      <TableCell>{new Date(incident.incidentDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/user/sams/incidents/${incident.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyIncidents;
