import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, Filter } from 'lucide-react';
import { conditionMasterApi, ConditionMaster } from '../../../services/api/serviceFormApi';
import ConditionCard from '../common/ConditionCard';

const ConditionList: React.FC = () => {
  const [conditions, setConditions] = useState<ConditionMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCondition, setEditingCondition] = useState<ConditionMaster | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const [formData, setFormData] = useState({
    conditionCode: '',
    conditionName: '',
    severityLevel: 'MEDIUM' as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO',
    priorityScore: '',
    healthImpact: 'Need Attention',
    recommendedAction: '',
    requiresImmediateAction: false,
    isActive: true,
  });

  useEffect(() => {
    loadConditions();
  }, [severityFilter]);

  const loadConditions = async () => {
    try {
      setLoading(true);
      let data: ConditionMaster[];
      if (severityFilter) {
        data = await conditionMasterApi.getBySeverity(severityFilter);
      } else {
        data = await conditionMasterApi.getAll();
      }
      setConditions(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load conditions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCondition) {
        await conditionMasterApi.update(editingCondition.id, {
          conditionName: formData.conditionName,
          severityLevel: formData.severityLevel,
          priorityScore: parseInt(formData.priorityScore),
          healthImpact: formData.healthImpact,
          recommendedAction: formData.recommendedAction,
          requiresImmediateAction: formData.requiresImmediateAction,
          isActive: formData.isActive,
        });
      } else {
        await conditionMasterApi.create({
          conditionCode: formData.conditionCode,
          conditionName: formData.conditionName,
          severityLevel: formData.severityLevel,
          priorityScore: parseInt(formData.priorityScore),
          healthImpact: formData.healthImpact,
          recommendedAction: formData.recommendedAction,
          requiresImmediateAction: formData.requiresImmediateAction,
          isActive: formData.isActive,
        });
      }
      resetForm();
      loadConditions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save condition');
    }
  };

  const handleEdit = (condition: ConditionMaster) => {
    setEditingCondition(condition);
    setFormData({
      conditionCode: condition.conditionCode,
      conditionName: condition.conditionName,
      severityLevel: condition.severityLevel,
      priorityScore: condition.priorityScore.toString(),
      healthImpact: condition.healthImpact,
      recommendedAction: condition.recommendedAction || '',
      requiresImmediateAction: condition.requiresImmediateAction,
      isActive: condition.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this condition?')) return;
    try {
      await conditionMasterApi.delete(id);
      loadConditions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete condition');
    }
  };

  const resetForm = () => {
    setFormData({
      conditionCode: '',
      conditionName: '',
      severityLevel: 'MEDIUM',
      priorityScore: '',
      healthImpact: 'Need Attention',
      recommendedAction: '',
      requiresImmediateAction: false,
      isActive: true,
    });
    setEditingCondition(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading conditions...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Condition Master Library</h1>
          <p className="text-gray-600 mt-1">Manage reusable condition definitions</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Condition
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingCondition ? 'Edit Condition' : 'Add New Condition'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition Code *
                </label>
                <input
                  type="text"
                  value={formData.conditionCode}
                  onChange={(e) => setFormData({ ...formData, conditionCode: e.target.value })}
                  disabled={!!editingCondition}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="e.g., COND_DAMAGED"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition Name *
                </label>
                <input
                  type="text"
                  value={formData.conditionName}
                  onChange={(e) => setFormData({ ...formData, conditionName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Damaged Equipment"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity Level *
                </label>
                <select
                  value={formData.severityLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      severityLevel: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
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
                  Priority Score (0-100) *
                </label>
                <input
                  type="number"
                  value={formData.priorityScore}
                  onChange={(e) => setFormData({ ...formData, priorityScore: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0-100"
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
                  value={formData.healthImpact}
                  onChange={(e) => setFormData({ ...formData, healthImpact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Healthy">Healthy</option>
                  <option value="Need Attention">Need Attention</option>
                  <option value="Not Working">Not Working</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="De-Active">De-Active</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recommended Action
              </label>
              <textarea
                value={formData.recommendedAction}
                onChange={(e) => setFormData({ ...formData, recommendedAction: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What should be done when this condition is identified?"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requiresImmediateAction}
                  onChange={(e) =>
                    setFormData({ ...formData, requiresImmediateAction: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Requires Immediate Action</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingCondition ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-5 w-5 text-gray-500" />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFO">Info</option>
        </select>
        <span className="text-sm text-gray-600">
          {conditions.length} condition{conditions.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {conditions.map((condition) => (
          <div key={condition.id} className="relative">
            <ConditionCard condition={condition} compact={false} />
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => handleEdit(condition)}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit2 className="h-4 w-4 text-blue-600" />
              </button>
              <button
                onClick={() => handleDelete(condition.id)}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {conditions.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {severityFilter
              ? `No conditions found with ${severityFilter} severity`
              : 'No conditions found. Add your first condition to get started.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ConditionList;
