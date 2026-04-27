/**
 * Service Form Review Modal
 * Allows managers to view submitted forms and approve/reject them
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import managerServiceFormApi from '@/services/api/managerServiceFormApi';

interface ServiceFormReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceName: string;
  submissionNumber: string;
  onSuccess?: () => void;
}

type Action = 'approve' | 'reject' | null;

export default function ServiceFormReviewModal({
  open,
  onOpenChange,
  serviceId,
  serviceName,
  submissionNumber,
  onSuccess,
}: ServiceFormReviewModalProps) {
  const [action, setAction] = useState<Action>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setAction(null);
    setRemarks('');
    onOpenChange(false);
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await managerServiceFormApi.approveService(serviceId, remarks);
      toast({
        title: 'Success',
        description: 'Service approved successfully',
      });
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve service',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide rejection remarks',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await managerServiceFormApi.rejectService(serviceId, remarks);
      toast({
        title: 'Success',
        description: 'Service rejected successfully. Technician can now resubmit.',
      });
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject service',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (action === 'approve') {
      handleApprove();
    } else if (action === 'reject') {
      handleReject();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Review Service Submission</DialogTitle>
          <DialogDescription>
            {serviceName} - {submissionNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!action ? (
            <>
              <p className="text-sm text-gray-600">
                Please select an action to proceed:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => setAction('approve')}
                  className="bg-green-500 hover:bg-green-600 h-20 flex-col gap-2"
                >
                  <CheckCircle2 className="h-6 w-6" />
                  <span>Approve</span>
                </Button>
                <Button
                  onClick={() => setAction('reject')}
                  variant="destructive"
                  className="h-20 flex-col gap-2"
                >
                  <XCircle className="h-6 w-6" />
                  <span>Reject</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">
                  {action === 'approve' ? 'Approving Service' : 'Rejecting Service'}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">
                  Remarks {action === 'reject' && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    action === 'approve'
                      ? 'Add any comments (optional)...'
                      : 'Please specify the reason for rejection...'
                  }
                  rows={4}
                  className="resize-none"
                />
                {action === 'reject' && (
                  <p className="text-xs text-gray-500">
                    The technician will be able to resubmit after reviewing your remarks
                  </p>
                )}
              </div>

              {action === 'approve' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Note:</strong> Approving this service will mark it as COMPLETED.
                  </p>
                </div>
              )}

              {action === 'reject' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    <strong>Note:</strong> Rejecting this service will reset it to PENDING status,
                    allowing the technician to make corrections and resubmit.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {!action ? (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setAction(null)}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className={
                  action === 'approve'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
