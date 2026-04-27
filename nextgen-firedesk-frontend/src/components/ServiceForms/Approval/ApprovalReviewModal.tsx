import React, { useState } from 'react';
import { X, CheckCircle, XCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { submissionApi, ServiceSubmission } from '../../../services/api/submissionApi';
import SubmissionDetail from '../Submission/SubmissionDetail';

interface ApprovalReviewModalProps {
  submission: ServiceSubmission;
  onClose: () => void;
  onApprovalComplete: () => void;
}

const ApprovalReviewModal: React.FC<ApprovalReviewModalProps> = ({
  submission,
  onClose,
  onApprovalComplete,
}) => {
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartDecision = (newDecision: 'APPROVED' | 'REJECTED') => {
    setDecision(newDecision);
    setShowDecisionForm(true);
    setRemarks('');
    setError(null);
  };

  const handleSubmitDecision = async () => {
    if (!decision) return;

    try {
      setSubmitting(true);
      setError(null);

      await submissionApi.updateApprovalStatus(submission.id, {
        approvalStatus: decision,
        approvalRemarks: remarks || undefined,
      });

      onApprovalComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update approval status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowDecisionForm(false);
    setDecision(null);
    setRemarks('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review Submission</h2>
            <p className="text-sm text-gray-600 mt-1">{submission.submissionNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Warning Banner (if critical) */}
        {submission.calculatedPriorityScore && submission.calculatedPriorityScore >= 90 && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Critical Priority - Immediate Attention Required</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              This submission has a critical priority score of {submission.calculatedPriorityScore}.
              Please review carefully and take appropriate action.
            </p>
          </div>
        )}

        {/* Submission Details */}
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-6">
          <SubmissionDetail submissionId={submission.id} />
        </div>

        {/* Decision Form (shown when approve/reject clicked) */}
        {showDecisionForm && (
          <div className="mx-6 mb-6 p-4 bg-gray-50 border border-gray-300 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">
              {decision === 'APPROVED' ? 'Approve Submission' : 'Reject Submission'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="h-4 w-4" />
                Remarks {decision === 'REJECTED' && <span className="text-red-600">*</span>}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder={
                  decision === 'APPROVED'
                    ? 'Optional feedback for the technician...'
                    : 'Please provide a reason for rejection...'
                }
                required={decision === 'REJECTED'}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmitDecision}
                disabled={submitting || (decision === 'REJECTED' && !remarks.trim())}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  decision === 'APPROVED'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {decision === 'APPROVED' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {submitting ? 'Approving...' : 'Confirm Approval'}
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showDecisionForm && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
            >
              Close
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => handleStartDecision('REJECTED')}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-5 w-5" />
                Reject
              </button>
              <button
                onClick={() => handleStartDecision('APPROVED')}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-5 w-5" />
                Approve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalReviewModal;
