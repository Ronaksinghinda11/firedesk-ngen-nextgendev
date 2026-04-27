/**
 * Generate Performance Report Modal
 * 
 * Modal for technicians to generate their performance report PDF
 * Features: Date range selection with presets, plant filter, modern UI
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Download, FileText, Clock, CheckCircle2, FileBarChart, Building2 } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { technicianCalendarApi } from '@/services/api/technicianCalendarApi';
import { toast } from 'sonner';

// Helper Date Picker Component (Indigo Theme)
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
                            date && 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20'
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
                            className="bg-indigo-500 hover:bg-indigo-600 text-white"
                        >
                            Apply
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

interface PerformanceReportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Plant {
    id: string;
    plantName: string;
}

type DatePreset = {
    label: string;
    icon: typeof Clock;
    getValue: () => { start: Date; end: Date };
};

const datePresets: DatePreset[] = [
    {
        label: 'Last 7 Days',
        icon: Clock,
        getValue: () => ({
            start: subDays(new Date(), 7),
            end: new Date()
        })
    },
    {
        label: 'Last 30 Days',
        icon: Clock,
        getValue: () => ({
            start: subDays(new Date(), 30),
            end: new Date()
        })
    },
    {
        label: 'This Month',
        icon: Clock,
        getValue: () => ({
            start: startOfMonth(new Date()),
            end: endOfMonth(new Date())
        })
    },
    {
        label: 'Last Month',
        icon: Clock,
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
        icon: Clock,
        getValue: () => ({
            start: startOfQuarter(new Date()),
            end: endOfQuarter(new Date())
        })
    },
    {
        label: 'This Year',
        icon: Clock,
        getValue: () => ({
            start: startOfYear(new Date()),
            end: endOfYear(new Date())
        })
    }
];

export function PerformanceReportModal({
    open,
    onOpenChange,
}: PerformanceReportModalProps) {
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [plants, setPlants] = useState<Plant[]>([]);
    const [selectedPlantId, setSelectedPlantId] = useState<string>('all');

    // Fetch technician's assigned plants on mount
    // Fetch technician's assigned plants on mount
    useEffect(() => {
        const fetchPlants = async () => {
            try {
                const plants = await technicianCalendarApi.getMyPlants();
                setPlants(plants);
            } catch (error) {
                console.error('Failed to fetch plants:', error);
            }
        };
        if (open) {
            fetchPlants();
        }
    }, [open]);

    const applyPreset = (preset: DatePreset) => {
        const { start, end } = preset.getValue();
        setStartDate(start);
        setEndDate(end);
        toast.success(`Date range set to ${preset.label}`);
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

            const { blobUrl, filename } = await technicianCalendarApi.generatePerformanceReportPDF(
                formattedStartDate,
                formattedEndDate,
                selectedPlantId !== 'all' ? selectedPlantId : undefined
            );

            // Open PDF in new tab
            window.open(blobUrl, '_blank');

            // Store URL for potential download
            setPdfUrl(blobUrl);

            // Show success
            setShowSuccess(true);
            toast.success('Performance report generated successfully!');

            // Reset success state after delay
            setTimeout(() => {
                setShowSuccess(false);
            }, 2000);
        } catch (error) {
            console.error('Report generation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate report. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (pdfUrl && startDate && endDate) {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `Performance_Report_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('PDF downloaded!');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="relative">
                    <div className="absolute -top-1 -right-1 w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-2xl" />
                    <DialogTitle className="flex items-center gap-3 text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                            <FileBarChart className="h-5 w-5 text-white" />
                        </div>
                        Performance Report
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Generate a PDF report of your service performance for any date range
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Date Range Section */}
                    <div className="space-y-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-indigo-600" />
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
                                        className="justify-start text-xs hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-all"
                                    >
                                        <preset.icon className="mr-1.5 h-3 w-3" />
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

                        {/* Plant Filter */}
                        {plants.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                                    Filter by Plant
                                </Label>
                                <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a plant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Plants</SelectItem>
                                        {plants.map((plant) => (
                                            <SelectItem key={plant.id} value={plant.id}>
                                                {plant.plantName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Report Info */}
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-lg border">
                        <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-indigo-600 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                                    Report Contents
                                </p>
                                <ul className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
                                    <li>• Your technician details and contact info</li>
                                    <li>• Reporting managers and assigned plants</li>
                                    <li>• Tasks (Services & Tickets) completed vs. lapsed</li>
                                    <li>• Detailed service and ticket log with status</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Ready to generate info */}
                    {startDate && endDate && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                                        Ready to generate
                                    </p>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                        Your PDF will include performance data from {format(startDate, 'MMM d, yyyy')} to {format(endDate, 'MMM d, yyyy')}.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    {pdfUrl && (
                        <Button
                            variant="outline"
                            onClick={handleDownload}
                            className="min-w-[100px]"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </Button>
                    )}
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
                        disabled={!startDate || !endDate || isGenerating}
                        className="min-w-[140px] bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all"
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
                                <FileBarChart className="mr-2 h-4 w-4" />
                                Generate PDF
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
