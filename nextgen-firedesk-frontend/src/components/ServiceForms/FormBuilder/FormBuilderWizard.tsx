import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Save } from 'lucide-react';
import BasicInfoStep from './steps/BasicInfoStep';
import SectionsStep from './steps/SectionsStep';
import QuestionsStep from './steps/QuestionsStep';
import PreviewStep from './steps/PreviewStep';
import { serviceFormApi, CreateServiceFormData } from '../../../services/api/serviceFormApi';

type WizardStep = 'basic' | 'sections' | 'questions' | 'preview';

interface Section {
  tempId: string;
  sectionName: string;
  sectionOrder: number;
  description?: string;
  isMandatory: boolean;
  questions: Question[];
}

interface Question {
  tempId: string;
  sectionId: string;
  questionText: string;
  questionCode?: string;
  questionOrder: number;
  applicableFrequencies: string[];
  answerType: string;
  isMandatory: boolean;
  requiresPhoto: boolean;
  requiresNotes: boolean;
  helpText?: string;
  conditions: Condition[];
}

interface Condition {
  tempId: string;
  conditionSource: 'MASTER' | 'CUSTOM';
  conditionMasterId?: string;
  customConditionName?: string;
  customSeverityLevel?: string;
  customPriorityScore?: number;
  customHealthImpact?: string;
  displayOrder: number;
}

interface FormBuilderWizardProps {
  formId?: string;
}

