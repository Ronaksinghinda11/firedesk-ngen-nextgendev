import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: Record<string, any>[];
    headers: string[];
    entityNamePlural: string;
    validationErrors: string[];
    onConfirmImport: () => void;
    isImporting: boolean;
}

export function ImportPreviewDialog({
    open,
    onOpenChange,
    data,
    headers,
    entityNamePlural,
    validationErrors,
    onConfirmImport,
    isImporting,
}: ImportPreviewDialogProps) {
    const hasErrors = validationErrors.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {hasErrors ? (
                            <>
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                Import Preview - Validation Errors
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                Import Preview - Ready to Import
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Review your import data before proceeding. {data.length} rows × {headers.length} columns
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden space-y-4">
                    {/* Validation Errors */}
                    {hasErrors && (
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-red-900 text-sm mb-2">
                                        {validationErrors.length} Validation {validationErrors.length === 1 ? 'Error' : 'Errors'} Found
                                    </h4>
                                    <div className="max-h-32 overflow-y-auto pr-2">
                                        <ul className="text-xs text-red-700 space-y-1">
                                            {validationErrors.map((error, index) => (
                                                <li key={index} className="font-mono">• {error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Preview Table */}
                    <div className="border rounded-lg overflow-hidden flex-1">
                        <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                            <h4 className="font-medium text-sm text-gray-700">Import Data Preview</h4>
                            <span className="text-xs text-gray-500">
                                Showing all {data.length} rows
                            </span>
                        </div>
                        <div className="h-[400px] overflow-auto border border-gray-200 rounded-md">
                            <table className="w-full text-xs min-w-max border-collapse">
                                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-2 py-2 text-left font-medium text-gray-500 border-b w-12 bg-gray-50">#</th>
                                        {headers.map((header, index) => (
                                            <th key={index} className="px-3 py-2 text-left font-medium text-gray-600 border-b whitespace-nowrap bg-gray-50">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-b last:border-b-0 hover:bg-gray-50/50">
                                            <td className="px-2 py-2 text-gray-400 text-center font-mono text-[10px] border-r border-gray-100 bg-gray-50/30">{rowIndex + 1}</td>
                                            {headers.map((header, colIndex) => (
                                                <td key={colIndex} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[250px] truncate border-r border-gray-100 last:border-r-0" title={row[header]}>
                                                    {row[header] || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isImporting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirmImport}
                        disabled={isImporting || hasErrors}
                        className="bg-emerald-500 hover:bg-emerald-600"
                    >
                        {isImporting ? (
                            <>
                                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Confirm Import {data.length} Records
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
