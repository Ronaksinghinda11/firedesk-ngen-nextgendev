// src/components/generic/components/ImportModal.tsx
// Modal dialog for importing data with drag-drop support and template download

import { useState, useRef, useCallback } from 'react';
import {
    Upload,
    Download,
    FileSpreadsheet,
    FileText,
    X,
    AlertCircle,
    CheckCircle2,
    FileUp,
} from 'lucide-react';
import { ImportPreviewDialog } from './ImportPreviewDialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { FilterAttribute } from '../types/entity.types';
import {
    generateTemplate,
    getExportColumns,
    parseFile,
    validateImportData,
    mapImportDataToColumns,
    type ExportFormat,
    type ExportColumn,
} from '../utils/exportImportUtils';

// Import fields definition - all DB writable fields for template
export interface ImportField {
    id: string;      // Database field name
    label: string;   // Human-readable label
    required?: boolean; // If true, marked with *
}

interface ImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filterAttributes: FilterAttribute[];
    importFields?: ImportField[]; // All DB fields for import template (if not provided, uses filterAttributes)
    entityName: string;
    entityNamePlural: string;
    apiEndpoint: string;
    onImportComplete?: () => void;
}

interface ParsedData {
    headers: string[];
    data: Record<string, any>[];
}

export function ImportModal({
    open,
    onOpenChange,
    filterAttributes,
    importFields,
    entityName,
    entityNamePlural,
    apiEndpoint,
    onImportComplete,
}: ImportModalProps) {
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [templateFormat, setTemplateFormat] = useState<ExportFormat>('csv');
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use importFields if provided, otherwise fall back to filterAttributes
    const templateColumns: ExportColumn[] = importFields
        ? importFields.map(f => ({ id: f.id, label: f.label, required: f.required }))
        : getExportColumns(filterAttributes);

    const handleDownloadTemplate = () => {
        generateTemplate(templateColumns, templateFormat, entityName);
        toast({
            title: 'Template Downloaded',
            description: `Import template downloaded as ${templateFormat.toUpperCase()} file. Fill in your data and upload.`,
        });
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await processFile(files[0]);
        }
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await processFile(files[0]);
        }
    };

    const processFile = async (file: File) => {
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
            toast({
                title: 'Invalid File Type',
                description: 'Please upload a CSV or Excel (.xlsx, .xls) file.',
                variant: 'destructive',
            });
            return;
        }

        setSelectedFile(file);
        setIsParsing(true);
        setValidationErrors([]);
        setParsedData(null);

        try {
            const result = await parseFile(file);
            setParsedData(result);

            // Validate the data
            const validation = validateImportData(result.data, templateColumns, result.headers);
            setValidationErrors(validation.errors);

            if (validation.valid) {
                toast({
                    title: 'File Parsed Successfully',
                    description: `Found ${result.data.length} records ready to import.`,
                });
            } else {
                toast({
                    title: 'Validation Warnings',
                    description: `Found ${validation.errors.length} issues. Please review before importing.`,
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            console.error('Parse error:', error);
            toast({
                title: 'Parse Error',
                description: error.message || 'Failed to parse file.',
                variant: 'destructive',
            });
            setSelectedFile(null);
        } finally {
            setIsParsing(false);
        }
    };

    const handleImport = async () => {
        if (!parsedData || parsedData.data.length === 0) {
            toast({
                title: 'No Data to Import',
                description: 'Please upload a file with data first.',
                variant: 'destructive',
            });
            return;
        }

        setIsImporting(true);

        try {
            // Map the data to column IDs
            const mappedData = mapImportDataToColumns(parsedData.data, templateColumns);

            console.log('📤 Import - Mapped data:', mappedData);
            console.log('📤 Import - Endpoint:', `${apiEndpoint}/bulk-import`);
            console.log('📤 Import - Records count:', mappedData.length);

            // Send to bulk import endpoint
            const response = await api.post(`${apiEndpoint}/bulk-import`, {
                records: mappedData,
            });

            console.log('✅ Import - Response:', response);

            const result = response as any;
            const createdCount = result.created || 0;
            const updatedCount = result.updated || 0;
            const importedCount = result.imported || createdCount + updatedCount || mappedData.length;
            const errors = result.errors || [];

            if (errors.length > 0) {
                console.warn('⚠️ Import - Errors:', errors);
                // Build detailed error message showing first few errors
                const errorDetails = errors.slice(0, 3).map((e: any) =>
                    `Row ${e.row}: ${e.error || e.message || 'Unknown error'}`
                ).join('\n');
                const moreErrorsText = errors.length > 3 ? `\n... and ${errors.length - 3} more errors` : '';

                toast({
                    title: 'Import Completed with Errors',
                    description: `Created ${createdCount}, Updated ${updatedCount}. ${errors.length} errors occurred.\n${errorDetails}${moreErrorsText}`,
                    variant: 'destructive',
                });

                // Also set validation errors to show in UI
                setValidationErrors(errors.map((e: any) =>
                    `Row ${e.row}: ${e.error || e.message || 'Unknown error'}`
                ));
            } else if (createdCount > 0 || updatedCount > 0) {
                // Show breakdown when upsert data is available
                toast({
                    title: 'Import Successful',
                    description: `Created ${createdCount} new, Updated ${updatedCount} existing ${entityNamePlural.toLowerCase()}.`,
                });
            } else {
                toast({
                    title: 'Import Successful',
                    description: `Successfully imported ${importedCount} ${entityNamePlural.toLowerCase()}.`,
                });
            }

            // Reset state and close modal
            resetState();
            onOpenChange(false);
            onImportComplete?.();
        } catch (error: any) {
            console.error('❌ Import error:', error);
            console.error('❌ Import error response:', error.response);

            // Handle specific error responses - check for row-level errors in response
            let errorMessage = 'Failed to import data.';
            const responseData = error.response?.data;

            if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
                // Has row-level errors
                const rowErrors = responseData.errors.slice(0, 3).map((e: any) =>
                    `Row ${e.row}: ${e.error || e.message || 'Unknown error'}`
                ).join('\n');
                errorMessage = `${responseData.errors.length} errors occurred:\n${rowErrors}`;
                if (responseData.errors.length > 3) {
                    errorMessage += `\n... and ${responseData.errors.length - 3} more`;
                }

                // Show errors in validation section
                setValidationErrors(responseData.errors.map((e: any) =>
                    `Row ${e.row}: ${e.error || e.message || 'Unknown error'}`
                ));
            } else if (responseData?.message) {
                errorMessage = responseData.message;
            } else if (responseData?.error) {
                errorMessage = responseData.error;
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast({
                title: 'Import Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsImporting(false);
        }
    };

    const resetState = () => {
        setStep('upload');
        setSelectedFile(null);
        setParsedData(null);
        setValidationErrors([]);
        setShowPreview(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        resetState();
        onOpenChange(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-emerald-500" />
                            Import {entityNamePlural}
                        </DialogTitle>
                        <DialogDescription>
                            Upload a CSV or Excel file to import {entityNamePlural.toLowerCase()}.
                            Download the template first to ensure correct format.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 space-y-4">
                        {/* Template Download Section */}
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-medium text-blue-900 text-sm">Download Import Template</h4>
                                    <p className="text-xs text-blue-700 mt-1">
                                        Get a template with all required fields. Mandatory fields are marked with *.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroup
                                        value={templateFormat}
                                        onValueChange={(value) => setTemplateFormat(value as ExportFormat)}
                                        className="flex gap-2"
                                    >
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem value="csv" id="template-csv" />
                                            <Label htmlFor="template-csv" className="text-xs cursor-pointer">CSV</Label>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem value="excel" id="template-excel" />
                                            <Label htmlFor="template-excel" className="text-xs cursor-pointer">Excel</Label>
                                        </div>
                                    </RadioGroup>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadTemplate}
                                        className="bg-white"
                                    >
                                        <Download className="h-4 w-4 mr-1" />
                                        Template
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Drop Zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDragging
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : selectedFile
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                }
            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {isParsing ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                                    <p className="text-sm text-gray-600">Parsing file...</p>
                                </div>
                            ) : selectedFile ? (
                                <div className="flex flex-col items-center gap-2">
                                    {selectedFile.name.endsWith('.csv') ? (
                                        <FileText className="h-10 w-10 text-green-600" />
                                    ) : (
                                        <FileSpreadsheet className="h-10 w-10 text-green-700" />
                                    )}
                                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {parsedData ? `${parsedData.data.length} records found` : 'Processing...'}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            resetState();
                                        }}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Remove File
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <FileUp className="h-10 w-10 text-gray-400" />
                                    <p className="text-sm font-medium text-gray-700">
                                        Drop your file here, or click to browse
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Supports CSV and Excel (.xlsx, .xls) files
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="font-medium text-red-900 text-sm">Validation Issues</h4>
                                        <ScrollArea className="max-h-24 mt-2">
                                            <ul className="text-xs text-red-700 space-y-1">
                                                {validationErrors.map((error, index) => (
                                                    <li key={index}>• {error}</li>
                                                ))}
                                            </ul>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Success Preview */}
                        {parsedData && validationErrors.length === 0 && (
                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    <div>
                                        <h4 className="font-medium text-emerald-900 text-sm">Ready to Import</h4>
                                        <p className="text-xs text-emerald-700">
                                            {parsedData.data.length} records validated and ready to import.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Data Preview - Enhanced to show all rows/columns */}
                        {parsedData && parsedData.data.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                                    <h4 className="font-medium text-sm text-gray-700">Data Preview</h4>
                                    <span className="text-xs text-gray-500">
                                        {parsedData.data.length} rows × {parsedData.headers.length} columns
                                    </span>
                                </div>
                                <ScrollArea className="max-h-[300px]">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs min-w-max">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-2 py-2 text-left font-medium text-gray-400 border-b w-10">#</th>
                                                    {parsedData.headers.map((header, index) => (
                                                        <th key={index} className="px-3 py-2 text-left font-medium text-gray-600 border-b whitespace-nowrap">
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedData.data.map((row, rowIndex) => (
                                                    <tr key={rowIndex} className="border-b last:border-b-0 hover:bg-gray-50">
                                                        <td className="px-2 py-2 text-gray-400 text-center">{rowIndex + 1}</td>
                                                        {parsedData.headers.map((header, colIndex) => (
                                                            <td key={colIndex} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                                                                {row[header] ?? '-'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            disabled={isImporting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => setShowPreview(true)}
                            disabled={isImporting || !parsedData || parsedData.data.length === 0}
                            className="bg-emerald-500 hover:bg-emerald-600"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Preview Import ({parsedData?.data.length || 0} Records)
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Separate Preview Confirmation Dialog */}
            {
                parsedData && (
                    <ImportPreviewDialog
                        open={showPreview}
                        onOpenChange={setShowPreview}
                        data={parsedData.data}
                        headers={parsedData.headers}
                        entityNamePlural={entityNamePlural}
                        validationErrors={validationErrors}
                        onConfirmImport={handleImport}
                        isImporting={isImporting}
                    />
                )}
        </>
    );
}
