// PlantEdit.tsx - Fixed to match actual API field names
import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlantInfoStep } from "@/components/plant-creation-form/PlantInfoStep";
import { PremisesStep } from "@/components/plant-creation-form/PremisesStep";
import { FireSafetyStep } from "@/components/plant-creation-form/FireSafetyStep";
import { ComplianceStep } from "@/components/plant-creation-form/ComplianceStep";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { organizationService } from "@/services/organization.service";

const sanitizeFormData = (data: any) => {
  const sanitized = { ...data };
  ['organizationId', 'amcVendorId'].forEach(f => { if (sanitized[f] === '' || sanitized[f] === 'none') sanitized[f] = null; });
  ['zipCode', 'address', 'address2', 'gstNo', 'fireNocNumber', 'insurancePolicyNumber', 'insurerName'].forEach(f => { if (sanitized[f] == null) sanitized[f] = ''; });
  ['mainBuildings', 'subBuildings', 'totalPlantArea', 'totalBuildUpArea', 'dgQuantity', 'primeOverTankCapacity', 'terraceTankCapacity', 'diesel1TankCapacity', 'diesel2TankCapacity', 'headerPressureBar', 'numFireExtinguishers', 'numHydrantPoints', 'numSprinklers', 'numSafeAssemblyAreas', 'complianceNumExtinguishers', 'complianceNumHydrants', 'complianceNumSprinklers', 'complianceNumSafeAreas'].forEach(f => {
    if (sanitized[f] === '' || sanitized[f] === null) sanitized[f] = 0;
    else if (typeof sanitized[f] === 'string') { const n = Number(sanitized[f]); sanitized[f] = isNaN(n) ? 0 : Math.max(0, n); }
    else if (typeof sanitized[f] === 'number') { sanitized[f] = Math.max(0, sanitized[f]); }
  });
  return sanitized;
};

