import React from 'react';
import { CheckCircle, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import { SubmissionSummary } from '../../../services/api/submissionApi';
import HealthStatusBadge from '../common/HealthStatusBadge';
import PriorityScoreIndicator from '../common/PriorityScoreIndicator';

interface SubmissionSuccessProps {
  summary: SubmissionSummary;
  onViewSubmission?: () => void;
  onCreateAnother?: () => void;
  onBackToDashboard?: () => void;
}

const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({
  summary,
  onViewSubmission,
  onCreateAnother,
  onBackToDashboard,
}) => {
  const { submission, healthSummary } = summary;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submission Successful!</h1>
        <p className="text-gray-600">
          Your service form has been submitted and processed successfully.
        </p>
      </div>

      {/* Submission Details Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Submission Details</h2>
          <span className="px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-800 rounded-full">
            {submission.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Submission Number
            </label>
            <p className="text-gray-900 font-mono text-sm">{submission.submissionNumber}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Asset
            </label>
            <p className="text-gray-900">{submission.asset?.assetId}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Service Form
            </label>
            <p className="text-gray-900">{submission.form?.serviceName}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Frequency
            </label>
            <p className="text-gray-900">{submission.frequency?.frequencyName}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Asset Health Assessment</h3>
            <HealthStatusBadge status={healthSummary.status} size="md" />
          </div>

          <div className="mb-4">
            <PriorityScoreIndicator
              score={healthSummary.priorityScore}
              showLabel={true}
              size="lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">Priority Score</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{healthSummary.priorityScore}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold text-gray-700">Critical Issues</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{healthSummary.criticalCount}</p>
            </div>
          </div>
        </div>

        {healthSummary.requiresAttention && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Requires Immediate Attention</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              This asset has critical conditions that require immediate action. Your manager has
              been notified.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onViewSubmission && (
          <button
            onClick={onViewSubmission}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="h-5 w-5" />
            View Submission
          </button>
        )}
        {onCreateAnother && (
          <button
            onClick={onCreateAnother}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Create Another Submission
          </button>
        )}
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>What happens next?</strong> Your submission is now PENDING manager approval. You
          will receive a notification once it has been reviewed. The asset health status has been
          updated based on your inspection.
        </p>
      </div>
    </div>
  );
};

export default SubmissionSuccess;
