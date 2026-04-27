// Spare Parts Selector Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface SpareRow {
  id: string;
  spare_id: string;
  quantity_used: number;
  remarks: string;
  spare?: any;
}

interface SparePartsSelectorProps {
  selectedSpares: SpareRow[];
  onChange: (spares: SpareRow[]) => void;
  readonly?: boolean;
}

export function SparePartsSelector({ selectedSpares, onChange, readonly = false }: SparePartsSelectorProps) {
  const [availableSpares, setAvailableSpares] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableSpares();
  }, []);

  const loadAvailableSpares = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory/spares');
      setAvailableSpares(response.spares || []);
    } catch (error: any) {
      console.error('Error loading spares:', error);
      toast({
        title: 'Error',
        description: 'Failed to load spare parts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addSpareRow = () => {
    const newRow: SpareRow = {
      id: `temp-${Date.now()}`,
      spare_id: '',
      quantity_used: 1,
      remarks: '',
    };
    onChange([...selectedSpares, newRow]);
  };

  const removeSpareRow = (id: string) => {
    onChange(selectedSpares.filter(s => s.id !== id));
  };

  const updateSpareRow = (id: string, field: keyof SpareRow, value: any) => {
    onChange(selectedSpares.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        
        // If spare_id changed, attach spare object
        if (field === 'spare_id') {
          updated.spare = availableSpares.find(spare => spare.id === value);
        }
        
        return updated;
      }
      return s;
    }));
  };

  const calculateTotal = () => {
    return selectedSpares.reduce((sum, row) => {
      if (row.spare && row.quantity_used) {
        return sum + (row.spare.unit_cost * row.quantity_used);
      }
      return sum;
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Spare Parts Consumed</CardTitle>
          {!readonly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSpareRow}
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Spare
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {selectedSpares.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {readonly ? 'No spare parts consumed' : 'Click "Add Spare" to add spare parts'}
            </div>
          ) : (
            <>
              {selectedSpares.map((row, index) => (
                <div key={row.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Spare #{index + 1}
                    </span>
                    {!readonly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSpareRow(row.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Spare Selection */}
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Spare Part <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={row.spare_id}
                        onValueChange={(value) => updateSpareRow(row.id, 'spare_id', value)}
                        disabled={readonly}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select spare" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSpares.map((spare) => (
                            <SelectItem key={spare.id} value={spare.id}>
                              <div className="flex flex-col">
                                <span>{spare.name}</span>
                                <span className="text-xs text-gray-500">
                                  Stock: {spare.current_stock} {spare.unit} • ₹{spare.unit_cost}/unit
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Quantity <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={row.quantity_used}
                        onChange={(e) => updateSpareRow(row.id, 'quantity_used', parseInt(e.target.value) || 1)}
                        className="h-9"
                        readOnly={readonly}
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1">
                    <Label className="text-xs">Remarks</Label>
                    <Textarea
                      value={row.remarks}
                      onChange={(e) => updateSpareRow(row.id, 'remarks', e.target.value)}
                      placeholder="Optional remarks about spare usage..."
                      rows={2}
                      className="text-sm"
                      readOnly={readonly}
                    />
                  </div>

                  {/* Cost Display */}
                  {row.spare && (
                    <div className="bg-gray-50 rounded p-2 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-semibold text-gray-900">
                        ₹{row.spare.unit_cost} × {row.quantity_used} = ₹{(row.spare.unit_cost * row.quantity_used).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* Total Cost */}
              {selectedSpares.length > 0 && (
                <div className="border-t-2 border-gray-300 pt-4 mt-4">
                  <div className="flex items-center justify-between bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">Total Spare Cost:</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-900">
                      ₹{calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
