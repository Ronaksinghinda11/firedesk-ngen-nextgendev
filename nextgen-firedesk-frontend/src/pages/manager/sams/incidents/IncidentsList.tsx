import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Plus, Search, Filter, ShieldAlert, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { managerApi, incidentSubtypeApi, Incident } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import { EntityAccessGuard } from '@/components/PermissionGuard';
import { Entity, Action } from '@/types/permissions';
import { usePermissions } from '@/hooks/usePermissions';

const IncidentsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedPlantId } = usePlantFilter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [subtypeFilter, setSubtypeFilter] = useState<string>('');
  const [subtypes, setSubtypes] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string>('incidentNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // RBAC: Check permissions for incidents
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(Entity.INCIDENTS, Action.CREATE);

  // Fetch incidents when filters change
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setLoading(true);
        const params = {
          severity: severityFilter || undefined,
          status: statusFilter || undefined,
          incidentSubtypeId: subtypeFilter || undefined,
          plantId: (selectedPlantId && selectedPlantId !== 'all') ? selectedPlantId : undefined
        };

        const response = await managerApi.getAll(params);

        setIncidents(response.data || []);
      } catch (error: any) {
        console.error('[Manager IncidentsList] Error fetching incidents:', error);
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to fetch incidents",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, [severityFilter, statusFilter, subtypeFilter, selectedPlantId, toast]);

  useEffect(() => {
    incidentSubtypeApi.getAll({ isActive: true })
      .then(res => setSubtypes(res.data || []))
      .catch(err => console.error("Failed to load incident subtypes:", err));
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'destructive';
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Closed': return 'secondary';
      case 'In CAPA': return 'default';
      case 'Pending Approval': return 'default';
      case 'Rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (searchQuery === '') return true;
    const search = searchQuery.toLowerCase();
    return (
      incident.incidentNumber?.toLowerCase().includes(search) ||
      incident.description?.toLowerCase().includes(search) ||
      incident.subtype?.subtypeName?.toLowerCase().includes(search) ||
      incident.plant?.plantName?.toLowerCase().includes(search) ||
      incident.severity?.toLowerCase().includes(search) ||
      incident.status?.toLowerCase().includes(search)
    );
  });

  // Sorting logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortValue = (incident: Incident, field: string): string => {
    switch (field) {
      case 'incidentNumber': return incident.incidentNumber || '';
      case 'subtype': return incident.subtype?.subtypeName || '';
      case 'severity': return incident.severity || '';
      case 'status': return incident.status || '';
      case 'plant': return incident.plant?.plantName || '';
      case 'incidentDate': return incident.incidentDate || '';
      default: return '';
    }
  };

  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    const valA = getSortValue(a, sortField).toLowerCase();
    const valB = getSortValue(b, sortField).toLowerCase();
    const comparison = valA.localeCompare(valB);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <EntityAccessGuard
      entity={Entity.INCIDENTS}
      fallback={
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-semibold text-foreground">Access Denied</h2>
            <p className="text-muted-foreground max-w-md">
              You don't have permission to view incidents. Please contact your administrator.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              Incidents
            </h1>
            <p className="text-gray-600 mt-1">Manage and track safety incidents</p>
          </div>
          {/* RBAC: Only show Create button if user has CREATE permission */}
          {canCreate && (
            <Button
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              onClick={() => navigate('/manager/sams/incidents/create')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Report Incident
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={subtypeFilter} onValueChange={setSubtypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by subtype" />
                  </SelectTrigger>
                  <SelectContent>
                    {subtypes.map(st => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {st.subtypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {subtypeFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSubtypeFilter('')}
                    className="h-9 shrink-0"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                {severityFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSeverityFilter('')}
                    className="h-9 shrink-0"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="In CAPA">In CAPA</SelectItem>
                    <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                {statusFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatusFilter('')}
                    className="h-9 shrink-0"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incidents Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('incidentNumber')}>
                    <div className="flex items-center">Incident # <SortIcon field="incidentNumber" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('subtype')}>
                    <div className="flex items-center">Subtype <SortIcon field="subtype" /></div>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('severity')}>
                    <div className="flex items-center">Severity <SortIcon field="severity" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('status')}>
                    <div className="flex items-center">Status <SortIcon field="status" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('plant')}>
                    <div className="flex items-center">Plant <SortIcon field="plant" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('incidentDate')}>
                    <div className="flex items-center">Date <SortIcon field="incidentDate" /></div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                      {searchQuery || severityFilter || statusFilter
                        ? 'No incidents match your filters'
                        : 'No incidents reported yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedIncidents.map((incident) => (
                    <TableRow
                      key={incident.id}
                      className="hover:bg-orange-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/manager/sams/incidents/${incident.id}`)}
                    >
                      <TableCell className="font-semibold">{incident.incidentNumber}</TableCell>
                      <TableCell>{incident.subtype?.subtypeName || 'N/A'}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate">{incident.description}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(incident.status)}>
                          {incident.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{incident.plant?.plantName || 'N/A'}</TableCell>
                      <TableCell>{new Date(incident.incidentDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/manager/sams/incidents/${incident.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Showing {filteredIncidents.length} of {incidents.length} incidents
          </p>
          {(searchQuery || severityFilter || statusFilter || subtypeFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSeverityFilter('');
                setStatusFilter('');
                setSubtypeFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </EntityAccessGuard>
  );
};

export default IncidentsList;
