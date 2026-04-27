import React from 'react';
import { SectionProperties } from './SectionProperties';
import { QuestionProperties } from './QuestionProperties';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Section {
  tempId: string;
  sectionName: string;
  sectionOrder: number;
  description?: string;
  isMandatory: boolean;
  questions: any[];
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
  conditions: any[];
}

interface BasicInfo {
  serviceName: string;
  formCode: string;
  description: string;
  categoryId: string;
}

interface PropertiesPanelProps {
  selectedItem: {
    type: 'section' | 'question' | null;
    id: string | null;
  };
  sections: Section[];
  basicInfo: BasicInfo;
  onUpdateBasicInfo: (updates: Partial<BasicInfo>) => void;
  onUpdateSection: (sectionId: string, updates: Partial<Section>) => void;
  onUpdateQuestion: (sectionId: string, questionId: string, updates: Partial<Question>) => void;
  onDeleteSection: (sectionId: string) => void;
  onDeleteQuestion: (sectionId: string, questionId: string) => void;
  validationErrors?: {
    form?: string;
    sections?: Record<string, string>;
    questions?: Record<string, string>;
  };
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedItem,
  sections,
  basicInfo,
  onUpdateBasicInfo,
  onUpdateSection,
  onUpdateQuestion,
  onDeleteSection,
  onDeleteQuestion,
  validationErrors = {},
}) => {
  // Find selected section or question
  const selectedSection = selectedItem.type === 'section'
    ? sections.find(s => s.tempId === selectedItem.id)
    : null;

  let selectedQuestion: Question | null = null;
  let questionSectionId: string | null = null;

  if (selectedItem.type === 'question') {
    for (const section of sections) {
      const question = section.questions.find(q => q.tempId === selectedItem.id);
      if (question) {
        selectedQuestion = question;
        questionSectionId = section.tempId;
        break;
      }
    }
  }

  // Render content based on selection
  const renderContent = () => {
    // Nothing selected - show welcome message
    if (!selectedItem.type) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md px-6">
            <div className="mb-6">
              <div className="inline-flex p-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full">
                <FileText className="h-12 w-12 text-orange-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to Form Builder
            </h3>
            <p className="text-gray-600 mb-6">
              Start building your form by adding a section from the tree view on the left.
              Select any item to edit its properties here.
            </p>

            {/* Form Info Summary */}
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Form:</span>
                  <span className="font-semibold text-gray-900">{basicInfo.serviceName}</span>
                </div>
                {basicInfo.formCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Code:</span>
                    <span className="font-mono text-xs text-gray-900">{basicInfo.formCode}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Sections:</span>
                  <span className="font-semibold text-gray-900">{sections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Questions:</span>
                  <span className="font-semibold text-gray-900">
                    {sections.reduce((acc, s) => acc + s.questions.length, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Section Level
    if (selectedItem.type === 'section' && selectedSection) {
      return (
        <SectionProperties
          section={selectedSection}
          onUpdate={(updates) => onUpdateSection(selectedSection.tempId, updates)}
          onDelete={() => onDeleteSection(selectedSection.tempId)}
          validationError={validationErrors.sections?.[selectedSection.tempId]}
        />
      );
    }

    // Question Level
    if (selectedItem.type === 'question' && selectedQuestion && questionSectionId) {
      return (
        <QuestionProperties
          question={selectedQuestion}
          onUpdate={(updates) => onUpdateQuestion(questionSectionId, selectedQuestion.tempId, updates)}
          onDelete={() => onDeleteQuestion(questionSectionId, selectedQuestion.tempId)}
          validationError={validationErrors.questions?.[selectedQuestion.tempId]}
        />
      );
    }

    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Select an item to edit its properties</p>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Properties</h2>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        {renderContent()}
      </ScrollArea>
    </div>
  );
};
