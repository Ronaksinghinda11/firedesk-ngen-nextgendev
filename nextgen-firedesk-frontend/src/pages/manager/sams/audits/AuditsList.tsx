import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, Plus, Search, Filter } from 'lucide-react';
import { managerApi, Audit } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import { usePlantFilter } from '@/contexts/PlantFilterContext';

const AuditsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedPlantId } = usePlantFilter();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAudits();
  }, [selectedPlantId]);

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedPlantId && selectedPlantId !== 'all') {
        params.plantId = selectedPlantId;
      }
      const response = await managerApi.audits.getAll(params);
      setAudits(response.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load audits",
        variant: "destructive"
      });
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

  const filteredAudits = audits.filter(audit => {
    const matchesStatus = !statusFilter || audit.status === statusFilter;
    const matchesSearch = !searchQuery ||
      audit.auditNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.auditName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.auditType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-orange-600" />
            Audits  (Page Under Development)
          </h1>
          <p className="text-gray-600 mt-1">Schedule and manage safety audits</p>
        </div>
        <Button onClick={() => navigate('/manager/sams/audits/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Audit
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search audits by number, name, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="CAPA Required">CAPA Required</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Reopened">Reopened</SelectItem>
              </SelectContent>
            </Select>
            {statusFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter('')}
                className="h-9"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Audits Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Audit #</TableHead>
              <TableHead>Audit Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Plant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>NCs</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAudits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {searchQuery || statusFilter ? 'No audits match your filters' : 'No audits scheduled yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAudits.map((audit) => (
                <TableRow key={audit.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-medium">{audit.auditNumber}</TableCell>
                  <TableCell className="max-w-xs truncate">{audit.auditName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{audit.auditType}</Badge>
                  </TableCell>
                  <TableCell>{new Date(audit.scheduledDate).toLocaleDateString()}</TableCell>
                  <TableCell>{audit.plant?.plantName || audit.plantId}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(audit.status)}>
                      {audit.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {audit.ncs && audit.ncs.length > 0 ? (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700">
                        {audit.ncs.length} NC{audit.ncs.length > 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/manager/sams/audits/${audit.id}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Audits</p>
          <p className="text-2xl font-bold text-gray-900">{audits.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">
            {audits.filter(a => a.status === 'In Progress').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">CAPA Required</p>
          <p className="text-2xl font-bold text-orange-600">
            {audits.filter(a => a.status === 'CAPA Required').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Closed</p>
          <p className="text-2xl font-bold text-green-600">
            {audits.filter(a => a.status === 'Closed').length}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AuditsList;
