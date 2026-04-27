import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ArrowLeft, Layers, RefreshCw } from "lucide-react";
import { managerTicketApi } from "@/services/api/managerTicketApi";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

export function SpareRequestsView({ onClose, onProcessed }: { onClose: () => void, onProcessed: () => void }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res: any = await managerTicketApi.getPendingSpareRequests();
      setRequests(res.requests || []);
      setSelectedIds([]);
    } catch (err: any) {
      toast({ title: "Failed to fetch requests", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleProcess = async (id: string, status: "approved" | "rejected") => {
    try {
      await managerTicketApi.processSpareRequest(id, status);
      toast({ title: `Request ${status}` });
      fetchRequests();
      onProcessed();
    } catch (err: any) {
      toast({ title: "Processing failed", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkProcess = async (status: "approved" | "rejected") => {
    if (selectedIds.length === 0) return;
    setProcessing(true);
    let success = 0;
    for (const id of selectedIds) {
      try {
        await managerTicketApi.processSpareRequest(id, status);
        success++;
      } catch (err) {
        console.error(err);
      }
    }
    setProcessing(false);
    toast({ title: `Processed ${success}/${selectedIds.length} requests as ${status}` });
    fetchRequests();
    onProcessed();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) setSelectedIds([]);
    else setSelectedIds(requests.map((r) => r.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 justify-between">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
            </Button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-900">Pending Spare Requests</span>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchRequests}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            {selectedIds.length > 0 && (
            <>
                <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleBulkProcess('approved')} disabled={processing}>
                <CheckCircle className="h-4 w-4 mr-2" /> Bulk Approve ({selectedIds.length})
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleBulkProcess('rejected')} disabled={processing}>
                <XCircle className="h-4 w-4 mr-2" /> Bulk Reject ({selectedIds.length})
                </Button>
            </>
            )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">
                <Checkbox 
                  checked={selectedIds.length > 0 && selectedIds.length === requests.length} 
                  onCheckedChange={toggleSelectAll} 
                />
              </TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Spare Name</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10">Loading...</TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10">No pending requests</TableCell></TableRow>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-center">
                    <Checkbox checked={selectedIds.includes(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-blue-600">{r.ticket?.ticket_code || "Unknown"}</div>
                    <div className="text-xs text-gray-500">{r.ticket?.task_name}</div>
                  </TableCell>
                  <TableCell>
                    {r.ticket?.asset?.asset_name || r.ticket?.asset?.asset_id || "N/A"}
                  </TableCell>
                  <TableCell>{r.consumedBy?.name || "System"}</TableCell>
                  <TableCell className="font-medium">{r.item_name}</TableCell>
                  <TableCell className="text-right font-bold">{r.quantity}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="text-green-600 bg-green-50 hover:bg-green-100" onClick={() => handleProcess(r.id, "approved")}>Approve</Button>
                      <Button size="sm" variant="ghost" className="text-red-600 bg-red-50 hover:bg-red-100" onClick={() => handleProcess(r.id, "rejected")}>Reject</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
