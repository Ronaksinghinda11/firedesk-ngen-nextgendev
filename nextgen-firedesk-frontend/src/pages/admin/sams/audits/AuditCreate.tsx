import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { auditApi } from '@/services/api/samsApi';
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

const AuditCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    auditName: '',
    auditType: '',
    purpose: '',
    scheduledDate: '',
    plantId: '',
    buildingId: '',
    auditorUserId: '',
    auditeeUserId: '',
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
    if (!formData.auditName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an audit name",
        variant: "destructive"
      });
      return;
    }

    if (!formData.auditType.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an audit type",
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

    if (!formData.auditorUserId) {
      toast({
        title: "Validation Error",
        description: "Please select an auditor",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        buildingId: formData.buildingId || undefined,
        auditeeUserId: formData.auditeeUserId || undefined,
        purpose: formData.purpose || undefined,
      };

      const response = await auditApi.create(payload);

      toast({
        title: "Success",
        description: `Audit ${response.data.auditNumber} scheduled successfully`,
      });

      navigate(`/admin/sams/audits/${response.data.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to schedule audit",
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/sams/audits')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule New Audit</h1>
          <p className="text-gray-600">Create a new safety audit schedule</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-orange-600" />
              Audit Details
            </CardTitle>
            <CardDescription>
              Provide information about the planned audit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Audit Name and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auditName">
                  Audit Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="auditName"
                  value={formData.auditName}
                  onChange={(e) => handleChange('auditName', e.target.value)}
                  placeholder="e.g., Q4 Fire Safety Audit"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditType">
                  Audit Type <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="auditType"
                  value={formData.auditType}
                  onChange={(e) => handleChange('auditType', e.target.value)}
                  placeholder="e.g., Fire Safety, Compliance, Internal"
                  required
                />
              </div>
            </div>

            {/* Scheduled Date */}
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

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Auditor and Auditee */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auditorUserId">
                  Auditor <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.auditorUserId || undefined}
                  onValueChange={(value) => handleChange('auditorUserId', value)}
                >
                  <SelectTrigger id="auditorUserId">
                    <SelectValue placeholder="Select auditor" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="auditeeUserId">Auditee</Label>
                <Select
                  value={formData.auditeeUserId || "none"}
                  onValueChange={(value) => handleChange('auditeeUserId', value === "none" ? '' : value)}
                >
                  <SelectTrigger id="auditeeUserId">
                    <SelectValue placeholder="Select auditee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) => handleChange('purpose', e.target.value)}
                placeholder="Describe the purpose and objectives of this audit..."
                rows={4}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/sams/audits')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Scheduling...' : 'Schedule Audit'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AuditCreate;
