import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Minus,
    Save,
    Trash2,
    Factory,
    ChevronRight,
    ChevronDown,
    Calendar,
    Clock,
    AlertCircle,
    Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { schedulerApi, Scheduler, BulkSchedulerDto } from '@/services/api/schedulerApi';
import { plantService } from '@/services/plant.service';
import { frequencyApi } from '@/services/api/serviceFormApi';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { EntityHistoryDrawer } from '@/components/generic/components/EntityHistoryDrawer';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { usePlantFilter } from '@/contexts/PlantFilterContext';

// Interfaces
interface Category {
    id: string;
    category_name?: string;
    categoryName?: string;
}

interface Plant {
    id: string;
    plant_name?: string;
    plantName?: string;
    plant_code?: string;
    plantCode?: string;
    categories?: Category[];
}

interface SchedulerRow {
    id: string;
    category_id: string;
    schedule_start_date: string;
    schedule_end_date: string;
    inspection_frequency: string[];
    testing_frequency: string[];
    maintenance_frequency: string[];
    is_active: boolean;
    isNew: boolean;
    hasStarted: boolean;
}

// Helper function to generate a unique temp ID
const generateId = () => `temp_${Math.random().toString(36).substr(2, 9)}`;

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
};

// Helper function to get tomorrow's date in YYYY-MM-DD format
const getTomorrowDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
};

// Check if a scheduler has started (start date <= today)
const hasSchedulerStarted = (startDate: string): boolean => {
    if (!startDate) return false;
    return startDate <= getTodayDate();
};

// Frequency options - will be loaded from database
interface FrequencyOption {
    value: string;
    label: string;
    code: string;
}

