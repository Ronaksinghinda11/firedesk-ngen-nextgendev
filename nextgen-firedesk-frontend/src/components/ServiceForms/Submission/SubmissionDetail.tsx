import React, { useState, useEffect } from 'react';
import { Calendar, User, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { submissionApi, ServiceSubmission } from '../../../services/api/submissionApi';
import AssetCard from '../common/AssetCard';
import HealthStatusBadge from '../common/HealthStatusBadge';
import PriorityScoreIndicator from '../common/PriorityScoreIndicator';
import SeverityBadge from '../common/SeverityBadge';

interface SubmissionDetailProps {
  submissionId: string;
}

const SubmissionDetail: React.FC<SubmissionDetailProps> = ({ submissionId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<ServiceSubmission | null>(null);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      const data = await submissionApi.getById(submissionId);
      setSubmission(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'SUBMITTED':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading submission...</div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error || 'Submission not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{submission.form?.serviceName}</h1>
          <p className="text-gray-600 font-mono text-sm mt-1">{submission.submissionNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(submission.status)}
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(submission.status)}`}>
            {submission.status}
          </span>
        </div>
      </div>

      {/* Asset Information */}
      <AssetCard
        asset={submission.asset!}
        showHealthStatus={true}
        showPriorityScore={true}
        showInspectionDates={true}
        compact={false}
      />

      {/* Submission Metadata */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-4 w-4 text-gray-500" />
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Scheduled Date
              </label>
            </div>
            <p className="text-gray-900">{formatDate(submission.scheduledDate)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Submitted At
              </label>
            </div>
            <p className="text-gray-900">{formatDate(submission.submittedAt)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <User className="h-4 w-4 text-gray-500" />
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Technician
              </label>
            </div>
            <p className="text-gray-900">{submission.technician?.user?.name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Frequency
            </label>
            <p className="text-gray-900">{submission.frequency?.frequencyName}</p>
          </div>
          {submission.calculatedHealthStatus && (
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Calculated Health
              </label>
              <div className="mt-1">
                <HealthStatusBadge status={submission.calculatedHealthStatus} size="sm" />
              </div>
            </div>
          )}
          {submission.calculatedPriorityScore !== undefined && (
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Priority Score
              </label>
              <p className="text-gray-900 font-bold text-lg">{submission.calculatedPriorityScore}</p>
            </div>
          )}
        </div>
      </div>

      {/* Approval Status (if applicable) */}
      {(submission.approvalStatus || submission.approvalRemarks) && (
        <div
          className={`p-6 border rounded-lg ${
            submission.approvalStatus === 'APPROVED'
              ? 'bg-green-50 border-green-200'
              : submission.approvalStatus === 'REJECTED'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Approval Status</h3>
            {submission.approvalStatus && (
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  submission.approvalStatus === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : submission.approvalStatus === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {submission.approvalStatus}
              </span>
            )}
          </div>
          {submission.approvedAt && (
            <p className="text-sm text-gray-600 mb-2">
              {submission.approvalStatus === 'APPROVED' ? 'Approved' : 'Rejected'} on{' '}
              {formatDate(submission.approvedAt)}
            </p>
          )}
          {submission.approvalRemarks && (
            <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                Manager's Remarks
              </label>
              <p className="text-gray-900">{submission.approvalRemarks}</p>
            </div>
          )}
        </div>
      )}

      {/* Responses */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Responses ({submission.responses?.length || 0})
        </h2>
        <div className="space-y-4">
          {submission.responses?.map((response, index) => (
            <div key={response.id} className="pb-4 border-b border-gray-200 last:border-b-0">
              <div className="mb-2">
                <span className="font-medium text-gray-900">
                  Q{index + 1}. {response.question?.questionText}
                </span>
                <span className="ml-2 text-xs text-gray-500">({response.question?.answerType})</span>
              </div>

              {/* Response Value */}
              <div className="ml-6 space-y-2">
                {response.selectedConditionId && response.selectedCondition && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Condition:</span>
                    <span className="font-medium text-gray-900">
                      {response.selectedCondition.conditionSource === 'MASTER'
                        ? response.selectedCondition.masterCondition?.conditionName
                        : response.selectedCondition.customConditionName}
                    </span>
                  </div>
                )}

                {response.responseSeverity && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Severity:</span>
                    <SeverityBadge severity={response.responseSeverity as any} size="sm" />
                  </div>
                )}

                {response.responsePriorityScore !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Priority Score:</span>
                    <span className="font-semibold text-gray-900">{response.responsePriorityScore}</span>
                  </div>
                )}

                {response.responseHealthImpact && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Health Impact:</span>
                    <HealthStatusBadge status={response.responseHealthImpact} size="sm" />
                  </div>
                )}

                {response.textResponse && (
                  <div>
                    <span className="text-sm text-gray-600">Response:</span>
                    <p className="text-gray-900 mt-1">{response.textResponse}</p>
                  </div>
                )}

                {response.numericResponse !== undefined && (
                  <div>
                    <span className="text-sm text-gray-600">Value:</span>
                    <span className="ml-2 font-semibold text-gray-900">{response.numericResponse}</span>
                  </div>
                )}

                {response.booleanResponse !== undefined && (
                  <div>
                    <span className="text-sm text-gray-600">Answer:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {response.booleanResponse ? 'Satisfactory' : 'Unsatisfactory'}
                    </span>
                  </div>
                )}

                {response.dateResponse && (
                  <div>
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="ml-2 text-gray-900">{formatDate(response.dateResponse)}</span>
                  </div>
                )}

                {response.photoUrls && response.photoUrls.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">Photos:</span>
                    <span className="ml-2 text-gray-900">{response.photoUrls.length} photo(s)</span>
                  </div>
                )}

                {response.signatureUrl && (
                  <div className="text-sm text-green-600">Signature captured</div>
                )}

                {response.technicianNotes && (
                  <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                      Technician Notes
                    </label>
                    <p className="text-sm text-gray-900">{response.technicianNotes}</p>
                  </div>
                )}
              </div>

              <div className="ml-6 mt-2 text-xs text-gray-500">
                Answered by {response.answeredBy} on {formatDate(response.answeredAt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetail;
