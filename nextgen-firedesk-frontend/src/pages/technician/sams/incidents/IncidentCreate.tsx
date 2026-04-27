import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, ShieldAlert, MapPin, Building2, Calendar, Activity, Info, Send, X, CalendarIcon as CalIcon } from 'lucide-react';
import { userApi, lookupApi, IncidentSubtype } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import axios from 'axios';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComp } from '@/components/ui/calendar';
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
      const [subtypesRes, technicianDataRes] = await Promise.all([
        lookupApi.getIncidentSubtypes({ isActive: true }),
        api.get<any>('/technician/my-assigned-plant')
      ]);

      const subtypes = (subtypesRes.data || []).map((subtype: any) => ({
        ...subtype,
        id: String(subtype.id)
      }));

      const technicianPlants = (technicianDataRes.technician?.plants || []).map((plant: any) => ({
        ...plant,
        id: String(plant.id)
      }));

      setSubtypes(subtypes);
      setPlants(technicianPlants);
    } catch (error: any) {
      console.error('Error loading form data:', error);
      toast({
        title: "Database Sync Error",
        description: error.response?.data?.message || "Failed to load facility metadata",
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

    if (!formData.incidentSubtypeId) {
      toast({ title: "Classification Required", description: "Specify the incident category", variant: "destructive" });
      return;
    }

    if (!formData.plantId) {
      toast({ title: "Location Required", description: "Selection of target plant is mandatory", variant: "destructive" });
      return;
    }

    if (!plants.some(p => p.id === formData.plantId)) {
      toast({ title: "Authorization Denied", description: "Unauthorized plant selection", variant: "destructive" });
      return;
    }

    if (!formData.description || formData.description.length < 10) {
      toast({ title: "Narrative Too Brief", description: "Minimum 10 characters required for description", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        buildingId: formData.buildingId || undefined,
        floorId: formData.floorId || undefined,
      };

      const response = await userApi.createIncident(payload);

      toast({
        title: "Log Recorded",
        description: `Incident ${response.data.incidentNumber} has been transmitted`,
      });

      navigate(`/technician/sams/incidents`);
    } catch (error: any) {
      toast({
        title: "Transmission Failure",
        description: error.response?.data?.message || "Internal server error during submission",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const updates: Partial<typeof formData> = { [field]: value };
      if (field === 'plantId') {
        updates.buildingId = '';
        updates.floorId = '';
      } else if (field === 'buildingId') {
        updates.floorId = '';
      }
      return { ...prev, ...updates };
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header Navigation */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/technician/sams/incidents')}
          className="h-12 w-12 rounded-xl border-slate-200 hover:bg-white hover:shadow-md transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Report Safety Incident</h1>
          <p className="text-slate-500 font-medium">Capture field observations and protocol breaches</p>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-2xl overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2.5rem] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-rose-500 to-indigo-500"></div>
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="bg-rose-100 p-3 rounded-2xl">
                <ShieldAlert className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Protocol Incident Details</CardTitle>
                <CardDescription className="font-medium">Mandatory safety data collection</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-6 space-y-8">
            {/* Classification & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="incidentSubtypeId" className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex justify-between">
                  Classification <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formData.incidentSubtypeId || undefined}
                  onValueChange={(value) => handleChange('incidentSubtypeId', value)}
                >
                  <SelectTrigger id="incidentSubtypeId" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-4 focus:ring-indigo-100 transition-all font-semibold">
                    <SelectValue placeholder="Select investigation type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                    {subtypes.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-slate-500 italic">No types detected...</div>
                    ) : (
                      subtypes.map((subtype) => (
                        <SelectItem key={subtype.id} value={subtype.id} className="rounded-lg font-medium focus:bg-indigo-50">
                          {subtype.subtypeName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="incidentDate" className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex justify-between">
                  Temporal Log <span className="text-rose-500">*</span>
                </Label>
                <Popover open={isDatePickerOpen} onOpenChange={(open) => {
                  setIsDatePickerOpen(open);
                  if (open) setTempDate(formData.incidentDate ? new Date(formData.incidentDate) : undefined);
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:ring-4 focus:ring-indigo-100 transition-all",
                        !formData.incidentDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.incidentDate ? (
                        format(new Date(formData.incidentDate), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComp
                      mode="single"
                      selected={tempDate}
                      onSelect={setTempDate}
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
              </div>
            </div>

            {/* Physical Logistics */}
            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Structural Location</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 pl-1">TARGET PLANT</Label>
                  <Select
                    value={formData.plantId || undefined}
                    onValueChange={(value) => handleChange('plantId', value)}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-sm font-bold text-sm">
                      <SelectValue placeholder="Plant" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      {plants.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id} className="font-semibold">
                          {plant.plantName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 pl-1">ENCLOSURE/BUILDING</Label>
                  <Select
                    value={formData.buildingId || undefined}
                    onValueChange={(value) => handleChange('buildingId', value)}
                    disabled={!formData.plantId || buildings.length === 0}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-sm font-bold text-sm">
                      <SelectValue placeholder="Building" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id} className="font-semibold">
                          {building.buildingName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 pl-1">OPERATIONAL FLOOR</Label>
                  <Select
                    value={formData.floorId || undefined}
                    onValueChange={(value) => handleChange('floorId', value)}
                    disabled={!formData.buildingId || floors.length === 0}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-sm font-bold text-sm">
                      <SelectValue placeholder="Floor" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      {floors.map((floor) => (
                        <SelectItem key={floor.id} value={floor.id} className="font-semibold">
                          {floor.floorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Severity Vector */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Risk Criticality Rank</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Low', 'Medium', 'High', 'Critical'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleChange('severity', s)}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all flex flex-col items-center gap-1 ${formData.severity === s
                      ? (s === 'Critical' ? 'bg-rose-600 border-rose-600 text-white shadow-lg scale-105' :
                        s === 'High' ? 'bg-orange-600 border-orange-600 text-white shadow-lg scale-105' :
                          s === 'Medium' ? 'bg-amber-500 border-amber-500 text-white shadow-lg scale-105' :
                            'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105')
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-2 p-3 bg-slate-50 rounded-xl flex items-start gap-3 border border-slate-100">
                <Info className="h-4 w-4 text-slate-400 mt-0.5" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  {formData.severity === 'Critical' && 'IMMEDIATE INTERVENTION REQUIRED - EXTREME SYSTEMIC RISK'}
                  {formData.severity === 'High' && 'HIGH PRIORITY RESPONSE - SIGNIFICANT HAZARD DETECTED'}
                  {formData.severity === 'Medium' && 'ROUTINE INVESTIGATION NECESSARY - MODERATE THREAT LEVEL'}
                  {formData.severity === 'Low' && 'MINOR VARIANCE LOGGED - LOW LEVEL SAFETY INTERRUPT'}
                </p>
              </div>
            </div>

            {/* Narrative Blocks */}
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Detailed Narrative</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Chronological account of events, involved personnel, and environmental factors..."
                  rows={6}
                  required
                  className="resize-none rounded-2xl border-slate-200 bg-slate-50/50 p-6 text-base focus:ring-4 focus:ring-indigo-100 transition-all font-medium leadng-relaxed"
                />
                <div className="flex justify-between items-center px-1">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${formData.description.length < 10 ? 'text-rose-400' : 'text-slate-400'}`}>
                    Character count: {formData.description.length}
                  </span>
                  {formData.description.length < 10 && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Min 10 Required</span>}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="impact" className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Functional Impact Analysis <span className="text-muted-foreground text-[10px] normal-case">(Optional)</span></Label>
                <Textarea
                  id="impact"
                  value={formData.impact}
                  onChange={(e) => handleChange('impact', e.target.value)}
                  placeholder="Describe operational disruptions, property damage, or resource depletion (Optional)..."
                  rows={4}
                  className="resize-none rounded-2xl border-slate-200 bg-slate-50/50 p-6 text-base focus:ring-4 focus:ring-indigo-100 transition-all font-medium leading-relaxed"
                />
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Character count: {formData.impact.length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-8 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/technician/sams/incidents')}
              disabled={loading}
              className="w-full sm:w-auto h-14 rounded-2xl font-bold text-slate-500 hover:bg-white transition-all order-2 sm:order-1"
            >
              <X className="h-5 w-5 mr-3" />
              Discard Draft
            </Button>
            <div className="flex-1 order-1 sm:order-2"></div>
            <Button
              type="submit"
              disabled={loading || formData.description.length < 10}
              className="w-full sm:w-auto h-14 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 px-10 order-0 sm:order-3"
            >
              {loading ? (
                <>
                  <Activity className="h-5 w-5 mr-3 animate-spin" />
                  PROCESSING LOG...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-3" />
                  COMMIT TO REGISTRY
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Compliance Footer */}
      <div className="mt-8 text-center px-8">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
          By submitting this log, you verify that all provided data is accurate according to onsite observations and facility safety protocols.
        </p>
      </div>
    </div>
  );
};

export default IncidentCreate;
