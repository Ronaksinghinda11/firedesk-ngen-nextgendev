import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface SpecDefinition {
  id: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  options?: string[];
  units?: string[]; // Array of available units from spec_unit
  order: number;
  // Snake case alternatives from backend
  spec_name?: string;
  spec_label?: string;
  spec_unit?: string[] | string;
  field_type?: string;
  is_required?: boolean;
  display_order?: number;
}

// Spec value can be a simple string or an object with value and unit
interface SpecValueWithUnit {
  value: string;
  unit: string;
}

interface TechnicalSpecsStepDynamicProps {
  formData: any;
  setFormData: (data: any) => void;
  categoryId?: string;
}

// Helper: Date Input Component for Specs
const SpecDateField = ({
  spec,
  value,
  onChange
}: {
  spec: SpecDefinition;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) setTempDate(value ? new Date(value) : undefined);
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(new Date(value), "PPP")
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
  );
};

export function TechnicalSpecsStepDynamic({
  formData,
  setFormData,
  categoryId,
}: TechnicalSpecsStepDynamicProps) {
  const { toast } = useToast();
  const [specDefinitions, setSpecDefinitions] = useState<SpecDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('🔧 TechnicalSpecsStepDynamic rendered with:', {
      categoryId,
      hasFormData: !!formData,
      specs: formData?.specs,
      specsKeys: formData?.specs ? Object.keys(formData.specs) : []
    });
  }, [formData, categoryId]);

  useEffect(() => {
    if (categoryId) {
      fetchSpecDefinitions(categoryId);
    }
  }, [categoryId]);

  const fetchSpecDefinitions = async (catId: string) => {
    setIsLoading(true);
    try {
      const response: any = await api.get(`/master-data/categories/${catId}/specs`);

      // Backend returns { message, data } format
      let specs: SpecDefinition[] = [];

      if (response?.data && Array.isArray(response.data)) {
        specs = response.data;
      } else if (response?.specDefinitions && Array.isArray(response.specDefinitions)) {
        specs = response.specDefinitions;
      } else if (Array.isArray(response)) {
        specs = response;
      }

      // Normalize snake_case to camelCase and extract units array
      const normalizedSpecs = specs.map((spec: any) => {
        // Extract units from spec_unit - it can be an array or a single string
        let units: string[] = [];
        if (Array.isArray(spec.spec_unit)) {
          units = spec.spec_unit.filter((u: any) => u && typeof u === 'string');
        } else if (spec.spec_unit && typeof spec.spec_unit === 'string') {
          units = [spec.spec_unit];
        }

        return {
          id: spec.id,
          label: spec.label || spec.spec_label || spec.spec_name || 'Unnamed Spec',
          fieldType: spec.fieldType || spec.field_type || spec.spec_type || 'text',
          isRequired: spec.isRequired ?? spec.is_required ?? false,
          options: spec.options || spec.select_options || [],
          units, // Array of available units
          order: spec.order ?? spec.display_order ?? 0,
        };
      });

      const sortedSpecs = normalizedSpecs.sort(
        (a: SpecDefinition, b: SpecDefinition) => a.order - b.order
      );
      console.log('📋 Loaded spec definitions with units:', sortedSpecs);
      setSpecDefinitions(sortedSpecs);

    } catch (error) {
      toast({
        title: "Info",
        description: "No technical specs defined for this category yet.",
        variant: "default",
      });
      setSpecDefinitions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle spec value change - stores as {value, unit} when units exist
  const handleSpecValueChange = (specId: string, newValue: string, hasUnits: boolean) => {
    const currentSpec = formData?.specs?.[specId];

    if (hasUnits) {
      // Store as object with value and unit
      const currentUnit = typeof currentSpec === 'object' ? currentSpec?.unit : '';
      setFormData({
        ...formData,
        specs: {
          ...(formData.specs || {}),
          [specId]: { value: newValue, unit: currentUnit || '' },
        },
      });
    } else {
      // Store as simple string
      setFormData({
        ...formData,
        specs: {
          ...(formData.specs || {}),
          [specId]: newValue,
        },
      });
    }
  };

  // Handle unit change
  const handleUnitChange = (specId: string, newUnit: string) => {
    const currentSpec = formData?.specs?.[specId];
    const currentValue = typeof currentSpec === 'object' ? currentSpec?.value : (currentSpec || '');

    setFormData({
      ...formData,
      specs: {
        ...(formData.specs || {}),
        [specId]: { value: currentValue, unit: newUnit },
      },
    });
  };

  const handleRemoveSpec = (specId: string) => {
    const newSpecs = { ...(formData.specs || {}) };
    delete newSpecs[specId];
    setFormData({
      ...formData,
      specs: newSpecs,
    });
  };

  // Get the value part of a spec (handles both string and object formats)
  const getSpecValue = (specId: string): string => {
    const specData = formData?.specs?.[specId];
    if (specData === undefined || specData === null) return "";
    if (typeof specData === 'object' && specData.value !== undefined) {
      return specData.value;
    }
    return String(specData);
  };

  // Get the unit part of a spec
  const getSpecUnit = (specId: string): string => {
    const specData = formData?.specs?.[specId];
    if (typeof specData === 'object' && specData.unit !== undefined) {
      return specData.unit;
    }
    return "";
  };

  // Check if spec has any value (for clear button visibility)
  const hasSpecValue = (specId: string): boolean => {
    const value = getSpecValue(specId);
    return value !== "" && value !== null && value !== undefined;
  };

  const renderField = (spec: SpecDefinition) => {
    const hasUnits = spec.units && spec.units.length > 0;

    switch (spec.fieldType) {
      case "text":
        return (
          <Input
            id={spec.id}
            placeholder={`Enter ${spec.label.toLowerCase()}`}
            value={getSpecValue(spec.id)}
            onChange={(e) => handleSpecValueChange(spec.id, e.target.value, !!hasUnits)}
            required={spec.isRequired}
          />
        );

      case "number":
        return (
          <Input
            id={spec.id}
            type="number"
            step="0.01"
            placeholder={`Enter ${spec.label.toLowerCase()}`}
            value={getSpecValue(spec.id)}
            onChange={(e) => handleSpecValueChange(spec.id, e.target.value, !!hasUnits)}
            required={spec.isRequired}
          />
        );

      case "date":
        return (
          <SpecDateField
            spec={spec}
            value={getSpecValue(spec.id)}
            onChange={(date) =>
              handleSpecValueChange(spec.id, date, !!hasUnits)
            }
          />
        );

      case "select":
      case "dropdown": // Support legacy dropdown type
        return (
          <Select
            value={getSpecValue(spec.id)}
            onValueChange={(value) => handleSpecValueChange(spec.id, value, !!hasUnits)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${spec.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {spec.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={spec.id}
              checked={getSpecValue(spec.id) === "true"}
              onCheckedChange={(checked) => handleSpecValueChange(spec.id, checked.toString(), !!hasUnits)}
            />
            <label
              htmlFor={spec.id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {spec.label}
            </label>
          </div>
        );

      default:
        return (
          <Input
            id={spec.id}
            placeholder={`Enter ${spec.label.toLowerCase()}`}
            value={getSpecValue(spec.id)}
            onChange={(e) => handleSpecValueChange(spec.id, e.target.value, !!hasUnits)}
            required={spec.isRequired}
          />
        );
    }
  };

  // Render unit dropdown for specs that have units defined
  const renderUnitDropdown = (spec: SpecDefinition) => {
    if (!spec.units || spec.units.length === 0) return null;

    return (
      <Select
        value={getSpecUnit(spec.id)}
        onValueChange={(value) => handleUnitChange(spec.id, value)}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Unit" />
        </SelectTrigger>
        <SelectContent>
          {spec.units.map((unit) => (
            <SelectItem key={unit} value={unit}>
              {unit}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading technical specifications...</span>
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">
          Please select a product category to view technical specifications.
        </p>
      </div>
    );
  }

  if (specDefinitions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-muted-foreground text-center">
          No technical specifications have been defined for this category yet.
        </p>
        <p className="text-sm text-muted-foreground text-center">
          Contact your administrator to add spec definitions for this category.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
        <p className="text-xs text-blue-800">
          <strong>Dynamic Technical Specs:</strong> The fields below are specific to the selected category.
        </p>
      </div>

      {/* Compact Table Layout */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 w-1/4">
                Description
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                Value
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 w-28">
                Unit
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {specDefinitions.map((spec) => (
              <tr key={spec.id} className="hover:bg-gray-50">
                {/* Description Column */}
                <td className="px-3 py-1.5">
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-gray-900">
                      {spec.label}
                    </span>
                    {spec.isRequired && (
                      <span className="text-red-500 ml-0.5 text-xs">*</span>
                    )}
                  </div>
                </td>

                {/* Value Column */}
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <div className="flex-1">
                      {renderField(spec)}
                    </div>
                    {/* Clear button */}
                    {!spec.isRequired && hasSpecValue(spec.id) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSpec(spec.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Clear"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>

                {/* Unit Column */}
                <td className="px-3 py-1.5">
                  {spec.units && spec.units.length > 0 ? (
                    <Select
                      value={getSpecUnit(spec.id)}
                      onValueChange={(value) => handleUnitChange(spec.id, value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {spec.units.map((unit) => (
                          <SelectItem key={unit} value={unit} className="text-xs">
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-gray-400 italic">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
