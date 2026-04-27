import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function AssetEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(ASSET_TABS[0].value);
  const [formData, setFormData] = useState<any>(null);
  const [masterData, setMasterData] = useState({
    plants: [],
    categories: [],
    products: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load master data first, then asset data
        await fetchMasterData();
        await fetchAsset();
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  const fetchMasterData = async () => {
    try {
      const [plantsRes, categoriesRes, productsRes] = await Promise.all([
        api.get<any>("/plants"),
        api.get<any>("/master-data/categories"),
        api.get<any>("/master-data/products"),
      ]);
      const masterDataResult = {
        plants: plantsRes?.plants || [],
        categories: categoriesRes?.allCategory || [],
        products: productsRes?.products || [],
      };
      setMasterData(masterDataResult);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load form data.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const fetchAsset = async () => {
    try {
      console.log('🔵 Fetching asset with ID:', id);
      const response = await api.get(`/assets/${id}`);
      console.log('🔍 FULL API RESPONSE:', JSON.stringify(response, null, 2));

      if (response.success && (response.asset || response.data)) {
        const asset = response.asset || response.data;

        // Helper function to format dates for input[type="date"]
        const formatDateForInput = (dateString: string | null | undefined) => {
          if (!dateString) return "";
          try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
          } catch {
            return "";
          }
        };

        // Transform the nested data structure into flat form fields
        const transformedData: any = {
          // Core ID fields - MUST be set explicitly
          id: asset.id,
          assetId: asset.assetId || "",
          plantId: asset.plantId || asset.plant?.id || "",
          productCategoryId: asset.productCategoryId || asset.category?.id || "",
          productId: asset.productId || asset.product?.id || "",

          // Location/Hierarchy IDs - check both direct ID and nested object
          buildingId: asset.buildingId || asset.buildingRef?.id || "",
          floorId: asset.floorId || asset.floorRef?.id || "",
          wingId: asset.wingId || asset.wingRef?.id || "",
          building: asset.building || asset.buildingRef?.buildingName || "",
          location: asset.location || "",

          // Flatten manufacturer data
          manufacturerName: asset.manufacturer?.name || asset.manufacturerName || "",
          manufacturerId: asset.manufacturer?.id || asset.manufacturerId || "",

          // Format dates for date inputs
          manufacturingDate: formatDateForInput(asset.manufacturingDate),
          installDate: formatDateForInput(asset.installDate),
          warrantyEndDate: formatDateForInput(asset.warrantyEndDate),
          // Use scheduler dates if available, otherwise use asset dates
          amcStartDate: formatDateForInput(
            (response as any).scheduler?.startDate || asset.amcStartDate
          ),
          amcEndDate: formatDateForInput(
            (response as any).scheduler?.endDate || asset.amcEndDate
          ),
          lastHPTestDate: formatDateForInput(asset.lastHPTestDate),
          nextHPTestDueDate: formatDateForInput(asset.nextHPTestDueDate),

          // Status fields - these are required
          status: asset.status || 'In-House',
          healthStatus: asset.healthStatus || 'Healthy',

          // Product details
          type: asset.type || "",
          subType: asset.subType || "",
          model: asset.model || "",
          slNo: asset.slNo || "",
          capacity: asset.capacity || "",

          // Optional fields
          tag: asset.tag || "",
          lifespanYears: asset.lifespanYears || null,

          // Location fields
          lat: asset.lat || "",
          long: asset.long || "",
          latLongRemark: asset.latLongRemark || "",
          oldlatlongs: asset.oldlatlongs || [],

          // Floorplan fields
          floorplanX: asset.floorplanX || null,
          floorplanY: asset.floorplanY || null,

          // QR Code
          qrCodeUrl: asset.qrCodeUrl || "",

          // Transform specValues array into specs object for the form
          specs: {},
        };

        // Convert specValues array to specs object with specDefinitionId as key
        console.log('🔄 Converting specValues to specs object:', {
          hasSpecValues: !!asset.specValues,
          isArray: Array.isArray(asset.specValues),
          length: asset.specValues?.length || 0,
          specValues: asset.specValues
        });

        if (asset.specValues && Array.isArray(asset.specValues) && asset.specValues.length > 0) {
          asset.specValues.forEach((spec: any) => {
            if (spec.specDefinitionId && spec.value !== null && spec.value !== undefined) {
              transformedData.specs[spec.specDefinitionId] = spec.value;
              console.log('✅ Added spec:', { specDefinitionId: spec.specDefinitionId, value: spec.value });
            }
          });
        }

        console.log('📋 Final transformedData.specs:', transformedData.specs);
        console.log('📦 Setting formData with specs count:', Object.keys(transformedData.specs).length);

        setFormData(transformedData);
        setIsLoading(false);
      } else {
        console.error('Invalid response format:', response);
        toast({
          title: "Error",
          description: "Invalid response format from server.",
          variant: "destructive",
        });
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to load asset:', error);
      toast({
        title: "Error",
        description: "Failed to load asset details.",
        variant: "destructive",
      });
      throw error;
    }
  };

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
        { key: 'status', label: 'Status' }
      ];

      const missingFields = requiredFields.filter(field => !formData?.[field.key]);

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

  const handleUpdateAsset = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSaving(true);
    try {
      // Transform specs from object to array format
      const specs = formData.specs || {};
      const specsArray = Object.entries(specs)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        .map(([specDefinitionId, value]) => ({
          specDefinitionId,
          value: String(value).substring(0, 255) // Truncate to match DB constraint
        }));

      // Prepare submission data matching V2 API format
      const updateData: any = {
        // Required fields
        plantId: formData.plantId,
        building: formData.building?.substring(0, 255),
        productCategoryId: formData.productCategoryId,
        productId: formData.productId,
        location: formData.location?.substring(0, 255),
        manufacturingDate: formData.manufacturingDate,
        installDate: formData.installDate,
        status: formData.status || 'In-House',

        // Optional fields
        healthStatus: formData.healthStatus || 'Healthy',
        tag: formData.tag?.substring(0, 255),

        // Manufacturer handling
        ...(((formData as any).manufacturerName || (formData as any).manufacturerId) && {
          manufacturerName: formData.manufacturerName?.substring(0, 255),
          manufacturerId: formData.manufacturerId,
        }),

        // Location fields
        ...((formData.lat || formData.long) && {
          lat: formData.lat,
          long: formData.long,
          latLongRemark: formData.latLongRemark?.substring(0, 255),
        }),

        // Floorplan positioning
        ...(formData.floorplanX && { floorplanX: formData.floorplanX }),
        ...(formData.floorplanY && { floorplanY: formData.floorplanY }),
        ...(formData.buildingId && { buildingId: formData.buildingId }),
        ...(formData.floorId && { floorId: formData.floorId }),

        // Specs array
        specs: specsArray,
      };

      // Use V2 API endpoint for update
      const response = await api.put(`/assets/${id}`, updateData);

      toast({ title: "Success", description: "Asset updated successfully!" });
      navigate("/admin/assets");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to update asset";
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

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading asset details...</p>
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
            style={{ justifyContent: "flex-start" }}
          >
            {ASSET_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-sm py-3 px-5 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 rounded-none"
                style={{ marginLeft: 0 }}
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
              isUpdateMode={true}
            />
          </TabsContent>
          <TabsContent value="technical">
            <TechnicalSpecsStepDynamic
              formData={formData}
              setFormData={setFormData}
              categoryId={formData?.productCategoryId}
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
                onClick={handleUpdateAsset}
                disabled={isSaving}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isSaving ? "Saving..." : "Submit"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
