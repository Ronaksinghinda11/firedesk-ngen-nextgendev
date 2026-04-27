/**
 * Inventory.tsx — Refactored to match GenericEntityPage visual architecture
 *
 * Assets tab  → Grouped view (Plant → Product → individual records expandable)
 *               Sortable columns using SortableTH matching EntityTableView pattern.
 *               Expansion fetches per-group assets from the flat API.
 *
 * Spares tab  → Flat list with same sortable header pattern.
 *
 * Add / Edit  → Full-page breadcrumb navigation (no popups).
 *
 * Scalability → Assets fetched as server-side groups (COUNT/SUM aggregation).
 *               Child rows only fetched on expand per group.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Wrench,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  History,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  AlertCircle,
  Bell,
} from "lucide-react";
import { EntityAccessGuard } from "@/components/PermissionGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { Entity, Action } from "@/types/permissions";
import { toast } from "@/hooks/use-toast";
import {
  inventoryApi,
  InventoryAsset,
  InventorySpare,
} from "@/services/api/inventoryApi";
import { managerTicketApi } from "@/services/api/managerTicketApi";
import { InventoryAssetForm } from "@/components/inventory/InventoryAssetForm";
import { InventorySpareForm } from "@/components/inventory/InventorySpareForm";
import { SpareTransactionForm } from "@/components/inventory/SpareTransactionForm";
import { SpareTransactionHistory } from "@/components/inventory/SpareTransactionHistory";
import { AssetLifecycleHistory } from "@/components/inventory/AssetLifecycleHistory";
import { SpareRequestsView } from "@/components/inventory/SpareRequestsView";
import { usePlantFilter } from "@/contexts/PlantFilterContext";

// ── Generic reusable components ──────────────────────────────────────────────
import {
  EntityHeader,
  EntityPagination,
  EntityConfirmDialog,
  EntityFilterBar,
  EntityDynamicFilterPanel,
} from "@/components/generic/components";
import type {
  EntityConfig,
  FilterAttribute,
  ActiveFilter,
} from "@/components/generic/types/entity.types";


// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "assets" | "spares";
type PageViewMode = "list" | "create_asset" | "edit_asset" | "create_spare" | "edit_spare" | "spare_requests";
type SortDir = "asc" | "desc";


interface SortConfig {
  field: string;
  direction: SortDir;
}

// ─── Sortable Table Header — identical to EntityTableView pattern ──────────────
// TODO: Future candidate for extraction into a shared @/components/generic/components/SortableTH export.

function SortableTH({
  label,
  field,
  sorts,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  field: string;
  sorts: SortConfig[];
  onSort: (field: string) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const current = sorts.find((s) => s.field === field);
  return (
    <TableHead
      onClick={() => onSort(field)}
      className={cn(
        "bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20",
        "cursor-pointer select-none hover:bg-gray-50 transition-colors duration-100",
        align === "right" && "text-right",
        className
      )}
    >
      <div className={cn("flex items-center gap-1", align === "right" && "justify-end")}>
        {label}
        {current?.direction === "asc" && <span className="text-orange-500">↑</span>}
        {current?.direction === "desc" && <span className="text-orange-500">↓</span>}
      </div>
    </TableHead>
  );
}

// ─── Status badge colours ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700 border-emerald-200",
  installed: "bg-blue-100 text-blue-700 border-blue-200",
  reserved: "bg-amber-100 text-amber-700 border-amber-200",
};

// ─── Main Inventory Component ─────────────────────────────────────────────────

export default function Inventory() {
  const { hasPermission, canCreate, canView } = usePermissions();
  const { selectedPlantId } = usePlantFilter(); // Use global plant filter from navbar
  
  const canAdd    = canCreate(Entity.INVENTORY);
  const canEdit   = hasPermission(Entity.INVENTORY, Action.UPDATE);
  const canDelete = hasPermission(Entity.INVENTORY, Action.DELETE);
  const canAssignAction = hasPermission(Entity.INVENTORY, Action.ASSIGN);
  const canRead   = canView(Entity.INVENTORY);
  const hasRowActions = canEdit || canDelete || canAssignAction || canRead;

  // ── Tab / page-level navigation ────────────────────────────────────────────
  const [tab, setTab]           = useState<Tab>("assets");
  const [pageView, setPageView] = useState<PageViewMode>("list");

  // ── Plants list (for form dropdowns) ──────────────────────────────────────
  const [plants, setPlants] = useState<{ id: string; plant_name: string }[]>([]);

  // ── Products (for dropdown data) ───────────────────────────────────────────
  const [allProducts, setAllProducts] = useState<{ id: string; product_name: string }[]>([]);

  // ── Asset groups (server-aggregated) ──────────────────────────────────────
  const [assetGroups, setAssetGroups]         = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups]   = useState<Record<string, boolean>>({});
  const [childAssetsMap, setChildAssetsMap]   = useState<Record<string, InventoryAsset[]>>({});
  const [childLoadingMap, setChildLoadingMap] = useState<Record<string, boolean>>({});

  // ── Spares (flat list) ─────────────────────────────────────────────────────
  const [spares, setSpares] = useState<InventorySpare[]>([]);

  // ── Loading / pagination ───────────────────────────────────────────────────
  const [loading, setLoading]       = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalSpares, setTotalSpares] = useState(0);
  const [limit, setLimit] = useState(25);

  // ── Sorting state (mirrors EntityTableView sorts array) ───────────────────
  const [assetSorts, setAssetSorts] = useState<SortConfig[]>([]);
  const [spareSorts, setSpareSorts] = useState<SortConfig[]>([]);

  // ── Form edit targets ──────────────────────────────────────────────────────
  const [editAsset, setEditAsset] = useState<InventoryAsset | null>(null);
  const [editSpare, setEditSpare] = useState<InventorySpare | null>(null);

  // ── Spare transaction / history overlays ──────────────────────────────────
  const [txFormOpen, setTxFormOpen]   = useState(false);
  const [txMode, setTxMode]           = useState<"issue" | "return">("issue");
  const [txSpare, setTxSpare]         = useState<InventorySpare | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySpare, setHistorySpare] = useState<InventorySpare | null>(null);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [lifecycleAsset, setLifecycleAsset] = useState<InventoryAsset | null>(null);

  // ── Spare requests pending count ──────────────────────────────────────
  const [pendingSpareCount, setPendingSpareCount] = useState(0);

  // ── EntityConfirmDialog state (replaces window.confirm) ──────────────────
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; groupId: string; name: string } | null>(null);
  const [spareToDelete, setSpareToDelete] = useState<InventorySpare | null>(null);

  // ── EntityFilterBar state ─────────────────────────────────────────────────
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [visibleAssetColumns, setVisibleAssetColumns] = useState<string[]>([
    "plant", "product", "category", "asset_code", "type",
    "manufacturer", "serial_number", "total_quantity", "unit_price", "total_value", "status",
  ]);
  const [visibleSpareColumns, setVisibleSpareColumns] = useState<string[]>([
    "plant_name", "spare_name", "spare_type", "material_form",
    "unit_of_measurement", "linked_product_name", "quantity", "unit_price", "total_price",
  ]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const { managerTicketApi } = await import("@/services/api/managerTicketApi");
      const res: any = await managerTicketApi.getPendingSpareRequests();
      setPendingSpareCount((res?.requests || []).length);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);

  // ── Reset on tab / plant change ─────────────────────────────────────────────
  useEffect(() => {
    setCurrentPage(1);
    setExpandedGroups({});
    setChildAssetsMap({});
    setActiveFilters([]);
    setGlobalSearch("");
  }, [tab, selectedPlantId]);

  const handleAddFilter = (attributeId: string) => {
    setActiveFilters([...activeFilters, {
      id: crypto.randomUUID(),
      attributeId,
      operator: 'contains',
      value: ''
    } as ActiveFilter]);
  };

  const handleUpdateFilter = (id: string, updates: Partial<ActiveFilter>) => {
    setActiveFilters(activeFilters.map(f => f.id === id ? { ...f, ...updates } : f) as ActiveFilter[]);
  };

  const handleRemoveFilter = (id: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== id));
  };

  // ── Fetch plants list for form dropdowns ───────────────────────────────────
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const res = await inventoryApi.getUserPlants();
        setPlants(res?.data ?? res?.plants ?? []);
      } catch (err) {
        console.error('Error fetching plants:', err);
      }
    };
    fetchPlants();
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  // Fetch counts for both tabs (used for tab badges)
  const fetchCounts = useCallback(async () => {
    try {
      const params: Record<string, any> = { limit: 1, page: 1 }; // Only need counts, not data
      if (selectedPlantId) params.plantId = selectedPlantId;

      // Fetch both counts in parallel
      const [assetsRes, sparesRes] = await Promise.all([
        inventoryApi.getAssetGroups(params).catch(() => ({ total: 0 })),
        inventoryApi.getSpares(params).catch(() => ({ total: 0 })),
      ]);

      setTotalAssets(assetsRes?.total ?? 0);
      setTotalSpares(sparesRes?.total ?? 0);
    } catch (err) {
      console.error('Error fetching counts:', err);
    }
  }, [selectedPlantId]);

  const fetchData = useCallback(async () => {
    if (pageView !== "list") return;
    setLoading(true);
    try {
      // Map filters to backend options where possible
      const backendFilterMap: Record<string, { param: string; operators: string[] }> = tab === "assets" ? {
        'status': { param: 'status', operators: ['is', 'contains'] },
        'asset_code': { param: 'asset_code', operators: ['contains', 'is'] },
        'type': { param: 'type', operators: ['contains', 'is'] },
        'manufacturer': { param: 'manufacturer', operators: ['contains', 'is'] },
        'serial_number': { param: 'serial_number', operators: ['contains', 'is'] },
        'unit_price': { param: 'unit_price', operators: ['is', 'before', 'after', 'contains'] },
      } : {};

      const backendFilters = activeFilters.filter(f => {
        const mapping = backendFilterMap[f.attributeId];
        return mapping && mapping.operators.includes(f.operator);
      });

      const clientSideFilters = activeFilters.filter(f => {
        const mapping = backendFilterMap[f.attributeId];
        return !mapping || !mapping.operators.includes(f.operator);
      });

      const hasClientFilters = clientSideFilters.length > 0;
      const fetchLimit = hasClientFilters ? 1000 : limit;
      
      // We pass fetchLimit instead of limit when there are client filters
      const params: Record<string, any> = { limit: fetchLimit, page: hasClientFilters ? 1 : currentPage };
      
      // Inject backend filters into params
      backendFilters.forEach(f => {
        const mapping = backendFilterMap[f.attributeId];
        if (mapping) {
           params[mapping.param] = f.value;
        }
      });

      if (globalSearch) params.search = globalSearch;
      if (tab === "assets" && assetSorts.length > 0) {
        params.sort_by = assetSorts[0].field;
        params.sort_order = assetSorts[0].direction;
      }
      if (tab === "spares" && spareSorts.length > 0) {
        params.sort_by = spareSorts[0].field;
        params.sort_order = spareSorts[0].direction;
      }

      // Global filter uses null for "all plants", so only add plantId if it's a specific plant
      if (selectedPlantId) params.plantId = selectedPlantId;

      if (tab === "assets") {
        const res: any = await inventoryApi.getAssetGroups(params);
        let groups: any[] = res?.groups ?? [];

        // Client-side sort on aggregated group fields
        if (assetSorts.length > 0) {
          const { field, direction } = assetSorts[0];
          groups = [...groups].sort((a, b) => {
            let aVal: any = "";
            let bVal: any = "";
            if      (field === "plant")          { aVal = a.plant?.plant_name ?? ""; bVal = b.plant?.plant_name ?? ""; }
            else if (field === "product")        { aVal = a.product?.product_name ?? ""; bVal = b.product?.product_name ?? ""; }
            else if (field === "category")       { aVal = a.category?.category_name ?? ""; bVal = b.category?.category_name ?? ""; }
            else if (field === "total_quantity") { aVal = Number(a.total_quantity ?? 0); bVal = Number(b.total_quantity ?? 0); }
            else if (field === "total_value")    { aVal = Number(a.total_value ?? 0); bVal = Number(b.total_value ?? 0); }
            else if (field === "items_count")    { aVal = Number(a.items_count ?? 0); bVal = Number(b.items_count ?? 0); }
            if (typeof aVal === "string")
              return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            return direction === "asc" ? aVal - bVal : bVal - aVal;
          });
        }

        setAssetGroups(groups);
        setTotalAssets(res?.total ?? 0);
        setTotalPages(res?.pages ?? 1);

        // Load dropdown data for the selected plant
        if (selectedPlantId) {
          inventoryApi.getDropdownData(selectedPlantId).then((dRes: any) => {
            const d = dRes?.data ?? dRes;
            setAllProducts(d?.products ?? []);
          }).catch(() => {});
        } else {
          setAllProducts([]); // Clear products when "all plants" is selected
        }
      } else {
        const res: any = await inventoryApi.getSpares(params);
        let items: InventorySpare[] = res?.spares ?? res?.data ?? [];

        if (spareSorts.length > 0) {
          const { field, direction } = spareSorts[0];
          items = [...items].sort((a: any, b: any) => {
            const aVal = a[field] ?? "";
            const bVal = b[field] ?? "";
            if (typeof aVal === "string")
              return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            return direction === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
          });
        }

        setSpares(items);
        setTotalSpares(res?.total ?? items.length);
        setTotalPages(res?.pages ?? 1);
      }
    } catch (err: any) {
      toast({ title: "Error loading data", description: err?.message ?? "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [limit, tab, selectedPlantId, currentPage, pageView, assetSorts, spareSorts, globalSearch]);

  // Fetch both tab counts on mount and when plant filter changes
  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  
  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Sort toggle (same logic as EntityTableView: asc → desc → clear) ────────
  const toggleSort =
    (setSorts: React.Dispatch<React.SetStateAction<SortConfig[]>>) =>
    (field: string) => {
      setSorts((prev) => {
        const existing = prev.find((s) => s.field === field);
        if (!existing)                       return [{ field, direction: "asc" }];
        if (existing.direction === "asc")    return [{ field, direction: "desc" }];
        return []; // third click clears
      });
    };

  // ── Expand / collapse group ────────────────────────────────────────────────
  const toggleGroup = async (groupId: string, plantId: string, productId: string) => {
    const isExpanding = !expandedGroups[groupId];
    setExpandedGroups((p) => ({ ...p, [groupId]: isExpanding }));

    if (isExpanding && !childAssetsMap[groupId]) {
      setChildLoadingMap((p) => ({ ...p, [groupId]: true }));
      try {
        // Build backend filters for children
        const backendFilterMap: Record<string, { param: string; operators: string[] }> = {
          'status': { param: 'status', operators: ['is', 'contains'] },
          'asset_code': { param: 'asset_code', operators: ['contains', 'is'] },
          'type': { param: 'type', operators: ['contains', 'is'] },
          'manufacturer': { param: 'manufacturer', operators: ['contains', 'is'] },
          'serial_number': { param: 'serial_number', operators: ['contains', 'is'] },
          'unit_price': { param: 'unit_price', operators: ['is', 'before', 'after', 'contains'] },
        };
        const childParams: Record<string, any> = { plantId, productId, limit: 1000 };
        activeFilters.forEach(f => {
          const mapping = backendFilterMap[f.attributeId];
          if (mapping && mapping.operators.includes(f.operator)) {
             childParams[mapping.param] = f.value;
          }
        });
        
        const res: any = await inventoryApi.getAssets(childParams);
        const items: InventoryAsset[] = res?.assets ?? res?.data ?? [];
        setChildAssetsMap((p) => ({ ...p, [groupId]: items }));
      } catch {
        toast({ title: "Failed to load assets in this group", variant: "destructive" });
        setExpandedGroups((p) => ({ ...p, [groupId]: false }));
      } finally {
        setChildLoadingMap((p) => ({ ...p, [groupId]: false }));
      }
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  // Opens EntityConfirmDialog for asset deletion (replaces window.confirm)
  const handleDeleteAsset = (id: string, groupId: string, assetName?: string) => {
    setAssetToDelete({ id, groupId, name: assetName || "this asset" });
  };

  const performDeleteAsset = async () => {
    if (!assetToDelete) return;
    const { id, groupId } = assetToDelete;
    try {
      await inventoryApi.deleteAsset(id);
      toast({ title: "Asset deleted" });
      setChildAssetsMap((p) => ({ ...p, [groupId]: (p[groupId] ?? []).filter((a) => a.id !== id) }));
      fetchData();
      fetchCounts();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    } finally {
      setAssetToDelete(null);
    }
  };

  // Opens EntityConfirmDialog for spare deletion (replaces window.confirm)
  const handleDeleteSpare = (id: string, spareName?: string) => {
    setSpareToDelete({ id, spare_name: spareName || "this spare" } as InventorySpare);
  };

  const performDeleteSpare = async () => {
    if (!spareToDelete) return;
    try {
      await inventoryApi.deleteSpare(spareToDelete.id);
      toast({ title: "Spare deleted" });
      fetchData();
      fetchCounts();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    } finally {
      setSpareToDelete(null);
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const openAddAsset  = () => { setEditAsset(null);  setPageView("create_asset"); };
  const openEditAsset = (a: InventoryAsset) => { setEditAsset(a); setPageView("edit_asset"); };
  const openAddSpare  = () => { setEditSpare(null);  setPageView("create_spare"); };
  const openEditSpare = (s: InventorySpare) => { setEditSpare(s); setPageView("edit_spare"); };
  const openSpareRequests = () => setPageView("spare_requests");
  const backToList    = () => setPageView("list");
  const afterSave     = () => { backToList(); fetchData(); fetchCounts(); };


  // Filter helper logic derived from activeFilters
  const backendFilterMap2: Record<string, { param: string; operators: string[] }> = tab === "assets" ? {
    'status': { param: 'status', operators: ['is', 'contains'] },
    'asset_code': { param: 'asset_code', operators: ['contains', 'is'] },
    'type': { param: 'type', operators: ['contains', 'is'] },
    'manufacturer': { param: 'manufacturer', operators: ['contains', 'is'] },
    'serial_number': { param: 'serial_number', operators: ['contains', 'is'] },
    'unit_price': { param: 'unit_price', operators: ['is', 'before', 'after', 'contains'] },
  } : {};

  const clientSideFilters = activeFilters.filter(f => {
    const mapping = backendFilterMap2[f.attributeId];
    return !mapping || !mapping.operators.includes(f.operator);
  });

  // Client-side search and filters on already-fetched data
  const lowerSearch = globalSearch.toLowerCase();
  
  const applyFilters = (items: any[], isSpare: boolean) => {
    return items.filter((e) => {
      // 1. Global Search
      if (globalSearch) {
        if (!isSpare) {
          const matchSearch = (e.plant?.plant_name ?? "").toLowerCase().includes(lowerSearch) ||
            (e.product?.product_name ?? "").toLowerCase().includes(lowerSearch) ||
            (e.category?.category_name ?? "").toLowerCase().includes(lowerSearch) ||
            (e.manufacturer ?? "").toLowerCase().includes(lowerSearch) ||
            (e.asset_code ?? "").toLowerCase().includes(lowerSearch) ||
            (e.type ?? "").toLowerCase().includes(lowerSearch);
          if (!matchSearch) return false;
        } else {
          const matchSearch = (e.spare_name ?? "").toLowerCase().includes(lowerSearch) ||
            (e.plant?.plant_name ?? "").toLowerCase().includes(lowerSearch) ||
            (e.linked_product?.product_name ?? "").toLowerCase().includes(lowerSearch) ||
            (e.spare_type ?? "").toLowerCase().includes(lowerSearch);
          if (!matchSearch) return false;
        }
      }

      // 2. Dynamic Local Filters
      return clientSideFilters.every(filter => {
        let val = e[filter.attributeId];

        // Specific property mappings mapping to filter attributes
        if (filter.attributeId === 'plant_name' || filter.attributeId === 'plant') {
            val = e.plant?.plant_name || e.plant_name;
        } else if (filter.attributeId === 'product' || filter.attributeId === 'linked_product_name') {
            val = e.product?.product_name || e.linked_product?.product_name || e.linked_product_name;
        } else if (filter.attributeId === 'category') {
            val = e.category?.category_name;
        }

        if (val !== null && val !== undefined && typeof val === 'object') {
          val = val.name || val.plantName || val.plant_name ||
            val.categoryName || val.category_name ||
            val.productName || val.product_name || val.spare_name ||
            val.manufacturerName || val;
        }

        if (val === null || val === undefined) {
          const snakeCase = filter.attributeId.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          if (e[snakeCase] !== undefined) val = e[snakeCase];
        }

        // Special handling for operators
        if (filter.operator === 'is' || filter.operator === 'isNot') {
          let entityVal = val === null || val === undefined ? '' : String(val).toLowerCase().trim();
          let filterVal = String(filter.value).toLowerCase().trim();

          if (filter.operator === 'is') return entityVal === filterVal;
          else return entityVal !== filterVal;
        }

        if (val === undefined || val === null) return false;

        const entityVal = String(val).toLowerCase();
        const filterVal = String(filter.value).toLowerCase();

        switch (filter.operator) {
          case "contains": return entityVal.includes(filterVal);
          case "before": {
            const d1 = new Date(val); const d2 = new Date(filter.value);
            d1.setHours(0,0,0,0); d2.setHours(0,0,0,0); return d1 < d2;
          }
          case "after": {
            const d1 = new Date(val); const d2 = new Date(filter.value);
            d1.setHours(0,0,0,0); d2.setHours(0,0,0,0); return d1 > d2;
          }
          case "overdue": return new Date(entityVal) < new Date();
          default: return true;
        }
      });
    });
  };

  const filteredAssetGroups = applyFilters(assetGroups, false);
  const filteredSpares = applyFilters(spares, true);

  // ── COL COUNT constants ────────────────────────────────────────────────────
  const ASSET_COLS = visibleAssetColumns.length + (hasRowActions ? 1 : 0);
  const SPARE_COLS = visibleSpareColumns.length + (hasRowActions ? 1 : 0);

  // Generic EntityConfig (required by EntityHeader / EntityPagination / EntityConfirmDialog)
  const inventoryEntityConfig: EntityConfig = {
    entityName: tab === "assets" ? "Asset" : "Spare",
    entityNamePlural: "Inventory",
    fields: [],
    hideCreateButton: true,
    limitTopMenuItems: ["refresh"],
  };

  // FilterAttribute definitions for EntityFilterBar columns dropdown
  const assetFilterAttributes: FilterAttribute[] = [
    { id: "plant",          label: "Plant",        type: "text",   mandatory: true },
    { id: "product",        label: "Product",      type: "text",   mandatory: true },
    { id: "category",       label: "Category",     type: "text" },
    { id: "asset_code",     label: "Asset Code",   type: "text" },
    { id: "type",           label: "Type",         type: "text" },
    { id: "manufacturer",   label: "Manufacturer", type: "text" },
    { id: "serial_number",  label: "Serial No.",   type: "text" },
    { id: "total_quantity", label: "Qty",           type: "number" },
    { id: "unit_price",     label: "Unit Price",   type: "number" },
    { id: "total_value",    label: "Total Value",  type: "number" },
    { id: "status",         label: "Status",       type: "select" },
  ];

  const spareFilterAttributes: FilterAttribute[] = [
    { id: "plant_name",          label: "Plant",          type: "text",   mandatory: true },
    { id: "spare_name",          label: "Spare Name",     type: "text",   mandatory: true },
    { id: "spare_type",          label: "Type",           type: "select" },
    { id: "material_form",       label: "Material Form",  type: "text" },
    { id: "unit_of_measurement", label: "Unit",           type: "text" },
    { id: "linked_product_name", label: "Linked Product", type: "text" },
    { id: "quantity",            label: "Qty",            type: "number" },
    { id: "unit_price",          label: "Unit Price",     type: "number" },
    { id: "total_price",         label: "Total Value",    type: "number" },
  ];


  // ════════════════════════════════════════════════════════════════════════════
  // SPARE REQUESTS VIEW
  // ════════════════════════════════════════════════════════════════════════════

  if (pageView === "spare_requests") {
    return (
      <div className="space-y-5">
        <SpareRequestsView
          onClose={backToList}
          onProcessed={() => { fetchPendingCount(); fetchData(); }}
        />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FORM VIEW (breadcrumb navigation — no popups)
  // ════════════════════════════════════════════════════════════════════════════

  if (pageView !== "list") {
    const title =
      pageView === "create_asset" ? "Add New Asset"  :
      pageView === "edit_asset"   ? "Edit Asset"     :
      pageView === "create_spare" ? "Add Spare"      : "Edit Spare";

    return (
      <div className="space-y-5">
        {/* Breadcrumb — mirrors GenericEntityPage create/edit header */}
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
          <Button variant="ghost" size="sm" className="gap-1 px-2 text-gray-500 hover:text-gray-900" onClick={backToList}>
            <ChevronLeft className="h-4 w-4" /> Inventory
          </Button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm w-full max-w-5xl">
          {(pageView === "create_asset" || pageView === "edit_asset") && (
            <InventoryAssetForm
              inline={true}
              open={true}
              onClose={backToList}
              onSaved={afterSave}
              editItem={editAsset}
              plants={plants}
            />
          )}
          {(pageView === "create_spare" || pageView === "edit_spare") && (
            <InventorySpareForm
              inline={true}
              open={true}
              onClose={backToList}
              onSaved={afterSave}
              editItem={editSpare}
              plants={plants}
              products={allProducts}
            />
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <EntityAccessGuard
      entity={Entity.INVENTORY}
      fallback={
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-semibold text-foreground">No Access to Inventory</h2>
            <p className="text-muted-foreground max-w-md">
              You don't have permission to view inventory. Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">

      {/* Page Header — Generic EntityHeader */}
      <EntityHeader
        config={{
          ...inventoryEntityConfig,
          headerActions: () => (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={openSpareRequests}
                className="h-9 gap-2 relative hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all duration-200"
              >
                <Bell className="h-4 w-4" />
                <span className="font-medium">Spare Requests</span>
                {pendingSpareCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {pendingSpareCount > 9 ? "9+" : pendingSpareCount}
                  </span>
                )}
              </Button>
              {canAdd && tab === "assets" && (
                <Button
                  onClick={openAddAsset}
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm h-9 px-4 active:scale-95 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="font-semibold">Add Asset</span>
                </Button>
              )}
              {canAdd && tab === "spares" && (
                <Button
                  onClick={openAddSpare}
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm h-9 px-4 active:scale-95 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="font-semibold">Add Spare</span>
                </Button>
              )}
            </>
          ),
        }}
        archiveStatus="active"
        viewMode="table"
        showFilter={showFilterPanel}
        activeFilterCount={globalSearch ? 1 : 0}
        canCreate={false}
        isLoading={loading}
        onAddNew={() => {}}
        onToggleFilter={() => setShowFilterPanel((p) => !p)}
        onViewModeChange={() => {}}
        onToggleArchiveView={() => {}}
        onExport={() => {}}
        onImport={() => {}}
        onPrint={() => {}}
        onShare={() => {}}
        onRefresh={fetchData}
        onBulkActions={() => {}}
        onSettings={() => {}}
        onHelp={() => {}}
        onHistory={() => {}}
      />


      {/* ── Toolbar: tab switcher + EntityFilterBar (search + columns) ────── */}
      <div className="bg-white px-4 py-3 border rounded-lg shadow-sm flex flex-col gap-3">
        {/* Segmented tab control */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 w-fit">
          {(["assets", "spares"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all duration-150",
                tab === t ? "bg-white shadow-sm text-orange-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t === "assets" ? <Package className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
              {t === "assets" ? "Asset Stock" : "Spares"}
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                tab === t ? "bg-orange-100 text-orange-700" : "bg-gray-200 text-gray-500"
              )}>
                {t === "assets" ? totalAssets : totalSpares}
              </span>
            </button>
          ))}
        </div>

        {/* Generic EntityFilterBar — global search + column-visibility toggle */}
        <EntityFilterBar
          activeFilterCount={activeFilters.length + (globalSearch ? 1 : 0)}
          showFilterPanel={showFilterPanel}
          onToggleFilterPanel={() => setShowFilterPanel((p) => !p)}
          onClearAllFilters={() => {
            setGlobalSearch("");
            setActiveFilters([]);
          }}
          onSaveView={() => toast({ title: "View Saved", description: "Your table view preferences have been saved." })}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
          sorts={tab === "assets" ? assetSorts : spareSorts}
          sortAttributes={tab === "assets" ? assetFilterAttributes : spareFilterAttributes}
          onUpdateSorts={(s) => {
            if (tab === "assets") setAssetSorts(s as SortConfig[]);
            else setSpareSorts(s as SortConfig[]);
          }}
          fields={[]}
          visibleColumns={tab === "assets" ? visibleAssetColumns : visibleSpareColumns}
          onToggleColumn={(col) => {
            if (tab === "assets") {
              setVisibleAssetColumns((prev) =>
                prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
              );
            } else {
              setVisibleSpareColumns((prev) =>
                prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
              );
            }
          }}
          onResetColumns={() => {
            if (tab === "assets") setVisibleAssetColumns(assetFilterAttributes.map((a) => a.id));
            else setVisibleSpareColumns(spareFilterAttributes.map((a) => a.id));
          }}
        />

        {showFilterPanel && (
          <EntityDynamicFilterPanel
            attributes={tab === "assets" ? (assetFilterAttributes as FilterAttribute[]) : (spareFilterAttributes as FilterAttribute[])}
            activeFilters={activeFilters}
            onAddFilter={handleAddFilter}
            onUpdateFilter={handleUpdateFilter}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={() => setActiveFilters([])}
            onApply={() => setShowFilterPanel(false)}
          />
        )}
      </div>

      {/* ── Table (EntityTableView pattern) ────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-orange-200">
        <div className="overflow-auto max-h-[calc(100vh-260px)] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent relative">

          {/* ══════════ ASSETS TABLE ══════════ */}
          {tab === "assets" && (
            <table className="relative border-collapse w-full table-auto text-sm caption-bottom">
              <TableHeader className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <TableRow className="hover:bg-transparent border-b">
                  {/* Col 1 — Plant (sticky left, mandatory first col) */}
                  {visibleAssetColumns.includes("plant") && (
                    <SortableTH label="Plant" field="plant" sorts={assetSorts} onSort={toggleSort(setAssetSorts)}
                      className="md:left-0 z-30 min-w-[140px] md:border-r border-gray-100" />
                  )}
                  {/* Col 2 — Product */}
                  {visibleAssetColumns.includes("product") && (
                    <SortableTH label="Product" field="product" sorts={assetSorts} onSort={toggleSort(setAssetSorts)}
                      className="min-w-[160px]" />
                  )}
                  {/* Col 3 — Category */}
                  {visibleAssetColumns.includes("category") && (
                    <SortableTH label="Category" field="category" sorts={assetSorts} onSort={toggleSort(setAssetSorts)} />
                  )}
                  {/* Col 4 — Asset Code (child rows) / Records count (group rows) */}
                  {visibleAssetColumns.includes("asset_code") && (
                    <SortableTH label="Asset Code" field="asset_code" sorts={assetSorts} onSort={toggleSort(setAssetSorts)}
                      className="min-w-[140px]" />
                  )}
                  {/* Col 5 — Type / Subtype (child rows only) */}
                  {visibleAssetColumns.includes("type") && (
                    <TableHead className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20">
                      Type
                    </TableHead>
                  )}
                  {/* Col 6 — Manufacturer */}
                  {visibleAssetColumns.includes("manufacturer") && (
                    <SortableTH label="Manufacturer" field="manufacturer" sorts={assetSorts} onSort={toggleSort(setAssetSorts)} />
                  )}
                  {/* Col 7 — Serial No. */}
                  {visibleAssetColumns.includes("serial_number") && (
                    <SortableTH label="Serial No." field="serial_number" sorts={assetSorts} onSort={toggleSort(setAssetSorts)} />
                  )}
                  {/* Col 8 — Qty */}
                  {visibleAssetColumns.includes("total_quantity") && (
                    <SortableTH label="Qty" field="total_quantity" sorts={assetSorts} onSort={toggleSort(setAssetSorts)} align="right" />
                  )}
                  {/* Col 9 — Unit Price */}
                  {visibleAssetColumns.includes("unit_price") && (
                    <SortableTH label="Unit Price" field="unit_price" sorts={assetSorts} onSort={toggleSort(setAssetSorts)} align="right" />
                  )}
                  {/* Col 10 — Total Value */}
                  {visibleAssetColumns.includes("total_value") && (
                    <SortableTH label="Total Value" field="total_value" sorts={assetSorts} onSort={toggleSort(setAssetSorts)} align="right" />
                  )}
                  {/* Col 11 — Status */}
                  {visibleAssetColumns.includes("status") && (
                    <TableHead className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20">
                      Status
                    </TableHead>
                  )}
                  {/* Col 12 (optional) — Actions */}
                  {hasRowActions && (
                    <TableHead className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 right-0 z-30 text-right w-[110px]">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Empty state */}
                {assetGroups.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={ASSET_COLS} className="text-center py-20">
                      <Package className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                      <p className="text-base font-medium text-gray-500">No inventory assets found</p>
                      {canAdd && <p className="text-sm text-gray-400 mt-1">Click <strong>Add Asset</strong> to get started</p>}
                    </TableCell>
                  </TableRow>
                )}

                {filteredAssetGroups.map((group) => {
                  const groupId       = `${group.plant_id}_${group.product_id}`;
                  const isExpanded    = expandedGroups[groupId];
                  const isChildLoading = childLoadingMap[groupId];
                  const children      = childAssetsMap[groupId] ?? [];

                  return (
                    <React.Fragment key={groupId}>
                      {/* ── GROUP SUMMARY ROW ─────────────────────────────── */}
                      <TableRow
                        onClick={() => toggleGroup(groupId, group.plant_id, group.product_id)}
                        className={cn(
                          "cursor-pointer border-b border-gray-100 transition-colors duration-100",
                          "border-l-[3px] border-l-transparent hover:border-l-orange-500",
                          "bg-white hover:bg-orange-50/50 group"
                        )}
                      >
                        {/* Plant — sticky first col */}
                        {visibleAssetColumns.includes("plant") && (
                          <TableCell className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white group-hover:bg-orange-50/60 z-10 border-r border-gray-100 min-w-[140px]">
                            {group.plant?.plant_name || "—"}
                          </TableCell>
                        )}
                        {/* Product (with expand chevron) */}
                        {visibleAssetColumns.includes("product") && (
                          <TableCell className="px-4 py-3 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                            <div className="flex items-center gap-1.5">
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 shrink-0 text-orange-500" />
                                : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                              }
                              {group.product?.product_name || "Unknown Product"}
                            </div>
                          </TableCell>
                        )}
                        {/* Category */}
                        {visibleAssetColumns.includes("category") && (
                          <TableCell className="px-4 py-3 text-sm text-gray-500">
                            {group.category?.category_name || "—"}
                          </TableCell>
                        )}
                        {/* Asset Code col — show record count badge in group rows */}
                        {visibleAssetColumns.includes("asset_code") && (
                          <TableCell className="px-4 py-3">
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-[11px]">
                              {group.items_count} records
                            </Badge>
                          </TableCell>
                        )}
                        {/* Type — blank in group row */}
                        {visibleAssetColumns.includes("type") && <TableCell className="px-4 py-3" />}
                        {/* Manufacturer — blank in group row */}
                        {visibleAssetColumns.includes("manufacturer") && <TableCell className="px-4 py-3" />}
                        {/* Serial No. — blank in group row */}
                        {visibleAssetColumns.includes("serial_number") && <TableCell className="px-4 py-3" />}
                        {/* Qty aggregate */}
                        {visibleAssetColumns.includes("total_quantity") && (
                          <TableCell className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                            {group.total_quantity ?? "—"}
                          </TableCell>
                        )}
                        {/* Unit Price — not meaningful per group */}
                        {visibleAssetColumns.includes("unit_price") && (
                          <TableCell className="px-4 py-3 text-right text-gray-400 text-xs">—</TableCell>
                        )}
                        {/* Total Value aggregate */}
                        {visibleAssetColumns.includes("total_value") && (
                          <TableCell className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                            {group.total_value
                              ? `₹\u202f${Number(group.total_value).toLocaleString("en-IN")}`
                              : "—"}
                          </TableCell>
                        )}
                        {/* Status — blank in group row */}
                        {visibleAssetColumns.includes("status") && <TableCell className="px-4 py-3" />}
                        {/* Actions — blank in group row */}
                        {hasRowActions && (
                          <TableCell className="px-4 py-3 sticky right-0 bg-white group-hover:bg-orange-50/60" />
                        )}
                      </TableRow>

                      {/* ── CHILD LOADING SPINNER ─────────────────────────── */}
                      {isExpanded && isChildLoading && (
                        <TableRow className="bg-gray-50/40">
                          <TableCell colSpan={ASSET_COLS} className="text-center py-4">
                            <RefreshCw className="h-4 w-4 animate-spin text-gray-400 inline-block mr-2" />
                            <span className="text-sm text-gray-400">Loading assets…</span>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* ── CHILD ASSET ROWS ──────────────────────────────── */}
                      {isExpanded && !isChildLoading && children.map((asset) => (
                        <TableRow
                          key={asset.id}
                          className="border-b border-gray-50 hover:bg-blue-50/20 bg-gray-50/20 transition-colors duration-75"
                        >
                          {/* Plant col — indented connector */}
                          {visibleAssetColumns.includes("plant") && (
                            <TableCell className="sticky left-0 bg-gray-50/20 z-10 border-r border-gray-100 min-w-[140px] px-4 py-2.5">
                              <div className="flex items-center gap-1 pl-3">
                                <div className="w-3 h-4 border-l-2 border-b-2 border-gray-200 rounded-bl shrink-0" />
                              </div>
                            </TableCell>
                          )}
                          {/* Product — blank (inherited from group) */}
                          {visibleAssetColumns.includes("product") && <TableCell className="px-4 py-2.5" />}
                          {/* Category — blank (inherited) */}
                          {visibleAssetColumns.includes("category") && <TableCell className="px-4 py-2.5" />}
                          {/* Asset Code */}
                          {visibleAssetColumns.includes("asset_code") && (
                            <TableCell className="px-4 py-2.5 text-xs font-bold text-gray-800 font-mono">
                              {asset.asset_code ?? "—"}
                            </TableCell>
                          )}
                          {/* Type / Subtype */}
                          {visibleAssetColumns.includes("type") && (
                            <TableCell className="px-4 py-2.5 text-xs text-gray-500">
                              {asset.type
                                ? asset.sub_type
                                  ? `${asset.type} / ${asset.sub_type}`
                                  : asset.type
                                : "—"}
                            </TableCell>
                          )}
                          {/* Manufacturer */}
                          {visibleAssetColumns.includes("manufacturer") && (
                            <TableCell className="px-4 py-2.5 text-xs text-gray-600">
                              {asset.manufacturer ?? "—"}
                            </TableCell>
                          )}
                          {/* Serial No. */}
                          {visibleAssetColumns.includes("serial_number") && (
                            <TableCell className="px-4 py-2.5 text-xs font-mono text-gray-500">
                              {asset.serial_number ?? "—"}
                            </TableCell>
                          )}
                          {/* Qty */}
                          {visibleAssetColumns.includes("total_quantity") && (
                            <TableCell className="px-4 py-2.5 text-xs font-semibold text-right text-gray-900">
                              {asset.quantity}
                            </TableCell>
                          )}
                          {/* Unit Price */}
                          {visibleAssetColumns.includes("unit_price") && (
                            <TableCell className="px-4 py-2.5 text-xs text-right text-gray-700">
                              {asset.unit_price
                                ? `₹\u202f${Number(asset.unit_price).toLocaleString("en-IN")}`
                                : "—"}
                            </TableCell>
                          )}
                          {/* Total Value */}
                          {visibleAssetColumns.includes("total_value") && (
                            <TableCell className="px-4 py-2.5 text-xs font-medium text-right text-gray-900">
                              {asset.total_price
                                ? `₹\u202f${Number(asset.total_price).toLocaleString("en-IN")}`
                                : "—"}
                            </TableCell>
                          )}
                          {/* Status */}
                          {visibleAssetColumns.includes("status") && (
                            <TableCell className="px-4 py-2.5">
                              <Badge className={cn(
                                "text-[10px] uppercase font-bold tracking-wide border px-2 py-0.5",
                                STATUS_COLORS[asset.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                {asset.status}
                              </Badge>
                            </TableCell>
                          )}
                          {/* Actions */}
                          {hasRowActions && (
                            <TableCell className="px-3 py-2 sticky right-0 bg-gray-50/20">
                              <div className="flex items-center justify-end gap-1">
                                {canRead && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="View Lifecycle"
                                    onClick={(e) => { e.stopPropagation(); setLifecycleAsset(asset); setLifecycleOpen(true); }}>
                                    <History className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {asset.status !== "installed" && canEdit && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:bg-blue-50 hover:text-blue-700" title="Edit"
                                    onClick={(e) => { e.stopPropagation(); openEditAsset(asset); }}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {asset.status !== "installed" && canDelete && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50 hover:text-red-600" title="Delete"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id, groupId); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </table>
          )}

          {/* ══════════ SPARES TABLE ══════════ */}
          {tab === "spares" && (
            <table className="relative border-collapse w-full table-auto text-sm caption-bottom">
              <TableHeader className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <TableRow className="hover:bg-transparent border-b">
                  {visibleSpareColumns.includes("plant_name") && <SortableTH label="Plant" field="plant_name" sorts={spareSorts} onSort={toggleSort(setSpareSorts)} className="md:left-0 z-30 min-w-[140px] md:border-r border-gray-100" />}
                  {visibleSpareColumns.includes("spare_name") && <SortableTH label="Spare Name" field="spare_name" sorts={spareSorts} onSort={toggleSort(setSpareSorts)} className="min-w-[180px]" />}
                  {visibleSpareColumns.includes("spare_type") && <SortableTH label="Type" field="spare_type" sorts={spareSorts} onSort={toggleSort(setSpareSorts)} />}
                  {visibleSpareColumns.includes("material_form") && <SortableTH label="Material Form" field="material_form" sorts={spareSorts} onSort={toggleSort(setSpareSorts)} />}
                  {visibleSpareColumns.includes("unit_of_measurement") && <SortableTH label="Unit" field="unit_of_measurement" sorts={spareSorts} onSort={toggleSort(setSpareSorts)} />}
                  {visibleSpareColumns.includes("linked_product_name") && <SortableTH label="Linked Product" field="linked_product_name" sorts={spareSorts} onSort={toggleSort(setSpareSorts)} />}
                  {visibleSpareColumns.includes("quantity") && <SortableTH label="Qty" field="quantity" sorts={spareSorts} onSort={toggleSort(setSpareSorts)} align="right" />}
                  {visibleSpareColumns.includes("unit_price") && <SortableTH label="Unit Price" field="unit_price" sorts={spareSorts} onSort={toggleSort(setSpareSorts)} align="right" />}
                  {visibleSpareColumns.includes("total_price") && <SortableTH label="Total Value" field="total_price" sorts={spareSorts} onSort={toggleSort(setSpareSorts)} align="right" />}
                  {hasRowActions && (
                    <TableHead className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 right-0 z-30 text-right w-[140px]">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredSpares.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={SPARE_COLS} className="text-center py-20">
                      <Wrench className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                      <p className="text-base font-medium text-gray-500">No spare parts found</p>
                      {canAdd && <p className="text-sm text-gray-400 mt-1">Click <strong>Add Spare</strong> to get started</p>}
                    </TableCell>
                  </TableRow>
                )}

                {filteredSpares.map((spare) => (
                  <TableRow key={spare.id} className="border-b border-gray-100 hover:bg-orange-50/50 bg-white transition-colors duration-75">
                    {/* Plant — sticky first col */}
                    {visibleSpareColumns.includes("plant_name") && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700 sticky left-0 bg-white z-10 border-r border-gray-100 min-w-[140px]">
                        {spare.plant?.plant_name ?? "—"}
                      </TableCell>
                    )}
                    {/* Spare Name */}
                    {visibleSpareColumns.includes("spare_name") && (
                      <TableCell className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {spare.spare_name}
                      </TableCell>
                    )}
                    {/* Type badge */}
                    {visibleSpareColumns.includes("spare_type") && (
                      <TableCell className="px-4 py-3">
                        <Badge className={cn(
                          "text-[10px] capitalize font-semibold border px-2 py-0.5",
                          spare.spare_type === "consumable"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        )}>
                          {spare.spare_type}
                        </Badge>
                      </TableCell>
                    )}
                    {/* Material Form */}
                    {visibleSpareColumns.includes("material_form") && (
                      <TableCell className="px-4 py-3 text-sm text-gray-500">{spare.material_form ?? "—"}</TableCell>
                    )}
                    {/* Unit */}
                    {visibleSpareColumns.includes("unit_of_measurement") && (
                      <TableCell className="px-4 py-3 text-sm text-gray-500">{spare.unit_of_measurement ?? "—"}</TableCell>
                    )}
                    {/* Linked Product */}
                    {visibleSpareColumns.includes("linked_product_name") && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700">
                        {spare.linked_product?.product_name
                          ?? <span className="text-gray-400 italic text-xs">Standalone</span>}
                      </TableCell>
                    )}
                    {/* Qty */}
                    {visibleSpareColumns.includes("quantity") && (
                      <TableCell className="px-4 py-3 text-sm font-bold text-right text-gray-900">{spare.quantity}</TableCell>
                    )}
                    {/* Unit Price */}
                    {visibleSpareColumns.includes("unit_price") && (
                      <TableCell className="px-4 py-3 text-sm text-right text-gray-700">
                        {spare.unit_price ? `₹\u202f${Number(spare.unit_price).toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                    )}
                    {/* Total Value */}
                    {visibleSpareColumns.includes("total_price") && (
                      <TableCell className="px-4 py-3 text-sm font-medium text-right text-gray-900">
                        {spare.total_price ? `₹\u202f${Number(spare.total_price).toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                    )}
                    {/* Actions */}
                    {hasRowActions && (
                      <TableCell className="px-3 py-2 text-right sticky right-0 bg-white">
                        <div className="flex items-center justify-end gap-1">
                          {canAssignAction && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-500 hover:bg-orange-50 hover:text-orange-700" title="Issue spare"
                              onClick={() => { setTxSpare(spare); setTxMode("issue"); setTxFormOpen(true); }}>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canAssignAction && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:bg-blue-50 hover:text-blue-700" title="Return spare"
                              onClick={() => { setTxSpare(spare); setTxMode("return"); setTxFormOpen(true); }}>
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canRead && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Transaction history"
                              onClick={() => { setHistorySpare(spare); setHistoryOpen(true); }}>
                              <History className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:bg-blue-50 hover:text-blue-700" title="Edit"
                              onClick={() => openEditSpare(spare)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50 hover:text-red-600" title="Delete"
                              onClick={() => handleDeleteSpare(spare.id, spare.spare_name)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </table>
          )}
        </div>

        {/* Generic EntityPagination */}
        <EntityPagination
          config={inventoryEntityConfig}
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={(currentPage - 1) * limit}
          paginatedEntitiesLength={tab === "assets" ? filteredAssetGroups.length : filteredSpares.length}
          totalItems={tab === "assets" ? totalAssets : totalSpares}
          itemsPerPage={limit}
          filteredEntitiesLength={tab === "assets" ? totalAssets : totalSpares}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newLimit) => {
            setLimit(newLimit);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Overlays */}
      <SpareTransactionForm
        open={txFormOpen}
        onClose={() => setTxFormOpen(false)}
        spare={txSpare}
        onSaved={fetchData}
        mode={txMode}
      />
      <SpareTransactionHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        spare={historySpare}
      />
      <AssetLifecycleHistory
        open={lifecycleOpen}
        onClose={() => setLifecycleOpen(false)}
        asset={lifecycleAsset}
      />

      {/* Generic EntityConfirmDialog — Asset Delete */}
      {assetToDelete && (
        <EntityConfirmDialog
          config={{ ...inventoryEntityConfig, entityName: "Asset" }}
          entity={{
            id: assetToDelete.id,
            name: assetToDelete.name,
            status: "Active",
            createdAt: "",
            createdBy: "",
          }}
          onConfirm={performDeleteAsset}
          onCancel={() => setAssetToDelete(null)}
        />
      )}

      {/* Generic EntityConfirmDialog — Spare Delete */}
      {spareToDelete && (
        <EntityConfirmDialog
          config={{ ...inventoryEntityConfig, entityName: "Spare" }}
          entity={{
            id: spareToDelete.id,
            name: spareToDelete.spare_name,
            status: "Active",
            createdAt: "",
            createdBy: "",
          }}
          onConfirm={performDeleteSpare}
          onCancel={() => setSpareToDelete(null)}
        />
      )}
    </div>
    </EntityAccessGuard>
  );
}