import { api } from "@/lib/api";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface InventoryAsset {
  id: string;
  asset_code?: string;
  plant_id: string;
  category_id: string;
  product_id: string;
  type?: string;
  sub_type?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  manufacturing_date?: string;
  warranty_end_date?: string;
  lifespan_years?: number;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  documents?: string[];
  status: "available" | "installed" | "reserved";
  notes?: string;
  plant?: { id: string; plant_name: string };
  category?: { id: string; category_name: string };
  product?: { id: string; product_name: string };
  creator?: { id: string; name: string };
  created_at: string;
}

export interface InventorySpare {
  id: string;
  plant_id: string;
  spare_name: string;
  spare_type: "consumable" | "non-consumable";
  material_form?: string;
  unit_of_measurement?: string;
  linked_product_id?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  notes?: string;
  plant?: { id: string; plant_name: string };
  linked_product?: { id: string; product_name: string };
  creator?: { id: string; name: string };
  created_at: string;
}

export interface DropdownData {
  categories: Array<{
    id: string;
    category_name: string;
    category_code: string;
  }>;
  products: Array<{
    id: string;
    product_name: string;
    product_code: string;
    category_id: string;
    variants: Array<{ type: string; subtypes: string[] }>;
  }>;
  material_forms: string[];
  units: string[];
}

export interface SpareTransactionPayload {
  quantity: number;
  issued_to?: string;
  purpose?: string;
  linked_asset_id?: string;
  linked_ticket_id?: string;
  remarks?: string;
  transaction_date: string; // YYYY-MM-DD
}

export interface SpareReturnPayload {
  quantity: number;
  received_from?: string;
  return_condition: "good" | "damaged" | "needs_repair";
  linked_asset_id?: string;
  remarks?: string;
  transaction_date: string;
}

export interface SpareTransaction {
  id: string;
  spare_id: string;
  transaction_type: "issue" | "return";
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  issued_to?: string;
  purpose?: string;
  received_from?: string;
  return_condition?: "good" | "damaged" | "needs_repair";
  linked_asset_id?: string;
  linked_ticket_id?: string;
  remarks?: string;
  transaction_date: string;
  created_by_user?: { id: string; name: string; email: string };
  created_at: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const inventoryApi = {
  // ── Assets ──────────────────────────────────────────────────────────────────

  getAssets: (params?: Record<string, any>) =>
    api.get("/inventory/assets", { params }),

  getAssetGroups: (params?: Record<string, any>) =>
    api.get("/inventory/assets/groups", { params }),

  createAsset: (data: Partial<InventoryAsset>) =>
    api.post("/inventory/assets", data),

  updateAsset: (id: string, data: Partial<InventoryAsset>) =>
    api.put(`/inventory/assets/${id}`, data),

  deleteAsset: (id: string) => api.delete(`/inventory/assets/${id}`),

  moveToAssets: (id: string, data: any) =>
    api.post(`/inventory/move-to-assets/${id}`, data),

  // ── Spares ──────────────────────────────────────────────────────────────────

  getSpares: (params?: Record<string, any>) =>
    api.get("/inventory/spares", { params }),

  createSpare: (data: Partial<InventorySpare>) =>
    api.post("/inventory/spares", data),

  updateSpare: (id: string, data: Partial<InventorySpare>) =>
    api.put(`/inventory/spares/${id}`, data),

  deleteSpare: (id: string) => api.delete(`/inventory/spares/${id}`),

  // ── Spare Transactions ───────────────────────────────────────────────────────
  issueSpare: (id: string, data: SpareTransactionPayload) =>
    api.post(`/inventory/spares/${id}/issue`, data),

  returnSpare: (id: string, data: SpareReturnPayload) =>
    api.post(`/inventory/spares/${id}/return`, data),

  getSpareTransactions: (id: string, params?: Record<string, any>) =>
    api.get(`/inventory/spares/${id}/transactions`, { params }),

  // ── Dropdowns / Reference Data ───────────────────────────────────────────────

  getDropdownData: (plant_id: string) =>
    api.get("/inventory/dropdown-data", { params: { plant_id } }),

  getUserPlants: () => api.get("/inventory/user-plants"),

  getDynamicValues: (type: string) =>
    api.get("/inventory/dynamic-values", { params: { type } }),

  createDynamicValue: (type: string, value: string) =>
    api.post("/inventory/dynamic-values", { type, value }),

  // Returns ALL active products with category name — used in spare linked-product dropdown
  getAllProducts: () => api.get("/inventory/all-products"),

  // ── Lifecycle ──────────────────────────────────────────────────────────────────
  getAssetLifecycleCost: (id: string) =>
    api.get(`/inventory/assets/${id}/lifecycle-cost`),
};
