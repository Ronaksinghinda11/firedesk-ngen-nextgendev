import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { approvalConsoleApi } from '@/services/api/approvalConsoleApi';
import type {
  ApprovalKPIs,
  ApprovalSubmission,
  ApprovalQueueResponse,
  ApprovalQueueFilters,
  FilterDropdownData,
  AlertsData,
} from '@/services/api/approvalConsoleApi';

import {
  ApprovalKPIStrip,
  ApprovalFilterBar,
  BulkApprovalBar,
  ApprovalTable,
  AlertPanel,
  ApprovalConfirmModal,
} from '@/components/ApprovalConsole';
import type { ConfirmAction } from '@/components/ApprovalConsole';

import { Button } from '@/components/ui/button';
import { RefreshCw, ClipboardCheck } from 'lucide-react';

const ServiceApprovalConsole: React.FC = () => {
  const queryClient = useQueryClient();

  // ─── Filter State ──────────────────────────────────────────────
  const [filters, setFilters] = useState<ApprovalQueueFilters>({});
  const [kpiFilter, setKPIFilter] = useState<string | null>(null);

  // ─── Selection State ───────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Modal State ───────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: ConfirmAction;
    ids: string[];
  }>({ open: false, action: 'approve', ids: [] });

  // ─── Refs ──────────────────────────────────────────────────────
  const tableRef = useRef<HTMLDivElement>(null);

  // ─── Compute effective filters (merge KPI filter + manual filters) ─
  const effectiveFilters = useMemo<ApprovalQueueFilters>(() => {
    const f = { ...filters };
    if (kpiFilter === 'high_risk') f.high_risk = true;
    else if (kpiFilter === 'compliance') f.compliance_impact = true;
    else if (kpiFilter === 'overdue') f.overdue = true;
    // 'total' and 'ai_suggestions' don't add filters
    return f;
  }, [filters, kpiFilter]);

  // ─── Data Queries ──────────────────────────────────────────────
  const {
    data: kpis,
    isLoading: kpisLoading,
  } = useQuery<ApprovalKPIs>({
    queryKey: ['approval-kpis'],
    queryFn: () => approvalConsoleApi.getKPIs(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const {
    data: queueData,
    isLoading: queueLoading,
    isFetching: queueFetching,
  } = useQuery<ApprovalQueueResponse>({
    queryKey: ['approval-queue', effectiveFilters],
    queryFn: () => approvalConsoleApi.getApprovalQueue(effectiveFilters),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  const { data: filterDropdownData } = useQuery<FilterDropdownData>({
    queryKey: ['approval-filter-data'],
    queryFn: () => approvalConsoleApi.getFilterDropdownData(),
    staleTime: 300_000,
  });

  const submissions = queueData?.submissions || [];
  const totalCount = queueData?.pagination?.total || 0;

  // ─── Derived Counts ────────────────────────────────────────────
  const lowRiskIds = useMemo(
    () => submissions.filter((s) => s.risk_level === 'low').map((s) => s.id),
    [submissions]
  );

  const filteredIds = useMemo(
    () => submissions.map((s) => s.id),
    [submissions]
  );

  // ─── Mutations ─────────────────────────────────────────────────
  const bulkApproveMutation = useMutation({
    mutationFn: ({ ids, remarks }: { ids: string[]; remarks?: string }) =>
      approvalConsoleApi.bulkApprove(ids, remarks),
    onSuccess: (result) => {
      const successCount = result.approved ?? result.approved_count ?? 0;
      toast.success(`${successCount} submission(s) approved successfully`);
      queryClient.invalidateQueries({ queryKey: ['approval-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      queryClient.invalidateQueries({ queryKey: ['approval-alerts'] });
      setSelectedIds([]);
      setExpandedId(null);
    },
    onError: (error: Error) => {
      toast.error(`Approval failed: ${error.message}`);
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: ({ ids, remarks }: { ids: string[]; remarks: string }) =>
      approvalConsoleApi.bulkReject(ids, remarks),
    onSuccess: (result) => {
      const successCount = result.rejected ?? result.rejected_count ?? 0;
      toast.success(`${successCount} submission(s) rejected`);
      queryClient.invalidateQueries({ queryKey: ['approval-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      queryClient.invalidateQueries({ queryKey: ['approval-alerts'] });
      setSelectedIds([]);
      setExpandedId(null);
    },
    onError: (error: Error) => {
      toast.error(`Rejection failed: ${error.message}`);
    },
  });

  // ─── Handlers ──────────────────────────────────────────────────
  const handleKPIClick = useCallback(
    (key: string) => {
      setKPIFilter((prev) => (prev === key ? null : key));
      setSelectedIds([]);
    },
    []
  );

  const handleFiltersChange = useCallback((newFilters: ApprovalQueueFilters) => {
    setFilters(newFilters);
    setSelectedIds([]);
  }, []);

  const handleSelect = useCallback(
    (id: string, checked: boolean) => {
      setSelectedIds((prev) =>
        checked ? [...prev, id] : prev.filter((x) => x !== id)
      );
    },
    []
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? filteredIds : []);
    },
    [filteredIds]
  );

  const handleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    []
  );

  const handleSort = useCallback(
    (column: string) => {
      setFilters((prev) => ({
        ...prev,
        sort_by: column,
        sort_order:
          prev.sort_by === column && prev.sort_order === 'asc' ? 'desc' : 'asc',
      }));
    },
    []
  );

  // Approve/Reject single or bulk
  const handleApprove = useCallback(
    (id: string) => {
      setConfirmModal({ open: true, action: 'approve', ids: [id] });
    },
    []
  );

  const handleReject = useCallback(
    (id: string) => {
      setConfirmModal({ open: true, action: 'reject', ids: [id] });
    },
    []
  );

  const handleBulkApprove = useCallback(
    (ids: string[]) => {
      setConfirmModal({ open: true, action: 'approve', ids });
    },
    []
  );

  const handleBulkApproveLowRisk = useCallback(() => {
    if (lowRiskIds.length > 0) {
      setConfirmModal({ open: true, action: 'approve', ids: lowRiskIds });
    }
  }, [lowRiskIds]);

  const handleBulkApproveFiltered = useCallback(() => {
    if (filteredIds.length > 0) {
      setConfirmModal({ open: true, action: 'approve', ids: filteredIds });
    }
  }, [filteredIds]);

  const handleBulkReject = useCallback(() => {
    if (selectedIds.length > 0) {
      setConfirmModal({ open: true, action: 'reject', ids: selectedIds });
    }
  }, [selectedIds]);

  const handleConfirm = useCallback(
    (remarks: string) => {
      if (confirmModal.action === 'approve') {
        bulkApproveMutation.mutate({ ids: confirmModal.ids, remarks: remarks || undefined });
      } else {
        bulkRejectMutation.mutate({ ids: confirmModal.ids, remarks });
      }
      setConfirmModal({ open: false, action: 'approve', ids: [] });
    },
    [confirmModal, bulkApproveMutation, bulkRejectMutation]
  );

  const handleCancelModal = useCallback(() => {
    setConfirmModal({ open: false, action: 'approve', ids: [] });
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['approval-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
    queryClient.invalidateQueries({ queryKey: ['approval-alerts'] });
    toast.info('Refreshing data...');
  }, [queryClient]);

  const handleScrollToSubmission = useCallback(
    (submissionId: string) => {
      setExpandedId(submissionId);
      // Attempt to scroll into view after a brief delay
      setTimeout(() => {
        const row = tableRef.current?.querySelector(
          `[data-submission-id="${submissionId}"]`
        );
        row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    },
    []
  );

  // ─── Keyboard Shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        setExpandedId(null);
        setSelectedIds([]);
      }
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey && selectedIds.length > 0) {
        e.preventDefault();
        handleBulkApprove(selectedIds);
      }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && selectedIds.length > 0) {
        e.preventDefault();
        handleBulkReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, handleBulkApprove, handleBulkReject]);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Service Approval Console</h1>
            <p className="text-xs text-muted-foreground">
              Review and approve service submissions
              {totalCount > 0 && ` · ${totalCount} pending`}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={handleRefresh}
          disabled={queueFetching}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${queueFetching ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="px-6 pt-4">
        <ApprovalKPIStrip
          kpis={kpis || null}
          loading={kpisLoading}
          onKPIClick={handleKPIClick}
          activeFilter={kpiFilter}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 px-6 pt-4 pb-6 overflow-hidden">
        {/* Left: Table Area */}
        <div className="flex-1 flex flex-col min-w-0 gap-3 overflow-auto" ref={tableRef}>
          {/* Filter Bar */}
          <ApprovalFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            dropdownData={filterDropdownData || null}
          />

          {/* Bulk Approval Bar */}
          <BulkApprovalBar
            totalRows={submissions.length}
            selectedIds={selectedIds}
            lowRiskCount={lowRiskIds.length}
            filteredCount={filteredIds.length}
            allSelected={
              submissions.length > 0 && selectedIds.length === submissions.length
            }
            onSelectAll={handleSelectAll}
            onBulkApprove={handleBulkApprove}
            onBulkApproveLowRisk={handleBulkApproveLowRisk}
            onBulkApproveFiltered={handleBulkApproveFiltered}
            onBulkReject={handleBulkReject}
          />

          {/* Approval Table */}
          <ApprovalTable
            submissions={submissions}
            selectedIds={selectedIds}
            expandedId={expandedId}
            onSelect={handleSelect}
            onExpand={handleExpand}
            onApprove={handleApprove}
            onReject={handleReject}
            sortBy={filters.sort_by}
            sortOrder={filters.sort_order as 'asc' | 'desc'}
            onSort={handleSort}
            loading={queueLoading}
          />

          {/* Pagination hint */}
          {submissions.length > 0 && totalCount > submissions.length && (
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">
                Showing {submissions.length} of {totalCount} submissions
              </p>
            </div>
          )}
        </div>

        {/* Right: Alert Panel */}
        <AlertPanel onScrollToSubmission={handleScrollToSubmission} />
      </div>

      {/* Confirm Modal */}
      <ApprovalConfirmModal
        open={confirmModal.open}
        action={confirmModal.action}
        count={confirmModal.ids.length}
        onConfirm={handleConfirm}
        onCancel={handleCancelModal}
        loading={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
      />

      {/* Keyboard shortcut hints */}
      <div className="fixed bottom-4 right-4 hidden lg:flex items-center gap-3 text-[10px] text-muted-foreground bg-background/80 backdrop-blur border rounded-lg px-3 py-1.5 shadow-sm">
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">A</kbd> Approve
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">R</kbd> Reject
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Esc</kbd> Collapse
        </span>
      </div>
    </div>
  );
};

export default ServiceApprovalConsole;
