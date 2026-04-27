import React, { useState } from 'react';
import { FileText, LayoutList, HelpCircle, CheckCircle, AlertCircle } from 'lucide-react';
import FrequencyBadge from '../../common/FrequencyBadge';
import { InspectionFrequency } from '../../../../services/api/serviceFormApi';

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
  questionText: string;
  questionCode?: string;
  questionOrder: number;
  applicableFrequencies: string[];
  answerType: string;
  isMandatory: boolean;
  requiresPhoto: boolean;
  requiresNotes: boolean;
  helpText?: string;
  conditions: any[];
}

interface PreviewStepProps {
  basicInfo: {
    serviceName: string;
    formCode: string;
    description: string;
    categoryId: string;
  };
  sections: Section[];
}

const PreviewStep: React.FC<PreviewStepProps> = ({ basicInfo, sections }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const mandatoryQuestions = sections.reduce(
    (sum, s) => sum + s.questions.filter((q) => q.isMandatory).length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Preview & Submit</h2>
        <p className="text-gray-600">
          Review your service form before submitting. Make sure all details are correct.
        </p>
      </div>

      {/* Summary Card */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{sections.length}</div>
            <div className="text-sm text-gray-600">Sections</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalQuestions}</div>
            <div className="text-sm text-gray-600">Questions</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{mandatoryQuestions}</div>
            <div className="text-sm text-gray-600">Mandatory</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {sections.reduce((sum, s) => sum + s.questions.reduce((qSum, q) => qSum + q.conditions.length, 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Conditions</div>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Service Name
            </label>
            <p className="text-gray-900 font-medium">{basicInfo.serviceName}</p>
          </div>
          {basicInfo.formCode && (
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Form Code
              </label>
              <p className="text-gray-900 font-mono text-sm">{basicInfo.formCode}</p>
            </div>
          )}
          {basicInfo.description && (
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Description
              </label>
              <p className="text-gray-700 text-sm">{basicInfo.description}</p>
            </div>
          )}
          {basicInfo.categoryId && (
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Category ID
              </label>
              <p className="text-gray-900 font-mono text-sm">{basicInfo.categoryId}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sections and Questions */}
      <div className="space-y-3">
        {sections.map((section, sectionIndex) => (
          <div key={section.tempId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(section.tempId)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LayoutList className="h-5 w-5 text-gray-400" />
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">
                    {section.sectionOrder}. {section.sectionName}
                  </h4>
                  {section.description && (
                    <p className="text-sm text-gray-600">{section.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
                    {section.isMandatory && ' • Required Section'}
                  </p>
                </div>
              </div>
              <div className="text-gray-400">
                {expandedSections.has(section.tempId) ? '−' : '+'}
              </div>
            </button>

            {expandedSections.has(section.tempId) && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-200">
                {section.questions.map((question, questionIndex) => (
                  <div key={question.tempId} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-700">
                            Q{questionIndex + 1}.
                          </span>
                          <span className="text-sm text-gray-900">{question.questionText}</span>
                          {question.isMandatory && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        {question.questionCode && (
                          <p className="text-xs text-gray-500 font-mono ml-6">{question.questionCode}</p>
                        )}
                      </div>
                    </div>

                    <div className="ml-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Answer Type:</span>
                        <span className="text-xs font-medium text-gray-900">{question.answerType}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-gray-600">Frequencies:</span>
                        {question.applicableFrequencies.map((freqId) => (
                          <span key={freqId} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                            {freqId.substring(0, 8)}...
                          </span>
                        ))}
                      </div>

                      {question.helpText && (
                        <div className="flex items-start gap-1.5 text-xs text-gray-600">
                          <HelpCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span>{question.helpText}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs">
                        {question.requiresPhoto && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                            Photo Required
                          </span>
                        )}
                        {question.requiresNotes && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                            Notes Required
                          </span>
                        )}
                        {question.conditions.length > 0 && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">
                            {question.conditions.length} Condition{question.conditions.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Validation Summary */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span className="font-semibold">Form is ready to submit</span>
        </div>
        <p className="text-sm text-green-700 mt-2">
          All required fields are complete. Click "Save Form" to create this service form.
        </p>
      </div>

      {sections.length === 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Cannot submit - No sections added</span>
          </div>
          <p className="text-sm text-red-700 mt-2">
            Please go back and add at least one section with questions.
          </p>
        </div>
      )}
    </div>
  );
};

export default PreviewStep;
