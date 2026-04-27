// src/pages/CategoriesPage.tsx
import { useEffect, useState, useRef } from "react";
import GenericEntityPage, {
  EntityConfig,
  WizardStep,
} from "@/components/generic/GenericEntityPage";
import { api } from "@/lib/api";
import { TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Entity } from "@/types/permissions";
import { X } from "lucide-react";

interface Form {
  id: string;
  serviceName: string;
}

interface Specification {
  id?: string;
  label: string;
  fieldType: "text" | "number" | "select" | "checkbox" | "date";
  isRequired: boolean;
  order: number;
  options?: string[]; // For select type
  itmParameters?: string[]; // ITM Parameters stored in spec_unit
}

// Tag Input Component for ITM Parameters - Press Enter to add tags/chips
const TagInput = ({
  tags,
  onChange,
  suggestions = [],
  placeholder
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const safeTags = Array.isArray(tags) ? tags : [];
    if (inputValue && suggestions.length > 0) {
      const filtered = suggestions.filter(s =>
        s.toLowerCase().includes(inputValue.toLowerCase()) &&
        !safeTags.includes(s) // Don't show already added tags
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions.filter(s => !safeTags.includes(s)));
    }
  }, [inputValue, suggestions, tags]);

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

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    const safeTags = Array.isArray(tags) ? tags : [];
    if (trimmedTag && !safeTags.includes(trimmedTag)) {
      onChange([...safeTags, trimmedTag]);
      setInputValue('');
      setIsOpen(false);
    }
  };

  const removeTag = (index: number) => {
    const safeTags = Array.isArray(tags) ? tags : [];
    onChange(safeTags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const safeTags = Array.isArray(tags) ? tags : [];
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Prevent form submission
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && safeTags.length > 0) {
      // Remove last tag if backspace is pressed on empty input
      removeTag(safeTags.length - 1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-0.5">
      {/* Display added tags */}
      {Array.isArray(tags) && tags.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mb-0.5">
          {tags.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input field */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="h-7 text-xs"
          autoComplete="off"
        />

        {/* Suggestions dropdown */}
        {isOpen && filteredSuggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto"
          >
            {filteredSuggestions.slice(0, 10).map((suggestion, index) => (
              <div
                key={index}
                className="px-2 py-1 cursor-pointer hover:bg-gray-100 text-xs"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}

        {/* Hint for new items */}
        {inputValue.trim() !== '' && !suggestions.includes(inputValue.trim()) && (
          <p className="text-[9px] text-blue-600 mt-0.5">
            Press Enter to add "{inputValue}"
          </p>
        )}
      </div>
    </div>
  );
};

export default function CategoriesPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const { toast } = useToast();

  // Forms loading removed as we don't select forms here anymore

  // Removed loadForms as we don't select forms here anymore

  // Wizard steps configuration
  const wizardSteps: WizardStep[] = [
    {
      id: "basic",
      name: "Basic Information",
      description: "Enter category details",
    },
    {
      id: "specifications",
      name: "Specifications",
      description: "Define technical specifications for this category",
    },
  ];



  const renderWizardStep = (
    step: string,
    formData: any,
    setFormData: any,
    currentStep: string,
    setCurrentStep: any
  ) => {
    switch (step) {
      case "basic":
        return (
          <div className="space-y-3 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="name"
                  className="text-xs font-medium text-gray-700"
                >
                  Category Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter category name"
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="status" className="text-xs font-medium text-gray-700">
                  Status
                </Label>
                <Select
                  value={formData.status || 'Active'}
                  onValueChange={(value: 'Active' | 'Inactive') =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="testFrequencyRequired" className="text-xs font-medium text-gray-700">
                  HP Test Freq Required?
                </Label>
                <Select
                  value={formData.testFrequencyRequired === true ? 'Yes' : 'No'}
                  onValueChange={(value) => {
                    console.log('🔄 Test Frequency Required changed to:', value);
                    setFormData({ ...formData, testFrequencyRequired: value === 'Yes' });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "specifications":
        return (
          <SpecificationsManager
            specifications={formData.specifications || []}
            onChange={(specs) =>
              setFormData({ ...formData, specifications: specs })
            }
          />
        );



      default:
        return null;
    }
  };

  // Validate wizard step
  const onWizardNext = (currentStep: string, formData: any): boolean => {
    switch (currentStep) {
      case "basic":
        if (!formData.name?.trim()) {
          toast({
            title: "Validation Error",
            description:
              "Please fill in Category Name.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "specifications":
        // Specifications are optional, so always allow proceeding
        break;
    }
    return true;
  };

  // Custom submit handler for wizard
  const onWizardSubmit = async (formData: any) => {
    try {
      console.log("📤 Wizard submit with data:", formData);

      // Step 1: Create or update the category
      const categoryData: any = {
        category_name: formData.name,
        // formId removed
        test_frequency_required: formData.testFrequencyRequired === true,
        status: formData.status || "Active",
      };

      console.log("🔍 Category data being sent:", categoryData);

      // Only include form_id if it has a valid value
      if (formData.formId) {
        categoryData.form_id = formData.formId;
      }

      let categoryId: string | undefined = formData.id;

      if (categoryId) {
        // Update existing category
        console.log("📝 Updating category:", categoryId);
        await api.put(`/master-data/categories/${categoryId}`, categoryData);

        toast({
          title: "Category Updated",
          description: `Category "${formData.name}" has been updated successfully.`,
        });
      } else {
        // Create new category
        console.log("✨ Creating new category");
        const createResponse = await api.post("/master-data/categories", categoryData);

        // Extract category ID from response
        const createdId =
          (createResponse as any).category?.id || (createResponse as any).id;
        if (!createdId) throw new Error("Category ID not found in response");
        categoryId = createdId;

        console.log("✅ Category created with ID:", categoryId);

        toast({
          title: "Category Created",
          description: `Category "${formData.name}" has been created successfully.`,
        });
      }

      // Ensure ID in formData for downstream steps
      // Ensure ID in formData for downstream steps
      formData.id = categoryId;

      // Step 2: Handle spec definitions with SMART SYNC (preserves asset values)
      const specifications = formData.specifications || [];

      if (formData.id) {
        console.log(`📋 Smart sync ${specifications.length} spec definitions for category ${categoryId}`);

        try {
          // Get existing spec IDs from backend
          const existingSpecs: any = await api.get(`/master-data/categories/${formData.id}/specs`);
          const existingSpecList = Array.isArray(existingSpecs)
            ? existingSpecs
            : (existingSpecs.data || existingSpecs.specDefinitions || []);

          const existingSpecIds = new Set(existingSpecList.map((s: any) => s.id));
          const formSpecIds = new Set(
            specifications
              .filter((s: Specification) => s.id && !s.id.startsWith('temp-'))
              .map((s: Specification) => s.id)
          );

          // 1. DELETE: Specs that exist in backend but not in form (user removed them)
          for (const existingSpec of existingSpecList) {
            if (!formSpecIds.has(existingSpec.id)) {
              console.log(`🗑️ Deleting removed spec: ${existingSpec.spec_name || existingSpec.id}`);
              await api.delete(`/master-data/specs/${existingSpec.id}`);
            }
          }

          // 2. UPDATE: Specs that exist in both (user may have modified them)
          for (const spec of specifications) {
            if (spec.id && !spec.id.startsWith('temp-') && existingSpecIds.has(spec.id)) {
              console.log(`📝 Updating existing spec: ${spec.label}`);
              await api.put(`/master-data/specs/${spec.id}`, {
                spec_name: (spec.label || '').trim(),
                spec_label: (spec.label || '').trim(),
                spec_type: spec.fieldType || 'text',
                spec_unit: spec.itmParameters && spec.itmParameters.length > 0 ? spec.itmParameters : null,
                is_required: !!spec.isRequired,
                display_order: spec.order,
                select_options:
                  spec.fieldType === 'select'
                    ? (spec.options || []).filter((opt: string) => opt.trim() !== '')
                    : null,
              });
            }
          }

          // 3. CREATE: New specs (temp IDs or no ID)
          const newSpecs = specifications.filter(
            (s: Specification) => !s.id || s.id.startsWith('temp-')
          );

          if (newSpecs.length > 0) {
            const specsPayload = {
              category_id: categoryId,
              specs: newSpecs.map((spec: Specification, index: number) => ({
                spec_name: (spec.label || 'Unnamed Spec').trim(),
                spec_label: (spec.label || '').trim(),
                spec_type: spec.fieldType || 'text',
                spec_unit: spec.itmParameters && spec.itmParameters.length > 0 ? spec.itmParameters : null,
                is_required: !!spec.isRequired,
                display_order: spec.order !== undefined ? spec.order : index,
                select_options:
                  spec.fieldType === 'select'
                    ? (spec.options || []).filter((opt: string) => opt.trim() !== '')
                    : null,
              })),
            };
            console.log(`✨ Creating ${newSpecs.length} new specs`);
            await api.post('/master-data/specs/bulk', specsPayload);
          }

          console.log('✅ Smart sync complete');
        } catch (error) {
          console.error('⚠️ Error during spec sync:', error);
          throw error;
        }
      }

      return;
    } catch (error: any) {
      console.error("❌ Error in wizard submit:", error);

      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.message ||
          "Failed to save category and specifications.",
        variant: "destructive",
      });

      throw error;
    }
  };

  const categoryConfig: EntityConfig = {
    entityName: "Category",
    entityNamePlural: "Categories",
    apiEndpoint: "/master-data/categories",
    responseKey: "allCategory",

    // Permission-based access control
    permissionEntity: Entity.CATEGORIES,
    enforcePermissions: true,

    // Plant filter support - now handled automatically by GenericEntityPage
    enablePlantFilter: true,

    // Wizard configuration
    wizardSteps: wizardSteps,
    renderWizardStep: renderWizardStep,
    onWizardNext: onWizardNext,
    onWizardSubmit: onWizardSubmit,

    formLayout: "sections",

    // Filter attributes for sorting and column visibility
    filterAttributes: [
      { id: 'category_name', label: 'Category Name', type: 'text' as const, operators: ['contains', 'is', 'isNot'], mandatory: true },
      { id: 'category_code', label: 'Category Code', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'test_frequency_required', label: 'Test Freq Required', type: 'select' as const, operators: ['is'], options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], hiddenByDefault: true },
      // { id: 'status', label: 'Status', type: 'select' as const, operators: ['is', 'isNot'], options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], sortable: false },
      { id: 'created_at', label: 'Created At', type: 'date' as const, operators: ['before', 'after'] },
      { id: 'updated_at', label: 'Updated At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    ],

    // Import fields - ALL database fields that can be filled from the form (for import template)
    // Excludes: created_at, updated_at, status (system-managed fields)
    importFields: [
      { id: 'category_name', label: 'Category Name', required: true },
      { id: 'test_frequency_required', label: 'Test Frequency Required' },
    ],

    // Configure fields for archive/restore operations
    // archiveFields: ["categoryName", "formId", "status"],
    // supportsArchive: true,

    // UI customization: Hide specific buttons on Create/Edit page
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],

    // UI customization: Hide kebab menu from listing rows
    hideListingRowKebab: true,

    // UI customization: Limit top menu items to specific actions
    limitTopMenuItems: ['export', 'bulkActions', 'history'],

    // Fields configuration (used as fallback if wizard is not active)
    fields: [
      {
        name: "name",
        label: "Category Name",
        type: "text",
        required: true,
      },
    ],

    transformResponse: (response: any) => {
      console.log("🔍 Raw API response for Categories:", response);

      if (response && Array.isArray(response.allCategory)) {
        console.log(
          "📊 Categories array found, length:",
          response.allCategory.length
        );

        const transformedData = response.allCategory.map(
          (item: any) => ({
            id: item.id,
            name: item.category_name, // Backend uses snake_case
            categoryName: item.category_name,
            category_name: item.category_name,
            category_code: item.category_code,
            formId: item.form_id,
            testFrequencyRequired: item.test_frequency_required || false,
            status: item.status || "Active",
            createdAt: item.created_at, // Backend uses snake_case
            created_at: item.created_at, // Keep snake_case for filtering/sorting
            createdBy: item.created_by,
            updatedAt: item.updated_at,
            updated_at: item.updated_at, // Keep snake_case for filtering/sorting
            formName: item.form?.service_name,
            form: item.form,
            specifications: item.specDefinitions || item.spec_definitions || [],
            specDefinitions: item.specDefinitions || item.spec_definitions || [],
          })
        );

        console.log("🔄 First category after transform:", transformedData[0]);
        return {
          ...response,
          allCategory: transformedData,
        };
      }

      console.warn("❌ No categories array found in response");
      return response;
    },

    transformData: (data: any) => {
      console.log("🔍 Original formData before transform:", data);
      console.log("🔍 testFrequencyRequired value:", data.testFrequencyRequired, "type:", typeof data.testFrequencyRequired);

      const transformed = {
        category_name: data.name || data.categoryName || data.category_name,
        test_frequency_required: data.testFrequencyRequired === true,
        status: data.status || "Active",
      };

      console.log("📤 Data being sent to API:", transformed);
      return transformed;
    },

    // Custom function to load entity data for editing (including specs)
    loadEntityData: async (entityId: string) => {
      try {
        // Fetch category data
        const categoryResponse: any = await api.get(`/master-data/categories/${entityId}`);

        let category;
        if (categoryResponse.category) {
          category = categoryResponse.category;
        } else if (categoryResponse.data?.category) {
          category = categoryResponse.data.category;
        } else {
          category = categoryResponse;
        }

        console.log("📥 Loaded category for editing:", category);

        // Fetch spec definitions for this category
        let specifications: Specification[] = [];

        if (category.specDefinitions && Array.isArray(category.specDefinitions)) {
          console.log("📥 Using embedded specifications:", category.specDefinitions);
          // Transform embedded specs from backend format to frontend format
          specifications = category.specDefinitions.map((spec: any) => ({
            id: spec.id,
            label: spec.spec_label || spec.label,
            fieldType: spec.spec_type || spec.fieldType,
            isRequired: spec.is_required || spec.isRequired,
            order: spec.display_order || spec.order,
            options: spec.select_options || spec.options || [],
            itmParameters: Array.isArray(spec.spec_unit) ? spec.spec_unit : [],
          }));
        } else {
          try {
            const specsResponse: any = await api.get(
              `/master-data/categories/${entityId}/specs`
            );

            if (Array.isArray(specsResponse)) {
              specifications = specsResponse;
            } else if (specsResponse.specDefinitions) {
              specifications = specsResponse.specDefinitions;
            } else if (specsResponse.data && Array.isArray(specsResponse.data)) {
              specifications = specsResponse.data;
            } else if (specsResponse.data) {
              // Handle case where .data exists but is not array directly (maybe nested)
              specifications = Array.isArray(specsResponse.data) ? specsResponse.data : [];
            }

            // Transform specs from backend format to frontend format
            specifications = specifications.map((spec: any) => ({
              id: spec.id,
              label: spec.spec_label || spec.label,
              fieldType: spec.spec_type || spec.fieldType,
              isRequired: spec.is_required || spec.isRequired,
              order: spec.display_order || spec.order,
              options: spec.select_options || spec.options || [],
              itmParameters: Array.isArray(spec.spec_unit) ? spec.spec_unit : [],
            }));

            console.log("📥 Loaded specifications from separate endpoint:", specifications);
          } catch (error) {
            console.warn("⚠️ No specifications found for category:", error);
          }
        }



        // Transform for form
        return {
          id: category.id,
          name: category.category_name || category.categoryName || category.name,
          formId: category.form_id || category.formId, // Keep for reference
          testFrequencyRequired: category.test_frequency_required || category.testFrequencyRequired || false,
          status: category.status || 'Active',
          specifications: specifications.map((spec: any) => ({
            id: spec.id,
            label: spec.label,
            fieldType: spec.fieldType,
            isRequired: spec.isRequired,
            order: spec.order,
            options: spec.options || [],
            itmParameters: spec.itmParameters || [],
          })),
        };
      } catch (error) {
        console.error("❌ Error loading category data:", error);
        throw error;
      }
    },

    customColumns: (entity: any, isVisible: (field: string) => boolean) => {
      return (
        <>
          {isVisible('category_name') && (
            <TableCell className="font-medium bg-white sticky left-0 z-10 min-w-[200px] border-r border-gray-100">
              <div className="flex flex-col gap-1">
                <span>{entity.name || entity.categoryName || "Unnamed"}</span>
                {entity.specifications && entity.specifications.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {entity.specifications.length} spec(s)
                  </span>
                )}
              </div>
            </TableCell>
          )}

          {isVisible('category_code') && (
            <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">
              {entity.category_code || '-'}
            </TableCell>
          )}

          {isVisible('test_frequency_required') && (
            <TableCell className="text-sm font-normal text-gray-700">
              {entity.testFrequencyRequired ? 'Yes' : 'No'}
            </TableCell>
          )}

          {/* {isVisible('status') && (
            <TableCell className="text-sm font-normal text-gray-700">
              <span className={entity.status === 'Active' ? 'text-green-600' : 'text-gray-500'}>
                {entity.status}
              </span>
            </TableCell>
          )} */}

          {isVisible('created_at') && (
            <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">
              {entity.createdAt ? new Date(entity.createdAt).toLocaleDateString() : '-'}
            </TableCell>
          )}

          {isVisible('updated_at') && (
            <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">
              {entity.updatedAt ? new Date(entity.updatedAt).toLocaleDateString() : '-'}
            </TableCell>
          )}
        </>
      );
    },
  };

  return <GenericEntityPage config={categoryConfig} />;
}

// Specifications Manager Component
interface SpecificationsManagerProps {
  specifications: Specification[];
  onChange: (specifications: Specification[]) => void;
  errors?: string[];
}

const SpecificationsManager: React.FC<SpecificationsManagerProps> = ({
  specifications,
  onChange,
  errors,
}) => {
  const [newSpec, setNewSpec] = useState<Omit<Specification, "id">>({
    label: "",
    fieldType: "text",
    isRequired: false,
    order: specifications.length,
    options: [],
    itmParameters: [],
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [itmParameterSuggestions, setItmParameterSuggestions] = useState<string[]>([]);

  // Fetch existing ITM parameter values for autocomplete
  useEffect(() => {
    const fetchItmParameters = async () => {
      try {
        const response: any = await api.get('/master-data/specs/itm-parameters');
        if (response.success && response.itmParameters) {
          setItmParameterSuggestions(response.itmParameters);
        }
      } catch (error) {
        console.warn('Could not fetch ITM parameters for autocomplete:', error);
      }
    };
    fetchItmParameters();
  }, []);

  const addSpecification = () => {
    if (!newSpec.label.trim()) return;

    // Validate select field has options
    if (newSpec.fieldType === "select") {
      const validOptions = (newSpec.options || []).filter(
        (opt) => opt.trim() !== ""
      );
      if (validOptions.length === 0) {
        alert("Select field must have at least one option");
        return;
      }
    }

    const updatedSpecs = [...specifications];

    if (editingIndex !== null) {
      // Update existing specification
      updatedSpecs[editingIndex] = {
        ...newSpec,
        id: updatedSpecs[editingIndex].id,
      };
      setEditingIndex(null);
    } else {
      // Add new specification
      updatedSpecs.push({
        ...newSpec,
        id: `temp-${Date.now()}`, // Temporary ID for UI purposes
        order: updatedSpecs.length,
      });
    }

    onChange(updatedSpecs);
    setNewSpec({
      label: "",
      fieldType: "text",
      isRequired: false,
      order: updatedSpecs.length,
      options: [],
      itmParameters: [],
    });
  };

  const editSpecification = (index: number) => {
    const spec = specifications[index];
    setNewSpec({
      label: spec.label,
      fieldType: spec.fieldType,
      isRequired: spec.isRequired,
      order: spec.order,
      options: spec.options || [],
      itmParameters: spec.itmParameters || [],
    });
    setEditingIndex(index);
  };

  const removeSpecification = (index: number) => {
    const updatedSpecs = specifications.filter((_, i) => i !== index);
    // Reorder remaining specs
    const reorderedSpecs = updatedSpecs.map((spec, idx) => ({
      ...spec,
      order: idx,
    }));
    onChange(reorderedSpecs);
  };

  const moveSpecification = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= specifications.length) return;

    const updatedSpecs = [...specifications];
    const temp = updatedSpecs[index];
    updatedSpecs[index] = updatedSpecs[newIndex];
    updatedSpecs[newIndex] = temp;

    // Update order values
    const reorderedSpecs = updatedSpecs.map((spec, idx) => ({
      ...spec,
      order: idx,
    }));

    onChange(reorderedSpecs);
  };

  const addOption = () => {
    setNewSpec((prev) => ({
      ...prev,
      options: [...(prev.options || []), ""],
    }));
  };

  const updateOption = (optionIndex: number, value: string) => {
    setNewSpec((prev) => ({
      ...prev,
      options:
        prev.options?.map((opt, idx) => (idx === optionIndex ? value : opt)) ||
        [],
    }));
  };

  const removeOption = (optionIndex: number) => {
    setNewSpec((prev) => ({
      ...prev,
      options: prev.options?.filter((_, idx) => idx !== optionIndex) || [],
    }));
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setNewSpec({
      label: "",
      fieldType: "text",
      isRequired: false,
      order: specifications.length,
      options: [],
      itmParameters: [],
    });
  };

  return (
    <div className="space-y-3 max-w-2xl">
      {/* Add/Edit Specification Form */}
      <div className="border rounded-lg p-2 space-y-2 bg-gray-50">
        <h4 className="font-medium text-xs text-gray-900">
          {editingIndex !== null
            ? "Edit Specification"
            : "Add New Specification"}
        </h4>

        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-0.5 min-w-[140px]">
            <Label className="text-[10px] font-medium">Label</Label>
            <Input
              type="text"
              value={newSpec.label}
              onChange={(e) =>
                setNewSpec((prev) => ({ ...prev, label: e.target.value }))
              }
              placeholder="e.g., Capacity"
              className="h-7 text-xs"
            />
          </div>

          <div className="space-y-0.5 min-w-[120px]">
            <Label className="text-[10px] font-medium">Field Type</Label>
            <Select
              value={newSpec.fieldType}
              onValueChange={(value: Specification["fieldType"]) =>
                setNewSpec((prev) => ({
                  ...prev,
                  fieldType: value,
                  options: value === "select" ? prev.options || [""] : [],
                }))
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="select">Dropdown</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-0.5 min-w-[160px] flex-1">
            <Label className="text-[10px] font-medium">Units</Label>
            <TagInput
              tags={newSpec.itmParameters || []}
              onChange={(tags) =>
                setNewSpec((prev) => ({ ...prev, itmParameters: tags }))
              }
              suggestions={itmParameterSuggestions}
              placeholder="Type & Enter..."
            />
          </div>

          <div className="flex items-center space-x-1.5 h-7">
            <Checkbox
              id="required"
              checked={newSpec.isRequired}
              onCheckedChange={(checked) =>
                setNewSpec((prev) => ({
                  ...prev,
                  isRequired: checked as boolean,
                }))
              }
              className="h-3.5 w-3.5"
            />
            <Label
              htmlFor="required"
              className="text-[10px] font-medium cursor-pointer"
            >
              Required
            </Label>
          </div>

          <Button
            type="button"
            onClick={addSpecification}
            disabled={!newSpec.label.trim()}
            className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
          >
            {editingIndex !== null ? "Update" : "Add"}
          </Button>
        </div>

        {/* Options for select type */}
        {newSpec.fieldType === "select" && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Options</Label>
            <div className="space-y-1">
              {newSpec.options?.map((option, index) => (
                <div key={index} className="flex space-x-2">
                  <Input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="h-7 text-xs"
                  />
                  <Button
                    type="button"
                    onClick={() => removeOption(index)}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={addOption}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              Add Option
            </Button>
          </div>
        )}

        {editingIndex !== null && (
          <Button type="button" onClick={cancelEditing} variant="outline" className="h-7 text-xs">
            Cancel
          </Button>
        )}
      </div>

      {/* Specifications List */}
      <div>
        <h4 className="font-medium text-xs text-gray-900 mb-2">
          Specifications ({specifications.length})
        </h4>
        {specifications.length === 0 ? (
          <p className="text-gray-500 text-xs">
            No specifications added yet.
          </p>
        ) : (
          <div className="space-y-2">
            {specifications.map((spec, index) => (
              <div
                key={spec.id || index}
                className="border rounded-lg p-2 bg-white flex justify-between items-center"
              >
                <div className="flex items-center space-x-2 flex-1">
                  <span className="font-medium text-sm text-gray-900">
                    {spec.label}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${spec.isRequired
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {spec.isRequired ? "Required" : "Optional"}
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                    {spec.fieldType}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Order: {spec.order + 1}
                  </span>
                  {spec.fieldType === "select" &&
                    spec.options &&
                    spec.options.length > 0 && (
                      <span className="text-[10px] text-gray-600">
                        Options: {spec.options.filter((o) => o.trim()).join(", ")}
                      </span>
                    )}
                </div>
                <div className="flex space-x-1">
                  <Button
                    type="button"
                    onClick={() => moveSpecification(index, "up")}
                    disabled={index === 0}
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    onClick={() => moveSpecification(index, "down")}
                    disabled={index === specifications.length - 1}
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Move down"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    onClick={() => editSpecification(index)}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={() => removeSpecification(index)}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {errors && errors.length > 0 && (
        <div className="text-red-500 text-sm space-y-1">
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
};
