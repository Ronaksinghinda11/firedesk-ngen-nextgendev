// src/components/generic/components/ExportModal.tsx
// Modal dialog for exporting data with CSV/Excel format selection

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import type { FilterAttribute } from '../types/entity.types';
import {
    exportToCSV,
    exportToExcel,
    getExportColumns,
    type ExportFormat,
} from '../utils/exportImportUtils';

interface ExportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entities: any[];
    filterAttributes: FilterAttribute[];
    visibleColumns: string[]; // Column IDs that are currently visible on screen
    entityName: string;
    entityNamePlural: string;
}

export function ExportModal({
    open,
    onOpenChange,
    entities,
    filterAttributes,
    visibleColumns,
    entityName,
    entityNamePlural,
}: ExportModalProps) {
    const [format, setFormat] = useState<ExportFormat>('csv');
    const [isExporting, setIsExporting] = useState(false);

    // System fields to exclude from export
    const systemFields = ['created_at', 'updated_at', 'deleted_at', 'createdAt', 'updatedAt', 'deletedAt'];

    // Filter to only visible columns AND exclude system fields
    const visibleFilterAttributes = filterAttributes.filter(attr =>
        visibleColumns.includes(attr.id) && !systemFields.includes(attr.id)
    );

    const handleExport = async () => {
        if (entities.length === 0) {
            toast({
                title: 'No Data to Export',
                description: `There are no ${entityNamePlural.toLowerCase()} to export with the current filters.`,
                variant: 'destructive',
            });
            return;
        }

        setIsExporting(true);

        try {
            const columns = getExportColumns(visibleFilterAttributes);
            const filename = `${entityNamePlural.toLowerCase()}_${new Date().toISOString().split('T')[0]}`;

            if (format === 'csv') {
                exportToCSV(entities, columns, filename);
            } else {
                exportToExcel(entities, columns, filename);
            }

            toast({
                title: 'Export Successful',
                description: `Exported ${entities.length} ${entityNamePlural.toLowerCase()} to ${format.toUpperCase()} file.`,
            });

            onOpenChange(false);
        } catch (error: any) {
            console.error('Export error:', error);
            toast({
                title: 'Export Failed',
                description: error.message || 'Failed to export data.',
                variant: 'destructive',
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-blue-500" />
                        Export {entityNamePlural}
                    </DialogTitle>
                    <DialogDescription>
                        Export {entities.length} {entityNamePlural.toLowerCase()} with the current filters applied.
                        Choose your preferred file format.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Label className="text-sm font-medium mb-3 block">Select Format</Label>
                    <RadioGroup
                        value={format}
                        onValueChange={(value) => setFormat(value as ExportFormat)}
                        className="grid grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem
                                value="csv"
                                id="csv"
                                className="peer sr-only"
                            />
                            <Label
                                htmlFor="csv"
                                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 cursor-pointer transition-all"
                            >
                                <FileText className="h-8 w-8 mb-2 text-green-600" />
                                <span className="font-medium">CSV</span>
                                <span className="text-xs text-muted-foreground">Comma-separated values</span>
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem
                                value="excel"
                                id="excel"
                                className="peer sr-only"
                            />
                            <Label
                                htmlFor="excel"
                                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 cursor-pointer transition-all"
                            >
                                <FileSpreadsheet className="h-8 w-8 mb-2 text-green-700" />
                                <span className="font-medium">Excel</span>
                                <span className="text-xs text-muted-foreground">Microsoft Excel (.xlsx)</span>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                        <span className="font-medium">Columns:</span>
                        {visibleFilterAttributes.length} visible fields will be exported
                    </p>
                    <p className="flex items-center gap-2 mt-1">
                        <span className="font-medium">Records:</span>
                        {entities.length} {entityNamePlural.toLowerCase()}
                    </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isExporting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting || entities.length === 0}
                        className="bg-blue-500 hover:bg-blue-600"
                    >
                        {isExporting ? (
                            <>
                                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                Export {format.toUpperCase()}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
