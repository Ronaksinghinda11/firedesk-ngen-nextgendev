import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronRight, ChevronDown, Folder, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Section {
  tempId: string;
  sectionName: string;
  sectionOrder: number;
  description?: string;
  isMandatory: boolean;
  questions: any[];
}

interface SortableSectionProps {
  section: Section;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  hasValidationError?: boolean;
  children?: React.ReactNode;
}

export const SortableSection: React.FC<SortableSectionProps> = ({
  section,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  hasValidationError = false,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.tempId,
    data: {
      type: 'section',
      section,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      {/* Section Header */}
      <div
        className={`
          group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150
          ${isSelected
            ? 'bg-orange-50 border-2 border-orange-400 shadow-sm'
            : 'hover:bg-gray-100 border-2 border-transparent'
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
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Expand/Collapse Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Folder Icon */}
        <Folder className="h-4 w-4 text-orange-500 flex-shrink-0" />

        {/* Section Name */}
        <span className="flex-1 text-sm font-medium text-gray-800 truncate">
          {section.sectionName || 'Untitled Section'}
          {section.isMandatory && <span className="text-red-500 ml-1">*</span>}
        </span>

        {/* Question Count Badge */}
        <Badge variant="secondary" className="text-xs">
          {section.questions.length} Q
        </Badge>

        {/* Validation Error Indicator */}
        {hasValidationError && (
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
        )}
      </div>

      {/* Questions (children) */}
      {isExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};