export default function SchedulerPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { selectedPlantId } = usePlantFilter();

    // -- Expand/Collapse State --
    const [expandedPlants, setExpandedPlants] = useState<Set<string>>(new Set());

    // -- Local State for Scheduler Rows (grouped by plant) --
    const [rowsByPlant, setRowsByPlant] = useState<Record<string, SchedulerRow[]>>({});
    const [originalRowsByPlant, setOriginalRowsByPlant] = useState<Record<string, SchedulerRow[]>>({});
    const [isInitialized, setIsInitialized] = useState(false);

    // -- History Drawer State --
    const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
    const [selectedHistoryRow, setSelectedHistoryRow] = useState<SchedulerRow | null>(null);
    const [historyPlantId, setHistoryPlantId] = useState<string | null>(null);

    const handleViewHistory = (plantId: string, row: SchedulerRow) => {
        setSelectedHistoryRow(row);
        setHistoryPlantId(plantId);
        setHistoryDrawerOpen(true);
    };

    // -- Data Queries --
    const { data: plants = [], isLoading: isLoadingPlants } = useQuery({
        queryKey: ['plants', selectedPlantId], // Include selectedPlantId in queryKey to refetch when filter changes
        queryFn: async () => {
            const res = await plantService.getAllPlants();
            const allPlants = res.plants || [];
            if (!selectedPlantId || selectedPlantId === 'all') {
                return allPlants;
            }
            return allPlants.filter((p: Plant) => p.id === selectedPlantId);
        }
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get<any>('/master-data/categories/active');
            const list = res.activeCategories || res.allCategory || res.data || res || [];
            return Array.isArray(list) ? list : [];
        }
    });

    const { data: existingSchedulers = [], isSuccess: isSchedulersLoaded } = useQuery({
        queryKey: ['schedulers'],
        queryFn: async () => {
            return await schedulerApi.getAll();
        }
    });

    // Fetch frequencies from database
    const { data: frequencies = [] } = useQuery({
        queryKey: ['inspection-frequencies'],
        queryFn: async () => {
            return await frequencyApi.getAll();
        }
    });

    // Transform frequencies to options format
    const frequencyOptions: FrequencyOption[] = useMemo(() => {
        return frequencies.map(f => ({
            value: f.frequency_name,
            label: f.frequency_name,
            code: f.frequency_code
        }));
    }, [frequencies]);

    // -- Helper: Get categories for a plant --
    const getPlantCategories = (plant: Plant) => {
        const plantCategoryIds = plant.categories?.map((c: Category) => c.id) || [];
        return categories.filter((c: Category) => plantCategoryIds.includes(c.id));
    };

    // -- Helper: Get schedulers for a plant --
    const getPlantSchedulerRows = (plantId: string) => {
        return rowsByPlant[plantId] || [];
    };

    // -- Parse frequency string to array --
    const parseFrequencyString = (freq: string | null): string[] => {
        if (!freq) return [];
        return freq.split(',').map(f => f.trim()).filter(Boolean);
    };

    // -- Convert frequency array to string --
    const frequencyArrayToString = (freqs: string[]): string => {
        return freqs.join(', ');
    };

    // -- Reset initialization when plant filter changes --
    useEffect(() => {
        setIsInitialized(false);
    }, [selectedPlantId]);

    // -- Initialize rows grouped by plant --
    useEffect(() => {
        if (isSchedulersLoaded && plants.length > 0 && !isInitialized) {
            const newRowsByPlant: Record<string, SchedulerRow[]> = {};
            const origRowsByPlant: Record<string, SchedulerRow[]> = {};

            // Initialize empty arrays for each plant
            plants.forEach((plant: Plant) => {
                newRowsByPlant[plant.id] = [];
                origRowsByPlant[plant.id] = [];
            });

            // Map existing schedulers to plants
            existingSchedulers.forEach((scheduler: Scheduler) => {
                const plantId = scheduler.plant_id;
                if (newRowsByPlant[plantId]) {
                    const row: SchedulerRow = {
                        id: scheduler.id,
                        category_id: scheduler.category_id,
                        schedule_start_date: scheduler.schedule_start_date,
                        schedule_end_date: scheduler.schedule_end_date,
                        inspection_frequency: parseFrequencyString(scheduler.inspection_frequency),
                        testing_frequency: parseFrequencyString(scheduler.testing_frequency),
                        maintenance_frequency: parseFrequencyString(scheduler.maintenance_frequency),
                        is_active: scheduler.is_active,
                        isNew: false,
                        hasStarted: hasSchedulerStarted(scheduler.schedule_start_date)
                    };
                    newRowsByPlant[plantId].push(row);
                    origRowsByPlant[plantId].push({ ...row });
                }
            });

            setRowsByPlant(newRowsByPlant);
            setOriginalRowsByPlant(origRowsByPlant);
            setIsInitialized(true);
        }
    }, [isSchedulersLoaded, existingSchedulers, plants, isInitialized, selectedPlantId]); // Added selectedPlantId dependency to re-init when filter changes

    // -- Stats Calculation --
    const stats = useMemo(() => {
        const totalPlants = plants.length;
        let totalSchedulers = 0;
        let activeSchedulers = 0;
        let plantsWithSchedulers = 0;

        Object.entries(rowsByPlant).forEach(([plantId, rows]) => {
            if (rows.length > 0) {
                plantsWithSchedulers++;
                rows.forEach((row) => {
                    totalSchedulers++;
                    if (row.is_active) activeSchedulers++;
                });
            }
        });

        return { totalPlants, totalSchedulers, activeSchedulers, plantsWithSchedulers };
    }, [plants, rowsByPlant]);

    // -- Expand/Collapse Handlers --
    const togglePlant = (plantId: string) => {
        const newExpanded = new Set(expandedPlants);
        if (newExpanded.has(plantId)) {
            newExpanded.delete(plantId);
        } else {
            newExpanded.add(plantId);
        }
        setExpandedPlants(newExpanded);
    };

    const expandAll = () => {
        setExpandedPlants(new Set(plants.map((p: Plant) => p.id)));
    };

    const collapseAll = () => {
        setExpandedPlants(new Set());
    };

    // -- Row Handlers --
    const addRow = (plantId: string) => {
        const plantCategories = getPlantCategories(plants.find((p: Plant) => p.id === plantId)!);
        const existingCategoryIds = (rowsByPlant[plantId] || []).map(r => r.category_id);
        const availableCategories = plantCategories.filter(c => !existingCategoryIds.includes(c.id));

        if (availableCategories.length === 0) {
            toast({
                title: 'No Available Categories',
                description: 'All categories for this plant already have schedulers configured.',
                variant: 'destructive'
            });
            return;
        }

        const defaultCategoryId = availableCategories[0]?.id || '';

        setRowsByPlant(prev => ({
            ...prev,
            [plantId]: [
                ...(prev[plantId] || []),
                {
                    id: generateId(),
                    category_id: defaultCategoryId,
                    schedule_start_date: getTomorrowDate(),
                    schedule_end_date: '',
                    inspection_frequency: [],
                    testing_frequency: [],
                    maintenance_frequency: [],
                    is_active: true,
                    isNew: true,
                    hasStarted: false
                }
            ]
        }));
    };

    const removeRow = (plantId: string, rowId: string) => {
        setRowsByPlant(prev => ({
            ...prev,
            [plantId]: (prev[plantId] || []).filter(r => r.id !== rowId)
        }));
    };

    const updateRow = (plantId: string, rowId: string, field: keyof SchedulerRow, value: any) => {
        setRowsByPlant(prev => ({
            ...prev,
            [plantId]: (prev[plantId] || []).map(row => {
                if (row.id === rowId) {
                    return { ...row, [field]: value };
                }
                return row;
            })
        }));
    };

    const toggleFrequency = (plantId: string, rowId: string, freqType: 'inspection_frequency' | 'testing_frequency' | 'maintenance_frequency', freqValue: string) => {
        setRowsByPlant(prev => ({
            ...prev,
            [plantId]: (prev[plantId] || []).map(row => {
                if (row.id === rowId) {
                    const currentFreqs = row[freqType] || [];
                    const hasFreq = currentFreqs.includes(freqValue);
                    return {
                        ...row,
                        [freqType]: hasFreq
                            ? currentFreqs.filter(f => f !== freqValue)
                            : [...currentFreqs, freqValue]
                    };
                }
                return row;
            })
        }));
    };

    // -- Save All Handler --
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveAll = async () => {
        setIsSaving(true);

        let createdCount = 0;
        let updatedCount = 0;
        let deletedCount = 0;
        let errorCount = 0;
        let servicesGenerated = 0;
        let assetsFound = 0;
        let generationMessages: string[] = [];
        let errorMessage: string | null = null;

        try {
            // Process each plant
            for (const [plantId, rows] of Object.entries(rowsByPlant)) {
                const schedulersToSave: BulkSchedulerDto[] = rows
                    .filter(row => row.category_id && row.schedule_start_date && row.schedule_end_date)
                    .map(row => ({
                        id: row.isNew ? undefined : row.id,
                        category_id: row.category_id,
                        schedule_start_date: row.schedule_start_date,
                        schedule_end_date: row.schedule_end_date,
                        inspection_frequency: frequencyArrayToString(row.inspection_frequency),
                        testing_frequency: frequencyArrayToString(row.testing_frequency),
                        maintenance_frequency: frequencyArrayToString(row.maintenance_frequency)
                    }));

                if (schedulersToSave.length > 0 || (originalRowsByPlant[plantId]?.length || 0) > 0) {
                    try {
                        const result = await schedulerApi.bulkSave(plantId, schedulersToSave);
                        createdCount += result.data.created.length;
                        updatedCount += result.data.updated.length;
                        deletedCount += result.data.deleted.length;
                        errorCount += result.data.errors.length;

                        // Sum up services generated and collect messages
                        let hasAsyncGeneration = false;
                        result.data.created.forEach((c: any) => {
                            servicesGenerated += c.servicesGenerated || 0;
                            assetsFound += c.assetsFound || 0;
                            if (c.isAsync) {
                                hasAsyncGeneration = true;
                            }
                            if (c.generationMessage && c.servicesGenerated === 0 && !c.isAsync) {
                                generationMessages.push(c.generationMessage);
                            }
                        });
                        if (hasAsyncGeneration) {
                            generationMessages.push('Service generation is running in background.');
                        }
                    } catch (error: any) {
                        console.error(`Error saving schedulers for plant ${plantId}:`, error);
                        errorCount++;
                        if (!errorMessage && error?.response?.data?.message) {
                            errorMessage = error.response.data.message;
                        }
                    }
                }
            }

            if (createdCount > 0 || updatedCount > 0 || deletedCount > 0) {
                let description = `Created ${createdCount}, updated ${updatedCount}, deleted ${deletedCount} schedulers.`;

                // Check if any generation is running in background
                const hasAsyncMessage = generationMessages.some(m => m.includes('background'));

                if (hasAsyncMessage) {
                    description += ` Services are being generated in background.`;
                } else if (servicesGenerated > 0) {
                    description += ` ${servicesGenerated} services generated.`;
                } else if (servicesGenerated === 0 && assetsFound === 0 && createdCount > 0) {
                    description += ` Note: No assets found for the selected category.`;
                } else if (servicesGenerated === 0 && assetsFound > 0 && createdCount > 0) {
                    description += ` Note: ${assetsFound} assets found but no matching forms exist.`;
                }

                if (errorCount > 0) {
                    description += ` Failed: ${errorCount}`;
                }
                toast({
                    title: 'Success',
                    description
                });
                await queryClient.invalidateQueries({ queryKey: ['schedulers'] });
                setIsInitialized(false);
            } else if (errorCount > 0) {
                toast({
                    title: 'Error',
                    description: errorMessage || 'Failed to save changes. Check console for details.',
                    variant: 'destructive'
                });
            } else {
                toast({ title: 'Info', description: 'No changes to save.', variant: 'default' });
            }
        } catch (error) {
            console.error('Error in save all:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isLoadingPlants;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-white">
            <div className="flex-1 overflow-auto px-4 py-2">

                {/* Header Section */}
                <Card className="border-gray-200 shadow-sm rounded-lg bg-white mb-2 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex items-center justify-between px-4 py-2">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-orange-500 rounded-full"></div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-lg font-semibold text-gray-900">
                                            Service Scheduler
                                        </h1>
                                        <Badge variant="secondary" className="font-normal text-xs bg-orange-50 text-orange-700">
                                            {stats.totalSchedulers} Total
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-gray-500">
                                        Configure service schedules for plants and categories
                                    </p>
                                </div>
                            </div>

                            {/* Inline Stats */}
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Factory className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="text-gray-500">Plants:</span>
                                    <span className="font-semibold text-gray-900">{stats.totalPlants}</span>
                                </div>
                                <div className="w-px h-4 bg-gray-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="text-gray-500">Schedulers:</span>
                                    <span className="font-semibold text-gray-900">{stats.totalSchedulers}</span>
                                </div>
                                <div className="w-px h-4 bg-gray-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-green-500" />
                                    <span className="text-gray-500">Active:</span>
                                    <span className="font-semibold text-green-600">{stats.activeSchedulers}</span>
                                </div>
                                <div className="w-px h-4 bg-gray-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="text-gray-500">Configured:</span>
                                    <span className="font-semibold text-orange-600">{stats.plantsWithSchedulers}</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleSaveAll}
                                disabled={isSaving}
                                size="sm"
                                className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 h-8"
                            >
                                {isSaving ? 'Saving...' : (
                                    <>
                                        <Save className="h-3.5 w-3.5" />
                                        Save All
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>



                {/* Toolbar */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={expandAll}
                            className="gap-1.5 h-7 text-xs"
                        >
                            <Plus className="h-3 w-3" />
                            Expand All
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={collapseAll}
                            className="gap-1.5 h-7 text-xs"
                        >
                            <Minus className="h-3 w-3" />
                            Collapse All
                        </Button>
                    </div>
                </div>

                {/* Plant Accordions */}
                <div className="space-y-2">
                    {plants.map((plant: Plant) => {
                        const plantSchedulers = getPlantSchedulerRows(plant.id);
                        const plantCategories = getPlantCategories(plant);
                        const isExpanded = expandedPlants.has(plant.id);
                        const plantName = plant.plantName || plant.plant_name || 'Unknown Plant';
                        const schedulerCount = plantSchedulers.length;
                        const usedCategoryIds = plantSchedulers.map(s => s.category_id);

                        return (
                            <Card
                                key={plant.id}
                                className={cn(
                                    "border-gray-200 shadow-sm overflow-hidden transition-all duration-300",
                                    isExpanded && "shadow-md ring-1 ring-orange-100"
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors duration-200",
                                        isExpanded ? "bg-gradient-to-r from-orange-50 to-white" : "hover:bg-gray-50"
                                    )}
                                    onClick={() => togglePlant(plant.id)}
                                >
                                    <button className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-200/50 text-gray-500 transition-colors">
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-orange-500" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center",
                                            schedulerCount > 0 ? "bg-orange-100" : "bg-gray-100"
                                        )}>
                                            <Factory className={cn(
                                                "h-4 w-4",
                                                schedulerCount > 0 ? "text-orange-600" : "text-gray-400"
                                            )} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-sm text-gray-900">{plantName}</h3>
                                            <p className="text-[11px] text-gray-500">
                                                {schedulerCount} scheduler{schedulerCount !== 1 ? 's' : ''} • {plantCategories.length} categor{plantCategories.length !== 1 ? 'ies' : 'y'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="ml-auto flex items-center gap-2">
                                        <Badge
                                            variant={schedulerCount > 0 ? "default" : "secondary"}
                                            className={cn(
                                                "font-medium text-xs",
                                                schedulerCount > 0 ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : ""
                                            )}
                                        >
                                            {schedulerCount} Schedulers
                                        </Badge>
                                    </div>
                                </div>

                                {/* Expanded Content - Scheduler Table */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100">
                                        {plantCategories.length === 0 ? (
                                            <div className="px-6 py-12 text-center">
                                                <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                    <AlertCircle className="h-8 w-8 text-gray-400" />
                                                </div>
                                                <h4 className="text-sm font-medium text-gray-900 mb-1">No categories assigned</h4>
                                                <p className="text-sm text-gray-500">
                                                    Assign categories to this plant first to add schedulers.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader className="bg-gray-50/50">
                                                            <TableRow>
                                                                <TableHead className="w-[180px]">Category</TableHead>
                                                                <TableHead className="w-[140px]">Start Date</TableHead>
                                                                <TableHead className="w-[140px]">End Date</TableHead>
                                                                <TableHead className="w-[180px]">Inspection Frequency</TableHead>
                                                                <TableHead className="w-[180px]">Testing Frequency</TableHead>
                                                                <TableHead className="w-[180px]">Maintenance Frequency</TableHead>
                                                                <TableHead className="w-[60px] text-center">Active</TableHead>
                                                                <TableHead className="w-[50px]"></TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {plantSchedulers.map((row) => {
                                                                const originalRow = originalRowsByPlant[plant.id]?.find(r => r.id === row.id);
                                                                const rowHasStarted = row.hasStarted;

                                                                return (
                                                                    <TableRow key={row.id} className="group hover:bg-blue-50/30">
                                                                        <TableCell className="p-2">
                                                                            <Select
                                                                                value={row.category_id}
                                                                                onValueChange={(val) => {
                                                                                    updateRow(plant.id, row.id, 'category_id', val);
                                                                                }}
                                                                                disabled={!row.isNew}
                                                                            >
                                                                                <SelectTrigger className="h-8 text-xs">
                                                                                    <SelectValue placeholder="Select Category" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {plantCategories
                                                                                        .filter(c => !usedCategoryIds.includes(c.id) || c.id === row.category_id)
                                                                                        .map((c: Category) => (
                                                                                            <SelectItem key={c.id} value={c.id}>
                                                                                                {c.category_name || c.categoryName}
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </TableCell>
                                                                        <TableCell className="p-2">
                                                                            <div className="flex items-center gap-1">
                                                                                <Input
                                                                                    type="date"
                                                                                    value={row.schedule_start_date}
                                                                                    min={row.isNew ? getTomorrowDate() : (rowHasStarted ? undefined : originalRow?.schedule_start_date || getTomorrowDate())}
                                                                                    onChange={(e) => updateRow(plant.id, row.id, 'schedule_start_date', e.target.value)}
                                                                                    className={cn(
                                                                                        "h-8 text-xs",
                                                                                        rowHasStarted && "bg-gray-100 cursor-not-allowed"
                                                                                    )}
                                                                                    disabled={rowHasStarted}
                                                                                />
                                                                                {rowHasStarted && (
                                                                                    <TooltipProvider>
                                                                                        <Tooltip>
                                                                                            <TooltipTrigger>
                                                                                                <Info className="h-3 w-3 text-gray-400" />
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent>
                                                                                                <p className="text-xs">Start date cannot be changed after scheduler has started</p>
                                                                                            </TooltipContent>
                                                                                        </Tooltip>
                                                                                    </TooltipProvider>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="p-2">
                                                                            <div className="flex items-center gap-1">
                                                                                <Input
                                                                                    type="date"
                                                                                    value={row.schedule_end_date}
                                                                                    min={rowHasStarted ? getTodayDate() : row.schedule_start_date}
                                                                                    max={!row.isNew && originalRow ? originalRow.schedule_end_date : undefined}
                                                                                    onChange={(e) => updateRow(plant.id, row.id, 'schedule_end_date', e.target.value)}
                                                                                    className="h-8 text-xs"
                                                                                />
                                                                                {!row.isNew && originalRow && (
                                                                                    <TooltipProvider>
                                                                                        <Tooltip>
                                                                                            <TooltipTrigger>
                                                                                                <Info className="h-3 w-3 text-gray-400" />
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent>
                                                                                                <p className="text-xs">End date can only be preponed (moved earlier)</p>
                                                                                            </TooltipContent>
                                                                                        </Tooltip>
                                                                                    </TooltipProvider>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="p-2">
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {frequencyOptions.map(freq => (
                                                                                    <label
                                                                                        key={freq.value}
                                                                                        className={cn(
                                                                                            "px-2 py-0.5 text-[10px] rounded cursor-pointer border transition-colors",
                                                                                            row.inspection_frequency.includes(freq.value)
                                                                                                ? "bg-blue-100 border-blue-300 text-blue-700"
                                                                                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                                                                        )}
                                                                                    >
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            className="sr-only"
                                                                                            checked={row.inspection_frequency.includes(freq.value)}
                                                                                            onChange={() => toggleFrequency(plant.id, row.id, 'inspection_frequency', freq.value)}
                                                                                        />
                                                                                        {freq.label}
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="p-2">
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {frequencyOptions.map(freq => (
                                                                                    <label
                                                                                        key={freq.value}
                                                                                        className={cn(
                                                                                            "px-2 py-0.5 text-[10px] rounded cursor-pointer border transition-colors",
                                                                                            row.testing_frequency.includes(freq.value)
                                                                                                ? "bg-green-100 border-green-300 text-green-700"
                                                                                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                                                                        )}
                                                                                    >
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            className="sr-only"
                                                                                            checked={row.testing_frequency.includes(freq.value)}
                                                                                            onChange={() => toggleFrequency(plant.id, row.id, 'testing_frequency', freq.value)}
                                                                                        />
                                                                                        {freq.label}
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="p-2">
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {frequencyOptions.map(freq => (
                                                                                    <label
                                                                                        key={freq.value}
                                                                                        className={cn(
                                                                                            "px-2 py-0.5 text-[10px] rounded cursor-pointer border transition-colors",
                                                                                            row.maintenance_frequency.includes(freq.value)
                                                                                                ? "bg-amber-100 border-amber-300 text-amber-700"
                                                                                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                                                                        )}
                                                                                    >
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            className="sr-only"
                                                                                            checked={row.maintenance_frequency.includes(freq.value)}
                                                                                            onChange={() => toggleFrequency(plant.id, row.id, 'maintenance_frequency', freq.value)}
                                                                                        />
                                                                                        {freq.label}
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="p-1 text-center">
                                                                            <Checkbox
                                                                                checked={row.is_active}
                                                                                onCheckedChange={(checked) => updateRow(plant.id, row.id, 'is_active', checked)}
                                                                                className="h-4 w-4"
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell className="p-2 text-center">
                                                                            <div className="flex items-center justify-center gap-1">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-orange-500"
                                                                                    onClick={() => handleViewHistory(plant.id, row)}
                                                                                    disabled={row.isNew}
                                                                                    title="History & Comments"
                                                                                >
                                                                                    <Clock className="h-4 w-4" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                                                                                    onClick={() => removeRow(plant.id, row.id)}
                                                                                    title="Delete"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                <div className="px-3 py-1.5 border-t border-gray-100">
                                                    <Button
                                                        onClick={() => addRow(plant.id)}
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-orange-600 border-orange-200 hover:bg-orange-50 h-7 text-xs"
                                                        disabled={plantCategories.length === plantSchedulers.length}
                                                    >
                                                        <Plus className="mr-1 h-3 w-3" /> Add Scheduler
                                                    </Button>
                                                    {plantCategories.length === plantSchedulers.length && (
                                                        <span className="ml-3 text-xs text-gray-500">
                                                            All categories have schedulers configured
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>

                {/* Empty State for No Plants */}
                {plants.length === 0 && (
                    <Card className="border-gray-200 shadow-sm">
                        <CardContent className="p-12 text-center">
                            <div className="mx-auto h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                                <Factory className="h-10 w-10 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Plants Found</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Create plants first to start configuring service schedules
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* History Drawer */}
            <Sheet open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
                    <EntityHistoryDrawer
                        config={{
                            entityName: 'Scheduler',
                            entityNamePlural: 'Schedulers',
                            apiEndpoint: '/schedulers',
                            fields: []
                        }}
                        selectedEntityForComments={selectedHistoryRow?.id || null}
                        selectedEntityName={selectedHistoryRow && historyPlantId ? (() => {
                            const plant = plants.find((p: Plant) => p.id === historyPlantId);
                            const category = categories.find((c: Category) => c.id === selectedHistoryRow.category_id);
                            const pName = plant?.plantName || (plant as any)?.plant_name || 'Unknown';
                            const cName = category?.category_name || category?.categoryName || 'Unknown';
                            return `Scheduler: ${pName} - ${cName}`;
                        })() : undefined}
                        onToggleHistory={() => { }}
                    />
                </SheetContent>
            </Sheet>
        </div>
    );
}
