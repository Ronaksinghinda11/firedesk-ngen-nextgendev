import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, TrendingUp, ClipboardList } from 'lucide-react';
import { submissionApi, ServiceSubmission } from '../../../services/api/submissionApi';
import HealthStatusBadge from '../common/HealthStatusBadge';
import FrequencyBadge from '../common/FrequencyBadge';

interface TechnicianDashboardProps {
  onStartSubmission?: (assetId: string, frequencyId: string) => void;
  onViewSubmission?: (submissionId: string) => void;
}

const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({
  onStartSubmission,
  onViewSubmission,
}) => {
  const [mySubmissions, setMySubmissions] = useState<ServiceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadMySubmissions();
  }, [filter]);

  const loadMySubmissions = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filter !== 'all') {
        filters.approvalStatus = filter.toUpperCase();
      }

      const data = await submissionApi.getMySubmissions(filters);
      setMySubmissions(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (approvalStatus?: string) => {
    switch (approvalStatus) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate stats
  const stats = {
    total: mySubmissions.length,
    PENDING: mySubmissions.filter((s) => s.approvalStatus === 'PENDING').length,
    approved: mySubmissions.filter((s) => s.approvalStatus === 'APPROVED').length,
    rejected: mySubmissions.filter((s) => s.approvalStatus === 'REJECTED').length,
    thisWeek: mySubmissions.filter((s) => {
      if (!s.submittedAt) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(s.submittedAt) > weekAgo;
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Service Submissions</h1>
        <p className="text-gray-600">Track your service form submissions and their status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <ClipboardList className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="p-4 bg-white border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.PENDING}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="p-4 bg-white border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="p-4 bg-white border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="p-4 bg-white border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-blue-600">{stats.thisWeek}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2 border-b border-gray-200">
        {[
          { key: 'all', label: 'All' },
          { key: 'PENDING', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 font-medium transition-colors ${filter === tab.key
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {mySubmissions.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {filter === 'all'
                ? 'No submissions yet. Start your first service inspection!'
                : `No ${filter} submissions found.`}
            </p>
          </div>
        ) : (
          mySubmissions.map((submission) => (
            <div
              key={submission.id}
              onClick={() => onViewSubmission?.(submission.id)}
              className="p-5 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{submission.form?.serviceName}</h3>
                    {submission.approvalStatus && (
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(
                          submission.approvalStatus
                        )}`}
                      >
                        {submission.approvalStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-mono">{submission.submissionNumber}</p>
                </div>
                {submission.calculatedHealthStatus && (
                  <HealthStatusBadge status={submission.calculatedHealthStatus} size="sm" />
                )}
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
                  <label className="text-xs text-gray-600">Frequency</label>
                  <p className="text-sm font-medium text-gray-900">
                    {submission.frequency?.frequencyName}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Submitted</label>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(submission.submittedAt)}
                  </p>
                </div>
              </div>

              {submission.calculatedPriorityScore !== undefined && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Priority Score</span>
                    <span className="font-semibold">{submission.calculatedPriorityScore}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${submission.calculatedPriorityScore >= 90
                        ? 'bg-red-600'
                        : submission.calculatedPriorityScore >= 70
                          ? 'bg-orange-500'
                          : submission.calculatedPriorityScore >= 40
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      style={{ width: `${submission.calculatedPriorityScore}%` }}
                    />
                  </div>
                </div>
              )}

              {submission.approvalRemarks && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Manager's Remarks
                  </label>
                  <p className="text-sm text-gray-700 mt-1">{submission.approvalRemarks}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Scheduled: {formatDate(submission.scheduledDate)}
                </span>
                <span className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View Details →
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TechnicianDashboard;
