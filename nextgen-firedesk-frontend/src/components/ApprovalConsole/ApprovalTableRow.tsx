import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ApprovalSubmission } from '@/services/api/approvalConsoleApi';
import {
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Camera,
  AlertTriangle,
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import ApprovalRowExpansion from './ApprovalRowExpansion';

interface ApprovalTableRowProps {
  submission: ApprovalSubmission;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (checked: boolean) => void;
  onExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
}

const riskConfig = {
  high: {
    border: 'border-l-4 border-l-red-500',
    badge: 'bg-red-100 text-red-800',
    label: 'HIGH',
  },
  medium: {
    border: 'border-l-4 border-l-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    label: 'MED',
  },
  low: {
    border: 'border-l-4 border-l-green-500',
    badge: 'bg-green-100 text-green-800',
    label: 'LOW',
  },
};

const healthBadge = (status: string | null) => {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === 'healthy' || s === 'good')
    return <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-300">{status}</Badge>;
  if (s === 'needs_attention' || s === 'warning')
    return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">{status.replace(/_/g, ' ')}</Badge>;
  if (s === 'critical' || s === 'poor')
    return <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300">{status}</Badge>;
  return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
};

const HealthTransition: React.FC<{ before: string | null; after: string | null }> = ({
  before,
  after,
}) => {
  if (!before && !after) return <span className="text-muted-foreground text-xs">—</span>;

  const changed = before && after && before !== after;
  const degraded =
    changed &&
    ['critical', 'poor', 'needs_attention'].includes(after.toLowerCase()) &&
    ['healthy', 'good'].includes(before.toLowerCase());

  return (
    <div className="flex items-center gap-1">
      {before && healthBadge(before)}
      {changed && (
        degraded ? (
          <TrendingDown className="h-3 w-3 text-red-500" />
        ) : (
          <TrendingUp className="h-3 w-3 text-green-500" />
        )
      )}
      {!changed && before && <Minus className="h-3 w-3 text-muted-foreground" />}
      {after && after !== before && healthBadge(after)}
    </div>
  );
};

const ApprovalTableRow: React.FC<ApprovalTableRowProps> = ({
  submission,
  isSelected,
  isExpanded,
  onSelect,
  onExpand,
  onApprove,
  onReject,
}) => {
  const risk = riskConfig[submission.risk_level] || riskConfig.low;
  const submittedDate = submission.submitted_at
    ? new Date(submission.submitted_at)
    : null;
  const isOverdue = submission.is_overdue;

  return (
    <TooltipProvider delayDuration={200}>
      <>
        <TableRow
          className={`group cursor-pointer transition-colors hover:bg-muted/40 ${risk.border} ${
            isSelected ? 'bg-primary/5' : ''
          } ${isExpanded ? 'bg-muted/30' : ''}`}
          onClick={onExpand}
        >
          {/* Checkbox */}
          <TableCell className="w-[40px] pl-3" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(!!checked)}
              aria-label={`Select ${submission.form_name}`}
            />
          </TableCell>

          {/* Form / Asset */}
          <TableCell className="min-w-[200px]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="font-medium text-sm truncate max-w-[180px]">
                  {submission.form_name || submission.form?.service_name || 'Unknown Form'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[180px] pl-5">
                {submission.asset_name || submission.asset?.asset_code || 'No asset'}
                {submission.category_name && ` · ${submission.category_name}`}
              </p>
              {submission.location && (
                <p className="text-[10px] text-muted-foreground truncate max-w-[180px] pl-5">
                  {submission.location}
                </p>
              )}
            </div>
          </TableCell>

          {/* Technician */}
          <TableCell>
            <span className="text-sm">{submission.technician_name || submission.technician?.name || submission.submitted_by?.name || '—'}</span>
          </TableCell>

          {/* Date */}
          <TableCell>
            <div className="space-y-0.5">
              <span className="text-xs font-medium">
                {submittedDate ? format(submittedDate, 'dd MMM yyyy') : '—'}
              </span>
              {submittedDate && (
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(submittedDate, { addSuffix: true })}
                </p>
              )}
              {isOverdue && (
                <div className="flex items-center gap-0.5 text-orange-600">
                  <Clock className="h-3 w-3" />
                  <span className="text-[10px] font-medium">Overdue</span>
                </div>
              )}
            </div>
          </TableCell>

          {/* Risk */}
          <TableCell>
            <Badge className={`text-[10px] font-bold ${risk.badge}`} variant="secondary">
              {risk.label}
            </Badge>
          </TableCell>

          {/* Score */}
          <TableCell>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (submission.calculated_priority_score || 0) >= 70
                          ? 'bg-red-500'
                          : (submission.calculated_priority_score || 0) >= 40
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(submission.calculated_priority_score || 0, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono font-medium">
                    {submission.calculated_priority_score?.toFixed(0) || '0'}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  C:{submission.critical_count || 0} · H:{submission.high_count || 0} · M:
                  {submission.medium_count || 0} · L:{submission.low_count || 0}
                </p>
              </TooltipContent>
            </Tooltip>
          </TableCell>

          {/* Health */}
          <TableCell>
            <HealthTransition
              before={submission.before_health_status}
              after={submission.calculated_health_status}
            />
          </TableCell>

          {/* Deviations */}
          <TableCell>
            <div className="flex items-center gap-1">
              {(submission.deviation_count || 0) > 0 ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-sm font-medium">{submission.deviation_count}</span>
                </>
              ) : (
                <span className="text-muted-foreground text-xs">0</span>
              )}
            </div>
          </TableCell>

          {/* Evidence */}
          <TableCell>
            <div className="flex items-center gap-1">
              {submission.has_photos ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-blue-600">
                      <Camera className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{submission.photo_count}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{submission.photo_count} photo(s) attached</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="text-muted-foreground text-[10px]">No photos</span>
              )}
            </div>
          </TableCell>

          {/* Actions */}
          <TableCell onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-green-100 hover:text-green-700"
                    onClick={onApprove}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Approve</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-700"
                    onClick={onReject}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Reject</p></TooltipContent>
              </Tooltip>
            </div>
          </TableCell>
        </TableRow>

        {/* Expansion Panel */}
        {isExpanded && (
          <TableRow>
            <TableCell colSpan={10} className="p-0 border-0">
              <ApprovalRowExpansion
                submissionId={submission.id}
                onApprove={onApprove}
                onReject={onReject}
              />
            </TableCell>
          </TableRow>
        )}
      </>
    </TooltipProvider>
  );
};

export default ApprovalTableRow;
