import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, HelpCircle, Plus, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getAllFrequencies } from '@/constants/serviceFormConstants';
import { conditionMasterApi, ConditionMaster } from '@/services/api/serviceFormApi';
import ConditionCard from '@/components/ServiceForms/common/ConditionCard';
import PriorityScoreSlider from '@/components/ServiceForms/common/PriorityScoreSlider';
import FrequencyBadge from '@/components/ServiceForms/common/FrequencyBadge';
import { toast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

interface QuestionPropertiesProps {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
  onDelete: () => void;
  validationError?: string;
}

export const QuestionProperties: React.FC<QuestionPropertiesProps> = ({
  question,
  onUpdate,
  onDelete,
  validationError,
}) => {
  const [frequencies, setFrequencies] = useState(getAllFrequencies());
  const [conditions, setConditions] = useState<ConditionMaster[]>([]);
  const [loadingConditions, setLoadingConditions] = useState(false);

  // Condition form state
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [conditionSource, setConditionSource] = useState<'MASTER' | 'CUSTOM'>('MASTER');
  const [selectedConditionId, setSelectedConditionId] = useState('');

  // Custom condition fields
  const [customCondition, setCustomCondition] = useState({
    name: '',
    severity: 'MEDIUM',
    priority: 50,
    healthImpact: 'Need Attention',
  });

  // New master condition creation
  const [showCreateCondition, setShowCreateCondition] = useState(false);
  const [newCondition, setNewCondition] = useState({
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

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load conditions on mount
  useEffect(() => {
    loadConditions();
  }, []);

  // Ensure answerType is always BOOLEAN (Yes/No) for all questions
  useEffect(() => {
    if (question.answerType !== 'BOOLEAN') {
      onUpdate({ answerType: 'BOOLEAN' });
    }
  }, [question.answerType]);

  const loadConditions = async () => {
    try {
      setLoadingConditions(true);
      const data = await conditionMasterApi.getAllActive();
      setConditions(data);
    } catch (error) {
      console.error('Failed to load conditions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conditions',
        variant: 'destructive',
      });
    } finally {
      setLoadingConditions(false);
    }
  };

  const generateConditionCode = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  };

  const handleCreateMasterCondition = async () => {
    if (!newCondition.conditionName.trim() || !newCondition.conditionCode.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Condition name and code are required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingCondition(true);
    try {
      const createdCondition = await conditionMasterApi.create({
        conditionCode: newCondition.conditionCode,
        conditionName: newCondition.conditionName,
        severityLevel: newCondition.severityLevel,
        priorityScore: newCondition.priorityScore,
        healthImpact: newCondition.healthImpact,
        recommendedAction: newCondition.recommendedAction || undefined,
        requiresImmediateAction: newCondition.requiresImmediateAction,
        isActive: true,
      });

      setConditionCreationSuccess(true);
      setTimeout(() => setConditionCreationSuccess(false), 1800);

      toast({
        title: 'Success',
        description: 'Condition created successfully',
      });

      await loadConditions();
      setSelectedConditionId(createdCondition.id);
      setShowCreateCondition(false);

      // Reset form
      setNewCondition({
        conditionName: '',
        conditionCode: '',
        severityLevel: 'MEDIUM',
        priorityScore: 50,
        healthImpact: 'Need Attention',
        recommendedAction: '',
        requiresImmediateAction: false,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create condition',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingCondition(false);
    }
  };

  const handleAddCondition = () => {
    if (conditionSource === 'MASTER' && !selectedConditionId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a condition',
        variant: 'destructive',
      });
      return;
    }

    if (conditionSource === 'CUSTOM' && !customCondition.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a condition name',
        variant: 'destructive',
      });
      return;
    }

    const newCond: Condition = {
      tempId: `condition_${Date.now()}`,
      conditionSource,
      conditionMasterId: conditionSource === 'MASTER' ? selectedConditionId : undefined,
      customConditionName: conditionSource === 'CUSTOM' ? customCondition.name : undefined,
      customSeverityLevel: conditionSource === 'CUSTOM' ? customCondition.severity : undefined,
      customPriorityScore: conditionSource === 'CUSTOM' ? customCondition.priority : undefined,
      customHealthImpact: conditionSource === 'CUSTOM' ? customCondition.healthImpact : undefined,
      displayOrder: 1,
    };

    // Replace existing condition (only allow 1 condition per question)
    onUpdate({
      conditions: [newCond],
    });

    // Reset form
    setShowConditionForm(false);
    setSelectedConditionId('');
    setCustomCondition({
      name: '',
      severity: 'MEDIUM',
      priority: 50,
      healthImpact: 'Need Attention',
    });
  };

  const handleRemoveCondition = (conditionId: string) => {
    onUpdate({
      conditions: question.conditions.filter(c => c.tempId !== conditionId),
    });
  };

  const toggleFrequency = (freqCode: string) => {
    const current = question.applicableFrequencies || [];
    const updated = current.includes(freqCode)
      ? current.filter(f => f !== freqCode)
      : [...current, freqCode];
    onUpdate({ applicableFrequencies: updated });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <HelpCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Question Properties</h3>
            <p className="text-sm text-gray-500">Configure question details</p>
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Delete this question?</span>
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
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Question Type (Read-only) */}
      <div className="space-y-2">
        <Label>Question Type</Label>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {question.questionType?.charAt(0) + question.questionType?.slice(1).toLowerCase() || 'Inspection'}
          </Badge>
          <p className="text-xs text-gray-500">
            Questions are organized by type into sections
          </p>
        </div>
      </div>

      {/* Question Text */}
      <div className="space-y-2">
        <Label htmlFor="questionText">
          Question Text <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="questionText"
          value={question.questionText}
          onChange={(e) => onUpdate({ questionText: e.target.value })}
          placeholder="e.g., Check for any visible damage or wear"
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Answer Type - Hidden, all questions are Yes/No (BOOLEAN) */}
      <input type="hidden" value="BOOLEAN" />

      {/* Frequencies */}
      <div className="space-y-3">
        <Label>
          Applicable Frequencies <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {frequencies.map((freq) => (
            <label
              key={freq.code}
              className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={question.applicableFrequencies?.includes(freq.code)}
                onChange={() => toggleFrequency(freq.code)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <FrequencyBadge frequency={freq} size="sm" />
            </label>
          ))}
        </div>
        {question.applicableFrequencies?.length === 0 && (
          <p className="text-xs text-red-600">⚠️ Please select at least one frequency</p>
        )}
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div key="mandatory-toggle" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <Label htmlFor="isMandatory">Mandatory Question</Label>
          <Switch
            id="isMandatory"
            checked={question.isMandatory}
            onCheckedChange={(checked) => onUpdate({ isMandatory: checked })}
          />
        </div>

        <div key="photo-toggle" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <Label htmlFor="requiresPhoto">Requires Photo</Label>
          <Switch
            id="requiresPhoto"
            checked={question.requiresPhoto}
            onCheckedChange={(checked) => onUpdate({ requiresPhoto: checked })}
          />
        </div>

        <div key="notes-toggle" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <Label htmlFor="requiresNotes">Requires Notes</Label>
          <Switch
            id="requiresNotes"
            checked={question.requiresNotes}
            onCheckedChange={(checked) => onUpdate({ requiresNotes: checked })}
          />
        </div>
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="helpText">Help Text (Optional)</Label>
        <Textarea
          id="helpText"
          value={question.helpText || ''}
          onChange={(e) => onUpdate({ helpText: e.target.value })}
          placeholder="Additional guidance for technicians..."
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Conditions Section */}
      <Collapsible open defaultOpen className="border-2 border-orange-200 rounded-lg shadow-sm">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-orange-50 transition-colors">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">Condition</h4>
            <Badge variant={question.conditions.length === 0 ? "destructive" : "default"} className="text-xs">
              {question.conditions.length === 0 ? "Required" : "Selected"}
            </Badge>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="p-4 pt-0 space-y-4">
          {/* Selected Condition Display */}
          {question.conditions.length > 0 ? (
            <div className="space-y-3">
              {question.conditions.slice(0, 1).map((cond) => {
                const masterCond = cond.conditionMasterId
                  ? conditions.find(c => c.id === cond.conditionMasterId)
                  : null;

                const severity = cond.conditionSource === 'MASTER'
                  ? masterCond?.severityLevel
                  : cond.customSeverityLevel;

                const priority = cond.conditionSource === 'MASTER'
                  ? masterCond?.priorityScore
                  : cond.customPriorityScore;

                return (
                  <div key={cond.tempId} className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {masterCond?.conditionName || cond.customConditionName || 'Unknown Condition'}
                          </span>
                          {severity && (
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold ${severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-300' :
                                severity === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                  severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                    severity === 'LOW' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                      'bg-gray-100 text-gray-700 border-gray-300'
                                }`}
                            >
                              {severity}
                            </Badge>
                          )}
                        </div>
                        {priority !== undefined && (
                          <div className="text-xs text-gray-600">
                            Priority Score: <span className="font-semibold">{priority}</span>
                          </div>
                        )}
                        {cond.conditionSource === 'MASTER' && masterCond?.conditionCode && (
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            {masterCond.conditionCode}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCondition(cond.tempId)}
                        className="hover:bg-red-100"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!showConditionForm && (
                <Button
                  onClick={() => setShowConditionForm(true)}
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Change Condition
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* No Condition Selected */}
              {!showConditionForm && (
                <div className="text-center py-6 bg-red-50 border-2 border-red-200 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-red-700 mb-1">No condition selected</p>
                  <p className="text-xs text-red-600 mb-3">Please select a condition for this question</p>
                  <Button
                    onClick={() => setShowConditionForm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Select Condition
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Condition Form */}
          {showConditionForm && (
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-md space-y-4">
              {/* Source Selection */}
              <div>
                <Label className="text-gray-700 font-semibold">Condition Source</Label>
                <select
                  value={conditionSource}
                  onChange={(e) => setConditionSource(e.target.value as 'MASTER' | 'CUSTOM')}
                  className="w-full mt-2 px-3 py-2 border-2 border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                >
                  <option value="MASTER">📚 Master Library</option>
                  <option value="CUSTOM">✏️ Custom Condition</option>
                </select>
              </div>

              {conditionSource === 'MASTER' ? (
                <div className="grid grid-cols-3 gap-4">
                  {/* Left: Existing Conditions (reusing the layout from QuestionsStep) */}
                  <div className="col-span-2">
                    <Label>Select Existing Condition</Label>
                    <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {loadingConditions ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </div>
                      ) : conditions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                          <p>No conditions available</p>
                        </div>
                      ) : (
                        conditions.map((cond) => (
                          <ConditionCard
                            key={cond.id}
                            condition={cond}
                            onClick={() => setSelectedConditionId(cond.id)}
                            selected={selectedConditionId === cond.id}
                            compact={true}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Create New Condition */}
                  <div className="col-span-1">
                    <div className="space-y-3">
                      <Label>Create New</Label>

                      {!showCreateCondition ? (
                        <Button
                          onClick={() => setShowCreateCondition(true)}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Condition
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            value={newCondition.conditionName}
                            onChange={(e) => {
                              const name = e.target.value;
                              setNewCondition({
                                ...newCondition,
                                conditionName: name,
                                conditionCode: generateConditionCode(name),
                              });
                            }}
                            placeholder="Condition Name"
                            className="text-sm"
                          />

                          <Input
                            value={newCondition.conditionCode}
                            onChange={(e) => setNewCondition({ ...newCondition, conditionCode: e.target.value.toUpperCase() })}
                            placeholder="CODE"
                            className="text-sm font-mono"
                          />

                          <select
                            value={newCondition.severityLevel}
                            onChange={(e) => setNewCondition({ ...newCondition, severityLevel: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            <option value="CRITICAL">Critical</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                            <option value="INFO">Info</option>
                          </select>

                          <PriorityScoreSlider
                            value={newCondition.priorityScore}
                            onChange={(value) => setNewCondition({ ...newCondition, priorityScore: value })}
                            disabled={isCreatingCondition}
                          />

                          <div className="relative">
                            <Button
                              onClick={handleCreateMasterCondition}
                              disabled={isCreatingCondition || !newCondition.conditionName}
                              className="w-full"
                              size="sm"
                            >
                              {isCreatingCondition ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 mr-2" />
                                  Create
                                </>
                              )}
                            </Button>

                            {conditionCreationSuccess && (
                              <div className="absolute inset-0 flex items-center justify-center bg-green-500 rounded animate-bounce">
                                <CheckCircle2 className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={() => setShowCreateCondition(false)}
                            variant="ghost"
                            size="sm"
                            className="w-full"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Custom Condition Form
                <div className="space-y-3 p-4 bg-white rounded-lg border-2 border-blue-200">
                  <div>
                    <Label className="text-gray-700 font-semibold text-sm">Condition Name</Label>
                    <Input
                      value={customCondition.name}
                      onChange={(e) => setCustomCondition({ ...customCondition, name: e.target.value })}
                      placeholder="Enter custom condition name"
                      className="mt-2 border-2 border-blue-300 focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-700 font-semibold text-sm">Severity</Label>
                      <select
                        value={customCondition.severity}
                        onChange={(e) => setCustomCondition({ ...customCondition, severity: e.target.value })}
                        className="w-full mt-2 px-3 py-2 border-2 border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 transition-all"
                      >
                        <option value="CRITICAL">🔴 Critical</option>
                        <option value="HIGH">🟠 High</option>
                        <option value="MEDIUM">🟡 Medium</option>
                        <option value="LOW">🔵 Low</option>
                        <option value="INFO">ℹ️ Info</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-gray-700 font-semibold text-sm">Priority (0-100)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={customCondition.priority}
                        onChange={(e) => setCustomCondition({ ...customCondition, priority: parseInt(e.target.value) || 0 })}
                        placeholder="50"
                        className="mt-2 border-2 border-blue-300 focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleAddCondition}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Select Condition
                </Button>
                <Button
                  onClick={() => {
                    setShowConditionForm(false);
                    setShowCreateCondition(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-2 border-gray-300 hover:bg-gray-100"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
