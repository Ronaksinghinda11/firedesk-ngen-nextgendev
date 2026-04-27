// PlantCreate.tsx - Ultra-compact layout
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlantInfoStep } from "@/components/plant-creation-form/PlantInfoStep";
import { PremisesStep } from "@/components/plant-creation-form/PremisesStep";
import { FireSafetyStep } from "@/components/plant-creation-form/FireSafetyStep";
import { ComplianceStep } from "@/components/plant-creation-form/ComplianceStep";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { organizationService } from "@/services/organization.service";

export default function PlantCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();

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
        const [industriesRes, managersRes, categoriesRes] = await Promise.all([
          api.get('/master-data/industries/active').then(handleApiResponse).catch(() => ({ industries: [] })),
          api.get('/managers').then(handleApiResponse).catch(() => ({ managers: [] })),
          api.get('/master-data/categories/active').then(handleApiResponse).catch(() => ({ categories: [] })),
        ]);
        setMasterData({
          industries: industriesRes?.industries || industriesRes?.allIndustry || [],
          managers: managersRes?.managers || managersRes?.allManager || [],
          categories: categoriesRes?.categories || categoriesRes?.allCategory || [],
        });
        const orgRes = await organizationService.getOrganization().catch(() => null) as any;
        if (orgRes?.success && orgRes?.data) setOrganization(orgRes.data);
      } catch (error: any) {
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

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
      const payload = {
        ...formData,
        status: 'Active',
        mainBuildings: Math.max(0, Number(formData.mainBuildings) || 0),
        subBuildings: Math.max(0, Number(formData.subBuildings) || 0),
        totalPlantArea: Math.max(0, Number(formData.totalPlantArea)) || null,
        totalBuildUpArea: Math.max(0, Number(formData.totalBuildUpArea)) || null,
        dgQuantity: Math.max(0, Number(formData.dgQuantity) || 0),
        primeOverTankCapacity: Number(formData.primeOverTankCapacity) || null,
        terraceTankCapacity: Number(formData.terraceTankCapacity) || null,
        diesel1TankCapacity: Number(formData.diesel1TankCapacity) || null,
        diesel2TankCapacity: Number(formData.diesel2TankCapacity) || null,
        headerPressureBar: Number(formData.headerPressureBar) || null,
        numFireExtinguishers: Number(formData.numFireExtinguishers) || 0,
        numHydrantPoints: Number(formData.numHydrantPoints) || 0,
        numSprinklers: Number(formData.numSprinklers) || 0,
        numSafeAssemblyAreas: Number(formData.numSafeAssemblyAreas) || 0,
        complianceNumExtinguishers: Number(formData.complianceNumExtinguishers) || 0,
        complianceNumHydrants: Number(formData.complianceNumHydrants) || 0,
        complianceNumSprinklers: Number(formData.complianceNumSprinklers) || 0,
        complianceNumSafeAreas: Number(formData.complianceNumSafeAreas) || 0,
        fireSafetyDocuments: formData.fireSafetyDocuments?.map((d: any) => ({
          name: d.name,
          data: d.data,
          type: d.type
        })) || [],
        complianceDocuments: formData.complianceDocuments?.map((d: any) => ({
          name: d.name,
          data: d.data,
          type: d.type
        })) || []
      };
      const response = await api.post('/plants', payload) as any;
      if (response.success) {
        toast({ title: "Success", description: "Plant created successfully!" });
        navigate('/admin/plants');
      } else throw new Error(response.message || "Failed");
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to create plant", variant: "destructive" });
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
          <div>
            <div className="flex items-center text-xs">
              <button onClick={() => navigate('/admin/plants')} className="text-slate-500 hover:text-sky-600 transition-colors font-medium">Plants</button>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-800 font-semibold">New Plant</span>
            </div>
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
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/plants')} disabled={isSaving} className="h-7 text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSaving} className="h-7 text-xs bg-orange-500 hover:bg-orange-600">
            {isSaving ? 'Creating...' : 'Create Plant'}
          </Button>
        </div>
      </div>

      {/* Scrollable Content - minimal padding */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        <div className="bg-white rounded border border-orange-300 p-0 shadow-md overflow-hidden">
          <h2 className="text-xs font-semibold bg-orange-50 px-3 py-2 border-b border-orange-200">Plant Information</h2>
          <div className="p-2">
            <PlantInfoStep formData={formData} setFormData={setFormData} masterData={masterData} organization={organization} />
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200 p-0 shadow-sm overflow-hidden">
          <h2 className="text-xs font-semibold bg-gray-50 px-3 py-2 border-b border-gray-200">Premises Details</h2>
          <div className="p-2">
            <PremisesStep formData={formData} setFormData={setFormData} />
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200 p-0 shadow-sm overflow-hidden">
          <h2 className="text-xs font-semibold bg-gray-50 px-3 py-2 border-b border-gray-200">Fire Safety</h2>
          <div className="p-2">
            <FireSafetyStep formData={formData} setFormData={setFormData} />
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200 p-0 shadow-sm overflow-hidden">
          <h2 className="text-xs font-semibold bg-gray-50 px-3 py-2 border-b border-gray-200">Compliance</h2>
          <div className="p-2">
            <ComplianceStep formData={formData} setFormData={setFormData} />
          </div>
        </div>
      </div>
    </div>
  );
}
