import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { serviceFormApi } from '@/services/api/serviceFormApi';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BasicInfoPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = !!id;

  const plantIdParam = searchParams.get('plantId');
  const categoryIdParam = searchParams.get('categoryId');

  const [basicInfo, setBasicInfo] = useState({
    serviceName: '',
    formCode: '',
    description: '',
    categoryId: '',
    plantId: '',
  });

  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Handle auto-redirect if params are present
  useEffect(() => {
    if (plantIdParam && categoryIdParam) {
      // Fetch category details to get the name
      const fetchDetailsAndRedirect = async () => {
        try {
          setLoading(true);

          // Fetch Plant and Category details
          const { plantService } = await import('@/services/plant.service');

          const [plantRes, categoryRes] = await Promise.all([
            plantService.getPlantById(plantIdParam),
            api.get(`/category/${categoryIdParam}`) as any
          ]);

          const plant = plantRes.plant;
          // API returns { success: true, category: { ... } }
          const category = categoryRes.category || categoryRes.data || categoryRes;

          let serviceName = '';
          if (plant && category) {
            // Format: "[first 3 chars of plant name]_[category name] Service form"
            const plantPrefix = plant.plantName.substring(0, 3).toUpperCase();
            serviceName = `${plantPrefix}_${category.categoryName} Service form`;
          }

          navigate('/admin/service-forms/create/builder', {
            state: {
              basicInfo: {
                serviceName: serviceName,
                formCode: '',
                description: '',
                categoryId: categoryIdParam,
                plantId: plantIdParam,
              }
            }
          });
        } catch (error) {
          console.error('Error in auto-redirect', error);
          setLoading(false);
          // Fallback redirect without name if fetch fails
          navigate('/admin/service-forms/create/builder', {
            state: {
              basicInfo: {
                serviceName: '',
                formCode: '',
                description: '',
                categoryId: categoryIdParam,
                plantId: plantIdParam,
              }
            }
          });
        }
      };

      fetchDetailsAndRedirect();
    }
  }, [plantIdParam, categoryIdParam, navigate]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/category/active?availableForForm=true') as any;
      const cats = response.activeCategories || [];
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // Load existing form if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      loadForm(id);
    }
  }, [id, isEditMode]);

  const loadForm = async (formId: string) => {
    try {
      setLoading(true);
      const form = await serviceFormApi.getById(formId);

      setBasicInfo({
        serviceName: form.serviceName,
        formCode: form.formCode || '',
        description: form.description || '',
        categoryId: form.categoryId || '',
        plantId: form.plantId || '',
      });

      // Automatically redirect to builder with full form data
      navigate(`/admin/service-forms/${formId}/edit/builder`, {
        state: {
          basicInfo: {
            serviceName: form.serviceName,
            formCode: form.formCode || '',
            description: form.description || '',
            categoryId: form.categoryId || '',
            plantId: form.plantId || '',
          },
          existingForm: form,
        },
      });
    } catch (error) {
      console.error('Failed to load form:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Validation
    if (!basicInfo.categoryId) {
      setValidationError('Please select a category');
      return;
    }

    setValidationError('');

    // Navigate to builder with basic info
    navigate('/admin/service-forms/create/builder', {
      state: { basicInfo },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/service-forms')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create New Service Form
          </h1>
          <p className="text-gray-600">
            Let's start by setting up the basic information for your service form
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold">
                1
              </div>
              <span className="font-medium text-gray-900">Basic Info</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-semibold">
                2
              </div>
              <span className="text-gray-500">Build Form</span>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-xl border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-900">Form Information</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Provide basic details about your service form
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {/* Validation Error */}
            {validationError && (
              <Alert variant="destructive">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {/* Category Selection (Replaces Service Name) */}
            <div className="space-y-2">
              <Label htmlFor="categoryId" className="text-base font-semibold">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={basicInfo.categoryId}
                onValueChange={(value) => {
                  const selectedCat = categories.find(c => c.id === value);
                  setBasicInfo({
                    ...basicInfo,
                    categoryId: value,
                    serviceName: selectedCat ? selectedCat.categoryName : ''
                  });
                }}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Select the category for this service form. The service name will be set to the category name.
              </p>
            </div>

            {/* Form Code */}
            <div className="space-y-2">
              <Label htmlFor="formCode" className="text-base font-semibold">
                Form Code <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="formCode"
                value={basicInfo.formCode}
                onChange={(e) => setBasicInfo({ ...basicInfo, formCode: e.target.value })}
                placeholder="e.g., INSP_MONTHLY_001"
                className="font-mono text-sm h-12"
              />
              <p className="text-sm text-gray-500">
                Unique identifier for this form. Leave blank to auto-generate.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Description <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                value={basicInfo.description}
                onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                placeholder="Describe the purpose and scope of this service form..."
                rows={4}
                className="resize-none"
              />
              <p className="text-sm text-gray-500">
                Additional context about what this form is used for
              </p>
            </div>

            {/* Continue Button */}
            <div className="pt-4">
              <Button
                onClick={handleContinue}
                disabled={!basicInfo.categoryId}
                className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg"
              >
                Continue to Form Builder
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Next Step:</strong> After setting up the basic information, you'll be able to add sections,
            questions, and configure conditions using our intuitive drag-and-drop builder.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoPage;
