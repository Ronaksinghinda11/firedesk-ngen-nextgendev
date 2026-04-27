import { useEffect, useState, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  Package,
  MapPin,
  Building2,
  Plus,
  X,
  Camera,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TechnicianLayout } from '@/components/TechnicianLayout';

interface Asset {
  id: string;
  assetId: string;
  assetName?: string;
  location?: string;
  healthStatus: string;
  plant?: {
    id: string;
    plantName: string;
  };
  category: {
    id: string;
    categoryName: string;
    formId?: string;
  };
  product?: {
    productName: string;
  };
}

interface QuestionCondition {
  id: string;
  conditionSource: string;
  customConditionName?: string;
  masterCondition?: {
    conditionName: string;
    severityLevel: string;
    conditionCode?: string;
    priorityScore?: number;
    healthImpact?: string;
  };
  customSeverityLevel?: string;
  customPriorityScore?: number;
  displayOrder: number;
}

interface FormQuestion {
  id: string;
  questionText: string;
  questionCode: string;
  questionOrder: number;
  answerType: string;
  isMandatory: boolean;
  requiresPhoto: boolean;
  requiresNotes: boolean;
  helpText?: string;
  applicableFrequencies?: string[];
  conditions?: QuestionCondition[];
  isCustom?: boolean;
}

interface FormSection {
  id: string;
  sectionName: string;
  sectionOrder: number;
  description?: string;
  isMandatory: boolean;
  questions: FormQuestion[];
}

interface ServiceForm {
  id: string;
  serviceName: string;
  formCode: string;
  description?: string;
  sections: FormSection[];
}

interface FormResponse {
  questionId: string;
  selectedConditionId?: string;
  textResponse?: string;
  numericResponse?: number;
  booleanResponse?: boolean;
  dateResponse?: string;
  technicianNotes?: string;
  photoUrls?: string[];
}

interface CustomQuestion {
  id: string;
  questionText: string;
  conditionName: string;
  severity: string;
  priority: number;
  notes: string;
}

