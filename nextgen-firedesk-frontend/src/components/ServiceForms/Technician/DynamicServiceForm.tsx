/**
 * Dynamic Service Form Component
 * Renders dynamic service forms based on inspectionType and frequency
 */

import { useState, useEffect, Fragment } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Camera, Trash2, AlertCircle, Check, X, MinusCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuestionAnswer {
  questionId: string;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NA';
  nonComplianceConditionId?: string | null;
  notes?: string;
  photoBase64?: string;
}

interface FormQuestion {
  id: string;
  questionText: string;
  questionCode: string;
  questionOrder: number;
  answerType: 'BOOLEAN'; // All questions are now boolean compliance
  isMandatory: boolean;
  requiresPhoto: boolean;
  requiresNotes: boolean;
  helpText?: string;
  defaultCondition?: {
    id: string;
    conditionName: string;
    severityLevel: string;
    priorityScore: number;
    healthImpact: string;
  } | null;
  existingAnswer?: {
    id: string;
    complianceStatus: string;
    answerValue: string;
    selectedConditionId?: string;
    nonComplianceConditionId?: string;
    notes: string;
    hasPhoto: boolean;
    answeredAt: string;
  } | null;
}

interface FormSection {
  id: string;
  sectionName: string;
  sectionOrder: number;
  description?: string;
  isMandatory: boolean;
  questions: FormQuestion[];
}

interface DynamicServiceFormProps {
  serviceId: string;
  formData: {
    id: string;
    serviceName: string;
    formCode: string;
    description?: string;
    sections: FormSection[];
  };
  onSubmit: (answers: QuestionAnswer[]) => Promise<void>;
  readOnly?: boolean;
}

