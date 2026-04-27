import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, CheckCircle2, Clock, FileText } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { dashboardApi } from '@/services/api/dashboardApi';
import { toast } from 'sonner';

// Helper Date Picker Component
const ReportDatePicker = ({
    id,
    date,
    setDate,
    label
}: {
    id: string;
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    label: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempDate, setTempDate] = useState<Date | undefined>(date);

    return (
        <div className="space-y-2">
            <Label htmlFor={id} className="text-sm">{label}</Label>
            <Popover open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (open) setTempDate(date);
            }}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        variant="outline"
                        className={cn(
                            'w-full justify-start text-left font-normal transition-all',
                            !date && 'text-muted-foreground',
                            date && 'border-orange-300 bg-orange-50/50 dark:bg-orange-900/20'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={tempDate}
                        onSelect={setTempDate}
                        initialFocus
                    />
                    <div className="flex items-center justify-end gap-2 p-3 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setTempDate(date);
                                setIsOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                setDate(tempDate);
                                setIsOpen(false);
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            Apply
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

type ReportType = 'service' | 'hp-test' | 'refill';
type ServiceType = 'Maintenance' | 'Inspection' | 'Testing';

interface PremiumReportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reportType: ReportType;
    serviceType?: ServiceType;
    plantId?: string;
    categoryId?: string;
}

type DatePreset = {
    label: string;
    getValue: () => { start: Date; end: Date };
};

const datePresets: DatePreset[] = [
    {
        label: 'Last 7 Days',
        getValue: () => ({
            start: subDays(new Date(), 7),
            end: new Date()
        })
    },
    {
        label: 'Last 30 Days',
        getValue: () => ({
            start: subDays(new Date(), 30),
            end: new Date()
        })
    },
    {
        label: 'This Month',
        getValue: () => ({
            start: startOfMonth(new Date()),
            end: endOfMonth(new Date())
        })
    },
    {
        label: 'Last Month',
        getValue: () => {
            const lastMonth = subMonths(new Date(), 1);
            return {
                start: startOfMonth(lastMonth),
                end: endOfMonth(lastMonth)
            };
        }
    },
    {
        label: 'This Quarter',
        getValue: () => ({
            start: startOfQuarter(new Date()),
            end: endOfQuarter(new Date())
        })
    },
    {
        label: 'This Year',
        getValue: () => ({
            start: startOfYear(new Date()),
            end: endOfYear(new Date())
        })
    }
];

const serviceReportColumns = [
    { id: 'assetId', label: 'Asset ID', category: 'Asset Details' },
    { id: 'type', label: 'Type', category: 'Asset Details' },
    { id: 'capacity', label: 'Capacity', category: 'Asset Details' },
    { id: 'capacityUnit', label: 'Unit', category: 'Asset Details' },
    { id: 'building', label: 'Building', category: 'Location' },
    { id: 'location', label: 'Location', category: 'Location' },
    { id: 'healthStatus', label: 'Health Status', category: 'Service Info' },
    { id: 'plantName', label: 'Plant', category: 'Location' },
    { id: 'technician', label: 'Technician', category: 'Service Info' },
    { id: 'scheduledDate', label: 'Scheduled Date', category: 'Dates' },
    { id: 'status', label: 'Status', category: 'Service Info' }
];

const hpTestColumns = [
    { id: 'assetId', label: 'Asset ID', category: 'Asset Details' },
    { id: 'type', label: 'Type', category: 'Asset Details' },
    { id: 'subType', label: 'Sub Type', category: 'Asset Details' },
    { id: 'capacity', label: 'Capacity', category: 'Asset Details' },
    { id: 'capacityUnit', label: 'Unit', category: 'Asset Details' },
    { id: 'location', label: 'Location', category: 'Location' },
    { id: 'building', label: 'Building', category: 'Location' },
    { id: 'manufacturer', label: 'Manufacturer', category: 'Technical' },
    { id: 'model', label: 'Model', category: 'Technical' },
    { id: 'lastHPTestDate', label: 'Last HP Test', category: 'Dates' },
    { id: 'nextHPTestDueDate', label: 'Next HP Test Due', category: 'Dates' },
    { id: 'hpTestStatus', label: 'Status', category: 'Service Info' }
];

const refillColumns = [
    { id: 'assetId', label: 'Asset ID', category: 'Asset Details' },
    { id: 'type', label: 'Type', category: 'Asset Details' },
    { id: 'subType', label: 'Sub Type', category: 'Asset Details' },
    { id: 'capacity', label: 'Capacity', category: 'Asset Details' },
    { id: 'capacityUnit', label: 'Unit', category: 'Asset Details' },
    { id: 'location', label: 'Location', category: 'Location' },
    { id: 'building', label: 'Building', category: 'Location' },
    { id: 'manufacturer', label: 'Manufacturer', category: 'Technical' },
    { id: 'model', label: 'Model', category: 'Technical' },
    { id: 'refilledOn', label: 'Last Refill Date', category: 'Dates' },
    { id: 'lastRefilledDate', label: 'Last Refilled', category: 'Dates' },
    { id: 'nextRefillDueDate', label: 'Next Refill Due', category: 'Dates' },
    { id: 'refillStatus', label: 'Status', category: 'Service Info' }
];

export function PremiumReportModal({
    open,
    onOpenChange,
    reportType,
    serviceType = 'Maintenance',
    plantId,
    categoryId
}: PremiumReportModalProps) {
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Get appropriate columns based on report type
    const getAvailableColumns = () => {
        switch (reportType) {
            case 'service':
                return serviceReportColumns;
            case 'hp-test':
                return hpTestColumns;
            case 'refill':
                return refillColumns;
            default:
                return [];
        }
    };

    const availableColumns = getAvailableColumns();

    // Default selected columns
    const getDefaultColumns = () => {
        switch (reportType) {
            case 'service':
                return ['assetId', 'type', 'capacity', 'building', 'location', 'healthStatus', 'scheduledDate', 'status'];
            case 'hp-test':
                return ['assetId', 'type', 'capacity', 'location', 'building', 'lastHPTestDate', 'nextHPTestDueDate', 'hpTestStatus'];
            case 'refill':
                return ['assetId', 'type', 'capacity', 'location', 'building', 'refilledOn', 'refillStatus'];
            default:
                return [];
        }
    };

    const [selectedColumns, setSelectedColumns] = useState<string[]>(getDefaultColumns());

    const toggleColumn = (columnId: string) => {
        setSelectedColumns(prev =>
            prev.includes(columnId)
                ? prev.filter(id => id !== columnId)
                : [...prev, columnId]
        );
    };

    const selectAllColumns = () => {
        setSelectedColumns(availableColumns.map(col => col.id));
    };

    const deselectAllColumns = () => {
        setSelectedColumns([]);
    };

    const applyPreset = (preset: DatePreset) => {
        const { start, end } = preset.getValue();
        setStartDate(start);
        setEndDate(end);
        toast.success(`Date range set to ${preset.label}`);
    };

    const getReportTitle = () => {
        switch (reportType) {
            case 'service':
                return `${serviceType} Report`;
            case 'hp-test':
                return 'Hydrostatic Test Report';
            case 'refill':
                return 'Refill Status Report';
            default:
                return 'Report';
        }
    };

    const handleGenerate = async () => {
        if (!startDate || !endDate) {
            toast.error('Please select both start and end dates');
            return;
        }

        if (endDate < startDate) {
            toast.error('End date must be after start date');
            return;
        }

        try {
            setIsGenerating(true);

            const formattedStartDate = format(startDate, 'yyyy-MM-dd');
            const formattedEndDate = format(endDate, 'yyyy-MM-dd');
            let blob: Blob;
            let filename: string;

            // Generate report based on type
            switch (reportType) {
                case 'hp-test':
                    blob = await dashboardApi.generateHPTestReport({
                        startDate: formattedStartDate,
                        endDate: formattedEndDate,
                        plantId: plantId && plantId !== 'all' ? plantId : undefined,
                        categoryId: categoryId && categoryId !== 'all' ? categoryId : undefined,
                        columns: selectedColumns.join(',')
                    });
                    filename = `HP_Test_Report_${formattedStartDate}_to_${formattedEndDate}.pdf`;
                    break;

                case 'refill':
                    blob = await dashboardApi.generateRefillReport({
                        startDate: formattedStartDate,
                        endDate: formattedEndDate,
                        plantId: plantId && plantId !== 'all' ? plantId : undefined,
                        categoryId: categoryId && categoryId !== 'all' ? categoryId : undefined,
                        columns: selectedColumns.join(',')
                    });
                    filename = `Refill_Status_Report_${formattedStartDate}_to_${formattedEndDate}.pdf`;
                    break;

                case 'service':
                default:
                    blob = await dashboardApi.generateServiceReport({
                        startDate: formattedStartDate,
                        endDate: formattedEndDate,
                        inspectionType: serviceType,
                        plantId: plantId && plantId !== 'all' ? plantId : undefined,
                        categoryId: categoryId && categoryId !== 'all' ? categoryId : undefined,
                        columns: selectedColumns.join(',')
                    });
                    filename = `${serviceType}_Report_${formattedStartDate}_to_${formattedEndDate}.pdf`;
                    break;
            }

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Show success animation
            setShowSuccess(true);
            toast.success('Report generated successfully!');

            // Close modal after short delay
            setTimeout(() => {
                setShowSuccess(false);
                onOpenChange(false);
            }, 1500);
        } catch (error) {
            console.error('Report generation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate report. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    // Group columns by category
    const columnsByCategory = availableColumns.reduce((acc, col) => {
        if (!acc[col.category]) acc[col.category] = [];
        acc[col.category].push(col);
        return acc;
    }, {} as Record<string, typeof availableColumns>);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="relative">
                    <div className="absolute -top-1 -right-1 w-20 h-20 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-2xl" />
                    <DialogTitle className="flex items-center gap-3 text-2xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        Generate {getReportTitle()}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Create a comprehensive PDF report with professional formatting and detailed analytics
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Date Range Section */}
                    <div className="space-y-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-orange-600" />
                                Report Period
                            </Label>
                            {startDate && endDate && (
                                <Badge variant="secondary" className="font-normal">
                                    {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                                </Badge>
                            )}
                        </div>

                        {/* Quick Date Presets */}
                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Quick Select</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {datePresets.map((preset) => (
                                    <Button
                                        key={preset.label}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyPreset(preset)}
                                        className="justify-start text-xs hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-all"
                                    >
                                        <Clock className="mr-1.5 h-3 w-3" />
                                        {preset.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Date Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <ReportDatePicker
                                id="start-date"
                                label="Start Date"
                                date={startDate}
                                setDate={setStartDate}
                            />
                            <ReportDatePicker
                                id="end-date"
                                label="End Date"
                                date={endDate}
                                setDate={setEndDate}
                            />
                        </div>
                    </div>

                    {/* Column Selection Section */}
                    <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <FileText className="h-4 w-4 text-orange-600" />
                                Report Columns
                            </Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectAllColumns}
                                    className="text-xs h-7"
                                >
                                    Select All
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={deselectAllColumns}
                                    className="text-xs h-7"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>

                        {/* Grouped Column Selection */}
                        <div className="space-y-3">
                            {Object.entries(columnsByCategory).map(([category, columns]) => (
                                <div key={category} className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                        {category}
                                    </Label>
                                    <div className="flex flex-wrap gap-2">
                                        {columns.map((column) => (
                                            <Badge
                                                key={column.id}
                                                variant={selectedColumns.includes(column.id) ? 'default' : 'outline'}
                                                className={cn(
                                                    "cursor-pointer transition-all duration-200 px-3 py-1.5",
                                                    selectedColumns.includes(column.id)
                                                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-transparent shadow-sm'
                                                        : 'hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700'
                                                )}
                                                onClick={() => toggleColumn(column.id)}
                                            >
                                                {column.label}
                                                {selectedColumns.includes(column.id) && (
                                                    <CheckCircle2 className="ml-1.5 h-3 w-3" />
                                                )}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                            <p className="text-sm text-muted-foreground">
                                {selectedColumns.length} of {availableColumns.length} columns selected
                            </p>
                            {selectedColumns.length === 0 && (
                                <p className="text-xs text-red-600">⚠️ Please select at least one column</p>
                            )}
                        </div>
                    </div>

                    {/* Report Preview Info */}
                    {startDate && endDate && selectedColumns.length > 0 && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                                        Ready to generate
                                    </p>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                        Your PDF will include {getReportTitle()} data from {format(startDate, 'MMM d, yyyy')} to {format(endDate, 'MMM d, yyyy')}
                                        {' '}with {selectedColumns.length} column{selectedColumns.length !== 1 ? 's' : ''} of information.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isGenerating}
                        className="min-w-[100px]"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={!startDate || !endDate || selectedColumns.length === 0 || isGenerating}
                        className="min-w-[140px] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all"
                    >
                        {showSuccess ? (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4 animate-bounce" />
                                Success!
                            </>
                        ) : isGenerating ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Generate PDF
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