export default function PlantEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { toast } = useToast();

  const isManager = location.pathname.startsWith('/manager');
  const plantsListPath = isManager ? '/manager/plants' : '/admin/plants';

  const [formData, setFormData] = useState<any>({});
  const [masterData, setMasterData] = useState({ industries: [], managers: [], categories: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [organization, setOrganization] = useState(null);

  const getProgress = () => {
    let filledSections = 0;
    if (formData.plantName && formData.address && formData.industryId) filledSections++;
    if (formData.mainBuildings || formData.buildings?.length > 0 || formData.totalPlantArea) filledSections++;
    if (formData.numFireExtinguishers || formData.primeOverTankCapacity || formData.dieselEngine) filledSections++;
    if (formData.fireNocNumber || formData.complianceNumExtinguishers || formData.insurancePolicyNumber) filledSections++;
    return { filled: filledSections, total: 4, percent: Math.round((filledSections / 4) * 100) };
  };

  const progress = getProgress();

  const handleApiResponse = (r: any) => {
    if (typeof r === 'object' && r !== null) return r;
    if (typeof r === 'string') { try { return JSON.parse(r); } catch { throw new Error('Invalid JSON'); } }
    return r?.data || r;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [industriesRes, managersRes, categoriesRes] = await Promise.all([
          api.get('/master-data/industries').then(handleApiResponse).catch(() => ({ industries: [] })),
          api.get('/managers').then(handleApiResponse).catch(() => ({ managers: [] })),
          api.get('/master-data/categories').then(handleApiResponse).catch(() => ({ categories: [] })),
        ]);
        setMasterData({
          industries: industriesRes?.industries || industriesRes?.allIndustry || industriesRes?.data || [],
          managers: managersRes?.managers || managersRes?.allManager || managersRes?.data || [],
          categories: categoriesRes?.categories || categoriesRes?.allCategory || categoriesRes?.data || [],
        });

        const plantRes = await api.get(`/plants/${id}`);
        const plantData = handleApiResponse(plantRes);
        if (!plantData?.success) throw new Error(plantData?.message || "Failed to fetch");

        const plant = plantData.plant || plantData;

        setFormData({
          plantName: plant.plantName || '',
          address: plant.address || '',
          address2: plant.address2 || '',
          city: typeof plant.city === 'object' ? plant.city?.cityName : plant.city || '',
          state: typeof plant.state === 'object' ? plant.state?.stateName : plant.state || '',
          country: plant.country || 'India',
          zipCode: plant.zipCode || '',
          gstNo: plant.gstNo || '',
          // industryId will be handled in the later block to ensure it covers both flat keys and nested objects
          industryId: plant.industry?.id ? String(plant.industry.id) : (plant.industryId ? String(plant.industryId) : ''),
          status: plant.status || 'Active',
          organizationId: plant.organizationId || '',
          mainBuildings: plant.mainBuildings || plant.numMainBuildings || 0,
          subBuildings: plant.subBuildings || plant.numSubBuildings || 0,
          totalPlantArea: plant.totalPlantArea || '',
          totalBuildUpArea: plant.totalBuildUpArea || plant.totalBuiltUpArea || '',

          // Buildings with CORRECT field mapping from API
          buildings: (plant.buildings || []).map((b: any) => {
            // Get staircase data from nested array OR building-level fields
            const staircase = b.staircases?.[0];
            const lift = b.lifts?.[0];

            return {
              id: b.id,
              buildingName: b.buildingName || '',
              buildingHeight: b.buildingHeight || '',
              numFloors: b.numFloors || 0,

              // Staircase - use building-level OR nested staircase fields
              staircaseAvailable: b.staircaseAvailable || (staircase?.available ? 'yes' : 'no'),
              staircaseQuantity: b.staircaseQuantity || staircase?.quantity || '',
              staircaseType: b.staircaseType || staircase?.type || '',
              staircaseWidth: staircase?.widthMeters || b.staircaseWidth || '',
              // API returns fireRatingMinutes, not fireRating
              staircaseFireRating: (b.staircaseFireRating || staircase?.fireRatingMinutes || '')?.toString(),
              // API returns hasPressurization (boolean) or staircasePressurization (string)
              staircasePressurization: b.staircasePressurization || (staircase?.hasPressurization ? 'yes' : 'no'),
              staircaseEmergencyLighting: b.staircaseEmergencyLighting || (staircase?.hasEmergencyLighting ? 'yes' : 'no'),

              // Lift - use building-level OR nested lift fields
              liftAvailable: b.liftAvailable || (lift?.available ? 'yes' : 'no'),
              liftQuantity: b.liftQuantity || lift?.quantity || '',

              // Floors with wings - wings are objects with wingName
              floors: (b.floors || []).map((f: any) => ({
                id: f.id,
                floorName: f.floorName || '',
                floorUsage: f.floorUsage || f.usage || '',
                floorArea: f.floorArea || '',
                // Wings can be: array of strings, array of objects with wingName, or single wing string
                wings: f.wings?.map((w: any) => typeof w === 'string' ? w : (w.wingName || w.wing || '')) || (f.wing ? [f.wing] : [])
              }))
            };
          }),

          // Entrances
          entrances: (plant.entrances || []).map((e: any) => ({
            id: e.id,
            entranceName: e.entranceName || '',
            entranceWidth: e.entranceWidth || e.width || ''
          })),

          // Diesel Generators
          dgAvailable: plant.dieselGenerators?.length > 0 ? 'yes' : 'no',
          dgQuantity: plant.dieselGenerators?.[0]?.quantity || 0,

          // Fire Safety Form
          ...(plant.fireSafetyForms?.[0] && {
            primeOverTankCapacity: plant.fireSafetyForms[0].primeOverTankCapacity || '',
            terraceTankCapacity: plant.fireSafetyForms[0].terraceTankCapacity || '',
            diesel1TankCapacity: plant.fireSafetyForms[0].dieselTank1Capacity || plant.fireSafetyForms[0].diesel1TankCapacity || '',
            diesel2TankCapacity: plant.fireSafetyForms[0].dieselTank2Capacity || plant.fireSafetyForms[0].diesel2TankCapacity || '',
            headerPressureBar: plant.fireSafetyForms[0].headerPressureBar || '',
            systemCommissionDate: plant.fireSafetyForms[0].systemCommissionDate?.split('T')[0] || '',
            amcVendorId: plant.fireSafetyForms[0].amcVendorId || '',
            amcStartDate: plant.fireSafetyForms[0].amcStartDate?.split('T')[0] || '',
            amcEndDate: plant.fireSafetyForms[0].amcEndDate?.split('T')[0] || '',
            numFireExtinguishers: plant.fireSafetyForms[0].numFireExtinguishers || 0,
            numHydrantPoints: plant.fireSafetyForms[0].numHydrantPoints || 0,
            numSprinklers: plant.fireSafetyForms[0].numSprinklers || 0,
            numSafeAssemblyAreas: plant.fireSafetyForms[0].numSafeAssemblyAreas || 0,
            dieselEngine: plant.fireSafetyForms[0].dieselEngine || '',
            electricalPump: plant.fireSafetyForms[0].electricalPump || '',
            jockeyPump: plant.fireSafetyForms[0].jockeyPump || '',
            fireSafetyDocuments: (plant.fireSafetyForms[0].documentsData || plant.fireSafetyForms[0].documents || plant.fireSafetyForms[0].fireSafetyDocuments || []).map((d: any) => ({
              ...d,
              name: d.name || d.fileName || 'Document', // Normalize name
              data: d.data || d.url || (d.storagePath ? `/${d.storagePath}` : null) // Normalize viewable path/data
            })),
          }),

          // Compliance Form
          ...(plant.complianceForms?.[0] && {
            fireNocNumber: plant.complianceForms[0].fireNocNumber || '',
            fireNocValidityDate: plant.complianceForms[0].nocValidityDate?.split('T')[0] || plant.complianceForms[0].fireNocValidityDate?.split('T')[0] || '',
            insurancePolicyNumber: plant.complianceForms[0].insurancePolicyNumber || '',
            insurerName: plant.complianceForms[0].insurerName || '',
            insuranceValidityDate: plant.complianceForms[0].insuranceValidityDate?.split('T')[0] || '',
            complianceNumExtinguishers: plant.complianceForms[0].numFireExtinguishers || 0,
            complianceNumHydrants: plant.complianceForms[0].numHydrantPoints || 0,
            complianceNumSprinklers: plant.complianceForms[0].numSprinklers || 0,
            complianceNumSafeAreas: plant.complianceForms[0].numSafeAssemblyAreas || 0,
            complianceDocuments: (plant.complianceForms[0].documentsData || plant.complianceForms[0].documents || plant.complianceForms[0].complianceDocuments || []).map((d: any) => ({
              ...d,
              name: d.name || d.fileName || 'Document', // Normalize name
              data: d.data || d.url || (d.storagePath ? `/${d.storagePath}` : null) // Normalize viewable path/data
            })),
          }),

          managerIds: (plant.managers || []).map((m: any) => String(m.id || m)),
          categoryIds: (plant.categories || []).map((c: any) => String(c.id || c))
        });

        const orgRes = await organizationService.getOrganization().catch(() => null) as any;
        if (orgRes?.success && orgRes?.data) setOrganization(orgRes.data);
      } catch (error: any) {
        toast({ title: "Error", description: error?.message || "Failed to load", variant: "destructive" });
        navigate(plantsListPath);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, toast, navigate, plantsListPath]);

  // Validate form and return first error with field info
  const validateForm = (): { field: string; message: string; elementId: string } | null => {
    const requiredFields = [
      { field: 'plantName', message: 'Plant Name is required', elementId: 'field-plantName' },
      { field: 'address', message: 'Address is required', elementId: 'field-address' },
      { field: 'country', message: 'Country is required', elementId: 'field-country' },
      { field: 'state', message: 'State is required', elementId: 'field-state' },
      { field: 'city', message: 'City is required', elementId: 'field-city' },
    ];

    for (const { field, message, elementId } of requiredFields) {
      if (!formData[field] || String(formData[field]).trim() === '') {
        return { field, message, elementId };
      }
    }

    // Built Up Area cannot exceed Total Plant Area
    const builtUp = Number(formData.totalBuildUpArea) || 0;
    const totalArea = Number(formData.totalPlantArea) || 0;
    if (builtUp > 0 && totalArea > 0 && builtUp > totalArea) {
      return { field: 'totalBuildUpArea', message: 'Built Up Area cannot be greater than Total Plant Area', elementId: 'field-totalBuildUpArea' };
    }

    return null;
  };

  // Scroll to field with error
  const scrollToField = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
  };

  const handleSubmit = async () => {
    // Validate form first
    const error = validateForm();
    if (error) {
      toast({ title: "Validation Error", description: error.message, variant: "destructive" });
      scrollToField(error.elementId);
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        ...sanitizeFormData(formData),
        status: 'Active',
        fireSafetyDocuments: formData.fireSafetyDocuments?.map((d: any) => ({
          name: d.name,
          data: d.data, // Ensure base64 data is passed
          type: d.type
        })) || [],
        complianceDocuments: formData.complianceDocuments?.map((d: any) => ({
          name: d.name,
          data: d.data, // Ensure base64 data is passed
          type: d.type
        })) || []
      };
      const response = await api.put(`/plants/${id}`, updateData) as any;
      if (response.success) {
        toast({ title: "Success", description: "Plant updated successfully!" });
        navigate(plantsListPath);
      } else throw new Error(response.message || "Failed");
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div></div>;

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center text-xs">
            <button onClick={() => navigate(plantsListPath)} className="text-slate-500 hover:text-sky-600 transition-colors font-medium">Plants</button>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">{formData.plantName || 'Edit Plant'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Progress:</span>
          <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="text-xs font-medium w-8">{progress.percent}%</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(plantsListPath)} disabled={isSaving} className="h-7 text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSaving} className="h-7 text-xs bg-orange-500 hover:bg-orange-600">
            {isSaving ? 'Saving...' : 'Update Plant'}
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-3 space-y-4 bg-slate-50/30">
        <div className="bg-white rounded-lg border border-orange-300 shadow-md overflow-hidden transition-all hover:shadow-md">
          <div className="bg-orange-50 px-3 py-2 border-b border-orange-200">
            <h3 className="text-sm font-semibold text-gray-800">Plant Information</h3>
          </div>
          <div className="p-3">
            <PlantInfoStep formData={formData} setFormData={setFormData} masterData={masterData} organization={organization} />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Premises Details</h3>
          </div>
          <div className="p-3">
            <PremisesStep formData={formData} setFormData={setFormData} />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Fire Safety</h3>
          </div>
          <div className="p-3">
            <FireSafetyStep formData={formData} setFormData={setFormData} />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Compliance</h3>
          </div>
          <div className="p-3">
            <ComplianceStep formData={formData} setFormData={setFormData} />
          </div>
        </div>
      </div>
    </div>
  );
}