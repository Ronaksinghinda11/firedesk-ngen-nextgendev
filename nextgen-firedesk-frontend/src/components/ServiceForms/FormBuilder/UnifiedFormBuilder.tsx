import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { FormTree } from './TreeView/FormTree';
import { PropertiesPanel } from './PropertiesPanel/PropertiesPanel';
import { ResizablePanels } from './ResizablePanels';
import { Button } from '@/components/ui/button';
import { Save, Send, Loader2, ArrowLeft } from 'lucide-react';
import { serviceFormApi } from '@/services/api/serviceFormApi';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  questionType: 'INSPECTION' | 'TESTING' | 'MAINTENANCE';
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
  plantId?: string;
  serviceType?: 'INSPECTION' | 'TESTING' | 'MAINTENANCE';
}

export const UnifiedFormBuilder: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  // Get basic info from navigation state
  const locationState = location.state as { basicInfo?: BasicInfo; existingForm?: any } | null;

  // Core State
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(
    locationState?.basicInfo || {
      serviceName: '',
      formCode: '',
      description: '',
      categoryId: '',
      serviceType: 'INSPECTION',
    }
  );

  const [sections, setSections] = useState<Section[]>([]);

  const [selectedItem, setSelectedItem] = useState<{
    type: 'section' | 'question' | null;
    id: string | null;
  }>({ type: null, id: null });

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    form?: string;
    sections?: Record<string, string>;
    questions?: Record<string, string>;
  }>({});

  // Load existing form from location state or API
  useEffect(() => {
    if (locationState?.existingForm) {
      // Load from location state (coming from BasicInfoPage)
      const form = locationState.existingForm;
      const convertedSections: Section[] = form.sections.map((section: any) => ({
        tempId: section.id || `section_${Date.now()}_${Math.random()}`,
        sectionName: section.sectionName,
        sectionOrder: section.sectionOrder,
        description: section.description,
        isMandatory: section.isMandatory,
        questions: section.questions.map((question: any) => ({
          tempId: question.id || `question_${Date.now()}_${Math.random()}`,
          sectionId: section.id,
          questionText: question.questionText,
          questionCode: question.questionCode,
          questionOrder: question.questionOrder,
          questionType: question.questionType || 'INSPECTION',
          applicableFrequencies: question.applicableFrequencies || [],
          answerType: question.answerType,
          isMandatory: question.isMandatory,
          requiresPhoto: question.requiresPhoto,
          requiresNotes: question.requiresNotes,
          helpText: question.helpText,
          conditions: question.conditions || [],
        })),
      }));

      setSections(convertedSections);
      setExpandedNodes(new Set(convertedSections.map(s => s.tempId)));

      // Auto-select first section
      if (convertedSections.length > 0) {
        setSelectedItem({ type: 'section', id: convertedSections[0].tempId });
      }
    } else if (isEditMode && id) {
      // Fetch form data via API for direct edit mode access
      const loadForm = async () => {
        try {
          setLoadingForm(true);
          const form = await serviceFormApi.getById(id);

          const convertedSections: Section[] = form.sections.map((section: any) => ({
            tempId: section.id || `section_${Date.now()}_${Math.random()}`,
            sectionName: section.sectionName,
            sectionOrder: section.sectionOrder,
            description: section.description,
            isMandatory: section.isMandatory,
            questions: section.questions.map((question: any) => ({
              tempId: question.id || `question_${Date.now()}_${Math.random()}`,
              sectionId: section.id,
              questionText: question.questionText,
              questionCode: question.questionCode,
              questionOrder: question.questionOrder,
              questionType: question.questionType || 'INSPECTION',
              applicableFrequencies: question.applicableFrequencies || [],
              answerType: question.answerType,
              isMandatory: question.isMandatory,
              requiresPhoto: question.requiresPhoto,
              requiresNotes: question.requiresNotes,
              helpText: question.helpText,
              conditions: question.conditions || [],
            })),
          }));

          setBasicInfo({
            serviceName: form.serviceName,
            formCode: form.formCode || '',
            description: form.description || '',
            categoryId: form.categoryId || '',
            plantId: form.plantId, // Added plantId
            serviceType: form.serviceType || 'INSPECTION',
          });

          setSections(convertedSections);
          setExpandedNodes(new Set(convertedSections.map(s => s.tempId)));

          if (convertedSections.length > 0) {
            setSelectedItem({ type: 'section', id: convertedSections[0].tempId });
          }
        } catch (error: any) {
          console.error('Failed to load form:', error);
          toast({
            title: 'Error',
            description: error.response?.data?.message || 'Failed to load form',
            variant: 'destructive',
          });
          navigate('/admin/service-forms');
        } finally {
          setLoadingForm(false);
        }
      };

      loadForm();
    } else if (!basicInfo.serviceName && !basicInfo.plantId) { // Allow if plantId is present (auto-generated name)
      // Redirect to basic info page if no basic info provided (create mode only)
      navigate('/admin/service-forms/create');
    }
  }, []);

  // CRUD Operations
  const handleAddSection = () => {
    const newSection: Section = {
      tempId: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sectionName: '',
      sectionOrder: sections.length + 1,
      description: '',
      isMandatory: false,
      questions: [],
    };

    setSections([...sections, newSection]);
    setSelectedItem({ type: 'section', id: newSection.tempId });
    setExpandedNodes(new Set([...expandedNodes, newSection.tempId]));
  };

  const handleAddQuestion = (questionType?: 'INSPECTION' | 'TESTING' | 'MAINTENANCE') => {
    const type = questionType || 'INSPECTION';
    const sectionName = type.charAt(0) + type.slice(1).toLowerCase();

    // Find or create section for this question type
    let targetSection = sections.find(s => s.sectionName === sectionName);

    if (!targetSection) {
      // Create new section for this type
      targetSection = {
        tempId: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sectionName: sectionName,
        sectionOrder: sections.length + 1,
        description: '',
        isMandatory: false,
        questions: [],
      };
      setSections([...sections, targetSection]);
    }

    const newQuestion: Question = {
      tempId: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sectionId: targetSection.tempId,
      questionText: '',
      questionCode: '',
      questionOrder: 0,
      questionType: type,
      applicableFrequencies: [],
      answerType: 'BOOLEAN',
      isMandatory: true,
      requiresPhoto: false,
      requiresNotes: false,
      helpText: '',
      conditions: [],
    };

    setSections(prevSections => {
      const updatedSections = prevSections.map(section => {
        if (section.tempId === targetSection.tempId) {
          const updatedQuestions = [...section.questions, newQuestion];
          updatedQuestions.forEach((q, i) => {
            q.questionOrder = i + 1;
          });
          return { ...section, questions: updatedQuestions };
        }
        return section;
      });

      // If section was just created, add it
      if (!prevSections.find(s => s.tempId === targetSection.tempId)) {
        // Set questionOrder for the first question in new section
        newQuestion.questionOrder = 1;
        return [...updatedSections, { ...targetSection, questions: [newQuestion] }];
      }

      return updatedSections;
    });

    setSelectedItem({ type: 'question', id: newQuestion.tempId });
    setExpandedNodes(new Set([...expandedNodes, targetSection.tempId]));
  };

  const handleUpdateBasicInfo = (updates: Partial<BasicInfo>) => {
    setBasicInfo({ ...basicInfo, ...updates });
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<Section>) => {
    setSections(sections.map(section =>
      section.tempId === sectionId ? { ...section, ...updates } : section
    ));
  };

  const handleUpdateQuestion = (
    sectionId: string,
    questionId: string,
    updates: Partial<Question>
  ) => {
    setSections(sections.map(section => {
      if (section.tempId === sectionId) {
        return {
          ...section,
          questions: section.questions.map(question =>
            question.tempId === questionId ? { ...question, ...updates } : question
          ),
        };
      }
      return section;
    }));
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.tempId !== sectionId));
    setSelectedItem({ type: null, id: null });

    // Reorder remaining sections
    const remaining = sections.filter(s => s.tempId !== sectionId);
    remaining.forEach((s, i) => {
      s.sectionOrder = i + 1;
    });
    setSections(remaining);
  };

  const handleDeleteQuestion = (sectionId: string, questionId: string) => {
    setSections(sections.map(section => {
      if (section.tempId === sectionId) {
        const updatedQuestions = section.questions.filter(q => q.tempId !== questionId);
        // Reorder remaining questions
        updatedQuestions.forEach((q, i) => {
          q.questionOrder = i + 1;
        });
        return { ...section, questions: updatedQuestions };
      }
      return section;
    }));
    setSelectedItem({ type: 'section', id: sectionId });
  };

  // Drag and Drop Handlers
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Section reordering
    if (activeData?.type === 'section' && overData?.type === 'section') {
      const oldIndex = sections.findIndex(s => s.tempId === active.id);
      const newIndex = sections.findIndex(s => s.tempId === over.id);

      const reordered = arrayMove(sections, oldIndex, newIndex);

      // Update section orders
      reordered.forEach((s, i) => {
        s.sectionOrder = i + 1;
      });

      setSections(reordered);
    }

    // Question reordering (within same section)
    if (activeData?.type === 'question' && overData?.type === 'question') {
      const sectionId = activeData.sectionId;

      if (activeData.sectionId === overData.sectionId) {
        setSections(sections.map(section => {
          if (section.tempId === sectionId) {
            const oldIndex = section.questions.findIndex(q => q.tempId === active.id);
            const newIndex = section.questions.findIndex(q => q.tempId === over.id);

            const reordered = arrayMove(section.questions, oldIndex, newIndex);

            // Update question orders
            reordered.forEach((q, i) => {
              q.questionOrder = i + 1;
            });

            return { ...section, questions: reordered };
          }
          return section;
        }));
      }
    }
  };

  const handleSelectItem = (type: 'section' | 'question', id: string | null) => {
    setSelectedItem({ type, id });
  };

  const handleToggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    // Basic info validation
    if (!basicInfo.serviceName.trim() && !basicInfo.plantId) { // Skip name validation if plantId is present
      errors.form = 'Service name is required';
    }

    if (!basicInfo.serviceType) {
      errors.form = 'Service Type is required';
    }

    // Sections validation
    if (sections.length === 0) {
      errors.form = 'At least one section is required';
    }

    errors.sections = {};
    errors.questions = {};

    sections.forEach(section => {
      // Section validation
      if (!section.sectionName.trim()) {
        errors.sections![section.tempId] = 'Section name is required';
      }

      if (section.questions.length === 0) {
        errors.sections![section.tempId] = 'Section must have at least one question';
      }

      // Questions validation
      section.questions.forEach(question => {
        if (!question.questionText.trim()) {
          errors.questions![question.tempId] = 'Question text is required';
        }

        if (question.applicableFrequencies.length === 0) {
          errors.questions![question.tempId] = 'At least one frequency is required';
        }

        if (question.conditions.length === 0) {
          errors.questions![question.tempId] = 'Question must have exactly one condition';
        }
      });
    });

    setValidationErrors(errors);

    return !errors.form &&
      Object.keys(errors.sections || {}).length === 0 &&
      Object.keys(errors.questions || {}).length === 0;
  };

  // Save/Submit
  const handleSave = async (publish: boolean = false) => {
    if (publish && !validateForm()) {
      toast({
        title: 'Validation Failed',
        description: 'Please fix all errors before publishing',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      // Calculate global questionOrder across all sections
      let globalQuestionOrder = 0;

      const payload = {
        serviceName: basicInfo.serviceName,
        formCode: basicInfo.formCode || undefined,
        description: basicInfo.description || undefined,
        categoryId: basicInfo.categoryId || undefined,
        plantId: basicInfo.plantId || undefined, // Added plantId
        serviceType: basicInfo.serviceType || undefined,
        sections: sections.map(section => ({
          sectionName: section.sectionName,
          sectionOrder: section.sectionOrder,
          description: section.description || undefined,
          isMandatory: section.isMandatory,
          questions: section.questions.map(question => {
            globalQuestionOrder++;
            return {
              questionText: question.questionText,
              questionCode: question.questionCode || undefined,
              questionOrder: globalQuestionOrder,
              questionType: question.questionType,
              applicableFrequencies: question.applicableFrequencies,
              answerType: question.answerType,
              isMandatory: question.isMandatory,
              requiresPhoto: question.requiresPhoto,
              requiresNotes: question.requiresNotes,
              helpText: question.helpText || undefined,
              conditions: question.conditions.map((cond, index) => ({
                conditionSource: cond.conditionSource,
                conditionMasterId: cond.conditionMasterId,
                customConditionName: cond.customConditionName,
                customSeverityLevel: cond.customSeverityLevel,
                customPriorityScore: cond.customPriorityScore,
                customHealthImpact: cond.customHealthImpact,
                displayOrder: index + 1,
              })),
            };
          }),
        })),
      };

      if (isEditMode && id) {
        await serviceFormApi.update(id, payload);
      } else {
        await serviceFormApi.create(payload);
      }

      toast({
        title: 'Success',
        description: publish ? 'Form published successfully' : 'Form saved successfully',
      });

      navigate('/admin/service-forms');
    } catch (error: any) {
      console.error('Failed to save form:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save form',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingForm) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/service-forms')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? 'Edit Service Form' : 'Create Service Form'}
              </h1>
              <p className="text-sm text-gray-500">
                {basicInfo.serviceName || 'Untitled Form'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </>
              )}
            </Button>

            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Validation Summary */}
        {(validationErrors.form ||
          Object.keys(validationErrors.sections || {}).length > 0 ||
          Object.keys(validationErrors.questions || {}).length > 0) && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                {validationErrors.form || 'Please fix validation errors in sections and questions'}
              </AlertDescription>
            </Alert>
          )}
      </div>

      {/* Resizable Two-Panel Layout */}
      <ResizablePanels
        defaultLeftWidth={25}
        minLeftWidth={15}
        maxLeftWidth={50}
        leftPanel={
          <FormTree
            sections={sections}
            onDragEnd={handleDragEnd}
            selectedItem={selectedItem}
            onSelectItem={handleSelectItem}
            expandedNodes={expandedNodes}
            onToggleNode={handleToggleNode}
            onAddSection={handleAddSection}
            onAddQuestion={handleAddQuestion}
            validationErrors={validationErrors}
            serviceType={basicInfo.serviceType}
          />
        }
        rightPanel={
          <PropertiesPanel
            selectedItem={selectedItem}
            sections={sections}
            basicInfo={basicInfo}
            onUpdateBasicInfo={handleUpdateBasicInfo}
            onUpdateSection={handleUpdateSection}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteSection={handleDeleteSection}
            onDeleteQuestion={handleDeleteQuestion}
            validationErrors={validationErrors}
          />
        }
      />
    </div>
  );
};
