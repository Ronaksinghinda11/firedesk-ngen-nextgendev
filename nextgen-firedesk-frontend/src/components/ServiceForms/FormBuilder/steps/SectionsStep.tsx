import React, { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, LayoutList } from 'lucide-react';

interface Section {
  tempId: string;
  sectionName: string;
  sectionOrder: number;
  description?: string;
  isMandatory: boolean;
  questions: any[];
}

interface SectionsStepProps {
  sections: Section[];
  onChange: (sections: Section[]) => void;
  onSelectSection: (sectionId: string) => void;
}

const SectionsStep: React.FC<SectionsStepProps> = ({ sections, onChange, onSelectSection }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [formData, setFormData] = useState({
    sectionName: '',
    description: '',
    isMandatory: false,
  });

  const handleAdd = () => {
    const newSection: Section = {
      tempId: `section_${Date.now()}`,
      sectionName: formData.sectionName,
      sectionOrder: sections.length + 1,
      description: formData.description,
      isMandatory: formData.isMandatory,
      questions: [],
    };
    onChange([...sections, newSection]);
    resetForm();
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setFormData({
      sectionName: section.sectionName,
      description: section.description || '',
      isMandatory: section.isMandatory,
    });
    setShowForm(true);
  };

  const handleUpdate = () => {
    if (!editingSection) return;
    const updated = sections.map((s) =>
      s.tempId === editingSection.tempId
        ? { ...s, ...formData }
        : s
    );
    onChange(updated);
    resetForm();
  };

  const handleDelete = (tempId: string) => {
    if (!confirm('Delete this section and all its questions?')) return;
    onChange(sections.filter((s) => s.tempId !== tempId));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= sections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

    // Update section orders
    newSections.forEach((s, i) => {
      s.sectionOrder = i + 1;
    });

    onChange(newSections);
  };

  const resetForm = () => {
    setFormData({
      sectionName: '',
      description: '',
      isMandatory: false,
    });
    setEditingSection(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Sections</h2>
        <p className="text-gray-600">
          Organize your form into logical sections. Each section will contain related questions.
        </p>
      </div>

      {showForm ? (
        <div className="p-6 bg-gray-50 border border-gray-300 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingSection ? 'Edit Section' : 'Add New Section'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.sectionName}
                onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Visual Inspection"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this section"
                rows={2}
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isMandatory}
                  onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Mandatory Section</span>
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={editingSection ? handleUpdate : handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingSection ? 'Update' : 'Add'} Section
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors w-full justify-center"
        >
          <Plus className="h-5 w-5" />
          Add Section
        </button>
      )}

      <div className="space-y-3">
        {sections.map((section, index) => (
          <div
            key={section.tempId}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex flex-col gap-1 mt-1">
                  <button
                    onClick={() => moveSection(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveSection(index, 'down')}
                    disabled={index === sections.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <LayoutList className="h-5 w-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">
                      {section.sectionOrder}. {section.sectionName}
                    </h3>
                    {section.isMandatory && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  {section.description && (
                    <p className="text-sm text-gray-600 ml-7">{section.description}</p>
                  )}
                  <p className="text-xs text-gray-500 ml-7 mt-1">
                    {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(section)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(section.tempId)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sections.length === 0 && !showForm && (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
          <LayoutList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No sections added yet</p>
          <p className="text-sm text-gray-500">
            Add at least one section to organize your questions
          </p>
        </div>
      )}

      {sections.length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>{sections.length}</strong> section{sections.length !== 1 ? 's' : ''} created.
            Click Next to add questions to each section.
          </p>
        </div>
      )}
    </div>
  );
};

export default SectionsStep;
