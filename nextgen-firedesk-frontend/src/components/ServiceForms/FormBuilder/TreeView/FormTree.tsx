import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableSection } from './SortableSection';
import { SortableQuestion } from './SortableQuestion';
import { Button } from '@/components/ui/button';
import { Plus, FileText, ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface Section {
  tempId: string;
  sectionName: string;
  sectionOrder: number;
  description?: string;
  isMandatory: boolean;
  questions: Question[];
}

interface FormTreeProps {
  sections: Section[];
  onDragEnd: (event: DragEndEvent) => void;
  selectedItem: {
    type: 'section' | 'question' | null;
    id: string | null;
  };
  onSelectItem: (type: 'section' | 'question', id: string | null) => void;
  expandedNodes: Set<string>;
  onToggleNode: (nodeId: string) => void;
  onAddSection: () => void;
  onAddQuestion: (questionType?: 'INSPECTION' | 'TESTING' | 'MAINTENANCE') => void;
  validationErrors?: {
    sections?: Record<string, string>;
    questions?: Record<string, string>;
  };
  serviceType?: string;
}

export const FormTree: React.FC<FormTreeProps> = ({
  sections,
  onDragEnd,
  selectedItem,
  onSelectItem,
  expandedNodes,
  onToggleNode,
  onAddSection,
  onAddQuestion,
  validationErrors = {},
  serviceType,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-orange-500" />
          <h2 className="font-semibold text-gray-800">Form Structure</h2>
        </div>

        {/* Add Question with Type Selection */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {(!serviceType || serviceType === 'INSPECTION') && (
              <DropdownMenuItem onClick={() => onAddQuestion('INSPECTION')}>
                <div className="flex flex-col">
                  <span className="font-medium">Inspection</span>
                  <span className="text-xs text-gray-500">Visual checks and inspections</span>
                </div>
              </DropdownMenuItem>
            )}
            {(!serviceType || serviceType === 'TESTING') && (
              <DropdownMenuItem onClick={() => onAddQuestion('TESTING')}>
                <div className="flex flex-col">
                  <span className="font-medium">Testing</span>
                  <span className="text-xs text-gray-500">Functional and performance tests</span>
                </div>
              </DropdownMenuItem>
            )}
            {(!serviceType || serviceType === 'MAINTENANCE') && (
              <DropdownMenuItem onClick={() => onAddQuestion('MAINTENANCE')}>
                <div className="flex flex-col">
                  <span className="font-medium">Maintenance</span>
                  <span className="text-xs text-gray-500">Preventive and corrective tasks</span>
                </div>
              </DropdownMenuItem>
            )}
            {/* Show all options if serviceType is START-UP or OTHER or undefined/unknown */}
            {['START-UP', 'OTHER'].includes(serviceType || '') && (
              <>
                <DropdownMenuItem onClick={() => onAddQuestion('INSPECTION')}>
                  <div className="flex flex-col">
                    <span className="font-medium">Inspection</span>
                    <span className="text-xs text-gray-500">Visual checks and inspections</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddQuestion('TESTING')}>
                  <div className="flex flex-col">
                    <span className="font-medium">Testing</span>
                    <span className="text-xs text-gray-500">Functional and performance tests</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddQuestion('MAINTENANCE')}>
                  <div className="flex flex-col">
                    <span className="font-medium">Maintenance</span>
                    <span className="text-xs text-gray-500">Preventive and corrective tasks</span>
                  </div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tree View */}
      <ScrollArea className="flex-1 p-4">
        {sections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">No questions yet</p>
            <p className="text-xs mt-1">Click "Add Question" and select a type to start</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <div className="space-y-1">
              {/* Sections Sortable Context */}
              <SortableContext
                items={sections.map(s => s.tempId)}
                strategy={verticalListSortingStrategy}
              >
                {sections.map((section) => (
                  <SortableSection
                    key={section.tempId}
                    section={section}
                    isExpanded={expandedNodes.has(section.tempId)}
                    isSelected={selectedItem.type === 'section' && selectedItem.id === section.tempId}
                    onToggleExpand={() => onToggleNode(section.tempId)}
                    onSelect={() => onSelectItem('section', section.tempId)}
                    hasValidationError={!!validationErrors.sections?.[section.tempId]}
                  >
                    {/* Questions Sortable Context (nested) */}
                    {section.questions.length > 0 ? (
                      <SortableContext
                        items={section.questions.map(q => q.tempId)}
                        strategy={verticalListSortingStrategy}
                      >
                        {section.questions.map((question) => (
                          <SortableQuestion
                            key={question.tempId}
                            question={question}
                            isSelected={selectedItem.type === 'question' && selectedItem.id === question.tempId}
                            onSelect={() => onSelectItem('question', question.tempId)}
                            hasValidationError={!!validationErrors.questions?.[question.tempId]}
                          />
                        ))}
                      </SortableContext>
                    ) : (
                      <div className="text-center py-4 text-gray-400 text-xs">
                        No questions yet. Click + to add one.
                      </div>
                    )}
                  </SortableSection>
                ))}
              </SortableContext>
            </div>
          </DndContext>
        )}
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Sections:</span>
            <span className="font-semibold">{sections.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Questions:</span>
            <span className="font-semibold">
              {sections.reduce((acc, s) => acc + s.questions.length, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
