import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { inventoryApi, InventoryAsset } from "@/services/api/inventoryApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Package, FileText, Calendar, Wrench } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface AssetLifecycleHistoryProps {
  open: boolean;
  onClose: () => void;
  asset: InventoryAsset | null;
}

export function AssetLifecycleHistory({ open, onClose, asset }: AssetLifecycleHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (open && asset) {
      setLoading(true);
      inventoryApi.getAssetLifecycleCost(asset.id)
        .then((res: any) => {
          setData(res.data || res);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [open, asset]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-500" />
            Asset Lifecycle: {asset?.asset_code || asset?.model || "Unknown"}
          </DialogTitle>
          <DialogDescription>
            Lifecycle details, maintenance history and spare cost.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin mb-4" />
            <p>Loading lifecycle data...</p>
          </div>
        ) : !data ? (
          <div className="p-8 text-center text-slate-500">No data available</div>
        ) : (
          <div className="space-y-6">
            {/* Current Status & Installation Info */}
            {data.asset && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Current Status</h3>
                    <Badge className={cn(
                      "text-xs font-medium",
                      data.asset.status === "installed" ? "bg-blue-100 text-blue-700 border-blue-200" :
                      data.asset.status === "available" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                      "bg-amber-100 text-amber-700 border-amber-200"
                    )}>
                      {data.asset.status === "installed" ? "🏗️ Installed" : 
                       data.asset.status === "available" ? "📦 Available" : 
                       data.asset.status}
                    </Badge>
                  </div>
                  
                  {data.installedLocation && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Installed Location</p>
                      <p className="font-semibold text-sm text-slate-800">
                        {data.installedLocation.building?.name && `Building ${data.installedLocation.building.name}`}
                        {data.installedLocation.floor?.name && ` - Floor ${data.installedLocation.floor.name}`}
                        {data.installedLocation.wing?.name && ` - ${data.installedLocation.wing.name}`}
                      </p>
                      {data.installedLocation.location && (
                        <p className="text-xs text-slate-600 mt-1">{data.installedLocation.location}</p>
                      )}
                      {data.installedLocation.installDate && (
                        <p className="text-xs text-slate-500 mt-2 flex items-center justify-end gap-1">
                          <Calendar className="h-3 w-3" />
                          Installed: {new Date(data.installedLocation.installDate).toLocaleDateString("en-IN")}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {data.asset.status === "installed" && !data.installedLocation && (
                    <p className="text-xs text-slate-500 italic">Installation location not available</p>
                  )}
                </div>
              </div>
            )}

            {/* Asset Basic Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Asset Code</p>
                <p className="font-semibold">{asset?.asset_code || "—"}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Manufacturer / Model</p>
                <p className="font-semibold text-sm">{asset?.manufacturer} / {asset?.model}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Serial Number</p>
                <p className="font-semibold text-sm">{asset?.serial_number || "—"}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-900">
                <p className="text-xs text-blue-600/80 mb-1">Total Spare Cost</p>
                <p className="font-bold text-lg">₹ {parseFloat(data.total_spare_cost || 0).toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-700">
                <Calendar className="h-4 w-4" /> Maintenance Timeline & Tickets
              </h3>
              {(!data.tickets || data.tickets.length === 0) ? (
                <div className="text-sm text-slate-500 italic p-4 border rounded-xl border-dashed">
                  No maintenance tickets have been recorded for this asset yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.tickets.map((t: any) => (
                    <div key={t.id} className="border rounded-xl p-4 flex flex-col md:flex-row gap-4 bg-white shadow-sm">
                      <div className="shrink-0 w-32 border-r pr-4">
                        <Badge variant="outline" className="mb-2 text-xs">{t.ticket_code}</Badge>
                        <p className="text-xs text-slate-500 font-medium">{new Date(t.created_at).toLocaleDateString("en-IN")}</p>
                        <Badge className={cn("mt-2 text-[10px]", t.ticket_category === 'Breakdown Maintenance' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700')}>{t.ticket_category}</Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800">{t.task_name}</p>
                        <p className="text-xs text-slate-500 mt-1 mb-3">{t.task_description}</p>
                        
                        {t.inventoryUsage && t.inventoryUsage.length > 0 && (
                          <div className="mt-2 bg-slate-50 rounded-md p-3 text-sm">
                            <p className="text-xs font-semibold mb-2 flex items-center gap-1 text-slate-600"><Wrench className="h-3 w-3"/> Spares Used</p>
                            <div className="space-y-1">
                              {t.inventoryUsage.map((u: any) => (
                                <div key={u.id} className="flex justify-between text-xs">
                                  <span>{u.item_name || "Unknown item"} <span className="text-slate-400">× {u.quantity}</span></span>
                                  <span className="font-medium text-slate-600">₹ {u.total_cost}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
