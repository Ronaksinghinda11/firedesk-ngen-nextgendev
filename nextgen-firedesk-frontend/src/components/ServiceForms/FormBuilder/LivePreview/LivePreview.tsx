import React, { useState } from 'react';
import { Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import FrequencyBadge from '@/components/ServiceForms/common/FrequencyBadge';
import { getAllFrequencies } from '@/constants/serviceFormConstants';

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

interface BasicInfo {
  serviceName: string;
  formCode: string;
  description: string;
  categoryId: string;
}

interface LivePreviewProps {
  basicInfo: BasicInfo;
  sections: Section[];
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  basicInfo,
  sections,
}) => {
  const [compactMode, setCompactMode] = useState(false);
  const frequencies = getAllFrequencies();

  const getFrequencyName = (code: string) => {
    const freq = frequencies.find(f => f.code === code);
    return freq?.name || code;
  };

  const getAnswerTypeLabel = (answerType: string) => {
    const labels: Record<string, string> = {
      'CONDITION_SELECT': 'Condition',
      'TEXT': 'Text',
      'NUMBER': 'Number',
      'DATE': 'Date',
      'BOOLEAN': 'Yes/No',
      'PHOTO': 'Photo',
      'SIGNATURE': 'Signature',
      'MULTI_SELECT': 'Multiple Choice',
    };
    return labels[answerType] || answerType;
  };

  // Calculate stats
  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
  const mandatoryQuestions = sections.reduce(
    (acc, s) => acc + s.questions.filter(q => q.isMandatory).length,
    0
  );
  const totalConditions = sections.reduce(
    (acc, s) => acc + s.questions.reduce((qacc, q) => qacc + q.conditions.length, 0),
    0
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold text-gray-800">Live Preview</h2>
          </div>

          <button
            onClick={() => setCompactMode(!compactMode)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {compactMode ? 'Detailed' : 'Compact'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-semibold text-blue-700">{sections.length}</div>
            <div className="text-gray-600">Sections</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-semibold text-green-700">{totalQuestions}</div>
            <div className="text-gray-600">Questions</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="font-semibold text-orange-700">{totalConditions}</div>
            <div className="text-gray-600">Conditions</div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <ScrollArea className="flex-1 p-4">
        {!basicInfo.serviceName && sections.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-gray-400">
            <div>
              <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Preview will appear here</p>
              <p className="text-xs mt-1">Start building your form</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Form Header */}
            <Card className="border-2 border-orange-200">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                <CardTitle className="text-xl text-gray-900">
                  {basicInfo.serviceName || 'Untitled Form'}
                </CardTitle>
                {basicInfo.description && (
                  <p className="text-sm text-gray-600 mt-2">{basicInfo.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {basicInfo.formCode && (
                    <Badge variant="outline" className="text-xs font-mono">
                      {basicInfo.formCode}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {mandatoryQuestions} Required
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Sections */}
            {sections.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-400">
                  <p className="text-sm">No sections yet</p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" defaultValue={sections.map(s => s.tempId)} className="space-y-3">
                {sections.map((section, sectionIndex) => (
                  <AccordionItem
                    key={section.tempId}
                    value={section.tempId}
                    className="border rounded-lg bg-white overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3 w-full">
                        <Badge className="bg-blue-500">
                          {sectionIndex + 1}
                        </Badge>
                        <span className="font-semibold text-gray-900 flex-1 text-left">
                          {section.sectionName || `Section ${sectionIndex + 1}`}
                          {section.isMandatory && <span className="text-red-500 ml-1">*</span>}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {section.questions.length} Q
                        </Badge>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4">
                      {section.description && (
                        <p className="text-sm text-gray-600 mb-4 italic">
                          {section.description}
                        </p>
                      )}

                      {section.questions.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm">
                          No questions in this section
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {section.questions.map((question, questionIndex) => (
                            <div
                              key={question.tempId}
                              className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-start gap-3 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {sectionIndex + 1}.{questionIndex + 1}
                                </Badge>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {question.questionText || 'Untitled Question'}
                                    {question.isMandatory && <span className="text-red-500 ml-1">*</span>}
                                  </p>

                                  {question.helpText && (
                                    <p className="text-xs text-gray-500 mt-1 italic">
                                      💡 {question.helpText}
                                    </p>
                                  )}

                                  {!compactMode && (
                                    <div className="mt-3 space-y-2">
                                      {/* Answer Type */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Type:</span>
                                        <Badge variant="outline" className="text-xs">
                                          {getAnswerTypeLabel(question.answerType)}
                                        </Badge>
                                      </div>

                                      {/* Frequencies */}
                                      {question.applicableFrequencies.length > 0 && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500">Frequency:</span>
                                          <div className="flex flex-wrap gap-1">
                                            {question.applicableFrequencies.map(freq => {
                                              const freqObj = frequencies.find(f => f.code === freq);
                                              return freqObj ? (
                                                <FrequencyBadge
                                                  key={freq}
                                                  frequency={freqObj}
                                                  size="sm"
                                                />
                                              ) : null;
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Conditions */}
                                      {question.answerType === 'CONDITION_SELECT' && question.conditions.length > 0 && (
                                        <div className="mt-2">
                                          <span className="text-xs text-gray-500 block mb-1">
                                            Conditions ({question.conditions.length}):
                                          </span>
                                          <div className="flex flex-wrap gap-1">
                                            {question.conditions.map((cond) => (
                                              <Badge
                                                key={cond.tempId}
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                {cond.customConditionName || 'Condition'}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Requirements */}
                                      <div className="flex flex-wrap gap-2 text-xs">
                                        {question.requiresPhoto && (
                                          <Badge variant="outline" className="text-xs">
                                            📷 Photo
                                          </Badge>
                                        )}
                                        {question.requiresNotes && (
                                          <Badge variant="outline" className="text-xs">
                                            📝 Notes
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
