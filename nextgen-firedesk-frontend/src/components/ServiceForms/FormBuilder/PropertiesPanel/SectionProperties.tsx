import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, Folder } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Section {
  tempId: string;
  sectionName: string;
  sectionOrder: number;
  description?: string;
  isMandatory: boolean;
  questions: any[];
}

interface SectionPropertiesProps {
  section: Section;
  onUpdate: (updates: Partial<Section>) => void;
  onDelete: () => void;
  validationError?: string;
}

export const SectionProperties: React.FC<SectionPropertiesProps> = ({
  section,
  onUpdate,
  onDelete,
  validationError,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Folder className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Section Properties</h3>
            <p className="text-sm text-gray-500">Configure section details</p>
          </div>
        </div>
        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm text-gray-600">
              Delete this section and all its questions?
            </span>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
              >
                Yes, Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Section Name */}
      <div className="space-y-2">
        <Label htmlFor="sectionName">
          Section Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="sectionName"
          value={section.sectionName}
          onChange={(e) => onUpdate({ sectionName: e.target.value })}
          placeholder="e.g., General Inspection, Safety Checks"
          className="text-base"
        />
        <p className="text-xs text-gray-500">
          A clear, descriptive name for this section
        </p>
      </div>

      {/* Section Description */}
      <div className="space-y-2">
        <Label htmlFor="sectionDescription">Description (Optional)</Label>
        <Textarea
          id="sectionDescription"
          value={section.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Add additional context or instructions for this section..."
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">
          Optional description shown to technicians
        </p>
      </div>

      {/* Section Order */}
      <div className="space-y-2">
        <Label>Section Order</Label>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-gray-100 rounded-lg font-semibold text-gray-700">
            #{section.sectionOrder}
          </div>
          <p className="text-sm text-gray-500">
            Use drag & drop in the tree view to reorder sections
          </p>
        </div>
      </div>

      {/* Is Mandatory */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="isMandatory" className="text-base">
            Mandatory Section
          </Label>
          <p className="text-sm text-gray-500">
            Technicians must complete all questions in this section
          </p>
        </div>
        <Switch
          id="isMandatory"
          checked={section.isMandatory}
          onCheckedChange={(checked) => onUpdate({ isMandatory: checked })}
        />
      </div>

      {/* Statistics */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Questions in this section:</span>
            <span className="font-semibold text-gray-900">{section.questions.length}</span>
          </div>
          {section.questions.length === 0 && (
            <p className="text-xs text-orange-600 mt-2">
              ⚠️ This section needs at least one question before publishing
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
