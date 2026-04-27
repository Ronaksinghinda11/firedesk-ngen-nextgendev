// src/pages/ProductsPage.tsx
import { useEffect, useState, useRef } from 'react';
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { api } from '@/lib/api';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Upload, X, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import InlineProductEditor from '@/components/products/InlineProductEditor';
import { Entity } from '@/types/permissions';

interface Category {
  id: string;
  categoryName: string;
  testFrequencyRequired?: boolean;
}

interface ProductVariant {
  type: string;
  subType?: string[];
  description: string;
}

const testFrequencyOptions = [
  'One Year',
  'Two Years',
  'Three Years',
  'Five Years',
  'Ten Years'
];

// Simple Autocomplete Input Component
const AutocompleteInput = ({
  value,
  onChange,
  options,
  placeholder,
  className = "h-10"
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
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
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && (
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

// Tag Input Component - Press Enter to add tags/chips
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
    <div className="space-y-1">
      {/* Display added tags */}
      {Array.isArray(tags) && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
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
          className="h-8 text-sm"
          autoComplete="off"
        />

        {/* Suggestions dropdown */}
        {isOpen && filteredSuggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-2 py-1 cursor-pointer hover:bg-gray-100 text-sm"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}

        {/* Hint for new items */}
        {inputValue.trim() !== '' && !suggestions.includes(inputValue.trim()) && (
          <p className="text-[10px] text-blue-600 mt-0.5">
            Press Enter to add "{inputValue}"
          </p>
        )}
      </div>
    </div>
  );
};

// Create a separate component for the variants step to maintain its own state
const ProductVariantsStep = ({ formData, setFormData, initialVariants = [] }: {
  formData: any;
  setFormData: any;
  initialVariants?: ProductVariant[];
}) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableSubTypes, setAvailableSubTypes] = useState<string[]>([]);
  const [isLoadingTypesSubtypes, setIsLoadingTypesSubtypes] = useState(false);
  const hasInitializedRef = useRef(false);
  const prevInitialVariantsRef = useRef<string>('');

  // Fetch available types and subtypes for autocomplete
  useEffect(() => {
    const fetchTypesSubtypes = async () => {
      setIsLoadingTypesSubtypes(true);
      try {
        const response: any = await api.get('/master-data/products/types-subtypes');
        if (response.success) {
          setAvailableTypes(response.types || []);
          setAvailableSubTypes(response.subTypes || []);
        }
      } catch (error) {
        console.error('Failed to fetch types/subtypes:', error);
      } finally {
        setIsLoadingTypesSubtypes(false);
      }
    };
    fetchTypesSubtypes();
  }, []);

  // Initialize variants when component mounts or when initialVariants changes
  useEffect(() => {
    const initialJSON = JSON.stringify(initialVariants);

    // Check if initialVariants has actually changed
    if (initialJSON !== prevInitialVariantsRef.current) {
      console.log('🔄 InitialVariants changed, updating variants');

      if (initialVariants && initialVariants.length > 0) {
        console.log('✅ Loading variants from initialVariants:', initialVariants);
        // Normalize initial variants to ensure subType is ALWAYS an array
        const normalizedVariants = initialVariants.map(v => ({
          ...v,
          subType: Array.isArray(v.subType) ? v.subType : []
        }));
        setVariants(normalizedVariants);
      } else if (!hasInitializedRef.current) {
        console.log('✅ Initializing with no variants (optional)');
        setVariants([]);
      }

      // Update refs
      prevInitialVariantsRef.current = initialJSON;
      hasInitializedRef.current = true;
    }
  }, [initialVariants]); // Re-run when initialVariants changes

  // Store variants in formData whenever they change - but avoid infinite loops
  useEffect(() => {
    if (!hasInitializedRef.current) return;

    // Keep ALL variants during editing (including empty ones)
    // Filtering will happen only on form submission
    const allVariants = variants.map(v => ({
      type: v.type || '',
      subType: v.subType && Array.isArray(v.subType) ? v.subType.filter(Boolean) : [],
      description: v.description || '',
    }));

    // Only update if variants actually changed to prevent loops
    const currentVariantsJSON = JSON.stringify(allVariants);
    const formDataVariantsJSON = JSON.stringify(formData?.productVariants || []);

    if (currentVariantsJSON !== formDataVariantsJSON) {
      console.log('💾 Saving all variants to formData (including empty):', allVariants);
      setFormData((prev: any) => ({
        ...prev,
        productVariants: allVariants
      }));
    }
  }, [variants]); // Only depend on variants, not setFormData or formData

  const handleAddVariant = () => {
    const newVariants = [...variants, { type: '', subType: [], description: '' }];
    setVariants(newVariants);
  };

  const handleRemoveVariant = (index: number) => {
    // Allow removing all variants since they're optional
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
  };

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setVariants(updatedVariants);
  };

  // Filter out empty variants for display validation
  const nonEmptyVariants = variants.filter(v => v.type.trim() !== '');

  return (
    <div className="space-y-3 max-w-2xl">
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Product Variants <span className="text-gray-400 text-xs">(Optional)</span></h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddVariant} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add Variant
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Each variant must have a unique type. Press Enter to add subtypes.
        </p>
      </div>

      {/* Validation message */}
      {variants.some(v => v.type.trim() === '' && v.description?.trim()) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
          <p className="text-yellow-800 text-xs">
            Please complete the Type field or remove variants.
          </p>
        </div>
      )}

      {variants.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground border rounded bg-gray-50 text-xs">
          <p>No variants added yet. Click "Add Variant" to add variations.</p>
        </div>
      ) : (
        variants.map((variant, index) => (
          <div key={index} className="border p-2 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-medium">Variant {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveVariant(index)}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
              <div className="space-y-1">
                <Label className="text-xs">Type <span className="text-red-500">*</span></Label>
                <AutocompleteInput
                  value={variant.type || ''}
                  onChange={(value) => handleVariantChange(index, 'type', value)}
                  options={availableTypes}
                  placeholder="Type to search..."
                  className="h-8"
                />
                {variant.type.trim() === '' && (
                  <p className="text-red-500 text-[10px]">Type is required</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Sub Type</Label>
                <TagInput
                  tags={variant.subType || []}
                  onChange={(tags) => handleVariantChange(index, 'subType', tags)}
                  suggestions={availableSubTypes}
                  placeholder="Press Enter to add..."
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Description <span className="text-gray-400 text-[10px]">(Optional)</span></Label>
                <Textarea
                  value={variant.description || ''}
                  onChange={(e) => handleVariantChange(index, 'description', e.target.value)}
                  placeholder="Enter variant description"
                  className="min-h-[60px] text-xs"
                />
              </div>
            </div>
          </div>
        ))
      )}

      {/* Variant count summary */}
      <div className="text-xs text-muted-foreground">
        {nonEmptyVariants.length > 0 ? (
          <p>✅ {nonEmptyVariants.length} valid variant(s) will be saved</p>
        ) : (
          <p className="text-green-600">✅ Product will be created without variants</p>
        )}
      </div>
    </div>
  );
};

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      console.log('🔄 Loading categories for dropdown...');

      const response = await api.get('/master-data/categories/active');
      console.log('📡 Categories API response:', response);

      let categoriesData: Category[] = [];

      if (Array.isArray(response)) {
        categoriesData = response;
      } else if (response.activeCategories) {
        categoriesData = response.activeCategories;
      } else if (response.allCategory) {
        categoriesData = response.allCategory;
      } else if (response.data?.activeCategories) {
        categoriesData = response.data.activeCategories;
      }

      console.log('✅ Categories loaded for dropdown (raw):', categoriesData);

      // Map to ensure camelCase for frontend
      const mappedCategories = categoriesData.map((cat: any) => ({
        id: cat.id,
        categoryName: cat.categoryName || cat.category_name,
        testFrequencyRequired: cat.testFrequencyRequired || cat.test_frequency_required
      }));

      console.log('✅ Categories loaded for dropdown (mapped):', mappedCategories);
      setCategories(mappedCategories);

    } catch (error: any) {
      console.error('❌ Error loading categories:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Wizard Step 1: Product Information
  const renderProductInfoStep = (formData: any, setFormData: any, currentStep: string, setCurrentStep: any) => {
    console.log('🔍 ProductInfoStep - formData:', formData);

    // Handle product image upload
    const handleProductImageUpload = (file: File) => {
      if (!file) return;

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a JPG, PNG, or SVG image',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: 'Please upload an image smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, image: base64String });
      };
      reader.onerror = () => {
        toast({
          title: 'Error',
          description: 'Failed to read image file',
          variant: 'destructive',
        });
      };
      reader.readAsDataURL(file);
    };

    // Find the selected category to check if test frequency is required
    const selectedCategory = categories.find(cat => cat.id === formData.categoryId);
    const showTestFrequency = selectedCategory?.testFrequencyRequired === true;

    return (
      <div className="space-y-3 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="categoryId" className="text-xs font-medium text-gray-700">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.categoryId || ''}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              required
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="productName" className="text-xs font-medium text-gray-700">
              Product Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="productName"
              value={formData.productName || formData.name || ''}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value, name: e.target.value })}
              placeholder="Enter product name"
              className="h-8 text-sm"
              required
            />
          </div>

          {/* <div className="space-y-1">
            <Label htmlFor="status" className="text-xs font-medium text-gray-700">
              Status
            </Label>
            <Select
              value={formData.status || 'Active'}
              onValueChange={(value: 'Active' | 'Inactive') =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          {showTestFrequency && (
            <div className="space-y-1">
              <Label htmlFor="testFrequency" className="text-xs font-medium text-gray-700">
                Test Freq/HP Test <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.testFrequency || ''}
                onValueChange={(value) => setFormData({ ...formData, testFrequency: value })}
                required
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {testFrequencyOptions.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {freq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="productImage" className="text-xs font-medium text-gray-700">
              Product Image <span className="text-gray-400 text-[10px]">(Optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="productImage"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleProductImageUpload(file);
                  }
                }}
                className="h-8 text-xs max-w-xs"
              />
              {formData.image && formData.image.trim() !== '' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData({ ...formData, image: '' })}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {formData.image && formData.image.trim() !== '' && (
              <div className="mt-1">
                <img
                  src={formData.image}
                  alt="Product preview"
                  className="h-20 w-20 object-cover rounded border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Wizard Step 2: Product Variants
  const renderVariantsStep = (formData: any, setFormData: any, currentStep: string, setCurrentStep: any) => {
    // Get initial variants from formData or use empty array
    const initialVariants = formData.productVariants || formData.variants || [];

    console.log('🔍 VariantsStep - formData:', formData);
    console.log('🔍 VariantsStep - formData.productVariants:', formData.productVariants);
    console.log('🔍 VariantsStep - formData.variants:', formData.variants);
    console.log('🔍 VariantsStep - initialVariants:', initialVariants);

    // Use a key to force re-mount when editing different products
    const componentKey = formData.id ? `variants-${formData.id}` : 'variants-new';

    return (
      <ProductVariantsStep
        key={componentKey}
        formData={formData}
        setFormData={setFormData}
        initialVariants={initialVariants}
      />
    );
  };

  // Wizard step renderer
  const renderWizardStep = (step: string, formData: any, setFormData: any, currentStep: string, setCurrentStep: any) => {
    console.log('🔍 renderWizardStep called:', { step, formData });

    switch (step) {
      case 'productInfo':
        return renderProductInfoStep(formData, setFormData, currentStep, setCurrentStep);
      case 'variants':
        return renderVariantsStep(formData, setFormData, currentStep, setCurrentStep);
      default:
        return null;
    }
  };

  // Validate before moving to next step - note: cannot be async due to GenericEntityPage constraints
  const onWizardNext = (currentStep: string, formData: any): boolean => {
    console.log('🔍 onWizardNext called:', { currentStep, formData });

    if (currentStep === 'productInfo') {
      if (!formData.productName && !formData.name) {
        toast({
          title: 'Error',
          description: 'Product name is required',
          variant: 'destructive',
        });
        return false;
      }
      if (!formData.categoryId) {
        toast({
          title: 'Error',
          description: 'Category is required',
          variant: 'destructive',
        });
        return false;
      }
      // Only validate test frequency if the selected category requires it
      const selectedCategory = categories.find(cat => cat.id === formData.categoryId);
      if (selectedCategory?.testFrequencyRequired && !formData.testFrequency) {
        toast({
          title: 'Error',
          description: 'Test frequency is required for this category',
          variant: 'destructive',
        });
        return false;
      }
      // Note: Product name uniqueness will be checked on backend submission
      // as this function cannot be async
    } else if (currentStep === 'variants') {
      const variants = formData.productVariants || [];
      console.log('🔍 Validating variants:', variants);

      // Only validate if there are variants with content but missing type
      // Completely empty variants are fine and will be filtered out
      const hasIncompleteVariants = variants.some((v: any) =>
        // Only flag as incomplete if there's content but no type
        (!v.type || v.type.trim() === '') &&
        (v.description?.trim() || (v.subType && v.subType.length > 0))
      );

      if (hasIncompleteVariants) {
        toast({
          title: 'Error',
          description: 'Please enter a type for variants that have content, or remove them',
          variant: 'destructive',
        });
        return false;
      }

      // Variants are completely optional, so allow proceeding even with 0 variants or empty variants
    }
    return true;
  };

  // Handle wizard submission
  const onWizardSubmit = async (formData: any) => {
    // Validation Logic (moved from onWizardNext for single-page form compatibility)
    if (!formData.productName && !formData.name) {
      toast({ title: 'Error', description: 'Product name is required', variant: 'destructive' });
      throw new Error('Product name is required');
    }
    if (!formData.categoryId) {
      toast({ title: 'Error', description: 'Category is required', variant: 'destructive' });
      throw new Error('Category is required');
    }

    // Only validate test frequency if the selected category requires it
    // categories state is available here
    const selectedCategory = categories.find(cat => cat.id === formData.categoryId);
    if (selectedCategory?.testFrequencyRequired && !formData.testFrequency) {
      toast({ title: 'Error', description: 'Test frequency is required for this category', variant: 'destructive' });
      throw new Error('Test frequency is required');
    }

    // Validate variants
    const variants = formData.productVariants || [];
    const hasIncompleteVariants = variants.some((v: any) =>
      (!v.type || v.type.trim() === '') &&
      (v.description?.trim() || (v.subType && v.subType.length > 0))
    );
    if (hasIncompleteVariants) {
      toast({ title: 'Error', description: 'Please enter a type for variants that have content, or remove them', variant: 'destructive' });
      throw new Error('Invalid variants');
    }

    try {
      console.log('🔍 Raw form data variants:', formData.productVariants);

      // Filter out empty variants and clean up optional fields (only type is required)
      const validVariants = (formData.productVariants || [])
        .filter((v: any) => {
          // Must have a non-empty type
          const hasValidType = v.type && typeof v.type === 'string' && v.type.trim() !== '';
          console.log(`  Variant "${v.type}" - Valid: ${hasValidType}`);
          return hasValidType;
        })
        .map((v: any) => ({
          type: v.type.trim(),
          subType: v.subType && Array.isArray(v.subType) ? v.subType.filter(Boolean) : [],
          // Convert empty strings to null for optional fields
          description: v.description?.trim() || null,
        }));

      console.log('✅ Filtered valid variants:', validVariants);

      const data = {
        product_name: formData.name || formData.productName,
        category_id: formData.categoryId,
        test_frequency: formData.testFrequency,
        variants: validVariants,
        image: formData.image || null,
        status: formData.status || 'Active',
      };

      console.log('📤 Submitting product data:', data);

      if (formData.id) {
        // Editing existing product - use RESTful endpoint with ID in URL
        await api.put(`/master-data/products/${formData.id}`, data);
        toast({
          title: 'Success',
          description: 'Product updated successfully'
        });
      } else {
        // Creating new product
        await api.post('/master-data/products', data);
        toast({
          title: 'Success',
          description: 'Product created successfully'
        });
      }

    } catch (error: any) {
      console.error('❌ Submit error:', error);
      const errorMessage = error.message || error.response?.data?.message || 'Operation failed';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const productConfig: EntityConfig = {
    entityName: 'Product',
    entityNamePlural: 'Products',
    apiEndpoint: '/master-data/products',
    responseKey: 'products',

    // Permission-based access control
    permissionEntity: Entity.PRODUCTS,
    enforcePermissions: true,

    // Plant filter support - now handled automatically by GenericEntityPage
    enablePlantFilter: true,

    // Archive configuration - Products support 'Deactive' status
    // supportsArchive: true,
    // archiveStatusValue: 'Deactive',

    // Configure fields for archive/restore operations
    // archiveFields: ['productName', 'categoryId', 'testFrequency', 'productVariants', 'status'],
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'bulkActions', 'history'],

    // Filter attributes for sorting and column visibility
    filterAttributes: [
      { id: 'product_name', label: 'Product Name', type: 'text' as const, operators: ['contains', 'is', 'isNot'], mandatory: true },
      { id: 'category_name', label: 'Category', type: 'select' as const, operators: ['is', 'isNot'], options: categories.map(cat => ({ value: cat.categoryName, label: cat.categoryName })) },
      { id: 'product_code', label: 'Product Code', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'test_frequency', label: 'Test Frequency', type: 'select' as const, operators: ['is', 'isNot'], options: [{ value: 'One Year', label: 'One Year' }, { value: 'Two Years', label: 'Two Years' }, { value: 'Three Years', label: 'Three Years' }, { value: 'Five Years', label: 'Five Years' }, { value: 'Ten Years', label: 'Ten Years' }] },
      { id: 'created_at', label: 'Created At', type: 'date' as const, operators: ['before', 'after'] },
      { id: 'updated_at', label: 'Updated At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    ],

    // Import fields - matching UI form fields
    // Note: Use 'category' (name) not 'category_id' - backend will resolve name to ID
    importFields: [
      { id: 'category', label: 'Category', required: true }, // Category name, backend resolves to ID
      { id: 'product_name', label: 'Product Name', required: true },
      { id: 'test_frequency', label: 'Test Frequency' },
      { id: 'type', label: 'Type' },
      { id: 'sub_type', label: 'Sub Type' },
    ],

    fields: [
      {
        name: 'name',
        label: 'Product Name',
        type: 'text',
        required: true,
      },
      {
        name: 'categoryId',
        label: 'Category',
        type: 'select',
        required: true,
        referenceData: categories,
      },
      {
        name: 'testFrequency',
        label: 'Test Freq/HP Test',
        type: 'select',
        required: true,
        options: testFrequencyOptions,
      },
    ],

    formLayout: "sections",

    // Custom form renderer - replaces wizard with Excel-like inline table
    renderCustomForm: ({ editingEntity, onCancel, onSaveComplete }) => (
      <InlineProductEditor
        categories={categories}
        editingProduct={editingEntity}
        onCancel={onCancel}
        onSaveComplete={onSaveComplete}
      />
    ),

    // Load entity data for editing - ensures image is loaded
    loadEntityData: async (entityId: string) => {
      try {
        console.log('🔍 Loading product data for ID:', entityId);
        const response: any = await api.get(`/master-data/products/${entityId}`);
        console.log('📦 Product API response:', response);

        if (response.success && response.product) {
          const product = response.product;
          const variants = product.variants || product.productVariants || [];

          console.log('🖼️ Product image data:', product.image ? 'Image exists' : 'No image');

          const loadedData = {
            id: product.id,
            name: product.product_name || product.productName, // Handle both for safety
            productName: product.product_name || product.productName,
            categoryId: product.category_id || product.categoryId,
            testFrequency: product.test_frequency || product.testFrequency,
            status: product.status === 'active' ? 'Active' : (product.status === 'inactive' ? 'Inactive' : (product.status || 'Active')),
            productVariants: variants,
            variants: variants,
            image: product.image || '',
          };

          console.log('✅ Loaded product data with image:', loadedData);
          return loadedData;
        }
        throw new Error('No product data in response');
      } catch (error) {
        console.error('❌ Failed to load product data:', error);
        throw error;
      }
    },

    transformResponse: (response: any) => {
      console.log('🔍 Raw API response for Products:', response);

      if (response && Array.isArray(response.products)) {
        console.log('📊 Products array found, length:', response.products.length);

        const transformedData = response.products.map((item: any) => {
          console.log('🔍 Processing product item:', item);

          // Handle variants from API - they might be in different fields
          const variants = item.variants || item.product_variants || [];

          return {
            id: item.id,
            name: item.product_name, // Backend uses snake_case
            productName: item.product_name,
            product_name: item.product_name,
            product_code: item.product_code,
            categoryId: item.category_id, // Backend uses snake_case
            category_id: item.category_id,
            categoryName: item.category?.category_name, // Backend nested object also uses snake_case
            category_name: item.category?.category_name, // For filter matching
            testFrequency: item.test_frequency, // Backend uses snake_case
            test_frequency: item.test_frequency,
            status: item.status === 'active' ? 'Active' : (item.status === 'inactive' ? 'Inactive' : (item.status || 'Active')),
            created_at: item.created_at || item.createdAt || new Date().toISOString(),
            updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
            createdAt: item.created_at || item.createdAt || new Date().toISOString(),
            updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
            createdBy: item.created_by || 'System',
            variants: variants,
            productVariants: variants,
            category: item.category,
            image: item.image || null,
          };
        });

        console.log('🔄 Transformed products with fallback dates:', transformedData);
        return {
          ...response,
          products: transformedData
        };
      }

      return response;
    },

    transformData: (data: any) => {
      // Filter out empty variants and clean up optional fields (only type is required)
      const validVariants = (data.productVariants || data.variants || [])
        .filter((v: any) => v.type && v.type.trim() !== '')
        .map((v: any) => ({
          type: v.type.trim(),
          subType: v.subType && Array.isArray(v.subType) ? v.subType.filter(Boolean) : [],
          // Convert empty strings to null for optional fields
          description: v.description?.trim() || null,
        }));

      const transformed = {
        product_name: data.name || data.productName || data.product_name,
        category_id: data.categoryId || data.category_id,
        test_frequency: data.testFrequency || data.test_frequency,
        product_variants: validVariants,
        image: data.image || null,
        status: (data.status || 'Active').toLowerCase(),
      };

      console.log('📤 Data being sent to API:', transformed);
      return transformed;
    },

    customColumns: (entity: any, isVisible: (field: string) => boolean) => (
      <>
        {isVisible('product_name') && (
          <TableCell className="font-medium bg-white sticky left-0 z-10 min-w-[200px] border-r border-gray-100">
            {entity.name || entity.productName || 'Unnamed'}
          </TableCell>
        )}

        {isVisible('category_name') && (
          <TableCell className="text-sm text-gray-700">
            {entity.category?.category_name || entity.categoryName || '-'}
          </TableCell>
        )}

        {isVisible('product_code') && (
          <TableCell className="font-mono text-xs text-gray-500 whitespace-nowrap">
            {entity.product_code || '-'}
          </TableCell>
        )}

        {isVisible('test_frequency') && (
          <TableCell>{entity.testFrequency || entity.test_frequency || 'N/A'}</TableCell>
        )}

        {/* {isVisible('status') && (
          <TableCell className="text-sm font-normal text-gray-700">
            <span className={entity.status === 'Active' ? 'text-green-600' : 'text-gray-500'}>
              {entity.status || 'Active'}
            </span>
          </TableCell>
        )} */}

        {isVisible('created_at') && (
          <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">
            {formatDate(entity.createdAt)}
          </TableCell>
        )}
        {isVisible('updated_at') && (
          <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">
            {formatDate(entity.updatedAt)}
          </TableCell>
        )}
      </>
    ),
  };

  return <GenericEntityPage config={productConfig} />;
}