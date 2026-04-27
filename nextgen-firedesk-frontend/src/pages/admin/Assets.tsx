// src/pages/Assets.tsx
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { Badge } from '@/components/ui/badge';
import { TableCell } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssetInfoStep } from '@/components/asset-creation-form/AssetInfoStep';
import { TechnicalSpecsStepDynamic } from '@/components/asset-creation-form/TechnicalSpecsStepDynamic';
import { ManufacturerStep } from '@/components/asset-creation-form/ManufacturerStep';
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Eye, Printer, CalendarIcon } from 'lucide-react';
import { Entity } from '@/types/permissions';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QRCodeSVG } from 'qrcode.react';
import { generateAssetQRValue } from '@/utils/qr_code_utils';

export interface Asset {
  id: string;
  name: string;
  status: 'Warranty' | 'AMC' | 'In-House' | 'Deactive';
  createdAt: string;
  created_at?: string;
  updatedAt?: string;

  // Asset Identifier
  assetId: string;
  asset_code?: string;

  // Group Association
  groupId?: string;

  // Location Information
  plantId: string;
  plant?: {
    id: string;
    plantName: string;
    plant_name?: string;
  };
  building: string;
  buildingId?: string;
  buildingRef?: { id: string; name: string };
  floorId?: string;
  floor?: string;
  floorRef?: { id: string; name: string };
  wingId?: string;
  wing?: string;
  wingRef?: { id: string; name: string };
  location: string;

  // Product Classification
  productCategoryId: string;
  category?: {
    id: string;
    categoryName: string;
    category_name?: string;
  };
  productId: string;
  product?: {
    id: string;
    productName: string;
    product_name?: string;
  };

  // Ownership & Assignment
  orgUserId: string;
  technicianUserId?: string[];

  // Manufacturer Reference
  manufacturerId?: string;
  manufacturer?: {
    id: string;
    name: string;
  };

  // Important Dates
  manufacturingDate: string;
  installDate: string;

  // Status & Health - 4 status fields
  // 1. Asset status (ACTIVE/DEACTIVE)
  assetStatus?: string;

  // 2. Health status
  healthStatus: 'NotWorking' | 'AttentionRequired' | 'Healthy' | 'HEALTHY' | 'NEEDS_ATTENTION' | 'NOT_WORKING' | 'INVENTORY' | 'OBSOLETE';
  health_status?: string;

  // 3. Maintenance status
  maintenanceStatus?: string;
  maintenance_status?: string;

  // 4. Conditions (from service forms)
  conditions?: string[];
  activeConditions?: string[];

  // QR Code & Tagging
  tag?: string;
  qrCodeUrl?: string;

  // Geolocation
  lat?: string;
  long?: string;
  latLongRemark?: string;
  oldlatlongs?: Array<{ lat: string; long: string; timestamp: string }>;

  // Floorplan Position
  floorplanX?: number;
  floorplanY?: number;

  // Related Data
  documents?: Array<{
    id: string;
    documentUrl: string;
    description?: string;
  }>;
  specValues?: Array<{
    id: string;
    specDefinitionId: string;
    value: string;
    specDefinition?: {
      id: string;
      name: string;
      fieldType: string;
      unit?: string;
    };
  }>;
}



// Single-step wizard (appears as single-page form)
const ASSET_SINGLE_STEP = [
  { id: 'assetForm', name: 'Asset Information', description: 'Complete asset details' }
];