export default function DynamicServiceForm({
  serviceId,
  formData,
  onSubmit,
  readOnly = false,
}: DynamicServiceFormProps) {
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize existing answers
  useEffect(() => {
    const existingAnswers: Record<string, QuestionAnswer> = {};
    formData.sections.forEach(section => {
      section.questions.forEach(question => {
        if (question.existingAnswer) {
          existingAnswers[question.id] = {
            questionId: question.id,
            complianceStatus: question.existingAnswer.complianceStatus as 'COMPLIANT' | 'NON_COMPLIANT' | 'NA',
            nonComplianceConditionId: question.existingAnswer.nonComplianceConditionId || null,
            notes: question.existingAnswer.notes || '',
          };
        }
      });
    });
    setAnswers(existingAnswers);
  }, [formData]);

  const handleComplianceChange = (questionId: string, status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NA', defaultConditionId?: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        complianceStatus: status,
        // Auto-apply default condition when NON_COMPLIANT
        nonComplianceConditionId: status === 'NON_COMPLIANT' ? defaultConditionId || null : null,
        notes: prev[questionId]?.notes || '',
        photoBase64: prev[questionId]?.photoBase64
      },
    }));
    setValidationErrors([]);
  };

  const handleAnswerChange = (
    questionId: string,
    field: keyof QuestionAnswer,
    value: any
  ) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        complianceStatus: prev[questionId]?.complianceStatus || 'COMPLIANT',
        [field]: value,
      },
    }));
    // Clear validation errors when user makes changes
    setValidationErrors([]);
  };

  const handlePhotoCapture = async (
    questionId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleAnswerChange(questionId, 'photoBase64', base64String);
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

  const handleRemovePhoto = (questionId: string) => {
    setAnswers(prev => {
      const updated = { ...prev };
      if (updated[questionId]) {
        delete updated[questionId].photoBase64;
      }
      return updated;
    });
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    formData.sections.forEach(section => {
      section.questions.forEach(question => {
        if (question.isMandatory) {
          const answer = answers[question.id];

          // Check if compliance status is selected
          if (!answer || !answer.complianceStatus) {
            errors.push(`"${question.questionText}" requires a compliance status (YES/NO/NA)`);
          }

          if (question.requiresPhoto && (!answer || !answer.photoBase64)) {
            errors.push(`Photo is required for "${question.questionText}"`);
          }

          if (question.requiresNotes && (!answer || !answer.notes || answer.notes.trim() === '')) {
            errors.push(`Notes are required for "${question.questionText}"`);
          }
        }
      });
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const answersArray = Object.values(answers);
      await onSubmit(answersArray);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
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

  const renderQuestion = (question: FormQuestion, slNo: string) => {
    const answer = answers[question.id];

    return (
      <tr key={question.id} className="border-b border-gray-200 hover:bg-orange-50/30 transition-colors duration-150">
        {/* Serial Number */}
        <td className="px-4 py-4 text-center font-semibold text-gray-700">
          {slNo}
        </td>

        {/* Question Text */}
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

        {/* Answer Input */}
        <td className="px-6 py-4 border-l border-gray-200" colSpan={5}>
          <div className="space-y-3">
            {/* Main Answer Input */}
            {renderAnswerInput(question, answer)}

            {/* Notes */}
            <div>
              <Label className="text-xs text-gray-600">
                Notes {question.requiresNotes && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                value={answer?.notes || ''}
                onChange={(e) => handleAnswerChange(question.id, 'notes', e.target.value)}
                placeholder="Add notes..."
                rows={2}
                className="text-sm"
                disabled={readOnly}
              />
            </div>

            {/* Photo Upload */}
            {(question.requiresPhoto || question.answerType === 'PHOTO') && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">
                  Photo {question.requiresPhoto && <span className="text-red-500">*</span>}
                </Label>
                {!readOnly && (
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
                  </div>
                )}

                {answer?.photoBase64 && (
                  <div className="relative inline-block">
                    <img
                      src={answer.photoBase64}
                      alt="Captured"
                      className="h-32 w-32 object-cover rounded-lg border-2 border-orange-200"
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(question.id)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderAnswerInput = (question: FormQuestion, answer: QuestionAnswer | undefined) => {
    const complianceStatus = answer?.complianceStatus;
    const defaultConditionId = question.defaultCondition?.id;

    return (
      <div className="space-y-3">
        {/* YES / NO / NA Buttons */}
        <div>
          <Label className="text-xs text-gray-600 mb-2 block">
            {question.isMandatory && <span className="text-red-500">* </span>}
            Compliance Status
          </Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={complianceStatus === 'COMPLIANT' ? 'default' : 'outline'}
              className={`flex-1 ${
                complianceStatus === 'COMPLIANT'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'hover:bg-green-50 hover:border-green-600'
              }`}
              onClick={() => handleComplianceChange(question.id, 'COMPLIANT')}
              disabled={readOnly}
            >
              <Check className="h-4 w-4 mr-2" />
              YES (Compliant)
            </Button>
            <Button
              type="button"
              variant={complianceStatus === 'NON_COMPLIANT' ? 'default' : 'outline'}
              className={`flex-1 ${
                complianceStatus === 'NON_COMPLIANT'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'hover:bg-red-50 hover:border-red-600'
              }`}
              onClick={() => handleComplianceChange(question.id, 'NON_COMPLIANT', defaultConditionId)}
              disabled={readOnly}
            >
              <X className="h-4 w-4 mr-2" />
              NO (Non-Compliant)
            </Button>
            <Button
              type="button"
              variant={complianceStatus === 'NA' ? 'default' : 'outline'}
              className={`flex-1 ${
                complianceStatus === 'NA'
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'hover:bg-gray-50 hover:border-gray-600'
              }`}
              onClick={() => handleComplianceChange(question.id, 'NA')}
              disabled={readOnly}
            >
              <MinusCircle className="h-4 w-4 mr-2" />
              N/A
            </Button>
          </div>
        </div>

        {/* Show applied condition info for NON_COMPLIANT */}
        {complianceStatus === 'NON_COMPLIANT' && question.defaultCondition && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  question.defaultCondition.severityLevel === 'CRITICAL' ? 'border-red-600 text-red-600 bg-red-50' :
                  question.defaultCondition.severityLevel === 'HIGH' ? 'border-orange-600 text-orange-600 bg-orange-50' :
                  question.defaultCondition.severityLevel === 'MEDIUM' ? 'border-yellow-600 text-yellow-600 bg-yellow-50' :
                  'border-gray-600 text-gray-600 bg-gray-50'
                }
              >
                {question.defaultCondition.severityLevel}
              </Badge>
              <span className="text-sm font-medium text-gray-900">{question.defaultCondition.conditionName}</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Priority: {question.defaultCondition.priorityScore} | {question.defaultCondition.healthImpact}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Please fix the following errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Header */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-b border-orange-200">
          <CardTitle className="text-xl font-semibold text-gray-800">
            {formData.serviceName}
          </CardTitle>
          {formData.description && (
            <p className="text-sm text-gray-600 mt-1">{formData.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Form Content */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <tr>
                  <th className="px-4 py-4 text-center w-20 font-semibold text-sm">SL No</th>
                  <th className="px-6 py-4 text-left font-semibold text-sm">Question</th>
                  <th className="px-6 py-4 text-left font-semibold text-sm" colSpan={5}>Answer</th>
                </tr>
              </thead>
              <tbody>
                {formData.sections.map((section, sectionIndex) => (
                  <Fragment key={section.id}>
                    {/* Section Header */}
                    <tr className="bg-gradient-to-r from-orange-50 to-orange-100/30">
                      <td colSpan={7} className="px-6 py-3 font-semibold text-gray-800 text-base border-y border-orange-200">
                        {section.sectionName}
                        {section.description && (
                          <span className="text-sm text-gray-600 ml-2 font-normal">
                            - {section.description}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Questions */}
                    {section.questions.map((question, questionIndex) => {
                      const slNo = `${sectionIndex + 1}.${questionIndex + 1}`;
                      return renderQuestion(question, slNo);
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      {!readOnly && (
        <div className="flex justify-end gap-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-5 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              'Submit Form'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
