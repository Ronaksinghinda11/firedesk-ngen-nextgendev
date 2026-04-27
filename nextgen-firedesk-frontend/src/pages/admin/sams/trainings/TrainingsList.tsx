import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Plus, Search, Filter } from 'lucide-react';
import { trainingApi, Training } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import { usePlantFilter } from '@/contexts/PlantFilterContext';

const TrainingsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedPlantId } = usePlantFilter();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTrainings();
  }, [selectedPlantId]);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedPlantId && selectedPlantId !== 'all') {
        params.plantId = selectedPlantId;
      }
      const response = await trainingApi.getAll(params);
      setTrainings(response.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load trainings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'Incident': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Audit': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Scheduled': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredTrainings = trainings.filter(training => {
    const matchesStatus = !statusFilter || training.status === statusFilter;
    const matchesSearch = !searchQuery ||
      training.trainingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.trainingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.trainingType.toLowerCase().includes(searchQuery.toLowerCase());
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
            <GraduationCap className="h-8 w-8 text-orange-600" />
            Trainings
          </h1>
          <p className="text-gray-600 mt-1">Schedule and manage safety trainings</p>
        </div>
        <Button onClick={() => navigate('/admin/sams/trainings')}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Training
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search trainings by number, name, or type..."
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
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
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

      {/* Trainings Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Training #</TableHead>
              <TableHead>Training Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTrainings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  {searchQuery || statusFilter ? 'No trainings match your filters' : 'No trainings scheduled yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredTrainings.map((training) => {
                const totalAttendees = training.attendances?.length || 0;
                const attended = training.attendances?.filter(a => a.attended).length || 0;

                return (
                  <TableRow key={training.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="font-medium">{training.trainingNumber}</TableCell>
                    <TableCell className="max-w-xs truncate">{training.trainingName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{training.trainingType}</Badge>
                    </TableCell>
                    <TableCell>{new Date(training.scheduledDate).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{training.venue || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getSourceTypeColor(training.sourceType)}>
                        {training.sourceType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(training.status)}>
                        {training.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {totalAttendees > 0 ? (
                        <span className="text-sm">
                          {attended}/{totalAttendees}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">No attendees</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/sams/trainings/${training.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Trainings</p>
          <p className="text-2xl font-bold text-gray-900">{trainings.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Scheduled</p>
          <p className="text-2xl font-bold text-blue-600">
            {trainings.filter(t => t.status === 'Scheduled').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">
            {trainings.filter(t => t.status === 'In Progress').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {trainings.filter(t => t.status === 'Completed').length}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default TrainingsList;
