import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Check, CalendarIcon } from "lucide-react";
import { api } from "@/lib/api";
import { usePlantFilter } from "@/contexts/PlantFilterContext";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AssetInfoStepProps {
  formData: any;
  setFormData: (data: any) => void;
  plants: any[];
  categories: any[];
  products: any[];
  isUpdateMode?: boolean;
}

// Simple Autocomplete Input Component
const AutocompleteInput = ({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && options.length > 0) {
      const filtered = options.filter(opt =>
        opt.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => !disabled && setIsOpen(true)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
              onClick={() => handleSelect(option)}
            >
              <span>{option}</span>
              {value === option && <Check className="h-4 w-4 text-blue-600" />}
            </div>
          ))}
          {!options.includes(value) && value.trim() !== '' && (
            <div className="px-3 py-2 border-t bg-blue-50 text-blue-600 text-sm">
              Press Enter to create "{value}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper: Date Input Component (using Popover + Calendar like PremiumReportModal)
// Helper: Date Input Component (using Popover + Calendar like PremiumReportModal)
const DateInput = ({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={isOpen} onOpenChange={(open) => {
        if (!disabled) {
          setIsOpen(open);
          if (open) setTempDate(value ? new Date(value.split('T')[0]) : undefined);
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              disabled && "bg-gray-100 cursor-not-allowed"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? (
              format(new Date(value.split('T')[0]), "PPP")
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
            initialFocus
            disabled={disabled}
          />
          <div className="flex items-center justify-end gap-2 p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempDate(value ? new Date(value.split('T')[0]) : undefined);
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
      {helperText && (
        <p className="text-xs text-blue-600 mt-1">{helperText}</p>
      )}
    </div>
  );
};

export function AssetInfoStep({
  formData,
  setFormData,
  plants,
  categories,
  products,
  isUpdateMode = false,
}: AssetInfoStepProps) {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [loadingWings, setLoadingWings] = useState(false);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableSubTypes, setAvailableSubTypes] = useState<string[]>([]);
  const [schedulerData, setSchedulerData] = useState<any>(null);
  const [loadingScheduler, setLoadingScheduler] = useState(false);

  // Plant-specific categories and products
  const [plantCategories, setPlantCategories] = useState<any[]>([]);
  const [plantProducts, setPlantProducts] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Get global plant filter
  const { selectedPlantId } = usePlantFilter();
  const [hasAutoFilledPlant, setHasAutoFilledPlant] = React.useState(false);

  // Set default values for required fields if not set
  useEffect(() => {
    if (!formData.status) {
      setFormData({ ...formData, status: 'In-House' });
    }
  }, []); // Run once on mount

  // Debug: Log formData when it changes
  useEffect(() => {
    console.log('=== ASSET INFO: FormData changed ===', {
      plantId: formData?.plantId,
      buildingId: formData?.buildingId,
      floorId: formData?.floorId,
      wingId: formData?.wingId,
      productCategoryId: formData?.productCategoryId,
      productId: formData?.productId,
      status: formData?.status,
    });
  }, [formData]);

  // Debug: Log when dropdown arrays change
  useEffect(() => {
    console.log('=== ASSET INFO: Buildings array changed ===', buildings.length, buildings);
  }, [buildings]);

  useEffect(() => {
    console.log('=== ASSET INFO: Floors array changed ===', floors.length, floors);
  }, [floors]);

  useEffect(() => {
    console.log('=== ASSET INFO: Wings array changed ===', wings.length, wings);
  }, [wings]);

  // Fetch product variants when product changes
  useEffect(() => {
    const fetchProductVariants = async () => {
      if (formData.productId) {
        try {
          // Use the new types-subtypes endpoint
          const response: any = await api.get(`/master-data/products/${formData.productId}/types-subtypes`);
          if (response.success) {
            // Extract types from the response
            const types = response.types || [];
            const subTypesMap = response.subTypesMap || {};

            setAvailableTypes(types);
            // Store the subtype map for later use
            setProductVariants([{ typesMap: subTypesMap }]);

            // If a type is already selected, set its subtypes
            if (formData.type && subTypesMap[formData.type]) {
              setAvailableSubTypes(subTypesMap[formData.type]);
            } else {
              // Show all subtypes if no type is selected
              setAvailableSubTypes(response.allSubTypes || []);
            }
          }
        } catch (error) {
          console.error('Failed to fetch product variants:', error);
          setProductVariants([]);
          setAvailableTypes([]);
          setAvailableSubTypes([]);
        }
      } else {
        setProductVariants([]);
        setAvailableTypes([]);
        setAvailableSubTypes([]);
      }
    };

    fetchProductVariants();
  }, [formData.productId]);

  // Update available subtypes when type changes
  useEffect(() => {
    if (formData.type && productVariants.length > 0 && productVariants[0].typesMap) {
      const subTypesMap = productVariants[0].typesMap;
      if (subTypesMap[formData.type]) {
        setAvailableSubTypes(subTypesMap[formData.type]);
      } else {
        setAvailableSubTypes([]);
      }
    }
  }, [formData.type, productVariants]);

  // Fetch buildings and plant-specific categories when plant changes
  useEffect(() => {
    console.log('=== ASSET INFO: Plant changed ===', formData.plantId);
    if (formData.plantId) {
      console.log('=== ASSET INFO: Fetching buildings for plant ===', formData.plantId);
      fetchBuildings(formData.plantId);
      // Find and set selected plant for display
      const plant = plants.find(p => p.id === formData.plantId);
      setSelectedPlant(plant);

      // Fetch plant-specific categories
      fetchPlantCategories(formData.plantId);
    } else {
      setBuildings([]);
      setSelectedPlant(null);
      setPlantCategories([]);
    }
  }, [formData.plantId, plants]);

  // Fetch floors when building changes
  useEffect(() => {
    console.log('=== ASSET INFO: Building changed ===', formData.buildingId);
    if (formData.buildingId) {
      console.log('=== ASSET INFO: Fetching floors for building ===', formData.buildingId);
      fetchFloors(formData.buildingId);
    } else {
      setFloors([]);
    }
  }, [formData.buildingId]);

  // Fetch wings when floor changes
  useEffect(() => {
    console.log('=== ASSET INFO: Floor changed ===', formData.floorId);
    if (formData.floorId) {
      console.log('=== ASSET INFO: Fetching wings for floor ===', formData.floorId);
      fetchWings(formData.floorId);
    } else {
      setWings([]);
    }
  }, [formData.floorId]);

  // Fetch products when category changes
  useEffect(() => {
    if (formData.productCategoryId) {
      console.log('=== ASSET INFO: Category changed, fetching products ===', formData.productCategoryId);
      fetchCategoryProducts(formData.productCategoryId);
    } else {
      setPlantProducts([]);
    }
  }, [formData.productCategoryId]);

  // Fetch scheduler data when plant and category are selected
  // NOTE: This route doesn't exist in backend yet - commented out to avoid 404 errors
  useEffect(() => {
    const fetchSchedulerData = async () => {
      if (formData.plantId && formData.productCategoryId) {
        setLoadingScheduler(true);
        try {
          // TODO: Scheduler route not implemented in backend
          // const response: any = await api.get(`/organisation/plant/${formData.plantId}/scheduler?category=${formData.productCategoryId}`);
          // if (response.success && response.data && response.data.length > 0) {
          //   const scheduler = response.data[0];
          //   setSchedulerData(scheduler);
          //   if (scheduler.startDate && scheduler.endDate) {
          //     setFormData((prev: any) => ({
          //       ...prev,
          //       amcStartDate: prev.amcStartDate || scheduler.startDate,
          //       amcEndDate: prev.amcEndDate || scheduler.endDate
          //     }));
          //   }
          // } else {
          //   setSchedulerData(null);
          // }
          setSchedulerData(null); // Temporarily set to null until backend route exists
        } catch (error) {
          // Silently fail - scheduler is optional
          setSchedulerData(null);
        } finally {
          setLoadingScheduler(false);
        }
      } else {
        setSchedulerData(null);
      }
    };

    fetchSchedulerData();
  }, [formData.plantId, formData.productCategoryId]);

  const fetchBuildings = async (plantId: string) => {
    setLoadingBuildings(true);
    try {
      console.log('=== ASSET INFO: Calling /buildings API ===', plantId);
      const response: any = await api.get(`/buildings?plantId=${plantId}`);
      console.log('=== ASSET INFO: Buildings response ===', response);
      if (response.success && response.data) {
        console.log('=== ASSET INFO: Setting buildings ===', response.data.length, 'buildings');
        setBuildings(response.data);
      } else {
        console.warn('=== ASSET INFO: No buildings data in response ===');
        setBuildings([]);
      }
    } catch (error) {
      console.error('Failed to fetch buildings:', error);
      setBuildings([]);
    } finally {
      setLoadingBuildings(false);
    }
  };

  // Fetch plant-specific categories
  const fetchPlantCategories = async (plantId: string) => {
    setLoadingCategories(true);
    try {
      console.log('=== ASSET INFO: Fetching categories for plant ===', plantId);
      const response: any = await api.get(`/master-data/categories?plantId=${plantId}`);
      console.log('=== ASSET INFO: Categories response ===', response);

      // Handle various response formats
      const categoriesData = response.categories || response.data || response.allCategory || [];
      console.log('=== ASSET INFO: Setting plant categories ===', categoriesData.length, 'categories');
      setPlantCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch plant categories:', error);
      // Fallback to props categories if API fails
      setPlantCategories(categories);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch products by selected category
  const fetchCategoryProducts = async (categoryId: string) => {
    setLoadingProducts(true);
    try {
      console.log('=== ASSET INFO: Fetching products for category ===', categoryId);
      const response: any = await api.get(`/master-data/products/category/${categoryId}`);
      console.log('=== ASSET INFO: Products response ===', response);

      // Handle various response formats
      const productsData = response.products || response.data || [];
      console.log('=== ASSET INFO: Setting category products ===', productsData.length, 'products');
      setPlantProducts(productsData);
    } catch (error) {
      console.error('Failed to fetch category products:', error);
      // Fallback to filtered props products
      const filtered = products.filter((p: any) => p.categoryId === categoryId || p.category_id === categoryId);
      setPlantProducts(filtered);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchFloors = async (buildingId: string) => {
    setLoadingFloors(true);
    try {
      console.log('=== ASSET INFO: Calling /floors API ===', buildingId);
      const response: any = await api.get(`/floors?buildingId=${buildingId}`);
      console.log('=== ASSET INFO: Floors response ===', response);
      if (response.success && response.data) {
        console.log('=== ASSET INFO: Setting floors ===', response.data.length, 'floors');
        setFloors(response.data);
      } else {
        console.warn('=== ASSET INFO: No floors data in response ===');
        setFloors([]);
      }
    } catch (error) {
      console.error('Failed to fetch floors:', error);
      setFloors([]);
    } finally {
      setLoadingFloors(false);
    }
  };

  const fetchWings = async (floorId: string) => {
    setLoadingWings(true);
    try {
      console.log('=== ASSET INFO: Getting wings for floor ===', floorId);
      // Wings are included in the floor response, so find the floor and extract wings
      const selectedFloor = floors.find((f: any) => f.id === floorId);
      if (selectedFloor && selectedFloor.wings) {
        console.log('=== ASSET INFO: Found wings in floor ===', selectedFloor.wings.length, 'wings');
        setWings(selectedFloor.wings);
      } else {
        // Fallback: Try fetching floor by ID to get wings
        console.log('=== ASSET INFO: Wings not cached, fetching floor details ===');
        try {
          const response: any = await api.get(`/floors/${floorId}`);
          if (response.success && response.data?.wings) {
            console.log('=== ASSET INFO: Got wings from floor API ===', response.data.wings.length);
            setWings(response.data.wings);
          } else {
            setWings([]);
          }
        } catch {
          console.warn('=== ASSET INFO: Could not fetch floor details ===');
          setWings([]);
        }
      }
    } catch (error) {
      console.error('Failed to get wings:', error);
      setWings([]);
    } finally {
      setLoadingWings(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  // Handle type change - clear subtype when type changes
  const handleTypeChange = (type: string) => {
    setFormData({ ...formData, type, subType: "" });
  };

  // Get subtypes for the selected type
  const getSubTypesForSelectedType = (): string[] => {
    if (!formData.type) {
      return availableSubTypes; // Show all if no type selected
    }

    // Get subtypes from the typesMap
    if (productVariants.length > 0 && productVariants[0].typesMap) {
      const subTypesMap = productVariants[0].typesMap;
      return subTypesMap[formData.type] || [];
    }

    return [];
  };

  // Handle plant change - reset cascading fields
  const handlePlantChange = (plantId: string) => {
    setFormData({
      ...formData,
      plantId,
      building: "",
      buildingId: "",
      floorId: "",
      wingId: "",
    });
  };

  // Handle building change - reset floor and wing
  const handleBuildingChange = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    setFormData({
      ...formData,
      buildingId,
      building: building?.buildingName || "",
      floorId: "",
      wingId: "",
    });
  };

  // Handle floor change - reset wing
  const handleFloorChange = (floorId: string) => {
    setFormData({
      ...formData,
      floorId,
      wingId: "",
    });
  };

  // Handle category change - clear product when category changes
  const handleCategoryChange = (categoryId: string) => {
    // Check if category is actually changing
    const isCategoryChanging = formData.productCategoryId !== categoryId;

    // If category is not changing, just return (no updates needed)
    if (!isCategoryChanging) {
      return;
    }

    // Check if we have existing specs
    const hasExistingSpecs = formData.specs && Object.keys(formData.specs).length > 0;

    // If category is changing and we have specs, show confirmation dialog
    if (isCategoryChanging && hasExistingSpecs) {
      const confirmed = window.confirm(
        "Changing the product category will clear all technical specifications. Do you want to continue?"
      );

      if (!confirmed) {
        return; // Don't change category
      }
    }

    // Category is changing (and user confirmed if needed), so update formData
    setFormData({
      ...formData,
      productCategoryId: categoryId,
      productId: "", // Clear product selection when category changes
      specs: {}, // Clear specs when category changes
    });
  };

  // Handle QR code file upload
  const handleQRCodeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setQrCodePreview(base64String);
        setFormData({ ...formData, qrCodeUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeQRCode = () => {
    setQrCodePreview(null);
    setFormData({ ...formData, qrCodeUrl: "" });
  };

  // Filter products by selected category - use API-fetched plantProducts or fallback to props
  const filteredProducts = formData.productCategoryId
    ? (plantProducts.length > 0
      ? plantProducts
      : products.filter((prod) => {
        const prodCatId = String(prod.categoryId || prod.category_id || "");
        const selectedCatId = String(formData.productCategoryId || "");
        return prodCatId === selectedCatId;
      })
    )
    : [];

  // Filter categories by selected plant - use API-fetched plantCategories or fallback to props filtering
  const filteredCategories = formData.plantId
    ? (plantCategories.length > 0
      ? plantCategories
      : categories.filter((cat) => {
        // If category has plants array (from association), check if selected plant is in it
        if (cat.plants && Array.isArray(cat.plants)) {
          return cat.plants.some((p: any) => String(p.id) === String(formData.plantId));
        }
        // If no plants array, show all categories (backward compatibility)
        return true;
      })
    )
    : categories;

  const handleDateChange = (key: string) => (value: string) => {
    // Convert date string to ISO format if not empty
    if (value) {
      const date = new Date(value);
      setFormData({ ...formData, [key]: date.toISOString() });
    } else {
      setFormData({ ...formData, [key]: null });
    }
  };

  return (
    <div className="space-y-6">
      {/* ========== SECTION 1: Location & Product ========== */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Location & Product</CardTitle>
          <CardDescription>
            Where the asset is located and what it is
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Label htmlFor="plantId">
                Plant <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData?.plantId || ""}
                onValueChange={handlePlantChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a plant" />
                </SelectTrigger>
                <SelectContent>
                  {plants && plants.length > 0 ? (
                    plants.map((plant) => (
                      <SelectItem key={plant.id} value={plant.id}>
                        {plant.plantName || plant.plant_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      No plants available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="buildingId">Building <span className="text-red-500">*</span></Label>
              <Select
                value={formData?.buildingId || ""}
                onValueChange={handleBuildingChange}
                disabled={!formData?.plantId || loadingBuildings}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={
                    loadingBuildings ? "Loading buildings..." :
                      !formData?.plantId ? "Select a plant first" :
                        buildings.length === 0 ? "No buildings available" :
                          "Select a building"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {buildings && buildings.length > 0 ? (
                    buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.buildingName || building.building_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      No buildings available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="floorId">Floor</Label>
              <Select
                value={formData.floorId || ""}
                onValueChange={handleFloorChange}
                disabled={!formData.buildingId || loadingFloors}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={
                    loadingFloors ? "Loading floors..." :
                      !formData.buildingId ? "Select a building first" :
                        floors.length === 0 ? "No floors available" :
                          "Select a floor"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {floors && floors.length > 0 ? (
                    floors.map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.floorName || floor.floor_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      No floors available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="wingId">Wing</Label>
              <Select
                value={formData.wingId || ""}
                onValueChange={(value) => handleChange("wingId", value)}
                disabled={!formData.floorId || loadingWings}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={
                    loadingWings ? "Loading wings..." :
                      !formData.floorId ? "Select a floor first" :
                        wings.length === 0 ? "No wings available" :
                          "Select a wing"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {wings && wings.length > 0 ? (
                    wings.map((wing) => (
                      <SelectItem key={wing.id} value={wing.id}>
                        {wing.wingName || wing.wing_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      No wings available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="location">Location<span className="text-red-500">*</span></Label>
              <Input
                type="text"
                id="location"
                value={formData.location || ""}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g., Pump Room-1"
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="productCategoryId">
                Product Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.productCategoryId || ""}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories && filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.categoryName || cat.category_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      No categories available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="productId">
                Product <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.productId || ""}
                onValueChange={(value) => handleChange("productId", value)}
                disabled={!formData.productCategoryId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      !formData.productCategoryId
                        ? "Select category first"
                        : "Select Product"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts && filteredProducts.length > 0 ? (
                    filteredProducts.map((prod) => (
                      <SelectItem key={prod.id} value={prod.id}>
                        {prod.productName || prod.product_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      {!formData.productCategoryId
                        ? "Select a category first"
                        : "No products available for this category"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type || ""}
                onValueChange={(value) => handleTypeChange(value)}
                disabled={!formData.productId || availableTypes.length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={
                    !formData.productId
                      ? "Select a product first"
                      : availableTypes.length === 0
                        ? "No types available"
                        : "Select type"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.length > 0 ? (
                    availableTypes.map((type, index) => (
                      <SelectItem key={index} value={type}>
                        {type}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      No types available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.productId
                  ? availableTypes.length > 0
                    ? `${availableTypes.length} types available from product variants`
                    : "No variants defined for this product."
                  : "Select a product to see available types"}
              </p>
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="subType">Sub Type</Label>
              <Select
                value={formData.subType || ""}
                onValueChange={(value) => handleChange("subType", value)}
                disabled={!formData.productId || !formData.type || getSubTypesForSelectedType().length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={
                    !formData.productId
                      ? "Select a product first"
                      : !formData.type
                        ? "Select a type first"
                        : getSubTypesForSelectedType().length === 0
                          ? "No subtypes available"
                          : "Select subtype"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {getSubTypesForSelectedType().length > 0 ? (
                    getSubTypesForSelectedType().map((subType, index) => (
                      <SelectItem key={index} value={subType}>
                        {subType}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      No subtypes available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.productId
                  ? formData.type
                    ? getSubTypesForSelectedType().length > 0
                      ? `${getSubTypesForSelectedType().length} subtypes available for ${formData.type}`
                      : "No subtypes defined for this type."
                    : "Select a type to see available subtypes"
                  : "Select a product to see available types"}
              </p>
            </div>

            {/* QR Code Upload Section */}
            {/* <div className="sm:col-span-6">
              <Label htmlFor="qrCode">Custom QR Code</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    id="qrCode"
                    type="file"
                    accept="image/*"
                    onChange={handleQRCodeUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a custom QR code image (optional). If not provided, one will be auto-generated.
                  </p>
                </div>
                {qrCodePreview && (
                  <div className="relative">
                    <img
                      src={qrCodePreview}
                      alt="QR Code Preview"
                      className="h-24 w-24 object-contain border rounded"
                    />
                    <button
                      type="button"
                      onClick={removeQRCode}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* ========== SECTION 2: Operational Details ========== */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Operational Details</CardTitle>
          <CardDescription>
            Status, specifications, and operational information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Label htmlFor="status">
                Maintenance Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.status || "In-House"}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select maintenance status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Warranty">Warranty</SelectItem>
                  <SelectItem value="AMC">AMC</SelectItem>
                  <SelectItem value="In-House">In-House</SelectItem>
                  <SelectItem value="Deactive">Deactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Label>Condition</Label>
              <Input
                type="text"
                value="Will be calculated"
                disabled
                className="mt-1 bg-gray-100 text-gray-500 italic"
              />
              <p className="text-xs text-gray-500 mt-1">Automatically calculated based on asset health metrics</p>
            </div>

            <div className="sm:col-span-3">
              <Label>Health Status</Label>
              <Input
                type="text"
                value="Will be calculated"
                disabled
                className="mt-1 bg-gray-100 text-gray-500 italic"
              />
              <p className="text-xs text-gray-500 mt-1">Automatically calculated based on maintenance records</p>
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                type="text"
                id="capacity"
                value={formData.capacity || ""}
                onChange={(e) => handleChange("capacity", e.target.value)}
                placeholder="e.g., 500"
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="capacityUnit">Capacity Unit</Label>
              <Input
                type="text"
                id="capacityUnit"
                value={formData.capacityUnit || ""}
                onChange={(e) => handleChange("capacityUnit", e.target.value)}
                placeholder="e.g., Liters, Gallons"
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="tag">Tag</Label>
              <Input
                type="text"
                id="tag"
                value={formData.tag || ""}
                onChange={(e) => handleChange("tag", e.target.value)}
                placeholder="e.g., Critical"
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="lifespanYears">Expected Lifespan (Years)</Label>
              <Input
                type="number"
                id="lifespanYears"
                value={formData.lifespanYears || ""}
                onChange={(e) => handleChange("lifespanYears", e.target.value)}
                placeholder="10"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== SECTION 3: Important Dates ========== */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Important Dates</CardTitle>
          <CardDescription>
            Manufacturing and installation dates (Required)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <DateInput
                label="Manufacturing Date"
                value={formData.manufacturingDate}
                onChange={handleDateChange("manufacturingDate")}
                required
              />
              <p className="text-xs text-gray-500 mt-1">When the asset was manufactured</p>
            </div>

            <div className="sm:col-span-2">
              <DateInput
                label="Installation Date"
                value={formData.installDate}
                onChange={handleDateChange("installDate")}
                required
              />
              <p className="text-xs text-gray-500 mt-1">When the asset was installed at the location</p>
            </div>

            <div className="sm:col-span-2">
              <DateInput
                label="Warranty End Date"
                value={formData.warrantyEndDate}
                onChange={handleDateChange("warrantyEndDate")}
              />
            </div>

            <div className="sm:col-span-2">
              <DateInput
                label="AMC Start Date"
                value={formData.amcStartDate}
                onChange={handleDateChange("amcStartDate")}
                disabled={true}
                helperText={
                  schedulerData
                    ? "Auto-populated from Plant Scheduler Setup for this category"
                    : "This will be populated from Plant Scheduler Setup for this category"
                }
              />
            </div>

            <div className="sm:col-span-2">
              <DateInput
                label="AMC End Date"
                value={formData.amcEndDate}
                onChange={handleDateChange("amcEndDate")}
                disabled={true}
                helperText={
                  schedulerData
                    ? "Auto-populated from Plant Scheduler Setup for this category"
                    : "This will be populated from Plant Scheduler Setup for this category"
                }
              />
            </div>



            {/* <div className="sm:col-span-3">
              <DateInput
                label="Last HP Test Date"
                value={formData.lastHPTestDate}
                onChange={handleDateChange("lastHPTestDate")}
              />
            </div> */}

            <div className="sm:col-span-2">
              <DateInput
                label="Next HP Test Due Date"
                value={formData.nextHPTestDueDate}
                onChange={handleDateChange("nextHPTestDueDate")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== SECTION 4: Geolocation (Optional) ========== */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Geolocation</CardTitle>
          <CardDescription>
            {formData.lat && formData.long
              ? "GPS coordinates are automatically captured when technician scans the asset QR code"
              : "GPS coordinates will be automatically captured when technician scans the asset QR code for the first time"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                type="text"
                id="lat"
                value={formData.lat || "Not captured yet"}
                disabled={true}
                className="mt-1 bg-gray-50 cursor-not-allowed"
                maxLength={50}
              />
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                Auto-captured on first QR scan by technician
              </p>
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="long">Longitude</Label>
              <Input
                type="text"
                id="long"
                value={formData.long || "Not captured yet"}
                disabled={true}
                className="mt-1 bg-gray-50 cursor-not-allowed"
                maxLength={50}
              />
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                Auto-captured on first QR scan by technician
              </p>
            </div>

            <div className="sm:col-span-6">
              <Label htmlFor="latLongRemark">Location Remark</Label>
              <Input
                type="text"
                id="latLongRemark"
                value={formData.latLongRemark || ""}
                disabled={true}
                className="mt-1 bg-gray-50 cursor-not-allowed"
                maxLength={255}
              />
              <p className="text-xs text-gray-500 mt-1">Remark is auto-generated based on scan location</p>
            </div>

            {/* Show location history if available (view mode) */}
            {formData.oldlatlongs && formData.oldlatlongs.length > 0 && (
              <div className="sm:col-span-6">
                <Label>Location History</Label>
                <div className="mt-2 bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                  {formData.oldlatlongs.map((loc: { lat: string; long: string; timestamp: string; remark?: string }, index: number) => (
                    <div key={index} className="text-sm text-gray-600 py-1 border-b border-gray-200 last:border-0">
                      <span className="font-medium">#{index + 1}:</span> {loc.lat}, {loc.long}
                      {loc.remark && <span className="text-gray-500"> - {loc.remark}</span>}
                      <span className="text-gray-400 ml-2 text-xs">
                        {new Date(loc.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
