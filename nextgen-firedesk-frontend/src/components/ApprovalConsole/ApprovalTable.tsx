import React from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ApprovalSubmission, ApprovalQueueFilters } from '@/services/api/approvalConsoleApi';
import ApprovalTableRow from './ApprovalTableRow';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ApprovalTableProps {
  submissions: ApprovalSubmission[];
  selectedIds: string[];
  expandedId: string | null;
  onSelect: (id: string, checked: boolean) => void;
  onExpand: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (column: string) => void;
  loading: boolean;
}

interface SortableHeaderProps {
  column: string;
  label: string;
  currentSort?: string;
  currentOrder?: 'asc' | 'desc';
  onSort: (column: string) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  column,
  label,
  currentSort,
  currentOrder,
  onSort,
  className = '',
}) => {
  const isActive = currentSort === column;
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold">{label}</span>
        {isActive ? (
          currentOrder === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
        )}
      </div>
    </TableHead>
  );
};

const ApprovalTable: React.FC<ApprovalTableProps> = ({
  submissions,
  selectedIds,
  expandedId,
  onSelect,
  onExpand,
  onApprove,
  onReject,
  sortBy,
  sortOrder,
  onSort,
  loading,
}) => {
  if (loading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead className="text-xs font-semibold">Form / Asset</TableHead>
              <TableHead className="text-xs font-semibold">Technician</TableHead>
              <TableHead className="text-xs font-semibold">Date</TableHead>
              <TableHead className="text-xs font-semibold">Risk</TableHead>
              <TableHead className="text-xs font-semibold">Score</TableHead>
              <TableHead className="text-xs font-semibold">Health</TableHead>
              <TableHead className="text-xs font-semibold">Deviations</TableHead>
              <TableHead className="text-xs font-semibold">Evidence</TableHead>
              <TableHead className="text-xs font-semibold w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 10 }).map((_, j) => (
                  <td key={j} className="p-3">
                    <div className="h-4 bg-muted animate-pulse rounded w-full" />
                  </td>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">No pending approvals</p>
          <p className="text-sm mt-1">All submissions have been reviewed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[40px]" />
            <SortableHeader
              column="form_name"
              label="Form / Asset"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
              className="min-w-[200px]"
            />
            <SortableHeader
              column="technician_name"
              label="Technician"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader
              column="submitted_at"
              label="Date"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader
              column="risk_level"
              label="Risk"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader
              column="calculated_priority_score"
              label="Score"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
            />
            <TableHead className="text-xs font-semibold">Health</TableHead>
            <SortableHeader
              column="deviation_count"
              label="Deviations"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
            />
            <TableHead className="text-xs font-semibold">Evidence</TableHead>
            <TableHead className="text-xs font-semibold w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <ApprovalTableRow
              key={submission.id}
              submission={submission}
              isSelected={selectedIds.includes(submission.id)}
              isExpanded={expandedId === submission.id}
              onSelect={(checked) => onSelect(submission.id, checked)}
              onExpand={() => onExpand(submission.id)}
              onApprove={() => onApprove(submission.id)}
              onReject={() => onReject(submission.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ApprovalTable;
