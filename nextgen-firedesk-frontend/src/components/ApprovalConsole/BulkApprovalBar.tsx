import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Check, X, CheckCheck, Shield } from 'lucide-react';

interface BulkApprovalBarProps {
  totalRows: number;
  selectedIds: string[];
  lowRiskCount: number;
  filteredCount: number;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkApproveLowRisk: () => void;
  onBulkApproveFiltered: () => void;
  onBulkReject: () => void;
}

const BulkApprovalBar: React.FC<BulkApprovalBarProps> = ({
  totalRows,
  selectedIds,
  lowRiskCount,
  filteredCount,
  allSelected,
  onSelectAll,
  onBulkApprove,
  onBulkApproveLowRisk,
  onBulkApproveFiltered,
  onBulkReject,
}) => {
  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex items-center justify-between py-2 px-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onSelectAll(!!checked)}
            aria-label="Select all submissions"
          />
          <span className="text-sm text-muted-foreground">
            {hasSelection ? (
              <>
                <span className="font-medium text-foreground">{selectedCount}</span> of{' '}
                {totalRows} selected
              </>
            ) : (
              'Select all'
            )}
          </span>
        </div>

        {hasSelection && (
          <Badge variant="secondary" className="text-xs">
            {selectedCount} selected
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Approve Low Risk batch */}
        {lowRiskCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
            onClick={onBulkApproveLowRisk}
          >
            <Shield className="h-3.5 w-3.5 mr-1" />
            Approve Low Risk ({lowRiskCount})
          </Button>
        )}

        {/* Approve Filtered */}
        {filteredCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
            onClick={onBulkApproveFiltered}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Approve Filtered ({filteredCount})
          </Button>
        )}

        {/* Approve Selected */}
        {hasSelection && (
          <>
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs bg-green-600 hover:bg-green-700"
              onClick={() => onBulkApprove(selectedIds)}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Approve Selected ({selectedCount})
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              onClick={onBulkReject}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Reject Selected ({selectedCount})
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default BulkApprovalBar;
