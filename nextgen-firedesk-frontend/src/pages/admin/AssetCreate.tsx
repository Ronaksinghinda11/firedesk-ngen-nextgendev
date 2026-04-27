import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetInfoStep } from "@/components/asset-creation-form/AssetInfoStep";
import { TechnicalSpecsStepDynamic } from "@/components/asset-creation-form/TechnicalSpecsStepDynamic";
import { ManufacturerStep } from "@/components/asset-creation-form/ManufacturerStep";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ASSET_TABS = [
  { value: "info", label: "Asset Info" },
  { value: "technical", label: "Technical Specs" },
  { value: "manufacturer", label: "Manufacturer" },
];

export default function AssetCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(ASSET_TABS[0].value);
  const [formData, setFormData] = useState({
    status: 'In-House',
  });
  const [masterData, setMasterData] = useState({
    plants: [],
    categories: [],
    products: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [plantsRes, categoriesRes, productsRes] = await Promise.all([
          api.get<any>("/plants"),
          api.get<any>("/master-data/categories"),
          api.get<any>("/master-data/products"),
        ]);
        setMasterData({
          plants: plantsRes?.plants || plantsRes?.data || [],
          categories: categoriesRes?.allCategory || categoriesRes?.activeCategories || [], // Handle potential response structure diffs
          products: productsRes?.products || productsRes?.data || [],
        });

        // Pre-fill form data from URL query params (from floorplan)
        const plantId = searchParams.get('plantId');
        const buildingId = searchParams.get('buildingId');
        const floorId = searchParams.get('floorId');
        const building = searchParams.get('building');
        const floorplanX = searchParams.get('floorplanX');
        const floorplanY = searchParams.get('floorplanY');

        if (plantId || buildingId || floorId) {
          setFormData((prev: any) => ({
            ...prev,
            ...(plantId && { plantId }),
            ...(buildingId && { buildingId }),
            ...(floorId && { floorId }),
            ...(building && { building }),
            ...(floorplanX && { floorplanX: parseFloat(floorplanX) }),
            ...(floorplanY && { floorplanY: parseFloat(floorplanY) }),
          }));

          toast({
            title: "Location Pre-filled",
            description: "Asset location has been pre-filled from floorplan",
          });
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to load form data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchMasterData();
  }, [searchParams]);

  const getCurrentTabIndex = () => {
    return ASSET_TABS.findIndex(tab => tab.value === activeTab);
  };

  const handleNext = () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex < ASSET_TABS.length - 1) {
      setActiveTab(ASSET_TABS[currentIndex + 1].value);
    }
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex > 0) {
      setActiveTab(ASSET_TABS[currentIndex - 1].value);
    }
  };

  const validateCurrentStep = () => {
    const currentIndex = getCurrentTabIndex();

    // Validate Asset Info step
    if (currentIndex === 0) {
      const requiredFields = [
        { key: 'plantId', label: 'Plant' },
        { key: 'productCategoryId', label: 'Product Category' },
        { key: 'productId', label: 'Product' },
        { key: 'manufacturingDate', label: 'Manufacturing Date' },
        { key: 'installDate', label: 'Install Date' },
        { key: 'status', label: 'Maintenance Status' }
      ];

      const missingFields = requiredFields.filter(field => !(formData as any)[field.key]);

      if (missingFields.length > 0) {
        toast({
          title: "Validation Error",
          description: `Please fill: ${missingFields.map(f => f.label).join(', ')}`,
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSaveAndContinue = () => {
    if (validateCurrentStep()) {
      handleNext();
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSaving(true);
    try {
      // Transform specs from object to array format
      const specs = (formData as any).specs || {};
      const specsArray = Object.entries(specs)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        .map(([specDefinitionId, value]) => ({
          specDefinitionId,
          value: String(value).substring(0, 255) // Truncate to match DB constraint
        }));

      // Prepare submission data matching V2 API format
      const submitData: any = {
        // Required fields
        plantId: (formData as any).plantId,
        building: (formData as any).building,
        productCategoryId: (formData as any).productCategoryId,
        productId: (formData as any).productId,
        location: (formData as any).location,
        manufacturingDate: (formData as any).manufacturingDate,
        installDate: (formData as any).installDate,
        status: (formData as any).status || 'In-House',

        // Optional fields
        tag: (formData as any).tag,

        // Manufacturer handling
        ...(((formData as any).manufacturerName || (formData as any).manufacturerId) && {
          manufacturerName: (formData as any).manufacturerName,
          manufacturerId: (formData as any).manufacturerId,
        }),

        // Location fields
        ...(((formData as any).lat || (formData as any).long) && {
          lat: (formData as any).lat,
          long: (formData as any).long,
          latLongRemark: (formData as any).latLongRemark,
        }),

        // Floorplan positioning
        ...((formData as any).floorplanX && { floorplanX: (formData as any).floorplanX }),
        ...((formData as any).floorplanY && { floorplanY: (formData as any).floorplanY }),
        ...((formData as any).buildingId && { buildingId: (formData as any).buildingId }),
        ...((formData as any).floorId && { floorId: (formData as any).floorId }),
        ...((formData as any).wingId && { wingId: (formData as any).wingId }),

        // QR Code
        ...((formData as any).qrCodeUrl && { qrCodeUrl: (formData as any).qrCodeUrl }),

        // Important Dates
        ...((formData as any).warrantyEndDate && { warrantyEndDate: (formData as any).warrantyEndDate }),
        ...((formData as any).amcStartDate && { amcStartDate: (formData as any).amcStartDate }),
        ...((formData as any).amcEndDate && { amcEndDate: (formData as any).amcEndDate }),
        ...((formData as any).lastHPTestDate && { lastHPTestDate: (formData as any).lastHPTestDate }),
        ...((formData as any).nextHPTestDueDate && { nextHPTestDueDate: (formData as any).nextHPTestDueDate }),
        ...((formData as any).lifespanYears && { lifespanYears: (formData as any).lifespanYears }),

        // Product details
        ...((formData as any).type && { type: (formData as any).type }),
        ...((formData as any).subType && { subType: (formData as any).subType }),
        ...((formData as any).capacity && { capacity: (formData as any).capacity }),
        ...((formData as any).capacityUnit && { capacityUnit: (formData as any).capacityUnit }),
        ...((formData as any).model && { model: (formData as any).model }),
        ...((formData as any).slNo && { slNo: (formData as any).slNo }),

        // Specs array
        specs: specsArray,

        // Documents (empty for now)
        documents: [],
      };

      console.log("Submitting asset data to /assets:", submitData);
      const response = await api.post("/assets", submitData);
      console.log("Asset created successfully:", response);
      toast({ title: "Success", description: "Asset created successfully!" });
      navigate("/admin/assets");
    } catch (error: any) {
      console.error("Asset creation error:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to create asset";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isFirstStep = getCurrentTabIndex() === 0;
  const isLastStep = getCurrentTabIndex() === ASSET_TABS.length - 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="flex-1 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/assets")}
            className="px-2"
          >
            <ArrowLeft className="h-5 w-5 mr-1" /> Back to Assets
          </Button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="flex border-b mb-6 bg-transparent w-full px-0"
            style={{ justifyContent: "flex-start" }} // force left alignment
          >
            {ASSET_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-sm py-3 px-5 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 rounded-none"
                style={{ marginLeft: 0 }} // override any left margin from libraries
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="info">
            <AssetInfoStep
              formData={formData}
              setFormData={setFormData}
              plants={masterData.plants}
              categories={masterData.categories}
              products={masterData.products}
            />
          </TabsContent>
          <TabsContent value="technical">
            <TechnicalSpecsStepDynamic
              formData={formData}
              setFormData={setFormData}
              categoryId={(formData as any)?.productCategoryId}
            />
          </TabsContent>
          <TabsContent value="manufacturer">
            <ManufacturerStep formData={formData} setFormData={setFormData} />
          </TabsContent>
        </Tabs>
        <div className="flex justify-between gap-3 mt-6 pt-6 border-t border-border">
          <div>
            {!isFirstStep && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isSaving}
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/assets")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            {!isLastStep ? (
              <Button
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Save & Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSaving}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isSaving ? "Submitting..." : "Submit"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
