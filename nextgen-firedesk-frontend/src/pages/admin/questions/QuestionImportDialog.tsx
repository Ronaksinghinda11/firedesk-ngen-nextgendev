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
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { questionApi } from '@/services/api/questionApi';
import { parseFile } from '@/components/generic/utils/exportImportUtils';

interface ParsedData {
    headers: string[];
    data: Record<string, any>[];
}

interface QuestionImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportSuccess: () => void;
}

export function QuestionImportDialog({
    open,
    onOpenChange,
    onImportSuccess,
}: QuestionImportDialogProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        setParsedData(null);

        try {
            const result = await parseFile(file);
            setParsedData(result);

            toast({
                title: 'File Parsed Successfully',
                description: `Found ${result.data.length} records ready to review.`,
            });
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
        if (!selectedFile) {
            toast({
                title: 'No File',
                description: 'Please upload a file first.',
                variant: 'destructive',
            });
            return;
        }

        setIsImporting(true);

        try {
            const result = await questionApi.importQuestions(selectedFile);

            if (result.success) {
                toast({
                    title: 'Import Complete',
                    description: `Imported ${result.imported.length} questions. ${result.failed.length > 0 ? `Failed: ${result.failed.length}` : ''}`
                });

                // Show errors if any
                if (result.failed.length > 0) {
                    console.warn('Import failures:', result.failed);
                    // Could implement a detail view for errors here if needed
                }

                handleClose();
                onImportSuccess();
            } else {
                toast({
                    title: 'Import Failed',
                    description: result.message || 'Check the file format and try again',
                    variant: 'destructive'
                });
            }
        } catch (error: any) {
            console.error('Import error:', error);
            const errors = error.response?.data?.errors || [];
            const errorDetails = errors.length > 0
                ? `Row ${errors[0].row}: ${errors[0].error}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ''}`
                : error.response?.data?.message || 'Failed to import questions';

            toast({
                title: 'Import Error',
                description: errorDetails,
                variant: 'destructive',
            });
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await questionApi.downloadTemplate() as any;
            const blob = new Blob([response.data || response], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'questions_template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast({ title: 'Success', description: 'Template downloaded successfully' });
        } catch (error) {
            console.error('Error downloading template:', error);
            toast({ title: 'Error', description: 'Failed to download template', variant: 'destructive' });
        }
    };

    const resetState = () => {
        setSelectedFile(null);
        setParsedData(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        resetState();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-orange-500" />
                        Import Questions
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file to import questions.
                        Download the template first to ensure correct format.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Template Download Section */}
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h4 className="font-medium text-orange-900 text-sm">Download Import Template</h4>
                                <p className="text-xs text-orange-700 mt-1">
                                    Get the official template with all required fields.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadTemplate}
                                className="bg-white border-orange-200 text-orange-700 hover:bg-orange-50"
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Template
                            </Button>
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
                                ? 'border-orange-500 bg-orange-50'
                                : selectedFile
                                    ? 'border-orange-300 bg-orange-50'
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
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
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

                    {/* Success Preview */}
                    {parsedData && (
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                <div>
                                    <h4 className="font-medium text-emerald-900 text-sm">Ready to Import</h4>
                                    <p className="text-xs text-emerald-700">
                                        {parsedData.data.length} records parsed from file.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Preview */}
                    {parsedData && parsedData.data.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-3 py-2 border-b">
                                <h4 className="font-medium text-sm text-gray-700">Data Preview</h4>
                            </div>
                            <ScrollArea className="max-h-40">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            {parsedData.headers.slice(0, 5).map((header, index) => (
                                                <th key={index} className="px-3 py-2 text-left font-medium text-gray-600 border-b">
                                                    {header}
                                                </th>
                                            ))}
                                            {parsedData.headers.length > 5 && (
                                                <th className="px-3 py-2 text-left font-medium text-gray-400 border-b">
                                                    +{parsedData.headers.length - 5} more
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.data.slice(0, 5).map((row, rowIndex) => (
                                            <tr key={rowIndex} className="border-b last:border-b-0">
                                                {parsedData.headers.slice(0, 5).map((header, colIndex) => (
                                                    <td key={colIndex} className="px-3 py-2 text-gray-700 truncate max-w-[150px]">
                                                        {row[header] ?? '-'}
                                                    </td>
                                                ))}
                                                {parsedData.headers.length > 5 && (
                                                    <td className="px-3 py-2 text-gray-400">...</td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.data.length > 5 && (
                                    <div className="px-3 py-2 text-xs text-gray-500 text-center bg-gray-50">
                                        Showing 5 of {parsedData.data.length} records
                                    </div>
                                )}
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
                        onClick={handleImport}
                        disabled={isImporting || !selectedFile}
                        className="bg-orange-500 hover:bg-orange-600"
                    >
                        {isImporting ? (
                            <>
                                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Import {parsedData ? parsedData.data.length : ''} Records
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
