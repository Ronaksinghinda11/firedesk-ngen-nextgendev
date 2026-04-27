import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
} from 'lucide-react';
import { submissionApi, ServiceSubmission } from '../../../services/api/submissionApi';

interface ManagerDashboardProps {
  onViewPendingApprovals?: () => void;
  onViewSubmission?: (submissionId: string) => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  onViewPendingApprovals,
  onViewSubmission,
}) => {
  const [PENDINGApprovals, setPendingApprovals] = useState<ServiceSubmission[]>([]);
  const [recentActivity, setRecentActivity] = useState<ServiceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load PENDING approvals
      const PENDING = await submissionApi.getPendingApprovals({});
      setPendingApprovals(PENDING);

      // Load recent activity (last 10 submissions across all statuses)
      const recent = await submissionApi.getMySubmissions({ limit: 10 });
      setRecentActivity(recent);

      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate statistics
  const stats = {
    PENDINGCount: PENDINGApprovals.length,
    criticalCount: PENDINGApprovals.filter((s) => s.calculatedPriorityScore && s.calculatedPriorityScore >= 90).length,
    highPriorityCount: PENDINGApprovals.filter(
      (s) => s.calculatedPriorityScore && s.calculatedPriorityScore >= 70 && s.calculatedPriorityScore < 90
    ).length,
    overdueCount: PENDINGApprovals.filter((s) => {
      if (!s.submittedAt) return false;
      const daysSinceSubmission = Math.floor(
        (Date.now() - new Date(s.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceSubmission > 3;
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Manager Dashboard</h1>
        <p className="text-gray-600">Overview of service submissions and approvals</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div
          onClick={onViewPendingApprovals}
          className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-8 w-8 text-yellow-600" />
            <span className="text-3xl font-bold text-yellow-600">{stats.PENDINGCount}</span>
          </div>
          <h3 className="text-sm font-semibold text-yellow-900 mb-1">Pending Approvals</h3>
          <p className="text-xs text-yellow-700">Awaiting your review</p>
        </div>

        <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <span className="text-3xl font-bold text-red-600">{stats.criticalCount}</span>
          </div>
          <h3 className="text-sm font-semibold text-red-900 mb-1">Critical Issues</h3>
          <p className="text-xs text-red-700">Priority score ≥ 90</p>
        </div>

        <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8 text-orange-600" />
            <span className="text-3xl font-bold text-orange-600">{stats.highPriorityCount}</span>
          </div>
          <h3 className="text-sm font-semibold text-orange-900 mb-1">High Priority</h3>
          <p className="text-xs text-orange-700">Priority score 70-89</p>
        </div>

        <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-8 w-8 text-purple-600" />
            <span className="text-3xl font-bold text-purple-600">{stats.overdueCount}</span>
          </div>
          <h3 className="text-sm font-semibold text-purple-900 mb-1">Overdue Reviews</h3>
          <p className="text-xs text-purple-700">Pending &gt; 3 days</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={onViewPendingApprovals}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <Clock className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <div className="font-semibold text-gray-900">Review Pending</div>
              <div className="text-sm text-gray-600">{stats.PENDINGCount} awaiting approval</div>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
            <BarChart3 className="h-6 w-6 text-green-600" />
            <div className="text-left">
              <div className="font-semibold text-gray-900">View Reports</div>
              <div className="text-sm text-gray-600">Analytics & insights</div>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
            <CheckCircle className="h-6 w-6 text-purple-600" />
            <div className="text-left">
              <div className="font-semibold text-gray-900">Approved History</div>
              <div className="text-sm text-gray-600">View past approvals</div>
            </div>
          </button>
        </div>
      </div>

      {/* Critical/Urgent Items */}
      {stats.criticalCount > 0 && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Urgent: Critical Priority Submissions</h3>
          </div>
          <div className="space-y-2">
            {PENDINGApprovals
              .filter((s) => s.calculatedPriorityScore && s.calculatedPriorityScore >= 90)
              .slice(0, 3)
              .map((submission) => (
                <div
                  key={submission.id}
                  onClick={() => onViewSubmission?.(submission.id)}
                  className="p-3 bg-white border border-red-200 rounded cursor-pointer hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{submission.asset?.assetId}</p>
                      <p className="text-sm text-gray-600">{submission.form?.serviceName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">
                        Score: {submission.calculatedPriorityScore}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(submission.submittedAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          {stats.criticalCount > 3 && (
            <button
              onClick={onViewPendingApprovals}
              className="mt-3 text-sm font-medium text-red-700 hover:text-red-900"
            >
              View all {stats.criticalCount} critical submissions →
            </button>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Activity className="h-5 w-5 text-gray-400" />
        </div>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No recent activity</p>
          ) : (
            recentActivity.map((submission) => (
              <div
                key={submission.id}
                onClick={() => onViewSubmission?.(submission.id)}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200"
              >
                <div className="flex items-center gap-3">
                  {submission.approvalStatus === 'APPROVED' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : submission.approvalStatus === 'REJECTED' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{submission.asset?.assetId}</p>
                    <p className="text-sm text-gray-600">
                      {submission.form?.serviceName} • by {submission.technician?.user?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-semibold px-2 py-1 rounded ${submission.approvalStatus === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : submission.approvalStatus === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }`}
                  >
                    {submission.approvalStatus || 'PENDING'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(submission.submittedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
