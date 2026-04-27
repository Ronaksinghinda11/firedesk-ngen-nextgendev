import React, { useState, useEffect } from 'react';
import { Save, Camera, FileSignature, MessageSquare, AlertCircle, Check } from 'lucide-react';
import { submissionApi, FormForSubmission, SubmissionSummary } from '../../../services/api/submissionApi';
import AssetCard from '../common/AssetCard';
import FrequencyBadge from '../common/FrequencyBadge';
import SeverityBadge from '../common/SeverityBadge';
import PriorityScoreIndicator from '../common/PriorityScoreIndicator';

interface Answer {
  questionId: string;
  selectedConditionId?: string;
  textResponse?: string;
  numericResponse?: number;
  booleanResponse?: boolean;
  dateResponse?: string;
  photoUrls?: string[];
  signatureUrl?: string;
  technicianNotes?: string;
}

interface ServiceSubmissionFormProps {
  assetId: string;
  frequencyId: string;
  scheduleId?: string;
  scheduledDate: string;
  onSuccess?: (summary: SubmissionSummary) => void;
}

const ServiceSubmissionForm: React.FC<ServiceSubmissionFormProps> = ({
  assetId,
  frequencyId,
  scheduleId,
  scheduledDate,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormForSubmission | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  useEffect(() => {
    loadForm();
  }, [assetId, frequencyId]);

  const loadForm = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await submissionApi.getFormForSubmission(assetId, frequencyId);
      setFormData(data);

      // Initialize answers object
      const initialAnswers: Record<string, Answer> = {};
      data.form.sections?.forEach((section) => {
        section.questions?.forEach((question) => {
          initialAnswers[question.id] = {
            questionId: question.id,
          };
        });
      });
      setAnswers(initialAnswers);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load service form');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, field: keyof Answer, value: any) => {
    setAnswers({
      ...answers,
      [questionId]: {
        ...answers[questionId],
        [field]: value,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData) return;

    try {
      setSubmitting(true);
      setError(null);

      // Convert answers to array and filter out empty responses
      const responses = Object.values(answers).filter((answer) => {
        // At least one field must be filled
        return (
          answer.selectedConditionId ||
          answer.textResponse ||
          answer.numericResponse !== undefined ||
          answer.booleanResponse !== undefined ||
          answer.dateResponse ||
          answer.photoUrls?.length ||
          answer.signatureUrl ||
          answer.technicianNotes
        );
      });

      const submissionData = {
        assetId,
        formId: formData.form.id,
        frequencyId,
        scheduleId,
        scheduledDate,
        responses,
      };

      const result = await submissionApi.submit(submissionData);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit service form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: any) => {
    const answer = answers[question.id] || {};

    switch (question.answerType) {
      case 'CONDITION_SELECT':
        return (
          <div>
            <select
              value={answer.selectedConditionId || ''}
              onChange={(e) => handleAnswerChange(question.id, 'selectedConditionId', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={question.isMandatory}
            >
              <option value="">-- Select Condition --</option>
              {question.conditions?.map((condition: any) => {
                const conditionName =
                  condition.conditionSource === 'MASTER'
                    ? condition.masterCondition?.conditionName
                    : condition.customConditionName;
                const severity =
                  condition.conditionSource === 'MASTER'
                    ? condition.masterCondition?.severityLevel
                    : condition.customSeverityLevel;
                return (
                  <option key={condition.id} value={condition.id}>
                    {conditionName} ({severity})
                  </option>
                );
              })}
            </select>
          </div>
        );

      case 'TEXT':
        return (
          <textarea
            value={answer.textResponse || ''}
            onChange={(e) => handleAnswerChange(question.id, 'textResponse', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            required={question.isMandatory}
            placeholder="Enter your response..."
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            value={answer.numericResponse || ''}
            onChange={(e) =>
              handleAnswerChange(question.id, 'numericResponse', parseFloat(e.target.value))
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={question.isMandatory}
            placeholder="Enter a number..."
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={answer.dateResponse || ''}
            onChange={(e) => handleAnswerChange(question.id, 'dateResponse', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={question.isMandatory}
          />
        );

      case 'BOOLEAN':
        return (
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`boolean_${question.id}`}
                checked={answer.booleanResponse === true}
                onChange={() => handleAnswerChange(question.id, 'booleanResponse', true)}
                className="h-4 w-4 text-blue-600"
                required={question.isMandatory}
              />
              <span className="text-gray-900">Satisfactory</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`boolean_${question.id}`}
                checked={answer.booleanResponse === false}
                onChange={() => handleAnswerChange(question.id, 'booleanResponse', false)}
                className="h-4 w-4 text-blue-600"
                required={question.isMandatory}
              />
              <span className="text-gray-900">Unsatisfactory</span>
            </label>
          </div>
        );

      case 'PHOTO':
        return (
          <div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Camera className="h-5 w-5" />
              Upload Photo
            </button>
            {answer.photoUrls && answer.photoUrls.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                {answer.photoUrls.length} photo(s) uploaded
              </div>
            )}
          </div>
        );

      case 'SIGNATURE':
        return (
          <div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <FileSignature className="h-5 w-5" />
              Capture Signature
            </button>
            {answer.signatureUrl && (
              <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                Signature captured
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-gray-500">Unsupported question type</p>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading service form...</div>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-800 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-semibold">Error</span>
        </div>
        <p className="text-red-700">{error || 'Failed to load form'}</p>
      </div>
    );
  }

  const currentSection = formData.form.sections?.[currentSectionIndex];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{formData.form.serviceName}</h1>
        {formData.form.description && (
          <p className="text-gray-600 mb-4">{formData.form.description}</p>
        )}
      </div>

      {/* Asset Info */}
      <div className="mb-6">
        <AssetCard
          asset={formData.asset}
          showHealthStatus={true}
          showPriorityScore={false}
          showInspectionDates={false}
          compact={false}
        />
      </div>

      {/* Progress Indicator */}
      {formData.form.sections && formData.form.sections.length > 1 && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Section {currentSectionIndex + 1} of {formData.form.sections.length}
            </span>
            <span className="text-sm text-gray-600">{currentSection?.sectionName}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentSectionIndex + 1) / formData.form.sections.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {currentSection && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {currentSection.sectionName}
              </h2>
              {currentSection.description && (
                <p className="text-gray-600 text-sm">{currentSection.description}</p>
              )}
            </div>

            <div className="space-y-6">
              {currentSection.questions?.map((question, index) => (
                <div key={question.id} className="pb-6 border-b border-gray-200 last:border-b-0">
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <label className="block font-medium text-gray-900">
                        {index + 1}. {question.questionText}
                        {question.isMandatory && <span className="text-red-600 ml-1">*</span>}
                      </label>
                    </div>
                    {question.helpText && (
                      <p className="text-sm text-gray-600 mb-3">{question.helpText}</p>
                    )}
                  </div>

                  {renderQuestion(question)}

                  {/* Photo Upload (if required) */}
                  {question.requiresPhoto && (
                    <div className="mt-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Camera className="h-4 w-4" />
                        Add Photo
                      </button>
                    </div>
                  )}

                  {/* Technician Notes */}
                  {(question.requiresNotes || answers[question.id]?.technicianNotes) && (
                    <div className="mt-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <MessageSquare className="h-4 w-4" />
                        Technician Notes {question.requiresNotes && <span className="text-red-600">*</span>}
                      </label>
                      <textarea
                        value={answers[question.id]?.technicianNotes || ''}
                        onChange={(e) =>
                          handleAnswerChange(question.id, 'technicianNotes', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        rows={2}
                        placeholder="Add any additional notes or observations..."
                        required={question.requiresNotes}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
            disabled={currentSectionIndex === 0}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous Section
          </button>

          <div className="flex gap-3">
            {formData.form.sections &&
            currentSectionIndex < formData.form.sections.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setCurrentSectionIndex(
                    Math.min(
                      formData.form.sections!.length - 1,
                      currentSectionIndex + 1
                    )
                  )
                }
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next Section
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                {submitting ? 'Submitting...' : 'Submit Service Form'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ServiceSubmissionForm;