const FormBuilderWizard: React.FC<FormBuilderWizardProps> = ({ formId }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(!!formId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isEditMode = !!formId;

  // Form data state
  const [basicInfo, setBasicInfo] = useState({
    serviceName: '',
    formCode: '',
    description: '',
    categoryId: '',
  });

  const [sections, setSections] = useState<Section[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Load existing form data if editing
  useEffect(() => {
    if (formId) {
      const loadFormData = async () => {
        try {
          setLoadingForm(true);
          const formData = await serviceFormApi.getById(formId);
          
          // Populate basic info
          setBasicInfo({
            serviceName: formData.serviceName || '',
            formCode: formData.formCode || '',
            description: formData.description || '',
            categoryId: formData.categoryId || '',
          });

          // Populate sections and questions
          if (formData.sections && formData.sections.length > 0) {
            const loadedSections: Section[] = formData.sections.map((section: any) => ({
              tempId: section.id || `section-${Date.now()}-${Math.random()}`,
              sectionName: section.sectionName,
              sectionOrder: section.sectionOrder,
              description: section.description,
              isMandatory: section.isMandatory,
              questions: section.questions?.map((question: any) => ({
                tempId: question.id || `question-${Date.now()}-${Math.random()}`,
                sectionId: section.id || `section-${Date.now()}-${Math.random()}`,
                questionText: question.questionText,
                questionCode: question.questionCode,
                questionOrder: question.questionOrder,
                applicableFrequencies: question.applicableFrequencies || [],
                answerType: question.answerType,
                isMandatory: question.isMandatory,
                requiresPhoto: question.requiresPhoto,
                requiresNotes: question.requiresNotes,
                helpText: question.helpText,
                conditions: question.conditions?.map((condition: any) => ({
                  tempId: condition.id || `condition-${Date.now()}-${Math.random()}`,
                  conditionSource: condition.conditionSource,
                  conditionMasterId: condition.conditionMasterId,
                  customConditionName: condition.customConditionName,
                  customSeverityLevel: condition.customSeverityLevel,
                  customPriorityScore: condition.customPriorityScore,
                  customHealthImpact: condition.customHealthImpact,
                  displayOrder: condition.displayOrder,
                })) || [],
              })) || [],
            }));
            setSections(loadedSections);
          }
        } catch (err: unknown) {
          const error = err as { response?: { data?: { message?: string } } };
          setError(error.response?.data?.message || 'Failed to load form data');
        } finally {
          setLoadingForm(false);
        }
      };

      loadFormData();
    }
  }, [formId]);

  const steps: { id: WizardStep; label: string; order: number }[] = [
    { id: 'basic', label: 'Basic Info', order: 1 },
    { id: 'sections', label: 'Sections', order: 2 },
    { id: 'questions', label: 'Questions', order: 3 },
    { id: 'preview', label: 'Preview', order: 4 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Transform data for API
      const formData: CreateServiceFormData = {
        serviceName: basicInfo.serviceName,
        formCode: basicInfo.formCode && basicInfo.formCode.trim() ? basicInfo.formCode : undefined,
        description: basicInfo.description && basicInfo.description.trim() ? basicInfo.description : undefined,
        categoryId: basicInfo.categoryId && basicInfo.categoryId.trim() ? basicInfo.categoryId : undefined,
        sections: sections.map((section) => ({
          sectionName: section.sectionName,
          sectionOrder: section.sectionOrder,
          description: section.description && section.description.trim() ? section.description : undefined,
          isMandatory: section.isMandatory,
          questions: section.questions.map((question) => ({
            questionText: question.questionText,
            questionCode: question.questionCode && question.questionCode.trim() ? question.questionCode : undefined,
            questionOrder: question.questionOrder,
            applicableFrequencies: question.applicableFrequencies && question.applicableFrequencies.length > 0 
              ? question.applicableFrequencies.filter(f => f && f.trim()) 
              : [],
            answerType: question.answerType,
            isMandatory: question.isMandatory,
            requiresPhoto: question.requiresPhoto,
            requiresNotes: question.requiresNotes,
            helpText: question.helpText && question.helpText.trim() ? question.helpText : undefined,
            conditions: question.conditions && question.conditions.length > 0 ? question.conditions.map((condition) => ({
              conditionSource: condition.conditionSource,
              conditionMasterId: condition.conditionMasterId || undefined,
              customConditionName: condition.customConditionName && condition.customConditionName.trim() ? condition.customConditionName : undefined,
              customSeverityLevel: condition.customSeverityLevel || undefined,
              customPriorityScore: condition.customPriorityScore,
              customHealthImpact: condition.customHealthImpact || undefined,
              displayOrder: condition.displayOrder,
            })) : undefined,
          })),
        })),
      };

      if (isEditMode && formId) {
        // Use update API to modify the existing form
        await serviceFormApi.update(formId, formData);
      } else {
        await serviceFormApi.create(formData);
      }
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} service form`);
    } finally {
      setLoading(false);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 'basic':
        return basicInfo.serviceName.trim() !== '';
      case 'sections':
        return sections.length > 0;
      case 'questions':
        return sections.every((s) => s.questions.length > 0);
      default:
        return true;
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Form {isEditMode ? 'Updated' : 'Created'} Successfully!
          </h2>
          <p className="text-gray-600 mb-6">Your service form has been saved.</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/admin/service-forms')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Forms
            </button>
            {!isEditMode && (
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Create Another
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loadingForm) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isEditMode ? 'Edit Service Form' : 'Create Service Form'}
          </h1>
          <p className="text-gray-600">
            Build a dynamic service form with frequency-based questions
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStepIndex >= index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStepIndex > index ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      step.order
                    )}
                  </div>
                  <span
                    className={`ml-3 font-medium ${
                      currentStepIndex >= index ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      currentStepIndex > index ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 min-h-[500px]">
          {currentStep === 'basic' && (
            <BasicInfoStep data={basicInfo} onChange={setBasicInfo} />
          )}
          {currentStep === 'sections' && (
            <SectionsStep
              sections={sections}
              onChange={setSections}
              onSelectSection={setCurrentSectionId}
            />
          )}
          {currentStep === 'questions' && (
            <QuestionsStep
              sections={sections}
              onChange={setSections}
              currentSectionId={currentSectionId}
              onSelectSection={setCurrentSectionId}
            />
          )}
          {currentStep === 'preview' && (
            <PreviewStep basicInfo={basicInfo} sections={sections} />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </button>

          <div className="flex gap-3">
            {currentStep === 'preview' ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                {loading ? 'Saving...' : 'Save Form'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilderWizard;
