/**
 * SpareTransactionForm
 * Slide-over form for issuing (OUT) or returning (IN) an inventory spare.
 *
 * mode='issue'  → shows issued_to + purpose fields   (works for consumable & non-consumable)
 * mode='return' → shows received_from + condition    (non-consumable only — enforced server-side too)
 */
import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { inventoryApi, InventorySpare, SpareTransactionPayload, SpareReturnPayload } from '@/services/api/inventoryApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode: 'issue' | 'return';
  spare: InventorySpare | null;
}

const RETURN_CONDITIONS = [
  { value: 'good',         label: 'Good',         desc: 'No damage, fully functional',        color: 'text-emerald-600' },
  { value: 'damaged',      label: 'Damaged',       desc: 'Some damage but still usable',       color: 'text-amber-600' },
  { value: 'needs_repair', label: 'Needs Repair',  desc: 'Requires maintenance before reuse',  color: 'text-red-600' },
];

export function SpareTransactionForm({ open, onClose, onSaved, mode, spare }: Props) {
  const [quantity, setQuantity] = useState('');
  const [issued_to, setIssuedTo] = useState('');
  const [purpose, setPurpose] = useState('');
  const [received_from, setReceivedFrom] = useState('');
  const [return_condition, setReturnCondition] = useState<'good' | 'damaged' | 'needs_repair'>('good');
  const [linked_asset_id, setLinkedAssetId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [transaction_date, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setQuantity('');
    setIssuedTo('');
    setPurpose('');
    setReceivedFrom('');
    setReturnCondition('good');
    setLinkedAssetId('');
    setRemarks('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spare) return;

    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      toast({ title: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }

    if (mode === 'issue' && qty > parseFloat(String(spare.quantity))) {
      toast({
        title: 'Insufficient stock',
        description: `Only ${spare.quantity} ${spare.unit_of_measurement || 'units'} available`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (mode === 'issue') {
        const payload: SpareTransactionPayload = {
          quantity: qty,
          issued_to: issued_to.trim() || undefined,
          purpose: purpose.trim() || undefined,
          linked_asset_id: linked_asset_id.trim() || undefined,
          remarks: remarks.trim() || undefined,
          transaction_date,
        };
        await inventoryApi.issueSpare(spare.id, payload);
        toast({ title: `Issued ${qty} ${spare.unit_of_measurement || 'unit(s)'} of "${spare.spare_name}"` });
      } else {
        const payload: SpareReturnPayload = {
          quantity: qty,
          received_from: received_from.trim() || undefined,
          return_condition,
          linked_asset_id: linked_asset_id.trim() || undefined,
          remarks: remarks.trim() || undefined,
          transaction_date,
        };
        await inventoryApi.returnSpare(spare.id, payload);
        toast({ title: `Returned ${qty} ${spare.unit_of_measurement || 'unit(s)'} of "${spare.spare_name}"` });
      }
      onSaved();
      handleClose();
    } catch (err: any) {
      toast({
        title: mode === 'issue' ? 'Issue failed' : 'Return failed',
        description: err?.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open || !spare) return null;

  const isIssue = mode === 'issue';
  const currentStock = parseFloat(String(spare.quantity));

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={handleClose} />

      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center',
              isIssue ? 'bg-orange-100' : 'bg-blue-100')}>
              {isIssue
                ? <ArrowUpRight className="h-5 w-5 text-orange-600" />
                : <ArrowDownLeft className="h-5 w-5 text-blue-600" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inventory · Spares</p>
              <h2 className="text-base font-semibold">
                {isIssue ? 'Issue Spare' : 'Return Spare'}
              </h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-5">
          {/* Spare info card */}
          <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 truncate">{spare.spare_name}</p>
              <Badge className={cn('text-xs capitalize shrink-0 ml-2',
                spare.spare_type === 'consumable' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')}>
                {spare.spare_type}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Plant: {spare.plant?.plant_name ?? '—'}</span>
              <span className={cn('font-semibold', currentStock === 0 ? 'text-red-500' : currentStock < 5 ? 'text-amber-500' : 'text-emerald-600')}>
                Stock: {currentStock} {spare.unit_of_measurement ?? 'units'}
              </span>
            </div>
            {isIssue && currentStock === 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Out of stock — cannot issue
              </div>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isIssue ? 'Issue Date' : 'Return Date'} <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={transaction_date}
              onChange={e => setTransactionDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Quantity ({spare.unit_of_measurement ?? 'units'}) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              step="0.001"
              min="0.001"
              max={isIssue ? currentStock : undefined}
              className="h-9 text-sm"
              placeholder={`Enter quantity (max: ${isIssue ? currentStock : '∞'})`}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
            {isIssue && quantity && !isNaN(parseFloat(quantity)) && parseFloat(quantity) <= currentStock && (
              <p className="text-xs text-emerald-600">
                After issue: {(currentStock - parseFloat(quantity)).toFixed(3)} {spare.unit_of_measurement ?? 'units'} remaining
              </p>
            )}
            {mode === 'return' && quantity && !isNaN(parseFloat(quantity)) && (
              <p className="text-xs text-blue-600">
                After return: {(currentStock + parseFloat(quantity)).toFixed(3)} {spare.unit_of_measurement ?? 'units'} in stock
              </p>
            )}
          </div>

          {/* Issue-specific fields */}
          {isIssue && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Issued To</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="Name / department receiving the spare"
                  value={issued_to}
                  onChange={e => setIssuedTo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Purpose / Reason</Label>
                <Textarea
                  className="text-sm resize-none"
                  rows={2}
                  placeholder="Why is this spare being issued? (maintenance, replacement, etc.)"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Return-specific fields */}
          {!isIssue && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Received From</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="Name / department returning the spare"
                  value={received_from}
                  onChange={e => setReceivedFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Return Condition <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {RETURN_CONDITIONS.map(rc => (
                    <button
                      key={rc.value}
                      type="button"
                      onClick={() => setReturnCondition(rc.value as typeof return_condition)}
                      className={cn(
                        'flex flex-col items-center p-3 rounded-lg border-2 text-center transition-all',
                        return_condition === rc.value
                          ? 'border-current bg-slate-50 ' + rc.color
                          : 'border-slate-200 text-slate-400 hover:border-slate-300'
                      )}
                    >
                      <span className="text-xs font-semibold">{rc.label}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{rc.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Common: Linked Asset ID (optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Linked Asset ID <span className="text-[10px]">(optional)</span>
            </Label>
            <Input
              className="h-9 text-sm"
              placeholder="Asset UUID this spare is used with"
              value={linked_asset_id}
              onChange={e => setLinkedAssetId(e.target.value)}
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Remarks</Label>
            <Textarea
              className="text-sm resize-none"
              rows={2}
              placeholder="Any additional notes…"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2 border-t">
            <Button
              type="submit"
              disabled={saving || (isIssue && currentStock === 0)}
              className={cn('flex-1 text-white',
                isIssue ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700')}
            >
              {isIssue
                ? <ArrowUpRight className="h-4 w-4 mr-2" />
                : <ArrowDownLeft className="h-4 w-4 mr-2" />}
              {saving ? 'Saving…' : isIssue ? 'Confirm Issue' : 'Confirm Return'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
