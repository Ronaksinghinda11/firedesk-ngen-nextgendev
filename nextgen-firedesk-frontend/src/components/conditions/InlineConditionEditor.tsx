// src/components/conditions/InlineConditionEditor.tsx
// Excel-like inline table editor for bulk condition creation/editing

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface ConditionRow {
    id?: string;
    slNo: number;
    conditionName: string;
    severityLevel: string;
    priorityScore: string;
    healthImpact: string;
    recommendedAction: string;
    requiresImmediateAction: boolean;
    isNew: boolean;
}

interface InlineConditionEditorProps {
    editingCondition?: any;
    onCancel: () => void;
    onSaveComplete: () => void;
}

const severityOptions = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const healthImpactOptions = ['Healthy', 'Need Attention', 'Not Working', 'Inventory', 'Under Maintenance', 'De-Active'];

export default function InlineConditionEditor({
    editingCondition,
    onCancel,
    onSaveComplete
}: InlineConditionEditorProps) {
    const [rows, setRows] = useState<ConditionRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize rows
    useEffect(() => {
        if (editingCondition) {
            setRows([{
                id: editingCondition.id,
                slNo: 1,
                conditionName: editingCondition.condition_name || editingCondition.conditionName || '',
                severityLevel: editingCondition.severity_level || editingCondition.severityLevel || 'MEDIUM',
                priorityScore: String(editingCondition.priority_score || editingCondition.priorityScore || 50),
                healthImpact: editingCondition.health_impact || editingCondition.healthImpact || 'Healthy',
                recommendedAction: editingCondition.recommended_action || editingCondition.recommendedAction || '',
                requiresImmediateAction: editingCondition.requires_immediate_action || editingCondition.requiresImmediateAction || false,
                isNew: false
            }]);
        } else {
            setRows([createEmptyRow(1)]);
        }
    }, [editingCondition]);

    const createEmptyRow = (slNo: number): ConditionRow => ({
        slNo,
        conditionName: '',
        severityLevel: 'MEDIUM',
        priorityScore: '50',
        healthImpact: 'Healthy',
        recommendedAction: '',
        requiresImmediateAction: false,
        isNew: true
    });

    // Auto-save completed rows when clicking Add Row
    const handleAddRow = async () => {
        const completedUnsavedRows = rows.filter(r =>
            r.isNew && r.conditionName.trim() && r.severityLevel && r.priorityScore && r.healthImpact
        );

        if (completedUnsavedRows.length > 0) {
            setIsSaving(true);
            try {
                const conditionsToCreate = completedUnsavedRows.map(row => ({
                    condition_name: row.conditionName.trim(),
                    severity_level: row.severityLevel,
                    priority_score: parseInt(row.priorityScore) || 50,
                    health_impact: row.healthImpact,
                    recommended_action: row.recommendedAction || null,
                    requires_immediate_action: row.requiresImmediateAction,
                    is_active: true
                }));

                console.log('[InlineConditionEditor] Auto-saving conditions:', JSON.stringify(conditionsToCreate, null, 2));

                const response: any = await api.post('/master-data/conditions/bulk', { conditions: conditionsToCreate });

                if (response.success) {
                    toast({ title: 'Auto-Saved', description: `${response.results?.success?.length || conditionsToCreate.length} condition(s) saved` });

                    const updatedRows = rows.map(r => {
                        if (r.isNew && r.conditionName.trim() && r.severityLevel && r.priorityScore && r.healthImpact) {
                            return { ...r, isNew: false };
                        }
                        return r;
                    });
                    setRows([...updatedRows, createEmptyRow(updatedRows.length + 1)]);
                } else {
                    toast({ title: 'Save Warning', description: response.message || 'Some conditions may not have been saved', variant: 'destructive' });
                    setRows([...rows, createEmptyRow(rows.length + 1)]);
                }
            } catch (error: any) {
                console.error('Auto-save error:', error);
                toast({ title: 'Auto-Save Failed', description: error.message || 'Failed to save. Data will be kept.', variant: 'destructive' });
                setRows([...rows, createEmptyRow(rows.length + 1)]);
            } finally {
                setIsSaving(false);
            }
        } else {
            setRows([...rows, createEmptyRow(rows.length + 1)]);
        }
    };

    const handleDeleteRow = (index: number) => {
        if (rows.length > 1) {
            const updated = rows.filter((_, i) => i !== index).map((r, i) => ({ ...r, slNo: i + 1 }));
            setRows(updated);
        }
    };

    const handleRowChange = (index: number, field: keyof ConditionRow, value: any) => {
        const updated = [...rows];
        updated[index] = { ...updated[index], [field]: value };
        setRows(updated);
    };

    const handleSaveAll = async () => {
        const invalidRows = rows.filter(r => !r.conditionName.trim() || !r.severityLevel || !r.priorityScore || !r.healthImpact);
        if (invalidRows.length > 0) {
            toast({ title: 'Validation Error', description: 'Each row must have Name, Severity, Priority, and Health Impact.', variant: 'destructive' });
            return;
        }

        // Validate priority score range
        const invalidPriority = rows.filter(r => {
            const score = parseInt(r.priorityScore);
            return isNaN(score) || score < 0 || score > 100;
        });
        if (invalidPriority.length > 0) {
            toast({ title: 'Validation Error', description: 'Priority Score must be between 0 and 100.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);

        try {
            if (editingCondition) {
                const row = rows[0];
                const payload = {
                    condition_name: row.conditionName.trim(),
                    severity_level: row.severityLevel,
                    priority_score: parseInt(row.priorityScore) || 50,
                    health_impact: row.healthImpact,
                    recommended_action: row.recommendedAction || null,
                    requires_immediate_action: row.requiresImmediateAction,
                    is_active: true
                };

                await api.put(`/master-data/conditions/${editingCondition.id}`, payload);
                toast({ title: 'Success', description: 'Condition updated successfully' });
                onSaveComplete();
            } else {
                const unsavedRows = rows.filter(r => r.isNew);
                if (unsavedRows.length === 0) {
                    toast({ title: 'Info', description: 'All conditions already saved' });
                    onSaveComplete();
                    return;
                }

                const conditionsToCreate = unsavedRows.map(row => ({
                    condition_name: row.conditionName.trim(),
                    severity_level: row.severityLevel,
                    priority_score: parseInt(row.priorityScore) || 50,
                    health_impact: row.healthImpact,
                    recommended_action: row.recommendedAction || null,
                    requires_immediate_action: row.requiresImmediateAction,
                    is_active: true
                }));

                const response: any = await api.post('/master-data/conditions/bulk', { conditions: conditionsToCreate });

                if (response.success) {
                    toast({ title: 'Success', description: response.message });
                } else {
                    toast({ title: 'Partial Success', description: response.message, variant: 'destructive' });
                }
                onSaveComplete();
            }
        } catch (error: any) {
            console.error('Save error:', error);
            toast({ title: 'Error', description: error.message || 'Failed to save conditions', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-3 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    {editingCondition ? 'Edit Condition' : 'Add Conditions'}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-1" />
                        {isSaving ? 'Saving...' : 'Save All'}
                    </Button>
                </div>
            </div>

            {/* Instruction */}
            <p className="text-xs text-muted-foreground">
                Fill each row. Data is auto-saved when clicking Add Row. Priority Score: 0-100.
            </p>

            {/* Table */}
            <div className="border rounded-lg overflow-visible relative z-20">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-[40px] text-xs">#</TableHead>
                            <TableHead className="min-w-[160px] text-xs">Condition Name *</TableHead>
                            <TableHead className="min-w-[100px] text-xs">Severity *</TableHead>
                            <TableHead className="min-w-[80px] text-xs">Priority *</TableHead>
                            <TableHead className="min-w-[120px] text-xs">Health Impact *</TableHead>
                            <TableHead className="min-w-[150px] text-xs">Recommended Action</TableHead>
                            <TableHead className="w-[60px] text-xs">Immediate</TableHead>
                            <TableHead className="w-[40px] text-xs"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index} className={`hover:bg-gray-50 ${!row.isNew ? 'bg-green-50' : ''}`}>
                                <TableCell className="text-xs text-center font-medium">{row.slNo}</TableCell>

                                {/* Condition Name */}
                                <TableCell className="p-1">
                                    <Input
                                        value={row.conditionName}
                                        onChange={(e) => handleRowChange(index, 'conditionName', e.target.value)}
                                        placeholder="Condition name"
                                        className="h-7 text-xs"
                                    />
                                </TableCell>

                                {/* Severity Level */}
                                <TableCell className="p-1">
                                    <Select value={row.severityLevel} onValueChange={(value) => handleRowChange(index, 'severityLevel', value)}>
                                        <SelectTrigger className="h-7 text-xs">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {severityOptions.map((opt) => (
                                                <SelectItem key={opt} value={opt} className="text-xs">
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>

                                {/* Priority Score */}
                                <TableCell className="p-1">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={row.priorityScore}
                                        onChange={(e) => handleRowChange(index, 'priorityScore', e.target.value)}
                                        placeholder="0-100"
                                        className="h-7 text-xs"
                                    />
                                </TableCell>

                                {/* Health Impact */}
                                <TableCell className="p-1">
                                    <Select value={row.healthImpact} onValueChange={(value) => handleRowChange(index, 'healthImpact', value)}>
                                        <SelectTrigger className="h-7 text-xs">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {healthImpactOptions.map((opt) => (
                                                <SelectItem key={opt} value={opt} className="text-xs">
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>

                                {/* Recommended Action */}
                                <TableCell className="p-1">
                                    <Input
                                        value={row.recommendedAction}
                                        onChange={(e) => handleRowChange(index, 'recommendedAction', e.target.value)}
                                        placeholder="Action..."
                                        className="h-7 text-xs"
                                    />
                                </TableCell>

                                {/* Requires Immediate Action */}
                                <TableCell className="p-1 text-center">
                                    <Checkbox
                                        checked={row.requiresImmediateAction}
                                        onCheckedChange={(checked) => handleRowChange(index, 'requiresImmediateAction', checked)}
                                    />
                                </TableCell>

                                {/* Delete */}
                                <TableCell className="p-1">
                                    {rows.length > 1 && (
                                        <button
                                            onClick={() => handleDeleteRow(index)}
                                            title="Delete row"
                                            className="p-1 hover:bg-gray-100 rounded text-red-500"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Add Row Button */}
            <Button variant="outline" size="sm" onClick={handleAddRow} disabled={isSaving} className="w-full mt-8 relative z-0">
                <Plus className="h-4 w-4 mr-1" /> Add Row
            </Button>
        </div>
    );
}
