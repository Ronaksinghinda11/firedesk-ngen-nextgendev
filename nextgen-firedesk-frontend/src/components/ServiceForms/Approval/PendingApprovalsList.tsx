import React, { useState, useEffect } from 'react';
import { Clock, Search, Filter, AlertTriangle, CheckCircle } from 'lucide-react';
import { submissionApi, ServiceSubmission } from '../../../services/api/submissionApi';
import HealthStatusBadge from '../common/HealthStatusBadge';
import PriorityScoreIndicator from '../common/PriorityScoreIndicator';
import FrequencyBadge from '../common/FrequencyBadge';

interface PendingApprovalsListProps {
  onSelectSubmission?: (submission: ServiceSubmission) => void;
}

const PendingApprovalsList: React.FC<PendingApprovalsListProps> = ({ onSelectSubmission }) => {
  const [submissions, setSubmissions] = useState<ServiceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [plantFilter, setPlantFilter] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, [plantFilter]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (plantFilter) filters.plantId = plantFilter;

      const data = await submissionApi.getPendingApprovals(filters);
      setSubmissions(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load PENDING approvals');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      submission.submissionNumber.toLowerCase().includes(searchLower) ||
      submission.asset?.assetId?.toLowerCase().includes(searchLower) ||
      submission.asset?.location?.toLowerCase().includes(searchLower) ||
      submission.form?.serviceName?.toLowerCase().includes(searchLower)
    );
  });

  const criticalCount = filteredSubmissions.filter(
    (s) => s.calculatedPriorityScore && s.calculatedPriorityScore >= 90
  ).length;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysAgo = (dateString?: string) => {
    if (!dateString) return 0;
    const diff = Date.now() - new Date(dateString).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading PENDING approvals...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pending Approvals</h1>
        <p className="text-gray-600">
          Review and approve service submissions from technicians
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">{filteredSubmissions.length}</p>
            </div>
            <Clock className="h-10 w-10 text-blue-600" />
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Priority</p>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            </div>
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Needs Attention</p>
              <p className="text-2xl font-bold text-orange-600">
                {
                  filteredSubmissions.filter(
                    (s) =>
                      s.calculatedPriorityScore &&
                      s.calculatedPriorityScore >= 70 &&
                      s.calculatedPriorityScore < 90
                  ).length
                }
              </p>
            </div>
            <AlertTriangle className="h-10 w-10 text-orange-600" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search by submission number, asset, or location..."
          />
        </div>
        <button
          onClick={loadSubmissions}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Filter className="h-5 w-5" />
          Refresh
        </button>
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {submissions.length === 0
                ? 'No PENDING approvals at this time'
                : 'No submissions match your search criteria'}
            </p>
          </div>
        ) : (
          filteredSubmissions.map((submission) => {
            const daysAgo = getDaysAgo(submission.submittedAt);
            const isUrgent = daysAgo > 3 || (submission.calculatedPriorityScore ?? 0) >= 90;

            return (
              <div
                key={submission.id}
                onClick={() => onSelectSubmission?.(submission)}
                className={`p-5 bg-white border-2 rounded-lg hover:shadow-md transition-all cursor-pointer ${isUrgent ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{submission.form?.serviceName}</h3>
                      {isUrgent && <AlertTriangle className="h-5 w-5 text-red-600" />}
                    </div>
                    <p className="text-sm text-gray-600 font-mono">{submission.submissionNumber}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {submission.calculatedHealthStatus && (
                      <HealthStatusBadge status={submission.calculatedHealthStatus} size="sm" />
                    )}
                    {submission.frequency?.frequencyName && (
                      <span className="text-xs text-gray-600">{submission.frequency.frequencyName}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-600">Asset</label>
                    <p className="text-sm font-medium text-gray-900">{submission.asset?.assetId}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Location</label>
                    <p className="text-sm font-medium text-gray-900">
                      {submission.asset?.location || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Technician</label>
                    <p className="text-sm font-medium text-gray-900">
                      {submission.technician?.user?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Submitted</label>
                    <p className="text-sm font-medium text-gray-900">
                      {daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`}
                    </p>
                  </div>
                </div>

                {submission.calculatedPriorityScore !== undefined && (
                  <div className="mb-3">
                    <PriorityScoreIndicator
                      score={submission.calculatedPriorityScore}
                      showLabel={false}
                      size="sm"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    Scheduled: {formatDate(submission.scheduledDate)}
                  </span>
                  <button className="px-4 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors">
                    Review →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PendingApprovalsList;
