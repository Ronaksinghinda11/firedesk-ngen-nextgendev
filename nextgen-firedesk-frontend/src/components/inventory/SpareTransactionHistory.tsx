/**
 * SpareTransactionHistory
 * Modal showing the full issue/return log for a spare.
 */
import React, { useEffect, useState } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, ClipboardList, RefreshCw, Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { inventoryApi, InventorySpare, SpareTransaction } from '@/services/api/inventoryApi';

interface Props {
  open: boolean;
  onClose: () => void;
  spare: InventorySpare | null;
}

const CONDITION_COLORS: Record<string, string> = {
  good:         'bg-emerald-100 text-emerald-700',
  damaged:      'bg-amber-100 text-amber-700',
  needs_repair: 'bg-red-100 text-red-700',
};

const CONDITION_LABELS: Record<string, string> = {
  good: 'Good', damaged: 'Damaged', needs_repair: 'Needs Repair',
};

export function SpareTransactionHistory({ open, onClose, spare }: Props) {
  const [transactions, setTransactions] = useState<SpareTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const load = async () => {
    if (!spare) return;
    setLoading(true);
    try {
      const res: any = await inventoryApi.getSpareTransactions(spare.id, { limit: 100 });
      setTransactions(res.transactions ?? res.data ?? []);
      setTotal(res.total ?? 0);
    } catch { setTransactions([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open && spare) load(); }, [open, spare?.id]);

  if (!open || !spare) return null;

  const totalIssued   = transactions.filter(t => t.transaction_type === 'issue').reduce((s, t) => s + parseFloat(String(t.quantity)), 0);
  const totalReturned = transactions.filter(t => t.transaction_type === 'return').reduce((s, t) => s + parseFloat(String(t.quantity)), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{spare.spare_name}</h2>
              <p className="text-xs text-muted-foreground">
                Movement Log · {total} transaction{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 divide-x border-b shrink-0">
          <div className="px-5 py-3 text-center">
            <p className="text-xs text-muted-foreground">Current Stock</p>
            <p className="text-lg font-bold text-slate-900">
              {parseFloat(String(spare.quantity)).toFixed(3)}
              <span className="text-xs font-normal text-muted-foreground ml-1">{spare.unit_of_measurement ?? 'units'}</span>
            </p>
          </div>
          <div className="px-5 py-3 text-center">
            <p className="text-xs text-muted-foreground">Total Issued</p>
            <p className="text-lg font-bold text-orange-600">
              {totalIssued.toFixed(3)}
              <span className="text-xs font-normal text-muted-foreground ml-1">{spare.unit_of_measurement ?? 'units'}</span>
            </p>
          </div>
          <div className="px-5 py-3 text-center">
            <p className="text-xs text-muted-foreground">Total Returned</p>
            <p className="text-lg font-bold text-blue-600">
              {totalReturned.toFixed(3)}
              <span className="text-xs font-normal text-muted-foreground ml-1">{spare.unit_of_measurement ?? 'units'}</span>
            </p>
          </div>
        </div>

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <Package2 className="h-10 w-10 opacity-20 mb-3" />
              <p className="text-sm font-medium">No transactions yet</p>
              <p className="text-xs mt-1">Issue or return this spare to see movements here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => {
                const isIssue = t.transaction_type === 'issue';
                return (
                  <div key={t.id} className={cn(
                    'flex items-start gap-4 p-4 rounded-xl border transition-colors',
                    isIssue ? 'bg-orange-50/50 border-orange-100' : 'bg-blue-50/50 border-blue-100'
                  )}>
                    {/* Icon */}
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      isIssue ? 'bg-orange-100' : 'bg-blue-100')}>
                      {isIssue
                        ? <ArrowUpRight className="h-4 w-4 text-orange-600" />
                        : <ArrowDownLeft className="h-4 w-4 text-blue-600" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn('text-xs font-semibold capitalize',
                          isIssue ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')}>
                          {isIssue ? '▲ Issue OUT' : '▼ Return IN'}
                        </Badge>
                        <span className="text-sm font-bold text-slate-900">
                          {parseFloat(String(t.quantity)).toFixed(3)} {spare.unit_of_measurement ?? 'units'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t.quantity_before} → {t.quantity_after}
                        </span>
                        {t.return_condition && (
                          <Badge className={cn('text-[10px]', CONDITION_COLORS[t.return_condition] ?? '')}>
                            {CONDITION_LABELS[t.return_condition] ?? t.return_condition}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                        {isIssue && t.issued_to    && <p><span className="text-muted-foreground">Issued to:</span> {t.issued_to}</p>}
                        {isIssue && t.purpose       && <p><span className="text-muted-foreground">Purpose:</span> {t.purpose}</p>}
                        {!isIssue && t.received_from && <p><span className="text-muted-foreground">Received from:</span> {t.received_from}</p>}
                        {t.remarks                 && <p><span className="text-muted-foreground">Remarks:</span> {t.remarks}</p>}
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-xs text-muted-foreground">
                      <p className="font-medium text-slate-700">{new Date(t.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      {t.created_by_user && <p className="mt-0.5">{t.created_by_user.name}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
