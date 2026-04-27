import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Entity } from '@/types/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Users2, Trash2, AlertCircle } from 'lucide-react';
import { incidentApi, Incident } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import TeamAssignmentDialog from './components/TeamAssignmentDialog';
import CapaWorkflowTab from './components/CapaWorkflowTab';
import TimelineTab from './components/TimelineTab';

const IncidentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isManager } = useAuth();
  const { toast } = useToast();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const { canDelete } = usePermissions();
  const canDeleteIncident = canDelete(Entity.INCIDENTS) && !isManager;

  useEffect(() => {
    if (id) {
      fetchIncident();
    }
  }, [id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const response = await incidentApi.getById(id!);
      setIncident(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load incident',
        variant: 'destructive'
      });
      navigate(`${location.pathname.includes('/manager') ? '/manager' : '/admin'}/sams/incidents`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIncident = async () => {
    try {
      setDeleting(true);
      await incidentApi.delete(id!);

      toast({
        title: 'Success',
        description: 'Incident deleted successfully'
      });

      navigate(`${location.pathname.includes('/manager') ? '/manager' : '/admin'}/sams/incidents`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete incident',
        variant: 'destructive'
      });
      setDeleting(false);
    }
  };

  // ... (keeping severity/status helpers unchanged)
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Closed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Pending Approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!incident) {
    return null;
  }

  const canAssignTeam = (isAdmin || isManager) && (incident.status === 'Open' || !(incident.teamCreatorId));

  // EntityConfig stub for Header
  const entityConfigStub = {
    entityName: 'Incident',
    entityNamePlural: 'Incidents',
    limitTopMenuItems: [],
    // Custom header actions if needed
  } as any;

  return (
    <div className="p-4 space-y-4">
      {/* Generic Header */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${location.pathname.includes('/manager') ? '/manager' : '/admin'}/sams/incidents`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {incident.incidentNumber}
              <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
              <Badge className={getStatusColor(incident.status)}>{incident.status}</Badge>
            </h1>
            <p className="text-sm text-gray-500">
              {incident.subtype?.incidentType?.typeName} - {incident.subtype?.subtypeName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canAssignTeam && (
            <Button size="sm" onClick={() => setTeamDialogOpen(true)}>
              <Users2 className="h-3.5 w-3.5 mr-1.5" />
              Assign Team
            </Button>
          )}
          {canDeleteIncident && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Delete Incident
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this incident? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteIncident}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Col: Details (Compact) */}
        <div className="md:col-span-1 space-y-4">
          <Card className="h-full">
            <CardHeader className="py-3 px-4 bg-gray-50/50">
              <CardTitle className="text-sm font-semibold text-gray-700">Detailed Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500 text-xs block">Date</span>
                  <span className="font-medium">{new Date(incident.incidentDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Reported By</span>
                  <span className="font-medium truncate">{incident.creator?.name || 'Unknown'}</span>
                </div>
              </div>
              {/* <div>
                <span className="text-gray-500 text-xs block">Location</span>
                <span className="font-medium">
                  {incident.plant?.plantName}
                  {incident.building ? ` > ${incident.building.buildingName}` : ''}
                  {incident.floor ? ` > ${incident.floor.floorName}` : ''}
                </span>
              </div> */}
              <div>
                <span className="text-gray-500 text-xs block mb-1">Description</span>
                <p className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-2 rounded border">{incident.description}</p>
              </div>
              {incident.impact && (
                <div>
                  <span className="text-gray-500 text-xs block mb-1">Impact</span>
                  <p className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-2 rounded border">{incident.impact}</p>
                </div>
              )}
              {incident.teamLeader && (
                <div className="pt-2 border-t mt-2">
                  <span className="text-gray-500 text-xs block">Team Leader</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="font-normal">{incident.teamLeader.name}</Badge>
                  </div>
                </div>
              )}
              {incident.assignments && incident.assignments.length > 0 && (
                <div>
                  <span className="text-gray-500 text-xs block mb-1">Team Members</span>
                  <div className="flex flex-wrap gap-1">
                    {incident.assignments.filter(a => a.isActive && a.userId !== incident.teamLeaderId).map(a => (
                      <Badge key={a.id} variant="secondary" className="text-xs font-normal">
                        {a.assignedUser?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Tabs (Workflow & Timeline) */}
        <div className="md:col-span-2">
          <Card className="h-full border-0 shadow-none bg-transparent">
            <Tabs defaultValue="capa" className="w-full h-full flex flex-col">
              <div className="bg-white p-1 rounded-lg border mb-3 w-fit">
                <TabsList className="h-8">
                  <TabsTrigger value="capa" className="text-xs px-4">CAPA Workflow</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs px-4">Activity Timeline</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="capa" className="flex-1 mt-0">
                <div className="bg-white rounded-lg border shadow-sm p-4 min-h-[500px]">
                  <CapaWorkflowTab
                    incident={incident}
                    onUpdate={fetchIncident}
                    currentUser={{
                      id: user?.id,
                      email: user?.email,
                      name: user?.name
                    }}
                    isTeamMember={
                      incident.assignments?.some(a => a.userId === user?.id && a.isActive) || false
                    }
                    isTeamCreator={incident.teamCreatorId === user?.id}
                  />
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="flex-1 mt-0">
                <div className="bg-white rounded-lg border shadow-sm p-4 min-h-[500px]">
                  <TimelineTab incidentId={incident.id} />
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Team Assignment Dialog */}
      <TeamAssignmentDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        incidentId={incident.id}
        plantId={incident.plantId}
        onSuccess={fetchIncident}
      />
    </div>
  );
};

export default IncidentView;