const AssetDatePicker = ({
  value,
  onChange,
  label,
  required = false,
  placeholder = "Pick a date",
}: {
  value: string | undefined;
  onChange: (date: string) => void;
  label: string;
  required?: boolean;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setTempDate(value ? new Date(value) : undefined);
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full h-9 justify-start text-left font-normal text-sm",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(new Date(value), "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
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
                setTempDate(value ? new Date(value) : undefined);
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange(tempDate ? format(tempDate, "yyyy-MM-dd") : "");
                setIsOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Component that renders all asset form sections in a single page with compact UI
const AssetFormSinglePage = ({ formData, setFormData }: { formData: any; setFormData: any }) => {
  const [masterData, setMasterData] = useState({
    plants: [],
    buildings: [],
    floors: [],
    wings: [],
    categories: [],
    products: [],
    productVariants: [],
  });

  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);



  // Load plants on mount
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const response: any = await api.get("/plant");
        setMasterData(prev => ({
          ...prev,
          plants: response?.plants || response?.data || [],
        }));
      } catch (error) {
        console.error('Failed to load plants:', error);
      }
    };
    fetchPlants();
  }, []);

  // Fetch buildings when plant changes
  useEffect(() => {
    if (formData.plantId) {
      const fetchBuildings = async () => {
        setLoadingBuildings(true);
        try {
          const response: any = await api.get(`/buildings?plantId=${formData.plantId}`);
          setMasterData(prev => ({
            ...prev,
            buildings: response.success ? response.data : []
          }));
        } catch (error) {
          console.error('Failed to fetch buildings:', error);
        } finally {
          setLoadingBuildings(false);
        }
      };
      fetchBuildings();

      // Fetch plant-specific categories
      const fetchCategories = async () => {
        setLoadingCategories(true);
        try {
          const response: any = await api.get(`/master-data/categories?plantId=${formData.plantId}`);
          const categoriesData = response.categories || response.data || response.allCategory || [];
          setMasterData(prev => ({ ...prev, categories: categoriesData }));
        } catch (error) {
          console.error('Failed to fetch categories:', error);
        } finally {
          setLoadingCategories(false);
        }
      };
      fetchCategories();
    }
  }, [formData.plantId]);

  // Fetch floors when building changes
  useEffect(() => {
    if (formData.buildingId) {
      const fetchFloors = async () => {
        setLoadingFloors(true);
        try {
          const response: any = await api.get(`/floors?buildingId=${formData.buildingId}`);
          setMasterData(prev => ({
            ...prev,
            floors: response.success ? response.data : []
          }));
        } catch (error) {
          console.error('Failed to fetch floors:', error);
        } finally {
          setLoadingFloors(false);
        }
      };
      fetchFloors();
    }
  }, [formData.buildingId]);

  // Extract wings from selected floor
  useEffect(() => {
    if (formData.floorId) {
      const selectedFloor = masterData.floors.find((f: any) => f.id === formData.floorId);
      if (selectedFloor && (selectedFloor as any).wings) {
        setMasterData(prev => ({
          ...prev,
          wings: (selectedFloor as any).wings
        }));
      }
    }
  }, [formData.floorId, masterData.floors]);

  // Fetch products when category changes
  useEffect(() => {
    if (formData.productCategoryId) {
      const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
          const response: any = await api.get(`/master-data/products/category/${formData.productCategoryId}`);
          const productsData = response.products || response.data || [];
          setMasterData(prev => ({ ...prev, products: productsData }));
        } catch (error) {
          console.error('Failed to fetch products:', error);
        } finally {
          setLoadingProducts(false);
        }
      };
      fetchProducts();
    }
  }, [formData.productCategoryId]);

  // Fetch product variants (types/subtypes) when product changes
  useEffect(() => {
    if (formData.productId) {
      const fetchProductVariants = async () => {
        try {
          console.log('🔍 Fetching product variants for productId:', formData.productId);
          const response: any = await api.get(`/master-data/products/${formData.productId}/types-subtypes`);
          console.log('📦 Product variants response:', response);
          if (response.success) {
            const types = response.types || [];
            const subTypesMap = response.subTypesMap || {};
            console.log('✅ Types:', types, 'SubTypesMap:', subTypesMap);
            setMasterData(prev => ({
              ...prev,
              productVariants: [{ types, typesMap: subTypesMap, allSubTypes: response.allSubTypes || [] }]
            }));
            // DO NOT reset type/subType here - it clears values when editing
            // The reset now happens in the product Select onValueChange handler
          }
        } catch (error) {
          console.error('Failed to fetch product variants:', error);
          // Clear variants on error
          setMasterData(prev => ({
            ...prev,
            productVariants: []
          }));
        }
      };
      fetchProductVariants();
    } else {
      // Clear variants when no product selected
      setMasterData(prev => ({
        ...prev,
        productVariants: []
      }));
    }
  }, [formData.productId]);

  const handleChange = (field: string, value: any) => {
    console.log(`🔄 handleChange called: ${field} =`, value);
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Get available types
  const availableTypes = masterData.productVariants.length > 0
    ? masterData.productVariants[0].types || []
    : [];

  // Get available subtypes for selected type
  const availableSubtypes = (masterData.productVariants.length > 0 && formData.type)
    ? (masterData.productVariants[0].typesMap?.[formData.type] || [])
    : (masterData.productVariants.length > 0 ? masterData.productVariants[0].allSubTypes || [] : []);

  return (
    <div className="space-y-4">
      {/* Section 1: Location & Product */}
      <div className="bg-white rounded-lg border border-orange-300 shadow-md overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-orange-200">
          <h3 className="text-sm font-semibold text-gray-800">Location & Product</h3>
        </div>
        <div className="p-3">
          {/* Row 1: Plant, Building, Floor, Wing, Location - all in one row */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="plant" className="text-xs font-medium">
                Plant <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.plantId || ""} onValueChange={(value) => handleChange("plantId", value)}>
                <SelectTrigger id="plant" className="h-9 text-sm bg-gray-50">
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent>
                  {masterData.plants.map((plant: any) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.plantName || plant.plant_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="building" className="text-xs font-medium">Building</Label>
              {formData.plantId && masterData.buildings.length > 0 ? (
                <Select
                  value={formData.buildingId || ""}
                  onValueChange={(value) => handleChange("buildingId", value)}
                  disabled={loadingBuildings}
                >
                  <SelectTrigger
                    id="building"
                    className="h-9 text-sm bg-gray-50"
                  >
                    <SelectValue placeholder={loadingBuildings ? "Loading..." : "Select building"} />
                  </SelectTrigger>
                  <SelectContent>
                    {masterData.buildings.map((building: any) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.buildingName || building.building_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="building"
                  value=""
                  disabled
                  placeholder={!formData.plantId ? "Select plant first" : "No buildings available for this plant"}
                  className="h-9 text-sm bg-gray-100 text-gray-400"
                />
              )}
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="floor" className="text-xs font-medium">Floor</Label>
              {formData.buildingId && masterData.floors.length > 0 ? (
                <Select
                  value={formData.floorId || ""}
                  onValueChange={(value) => handleChange("floorId", value)}
                  disabled={loadingFloors}
                >
                  <SelectTrigger
                    id="floor"
                    className="h-9 text-sm bg-gray-50"
                  >
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    {masterData.floors.map((floor: any) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.floorName || floor.floor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="floor"
                  value=""
                  disabled
                  placeholder={!formData.buildingId ? "Select building first" : "No floors available for this building"}
                  className="h-9 text-sm bg-gray-100 text-gray-400"
                />
              )}
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="wing" className="text-xs font-medium">Wing</Label>
              {formData.floorId && masterData.wings.length > 0 ? (
                <Select
                  value={formData.wingId || ""}
                  onValueChange={(value) => handleChange("wingId", value)}
                >
                  <SelectTrigger
                    id="wing"
                    className="h-9 text-sm bg-gray-50"
                  >
                    <SelectValue placeholder="Select wing" />
                  </SelectTrigger>
                  <SelectContent>
                    {masterData.wings.map((wing: any) => (
                      <SelectItem key={wing.id} value={wing.id}>
                        {wing.wingName || wing.wing_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="wing"
                  value=""
                  disabled
                  placeholder={!formData.floorId ? "Select floor first" : "No wings available for this floor"}
                  className="h-9 text-sm bg-gray-100 text-gray-400"
                />
              )}
            </div>

            <div className="col-span-4 space-y-1">
              <Label htmlFor="location" className="text-xs font-medium">Location</Label>
              <Input
                id="location"
                className="h-9 text-sm bg-gray-50"
                value={formData.location || ""}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g., Pump Room-1"
              />
            </div>
          </div>

          {/* Row 2: Category, Product, Type, Sub Type */}
          <div className="grid grid-cols-12 gap-3 mt-3">
            <div className="col-span-3 space-y-1">
              <Label htmlFor="product-category" className="text-xs font-medium">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.productCategoryId || ""}
                onValueChange={(value) => handleChange("productCategoryId", value)}
                disabled={loadingCategories}
              >
                <SelectTrigger id="product-category" className="h-9 text-sm bg-gray-50">
                  <SelectValue placeholder={loadingCategories ? "Loading..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {masterData.categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.categoryName || cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-3 space-y-1">
              <Label htmlFor="product" className="text-xs font-medium">
                Product <span className="text-red-500">*</span>
              </Label>
              {formData.productCategoryId && masterData.products.length > 0 ? (
                <Select
                  value={formData.productId || ""}
                  onValueChange={(value) => {
                    // Reset type/subType when user manually changes product
                    setFormData((prev: any) => ({ ...prev, productId: value, type: '', subType: '' }));
                  }}
                  disabled={loadingProducts}
                >
                  <SelectTrigger
                    id="product"
                    className="h-9 text-sm bg-gray-50"
                  >
                    <SelectValue placeholder={loadingProducts ? "Loading..." : "Select product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {masterData.products.map((product: any) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.productName || product.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="product"
                  value=""
                  disabled
                  placeholder={!formData.productCategoryId ? "Select category first" : "No products available for this category"}
                  className="h-9 text-sm bg-gray-100 text-gray-400"
                />
              )}
            </div>

            <div className="col-span-3 space-y-1">
              <Label htmlFor="type" className="text-xs font-medium">
                Type <span className="text-red-500">*</span>
              </Label>
              {!formData.productId ? (
                // No product selected yet
                <Input
                  id="type"
                  value=""
                  disabled
                  placeholder="Select product first"
                  className="h-9 text-sm bg-gray-100 text-gray-400"
                />
              ) : availableTypes.length > 0 ? (
                // Product has types defined - show dropdown
                <Select
                  value={formData.type || ""}
                  onValueChange={(value) => {
                    console.log('Type selected:', value);
                    setFormData((prev: any) => ({ ...prev, type: value, subType: '' }));
                  }}
                >
                  <SelectTrigger id="type" className="h-9 text-sm bg-gray-50">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Include current value if not in available types (for editing) */}
                    {formData.type && !availableTypes.includes(formData.type) && (
                      <SelectItem key={formData.type} value={formData.type}>{formData.type}</SelectItem>
                    )}
                    {availableTypes.map((type: string) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : formData.type ? (
                // Editing existing asset that has a type but product has no variants
                <Select value={formData.type}>
                  <SelectTrigger id="type" className="h-9 text-sm bg-gray-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={formData.type}>{formData.type}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                // Product has no types defined
                <Input
                  id="type"
                  value=""
                  disabled
                  placeholder="No type available for this product"
                  className="h-9 text-sm bg-gray-100 text-gray-400"
                />
              )}
            </div>

            <div className="col-span-3 space-y-1">
              <Label htmlFor="sub-type" className="text-xs font-medium">Sub Type</Label>
              {!formData.productId ? (
                // No product selected yet
                <Input
                  id="sub-type"
                  value=""
                  disabled
                  placeholder="Select product first"
                  className="h-9 text-sm bg-gray-100 text-gray-400"
                />
              ) : !formData.type ? (
                // No type selected yet
                <Input
                  id="sub-type"
                  value=""
                  disabled
                  placeholder="Select type first"
                  className="h-9 text-sm bg-gray-100 text-gray-400"
                />
              ) : availableSubtypes.length > 0 ? (
                // Type has subtypes defined - show dropdown
                <Select
                  value={formData.subType || ""}
                  onValueChange={(value) => {
                    console.log('Subtype selected:', value);
                    handleChange("subType", value);
                  }}
                >
                  <SelectTrigger id="sub-type" className="h-9 text-sm bg-gray-50">
                    <SelectValue placeholder="Select sub type" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Include current value if not in available subtypes (for editing) */}
                    {formData.subType && !availableSubtypes.includes(formData.subType) && (
                      <SelectItem key={formData.subType} value={formData.subType}>{formData.subType}</SelectItem>
                    )}
                    {availableSubtypes.map((subtype: string) => (
                      <SelectItem key={subtype} value={subtype}>{subtype}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : formData.subType ? (
                // Editing existing asset that has a subtype but type has no variants
                <Select value={formData.subType}>
                  <SelectTrigger id="sub-type" className="h-9 text-sm bg-gray-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={formData.subType}>{formData.subType}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                // Type has no subtypes defined
                <Input
                  id="sub-type"
                  value=""
                  disabled
                  placeholder="No sub type available for this type"
                  className="h-9 text-sm bg-gray-100 text-gray-400"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Operational Details */}
      <div className="bg-white rounded-lg border border-orange-300 shadow-md overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-orange-200">
          <h3 className="text-sm font-semibold text-gray-800">Operational Details</h3>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="maintenance-status" className="text-xs font-medium">
                Maintenance Status <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.maintenanceStatus || "IN_HOUSE"} onValueChange={(value) => handleChange("maintenanceStatus", value)}>
                <SelectTrigger id="maintenance-status" className="h-9 text-sm bg-gray-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_HOUSE">In-House</SelectItem>
                  <SelectItem value="UNDER_WARRANTY">Under Warranty</SelectItem>
                  <SelectItem value="OUT_OF_WARRANTY">Out of Warranty</SelectItem>
                  <SelectItem value="UNDER_AMC">Under AMC</SelectItem>
                  <SelectItem value="OUT_OF_AMC">Out of AMC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="condition" className="text-xs font-medium">Condition</Label>
              <Input
                id="condition"
                value="Auto-calculated"
                disabled
                className="h-9 text-sm bg-gray-100 text-gray-400"
              />
              <p className="text-xs text-gray-400">From service form submissions</p>
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="health-status" className="text-xs font-medium">Health Status</Label>
              <Input
                id="health-status"
                value="Auto-calculated"
                disabled
                className="h-9 text-sm bg-gray-100 text-gray-400"
              />
              <p className="text-xs text-gray-400">Calculated from asset conditions</p>
            </div>

            <div className="col-span-3 space-y-1">
              <Label htmlFor="tag" className="text-xs font-medium">Tag</Label>
              <Input
                id="tag"
                className="h-9 text-sm bg-gray-50"
                value={formData.tag || ""}
                onChange={(e) => handleChange("tag", e.target.value)}
                placeholder="e.g., Critical"
              />
            </div>

            <div className="col-span-3 space-y-1">
              <Label htmlFor="lifespan-years" className="text-xs font-medium">Lifespan Years</Label>
              <Input
                id="lifespan-years"
                className="h-9 text-sm bg-gray-50"
                type="number"
                min="0"
                value={formData.lifespanYears || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val < 0) return; // Prevent negative update
                  handleChange("lifespanYears", e.target.value);
                }}
                placeholder="Enter years"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Important Dates */}
      <div className="bg-white rounded-lg border border-orange-300 shadow-md overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-orange-200">
          <h3 className="text-sm font-semibold text-gray-800">Important Dates</h3>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <AssetDatePicker
                label="Manufacturing Date"
                value={formData.manufacturingDate}
                onChange={(date) => handleChange("manufacturingDate", date)}
                required
              />
            </div>

            <div className="space-y-1">
              <AssetDatePicker
                label="Installation Date"
                value={formData.installDate}
                onChange={(date) => handleChange("installDate", date)}
                required
              />
            </div>

            <div className="space-y-1">
              <AssetDatePicker
                label="Warranty End Date"
                value={formData.warrantyEndDate}
                onChange={(date) => handleChange("warrantyEndDate", date)}
              />
            </div>

            {/* Only show on EDIT mode - Frozen fields auto-set from Manufacturing Date */}
            {/* Only display if category requires test frequency */}
            {formData.id && (() => {
              const selectedCategory = masterData.categories.find((cat: any) => cat.id === formData.productCategoryId);
              const categoryRequiresTestFreq = selectedCategory?.testFrequencyRequired || selectedCategory?.test_frequency_required;
              if (!categoryRequiresTestFreq) return null;

              return (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-500">Last HP Test Date</Label>
                    <Input
                      value={formData.lastHPTestDate ? new Date(formData.lastHPTestDate).toLocaleDateString() : "-"}
                      disabled
                      className="h-9 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-gray-400 italic">Auto-set from Manufacturing Date</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-500">Last Refill Date</Label>
                    <Input
                      value={formData.lastRefillDate ? new Date(formData.lastRefillDate).toLocaleDateString() : "-"}
                      disabled
                      className="h-9 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-gray-400 italic">Auto-set from Manufacturing Date</p>
                  </div>
                </>
              );
            })()}

          </div>
        </div>
      </div>

      {/* Section 4: Technical Specifications */}
      <div className="bg-white rounded-lg border border-orange-300 shadow-md overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-orange-200">
          <h3 className="text-sm font-semibold text-gray-800">Technical Specifications</h3>
        </div>
        <div className="p-3">
          <TechnicalSpecsStepDynamic
            formData={formData}
            setFormData={setFormData}
            categoryId={formData?.productCategoryId}
          />
        </div>
      </div>

      {/* Section 5: Manufacturer & Warranty */}
      <div className="bg-white rounded-lg border border-orange-300 shadow-md overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-orange-200">
          <h3 className="text-sm font-semibold text-gray-800">Manufacturer & Warranty</h3>
        </div>
        <div className="p-3">
          <ManufacturerStep formData={formData} setFormData={setFormData} />
        </div>
      </div>

      {/* Section 6: Geolocation */}
      <div className="bg-white rounded-lg border border-orange-300 shadow-md overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-orange-200">
          <h3 className="text-sm font-semibold text-gray-800">Geolocation</h3>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4 space-y-1">
              <Label htmlFor="latitude" className="text-xs font-medium">Latitude</Label>
              <Input
                id="latitude"
                value={formData.lat || ""}
                placeholder="Not captured yet"
                disabled
                className="h-9 text-sm bg-gray-100 text-gray-400"
              />
            </div>

            <div className="col-span-4 space-y-1">
              <Label htmlFor="longitude" className="text-xs font-medium">Longitude</Label>
              <Input
                id="longitude"
                value={formData.long || ""}
                placeholder="Not captured yet"
                disabled
                className="h-9 text-sm bg-gray-100 text-gray-400"
              />
            </div>

            <div className="col-span-4 space-y-1">
              <Label htmlFor="location-remark" className="text-xs font-medium">Location Remark</Label>
              <Input
                id="location-remark"
                value={formData.latLongRemark || ""}
                placeholder="Auto-generated"
                disabled
                className="h-9 text-sm bg-gray-100 text-gray-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const assetsConfig: EntityConfig = {
  entityName: 'Asset',
  entityNamePlural: 'Assets',
  apiEndpoint: '/assets',
  responseKey: 'assets',

  // Permission-based access control
  permissionEntity: Entity.ASSETS,
  enforcePermissions: true,

  // Form layout - use full width
  formMaxWidth: 'w-full',

  // Get initial form data (auto-fill plant from URL params)
  getInitialFormData: () => {
    const params = new URLSearchParams(window.location.search);
    const plantId = params.get('plantId');
    console.log('🌿 Asset form: Getting initial data. PlantId from URL:', plantId);
    const defaultValues = {
      maintenanceStatus: 'IN_HOUSE',
      healthStatus: 'HEALTHY',
      assetStatus: 'ACTIVE'
    };
    return plantId ? { plantId, ...defaultValues } : defaultValues;
  },

  // Custom table headers to match customColumns  
  customHeaders: [
    'Asset ID',
    'Plant',
    'Building',
    'Floor',
    'Wing',
    'Category',
    'Product',
    'Manufacturer',
    'Type',
    'Sub Type',
    'Location',
    'Manufacturing Date',
    'Install Date',
    'Warranty End Date',
    'Lifespan',
    'Last Refill',
    'Health Status',
    'Maintenance Status',
    'Status',
    'Conditions',
    'Created At',
    'Updated At'
  ],

  // Filter attributes for sorting and column visibility (all Asset model fields)
  filterAttributes: [
    { id: 'assetId', label: 'Asset ID', type: 'text' as const, operators: ['contains', 'is', 'isNot'], mandatory: true },
    { id: 'plant', label: 'Plant', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'plantName' },
    { id: 'building', label: 'Building', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'buildingName' },
    { id: 'floor', label: 'Floor', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'floorName', hiddenByDefault: true },
    { id: 'wing', label: 'Wing', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'wingName', hiddenByDefault: true },
    { id: 'category', label: 'Category', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'categoryName' },
    { id: 'product', label: 'Product', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'productName' },
    { id: 'manufacturer', label: 'Manufacturer', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'manufacturerName', hiddenByDefault: true },
    { id: 'type', label: 'Type', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'type', hiddenByDefault: true },
    { id: 'subType', label: 'Sub Type', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'subType', hiddenByDefault: true },
    { id: 'capacity', label: 'Capacity', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'capacity', filterable: true, hiddenByDefault: true, hideFromColumnSelector: true } as any,
    { id: 'location', label: 'Location', type: 'select' as const, operators: ['is', 'isNot'], dynamicOptionsFromEntities: true, entityField: 'location' },
    { id: 'manufacturingDate', label: 'Manufacturing Date', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    { id: 'installDate', label: 'Install Date', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    { id: 'warrantyEndDate', label: 'Warranty End Date', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    { id: 'lifespanYears', label: 'Lifespan Years', type: 'number' as const, operators: ['is', 'isNot'], hiddenByDefault: true },
    { id: 'lastRefillDate', label: 'Last Refill Date', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    {
      id: 'healthStatus', label: 'Health Status', type: 'select' as const, operators: ['is', 'isNot'], options: [
        { value: 'Healthy', label: 'Healthy' },
        { value: 'Needs Attention', label: 'Needs Attention' },
        { value: 'Not Working', label: 'Not Working' },
        { value: 'Inventory', label: 'Inventory' },
        { value: 'Obsolete', label: 'Obsolete' }
      ]
    },
    {
      id: 'maintenanceStatus', label: 'Maintenance Status', type: 'select' as const, operators: ['is', 'isNot'], options: [
        { value: 'In-House', label: 'In-House' },
        { value: 'Under Warranty', label: 'Under Warranty' },
        { value: 'Out of Warranty', label: 'Out of Warranty' },
        { value: 'Under AMC', label: 'Under AMC' },
        { value: 'Out of AMC', label: 'Out of AMC' }
      ]
    },

    { id: 'conditions', label: 'Conditions', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
    { id: 'createdAt', label: 'Created At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    { id: 'updatedAt', label: 'Updated At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
  ],

  // Import fields - matching UI form fields
  // Use names instead of IDs where possible - backend will resolve to IDs
  importFields: [
    // Unique identifier for upsert - if provided and exists, updates the asset
    { id: 'asset_code', label: 'Asset ID' },
    // Location & Product section
    { id: 'plant', label: 'Plant', required: true }, // Plant name, backend resolves to ID
    { id: 'building', label: 'Building', required: true }, // Building name
    { id: 'floor', label: 'Floor' },
    { id: 'wing', label: 'Wing' },
    { id: 'location', label: 'Location' },
    { id: 'category', label: 'Category', required: true }, // Category name
    { id: 'product', label: 'Product', required: true }, // Product name
    { id: 'type', label: 'Type', required: true },
    { id: 'sub_type', label: 'Sub Type' },
    // Operational Details section
    { id: 'maintenance_status', label: 'Maintenance Status', required: true },
    { id: 'tag', label: 'Tag' },
    { id: 'lifespan_years', label: 'Life Span Years' },
    // Important Dates section
    { id: 'manufacturing_date', label: 'Manufacturing Date', required: true },
    { id: 'install_date', label: 'Installation Date', required: true },
    { id: 'warranty_end_date', label: 'Warranty End Date' },
    // { id: 'last_refill_date', label: 'Last Refilled Date' },
    // { id: 'last_hp_test_date', label: 'Last HP Test Date' },

    // Manufacturer & Warranty section
    { id: 'manufacturer', label: 'Manufacturer' }, // Manufacturer name
    { id: 'model', label: 'Model' },
    { id: 'sl_no', label: 'SL No / Part No' },
    // Dynamic specs will be added by user as extra columns (spec_CapacityLabel, etc.)
  ],

  // Enable pagination
  pagination: true,


  // Archive configuration
  supportsArchive: false,
  archiveStatusValue: 'DEACTIVE',

  // Configure fields for archive/restore operations
  archiveFields: ['status'],
  hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
  hideListingRowKebab: true,
  limitTopMenuItems: ['export', 'import', 'bulkActions', 'history'],

  // Exclude status and healthStatus from default column rendering since they're in customColumns
  excludeFields: ['status', 'healthStatus', 'createdAt'],

  // Custom data loader for edit mode - fetches complete asset with specs
  loadEntityData: async (entityId: string) => {
    try {
      console.log('📥 Loading asset data with specs for ID:', entityId);
      const response: any = await api.get(`/assets/${entityId}`);
      console.log('📦 Raw API response:', response);

      // Backend returns {success: true, data: asset }
      if (response.data || response.asset) {
        const asset = response.data || response.asset;

        // Convert spec_values array to specs object (backend returns snake_case)
        // Specs are stored as {value, unit} when unit exists, otherwise just value string
        const specs: Record<string, string | { value: string; unit: string }> = {};
        const specValuesArray = asset.spec_values || asset.specValues || [];
        if (Array.isArray(specValuesArray)) {
          console.log('🔄 Converting spec_values to specs:', specValuesArray);
          specValuesArray.forEach((spec: any) => {
            const specId = spec.spec_definition_id || spec.specDefinitionId;
            const specValue = spec.spec_value || spec.value;
            const specUnit = spec.unit || '';
            if (specId && specValue !== null && specValue !== undefined) {
              // Store as {value, unit} if unit exists, otherwise just value
              if (specUnit) {
                specs[specId] = { value: specValue, unit: specUnit };
                console.log('✅ Added spec with unit:', { id: specId, value: specValue, unit: specUnit });
              } else {
                specs[specId] = specValue;
                console.log('✅ Added spec:', { id: specId, value: specValue });
              }
            }
          });
        }
        console.log('📋 Final specs object:', specs);

        const formatDateForInput = (dateString: string | null) => {
          if (!dateString) return "";
          try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
          } catch {
            return "";
          }
        };

        const transformedData = {
          ...asset,
          // Format dates for inputs - check both snake_case and camelCase
          manufacturingDate: formatDateForInput(asset.manufacturing_date || asset.manufacturingDate),
          installDate: formatDateForInput(asset.install_date || asset.installDate),
          warrantyEndDate: formatDateForInput(asset.warranty_end_date || asset.warrantyEndDate),
          amcStartDate: formatDateForInput(asset.amc_start_date || asset.amcStartDate),
          amcEndDate: formatDateForInput(asset.amc_end_date || asset.amcEndDate),
          // Testing schedule dates - from auto-initialized values
          lastHPTestDate: (() => {
            const dates = asset.testing_schedule?.last_hp_test_date;
            if (Array.isArray(dates) && dates.length > 0) return formatDateForInput(dates[dates.length - 1]);
            return formatDateForInput(dates || asset.lastHPTestDate);
          })(),
          lastRefillDate: (() => {
            const dates = asset.testing_schedule?.last_refill_date;
            if (Array.isArray(dates) && dates.length > 0) return formatDateForInput(dates[dates.length - 1]);
            return formatDateForInput(dates || asset.lastRefillDate);
          })(),
          nextHPTestDueDate: formatDateForInput(asset.testing_schedule?.next_hp_test_due_date || asset.nextHPTestDueDate),
          testFrequencyMonths: asset.testing_schedule?.test_frequency_months || asset.testFrequencyMonths || "",

          // Flatten nested data - backend returns building, floor, wing, category, product (not *Ref)
          plantId: asset.plant_id || asset.plantId || asset.plant?.id || "",
          productCategoryId: asset.category_id || asset.productCategoryId || asset.category?.id || "",
          productId: asset.product_id || asset.productId || asset.product?.id || "",
          buildingId: asset.building_id || asset.buildingId || asset.building?.id || "",
          floorId: asset.floor_id || asset.floorId || asset.floor?.id || "",
          wingId: asset.wing_id || asset.wingId || asset.wing?.id || "",
          location: asset.location || "",

          // Type and subtype (backend uses snake_case)
          // DEBUG: Log the type/sub_type values from asset
          ...(console.log('🔍 DEBUG type/subType:', { type: asset.type, sub_type: asset.sub_type, subType: asset.subType }), {}),
          type: asset.type || "",
          subType: asset.sub_type || asset.subType || "",

          // Capacity
          capacity: asset.capacity || "",
          capacityUnit: asset.capacity_unit || asset.capacityUnit || "",

          // Manufacturer details
          manufacturerName: asset.manufacturer?.name || asset.manufacturerName || "",
          manufacturerId: asset.manufacturer?.id || asset.manufacturer_id || asset.manufacturerId || "",
          model: asset.metadata?.model || asset.model || "",

          // Metadata fields (from nested metadata object)
          tag: asset.metadata?.tag || asset.tag || "",
          slNo: asset.metadata?.serial_number || asset.slNo || "",

          // QR Code URL (from metadata or direct)
          qrCodeUrl: asset.metadata?.qr_code_url || asset.qrCodeUrl || "",

          // Lifespan
          lifespanYears: asset.lifespan_years || asset.lifespanYears || "",

          // Geolocation - map backend latitude/longitude to form lat/long
          lat: asset.latitude || "",
          long: asset.longitude || "",

          // Documents array - transform from snake_case to camelCase
          documents: (asset.documents || []).map((doc: any) => ({
            id: doc.id,
            documentUrl: doc.document_url || doc.documentUrl,
            description: doc.description || 'Asset Document'
          })),

          // Add converted specs
          specs,

          // Status fields - map from backend snake_case to frontend camelCase
          // maintenance_status -> maintenanceStatus (user selectable: IN_HOUSE, UNDER_WARRANTY, etc.)
          // health_status -> healthStatus (based on conditions: HEALTHY, NEEDS_ATTENTION, etc.)
          // status -> assetStatus (ACTIVE/DEACTIVE - not shown in form, always ACTIVE on create)
          // conditions -> from service forms (auto-calculated)
          maintenanceStatus: asset.maintenance_status || asset.maintenanceStatus || 'IN_HOUSE',
          healthStatus: asset.health_status || asset.healthStatus || 'HEALTHY',
          assetStatus: asset.status || 'ACTIVE',
          conditions: asset.conditions || [],
        };

        console.log('✅ Transformed asset data for edit:', transformedData);
        console.log('🔍 QR Code URL in transformed data:', {
          hasQrCodeUrl: !!transformedData.qrCodeUrl,
          qrCodeUrlLength: transformedData.qrCodeUrl?.length || 0,
          qrCodeUrlPreview: transformedData.qrCodeUrl?.substring(0, 50) || 'N/A'
        });
        return transformedData;
      }

      throw new Error('No asset data in response');
    } catch (error) {
      console.error('❌ Failed to load asset data:', error);
      throw error;
    }
  },

  // Single page form (no wizard navigation shown with single step)
  wizardSteps: ASSET_SINGLE_STEP,
  renderWizardStep: (step: string, formData: any, setFormData: any) => (
    <AssetFormSinglePage formData={formData} setFormData={setFormData} />
  ),
  // Validation before submit
  onWizardNext: async (currentStep: string, formData: any) => {
    const fieldLabels: Record<string, string> = {
      'plantId': 'Plant',
      'buildingId': 'Building',
      'productCategoryId': 'Category',
      'productId': 'Product',
      'type': 'Type',
      'manufacturingDate': 'Manufacturing Date',
      'installDate': 'Installation Date',
      'maintenanceStatus': 'Maintenance Status',
    };

    // Required fields based on backend Asset model (allowNull: false)
    const requiredFields = [
      'plantId',
      'productCategoryId',
      'productId',
      'type',
      'manufacturingDate',
      'installDate',
      'maintenanceStatus',
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(field => fieldLabels[field] || field);
      const errorMessage = missingLabels.length === 1
        ? `Please fill in the ${missingLabels[0]} field`
        : `Please fill in the following fields: ${missingLabels.join(', ')}`;

      toast({
        title: "Required Fields Missing",
        description: errorMessage,
        variant: "destructive",
      });

      return false;
    }

    // Validate required specs if category is selected
    if (formData.productCategoryId) {
      try {
        const response: any = await api.get(`/master-data/categories/${formData.productCategoryId}/specs`);

        let specDefinitions: any[] = [];
        if (response?.data && Array.isArray(response.data)) {
          specDefinitions = response.data;
        } else if (response?.specDefinitions && Array.isArray(response.specDefinitions)) {
          specDefinitions = response.specDefinitions;
        } else if (Array.isArray(response)) {
          specDefinitions = response;
        }

        const requiredSpecs = specDefinitions.filter((spec: any) => spec.isRequired);
        const missingSpecs: string[] = [];

        requiredSpecs.forEach((spec: any) => {
          const value = formData.specs?.[spec.id];
          if (!value || value === '' || value === null || value === undefined) {
            missingSpecs.push(spec.label);
          }
        });

        if (missingSpecs.length > 0) {
          const errorMessage = missingSpecs.length === 1
            ? `Please fill in the required specification: ${missingSpecs[0]}`
            : `Please fill in the following required specifications: ${missingSpecs.join(', ')}`;

          toast({
            title: "Required Specifications Missing",
            description: errorMessage,
            variant: "destructive",
          });

          return false;
        }
      } catch (error) {
        console.log('Could not validate specs:', error);
      }
    }

    // Validate that Installation Date is not before Manufacturing Date
    if (formData.manufacturingDate && formData.installDate) {
      const mfgDate = new Date(formData.manufacturingDate);
      const installDate = new Date(formData.installDate);

      // Reset time components to simple date comparison
      mfgDate.setHours(0, 0, 0, 0);
      installDate.setHours(0, 0, 0, 0);

      if (installDate < mfgDate) {
        toast({
          title: "Invalid Date Range",
          description: "Installation Date cannot be before Manufacturing Date",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  },

  // Custom submit handler for both create and update
  onWizardSubmit: async (formData: any) => {
    try {
      // Determine if we're editing or creating
      const isEditMode = !!formData.id;

      // Transform specs from object format to array format for backend
      // Backend expects spec_values array with spec_definition_id, spec_value, and unit (snake_case)
      // Specs can be stored as simple strings or as {value, unit} objects
      let specValuesArray: any[] = [];
      if (formData.specs && typeof formData.specs === 'object' && !Array.isArray(formData.specs)) {
        // Convert specs object to array format expected by backend
        specValuesArray = Object.entries(formData.specs)
          .filter(([_, value]) => {
            // Handle both string and object formats
            if (typeof value === 'object' && value !== null) {
              const specObj = value as { value?: string; unit?: string };
              return specObj.value !== '' && specObj.value !== null && specObj.value !== undefined;
            }
            return value !== '' && value !== null && value !== undefined;
          })
          .map(([specDefinitionId, value]) => {
            // Handle both string and object formats
            if (typeof value === 'object' && value !== null) {
              const specObj = value as { value?: string; unit?: string };
              return {
                spec_definition_id: specDefinitionId,
                spec_value: String(specObj.value || '').substring(0, 255),
                unit: specObj.unit || null,
              };
            }
            return {
              spec_definition_id: specDefinitionId,
              spec_value: String(value).substring(0, 255),
              unit: null,
            };
          });
      } else if (Array.isArray(formData.specs)) {
        specValuesArray = formData.specs.map(spec => ({
          spec_definition_id: spec.specDefinitionId || spec.spec_definition_id,
          spec_value: String(spec.value || spec.spec_value).substring(0, 255),
          unit: spec.unit || null,
        }));
      }

      // Helper function to truncate strings to database limits
      const truncateString = (value: string | undefined | null, maxLength: number): string | undefined => {
        if (!value) return undefined;
        const str = String(value);
        if (str.length > maxLength) {
          console.warn(`⚠️ Truncating field from ${str.length} to ${maxLength} characters`);
          return str.substring(0, maxLength);
        }
        return str;
      };

      // Note: Legacy fields (type, subType, capacity, model, slNo) are now sent as direct fields
      // They are NOT included in the specs array anymore

      // Generate asset_code in format: BUILDINGABBR-CATEGORYABBR-SEQNUM (e.g., AB-HY-001)
      const generateAssetCode = async () => {
        try {
          // Fetch building and category to get their names
          const [buildingRes, categoryRes, countRes] = await Promise.all([
            formData.buildingId ? api.get(`/buildings?plantId=${formData.plantId}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
            formData.productCategoryId ? api.get(`/master-data/categories?plantId=${formData.plantId}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
            (formData.buildingId && formData.productCategoryId)
              ? api.get(`/assets?building_id=${formData.buildingId}&category_id=${formData.productCategoryId}&limit=1000`).catch(() => ({ data: [] }))
              : Promise.resolve({ data: [] })
          ]);

          // Extract building name
          const buildings = buildingRes?.success ? buildingRes.data : (buildingRes?.data || []);
          const selectedBuilding = Array.isArray(buildings)
            ? buildings.find((b: any) => b.id === formData.buildingId)
            : null;
          const buildingName = selectedBuilding?.buildingName || selectedBuilding?.building_name || 'Unknown';

          // Extract category name  
          const categories = categoryRes?.categories || categoryRes?.data || categoryRes?.allCategory || [];
          const selectedCategory = Array.isArray(categories)
            ? categories.find((c: any) => c.id === formData.productCategoryId)
            : null;
          const categoryName = selectedCategory?.categoryName || selectedCategory?.category_name || 'Unknown';

          // Abbreviate: take first letter of each word, exactly 2 chars
          const abbreviate = (str: string): string => {
            const cleaned = str.toUpperCase().replace(/[^A-Z0-9\s&]/g, '').trim();
            const words = cleaned.split(/\s+/).filter(Boolean);

            if (words.length === 0) return 'XX';
            if (words.length === 1) {
              return words[0].substring(0, 2).padEnd(2, 'X');
            } else {
              return (words[0][0] + words[1][0]).substring(0, 2);
            }
          };

          const buildingAbbr = abbreviate(buildingName);
          const categoryAbbr = abbreviate(categoryName);
          const prefix = `${buildingAbbr}-${categoryAbbr}-`;

          // Find max sequence from existing asset codes with same prefix
          const existingAssets = Array.isArray(countRes?.data) ? countRes.data : [];
          let maxSeq = 0;

          existingAssets.forEach((asset: any) => {
            const code = asset.asset_code || asset.assetId || '';
            if (code.startsWith(prefix)) {
              const seqPart = code.substring(prefix.length);
              const seqNum = parseInt(seqPart, 10);
              if (!isNaN(seqNum) && seqNum > maxSeq) {
                maxSeq = seqNum;
              }
            }
          });

          const seqNum = String(maxSeq + 1).padStart(3, '0');
          return `${prefix}${seqNum}`;
        } catch (error) {
          console.error('Error generating asset code:', error);
          // Fallback to timestamp-based unique code
          const timestamp = Date.now().toString().slice(-6);
          return `AST-${timestamp}`;
        }
      };

      // Prepare the data according to backend requirements (snake_case normalized structure)
      // Backend expects: asset_code, plant_id, building_id, category_id, product_id, spec_values, etc.

      const submitData: any = {
        // Required fields (snake_case for backend)
        // asset_code will be auto-generated by backend based on category and product
        plant_id: formData.plantId,
        building_id: formData.buildingId,
        floor_id: formData.floorId || null,
        wing_id: formData.wingId || null,  // Optional - only if valid wing selected
        location: formData.location || null,  // Send null if empty
        category_id: formData.productCategoryId,
        product_id: formData.productId,

        // REQUIRED: Type (cannot be null in database)
        type: formData.type,
        sub_type: formData.subType,

        // REQUIRED: Dates (cannot be null in database)
        manufacturing_date: formData.manufacturingDate,
        install_date: formData.installDate,

        // Status fields - derived from each other:
        // - condition: auto-calculated from service forms (not set here)
        // - health_status: auto-calculated from conditions (default HEALTHY for new assets)
        // - status: derived from health_status (OBSOLETE = DEACTIVE, else ACTIVE)

        // For new assets, default to HEALTHY. health_status is recalculated when conditions change.
        health_status: formData.healthStatus || 'HEALTHY',

        // Status is derived: OBSOLETE -> DEACTIVE, all others -> ACTIVE
        status: (formData.healthStatus === 'OBSOLETE') ? 'DEACTIVE' : 'ACTIVE',

        // maintenance_status: 'UNDER_WARRANTY' | 'OUT_OF_WARRANTY' | 'UNDER_AMC' | 'OUT_OF_AMC' | 'IN_HOUSE'
        maintenance_status: formData.maintenanceStatus || 'IN_HOUSE',

        // 4. conditions: comes from service forms (JSONB, not set here)

        // Optional location fields
        latitude: formData.lat,
        longitude: formData.long,

        // Spec values array (snake_case)
        spec_values: specValuesArray,
      };

      // Add optional date fields (snake_case)
      if (formData.warrantyEndDate) submitData.warranty_end_date = formData.warrantyEndDate;
      // Always include lifespan_years to allow clearing (null value)
      submitData.lifespan_years = formData.lifespanYears ? parseInt(formData.lifespanYears) : null;

      // Always add metadata to allow clearing fields like tag (goes to asset_metadata table)
      submitData.metadata = {
        tag: formData.tag || null,
        serial_number: formData.slNo || null,
        qr_code_url: formData.qrCodeUrl || null,
        model: formData.model || null,
      };

      // Add testing schedule if present (goes to asset_testing_schedule table)
      if (formData.nextHPTestDueDate || formData.testFrequencyMonths) {
        submitData.testing_schedule = {
          // last_hp_test_date removed from frontend
          next_hp_test_due_date: formData.nextHPTestDueDate,
          test_frequency_months: formData.testFrequencyMonths ? parseInt(formData.testFrequencyMonths) : null,
        };
      }


      // Add documents if present (goes to asset_documents table)
      if (formData.documents && Array.isArray(formData.documents) && formData.documents.length > 0) {
        submitData.documents = formData.documents
          .filter((doc: any) => doc && (doc.documentUrl || doc.document_url))
          .map((doc: any) => ({
            document_url: doc.documentUrl || doc.document_url,
            description: doc.description || 'Asset Document',
          }));
      }

      // Handle manufacturer - create new or use existing
      if (formData.createManufacturer && formData.manufacturerName) {
        // Create new manufacturer
        try {
          const manufacturerResponse: any = await api.post('/assets/manufacturers', {
            name: formData.manufacturerName.trim()
          });

          if (manufacturerResponse.success && manufacturerResponse.data) {
            submitData.manufacturer_id = manufacturerResponse.data.id;
            console.log('✅ Created/found manufacturer:', manufacturerResponse.data);
          }
        } catch (error) {
          console.error('Failed to create manufacturer:', error);
          // Continue without manufacturer if creation fails
        }
      } else if (formData.manufacturerId) {
        // Use existing manufacturer
        submitData.manufacturer_id = formData.manufacturerId;
      }

      // Log QR code URL before cleaning
      console.log('🔍 QR Code URL before cleaning:', {
        hasQrCodeUrl: !!formData.qrCodeUrl,
        qrCodeUrlLength: formData.qrCodeUrl?.length || 0,
        qrCodeUrlPreview: formData.qrCodeUrl?.substring(0, 50) || 'N/A'
      });

      // Remove any undefined, null, or empty string values (except arrays and required fields)
      // Note: asset_code is NOT in required fields as backend auto-generates it
      const requiredFields = ['plant_id', 'building_id', 'category_id', 'product_id', 'type', 'manufacturing_date', 'install_date', 'status', 'health_status', 'maintenance_status'];
      // Fields that should be sent even if null (to allow clearing)
      const nullableFields = ['location', 'floor_id', 'wing_id', 'manufacturer_id', 'lifespan_years', 'metadata'];

      Object.keys(submitData).forEach(key => {
        // Keep required fields even if empty, keep nullable fields to allow clearing, remove others if undefined/null/empty
        if (!requiredFields.includes(key) && !nullableFields.includes(key) && (submitData[key] === undefined || submitData[key] === null || submitData[key] === '')) {
          delete submitData[key];
        }
      });

      // Log final submit data
      console.log('📤 Final submitData includes qrCodeUrl:', !!submitData.qrCodeUrl, submitData.qrCodeUrl?.substring(0, 50));
      console.log('📤 Complete submitData being sent to backend:', JSON.stringify(submitData, null, 2));

      // Debug: Check all string field lengths before submission
      console.log('🔍 Checking field lengths before submission:');
      Object.entries(submitData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          console.log(`  ${key}: ${value.length} chars`);
          if (value.length > 255) {
            console.error(`  ❌ ${key} exceeds 255 characters! (${value.length} chars)`);
          }
        }
      });

      console.log(isEditMode ? 'Updating asset data:' : 'Creating asset data:', submitData);

      // Use the normalized endpoint - POST for create, PUT for update
      let response;
      if (isEditMode) {
        response = await api.put(`/assets/${formData.id}`, submitData);
        console.log('Asset updated successfully:', response);
      } else {
        response = await api.post("/assets", submitData);
        console.log('Asset created successfully:', response);
      }

      return Promise.resolve();
    } catch (error: any) {
      console.error('❌ Submission error:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error response:', error?.response);

      // Provide user-friendly error messages
      const errorMsg = error?.response?.data?.message || error?.message;
      if (errorMsg?.includes('orgUserId')) {
        throw new Error('Authentication error: User session may have expired. Please log in again.');
      }

      // If we have a specific 'error' field (validation message), use that
      if (error?.response?.data?.error) {
        throw new Error(error.response.data.error);
      }

      // If we have a response message, prefer throwing that as a clean Error to override generic axios messages
      if (error?.response?.data?.message) {
        throw new Error(error.response.data.message);
      }

      return Promise.reject(error);
    }
  },

  // Regular fields for the generic template (fallback if no wizard)
  fields: [
    { name: 'assetId', label: 'Asset ID', type: 'text', required: true },
    { name: 'plantId', label: 'Plant', type: 'select', required: true },
    { name: 'building', label: 'Building', type: 'text', required: true },
    { name: 'productCategoryId', label: 'Category', type: 'select', required: true },
    { name: 'productId', label: 'Product', type: 'select', required: true },
    { name: 'location', label: 'Location', type: 'text', required: true },
  ],

  transformResponse: (response: any) => {
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

    // Helper function to transform a single asset for edit mode
    const transformAssetForEdit = (asset: any) => {
      console.log('🔄 Transforming asset for edit/display:', asset);

      // Convert specValues array to specs object for form compatibility
      const specs: Record<string, string> = {};
      const specValuesArray = asset.spec_values || asset.specValues || [];

      if (Array.isArray(specValuesArray) && specValuesArray.length > 0) {
        console.log('🔄 Transforming specValues for edit:', specValuesArray);
        specValuesArray.forEach((spec: any) => {
          const specId = spec.spec_definition_id || spec.specDefinitionId;
          const specValue = spec.spec_value || spec.value;

          if (specId && specValue !== null && specValue !== undefined) {
            specs[specId] = specValue;
            console.log('✅ Loaded spec for edit:', { specId, specValue });
          }
        });
        console.log('📋 Final specs object for form:', specs);
      }

      // Handle testing schedule (can be object or nested)
      const testingSchedule = asset.testing_schedule || asset.testingSchedule || {};

      // Handle metadata (can be object or nested)
      const metadata = asset.metadata || {};

      return {
        ...asset,
        // IDs
        id: asset.id,
        assetId: asset.asset_code || asset.assetId,
        plantId: asset.plant_id || asset.plantId,
        buildingId: asset.building_id || asset.buildingId,
        floorId: asset.floor_id || asset.floorId,
        wingId: asset.wing_id || asset.wingId,
        productCategoryId: asset.category_id || asset.productCategoryId,
        productId: asset.product_id || asset.productId,
        manufacturerId: asset.manufacturer_id || asset.manufacturerId,

        // Format dates for date inputs
        manufacturingDate: formatDateForInput(asset.manufacturing_date || asset.manufacturingDate),
        installDate: formatDateForInput(asset.install_date || asset.installDate),
        warrantyEndDate: formatDateForInput(asset.warranty_end_date || asset.warrantyEndDate),

        // Testing schedule dates (from testing_schedule table)
        // lastHPTestDate: formatDateForInput(testingSchedule.last_hp_test_date || asset.lastHPTestDate),

        nextHPTestDate: formatDateForInput(testingSchedule.next_hp_test_due_date || asset.nextHPTestDate),
        testFrequencyMonths: testingSchedule.test_frequency_months || asset.testFrequencyMonths || "",

        // Metadata (from asset_metadata table)
        tag: metadata.tag || asset.tag || "",
        slNo: metadata.serial_number || asset.slNo || "",
        qrCodeUrl: metadata.qr_code_url || asset.qrCodeUrl || "",

        // Documents (from asset_documents table)
        documents: asset.documents || [],

        // Status fields - map from DB enum values
        status: asset.maintenance_status || asset.status || 'IN_HOUSE',
        healthStatus: asset.health_status || asset.healthStatus || 'HEALTHY',

        // Asset details
        type: asset.type || '',
        subType: asset.sub_type || asset.subType || '',
        location: asset.location || '',
        lifespanYears: asset.lifespan_years || asset.lifespanYears || '',

        // Geolocation
        lat: asset.latitude || asset.lat || '',
        long: asset.longitude || asset.long || '',

        // Convert specs array to object for form
        specs,
      };
    };

    // Handle single asset response (for edit mode or after creation)
    if (response.data && !Array.isArray(response.data)) {
      console.log('✅ Single asset response detected');
      return transformAssetForEdit(response.data);
    }

    if (response.asset && !Array.isArray(response.asset)) {
      console.log('✅ Single asset response (asset key) detected');
      return transformAssetForEdit(response.asset);
    }

    // Handle v2 API response format (response.assets)
    if (response.assets && Array.isArray(response.assets)) {
      console.log('✅ Processing response.assets:', response.assets.length, 'assets');
      const transformedAssets = response.assets.map((asset: any) => {
        // Flatten spec values for export - creates {specName} and {specName}_Unit columns
        const flattenedSpecs: Record<string, string> = {};
        const specValuesArray = asset.spec_values || asset.specValues || [];
        if (Array.isArray(specValuesArray)) {
          specValuesArray.forEach((spec: any) => {
            const specName = spec.specDefinition?.spec_name ||
              spec.specDefinition?.spec_label ||
              spec.spec_definition?.spec_name ||
              spec.spec_definition?.spec_label ||
              `Spec_${spec.spec_definition_id || spec.specDefinitionId}`;
            const specValue = spec.spec_value || spec.value || '';
            const specUnit = spec.unit || '';

            // Add spec value column
            flattenedSpecs[specName] = specValue;
            // Add unit column if spec has a unit
            if (specUnit) {
              flattenedSpecs[`${specName}_Unit`] = specUnit;
            }
          });
        }

        // Debug: Log first asset to see actual field names
        if (response.assets.indexOf(asset) === 0) {
          console.log('🔍 [Asset Transform Debug] Processing first asset:', asset);
          console.log('🔍 [Asset Transform Debug] asset.asset_code:', asset.asset_code);
          console.log('🔍 [Asset Transform Debug] asset.assetId:', asset.assetId);
          console.log('🔍 [Asset Transform Debug] asset.id:', asset.id);
        }

        // Resolve assetId from multiple possible field names
        const resolvedAssetId = asset.asset_code || asset.assetId || asset.asset_id || asset.name || asset.id || 'Unknown';

        if (response.assets.indexOf(asset) === 0) {
          console.log('🔍 [Asset Transform Debug] resolvedAssetId:', resolvedAssetId);
        }

        // Extract capacity from spec_values (look for spec definition with 'capacity' in the name)
        let capacityValue = '';
        if (Array.isArray(specValuesArray)) {
          const capacitySpec = specValuesArray.find((spec: any) => {
            const specName = spec.specDefinition?.spec_name ||
              spec.spec_definition?.spec_name ||
              spec.specDefinition?.spec_label ||
              spec.spec_definition?.spec_label || '';
            return specName.toLowerCase().includes('capacity');
          });
          if (capacitySpec) {
            const val = capacitySpec.spec_value || capacitySpec.value || '';
            const unit = capacitySpec.unit || '';
            capacityValue = unit ? `${val} ${unit}` : val;

            // Debug log for first asset
            if (response.assets.indexOf(asset) === 0) {
              console.log('🔍 [Capacity Extract] Found capacity spec:', capacitySpec);
              console.log('🔍 [Capacity Extract] Extracted capacity value:', capacityValue);
            }
          } else {
            // Debug log for first asset without capacity
            if (response.assets.indexOf(asset) === 0) {
              console.log('🔍 [Capacity Extract] No capacity spec found in spec_values:', specValuesArray);
            }
          }
        } else {
          // Debug log for first asset without spec_values array
          if (response.assets.indexOf(asset) === 0) {
            console.log('🔍 [Capacity Extract] spec_values is not an array:', specValuesArray);
          }
        }

        return {
          ...asset,
          ...flattenedSpecs, // Spread flattened specs for export
          id: asset.id,
          // Handle both snake_case and camelCase - use resolved value
          name: resolvedAssetId,
          assetId: resolvedAssetId,
          plantId: asset.plant_id || asset.plantId,
          buildingId: asset.building_id || asset.buildingId,
          floorId: asset.floor_id || asset.floorId,
          wingId: asset.wing_id || asset.wingId,
          // Handle building - can be object with building_name or string
          building: typeof asset.building === 'object'
            ? (asset.building?.building_name || asset.building?.name)
            : (asset.building || '-'),
          // Keep floor and wing objects for nested access
          floorRef: asset.floor || null,
          wingRef: asset.wing || null,
          // Flattened string fields for filtering (filter uses these IDs)
          floor: asset.floor?.floor_name || asset.floor?.name || '',
          wing: asset.wing?.wing_name || asset.wing?.name || '',
          plant: asset.plant?.plant_name || asset.plant?.plantName || '',
          category: asset.category?.category_name || asset.category?.categoryName || '',
          product: asset.product?.product_name || asset.product?.productName || '',
          manufacturer: asset.manufacturer?.name || '',
          // Add explicit name fields for filter compatibility
          plantName: asset.plant?.plant_name || asset.plant?.plantName || '',
          buildingName: typeof asset.building === 'object'
            ? (asset.building?.building_name || asset.building?.name)
            : (asset.building || ''),
          floorName: asset.floor?.floor_name || asset.floor?.name || '',
          wingName: asset.wing?.wing_name || asset.wing?.name || '',
          categoryName: asset.category?.category_name || asset.category?.categoryName || '',
          productName: asset.product?.product_name || asset.product?.productName || '',
          manufacturerName: asset.manufacturer?.name || '',
          location: asset.location || (asset.wing?.wing_name ? `${asset.floor?.floor_name || 'Floor'} - ${asset.wing.wing_name}` : asset.floor?.floor_name || asset.building?.building_name || '-'),
          // Status fields
          status: asset.status || 'ACTIVE',
          // Fix: Normalize health status for filtering matching
          healthStatus: (() => {
            const status = asset.health_status || asset.healthStatus || 'HEALTHY';
            const config = {
              'HEALTHY': 'Healthy', 'Healthy': 'Healthy',
              'NEEDS_ATTENTION': 'Needs Attention', 'AttentionRequired': 'Needs Attention',
              'NeedsAttention': 'Needs Attention', 'Needs Attention': 'Needs Attention', // Added variations
              'NOT_WORKING': 'Not Working', 'NotWorking': 'Not Working',
              'INVENTORY': 'Inventory',
              'OBSOLETE': 'Obsolete'
            };
            return (config as any)[status] || status;
          })(),
          maintenanceStatus: asset.maintenance_status || asset.maintenanceStatus || 'IN_HOUSE',
          // Keep nested objects for sorting and display
          categoryObj: asset.category || { category_name: '-', categoryName: '-' },
          productObj: asset.product || { product_name: '-', productName: '-' },
          plantObj: asset.plant || { plant_name: '-', plantName: '-' },
          manufacturerObj: asset.manufacturer || null,
          // Asset details
          type: asset.type || '',
          subType: asset.sub_type || asset.subType || '',
          // Dates
          manufacturingDate: asset.manufacturing_date || asset.manufacturingDate,
          installDate: asset.install_date || asset.installDate,
          warrantyEndDate: asset.warranty_end_date || asset.warrantyEndDate,
          lastRefillDate: (() => {
            // Extract latest date from testing_schedule.last_refill_date JSONB array
            const refillDates = asset.testing_schedule?.last_refill_date;
            if (Array.isArray(refillDates) && refillDates.length > 0) {
              return refillDates[refillDates.length - 1]; // Get latest date
            }
            return asset.last_refill_date || asset.lastRefillDate;
          })(),
          lifespanYears: asset.lifespan_years || asset.lifespanYears || '',
          // Geolocation
          latitude: asset.latitude || null,
          longitude: asset.longitude || null,
          // Documents and specs
          documents: asset.documents || [],
          capacity: capacityValue,
          specValues: asset.spec_values || asset.specValues || [],
          // Conditions - preserve the array as-is (can be null, empty array, or array of condition codes)
          conditions: asset.conditions || [],
          activeConditions: asset.conditions || [],
          // Timestamps
          createdAt: asset.created_at || asset.createdAt,
          updatedAt: asset.updated_at || asset.updatedAt,
        };
      });
      return { assets: transformedAssets };
    }

    // Handle normalized API response (response.data - current backend format)
    if (response.data && Array.isArray(response.data)) {
      console.log('✅ Processing response.data format:', response.data.length, 'assets');
      const transformedAssets = response.data.map((asset: any) => {
        const resolvedAssetId = asset.asset_code || asset.assetId || asset.asset_id || asset.name || asset.id || 'Unknown';

        // Extract capacity from spec_values
        const dataSpecValues = asset.spec_values || asset.specValues || [];
        let dataCapacityValue = '';
        if (Array.isArray(dataSpecValues)) {
          const capacitySpec = dataSpecValues.find((spec: any) => {
            const specName = spec.specDefinition?.spec_name ||
              spec.spec_definition?.spec_name ||
              spec.specDefinition?.spec_label ||
              spec.spec_definition?.spec_label || '';
            return specName.toLowerCase().includes('capacity');
          });
          if (capacitySpec) {
            const val = capacitySpec.spec_value || capacitySpec.value || '';
            const unit = capacitySpec.unit || '';
            dataCapacityValue = unit ? `${val} ${unit}` : val;

            // Debug log for first asset
            if (response.data.indexOf(asset) === 0) {
              console.log('🔍 [Capacity Extract DATA] Found capacity spec:', capacitySpec);
              console.log('🔍 [Capacity Extract DATA] Extracted capacity value:', dataCapacityValue);
            }
          } else {
            // Debug log for first asset without capacity
            if (response.data.indexOf(asset) === 0) {
              console.log('🔍 [Capacity Extract DATA] No capacity spec found in spec_values. Total specs:', dataSpecValues.length);
              if (dataSpecValues.length > 0) {
                console.log('🔍 [Capacity Extract DATA] First spec:', dataSpecValues[0]);
              }
            }
          }
        } else {
          // Debug log for first asset without spec_values array
          if (response.data.indexOf(asset) === 0) {
            console.log('🔍 [Capacity Extract DATA] spec_values is not an array:', dataSpecValues);
          }
        }

        return {
          ...asset,
          id: asset.id,
          name: resolvedAssetId,
          assetId: resolvedAssetId,
          asset_code: asset.asset_code,
          plantId: asset.plant_id || asset.plantId,
          buildingId: asset.building_id || asset.buildingId,
          floorId: asset.floor_id || asset.floorId,
          wingId: asset.wing_id || asset.wingId,
          building: typeof asset.building === 'object'
            ? (asset.building?.building_name || asset.building?.name)
            : (asset.building || '-'),
          floorRef: asset.floor || null,
          wingRef: asset.wing || null,
          floor: asset.floor?.floor_name || asset.floor?.name || '',
          wing: asset.wing?.wing_name || asset.wing?.name || '',
          plant: asset.plant?.plant_name || asset.plant?.plantName || '',
          category: asset.category?.category_name || asset.category?.categoryName || '',
          product: asset.product?.product_name || asset.product?.productName || '',
          manufacturer: asset.manufacturer?.name || '',
          // Add explicit name fields for filter compatibility
          plantName: asset.plant?.plant_name || asset.plant?.plantName || '',
          buildingName: typeof asset.building === 'object'
            ? (asset.building?.building_name || asset.building?.name)
            : (asset.building || ''),
          floorName: asset.floor?.floor_name || asset.floor?.name || '',
          wingName: asset.wing?.wing_name || asset.wing?.name || '',
          categoryName: asset.category?.category_name || asset.category?.categoryName || '',
          productName: asset.product?.product_name || asset.product?.productName || '',
          manufacturerName: asset.manufacturer?.name || '',
          location: asset.location || '-',
          status: asset.status || 'ACTIVE',
          healthStatus: (() => {
            const status = asset.health_status || asset.healthStatus || 'HEALTHY';
            const config = {
              'HEALTHY': 'Healthy', 'Healthy': 'Healthy',
              'NEEDS_ATTENTION': 'Needs Attention', 'AttentionRequired': 'Needs Attention',
              'NeedsAttention': 'Needs Attention', 'Needs Attention': 'Needs Attention',
              'NOT_WORKING': 'Not Working', 'NotWorking': 'Not Working',
              'INVENTORY': 'Inventory',
              'OBSOLETE': 'Obsolete'
            };
            return (config as any)[status] || status;
          })(),
          maintenanceStatus: asset.maintenance_status || asset.maintenanceStatus || 'IN_HOUSE',
          categoryObj: asset.category || { category_name: '-', categoryName: '-' },
          productObj: asset.product || { product_name: '-', productName: '-' },
          plantObj: asset.plant || { plant_name: '-', plantName: '-' },
          manufacturerObj: asset.manufacturer || null,
          type: asset.type || '',
          subType: asset.sub_type || asset.subType || '',
          manufacturingDate: asset.manufacturing_date || asset.manufacturingDate,
          installDate: asset.install_date || asset.installDate,
          warrantyEndDate: asset.warranty_end_date || asset.warrantyEndDate,
          lastRefillDate: (() => {
            const refillDates = asset.testing_schedule?.last_refill_date;
            if (Array.isArray(refillDates) && refillDates.length > 0) {
              return refillDates[refillDates.length - 1];
            }
            return asset.last_refill_date || asset.lastRefillDate;
          })(),
          lifespanYears: asset.lifespan_years || asset.lifespanYears || '',
          // Geolocation
          latitude: asset.latitude || null,
          longitude: asset.longitude || null,
          documents: asset.documents || [],
          capacity: dataCapacityValue,
          specValues: asset.spec_values || asset.specValues || [],
          conditions: asset.conditions || [],
          activeConditions: asset.conditions || [],
          createdAt: asset.created_at || asset.createdAt,
          updatedAt: asset.updated_at || asset.updatedAt,
        };
      });
      return { assets: transformedAssets };
    }

    // Handle direct array response
    if (Array.isArray(response)) {
      const transformedAssets = response.map((asset: any) => ({
        ...asset,
        id: asset.id,
        name: asset.assetId,
        assetId: asset.assetId,
        plantId: asset.plantId,
        building: asset.building || '-',
        location: asset.location || '-',
        status: asset.status || 'Active',
        // Fix: Normalize health status for filtering matching
        healthStatus: (() => {
          const status = asset.health_status || asset.healthStatus || 'HEALTHY';
          const config = {
            'HEALTHY': 'Healthy', 'Healthy': 'Healthy',
            'NEEDS_ATTENTION': 'Needs Attention', 'AttentionRequired': 'Needs Attention',
            'NOT_WORKING': 'Not Working', 'NotWorking': 'Not Working',
            'INVENTORY': 'Inventory',
            'OBSOLETE': 'Obsolete'
          };
          return (config as any)[status] || status;
        })(),
        // Fix: Normalize maintenance status
        maintenanceStatus: (() => {
          const status = asset.maintenance_status || asset.maintenanceStatus || 'IN_HOUSE';
          const config = {
            'IN_HOUSE': 'In-House',
            'UNDER_WARRANTY': 'Under Warranty',
            'OUT_OF_WARRANTY': 'Out of Warranty',
            'UNDER_AMC': 'Under AMC',
            'OUT_OF_AMC': 'Out of AMC'
          };
          return (config as any)[status] || status;
        })(),
        category: asset.category || { categoryName: '-' },
        product: asset.product || { productName: '-' },
        plant: asset.plant || { plantName: '-' },
        manufacturer: asset.manufacturer || null,
        conditions: asset.conditions || [],
        activeConditions: asset.conditions || [],
      }));
      return { assets: transformedAssets };
    }

    // Fallback for empty or unknown format
    console.log('⚠️ Unknown response format, returning empty assets array');
    return { assets: [] };
  },

  // Custom bulk actions for assets - triggers modal
  customBulkActions: [
    {
      label: 'Print QR Labels',
      icon: <Printer className="h-4 w-4 mr-1" />,
      variant: 'outline' as const,
      onClick: async (selectedIds: string[], entities: any[]) => {
        // Store selected data in window to be picked up by modal
        (window as any).__qrPrintModalData = {
          selectedIds,
          selectedEntities: entities,
          isOpen: true
        };
        // Dispatch custom event to open modal
        window.dispatchEvent(new CustomEvent('openQRPrintModal'));
      }
    }
  ],


  customColumns: (entity: any, isVisible?: (field: string) => boolean) => {
    const asset = entity as Asset;

    // Get condition display
    const conditionsArray = asset.conditions || asset.activeConditions || [];
    const conditionDisplay = Array.isArray(conditionsArray) && conditionsArray.length > 0
      ? conditionsArray.slice(0, 2).join(', ') + (conditionsArray.length > 2 ? ` +${conditionsArray.length - 2}` : '')
      : '-';

    // Health status with colors
    const healthStatus = asset.health_status || asset.healthStatus || 'HEALTHY';
    const healthConfig: { [key: string]: { text: string; color: string } } = {
      'HEALTHY': { text: 'Healthy', color: 'text-green-600' },
      'Healthy': { text: 'Healthy', color: 'text-green-600' },
      'NEEDS_ATTENTION': { text: 'Needs Attention', color: 'text-orange-600' },
      'AttentionRequired': { text: 'Attention Required', color: 'text-orange-600' },
      'NOT_WORKING': { text: 'Not Working', color: 'text-red-600' },
      'NotWorking': { text: 'Not Working', color: 'text-red-600' },
      'INVENTORY': { text: 'Inventory', color: 'text-blue-600' },
      'OBSOLETE': { text: 'Obsolete', color: 'text-gray-500' },
    };
    const healthInfo = healthConfig[healthStatus] || { text: healthStatus, color: 'text-gray-600' };

    // Maintenance status with colors
    const maintenanceStatus = asset.maintenance_status || asset.maintenanceStatus || 'IN_HOUSE';
    const maintenanceConfig: { [key: string]: { text: string; color: string } } = {
      'IN_HOUSE': { text: 'In-House', color: 'text-amber-600' },
      'UNDER_WARRANTY': { text: 'Under Warranty', color: 'text-blue-600' },
      'OUT_OF_WARRANTY': { text: 'Out of Warranty', color: 'text-orange-600' },
      'UNDER_AMC': { text: 'Under AMC', color: 'text-green-600' },
      'OUT_OF_AMC': { text: 'Out of AMC', color: 'text-red-600' },
    };
    const maintenanceInfo = maintenanceConfig[maintenanceStatus] || { text: maintenanceStatus, color: 'text-gray-600' };

    // Asset status with colors
    const assetStatus = asset.status || 'ACTIVE';
    const isActive = assetStatus === 'ACTIVE';
    const statusText = isActive ? 'Active' : 'Deactive';
    const statusColor = isActive ? 'text-green-600' : 'text-red-600';

    // Helper to check visibility (defaults to true if isVisible not provided)
    const checkVisible = (field: string) => !isVisible || isVisible(field);

    // Date formatter - dd/mm/yyyy format
    const formatDate = (dateStr: string | Date | null | undefined) => {
      if (!dateStr) return '-';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '-';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return '-';
      }
    };

    return (
      <>
        {checkVisible('assetId') && <TableCell className="font-medium bg-white md:sticky md:left-0 z-10 min-w-[120px] md:border-r border-gray-100 whitespace-nowrap">{asset.assetId || asset.asset_code || '-'}</TableCell>}
        {checkVisible('plant') && <TableCell className="whitespace-nowrap">{asset.plant?.plantName || asset.plant?.plant_name || '-'}</TableCell>}
        {checkVisible('building') && <TableCell className="whitespace-nowrap">{typeof asset.building === 'object' ? (asset.building as any)?.building_name || (asset.building as any)?.buildingName || (asset.building as any)?.name : asset.building || '-'}</TableCell>}
        {checkVisible('floor') && <TableCell className="whitespace-nowrap">{asset.floor?.floor_name || asset.floor?.floorName || '-'}</TableCell>}
        {checkVisible('wing') && <TableCell className="whitespace-nowrap">{asset.wing?.wing_name || asset.wing?.wingName || '-'}</TableCell>}
        {checkVisible('category') && <TableCell className="whitespace-nowrap">{asset.category?.categoryName || asset.category?.category_name || '-'}</TableCell>}
        {checkVisible('product') && <TableCell className="whitespace-nowrap">{asset.product?.productName || asset.product?.product_name || '-'}</TableCell>}
        {checkVisible('manufacturer') && <TableCell className="whitespace-nowrap">{asset.manufacturer?.name || '-'}</TableCell>}
        {checkVisible('type') && <TableCell className="whitespace-nowrap">{asset.type || '-'}</TableCell>}
        {checkVisible('subType') && <TableCell className="whitespace-nowrap">{asset.sub_type || asset.subType || '-'}</TableCell>}
        {checkVisible('location') && <TableCell className="whitespace-nowrap max-w-xs truncate">{asset.location || '-'}</TableCell>}
        {checkVisible('manufacturingDate') && <TableCell className="text-sm whitespace-nowrap">{formatDate(asset.manufacturing_date || asset.manufacturingDate)}</TableCell>}
        {checkVisible('installDate') && <TableCell className="text-sm whitespace-nowrap">{formatDate(asset.install_date || asset.installDate)}</TableCell>}
        {checkVisible('warrantyEndDate') && <TableCell className="text-sm whitespace-nowrap">{formatDate(asset.warranty_end_date || asset.warrantyEndDate)}</TableCell>}
        {checkVisible('lifespanYears') && <TableCell className="text-sm whitespace-nowrap">{asset.lifespan_years || asset.lifespanYears || '-'}</TableCell>}
        {checkVisible('lastRefillDate') && <TableCell className="text-sm whitespace-nowrap">{formatDate((() => {
          // Extract latest date from testing_schedule.last_refill_date JSONB array
          const refillDates = asset.testing_schedule?.last_refill_date;
          if (Array.isArray(refillDates) && refillDates.length > 0) {
            return refillDates[refillDates.length - 1]; // Get latest date
          }
          return asset.last_refill_date || asset.lastRefillDate;
        })())}</TableCell>}

        {checkVisible('healthStatus') && <TableCell className={`text-sm font-medium whitespace-nowrap ${healthInfo.color}`}>{healthInfo.text}</TableCell>}
        {checkVisible('maintenanceStatus') && <TableCell className={`text-sm font-medium whitespace-nowrap ${maintenanceInfo.color}`}>{maintenanceInfo.text}</TableCell>}
        {checkVisible('status') && <TableCell className={`text-sm font-medium whitespace-nowrap ${statusColor}`}>{statusText}</TableCell>}
        {checkVisible('conditions') && <TableCell className="text-sm text-gray-600 whitespace-nowrap">{conditionDisplay}</TableCell>}
        {checkVisible('createdAt') && <TableCell className="text-sm whitespace-nowrap">{formatDate(asset.created_at || asset.createdAt)}</TableCell>}
        {checkVisible('updatedAt') && <TableCell className="text-sm whitespace-nowrap">{formatDate(asset.updated_at || asset.updatedAt)}</TableCell>}
      </>
    );
  },

  transformData: (formData: any) => {
    // Remove any UI-specific fields that shouldn't be sent to backend
    const { currentRole, productVariants, variants, ...apiData } = formData;

    // Ensure required fields have default values
    if (!apiData.maintenanceStatus) {
      apiData.maintenanceStatus = 'IN_HOUSE';
    }

    if (!apiData.healthStatus) {
      apiData.healthStatus = 'HEALTHY';
    }

    // Remove any undefined, null, or empty string values
    // IMPORTANT: For optional fields like 'tag', only remove if undefined/null, keep empty strings
    Object.keys(apiData).forEach(key => {
      const value = apiData[key];
      if (value === undefined || value === null) {
        delete apiData[key];
      }
      // For optional string fields that must be strings (not null), convert empty to valid string
      if (key === 'tag' && value === '') {
        // Keep as empty string, backend expects string type
        apiData[key] = '';
      }
    });

    return apiData;
  },

  // Custom action buttons for each asset row - moved to separate component below
  customActions: (asset: any) => <AssetCustomActions asset={asset} />
};

// Separate component for custom actions with proper hooks usage
function AssetCustomActions({ asset }: { asset: any }) {
  const [open, setOpen] = useState(false);

  // Generate QR code value using shared utility
  const qrValue = generateAssetQRValue(asset);

  const handleViewAsset = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Detect current route context to navigate to correct view page
    const currentPath = window.location.pathname;
    const isManagerContext = currentPath.startsWith('/manager');
    const basePath = isManagerContext ? '/manager' : '/admin';
    window.location.href = `${basePath}/assets/${asset.id}`;
  };

  const handleDownloadQR = async () => {
    // Use bulk QR service with 1x1 grid for uniformity
    try {
      const baseURL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
      const token = localStorage.getItem('accessToken');
      const displayId = asset.assetCode || asset.asset_code || asset.assetId || asset.id;

      const response = await fetch(`${baseURL}/assets/bulk-qr-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          asset_ids: [asset.id],
          columns: 1,
          rows: 1
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR label');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR-Label-${displayId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "QR Label Downloaded",
        description: "QR label saved successfully",
      });
    } catch (error) {
      console.error('QR download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download QR label",
        variant: "destructive",
      });
    }
  };

  const handlePrintQR = async () => {
    // Use bulk QR service with 1x1 grid for uniformity
    try {
      const baseURL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${baseURL}/assets/bulk-qr-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          asset_ids: [asset.id],
          columns: 1,
          rows: 1
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR label');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Open PDF in new window for printing
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }

      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error('QR print error:', error);
      toast({
        title: "Print Failed",
        description: "Failed to print QR label",
        variant: "destructive",
      });
    }
  };

  // Show button for all assets - generate QR on the fly
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="mr-2"
        title="View Asset Details"
        onClick={handleViewAsset}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); }}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="mr-2"
            title="View QR Code"
            onClick={(e) => e.stopPropagation()}
          >
            <QrCode className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Asset QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to view asset details or print a label
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="w-full border border-gray-300 rounded-xl p-4 bg-white max-w-[320px] mx-auto relative overflow-hidden">
              <div className="text-center mb-2 border-b border-gray-100 pb-2">
                <h3 className="text-xl font-bold tracking-tight text-gray-900">{asset.assetId || asset.asset_code || asset.id}</h3>
              </div>

              <div className="flex justify-center mb-4 relative">
                <QRCodeSVG
                  id={`qr-code-${asset.id}`}
                  value={qrValue}
                  size={240}
                  level="H"
                  includeMargin={false}
                  fgColor="#FF6B35"
                />
              </div>

              <div className="space-y-1 text-left text-base font-semibold text-gray-700 leading-tight w-[240px] mx-auto">
                {/* Product */}
                <p className="truncate">{asset.product?.productName || asset.product?.product_name || asset.product?.name || '-'}</p>

                {/* Type */}
                <p className="truncate">{(asset as any).type || '-'}</p>

                {/* Capacity */}
                <p className="truncate">
                  {(() => {
                    const specArray = asset.specValues || (asset as any).spec_values || [];
                    const capacitySpec = specArray.find((sv: any) => {
                      const def = sv.specDefinition || sv.spec_definition;
                      if (!def) return false;
                      const specName = def.spec_name || def.specName || def.name || def.spec_label || def.specLabel || '';
                      return specName.toLowerCase().trim() === 'capacity';
                    });
                    const val = capacitySpec?.spec_value || capacitySpec?.value || null;
                    let unit = '';
                    if (capacitySpec?.unit) {
                      unit = capacitySpec.unit;
                    } else {
                      const def = capacitySpec?.specDefinition || capacitySpec?.spec_definition;
                      const specUnit = def?.spec_unit;
                      if (typeof specUnit === 'string') {
                        unit = specUnit;
                      } else if (Array.isArray(specUnit) && specUnit.length > 0) {
                        unit = specUnit[0];
                      }
                    }
                    return val ? `${val} ${unit}`.trim() : '-';
                  })()}
                </p>

                {/* Building */}
                <p className="truncate">
                  {typeof asset.building === 'object' ? (asset.building?.buildingName || asset.building?.building_name || asset.building?.name || '-') : (asset.building || '-')}
                </p>

                {/* Location */}
                <p className="truncate">{asset.location || '-'}</p>
              </div>

              {/* Powered By Footer */}
              <div className="border-t border-gray-200 mt-4 pt-3 flex items-baseline justify-center gap-1.5">
                <span className="text-sm font-medium text-gray-500">Powered by</span>
                <span className="text-2xl font-bold" style={{ color: '#FF6B35' }}>
                  Firedesk<sup className="text-[12px] font-medium" style={{ color: '#FF6B35' }}>™</sup>
                </span>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                onClick={(e) => { e.stopPropagation(); handlePrintQR(); }}
                variant="default"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                Print Label
              </Button>
              <Button
                onClick={(e) => { e.stopPropagation(); handleDownloadQR(); }}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Scanning this QR code will open the full asset details page
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
// QR Print Configuration Modal Component - exported for manager page
export function QRPrintModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(5);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAssets, setIsFetchingAssets] = useState(false);
  const [allSelectedAssets, setAllSelectedAssets] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Extract unique categories from selected assets
  const categories = useMemo(() => {
    if (allSelectedAssets.length === 0) return [];

    const categoryMap = new Map();
    allSelectedAssets.forEach(asset => {
      const categoryId = asset.category?.id;
      if (categoryId && !categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: asset.category.category_name || asset.category.categoryName || 'Unknown'
        });
      }
    });

    return Array.from(categoryMap.values());
  }, [allSelectedAssets]);

  // Filter assets by category if selected
  const filteredAssetIds = selectedCategory
    ? allSelectedAssets
      .filter(e => e.category?.id === selectedCategory)
      .map(e => e.id)
    : selectedIds;

  // Fetch ALL selected assets (supports large selections via POST)
  const fetchAllSelectedAssets = async (ids: string[]) => {
    if (ids.length === 0) return;

    setIsFetchingAssets(true);
    try {
      // Use POST to avoid URL length limits with large ID lists
      const baseURL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${baseURL}/assets/bulk-fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ asset_ids: ids }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      const data = await response.json();
      const assets = data.data || data.assets || [];
      setAllSelectedAssets(assets);
    } catch (error) {
      console.error('Failed to fetch selected assets:', error);
      toast({
        title: "Warning",
        description: "Could not load category filters. You can still print all selected assets.",
        variant: "destructive",
      });
      setAllSelectedAssets([]);
    } finally {
      setIsFetchingAssets(false);
    }
  };

  useEffect(() => {
    const handleOpenModal = () => {
      const data = (window as any).__qrPrintModalData;
      if (data) {
        setSelectedIds(data.selectedIds);
        setIsOpen(true);
        setColumns(4);
        setRows(5);
        setSelectedCategory('');
        setAllSelectedAssets([]);
        // Fetch ALL selected assets with full data
        fetchAllSelectedAssets(data.selectedIds);
      }
    };

    window.addEventListener('openQRPrintModal', handleOpenModal);
    return () => window.removeEventListener('openQRPrintModal', handleOpenModal);
  }, []);

  const handlePrint = async () => {
    if (filteredAssetIds.length === 0) {
      toast({
        title: "No Assets",
        description: "No assets to print. Please check your selection.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      toast({
        title: "Generating QR Labels",
        description: `Preparing ${filteredAssetIds.length} QR labels (${columns}x${rows} grid)...`,
      });

      const baseURL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${baseURL}/assets/bulk-qr-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          asset_ids: filteredAssetIds,
          columns,
          rows,
          category_id: selectedCategory || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Detect file type from Content-Type header
      const contentType = response.headers.get('Content-Type');
      const isZip = contentType?.includes('application/zip');
      const extension = isZip ? 'zip' : 'pdf';

      link.download = `asset_qr_labels_${columns}x${rows}_${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "QR Labels Generated",
        description: `Successfully generated ${isZip ? 'ZIP with multiple PDFs' : 'PDF'} with ${filteredAssetIds.length} QR labels.`,
      });

      setIsOpen(false);
    } catch (error: any) {
      console.error('Bulk print QR error:', error);
      toast({
        title: "QR Print Failed",
        description: error.message || "Failed to generate QR labels PDF.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const gridOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print QR Labels</DialogTitle>
          <DialogDescription>
            Configure layout for {filteredAssetIds.length} QR code labels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Grid Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Columns (per row)</label>
              <select
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              >
                {gridOptions.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rows (per page)</label>
              <select
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              >
                {gridOptions.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Categories ({selectedIds.length} assets)</option>
                {categories.map((cat: any) => {
                  const count = allSelectedAssets.filter(e => e.category?.id === cat.id).length;
                  return (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({count} assets)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Preview Info */}
          <div className="bg-gray-50 p-3 rounded-md text-sm">
            <div className="flex justify-between">
              <span>Layout:</span>
              <span className="font-medium">{columns} × {rows} = {columns * rows} labels per page</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Assets to print:</span>
              <span className="font-medium">{filteredAssetIds.length}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Pages needed:</span>
              <span className="font-medium">{Math.ceil(filteredAssetIds.length / (columns * rows))}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={isLoading || filteredAssetIds.length === 0}>
            {isLoading ? 'Generating...' : `Print ${filteredAssetIds.length} Labels`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Assets() {
  // Enable automatic plant filter in GenericEntityPage
  const configWithPlantFilter = useMemo<EntityConfig>(() => ({
    ...assetsConfig,
    enablePlantFilter: true,
  }), []);

  return (
    <>
      <GenericEntityPage config={configWithPlantFilter} />
      <QRPrintModal />
    </>
  );
}