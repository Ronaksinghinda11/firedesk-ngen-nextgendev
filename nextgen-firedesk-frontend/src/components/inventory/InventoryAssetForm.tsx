import React, { useState, useEffect } from 'react';
import { X, Save, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { inventoryApi, DropdownData, InventoryAsset } from '@/services/api/inventoryApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editItem?: InventoryAsset | null;
  plants: Array<{ id: string; plant_name: string }>;
  inline?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  plant_id: '',
  category_id: '',
  product_id: '',
  type: '',
  sub_type: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  manufacturing_date: '',
  warranty_end_date: '',
  lifespan_years: '',
  quantity: '1',
  unit_price: '',
  notes: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryAssetForm({ open, onClose, onSaved, editItem, plants, inline }: Props) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [dropdownData, setDropdownData] = useState<DropdownData | null>(null);
  const [loadingDropdown, setLoadingDropdown] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [editData, setEditData] = useState<InventoryAsset | null>(null);

  // Derived state
  const filteredProducts = React.useMemo(() => {
    if (!dropdownData || !form.category_id) return [];
    const filtered = dropdownData.products.filter(p => p.category_id === form.category_id);
    console.log('[InventoryForm] filteredProducts:', {
      category_id: form.category_id,
      total_products: dropdownData.products.length,
      filtered_count: filtered.length,
      editData: editData?.product_id,
      current: form.product_id,
    });
    return filtered;
  }, [dropdownData, form.category_id]);

  const availableTypes = React.useMemo(() => {
    if (!form.product_id || !filteredProducts.length) return [];
    const product = filteredProducts.find(p => p.id === form.product_id);
    const types = product?.variants?.map(v => v.type) ?? [];
    console.log('[InventoryForm] availableTypes:', {
      product_id: form.product_id,
      types_count: types.length,
      editData: editData?.type,
      current: form.type,
    });
    return types;
  }, [form.product_id, filteredProducts]);

  const availableSubtypes = React.useMemo(() => {
    if (!form.type || !filteredProducts.length) return [];
    const product = filteredProducts.find(p => p.id === form.product_id);
    const variant = product?.variants?.find(v => v.type === form.type);
    const subtypes = variant?.subtypes ?? [];
    console.log('[InventoryForm] availableSubtypes:', {
      type: form.type,
      subtypes_count: subtypes.length,
      editData: editData?.sub_type,
      current: form.sub_type,
    });
    return subtypes;
  }, [form.type, form.product_id, filteredProducts]);

  const totalPrice = React.useMemo(() => {
    const qty = parseFloat(form.quantity);
    const price = parseFloat(form.unit_price);
    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
      return (qty * price).toFixed(2);
    }
    return null;
  }, [form.quantity, form.unit_price]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Load dropdown data when plant changes
  useEffect(() => {
    if (!form.plant_id) {
      setDropdownData(null);
      return;
    }
    setLoadingDropdown(true);
    inventoryApi
      .getDropdownData(form.plant_id)
      .then((res: any) => {
        const data = res?.data ?? res;
        if (data) setDropdownData(data as DropdownData);
      })
      .catch(() => {})
      .finally(() => setLoadingDropdown(false));
  }, [form.plant_id]);

  // Reset downstream fields when category changes
  useEffect(() => {
    // Don't reset when initially loading edit data
    if (isInitialLoad) return;
    setForm(prev => ({ ...prev, product_id: '', type: '', sub_type: '' }));
  }, [form.category_id, isInitialLoad]);

  // Reset type + subtype when product changes
  useEffect(() => {
    // Don't reset when initially loading edit data
    if (isInitialLoad) return;
    setForm(prev => ({ ...prev, type: '', sub_type: '' }));
  }, [form.product_id, isInitialLoad]);

  // Reset subtype when type changes
  useEffect(() => {
    // Don't reset when initially loading edit data
    if (isInitialLoad) return;
    setForm(prev => ({ ...prev, sub_type: '' }));
  }, [form.type, isInitialLoad]);

  // Populate form when editing (or reset when opening for creation)
  useEffect(() => {
    if (!open) return;
    
    if (editItem) {
      // Store edit data separately to preserve it during dropdown loading
      setEditData(editItem);
      setIsInitialLoad(true);
      
      // Set form with all data at once
      setForm({
        plant_id: editItem.plant_id ?? '',
        category_id: editItem.category_id ?? '',
        product_id: editItem.product_id ?? '',
        type: editItem.type ?? '',
        sub_type: editItem.sub_type ?? '',
        manufacturer: editItem.manufacturer ?? '',
        model: editItem.model ?? '',
        serial_number: editItem.serial_number ?? '',
        manufacturing_date: editItem.manufacturing_date ?? '',
        warranty_end_date: editItem.warranty_end_date ?? '',
        lifespan_years: editItem.lifespan_years?.toString() ?? '',
        quantity: editItem.quantity?.toString() ?? '1',
        unit_price: editItem.unit_price?.toString() ?? '',
        notes: editItem.notes ?? '',
      });
    } else {
      setEditData(null);
      setIsInitialLoad(true);
      setForm({ ...INITIAL_FORM });
      setTimeout(() => setIsInitialLoad(false), 100);
    }
  }, [editItem, open]);

  // After dropdown data loads for edit mode, ensure values are preserved and disable cascading resets
  useEffect(() => {
    if (!editData || !dropdownData) return;
    
    // Re-apply edit data after dropdown loads to ensure values are preserved
    setForm(prev => ({
      ...prev,
      category_id: editData.category_id ?? prev.category_id,
      product_id: editData.product_id ?? prev.product_id,
      type: editData.type ?? prev.type,
      sub_type: editData.sub_type ?? prev.sub_type,
    }));
    
    // Wait a bit to ensure the values are set, then allow user to make changes
    setTimeout(() => setIsInitialLoad(false), 200);
  }, [dropdownData, editData]);

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.plant_id || !form.category_id || !form.product_id) {
      toast({
        title: 'Validation Error',
        description: 'Plant, Category, and Product are required.',
        variant: 'destructive',
      });
      return;
    }

    // ✅ NEW VALIDATION: Ensure Type and Manufacturing Date are provided
    if (!form.type) {
      toast({
        title: 'Validation Error',
        description: 'Type is required for all inventory assets.',
        variant: 'destructive',
      });
      return;
    }

    if (!form.manufacturing_date) {
      toast({
        title: 'Validation Error',
        description: 'Manufacturing Date is required for all inventory assets.',
        variant: 'destructive',
      });
      return;
    }

    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty < 1) {
      toast({
        title: 'Validation Error',
        description: 'Quantity must be at least 1.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<InventoryAsset> = {
        plant_id: form.plant_id,
        category_id: form.category_id,
        product_id: form.product_id,
        type: form.type || undefined,
        sub_type: form.sub_type || undefined,
        manufacturer: form.manufacturer || undefined,
        model: form.model || undefined,
        serial_number: form.serial_number || undefined,
        manufacturing_date: form.manufacturing_date || undefined,
        warranty_end_date: form.warranty_end_date || undefined,
        lifespan_years: form.lifespan_years ? parseInt(form.lifespan_years, 10) : undefined,
        quantity: qty,
        unit_price: form.unit_price ? parseFloat(form.unit_price) : undefined,
        notes: form.notes || undefined,
      };

      if (editItem) {
        await inventoryApi.updateAsset(editItem.id, payload);
        toast({ title: 'Asset updated successfully' });
      } else {
        await inventoryApi.createAsset(payload);
        toast({ title: 'Asset added to inventory' });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message ?? 'Failed to save asset',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div className={inline ? "flex w-full h-full flex-col bg-slate-50/50" : "fixed inset-0 z-50 flex"}>
      {/* Backdrop */}
      {!inline && <div className="flex-1 bg-black/40" onClick={onClose} />}

      {/* Slide-over panel or Full Page */}
      <div className={inline ? "w-full bg-white h-full overflow-y-auto flex flex-col" : "w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col"}>

        {/* ── Header ── */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 shadow-sm">
          {inline ? (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="cursor-pointer hover:text-gray-900 transition-colors" onClick={onClose}>Inventory</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-semibold text-gray-900">{editItem ? 'Edit Asset' : 'Add New Asset'}</span>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground">Inventory</p>
              <h2 className="text-lg font-semibold">
                {editItem ? 'Edit Asset' : 'Add New Asset'}
              </h2>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving…' : editItem ? 'Update Asset' : 'Save Asset'}
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className={inline ? "flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full" : "flex-1 p-6 space-y-6"}>

          {/* Asset Classification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Asset Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">

                {/* Plant */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Plant <span className="text-red-500">*</span>
                  </Label>
                  <Select value={form.plant_id} onValueChange={v => set('plant_id', v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.plant_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.category_id || undefined}
                    onValueChange={v => set('category_id', v)}
                    disabled={!form.plant_id || loadingDropdown}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue
                        placeholder={
                          loadingDropdown
                            ? 'Loading…'
                            : form.plant_id
                            ? 'Select category'
                            : 'Select plant first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdownData?.categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Product <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.product_id || undefined}
                    onValueChange={v => set('product_id', v)}
                    disabled={!form.category_id || filteredProducts.length === 0}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue
                        placeholder={
                          form.category_id
                            ? filteredProducts.length === 0
                              ? 'No products in category'
                              : 'Select product'
                            : 'Select category first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.product_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.type || undefined}
                    onValueChange={v => set('type', v)}
                    disabled={availableTypes.length === 0}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue
                        placeholder={
                          availableTypes.length > 0
                            ? 'Select type'
                            : 'No types available'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map(t => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub Type – full width */}
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-medium">Sub Type</Label>
                  <Select
                    value={form.sub_type || undefined}
                    onValueChange={v => set('sub_type', v)}
                    disabled={availableSubtypes.length === 0}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue
                        placeholder={
                          availableSubtypes.length > 0
                            ? 'Select sub type'
                            : 'No sub types available for this type'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubtypes.map(s => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Manufacturer Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Manufacturer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Manufacturer</Label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="e.g. Minimax"
                    value={form.manufacturer}
                    onChange={e => set('manufacturer', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Model No.</Label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="e.g. XYZ-1000"
                    value={form.model}
                    onChange={e => set('model', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Serial / Part No.</Label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="e.g. SN12345"
                    value={form.serial_number}
                    onChange={e => set('serial_number', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Manufacturing Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={form.manufacturing_date}
                    onChange={e => set('manufacturing_date', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Warranty End Date</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={form.warranty_end_date}
                    onChange={e => set('warranty_end_date', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Lifespan (Years)</Label>
                  <Input
                    type="number"
                    className="h-9 text-sm"
                    placeholder="e.g. 5"
                    min={0}
                    value={form.lifespan_years}
                    onChange={e => set('lifespan_years', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quantity & Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Quantity &amp; Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    className="h-9 text-sm"
                    min={1}
                    value={form.quantity}
                    onChange={e => set('quantity', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Unit Price (₹)</Label>
                  <Input
                    type="number"
                    className="h-9 text-sm"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={form.unit_price}
                    onChange={e => set('unit_price', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Total Price (₹)</Label>
                  <div className="h-9 px-3 flex items-center text-sm bg-muted rounded-md font-medium text-emerald-600">
                    {totalPrice != null
                      ? `₹ ${parseFloat(totalPrice).toLocaleString('en-IN')}`
                      : '—'}
                  </div>
                </div>
              </div>

              {totalPrice != null && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Inventory Value</span>
                  <span className="text-base font-semibold text-emerald-700">
                    ₹ {parseFloat(totalPrice).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea
              className="text-sm resize-none"
              rows={3}
              placeholder="Any additional notes about this asset…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {/* Bottom padding so last field isn't hidden behind sticky header on short screens */}
          <div className="h-4" />
        </form>
      </div>
    </div>
  );
}