export default function TechnicianServiceForm() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm | null>(null);
  const [responses, setResponses] = useState<Record<string, FormResponse>>({});
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    conditionName: '',
    severity: 'LOW',
    priority: 1,
    notes: '',
  });

  useEffect(() => {
    if (assetId) {
      fetchAssetAndForm();
    }
  }, [assetId]);

  const fetchAssetAndForm = async () => {
    try {
      // Fetch asset details and service form ID
      const response = await api.post<{ asset: any; serviceFormId?: string }>(
        `/technician/asset-detail/${assetId}`,
        {}
      );

      setAsset(response.asset);

      // Fetch service form if formId is available
      if (response.serviceFormId) {
        const formData = await api.get<ServiceForm>(
          `/service-forms/${response.serviceFormId}`
        );
        console.log('Service Form Data:', formData);
        setServiceForm(formData);
      } else {
        toast({
          title: 'Warning',
          description: 'No service form configured for this asset category',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch asset or service form',
        variant: 'destructive',
      });
      navigate('/technician/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (
    questionId: string,
    field: keyof FormResponse,
    value: any
  ) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        [field]: value,
      },
    }));
  };

  const handlePhotoCapture = async (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;

        // Get existing photoUrls or initialize empty array
        const existingPhotos = responses[questionId]?.photoUrls || [];

        // Add new photo
        handleResponseChange(questionId, 'photoUrls', [...existingPhotos, base64String]);

        toast({
          title: 'Success',
          description: 'Photo captured successfully',
        });
      };
      reader.onerror = () => {
        toast({
          title: 'Error',
          description: 'Failed to read image file',
          variant: 'destructive',
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to capture photo',
        variant: 'destructive',
      });
    }
  };

  const handleRemovePhoto = (questionId: string, photoIndex: number) => {
    const existingPhotos = responses[questionId]?.photoUrls || [];
    const updatedPhotos = existingPhotos.filter((_, index) => index !== photoIndex);
    handleResponseChange(questionId, 'photoUrls', updatedPhotos);
  };

  const isQuestionApplicable = (question: FormQuestion, currentFrequency?: string): boolean => {
    if (!question.applicableFrequencies || question.applicableFrequencies.length === 0) {
      return true;
    }
    if (!currentFrequency) {
      return true;
    }
    return question.applicableFrequencies.includes(currentFrequency);
  };

  const addCustomQuestion = () => {
    if (!newQuestion.questionText || !newQuestion.conditionName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in question text and condition name',
        variant: 'destructive',
      });
      return;
    }

    const customQ: CustomQuestion = {
      id: `custom-${Date.now()}`,
      ...newQuestion,
    };

    setCustomQuestions([...customQuestions, customQ]);
    setNewQuestion({
      questionText: '',
      conditionName: '',
      severity: 'LOW',
      priority: 1,
      notes: '',
    });
    setShowAddQuestion(false);

    toast({
      title: 'Success',
      description: 'Custom question added successfully',
    });
  };

  const removeCustomQuestion = (id: string) => {
    setCustomQuestions(customQuestions.filter((q) => q.id !== id));
    // Remove response if exists
    const newResponses = { ...responses };
    delete newResponses[id];
    setResponses(newResponses);
  };

  const getConditionBadgeColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return 'bg-red-500 text-white';
      case 'MEDIUM':
        return 'bg-yellow-500 text-white';
      case 'LOW':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const validateForm = (): boolean => {
    if (!serviceForm) return false;

    for (const section of serviceForm.sections) {
      for (const question of section.questions) {
        if (!isQuestionApplicable(question)) {
          continue;
        }

        if (question.isMandatory) {
          const response = responses[question.id];

          if (!response) {
            toast({
              title: 'Validation Error',
              description: `Please answer: "${question.questionText}"`,
              variant: 'destructive',
            });
            return false;
          }

          switch (question.answerType) {
            case 'CONDITION_SELECT':
              if (!response.selectedConditionId) {
                toast({
                  title: 'Validation Error',
                  description: `Please select a condition for: "${question.questionText}"`,
                  variant: 'destructive',
                });
                return false;
              }
              break;
            case 'TEXT':
              if (!response.textResponse || response.textResponse.trim() === '') {
                toast({
                  title: 'Validation Error',
                  description: `Please provide text for: "${question.questionText}"`,
                  variant: 'destructive',
                });
                return false;
              }
              break;
          }
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      // Prepare responses array
      const responsesArray = Object.values(responses);

      // Add custom questions to responses
      customQuestions.forEach((cq) => {
        if (responses[cq.id]) {
          responsesArray.push({
            ...responses[cq.id],
            questionId: cq.id,
          });
        }
      });

      const submissionData = {
        assetId: asset?.id,
        formId: serviceForm?.id,
        categoryId: asset?.category?.id,
        plantId: asset?.plant?.id,
        responses: responsesArray,
        customQuestions: customQuestions.map((cq) => ({
          questionText: cq.questionText,
          conditionName: cq.conditionName,
          severity: cq.severity,
          priority: cq.priority,
          notes: cq.notes,
          response: responses[cq.id],
        })),
      };

      await api.post('/technician/submit-service-form', submissionData);

      toast({
        title: 'Success',
        description: 'Service form submitted successfully',
      });

      navigate('/technician/dashboard');
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit form',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <TechnicianLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Card className="relative overflow-hidden mb-6">
              <CardHeader>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-9 w-48" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-b border-orange-200">
              <Skeleton className="h-7 w-48" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </TechnicianLayout>
    );
  }

  if (!asset || !serviceForm) {
    return (
      <TechnicianLayout>
        <div className="p-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No service form available for this asset</p>
              <Button onClick={() => navigate('/technician/dashboard')} className="mt-4 mx-auto block">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </TechnicianLayout>
    );
  }

  return (
    <TechnicianLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white shadow-2xl border-orange-400/20">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
            <CardHeader className="relative">
              <CardTitle className="text-3xl font-bold tracking-tight">{serviceForm.serviceName}</CardTitle>
              <p className="text-orange-50/90 text-base mt-2">{serviceForm.description}</p>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-all duration-200">
                  <div className="bg-white/20 p-2.5 rounded-lg">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-orange-50/70 uppercase tracking-wide font-medium">Asset ID</p>
                    <p className="font-semibold text-lg mt-0.5">{asset.assetId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-all duration-200">
                  <div className="bg-white/20 p-2.5 rounded-lg">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-orange-50/70 uppercase tracking-wide font-medium">Category</p>
                    <p className="font-semibold text-lg mt-0.5">{asset.category?.categoryName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-all duration-200">
                  <div className="bg-white/20 p-2.5 rounded-lg">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-orange-50/70 uppercase tracking-wide font-medium">Location</p>
                    <p className="font-semibold text-lg mt-0.5">{asset.location || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Type & Frequency Info */}
        <Card className="mb-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-4 py-1.5 border-orange-300 text-orange-700 font-medium">
                  Form Code: {serviceForm.formCode}
                </Badge>
                <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm px-4 py-1.5 shadow-sm">
                  Inspection Type
                </Badge>
              </div>
              <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors duration-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Question
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Question</DialogTitle>
                    <DialogDescription>
                      Add a custom inspection question with condition and priority
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Question Text *</Label>
                      <Textarea
                        value={newQuestion.questionText}
                        onChange={(e) =>
                          setNewQuestion({ ...newQuestion, questionText: e.target.value })
                        }
                        placeholder="Enter the inspection question..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Condition Name *</Label>
                      <Input
                        value={newQuestion.conditionName}
                        onChange={(e) =>
                          setNewQuestion({ ...newQuestion, conditionName: e.target.value })
                        }
                        placeholder="e.g., Damaged, Missing, Worn Out"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Severity</Label>
                        <Select
                          value={newQuestion.severity}
                          onValueChange={(value) =>
                            setNewQuestion({ ...newQuestion, severity: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Priority (1-10)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={newQuestion.priority}
                          onChange={(e) =>
                            setNewQuestion({ ...newQuestion, priority: parseInt(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={newQuestion.notes}
                        onChange={(e) =>
                          setNewQuestion({ ...newQuestion, notes: e.target.value })
                        }
                        placeholder="Additional notes or instructions..."
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddQuestion(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addCustomQuestion} className="bg-orange-500 hover:bg-orange-600">
                      Add Question
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Inspection Checklist Table */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-b border-orange-200">
            <CardTitle className="text-xl font-semibold text-gray-800">Inspection Checklist</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <tr>
                    <th className="px-4 py-4 text-center w-20 font-semibold tracking-wide text-sm">SL No</th>
                    <th className="px-6 py-4 text-left font-semibold tracking-wide text-sm">Inspection Check List</th>
                    <th className="px-4 py-4 text-left w-52 font-semibold tracking-wide text-sm">
                      Condition (Field in Backend table)
                    </th>
                    <th className="px-4 py-4 text-center w-28 font-semibold tracking-wide text-sm">
                      Y = Satisfactory
                    </th>
                    <th className="px-4 py-4 text-center w-28 font-semibold tracking-wide text-sm">
                      N = Unsatisfactory
                    </th>
                    <th className="px-4 py-4 text-center w-32 font-semibold tracking-wide text-sm">
                      N/A = Not applicable
                    </th>
                    <th className="px-6 py-4 text-left w-52 font-semibold tracking-wide text-sm">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceForm.sections.map((section, sectionIndex) => (
                    <Fragment key={section.id}>
                      {/* Section Header Row */}
                      <tr className="bg-gradient-to-r from-orange-50 to-orange-100/30">
                        <td colSpan={7} className="px-6 py-3 font-semibold text-gray-800 text-base border-y border-orange-200">
                          {section.sectionName}
                          {section.description && (
                            <span className="text-sm text-gray-600 ml-2 font-normal">- {section.description}</span>
                          )}
                        </td>
                      </tr>
                      {/* Questions */}
                      {section.questions
                        .filter((q) => isQuestionApplicable(q))
                        .map((question, questionIndex) => {
                          const slNo = `${sectionIndex + 1}.${questionIndex + 1}`;
                          const response = responses[question.id];

                          return (
                            <tr key={question.id} className="border-b border-gray-200 hover:bg-orange-50/30 transition-colors duration-150">
                              <td className="px-4 py-4 text-center font-semibold text-gray-700">
                                {slNo}
                              </td>
                              <td className="px-6 py-4 border-l border-gray-200">
                                <div>
                                  <p className="font-medium text-gray-800">{question.questionText}</p>
                                  {question.helpText && (
                                    <p className="text-sm text-gray-500 mt-1.5">{question.helpText}</p>
                                  )}
                                  {question.isMandatory && (
                                    <Badge variant="destructive" className="mt-2 text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 border-l border-gray-200">
                                {question.conditions && question.conditions.length > 0 ? (
                                  <div className="space-y-1">
                                    {question.conditions.map((cond) => {
                                      const condName =
                                        cond.conditionSource === 'MASTER'
                                          ? cond.masterCondition?.conditionName
                                          : cond.customConditionName;
                                      const severity =
                                        cond.conditionSource === 'MASTER'
                                          ? cond.masterCondition?.severityLevel
                                          : cond.customSeverityLevel;
                                      return (
                                        <Badge
                                          key={cond.id}
                                          className={getConditionBadgeColor(severity || '')}
                                        >
                                          {condName}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">N/A</span>
                                )}
                              </td>
                              {/* Satisfactory Column */}
                              <td className="px-4 py-4 text-center border-l border-gray-200">
                                <input
                                  type="radio"
                                  name={`response-${question.id}`}
                                  value="SATISFACTORY"
                                  checked={response?.selectedConditionId === 'SATISFACTORY'}
                                  onChange={() =>
                                    handleResponseChange(
                                      question.id,
                                      'selectedConditionId',
                                      'SATISFACTORY'
                                    )
                                  }
                                  className="w-5 h-5 accent-green-500 cursor-pointer hover:scale-110 transition-transform"
                                />
                              </td>
                              {/* Unsatisfactory Column */}
                              <td className="px-4 py-4 text-center border-l border-gray-200">
                                <Select
                                  value={
                                    response?.selectedConditionId !== 'SATISFACTORY' &&
                                      response?.selectedConditionId !== 'NA'
                                      ? response?.selectedConditionId
                                      : ''
                                  }
                                  onValueChange={(value) =>
                                    handleResponseChange(question.id, 'selectedConditionId', value)
                                  }
                                >
                                  <SelectTrigger className="w-full h-9 border-gray-300 hover:border-orange-400 focus:ring-orange-500">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[100]" position="popper" sideOffset={4}>
                                    {question.conditions && question.conditions.length > 0 ? (
                                      question.conditions.map((condition) => {
                                        const conditionName =
                                          condition.conditionSource === 'MASTER'
                                            ? condition.masterCondition?.conditionName
                                            : condition.customConditionName;
                                        const severity =
                                          condition.conditionSource === 'MASTER'
                                            ? condition.masterCondition?.severityLevel
                                            : condition.customSeverityLevel;
                                        return (
                                          <SelectItem key={condition.id} value={condition.id}>
                                            {conditionName}
                                            {severity ? ` (${severity})` : ''}
                                          </SelectItem>
                                        );
                                      })
                                    ) : (
                                      <div className="p-2 text-sm text-gray-500">
                                        No conditions available
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              </td>
                              {/* N/A Column */}
                              <td className="px-4 py-4 text-center border-l border-gray-200">
                                <input
                                  type="radio"
                                  name={`response-${question.id}`}
                                  value="NA"
                                  checked={response?.selectedConditionId === 'NA'}
                                  onChange={() =>
                                    handleResponseChange(question.id, 'selectedConditionId', 'NA')
                                  }
                                  className="w-5 h-5 accent-gray-500 cursor-pointer hover:scale-110 transition-transform"
                                />
                              </td>
                              {/* Notes Column */}
                              <td className="px-6 py-4 border-l border-gray-200">
                                <div className="space-y-3">
                                  {/* Show label for TEXT/NUMBER answer types */}
                                  {(question.answerType === 'TEXT' || question.answerType === 'NUMBER') && (
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                                        {question.answerType === 'TEXT' ? 'Text Answer' : 'Numeric Answer'}
                                      </span>
                                      {question.isMandatory && (
                                        <span className="text-xs text-red-500 font-medium">* Required</span>
                                      )}
                                    </div>
                                  )}
                                  <Textarea
                                    value={response?.technicianNotes || ''}
                                    onChange={(e) =>
                                      handleResponseChange(
                                        question.id,
                                        'technicianNotes',
                                        e.target.value
                                      )
                                    }
                                    placeholder={
                                      question.answerType === 'TEXT'
                                        ? 'Enter your text answer here...'
                                        : question.answerType === 'NUMBER'
                                          ? 'Enter numeric value...'
                                          : 'Add notes...'
                                    }
                                    rows={question.answerType === 'TEXT' ? 2 : 1}
                                    className="text-sm border-gray-300 focus:border-orange-400 focus:ring-orange-500 resize-none"
                                  />

                                  {/* Photo Capture Section */}
                                  {question.requiresPhoto && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <label
                                          htmlFor={`photo-${question.id}`}
                                          className="flex items-center gap-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-300 rounded-lg cursor-pointer transition-colors text-sm text-orange-700 font-medium"
                                        >
                                          <Camera className="h-4 w-4" />
                                          Capture Photo
                                        </label>
                                        <input
                                          id={`photo-${question.id}`}
                                          type="file"
                                          accept="image/*"
                                          capture="environment"
                                          onChange={(e) => handlePhotoCapture(question.id, e)}
                                          className="hidden"
                                        />
                                        {question.isMandatory && !response?.photoUrls?.length && (
                                          <span className="text-xs text-red-500 font-medium">
                                            * Required
                                          </span>
                                        )}
                                      </div>

                                      {/* Display Captured Photos */}
                                      {response?.photoUrls && response.photoUrls.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          {response.photoUrls.map((photoUrl, index) => (
                                            <div
                                              key={index}
                                              className="relative group"
                                            >
                                              <img
                                                src={photoUrl}
                                                alt={`Capture ${index + 1}`}
                                                className="h-20 w-20 object-cover rounded-lg border-2 border-orange-200"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleRemovePhoto(question.id, index)}
                                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  ))}

                  {/* Custom Questions */}
                  {customQuestions.length > 0 && (
                    <Fragment key="custom-questions">
                      <tr className="bg-gradient-to-r from-amber-50 to-amber-100/30">
                        <td colSpan={7} className="px-6 py-3 font-semibold text-gray-800 text-base border-y border-amber-200">
                          <div className="flex items-center gap-2">
                            <span>Custom Questions</span>
                            <Badge className="bg-amber-500 text-white text-xs">Added by Technician</Badge>
                          </div>
                        </td>
                      </tr>
                      {customQuestions.map((cq, index) => {
                        const response = responses[cq.id];
                        return (
                          <tr key={cq.id} className="border-b border-gray-200 hover:bg-amber-50/20 transition-colors duration-150">
                            <td className="px-4 py-4 text-center font-semibold text-gray-700">
                              C{index + 1}
                            </td>
                            <td className="px-6 py-4 border-l border-gray-200">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-gray-800">{cq.questionText}</p>
                                  {cq.notes && (
                                    <p className="text-sm text-gray-500 mt-1.5">{cq.notes}</p>
                                  )}
                                  <Badge variant="outline" className="mt-2 text-xs border-amber-300 text-amber-700">
                                    Priority: {cq.priority}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCustomQuestion(cq.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-4 border-l border-gray-200">
                              <Badge className={getConditionBadgeColor(cq.severity)}>
                                {cq.conditionName}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-center border-l border-gray-200">
                              <input
                                type="radio"
                                name={`response-${cq.id}`}
                                value="SATISFACTORY"
                                checked={response?.selectedConditionId === 'SATISFACTORY'}
                                onChange={() =>
                                  handleResponseChange(cq.id, 'selectedConditionId', 'SATISFACTORY')
                                }
                                className="w-5 h-5 accent-green-500 cursor-pointer hover:scale-110 transition-transform"
                              />
                            </td>
                            <td className="px-4 py-4 text-center border-l border-gray-200">
                              <input
                                type="radio"
                                name={`response-${cq.id}`}
                                value="UNSATISFACTORY"
                                checked={response?.selectedConditionId === 'UNSATISFACTORY'}
                                onChange={() =>
                                  handleResponseChange(
                                    cq.id,
                                    'selectedConditionId',
                                    'UNSATISFACTORY'
                                  )
                                }
                                className="w-5 h-5 accent-red-500 cursor-pointer hover:scale-110 transition-transform"
                              />
                            </td>
                            <td className="px-4 py-4 text-center border-l border-gray-200">
                              <input
                                type="radio"
                                name={`response-${cq.id}`}
                                value="NA"
                                checked={response?.selectedConditionId === 'NA'}
                                onChange={() =>
                                  handleResponseChange(cq.id, 'selectedConditionId', 'NA')
                                }
                                className="w-5 h-5 accent-gray-500 cursor-pointer hover:scale-110 transition-transform"
                              />
                            </td>
                            <td className="px-6 py-4 border-l border-gray-200">
                              <div className="space-y-3">
                                <Textarea
                                  value={response?.technicianNotes || ''}
                                  onChange={(e) =>
                                    handleResponseChange(cq.id, 'technicianNotes', e.target.value)
                                  }
                                  placeholder="Add notes..."
                                  rows={1}
                                  className="text-sm border-gray-300 focus:border-orange-400 focus:ring-orange-500 resize-none"
                                />

                                {/* Photo Capture Section for Custom Questions */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <label
                                      htmlFor={`photo-${cq.id}`}
                                      className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg cursor-pointer transition-colors text-sm text-amber-700 font-medium"
                                    >
                                      <Camera className="h-4 w-4" />
                                      Capture Photo
                                    </label>
                                    <input
                                      id={`photo-${cq.id}`}
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      onChange={(e) => handlePhotoCapture(cq.id, e)}
                                      className="hidden"
                                    />
                                  </div>

                                  {/* Display Captured Photos */}
                                  {response?.photoUrls && response.photoUrls.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {response.photoUrls.map((photoUrl, index) => (
                                        <div
                                          key={index}
                                          className="relative group"
                                        >
                                          <img
                                            src={photoUrl}
                                            alt={`Capture ${index + 1}`}
                                            className="h-20 w-20 object-cover rounded-lg border-2 border-amber-200"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleRemovePhoto(cq.id, index)}
                                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/technician/dashboard')}
            className="px-6 py-5 text-base border-2 hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-5 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              'Submit Inspection'
            )}
          </Button>
        </div>
      </div>
    </TechnicianLayout>
  );
}
