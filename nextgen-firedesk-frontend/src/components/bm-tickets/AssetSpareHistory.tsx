// Asset Spare History Modal
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Download, DollarSign, Package } from 'lucide-react';
import { bmTicketApi } from '@/services/api/bmTicketApi';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AssetSpareHistoryProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
}

export function AssetSpareHistory({ open, onClose, assetId, assetName }: AssetSpareHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (open && assetId) {
      loadHistory();
    }
  }, [open, assetId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await bmTicketApi.getAssetSpareHistory(assetId);
      setHistory(data.consumptions);
      setSummary(data.summary);
    } catch (error: any) {
      console.error('Error loading spare history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load spare consumption history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (history.length === 0) {
      toast({
        title: 'No Data',
        description: 'No spare consumption data to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Date', 'Ticket Code', 'Spare Name', 'Quantity', 'Unit Cost', 'Total Cost', 'Technician', 'Remarks'];
    const rows = history.map(h => [
      format(new Date(h.used_at), 'yyyy-MM-dd HH:mm'),
      h.ticket?.ticket_code || 'N/A',
      h.spare?.name || 'Unknown',
      h.quantity_used,
      h.unit_cost,
      h.total_cost,
      h.usedBy?.name || 'N/A',
      h.remarks || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-${assetId}-spare-history.csv`;
    a.click();

    toast({
      title: 'Success',
      description: 'Spare history exported to CSV',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <DialogTitle>Spare Consumption History</DialogTitle>
          </div>
          <DialogDescription>
            Asset: {assetName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Spares</p>
                      <p className="text-2xl font-bold">{summary.total_spares}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Cost</p>
                      <p className="text-2xl font-bold">₹{summary.total_cost?.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tickets</p>
                      <p className="text-2xl font-bold">{summary.total_tickets}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={history.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </Button>
          </div>

          {/* History Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading spare consumption history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No spare parts have been consumed for this asset yet.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Ticket</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Spare Part</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Unit Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Total Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Technician</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {format(new Date(item.used_at), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium text-blue-600">
                          {item.ticket?.ticket_code || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.spare?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {item.quantity_used} {item.spare?.unit || 'units'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        ₹{item.unit_cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        ₹{item.total_cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.usedBy?.name || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
