import React, { useState, useEffect } from "react";
import { X, Save, Wrench, Package2, BoxIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { inventoryApi, InventorySpare } from "@/services/api/inventoryApi";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MATERIAL_FORMS = ["Solid", "Liquid", "Powder", "Gas"];
const DEFAULT_UNITS = ["Piece", "Kg", "Litre", "Metre", "Box", "Set"];

// Sentinel value — means "General Spare / no product link"
const GENERAL_SPARE_VALUE = "__GENERAL__";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductOption {
  id: string;
  product_name: string;
  product_code: string;
  category_id: string;
  category_name: string | null;
}

interface FormState {
  plant_id: string;
  spare_name: string;
  spare_type: "consumable" | "non-consumable";
  material_form: string;
  material_form_custom: string;
  unit_of_measurement: string;
  unit_custom: string;
  linked_product_id: string; // '' means nothing chosen yet, GENERAL_SPARE_VALUE means general
  quantity: string;
  unit_price: string;
  notes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editItem?: InventorySpare | null;
  plants: Array<{ id: string; plant_name: string }>;
  /** @deprecated — products are now fetched internally. Kept for backward compat. */
  products?: Array<{ id: string; product_name: string }>;
  inline?: boolean;
}

const INITIAL: FormState = {
  plant_id: "",
  spare_name: "",
  spare_type: "consumable",
  material_form: "",
  material_form_custom: "",
  unit_of_measurement: "",
  unit_custom: "",
  linked_product_id: "",
  quantity: "0",
  unit_price: "",
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InventorySpareForm({
  open,
  onClose,
  onSaved,
  editItem,
  plants,
  inline,
}: Props) {
  const [form, setForm] = useState<FormState>({ ...INITIAL });
  const [saving, setSaving] = useState(false);

  // All products fetched from the API (not plant-filtered)
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Dynamic custom dropdown values stored in the DB
  const [customMaterialForms, setCustomMaterialForms] = useState<string[]>([]);
  const [customUnits, setCustomUnits] = useState<string[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Derived state ────────────────────────────────────────────────────────────

  // Products grouped by category name for the Select dropdown
  const groupedProducts = React.useMemo(() => {
    const map = new Map<string, ProductOption[]>();
    allProducts.forEach((p) => {
      const key = p.category_name || "Uncategorised";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [allProducts]);

  const allMaterialForms = [
    ...DEFAULT_MATERIAL_FORMS,
    ...customMaterialForms.filter((v) => !DEFAULT_MATERIAL_FORMS.includes(v)),
  ];

  const allUnits = [
    ...DEFAULT_UNITS,
    ...customUnits.filter((v) => !DEFAULT_UNITS.includes(v)),
  ];

  const totalPrice =
    form.quantity && form.unit_price
      ? (parseFloat(form.quantity) * parseFloat(form.unit_price)).toFixed(2)
      : null;

  // ── Data loading ─────────────────────────────────────────────────────────────

  // Fetch ALL products once (independent of plant selection)
  useEffect(() => {
    if (!open) return;
    setProductsLoading(true);
    inventoryApi
      .getAllProducts()
      .then((res: any) => {
        const data: ProductOption[] = res?.data ?? res ?? [];
        setAllProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => setAllProducts([]))
      .finally(() => setProductsLoading(false));
  }, [open]);

  // Fetch custom dynamic values once per open
  useEffect(() => {
    if (!open) return;
    inventoryApi
      .getDynamicValues("material_form")
      .then((res: any) => {
        const vals: string[] = res?.data ?? res ?? [];
        setCustomMaterialForms(Array.isArray(vals) ? vals : []);
      })
      .catch(() => {});

    inventoryApi
      .getDynamicValues("unit_of_measurement")
      .then((res: any) => {
        const vals: string[] = res?.data ?? res ?? [];
        setCustomUnits(Array.isArray(vals) ? vals : []);
      })
      .catch(() => {});
  }, [open]);

  // Populate form when editing an existing spare
  useEffect(() => {
    if (!open) return;

    if (editItem) {
      const isMaterialCustom =
        !!editItem.material_form &&
        !DEFAULT_MATERIAL_FORMS.includes(editItem.material_form);
      const isUnitCustom =
        !!editItem.unit_of_measurement &&
        !DEFAULT_UNITS.includes(editItem.unit_of_measurement);

      // If linked_product_id is null/empty → treat as General Spare
      const linkedProductValue = editItem.linked_product_id
        ? editItem.linked_product_id
        : GENERAL_SPARE_VALUE;

      setForm({
        plant_id: editItem.plant_id || "",
        spare_name: editItem.spare_name || "",
        spare_type: editItem.spare_type || "consumable",
        material_form: isMaterialCustom
          ? "custom"
          : editItem.material_form || "",
        material_form_custom: isMaterialCustom
          ? editItem.material_form || ""
          : "",
        unit_of_measurement: isUnitCustom
          ? "custom"
          : editItem.unit_of_measurement || "",
        unit_custom: isUnitCustom ? editItem.unit_of_measurement || "" : "",
        linked_product_id: linkedProductValue,
        quantity: editItem.quantity?.toString() || "0",
        unit_price: editItem.unit_price?.toString() || "",
        notes: editItem.notes || "",
      });
    } else {
      setForm({ ...INITIAL });
    }
  }, [editItem, open]);

  // ── Submission ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.plant_id) {
      toast({
        title: "Validation Error",
        description: "Plant is required",
        variant: "destructive",
      });
      return;
    }
    if (!form.spare_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Spare Name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Resolve final material_form value
      const material_form =
        form.material_form === "custom"
          ? form.material_form_custom.trim()
          : form.material_form;

      // Resolve final unit_of_measurement value
      const unit_of_measurement =
        form.unit_of_measurement === "custom"
          ? form.unit_custom.trim()
          : form.unit_of_measurement;

      // Persist any new custom values to the dynamic master table
      if (form.material_form === "custom" && form.material_form_custom.trim()) {
        await inventoryApi
          .createDynamicValue("material_form", form.material_form_custom.trim())
          .catch(() => {}); // Non-fatal
      }
      if (form.unit_of_measurement === "custom" && form.unit_custom.trim()) {
        await inventoryApi
          .createDynamicValue("unit_of_measurement", form.unit_custom.trim())
          .catch(() => {}); // Non-fatal
      }

      // GENERAL_SPARE_VALUE sentinel → null in the DB
      const linked_product_id =
        form.linked_product_id === GENERAL_SPARE_VALUE ||
        form.linked_product_id === ""
          ? undefined
          : form.linked_product_id;

      const payload: Partial<InventorySpare> = {
        plant_id: form.plant_id,
        spare_name: form.spare_name.trim(),
        spare_type: form.spare_type,
        material_form: material_form || undefined,
        unit_of_measurement: unit_of_measurement || undefined,
        linked_product_id,
        quantity: parseFloat(form.quantity) || 0,
        unit_price: form.unit_price ? parseFloat(form.unit_price) : undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editItem) {
        await inventoryApi.updateSpare(editItem.id, payload);
        toast({ title: "Spare updated successfully" });
      } else {
        await inventoryApi.createSpare(payload);
        toast({ title: "Spare added to inventory" });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to save spare",
        variant: "destructive",
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
      <div className={inline ? "w-full bg-white h-full overflow-y-auto flex flex-col" : "w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col"}>
        {/* ── Sticky header ────────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex flex-col md:flex-row md:items-center justify-between z-10 gap-3 shadow-sm">
          {inline ? (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="cursor-pointer hover:text-gray-900 transition-colors" onClick={onClose}>Inventory</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-semibold text-gray-900">{editItem ? "Edit Spare" : "Add New Spare"}</span>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground">Inventory › Spares</p>
              <h2 className="text-lg font-semibold">
                {editItem ? "Edit Spare" : "Add New Spare"}
              </h2>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
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
              {saving ? "Saving…" : editItem ? "Update Spare" : "Save Spare"}
            </Button>
          </div>
        </div>

        {/* ── Form body ────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className={inline ? "flex-1 p-6 space-y-5 max-w-4xl mx-auto w-full" : "flex-1 p-6 space-y-5"}>
          {/* Plant */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Plant <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.plant_id}
              onValueChange={(v) => set("plant_id", v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {plants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.plant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Spare Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Spare Name <span className="text-red-500">*</span>
            </Label>
            <Input
              className="h-9 text-sm"
              placeholder="Enter spare part name…"
              value={form.spare_name}
              onChange={(e) => set("spare_name", e.target.value)}
            />
          </div>

          {/* Type toggle — Consumable / Non-consumable */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["consumable", "non-consumable"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("spare_type", t)}
                  className={cn(
                    "flex flex-col items-center justify-center py-4 rounded-lg border-2 transition-all",
                    form.spare_type === t
                      ? "border-orange-500 bg-orange-50 text-orange-600"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                  )}
                >
                  {t === "consumable" ? (
                    <Wrench className="h-5 w-5 mb-1" />
                  ) : (
                    <Package2 className="h-5 w-5 mb-1" />
                  )}
                  <span className="text-sm font-semibold capitalize">{t}</span>
                  <span className="text-xs text-muted-foreground">
                    {t === "consumable" ? "Single-use items" : "Reusable parts"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Material Form */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Material Form</Label>
            <Select
              value={form.material_form}
              onValueChange={(v) => {
                set("material_form", v);
                if (v !== "custom") set("material_form_custom", "");
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select physical form of the spare" />
              </SelectTrigger>
              <SelectContent>
                {allMaterialForms.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
                <SelectItem value="custom">+ Add Custom…</SelectItem>
              </SelectContent>
            </Select>
            {form.material_form === "custom" && (
              <Input
                className="h-9 text-sm mt-2"
                placeholder="Enter custom material form…"
                value={form.material_form_custom}
                onChange={(e) => set("material_form_custom", e.target.value)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Select the physical form of the spare part
            </p>
          </div>

          {/* Unit of Measurement */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Unit of Measurement</Label>
            <Select
              value={form.unit_of_measurement}
              onValueChange={(v) => {
                set("unit_of_measurement", v);
                if (v !== "custom") set("unit_custom", "");
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {allUnits.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
                <SelectItem value="custom">+ Add Custom…</SelectItem>
              </SelectContent>
            </Select>
            {form.unit_of_measurement === "custom" && (
              <Input
                className="h-9 text-sm mt-2"
                placeholder="Enter custom unit…"
                value={form.unit_custom}
                onChange={(e) => set("unit_custom", e.target.value)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Measured in pieces, kilograms, litres, etc.
            </p>
          </div>

          {/* ── Linked Product ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Linked Product (Optional)
            </Label>
            <Select
              value={form.linked_product_id || GENERAL_SPARE_VALUE}
              onValueChange={(v) => set("linked_product_id", v)}
              disabled={productsLoading}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue
                  placeholder={
                    productsLoading
                      ? "Loading products…"
                      : "Select linked product"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {/* General Spare — always first */}
                <SelectGroup>
                  <SelectItem value={GENERAL_SPARE_VALUE}>
                    <span className="flex items-center gap-2">
                      <BoxIcon className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium text-slate-600">
                        General Spare
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        — not specific to any product
                      </span>
                    </span>
                  </SelectItem>
                </SelectGroup>

                {/* Products grouped by category */}
                {productsLoading ? (
                  <SelectItem value="__loading__" disabled>
                    Loading products…
                  </SelectItem>
                ) : groupedProducts.size === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    No products found
                  </SelectItem>
                ) : (
                  Array.from(groupedProducts.entries()).map(
                    ([categoryName, prods]) => (
                      <SelectGroup key={categoryName}>
                        <SelectLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-1">
                          {categoryName}
                        </SelectLabel>
                        {prods.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2">
                              <Package2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{p.product_name}</span>
                              {p.product_code && (
                                <span className="text-xs text-muted-foreground">
                                  ({p.product_code})
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ),
                  )
                )}
              </SelectContent>
            </Select>

            {/* Helper text changes based on selection */}
            <p className="text-xs text-muted-foreground">
              {form.linked_product_id === GENERAL_SPARE_VALUE ||
              form.linked_product_id === ""
                ? "This spare is not tied to a specific product type"
                : `Linked to product: ${allProducts.find((p) => p.id === form.linked_product_id)?.product_name ?? "—"}`}
            </p>
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quantity</Label>
              <Input
                type="number"
                step="0.001"
                min={0}
                className="h-9 text-sm"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Supports decimal values (e.g., 10.5)
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cost per Unit (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                className="h-9 text-sm"
                placeholder="0.00"
                value={form.unit_price}
                onChange={(e) => set("unit_price", e.target.value)}
              />
            </div>
          </div>

          {/* Total price — auto-calculated, read-only */}
          {totalPrice !== null && (
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <span className="text-sm text-slate-600">Total Value</span>
              <span className="text-base font-bold text-emerald-700">
                ₹{" "}
                {parseFloat(totalPrice).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea
              className="text-sm resize-none"
              rows={2}
              placeholder="Any additional notes…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {/* Bottom save button (convenience — mirrors the sticky header) */}
          <div className="flex gap-3 pt-2 border-t">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving…" : editItem ? "Update Spare" : "Save Spare"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
