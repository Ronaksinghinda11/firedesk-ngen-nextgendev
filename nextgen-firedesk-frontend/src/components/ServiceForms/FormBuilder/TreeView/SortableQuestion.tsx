import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, HelpCircle, Camera, FileText, Hash, Calendar, CheckSquare, Image, PenTool, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

interface SortableQuestionProps {
  question: Question;
  isSelected: boolean;
  onSelect: () => void;
  hasValidationError?: boolean;
}

const getAnswerTypeIcon = (answerType: string) => {
  switch (answerType) {
    case 'CONDITION_SELECT':
      return <HelpCircle className="h-4 w-4" />;
    case 'TEXT':
      return <FileText className="h-4 w-4" />;
    case 'NUMBER':
      return <Hash className="h-4 w-4" />;
    case 'DATE':
      return <Calendar className="h-4 w-4" />;
    case 'BOOLEAN':
      return <CheckSquare className="h-4 w-4" />;
    case 'PHOTO':
      return <Camera className="h-4 w-4" />;
    case 'SIGNATURE':
      return <PenTool className="h-4 w-4" />;
    case 'MULTI_SELECT':
      return <CheckSquare className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
};

const getAnswerTypeLabel = (answerType: string) => {
  switch (answerType) {
    case 'CONDITION_SELECT':
      return 'Condition';
    case 'TEXT':
      return 'Text';
    case 'NUMBER':
      return 'Number';
    case 'DATE':
      return 'Date';
    case 'BOOLEAN':
      return 'Yes/No';
    case 'PHOTO':
      return 'Photo';
    case 'SIGNATURE':
      return 'Signature';
    case 'MULTI_SELECT':
      return 'Multi';
    default:
      return answerType;
  }
};

export const SortableQuestion: React.FC<SortableQuestionProps> = ({
  question,
  isSelected,
  onSelect,
  hasValidationError = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: question.tempId,
    data: {
      type: 'question',
      question,
      sectionId: question.sectionId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150
        ${isSelected
          ? 'bg-orange-50 border-2 border-orange-400 shadow-sm'
          : 'hover:bg-gray-50 border-2 border-transparent'
        }
        ${hasValidationError ? 'border-red-300 bg-red-50' : ''}
      `}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-orange-500 transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Answer Type Icon */}
      <div className="text-blue-500 flex-shrink-0">
        {getAnswerTypeIcon(question.answerType)}
      </div>

      {/* Question Text */}
      <span className="flex-1 text-sm text-gray-700 truncate">
        {question.questionText || 'Untitled Question'}
        {question.isMandatory && <span className="text-red-500 ml-1">*</span>}
      </span>

      {/* Answer Type Badge */}
      <Badge variant="outline" className="text-xs">
        {getAnswerTypeLabel(question.answerType)}
      </Badge>

      {/* Condition Count (if applicable) */}
      {question.answerType === 'CONDITION_SELECT' && question.conditions.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {question.conditions.length} C
        </Badge>
      )}

      {/* Indicators */}
      <div className="flex items-center gap-1">
        {question.requiresPhoto && (
          <Camera className="h-3 w-3 text-gray-400" title="Requires Photo" />
        )}
        {question.requiresNotes && (
          <FileText className="h-3 w-3 text-gray-400" title="Requires Notes" />
        )}
        {question.helpText && (
          <HelpCircle className="h-3 w-3 text-gray-400" title="Has Help Text" />
        )}
      </div>

      {/* Validation Error Indicator */}
      {hasValidationError && (
        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
      )}
    </div>
  );
};
