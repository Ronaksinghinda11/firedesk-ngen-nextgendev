import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, HelpCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  conditionMasterApi,
  ConditionMaster,
} from '../../../../services/api/serviceFormApi';
import { getAllFrequencies, InspectionFrequency } from '../../../../constants/serviceFormConstants';
import FrequencyBadge from '../../common/FrequencyBadge';
import ConditionCard from '../../common/ConditionCard';
import PriorityScoreSlider from '../../common/PriorityScoreSlider';
import { toast } from '../../../../hooks/use-toast';

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

interface Section {
  tempId: string;
  sectionName: string;
  sectionOrder: number;
  questions: Question[];
}

interface QuestionsStepProps {
  sections: Section[];
  onChange: (sections: Section[]) => void;
  currentSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
}

const QuestionsStep: React.FC<QuestionsStepProps> = ({
  sections,
  onChange,
  currentSectionId,
  onSelectSection,
}) => {
  const [frequencies, setFrequencies] = useState<InspectionFrequency[]>([]);
  const [conditions, setConditions] = useState<ConditionMaster[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [questionFormData, setQuestionFormData] = useState({
    questionText: '',
    questionCode: '',
    applicableFrequencies: [] as string[],
    answerType: 'CONDITION_SELECT',
    isMandatory: true,
    requiresPhoto: false,
    requiresNotes: false,
    helpText: '',
  });

  const [conditionFormData, setConditionFormData] = useState({
    conditionSource: 'MASTER' as 'MASTER' | 'CUSTOM',
    conditionMasterId: '',
    customConditionName: '',
    customSeverityLevel: 'MEDIUM',
    customPriorityScore: '',
    customHealthImpact: 'Need Attention',
  });

  const [questionConditions, setQuestionConditions] = useState<Condition[]>([]);

  // State for creating new master conditions
  const [newConditionData, setNewConditionData] = useState({
    conditionName: '',
    conditionCode: '',
    severityLevel: 'MEDIUM',
    priorityScore: 50,
    healthImpact: 'Need Attention',
    recommendedAction: '',
    requiresImmediateAction: false,
  });
  const [isCreatingCondition, setIsCreatingCondition] = useState(false);
  const [conditionCreationSuccess, setConditionCreationSuccess] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, []);

  // Auto-select first section if none selected
  useEffect(() => {
    if (!currentSectionId && sections.length > 0) {
      onSelectSection(sections[0].tempId);
    }
  }, [sections, currentSectionId, onSelectSection]);

  const loadMasterData = async () => {
    try {
      // Load hardcoded frequencies
      const freqData = getAllFrequencies();
      setFrequencies(freqData);

      // Load conditions from API
      const condData = await conditionMasterApi.getAllActive();
      setConditions(condData);
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  };

  const currentSection = sections.find((s) => s.tempId === currentSectionId);

  const handleAddQuestion = () => {
    if (!currentSection) return;

    const newQuestion: Question = {
      tempId: `question_${Date.now()}`,
      sectionId: currentSection.tempId,
      questionText: questionFormData.questionText,
      questionCode: questionFormData.questionCode,
      questionOrder: currentSection.questions.length + 1,
      applicableFrequencies: questionFormData.applicableFrequencies,
      answerType: questionFormData.answerType,
      isMandatory: questionFormData.isMandatory,
      requiresPhoto: questionFormData.requiresPhoto,
      requiresNotes: questionFormData.requiresNotes,
      helpText: questionFormData.helpText,
      conditions: questionConditions,
    };

    const updatedSections = sections.map((s) =>
      s.tempId === currentSection.tempId
        ? { ...s, questions: [...s.questions, newQuestion] }
        : s
    );

    onChange(updatedSections);
    resetQuestionForm();
  };

  const handleUpdateQuestion = () => {
    if (!editingQuestion || !currentSection) return;

    const updatedQuestion: Question = {
      ...editingQuestion,
      ...questionFormData,
      conditions: questionConditions,
    };

    const updatedSections = sections.map((s) =>
      s.tempId === currentSection.tempId
        ? {
            ...s,
            questions: s.questions.map((q) =>
              q.tempId === editingQuestion.tempId ? updatedQuestion : q
            ),
          }
        : s
    );

    onChange(updatedSections);
    resetQuestionForm();
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!confirm('Delete this question?')) return;

    const updatedSections = sections.map((s) => ({
      ...s,
      questions: s.questions.filter((q) => q.tempId !== questionId),
    }));

    onChange(updatedSections);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionFormData({
      questionText: question.questionText,
      questionCode: question.questionCode || '',
      applicableFrequencies: question.applicableFrequencies,
      answerType: question.answerType,
      isMandatory: question.isMandatory,
      requiresPhoto: question.requiresPhoto,
      requiresNotes: question.requiresNotes,
      helpText: question.helpText || '',
    });
    setQuestionConditions(question.conditions);
    setShowQuestionForm(true);
  };

  const handleAddCondition = () => {
    const newCondition: Condition = {
      tempId: `condition_${Date.now()}`,
      conditionSource: conditionFormData.conditionSource,
      conditionMasterId:
        conditionFormData.conditionSource === 'MASTER'
          ? conditionFormData.conditionMasterId
          : undefined,
      customConditionName:
        conditionFormData.conditionSource === 'CUSTOM'
          ? conditionFormData.customConditionName
          : undefined,
      customSeverityLevel:
        conditionFormData.conditionSource === 'CUSTOM'
          ? conditionFormData.customSeverityLevel
          : undefined,
      customPriorityScore:
        conditionFormData.conditionSource === 'CUSTOM'
          ? parseInt(conditionFormData.customPriorityScore)
          : undefined,
      customHealthImpact:
        conditionFormData.conditionSource === 'CUSTOM'
          ? conditionFormData.customHealthImpact
          : undefined,
      displayOrder: questionConditions.length + 1,
    };

    setQuestionConditions([...questionConditions, newCondition]);
    resetConditionForm();
  };

  const handleDeleteCondition = (conditionId: string) => {
    setQuestionConditions(questionConditions.filter((c) => c.tempId !== conditionId));
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
      questionText: '',
      questionCode: '',
      applicableFrequencies: [],
      answerType: 'CONDITION_SELECT',
      isMandatory: true,
      requiresPhoto: false,
      requiresNotes: false,
      helpText: '',
    });
    setQuestionConditions([]);
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  const resetConditionForm = () => {
    setConditionFormData({
      conditionSource: 'MASTER',
      conditionMasterId: '',
      customConditionName: '',
      customSeverityLevel: 'MEDIUM',
      customPriorityScore: '',
      customHealthImpact: 'Need Attention',
    });
    setShowConditionForm(false);
  };

  // Auto-generate condition code from name
  const generateConditionCode = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  };

  // Handle creating new master condition
  const handleCreateMasterCondition = async () => {
    // Validation
    if (!newConditionData.conditionName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Condition name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!newConditionData.conditionCode.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Condition code is required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingCondition(true);

    try {
      // Create the condition via API
      const createdCondition = await conditionMasterApi.create({
        conditionCode: newConditionData.conditionCode,
        conditionName: newConditionData.conditionName,
        severityLevel: newConditionData.severityLevel,
        priorityScore: newConditionData.priorityScore,
        healthImpact: newConditionData.healthImpact,
        recommendedAction: newConditionData.recommendedAction || undefined,
        requiresImmediateAction: newConditionData.requiresImmediateAction,
        isActive: true,
      });

      // Show success animation
      setConditionCreationSuccess(true);
      setTimeout(() => setConditionCreationSuccess(false), 1800);

      // Show success toast
      toast({
        title: 'Success',
        description: 'Condition created successfully',
      });

      // Refresh conditions list
      await loadMasterData();

      // Auto-select the newly created condition
      setConditionFormData({
        ...conditionFormData,
        conditionMasterId: createdCondition.id,
      });

      // Reset the create form
      resetNewConditionForm();
    } catch (error: any) {
      console.error('Failed to create condition:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create condition',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingCondition(false);
    }
  };

  const resetNewConditionForm = () => {
    setNewConditionData({
      conditionName: '',
      conditionCode: '',
      severityLevel: 'MEDIUM',
      priorityScore: 50,
      healthImpact: 'Need Attention',
      recommendedAction: '',
      requiresImmediateAction: false,
    });
  };

  // Auto-generate condition code when name changes
  useEffect(() => {
    if (newConditionData.conditionName) {
      const generatedCode = generateConditionCode(newConditionData.conditionName);
      if (newConditionData.conditionCode !== generatedCode) {
        setNewConditionData(prev => ({
          ...prev,
          conditionCode: generatedCode,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newConditionData.conditionName]);

  const getConditionDisplay = (condition: Condition) => {
    if (condition.conditionSource === 'MASTER') {
      const masterCond = conditions.find((c) => c.id === condition.conditionMasterId);
      return masterCond
        ? {
            conditionName: masterCond.conditionName,
            severityLevel: masterCond.severityLevel,
            priorityScore: masterCond.priorityScore,
            healthImpact: masterCond.healthImpact,
          }
        : null;
    } else {
      return {
        conditionName: condition.customConditionName || '',
        severityLevel: condition.customSeverityLevel || 'MEDIUM',
        priorityScore: condition.customPriorityScore || 50,
        healthImpact: condition.customHealthImpact || 'Need Attention',
      };
    }
  };

  if (!currentSection) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Please add sections first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Questions</h2>
        <p className="text-gray-600">
          Add questions to each section and link them to frequencies and conditions
        </p>
      </div>

      {/* Section Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Section to Add Questions
        </label>
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.tempId}
              onClick={() => onSelectSection(section.tempId)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                currentSectionId === section.tempId
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {section.sectionName} ({section.questions.length})
            </button>
          ))}
        </div>
      </div>

      {showQuestionForm ? (
        <div className="p-6 bg-gray-50 border border-gray-300 rounded-lg space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingQuestion ? 'Edit Question' : 'Add New Question'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Text *
            </label>
            <textarea
              value={questionFormData.questionText}
              onChange={(e) =>
                setQuestionFormData({ ...questionFormData, questionText: e.target.value })
              }
              className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Is the pressure gauge reading within acceptable range?"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Code (Optional)
              </label>
              <input
                type="text"
                value={questionFormData.questionCode}
                onChange={(e) =>
                  setQuestionFormData({ ...questionFormData, questionCode: e.target.value })
                }
                className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Q_PRESSURE"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Answer Type *</label>
              <select
                value={questionFormData.answerType}
                onChange={(e) =>
                  setQuestionFormData({ ...questionFormData, answerType: e.target.value })
                }
                className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="CONDITION_SELECT">Condition Select</option>
                <option value="TEXT">Text</option>
                <option value="NUMBER">Number</option>
                <option value="DATE">Date</option>
                <option value="BOOLEAN">Yes/No</option>
                <option value="PHOTO">Photo</option>
                <option value="SIGNATURE">Signature</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <HelpCircle className="h-4 w-4" />
              Applicable Frequencies * (Select at least one)
            </label>
            <div className="flex flex-wrap gap-2">
              {frequencies.map((freq) => (
                <label
                  key={freq.code}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={questionFormData.applicableFrequencies.includes(freq.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setQuestionFormData({
                          ...questionFormData,
                          applicableFrequencies: [
                            ...questionFormData.applicableFrequencies,
                            freq.code,
                          ],
                        });
                      } else {
                        setQuestionFormData({
                          ...questionFormData,
                          applicableFrequencies: questionFormData.applicableFrequencies.filter(
                            (code) => code !== freq.code
                          ),
                        });
                      }
                    }}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <FrequencyBadge frequency={freq.code} size="sm" />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Help Text (Optional)
            </label>
            <input
              type="text"
              value={questionFormData.helpText}
              onChange={(e) =>
                setQuestionFormData({ ...questionFormData, helpText: e.target.value })
              }
              className="w-full h-10 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Guidance for technicians answering this question"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={questionFormData.isMandatory}
                onChange={(e) =>
                  setQuestionFormData({ ...questionFormData, isMandatory: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Mandatory</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={questionFormData.requiresPhoto}
                onChange={(e) =>
                  setQuestionFormData({ ...questionFormData, requiresPhoto: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Requires Photo</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={questionFormData.requiresNotes}
                onChange={(e) =>
                  setQuestionFormData({ ...questionFormData, requiresNotes: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Requires Notes</span>
            </label>
          </div>

          {questionFormData.answerType === 'CONDITION_SELECT' && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Conditions ({questionConditions.length})</h4>
                <button
                  onClick={() => setShowConditionForm(!showConditionForm)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Condition
                </button>
              </div>

              {showConditionForm && (
                <div className="mb-4 p-4 bg-white border border-gray-300 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condition Source *
                    </label>
                    <select
                      value={conditionFormData.conditionSource}
                      onChange={(e) =>
                        setConditionFormData({
                          ...conditionFormData,
                          conditionSource: e.target.value as 'MASTER' | 'CUSTOM',
                        })
                      }
                      className="w-full h-10 px-4 border border-gray-300 rounded-lg"
                    >
                      <option value="MASTER">Master Library</option>
                      <option value="CUSTOM">Custom Condition</option>
                    </select>
                  </div>

                  {conditionFormData.conditionSource === 'MASTER' ? (
                    <div className="grid grid-cols-3 gap-4">
                      {/* Left Panel: Existing Conditions List */}
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Select Existing Condition
                        </label>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 border-r border-gray-200">
                          {conditions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p>No conditions available</p>
                              <p className="text-xs mt-1">Create your first condition →</p>
                            </div>
                          ) : (
                            conditions.map((cond) => (
                              <ConditionCard
                                key={cond.id}
                                condition={cond}
                                onClick={() =>
                                  setConditionFormData({
                                    ...conditionFormData,
                                    conditionMasterId: cond.id,
                                  })
                                }
                                selected={conditionFormData.conditionMasterId === cond.id}
                                compact={true}
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Right Panel: Create New Condition */}
                      <div className="col-span-1 pl-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Create New Condition
                        </label>
                        <div className="space-y-3">
                          {/* Condition Name */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Condition Name *
                            </label>
                            <input
                              type="text"
                              value={newConditionData.conditionName}
                              onChange={(e) =>
                                setNewConditionData({
                                  ...newConditionData,
                                  conditionName: e.target.value,
                                })
                              }
                              disabled={isCreatingCondition}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="e.g., Severe Corrosion"
                            />
                          </div>

                          {/* Condition Code */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Condition Code *
                            </label>
                            <input
                              type="text"
                              value={newConditionData.conditionCode}
                              onChange={(e) =>
                                setNewConditionData({
                                  ...newConditionData,
                                  conditionCode: e.target.value.toUpperCase(),
                                })
                              }
                              disabled={isCreatingCondition}
                              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="AUTO_GENERATED"
                            />
                            <p className="text-xs text-gray-500 mt-1">Auto-generated from name</p>
                          </div>

                          {/* Severity Level */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Severity Level *
                            </label>
                            <select
                              value={newConditionData.severityLevel}
                              onChange={(e) =>
                                setNewConditionData({
                                  ...newConditionData,
                                  severityLevel: e.target.value,
                                })
                              }
                              disabled={isCreatingCondition}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="CRITICAL">Critical</option>
                              <option value="HIGH">High</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="LOW">Low</option>
                              <option value="INFO">Info</option>
                            </select>
                          </div>

                          {/* Priority Score Slider */}
                          <div>
                            <PriorityScoreSlider
                              value={newConditionData.priorityScore}
                              onChange={(value) =>
                                setNewConditionData({
                                  ...newConditionData,
                                  priorityScore: value,
                                })
                              }
                              disabled={isCreatingCondition}
                            />
                          </div>

                          {/* Health Impact */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Health Impact *
                            </label>
                            <select
                              value={newConditionData.healthImpact}
                              onChange={(e) =>
                                setNewConditionData({
                                  ...newConditionData,
                                  healthImpact: e.target.value,
                                })
                              }
                              disabled={isCreatingCondition}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="Healthy">Healthy</option>
                              <option value="Need Attention">Need Attention</option>
                              <option value="Not Working">Not Working</option>
                              <option value="Inventory">Inventory</option>
                              <option value="Under Maintenance">Under Maintenance</option>
                              <option value="De-Active">De-Active</option>
                            </select>
                          </div>

                          {/* Recommended Action */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Recommended Action
                            </label>
                            <textarea
                              value={newConditionData.recommendedAction}
                              onChange={(e) =>
                                setNewConditionData({
                                  ...newConditionData,
                                  recommendedAction: e.target.value,
                                })
                              }
                              disabled={isCreatingCondition}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                              rows={2}
                              placeholder="Optional notes..."
                            />
                          </div>

                          {/* Requires Immediate Action */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="requiresImmediateAction"
                              checked={newConditionData.requiresImmediateAction}
                              onChange={(e) =>
                                setNewConditionData({
                                  ...newConditionData,
                                  requiresImmediateAction: e.target.checked,
                                })
                              }
                              disabled={isCreatingCondition}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:cursor-not-allowed"
                            />
                            <label
                              htmlFor="requiresImmediateAction"
                              className="text-xs font-medium text-gray-600 cursor-pointer"
                            >
                              Requires Immediate Action
                            </label>
                          </div>

                          {/* Create Button with Success Animation */}
                          <div className="relative pt-2">
                            <button
                              onClick={handleCreateMasterCondition}
                              disabled={isCreatingCondition || !newConditionData.conditionName || !newConditionData.conditionCode}
                              className="w-full px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            >
                              {isCreatingCondition ? (
                                <span className="flex items-center justify-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Creating...
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-2">
                                  <Plus className="h-4 w-4" />
                                  Create Condition
                                </span>
                              )}
                            </button>

                            {/* Success Animation Overlay */}
                            {conditionCreationSuccess && (
                              <div className="absolute inset-0 flex items-center justify-center bg-green-500 rounded-lg animate-bounce">
                                <CheckCircle2 className="h-8 w-8 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Condition Name *
                        </label>
                        <input
                          type="text"
                          value={conditionFormData.customConditionName}
                          onChange={(e) =>
                            setConditionFormData({
                              ...conditionFormData,
                              customConditionName: e.target.value,
                            })
                          }
                          className="w-full h-10 px-4 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Severity *
                          </label>
                          <select
                            value={conditionFormData.customSeverityLevel}
                            onChange={(e) =>
                              setConditionFormData({
                                ...conditionFormData,
                                customSeverityLevel: e.target.value,
                              })
                            }
                            className="w-full h-10 px-4 border border-gray-300 rounded-lg"
                          >
                            <option value="CRITICAL">Critical</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                            <option value="INFO">Info</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priority (0-100) *
                          </label>
                          <input
                            type="number"
                            value={conditionFormData.customPriorityScore}
                            onChange={(e) =>
                              setConditionFormData({
                                ...conditionFormData,
                                customPriorityScore: e.target.value,
                              })
                            }
                            className="w-full h-10 px-4 border border-gray-300 rounded-lg"
                            min="0"
                            max="100"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Health Impact *
                          </label>
                          <select
                            value={conditionFormData.customHealthImpact}
                            onChange={(e) =>
                              setConditionFormData({
                                ...conditionFormData,
                                customHealthImpact: e.target.value,
                              })
                            }
                            className="w-full h-10 px-4 border border-gray-300 rounded-lg"
                          >
                            <option value="Healthy">Healthy</option>
                            <option value="Need Attention">Need Attention</option>
                            <option value="Not Working">Not Working</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCondition}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={resetConditionForm}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {questionConditions.map((cond) => {
                  const display = getConditionDisplay(cond);
                  return display ? (
                    <div key={cond.tempId} className="flex items-center justify-between p-2 bg-white border rounded">
                      <span className="text-sm">{display.conditionName}</span>
                      <button
                        onClick={() => handleDeleteCondition(cond.tempId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
              disabled={
                !questionFormData.questionText || questionFormData.applicableFrequencies.length === 0
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {editingQuestion ? 'Update' : 'Add'} Question
            </button>
            <button
              onClick={resetQuestionForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowQuestionForm(true)}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors w-full justify-center"
        >
          <Plus className="h-5 w-5" />
          Add Question to {currentSection.sectionName}
        </button>
      )}

      {/* Questions List */}
      <div className="space-y-3">
        {currentSection.questions.map((question, index) => (
          <div key={question.tempId} className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Q{index + 1}. {question.questionText}
                </h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  {question.applicableFrequencies.map((freqCode) => {
                    const freq = frequencies.find((f) => f.code === freqCode);
                    return freq ? (
                      <FrequencyBadge key={freqCode} frequency={freq.code} size="sm" />
                    ) : null;
                  })}
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Type: {question.answerType}</div>
                  {question.conditions.length > 0 && (
                    <div>{question.conditions.length} conditions configured</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditQuestion(question)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteQuestion(question.tempId)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionsStep;
