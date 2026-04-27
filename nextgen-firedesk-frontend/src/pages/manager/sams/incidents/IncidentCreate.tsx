import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, ShieldAlert, CalendarIcon } from 'lucide-react';
import { managerApi, incidentSubtypeApi, IncidentSubtype } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { usePermissions } from '@/hooks/usePermissions';
import { Entity, Action } from '@/types/permissions';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Plant {
  id: string;
  plantName: string;
}

interface Building {
  id: string;
  buildingName: string;
}

interface Floor {
  id: string;
  floorName: string;
}

const IncidentCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subtypes, setSubtypes] = useState<IncidentSubtype[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);

  // Date Picker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);

  // RBAC: Check if user has permission to create incidents
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(Entity.INCIDENTS, Action.CREATE);

  const [formData, setFormData] = useState({
    incidentSubtypeId: '',
    incidentDate: new Date().toISOString().split('T')[0],
    plantId: '',
    buildingId: '',
    floorId: '',
    description: '',
    impact: '',
    severity: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.plantId) {
      fetchBuildings(formData.plantId);
    } else {
      setBuildings([]);
      setFloors([]);
    }
  }, [formData.plantId]);

  useEffect(() => {
    if (formData.buildingId) {
      fetchFloors(formData.buildingId);
    } else {
      setFloors([]);
    }
  }, [formData.buildingId]);

  const fetchInitialData = async () => {
    try {
      const [subtypesRes, plantsRes] = await Promise.all([
        incidentSubtypeApi.getAll({ isActive: true }),
        axios.get(`${import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001'}/plant`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        })
      ]);

      // Ensure IDs are strings for Select components
      // Backend returns { success, data } for subtypes and { success, plants } for plants
      const subtypes = (subtypesRes.data || []).map((subtype: any) => ({
        ...subtype,
        id: String(subtype.id)
      }));
      // Try both possible response structures
      const plantsArray = plantsRes.data.plants || plantsRes.data.data || [];
      const plants = plantsArray.map((plant: any) => ({
        ...plant,
        id: String(plant.id)
      }));

      setSubtypes(subtypes);
      setPlants(plants);
    } catch (error: any) {
      console.error('Error loading form data:', error);
      console.error('Error response:', error.response);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load form data",
        variant: "destructive"
      });
    }
  };

  const fetchBuildings = async (plantId: string) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001'}/buildings`, {
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

  const fetchFloors = async (buildingId: string) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001'}/floors`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        params: { buildingId }
      });

      // Ensure IDs are strings for Select components
      const floors = (response.data.data || []).map((floor: any) => ({
        ...floor,
        id: String(floor.id)
      }));

      setFloors(floors);
    } catch (error) {
      console.error('Error fetching floors:', error);
      setFloors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.incidentSubtypeId) {
      toast({
        title: "Validation Error",
        description: "Please select an incident subtype",
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

    if (!formData.description || formData.description.length < 10) {
      toast({
        title: "Validation Error",
        description: "Description must be at least 10 characters",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        buildingId: formData.buildingId || undefined,
        floorId: formData.floorId || undefined,
      };

      const response = await managerApi.incidents.create(payload);

      toast({
        title: "Success",
        description: `Incident ${response.data.incidentNumber} created successfully`,
      });

      navigate(`/manager/sams/incidents/${response.data.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create incident",
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
        updates.floorId = '';
      } else if (field === 'buildingId') {
        updates.floorId = '';
      }

      return { ...prev, ...updates };
    });
  };

  // RBAC: If user doesn't have CREATE permission, show access denied
  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to create incidents.
          </p>
          <Button onClick={() => navigate('/manager/sams/incidents')}>
            Back to Incidents List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/manager/sams/incidents')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report New Incident</h1>
          <p className="text-gray-600">Create a new safety incident report</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Incident Details
            </CardTitle>
            <CardDescription>
              Provide detailed information about the incident
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subtype and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="incidentSubtypeId">
                  Incident Subtype <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.incidentSubtypeId || undefined}
                  onValueChange={(value) => handleChange('incidentSubtypeId', value)}
                >
                  <SelectTrigger id="incidentSubtypeId">
                    <SelectValue placeholder="Select subtype" />
                  </SelectTrigger>
                  <SelectContent>
                    {subtypes.length === 0 ? (
                      <div className="px-2 py-1 text-sm text-gray-500">No subtypes available</div>
                    ) : (
                      subtypes.map((subtype) => (
                        <SelectItem key={subtype.id} value={subtype.id}>
                          {subtype.subtypeName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incidentDate">
                  Incident Date <span className="text-red-500">*</span>
                </Label>
                <Popover open={isDatePickerOpen} onOpenChange={(open) => {
                  setIsDatePickerOpen(open);
                  if (open) setTempDate(formData.incidentDate ? new Date(formData.incidentDate) : undefined);
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.incidentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.incidentDate ? (
                        format(new Date(formData.incidentDate), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tempDate}
                      onSelect={setTempDate}
                      disabled={(date) => date < new Date(new Date().toISOString().split('T')[0])}
                      initialFocus
                    />
                    <div className="flex items-center justify-end gap-2 p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTempDate(formData.incidentDate ? new Date(formData.incidentDate) : undefined);
                          setIsDatePickerOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          handleChange('incidentDate', tempDate ? format(tempDate, "yyyy-MM-dd") : "");
                          setIsDatePickerOpen(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-gray-500">
                  Cannot select past dates
                </p>
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
                <Label htmlFor="floorId">Floor</Label>
                <Select
                  value={formData.floorId || undefined}
                  onValueChange={(value) => handleChange('floorId', value)}
                  disabled={!formData.buildingId || floors.length === 0}
                >
                  <SelectTrigger id="floorId">
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    {floors.length === 0 ? (
                      <div className="px-2 py-1 text-sm text-gray-500">
                        {formData.buildingId ? 'No floors available' : 'Select a building first'}
                      </div>
                    ) : (
                      floors.map((floor) => (
                        <SelectItem key={floor.id} value={floor.id}>
                          {floor.floorName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label htmlFor="severity">
                Severity <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => handleChange('severity', value)}
              >
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                {formData.severity === 'Critical' && 'Immediate action required - poses serious risk to safety'}
                {formData.severity === 'High' && 'High priority - significant safety concern'}
                {formData.severity === 'Medium' && 'Moderate concern - requires attention'}
                {formData.severity === 'Low' && 'Minor issue - low risk to safety'}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Incident Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Provide a detailed description of the incident, including what happened, when it occurred, and any immediate actions taken..."
                rows={6}
                required
                className="resize-none"
              />
              <p className="text-sm text-gray-500">
                {formData.description.length} characters (minimum 10 required)
              </p>
            </div>

            {/* Impact Field */}
            <div className="space-y-2">
              <Label htmlFor="impact">
                Impact <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="impact"
                value={formData.impact}
                onChange={(e) => handleChange('impact', e.target.value)}
                placeholder="Describe the impact of this incident (Optional)"
                rows={4}
                className="resize-none"
              />
              <p className="text-sm text-gray-500">
                {formData.impact.length} characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/manager/sams/incidents')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Incident'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default IncidentCreate;
