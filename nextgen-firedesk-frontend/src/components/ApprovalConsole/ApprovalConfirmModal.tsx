import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Loader2, AlertTriangle } from 'lucide-react';

export type ConfirmAction = 'approve' | 'reject';

interface ApprovalConfirmModalProps {
  open: boolean;
  action: ConfirmAction;
  count: number;
  onConfirm: (remarks: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

const actionConfig = {
  approve: {
    title: 'Confirm Approval',
    description: (count: number) =>
      `You are about to approve ${count} submission${count > 1 ? 's' : ''}. This action will update asset health records.`,
    confirmLabel: 'Approve',
    confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
    icon: Check,
    iconClass: 'text-green-600',
    remarksRequired: false,
    remarksPlaceholder: 'Optional remarks for approval...',
  },
  reject: {
    title: 'Confirm Rejection',
    description: (count: number) =>
      `You are about to reject ${count} submission${count > 1 ? 's' : ''}. The technician(s) will be notified and may need to re-submit.`,
    confirmLabel: 'Reject',
    confirmClass: '',
    icon: AlertTriangle,
    iconClass: 'text-red-600',
    remarksRequired: true,
    remarksPlaceholder: 'Reason for rejection (required)...',
  },
};

const ApprovalConfirmModal: React.FC<ApprovalConfirmModalProps> = ({
  open,
  action,
  count,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [remarks, setRemarks] = useState('');
  const config = actionConfig[action];
  const Icon = config.icon;

  const canSubmit = !config.remarksRequired || remarks.trim().length > 0;

  const handleConfirm = () => {
    if (canSubmit) {
      onConfirm(remarks.trim());
      setRemarks('');
    }
  };

  const handleCancel = () => {
    setRemarks('');
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                action === 'approve' ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <Icon className={`h-5 w-5 ${config.iconClass}`} />
            </div>
            <div>
              <DialogTitle className="text-base">{config.title}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {config.description(count)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3">
          <Textarea
            placeholder={config.remarksPlaceholder}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            autoFocus
          />
          {config.remarksRequired && remarks.trim().length === 0 && (
            <p className="text-[11px] text-destructive mt-1">
              Remarks are required for rejection.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={action === 'reject' ? 'destructive' : 'default'}
            className={config.confirmClass}
            onClick={handleConfirm}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : action === 'approve' ? (
              <Check className="h-4 w-4 mr-1" />
            ) : (
              <X className="h-4 w-4 mr-1" />
            )}
            {config.confirmLabel} ({count})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalConfirmModal;
