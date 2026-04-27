import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { trainingApi } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';

interface Plant {
  id: string;
  plantName: string;
}

interface Building {
  id: string;
  buildingName: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const TrainingCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    trainingName: '',
    trainingType: '',
    scheduledDate: '',
    scheduledTime: '',
    venue: '',
    plantId: '',
    buildingId: '',
    trainerUserId: '',
    trainerName: '',
    sourceType: 'Scheduled' as 'Scheduled' | 'Incident' | 'Audit',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.plantId) {
      fetchBuildings(formData.plantId);
    } else {
      setBuildings([]);
    }
  }, [formData.plantId]);

  const fetchInitialData = async () => {
    try {
      const [plantsRes, usersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001'}/plant`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }),
        axios.get(`${import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001'}/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        })
      ]);
      
      // Ensure IDs are strings for Select components
      // Backend returns { success, plants } for plants and { success, data } for users
      const plants = (plantsRes.data.plants || []).map((plant: any) => ({
        ...plant,
        id: String(plant.id)
      }));
      const users = (usersRes.data.data || []).map((user: any) => ({
        ...user,
        id: String(user.id)
      }));
      
      setPlants(plants);
      setUsers(users);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load form data",
        variant: "destructive"
      });
    }
  };

  const fetchBuildings = async (plantId: string) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001'}/building`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        params: { plantId }
      });
      
      // Ensure IDs are strings for Select components
      const buildings = (response.data.data || []).map((building: any) => ({
        ...building,
        id: String(building.id)
      }));
      
      setBuildings(buildings);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      setBuildings([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.trainingName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a training name",
        variant: "destructive"
      });
      return;
    }

    if (!formData.trainingType.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a training type",
        variant: "destructive"
      });
      return;
    }

    if (!formData.scheduledDate) {
      toast({
        title: "Validation Error",
        description: "Please select a scheduled date",
        variant: "destructive"
      });
      return;
    }

    if (!formData.plantId) {
      toast({
        title: "Validation Error",
        description: "Please select a plant",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        buildingId: formData.buildingId || undefined,
        trainerUserId: formData.trainerUserId || undefined,
        trainerName: formData.trainerName || undefined,
        scheduledTime: formData.scheduledTime || undefined,
        venue: formData.venue || undefined,
        teamMembers: selectedTeamMembers.length > 0 ? selectedTeamMembers : undefined,
      };

      const response = await trainingApi.create(payload);

      toast({
        title: "Success",
        description: `Training ${response.data.trainingNumber} scheduled successfully`,
      });

      navigate(`/admin/sams/trainings/${response.data.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to schedule training",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const updates: Partial<typeof formData> = { [field]: value };

      // Clear dependent fields when parent changes
      if (field === 'plantId') {
        updates.buildingId = '';
      }

      return { ...prev, ...updates };
    });
  };

  const handleTeamMemberToggle = (userId: string) => {
    setSelectedTeamMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/sams/trainings')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule New Training</h1>
          <p className="text-gray-600">Create a new safety training session</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-orange-600" />
              Training Details
            </CardTitle>
            <CardDescription>
              Provide information about the planned training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Training Name and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trainingName">
                  Training Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="trainingName"
                  value={formData.trainingName}
                  onChange={(e) => handleChange('trainingName', e.target.value)}
                  placeholder="e.g., Fire Safety Training"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainingType">
                  Training Type <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="trainingType"
                  value={formData.trainingType}
                  onChange={(e) => handleChange('trainingType', e.target.value)}
                  placeholder="e.g., Safety, Compliance, Technical"
                  required
                />
              </div>
            </div>

            {/* Scheduled Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">
                  Scheduled Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleChange('scheduledDate', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Scheduled Time</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => handleChange('scheduledTime', e.target.value)}
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plantId">
                  Plant <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.plantId || undefined}
                  onValueChange={(value) => handleChange('plantId', value)}
                >
                  <SelectTrigger id="plantId">
                    <SelectValue placeholder="Select plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.length === 0 ? (
                      <div className="px-2 py-1 text-sm text-gray-500">No plants available</div>
                    ) : (
                      plants.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.plantName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buildingId">Building</Label>
                <Select
                  value={formData.buildingId || undefined}
                  onValueChange={(value) => handleChange('buildingId', value)}
                  disabled={!formData.plantId || buildings.length === 0}
                >
                  <SelectTrigger id="buildingId">
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.length === 0 ? (
                      <div className="px-2 py-1 text-sm text-gray-500">
                        {formData.plantId ? 'No buildings available' : 'Select a plant first'}
                      </div>
                    ) : (
                      buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.buildingName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => handleChange('venue', e.target.value)}
                  placeholder="e.g., Conference Room A"
                />
              </div>
            </div>

            {/* Trainer */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trainerUserId">Internal Trainer</Label>
                <Select
                  value={formData.trainerUserId || "none"}
                  onValueChange={(value) => handleChange('trainerUserId', value === "none" ? '' : value)}
                >
                  <SelectTrigger id="trainerUserId">
                    <SelectValue placeholder="Select internal trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {users.length === 0 ? (
                      <div className="px-2 py-1 text-sm text-gray-500">No users available</div>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainerName">External Trainer Name</Label>
                <Input
                  id="trainerName"
                  value={formData.trainerName}
                  onChange={(e) => handleChange('trainerName', e.target.value)}
                  placeholder="Name of external trainer (if any)"
                />
              </div>
            </div>

            {/* Source Type */}
            <div className="space-y-2">
              <Label htmlFor="sourceType">Source Type</Label>
              <Select
                value={formData.sourceType}
                onValueChange={(value) => handleChange('sourceType', value)}
              >
                <SelectTrigger id="sourceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Incident">From Incident</SelectItem>
                  <SelectItem value="Audit">From Audit</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                {formData.sourceType === 'Scheduled' && 'Regular scheduled training'}
                {formData.sourceType === 'Incident' && 'Training required due to an incident'}
                {formData.sourceType === 'Audit' && 'Training required from audit findings'}
              </p>
            </div>

            {/* Team Members */}
            <div className="space-y-2">
              <Label>Participants</Label>
              <Card className="p-4 max-h-60 overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No users available</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeamMembers.includes(user.id)}
                          onChange={() => handleTeamMemberToggle(user.id)}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </Card>
              <p className="text-sm text-gray-500">
                {selectedTeamMembers.length} participant{selectedTeamMembers.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/sams/trainings')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Scheduling...' : 'Schedule Training'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TrainingCreate;
