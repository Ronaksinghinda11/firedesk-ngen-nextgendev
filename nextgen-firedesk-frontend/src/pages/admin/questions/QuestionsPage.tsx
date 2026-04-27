import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    ClipboardList,
    CheckCircle,
    Settings,
    BarChart3,
    HelpCircle,
    Download,
    Upload,
    MoreHorizontal,
    Clock,
    FileSpreadsheet,
    Pencil,
    Check,
    X,
} from 'lucide-react';
import { EntityHistoryDrawer } from '@/components/generic/components/EntityHistoryDrawer';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { questionApi } from '@/services/api/questionApi';
import { conditionMasterApi, frequencyApi } from '@/services/api/serviceFormApi';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import { ConditionSelector } from './ConditionSelector';
import { ImportModal } from '@/components/generic/components/ImportModal';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";

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
    categories?: Category[];
}

// Helper to generate a unique temp ID
const generateId = () => `temp_${Math.random().toString(36).substr(2, 9)}`;

export default function QuestionsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { availablePlants: plants, isLoading: isLoadingPlants, selectedPlantId } = usePlantFilter();

    // -- Expand/Collapse State --
    const [expandedPlants, setExpandedPlants] = useState<Set<string>>(new Set());

    // -- Local State for Question Rows (grouped by plant) --
    const [rowsByPlant, setRowsByPlant] = useState<Record<string, any[]>>({});
    const [currentConditionRowId, setCurrentConditionRowId] = useState<string | null>(null);
    const [currentPlantId, setCurrentPlantId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const editingRowSnapshot = useRef<{ plantId: string; row: any } | null>(null);
    const [descColWidth, setDescColWidth] = useState(250);
    const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = descColWidth;
        dragRef.current = { startX, startWidth };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!dragRef.current) return;
            const diff = moveEvent.clientX - dragRef.current.startX;
            const newWidth = Math.max(150, dragRef.current.startWidth + diff);
            setDescColWidth(newWidth);
        };

        const handleMouseUp = () => {
            dragRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [descColWidth]);

    // -- History Drawer State --
    const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
    const [selectedHistoryEntity, setSelectedHistoryEntity] = useState<{ id: string; type: string; name: string } | null>(null);

    const handleViewHistory = (row: any) => {
        setSelectedHistoryEntity({
            id: row.id,
            type: 'question', // Entity type for audit logs
            name: row.questionText || 'Unnamed Question'
        });
        setHistoryDrawerOpen(true);
    };



    // -- Data Queries --
    // -- Data Queries --
    // Plants are now fetched from context (plants = availablePlants)

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get<any>('/master-data/categories/active');
            const list = res.activeCategories || res.allCategory || res.data || res || [];
            return Array.isArray(list) ? list : [];
        }
    });

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await api.get<any>('/master-data/products');
            const list = res.products || res.data || res || [];
            return Array.isArray(list) ? list : [];
        }
    });

    const { data: conditionMaster = [] } = useQuery({
        queryKey: ['conditionMaster'],
        queryFn: async () => {
            const res = await conditionMasterApi.getAllActive();
            return res || [];
        }
    });

    const { data: fetchedFrequencies = [] } = useQuery({
        queryKey: ['frequencies'],
        queryFn: async () => {
            return await frequencyApi.getAll();
        }
    });

    const inspectionFrequencies = useMemo(() => {
        return fetchedFrequencies.length > 0
            ? [...fetchedFrequencies].sort((a, b) => (a.interval_days || 0) - (b.interval_days || 0)).map(f => ({ code: f.frequency_code, name: f.frequency_name, id: f.id }))
            : [
                { code: 'D', name: 'Daily', id: '' },
                { code: 'W', name: 'Weekly', id: '' },
                { code: 'M', name: 'Monthly', id: '' },
                { code: 'Q', name: 'Quarterly', id: '' },
                { code: 'HY', name: 'Half Yearly', id: '' },
                { code: 'Y', name: 'Yearly', id: '' },
                { code: '2Y', name: '2 Years', id: '' },
                { code: '5Y', name: '5 Years', id: '' },
            ];
    }, [fetchedFrequencies]);

    const { data: existingQuestions = [], isSuccess: isQuestionsLoaded } = useQuery({
        queryKey: ['questions'],
        queryFn: async () => {
            const res = await questionApi.getAll();
            return res.data || [];
        }
    });

    // -- Helper: Get categories for a plant --
    const getPlantCategories = (plant: Plant) => {
        const plantCategoryIds = plant.categories?.map((c: Category) => c.id) || [];
        return categories.filter((c: Category) => plantCategoryIds.includes(c.id));
    };

    // -- Helper: Get questions for a plant (by matching category) --
    const getPlantQuestionRows = (plantId: string) => {
        return rowsByPlant[plantId] || [];
    };

    // -- Initialize rows grouped by plant --
    useEffect(() => {
        if (isQuestionsLoaded && plants.length > 0 && inspectionFrequencies.length > 0 && !isInitialized) {
            const newRowsByPlant: Record<string, any[]> = {};

            // Initialize empty arrays for each plant
            plants.forEach((plant: Plant) => {
                newRowsByPlant[plant.id] = [];
            });

            // Map existing questions to plants based on their plant_id field
            existingQuestions.forEach((q: any) => {
                const questionCategoryId = q.categories?.[0]?.id || '';

                // First try to use the stored plant_id
                let targetPlantId = q.plant_id;

                // If no plant_id, fall back to category matching for backward compatibility
                if (!targetPlantId) {
                    const matchingPlant = plants.find((plant: Plant) => {
                        const plantCategoryIds = plant.categories?.map((c: Category) => c.id) || [];
                        return plantCategoryIds.includes(questionCategoryId);
                    });
                    targetPlantId = matchingPlant?.id;
                }

                if (targetPlantId && newRowsByPlant[targetPlantId]) {
                    const freqCodes = (q.frequencies || []).map((f: any) => f.frequency_code);
                    const mappedFreqCodes = q.frequency_ids?.map((fid: string) => {
                        const freq = inspectionFrequencies.find(f => f.id === fid);
                        return freq?.code;
                    }).filter(Boolean) || [];

                    const finalFreqCodes = [...new Set([...freqCodes, ...mappedFreqCodes])];
                    const mappedProductIds = q.products?.map((p: any) => p.id) || [];

                    const row = {
                        id: q.id,
                        categoryId: questionCategoryId,
                        productIds: mappedProductIds,
                        serviceType: (q.service_type || q.question_type) ? (q.service_type || q.question_type).charAt(0).toUpperCase() + (q.service_type || q.question_type).slice(1) : 'Inspection',
                        questionText: q.question_text || '',
                        frequencies: finalFreqCodes,
                        isMandatory: q.is_mandatory || false,
                        requiresPhoto: q.requires_photo || false,
                        requiresNotes: q.requires_notes || false,
                        helpText: q.help_text || '',
                        conditions: q.conditions || [],
                        standards: q.standards || ''
                    };

                    newRowsByPlant[targetPlantId].push(row);
                }
            });

            setRowsByPlant(newRowsByPlant);
            setIsInitialized(true);
        }
    }, [isQuestionsLoaded, existingQuestions, plants, inspectionFrequencies, isInitialized, categories]);

    // -- Filtered Plants Logic --
    const filteredPlants = useMemo(() => {
        if (!plants || plants.length === 0) return [];
        if (selectedPlantId && selectedPlantId !== 'all') {
            return plants.filter((p: Plant) => p.id === selectedPlantId);
        }
        return plants;
    }, [plants, selectedPlantId]);

    // -- Auto-expand plant from context filter --
    useEffect(() => {
        if (selectedPlantId && filteredPlants.length > 0) {
            // Check if plant exists in filtered list
            const plantExists = filteredPlants.some((p: Plant) => p.id === selectedPlantId);
            if (plantExists) {
                setExpandedPlants(prev => {
                    const newSet = new Set(prev);
                    newSet.add(selectedPlantId);
                    return newSet;
                });
            }
        }
    }, [selectedPlantId, filteredPlants]);

    // -- Stats Calculation --

    // -- Stats Calculation --
    const stats = useMemo(() => {
        const totalPlants = filteredPlants.length;
        let totalQuestions = 0;
        let inspectionCount = 0;
        let testingCount = 0;
        let maintenanceCount = 0;

        filteredPlants.forEach((plant: Plant) => {
            const rows = rowsByPlant[plant.id] || [];
            rows.forEach((row: any) => {
                if (row.questionText?.trim()) {
                    totalQuestions++;
                    const type = row.serviceType?.toLowerCase();
                    if (type === 'inspection') inspectionCount++;
                    else if (type === 'testing') testingCount++;
                    else if (type === 'maintenance') maintenanceCount++;
                }
            });
        });

        return { totalPlants, totalQuestions, inspectionCount, testingCount, maintenanceCount };
    }, [filteredPlants, rowsByPlant]);

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
        setExpandedPlants(new Set(filteredPlants.map((p: Plant) => p.id)));
    };

    const collapseAll = () => {
        setExpandedPlants(new Set());
    };

    // -- Row Handlers --
    const addRow = (plantId: string) => {
        const plantCategories = getPlantCategories(plants.find((p: Plant) => p.id === plantId)!);
        const defaultCategoryId = plantCategories[0]?.id || '';
        const newId = generateId();

        setRowsByPlant(prev => ({
            ...prev,
            [plantId]: [
                ...(prev[plantId] || []),
                {
                    id: newId,
                    categoryId: defaultCategoryId,
                    productIds: [],
                    serviceType: 'Inspection',
                    questionText: '',
                    frequencies: [],
                    isMandatory: false,
                    requiresPhoto: false,
                    requiresNotes: false,
                    helpText: '',
                    conditions: [],
                    standards: ''
                }
            ]
        }));
        setEditingRowId(newId);
        editingRowSnapshot.current = null; // new row has no snapshot to revert to
    };

    const removeRow = (plantId: string, rowId: string) => {
        setRowsByPlant(prev => ({
            ...prev,
            [plantId]: (prev[plantId] || []).filter(r => r.id !== rowId)
        }));
    };

    const updateRow = (plantId: string, rowId: string, field: string, value: any) => {
        setRowsByPlant(prev => ({
            ...prev,
            [plantId]: (prev[plantId] || []).map(row => {
                if (row.id === rowId) {
                    if (field === 'categoryId' && row.categoryId !== value) {
                        return { ...row, [field]: value, productIds: [] };
                    }
                    return { ...row, [field]: value };
                }
                return row;
            })
        }));
    };

    const toggleFrequency = (plantId: string, rowId: string, freqCode: string) => {
        setRowsByPlant(prev => ({
            ...prev,
            [plantId]: (prev[plantId] || []).map(row => {
                if (row.id === rowId) {
                    const currentFreqs = row.frequencies || [];
                    const hasFreq = currentFreqs.includes(freqCode);
                    return {
                        ...row,
                        frequencies: hasFreq
                            ? currentFreqs.filter((f: string) => f !== freqCode)
                            : [...currentFreqs, freqCode]
                    };
                }
                return row;
            })
        }));
    };



    // -- Mutations --
    const createMutation = useMutation({
        mutationFn: async (rowsToSave: any[]) => {
            const payload = {
                questions: rowsToSave.map(row => {
                    const frequencyIds = row.frequencies.map((code: string) => {
                        const freq = inspectionFrequencies.find(f => f.code === code);
                        return freq?.id;
                    }).filter(Boolean);

                    return {
                        question_text: row.questionText,
                        answer_type: row.conditions && row.conditions.length > 0 ? 'condition' : 'text',
                        question_type: row.serviceType.toLowerCase(),
                        service_type: row.serviceType.toLowerCase(),
                        is_mandatory: row.isMandatory,
                        requires_photo: row.requiresPhoto,
                        requires_notes: row.requiresNotes,
                        help_text: row.helpText || '',
                        standards: row.standards || '',
                        category_ids: row.categoryId ? [row.categoryId] : [],
                        product_ids: row.productIds || [],
                        frequency_ids: frequencyIds,
                        plant_id: row.plantId || null, // Plant context for form generation
                        conditions: (row.conditions || []).map((c: any, idx: number) => ({
                            condition_id: c.id || c.condition_id || c.conditionId || c,
                            display_order: idx + 1,
                            is_active: true
                        })).filter((c: any) => c.condition_id)
                    };
                })
            };
            return questionApi.bulkCreate(payload as any);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (row: any) => {
            const frequencyIds = row.frequencies.map((code: string) => {
                const freq = inspectionFrequencies.find(f => f.code === code);
                return freq?.id;
            }).filter(Boolean);

            const payload = {
                question_text: row.questionText,
                question_type: row.serviceType.toLowerCase(),
                service_type: row.serviceType.toLowerCase(),
                is_mandatory: row.isMandatory,
                requires_photo: row.requiresPhoto,
                requires_notes: row.requiresNotes,
                help_text: row.helpText || '',
                standards: row.standards || '',
                category_ids: row.categoryId ? [row.categoryId] : [],
                product_ids: row.productIds || [],
                frequency_ids: frequencyIds,
                conditions: (row.conditions || []).map((c: any, idx: number) => ({
                    condition_id: c.id || c.condition_id || c.conditionId || c,
                    display_order: idx + 1,
                    is_active: true
                })).filter((c: any) => c.condition_id)
            };
            return questionApi.update(row.id, payload as any);
        }
    });

    const bulkUpdateMutation = useMutation({
        mutationFn: async (rows: any[]) => {
            const payload = {
                questions: rows.map(row => {
                    const frequencyIds = row.frequencies.map((code: string) => {
                        const freq = inspectionFrequencies.find(f => f.code === code);
                        return freq?.id;
                    }).filter(Boolean);

                    return {
                        id: row.id,
                        question_text: row.questionText,
                        question_type: row.serviceType.toLowerCase(),
                        service_type: row.serviceType.toLowerCase(),
                        is_mandatory: row.isMandatory || false,
                        requires_photo: row.requiresPhoto || false,
                        requires_notes: row.requiresNotes || false,
                        help_text: row.helpText || '',
                        standards: row.standards || '',
                        category_ids: row.categoryId ? [row.categoryId] : [],
                        product_ids: row.productIds || [],
                        frequency_ids: frequencyIds,
                        conditions: (row.conditions || []).map((c: any, idx: number) => ({
                            condition_id: c.id || c.condition_id || c.conditionId || c,
                            display_order: idx + 1,
                            is_active: true
                        })).filter((c: any) => c.condition_id)
                    };
                })
            };
            return questionApi.bulkUpdate(payload as any);
        }
    });

    const handleSaveRow = async (plantId: string, row: any) => {
        const existingIds = new Set(existingQuestions.map((q: any) => q.id));
        const isExisting = existingIds.has(row.id);
        try {
            if (isExisting) {
                await bulkUpdateMutation.mutateAsync([{ ...row, plantId }]);
                toast({ title: 'Saved', description: 'Question updated successfully.' });
            } else {
                if (row.questionText?.trim() && row.categoryId && row.productIds?.length > 0) {
                    await createMutation.mutateAsync([{ ...row, plantId }]);
                    toast({ title: 'Saved', description: 'Question created successfully.' });
                } else {
                    toast({ title: 'Missing fields', description: 'Fill in question, category, and at least one product.', variant: 'destructive' });
                    return;
                }
            }
            await queryClient.invalidateQueries({ queryKey: ['questions'] });
            setEditingRowId(null);
            setIsInitialized(false);
        } catch (error) {
            console.error('Failed to save question:', error);
            toast({ title: 'Error', description: 'Failed to save question.', variant: 'destructive' });
        }
    };

    const handleSaveAll = async () => {
        const existingIds = new Set(existingQuestions.map((q: any) => q.id));

        let savedCount = 0;
        let updatedCount = 0;
        let deletedCount = 0;
        let errorCount = 0;

        // Collect all rows from all plants, attaching plantId to each row
        const allRows: any[] = [];
        Object.entries(rowsByPlant).forEach(([plantId, rows]) => {
            rows.forEach((row: any) => {
                allRows.push({ ...row, plantId });
            });
        });

        // Get current row IDs (existing questions that are still in the UI)
        const currentRowIds = new Set(allRows.map(r => r.id));

        // Find questions that were deleted (exist in backend but not in current rows)
        const deletedQuestionIds = existingQuestions
            .filter((q: any) => !currentRowIds.has(q.id))
            .map((q: any) => q.id);

        // Delete removed questions
        for (const questionId of deletedQuestionIds) {
            try {
                await questionApi.delete(questionId);
                deletedCount++;
            } catch (error) {
                console.error('Failed to delete question:', error);
                errorCount++;
            }
        }

        // Process existing rows (updates) - BATCHED
        const existingRows = allRows.filter(r => existingIds.has(r.id) && r.questionText.trim() !== '');

        if (existingRows.length > 0) {
            try {
                const result = await bulkUpdateMutation.mutateAsync(existingRows);
                // We don't get exact count of updated vs failed from the mutation result easily in this structure
                // apart from success/failure of the whole batch or partials if API returns details.
                // Assuming success if no error thrown.
                updatedCount = existingRows.length;
            } catch (error) {
                console.error('Failed to bulk update questions:', error);
                errorCount += existingRows.length; // Count all as potentially failed or just flag error
            }
        }

        // Process NEW rows
        const newRows = allRows.filter(r =>
            !existingIds.has(r.id) &&
            r.questionText.trim() !== '' &&
            r.categoryId &&
            r.productIds &&
            r.productIds.length > 0
        );

        if (newRows.length > 0) {
            try {
                const result = await createMutation.mutateAsync(newRows);
                savedCount = result.count || newRows.length;
            } catch (error) {
                console.error('Failed to create questions:', error);
                errorCount++;
            }
        }

        if (savedCount > 0 || updatedCount > 0 || deletedCount > 0) {
            toast({
                title: 'Success',
                description: `Created ${savedCount}, updated ${updatedCount}, deleted ${deletedCount} questions.${errorCount > 0 ? ` Failed: ${errorCount}` : ''}`
            });
            await queryClient.invalidateQueries({ queryKey: ['questions'] });
            setIsInitialized(false);
        } else if (errorCount > 0) {
            toast({
                title: 'Error',
                description: `Failed to save changes. Check console for details.`,
                variant: 'destructive'
            });
        } else {
            toast({ title: 'Info', description: 'No changes to save.', variant: 'default' });
        }
    };

    const isLoading = isLoadingPlants;
    const isSaving = createMutation.isPending || updateMutation.isPending || bulkUpdateMutation.isPending;

    // -- Export/Import Handlers --


    const handleExportQuestions = async () => {
        setIsExporting(true);
        try {
            const response = await questionApi.exportQuestions() as any;
            const blob = new Blob([response.data || response], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `questions_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast({ title: 'Success', description: 'Questions exported successfully' });
        } catch (error) {
            console.error('Error exporting questions:', error);
            toast({ title: 'Error', description: 'Failed to export questions', variant: 'destructive' });
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportSuccess = async () => {
        await queryClient.invalidateQueries({ queryKey: ['questions'] });
        setIsInitialized(false);
        toast({
            title: "Import Successful",
            description: "Questions have been imported and list updated.",
        });
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                <div className="grid grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => (
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
            <div className="flex-1 overflow-auto px-0 py-1">

                {/* Header Section */}
                <Card className="border-gray-200 shadow-sm rounded-lg bg-white mb-2 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex items-center justify-between px-4 py-2">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-orange-500 rounded-full"></div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-lg font-semibold text-gray-900">
                                            Questions Management
                                        </h1>
                                        <Badge variant="secondary" className="font-normal text-xs bg-orange-50 text-orange-700">
                                            {stats.totalQuestions} Total
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-gray-500">
                                        Manage questions for service forms across all plants
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
                                    <ClipboardList className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="text-gray-500">Questions:</span>
                                    <span className="font-semibold text-gray-900">{stats.totalQuestions}</span>
                                </div>
                                <div className="w-px h-4 bg-gray-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="text-gray-500">Insp:</span>
                                    <span className="font-semibold text-gray-900">{stats.inspectionCount}</span>
                                </div>
                                <div className="w-px h-4 bg-gray-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <BarChart3 className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="text-gray-500">Test:</span>
                                    <span className="font-semibold text-gray-900">{stats.testingCount}</span>
                                </div>
                                <div className="w-px h-4 bg-gray-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <Settings className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="text-gray-500">Maint:</span>
                                    <span className="font-semibold text-gray-900">{stats.maintenanceCount}</span>
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

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">

                                    <DropdownMenuItem onClick={handleExportQuestions} disabled={isExporting}>
                                        <Download className="mr-2 h-4 w-4" />
                                        <span>{isExporting ? 'Exporting...' : 'Export Questions'}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        <span>Import Questions</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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

                    {/* Import/Export Buttons Removed - Moved to Dropdown */}
                </div>

                {/* Plant Accordions */}
                <div className="space-y-1.5">
                    {filteredPlants.map((plant: Plant) => {
                        const plantQuestions = getPlantQuestionRows(plant.id);
                        const plantCategories = getPlantCategories(plant);
                        const isExpanded = expandedPlants.has(plant.id);
                        const plantName = plant.plantName || plant.plant_name || 'Unknown Plant';
                        const questionCount = plantQuestions.filter((r: any) => r.questionText?.trim()).length;

                        return (
                            <Card
                                key={plant.id}
                                className={cn(
                                    "border-gray-200 shadow-sm overflow-hidden transition-all duration-200 rounded-sm",
                                    isExpanded && "shadow-md ring-1 ring-orange-100"
                                )}
                            >
                                {/* Plant Header */}
                                <div
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors duration-200",
                                        isExpanded ? "bg-gradient-to-r from-orange-50 to-white" : "hover:bg-gray-50 bg-white"
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
                                            questionCount > 0 ? "bg-orange-100" : "bg-gray-100"
                                        )}>
                                            <Factory className={cn(
                                                "h-4 w-4",
                                                questionCount > 0 ? "text-orange-600" : "text-gray-400"
                                            )} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-sm text-gray-900">{plantName}</h3>
                                            <p className="text-[11px] text-gray-500">
                                                {questionCount} question{questionCount !== 1 ? 's' : ''} • {plantCategories.length} categor{plantCategories.length !== 1 ? 'ies' : 'y'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="ml-auto flex items-center gap-2">
                                        <Badge
                                            variant={questionCount > 0 ? "default" : "secondary"}
                                            className={cn(
                                                "font-medium text-xs",
                                                questionCount > 0 ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : ""
                                            )}
                                        >
                                            {questionCount} Questions
                                        </Badge>
                                    </div>
                                </div>

                                {/* Expanded Content - Questions Table */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100">
                                        {plantCategories.length === 0 ? (
                                            <div className="px-6 py-12 text-center">
                                                <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                    <HelpCircle className="h-8 w-8 text-gray-400" />
                                                </div>
                                                <h4 className="text-sm font-medium text-gray-900 mb-1">No categories assigned</h4>
                                                <p className="text-sm text-gray-500">
                                                    Assign categories to this plant first to add questions.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <TooltipProvider delayDuration={200}>
                                                    <div className="overflow-x-auto">
                                                        <Table className="border-collapse w-full excel-grid" style={{ minWidth: descColWidth + 884 }}>
                                                            <style>{`.excel-grid th, .excel-grid td { border-right: 1px solid #e5e7eb; } .excel-grid th:last-child, .excel-grid td:last-child { border-right: none; }`}</style>
                                                            <TableHeader>
                                                                <TableRow className="bg-gray-100 border-b-2 border-gray-200">
                                                                    <TableHead style={{ width: 150, minWidth: 150, maxWidth: 150 }} className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-2 sticky left-0 z-20 bg-gray-100">Category</TableHead>
                                                                    <TableHead style={{ width: 130, minWidth: 130, maxWidth: 130 }} className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-2 sticky left-[150px] z-20 bg-gray-100 border-r border-gray-200">Product</TableHead>
                                                                    <TableHead style={{ width: 90, minWidth: 90, maxWidth: 90 }} className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-2">Type</TableHead>
                                                                    <TableHead style={{ width: descColWidth, minWidth: descColWidth }} className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-2 relative">
                                                                        Activity Description
                                                                        <div
                                                                            onMouseDown={handleResizeStart}
                                                                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-400 active:bg-orange-500 transition-colors"
                                                                            title="Drag to resize"
                                                                        />
                                                                    </TableHead>
                                                                    <TableHead style={{ width: 115, minWidth: 115, maxWidth: 115 }} className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-2">Frequency</TableHead>
                                                                    <TableHead style={{ width: 48, minWidth: 48, maxWidth: 48 }} className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-0 text-center">Mand.</TableHead>
                                                                    <TableHead style={{ width: 48, minWidth: 48, maxWidth: 48 }} className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-0 text-center">Photo</TableHead>
                                                                    <TableHead style={{ width: 48, minWidth: 48, maxWidth: 48 }} className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-0 text-center">Notes</TableHead>
                                                                    <TableHead style={{ width: 65, minWidth: 65, maxWidth: 65 }} className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-1">Help</TableHead>
                                                                    <TableHead style={{ width: 65, minWidth: 65, maxWidth: 65 }} className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-1">Std.</TableHead>
                                                                    <TableHead style={{ width: 120, minWidth: 120, maxWidth: 120 }} className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 py-2 px-1">Cond.</TableHead>
                                                                    <TableHead style={{ width: 70, minWidth: 70, maxWidth: 70 }} className="text-[11px] py-2 px-1 text-center">Actions</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {plantQuestions.map((row: any, rowIdx: number) => (
                                                                    <TableRow key={row.id} className={cn("group hover:bg-orange-50/40 border-b border-gray-200", rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-100/70', editingRowId === row.id && 'ring-1 ring-orange-300 bg-orange-50/20')}>
                                                                        {/* Category */}
                                                                        <TableCell className="p-1 sticky left-0 z-10" style={{ background: editingRowId === row.id ? '#fff7ed' : rowIdx % 2 === 0 ? 'white' : '#f0f0f0' }}>
                                                                            {editingRowId === row.id ? (
                                                                                <Select value={row.categoryId} onValueChange={(val) => updateRow(plant.id, row.id, 'categoryId', val)}>
                                                                                    <SelectTrigger className="h-7 text-[11px] border-gray-200 rounded-sm">
                                                                                        <SelectValue placeholder="Select..." />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {plantCategories.map((c: Category) => (
                                                                                            <SelectItem key={c.id} value={c.id} className="text-[11px]">{c.category_name || c.categoryName}</SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            ) : (
                                                                                <span className="text-[11px] text-gray-700 truncate block px-1">
                                                                                    {plantCategories.find((c: Category) => c.id === row.categoryId)?.category_name || plantCategories.find((c: Category) => c.id === row.categoryId)?.categoryName || '—'}
                                                                                </span>
                                                                            )}
                                                                        </TableCell>
                                                                        {/* Product */}
                                                                        <TableCell className="p-1 sticky left-[150px] z-10 border-r border-gray-100" style={{ background: editingRowId === row.id ? '#fff7ed' : rowIdx % 2 === 0 ? 'white' : '#f0f0f0' }}>
                                                                            {editingRowId === row.id ? (
                                                                                <Popover>
                                                                                    <PopoverTrigger asChild>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            role="combobox"
                                                                                            className="h-7 w-full justify-between text-[11px] px-2 py-0 border-gray-200 rounded-sm font-normal"
                                                                                        >
                                                                                            {(() => {
                                                                                                const selected = products.filter((p: any) => (row.productIds || []).includes(p.id));
                                                                                                const catFiltered = products.filter((p: any) => row.categoryId && (p.categoryId === row.categoryId || p.category_id === row.categoryId));
                                                                                                const availableProducts = catFiltered.length > 0 ? catFiltered : products;
                                                                                                if (selected.length === 0) return <span className="text-gray-400">Select...</span>;
                                                                                                if (selected.length === 1) return <span className="truncate">{selected[0].product_name || selected[0].productName}</span>;
                                                                                                if (availableProducts.length > 0 && selected.length === availableProducts.length) return <span className="text-orange-600 font-medium">All ({selected.length})</span>;
                                                                                                return <span>{selected.length} selected</span>;
                                                                                            })()}
                                                                                            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-40" />
                                                                                        </Button>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent className="w-[200px] p-0" align="start">
                                                                                        <Command>
                                                                                            <CommandInput placeholder="Search..." className="h-7 text-[11px]" />
                                                                                            <CommandEmpty>No product found.</CommandEmpty>
                                                                                            <CommandList>
                                                                                                {(() => {
                                                                                                    const catFiltered = products.filter((p: any) => row.categoryId && (p.categoryId === row.categoryId || p.category_id === row.categoryId));
                                                                                                    const filteredProducts = catFiltered.length > 0 ? catFiltered : products;
                                                                                                    const allSelected = filteredProducts.length > 0 && filteredProducts.every((p: any) => (row.productIds || []).includes(p.id));

                                                                                                    return (
                                                                                                        <CommandGroup>
                                                                                                            <CommandItem
                                                                                                                onSelect={() => {
                                                                                                                    const currentIds = row.productIds || [];
                                                                                                                    let newIds;
                                                                                                                    if (allSelected) {
                                                                                                                        const toRemove = new Set(filteredProducts.map((p: any) => p.id));
                                                                                                                        newIds = currentIds.filter((id: string) => !toRemove.has(id));
                                                                                                                    } else {
                                                                                                                        const idsSet = new Set(currentIds);
                                                                                                                        filteredProducts.forEach((p: any) => idsSet.add(p.id));
                                                                                                                        newIds = Array.from(idsSet);
                                                                                                                    }
                                                                                                                    updateRow(plant.id, row.id, "productIds", newIds);
                                                                                                                }}
                                                                                                                className="text-[11px] font-medium border-b"
                                                                                                            >
                                                                                                                <Check className={cn("mr-2 h-3 w-3", allSelected ? "opacity-100" : "opacity-0")} />
                                                                                                                Select All ({filteredProducts.length})
                                                                                                            </CommandItem>
                                                                                                            {filteredProducts.map((product: any) => {
                                                                                                                const isSelected = (row.productIds || []).includes(product.id);
                                                                                                                return (
                                                                                                                    <CommandItem
                                                                                                                        key={product.id}
                                                                                                                        value={product.product_name || product.productName}
                                                                                                                        onSelect={() => {
                                                                                                                            const currentIds = row.productIds || [];
                                                                                                                            const newIds = isSelected
                                                                                                                                ? currentIds.filter((id: string) => id !== product.id)
                                                                                                                                : [...currentIds, product.id];
                                                                                                                            updateRow(plant.id, row.id, "productIds", newIds);
                                                                                                                        }}
                                                                                                                        className="text-[11px]"
                                                                                                                    >
                                                                                                                        <Check className={cn("mr-2 h-3 w-3", isSelected ? "opacity-100" : "opacity-0")} />
                                                                                                                        {product.product_name || product.productName}
                                                                                                                    </CommandItem>
                                                                                                                );
                                                                                                            })}
                                                                                                        </CommandGroup>
                                                                                                    );
                                                                                                })()}
                                                                                            </CommandList>
                                                                                        </Command>
                                                                                    </PopoverContent>
                                                                                </Popover>
                                                                            ) : (
                                                                                <span className="text-[11px] text-gray-700 truncate block px-1">
                                                                                    {(() => {
                                                                                        const selected = products.filter((p: any) => (row.productIds || []).includes(p.id));
                                                                                        if (selected.length === 0) return '—';
                                                                                        if (selected.length === 1) return selected[0].product_name || selected[0].productName;
                                                                                        return `${selected.length} products`;
                                                                                    })()}
                                                                                </span>
                                                                            )}
                                                                        </TableCell>
                                                                        {/* Service Type */}
                                                                        <TableCell className="p-1">
                                                                            {editingRowId === row.id ? (
                                                                                <Select value={row.serviceType} onValueChange={(val) => updateRow(plant.id, row.id, 'serviceType', val)}>
                                                                                    <SelectTrigger className="h-7 text-[11px] border-gray-200 rounded-sm">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="Inspection" className="text-[11px]">Inspection</SelectItem>
                                                                                        <SelectItem value="Testing" className="text-[11px]">Testing</SelectItem>
                                                                                        <SelectItem value="Maintenance" className="text-[11px]">Maintenance</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            ) : (
                                                                                <span className="text-[11px] text-gray-700 px-1">{row.serviceType || '—'}</span>
                                                                            )}
                                                                        </TableCell>
                                                                        {/* Activity Description */}
                                                                        <TableCell className="p-1" style={{ width: `${descColWidth}px`, minWidth: `${descColWidth}px` }}>
                                                                            {editingRowId === row.id ? (
                                                                                <Input
                                                                                    value={row.questionText}
                                                                                    onChange={(e) => updateRow(plant.id, row.id, 'questionText', e.target.value)}
                                                                                    className="h-7 text-[11px] border-gray-200 rounded-sm"
                                                                                    placeholder="Enter description..."
                                                                                />
                                                                            ) : (
                                                                                <span className="text-[11px] text-gray-700 truncate block px-1">{row.questionText || '—'}</span>
                                                                            )}
                                                                        </TableCell>
                                                                        {/* Frequency */}
                                                                        <TableCell className="p-1">
                                                                            {editingRowId === row.id ? (
                                                                                <div className="grid grid-cols-4 gap-0.5 w-fit">
                                                                                    {inspectionFrequencies.map((freq) => {
                                                                                        const isSelected = (row.frequencies || []).includes(freq.code);
                                                                                        const shortLabel: Record<string, string> = { DAILY: 'D', WEEKLY: 'W', MONTHLY: 'M', QUARTERLY: 'Q', HALF_YEARLY: 'HY', YEARLY: 'Y', '2_YEARS': '2Y', '5_YEARS': '5Y' };
                                                                                        const label = shortLabel[freq.code] || freq.code;
                                                                                        return (
                                                                                            <Tooltip key={freq.code}>
                                                                                                <TooltipTrigger asChild>
                                                                                                    <button
                                                                                                        onClick={() => toggleFrequency(plant.id, row.id, freq.code)}
                                                                                                        className={cn(
                                                                                                            "w-6 h-5 text-[9px] font-semibold rounded transition-all select-none flex items-center justify-center cursor-pointer",
                                                                                                            isSelected
                                                                                                                ? "bg-orange-500 text-white shadow-sm"
                                                                                                                : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                                                                                        )}
                                                                                                    >
                                                                                                        {label}
                                                                                                    </button>
                                                                                                </TooltipTrigger>
                                                                                                <TooltipContent side="top" className="text-[11px]">
                                                                                                    {freq.name}
                                                                                                </TooltipContent>
                                                                                            </Tooltip>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex flex-wrap gap-0.5">
                                                                                    {(() => {
                                                                                        const shortLabel: Record<string, string> = { DAILY: 'D', WEEKLY: 'W', MONTHLY: 'M', QUARTERLY: 'Q', HALF_YEARLY: 'HY', YEARLY: 'Y', '2_YEARS': '2Y', '5_YEARS': '5Y' };
                                                                                        const fullLabel: Record<string, string> = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEARLY: 'Half Yearly', YEARLY: 'Yearly', '2_YEARS': '2 Years', '5_YEARS': '5 Years' };
                                                                                        const selected = (row.frequencies || []);
                                                                                        if (selected.length === 0) return <span className="text-[11px] text-gray-400 px-1">—</span>;
                                                                                        return selected.map((code: string) => (
                                                                                            <Tooltip key={code}>
                                                                                                <TooltipTrigger asChild>
                                                                                                    <span className="inline-flex items-center justify-center w-6 h-5 text-[9px] font-semibold rounded bg-orange-500 text-white shadow-sm cursor-default">
                                                                                                        {shortLabel[code] || code}
                                                                                                    </span>
                                                                                                </TooltipTrigger>
                                                                                                <TooltipContent side="top" className="text-[11px]">
                                                                                                    {fullLabel[code] || code}
                                                                                                </TooltipContent>
                                                                                            </Tooltip>
                                                                                        ));
                                                                                    })()}
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                        {/* Mandatory */}
                                                                        <TableCell className="p-0 text-center">
                                                                            <Checkbox
                                                                                checked={row.isMandatory}
                                                                                onCheckedChange={(checked) => updateRow(plant.id, row.id, 'isMandatory', checked)}
                                                                                className="h-3.5 w-3.5"
                                                                                disabled={editingRowId !== row.id}
                                                                            />
                                                                        </TableCell>
                                                                        {/* Photo */}
                                                                        <TableCell className="p-0 text-center">
                                                                            <Checkbox
                                                                                checked={row.requiresPhoto}
                                                                                onCheckedChange={(checked) => updateRow(plant.id, row.id, 'requiresPhoto', checked)}
                                                                                className="h-3.5 w-3.5"
                                                                                disabled={editingRowId !== row.id}
                                                                            />
                                                                        </TableCell>
                                                                        {/* Notes */}
                                                                        <TableCell className="p-0 text-center">
                                                                            <Checkbox
                                                                                checked={row.requiresNotes}
                                                                                onCheckedChange={(checked) => updateRow(plant.id, row.id, 'requiresNotes', checked)}
                                                                                className="h-3.5 w-3.5"
                                                                                disabled={editingRowId !== row.id}
                                                                            />
                                                                        </TableCell>
                                                                        {/* Help Text */}
                                                                        <TableCell className="p-1">
                                                                            {editingRowId === row.id ? (
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <Input
                                                                                            value={row.helpText}
                                                                                            onChange={(e) => updateRow(plant.id, row.id, 'helpText', e.target.value)}
                                                                                            className="h-7 text-[11px] border-gray-200 rounded-sm"
                                                                                            placeholder="—"
                                                                                        />
                                                                                    </TooltipTrigger>
                                                                                    {row.helpText && (
                                                                                        <TooltipContent side="top" className="max-w-[250px] text-[11px]">
                                                                                            {row.helpText}
                                                                                        </TooltipContent>
                                                                                    )}
                                                                                </Tooltip>
                                                                            ) : (
                                                                                <span className="text-[11px] text-gray-700 truncate block px-1">{row.helpText || '—'}</span>
                                                                            )}
                                                                        </TableCell>
                                                                        {/* Standards */}
                                                                        <TableCell className="p-1">
                                                                            {editingRowId === row.id ? (
                                                                                <Input
                                                                                    value={row.standards}
                                                                                    onChange={(e) => updateRow(plant.id, row.id, 'standards', e.target.value)}
                                                                                    className="h-7 text-[11px] border-gray-200 rounded-sm"
                                                                                    placeholder="NFPA..."
                                                                                />
                                                                            ) : (
                                                                                <span className="text-[11px] text-gray-700 truncate block px-1">{row.standards || '—'}</span>
                                                                            )}
                                                                        </TableCell>
                                                                        {/* Conditions */}
                                                                        <TableCell className="p-1">
                                                                            {editingRowId === row.id ? (
                                                                                <ConditionSelector
                                                                                    conditions={conditionMaster}
                                                                                    selectedConditions={row.conditions || []}
                                                                                    onChange={(newConditions) => updateRow(plant.id, row.id, 'conditions', newConditions)}
                                                                                />
                                                                            ) : (
                                                                                <div className="flex flex-wrap gap-0.5 px-1">
                                                                                    {(row.conditions || []).length > 0 ? (
                                                                                        (row.conditions || []).map((c: any) => (
                                                                                            <span key={c.condition_id || c.id} className="inline-flex items-center px-1.5 py-0 text-[10px] rounded-sm bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap">
                                                                                                {c.condition_name || 'Unknown'}
                                                                                            </span>
                                                                                        ))
                                                                                    ) : (
                                                                                        <span className="text-[11px] text-gray-400">—</span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                        {/* Actions */}
                                                                        <TableCell className="p-0 text-center">
                                                                            <div className="flex items-center justify-center gap-0.5">
                                                                                {editingRowId === row.id ? (
                                                                                    <>
                                                                                        <Tooltip>
                                                                                            <TooltipTrigger asChild>
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    onClick={() => handleSaveRow(plant.id, row)}
                                                                                                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                                                >
                                                                                                    <Check className="h-3.5 w-3.5" />
                                                                                                </Button>
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent side="top" className="text-[11px]">Save</TooltipContent>
                                                                                        </Tooltip>
                                                                                        <Tooltip>
                                                                                            <TooltipTrigger asChild>
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    onClick={() => {
                                                                                                        // Cancel: revert to snapshot
                                                                                                        if (editingRowSnapshot.current) {
                                                                                                            const snap = editingRowSnapshot.current;
                                                                                                            setRowsByPlant(prev => ({
                                                                                                                ...prev,
                                                                                                                [snap.plantId]: (prev[snap.plantId] || []).map(r =>
                                                                                                                    r.id === snap.row.id ? { ...snap.row } : r
                                                                                                                )
                                                                                                            }));
                                                                                                        } else {
                                                                                                            // New row with no snapshot — remove it
                                                                                                            setRowsByPlant(prev => ({
                                                                                                                ...prev,
                                                                                                                [plant.id]: (prev[plant.id] || []).filter(r => r.id !== row.id)
                                                                                                            }));
                                                                                                        }
                                                                                                        setEditingRowId(null);
                                                                                                        editingRowSnapshot.current = null;
                                                                                                    }}
                                                                                                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                                                                                >
                                                                                                    <X className="h-3.5 w-3.5" />
                                                                                                </Button>
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent side="top" className="text-[11px]">Cancel</TooltipContent>
                                                                                        </Tooltip>
                                                                                    </>
                                                                                ) : (
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={() => {
                                                                                                    editingRowSnapshot.current = { plantId: plant.id, row: JSON.parse(JSON.stringify(row)) };
                                                                                                    setEditingRowId(row.id);
                                                                                                }}
                                                                                                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                            >
                                                                                                <Pencil className="h-3 w-3" />
                                                                                            </Button>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent side="top" className="text-[11px]">Edit</TooltipContent>
                                                                                    </Tooltip>
                                                                                )}
                                                                                <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                        >
                                                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </DropdownMenuTrigger>
                                                                                    <DropdownMenuContent align="end" className="w-36">
                                                                                        <DropdownMenuItem onClick={() => handleViewHistory(row)} className="text-[11px] gap-2">
                                                                                            <Clock className="h-3 w-3" /> History
                                                                                        </DropdownMenuItem>
                                                                                        <DropdownMenuSeparator />
                                                                                        <DropdownMenuItem onClick={() => removeRow(plant.id, row.id)} className="text-[11px] gap-2 text-red-600">
                                                                                            <Trash2 className="h-3 w-3" /> Delete
                                                                                        </DropdownMenuItem>
                                                                                    </DropdownMenuContent>
                                                                                </DropdownMenu>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </TooltipProvider>

                                                <div className="px-3 py-2 bg-gray-50/50 border-t border-gray-100">
                                                    <Button onClick={() => addRow(plant.id)} variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 h-7 text-[11px] gap-1.5">
                                                        <Plus className="h-3 w-3" /> Add Question
                                                    </Button>
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
                            <div className="mx-auto h-20 w-20 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                                <Factory className="h-10 w-10 text-orange-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Plants Found</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Create plants first to start managing questions
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>


            {/* Import Dialog */}
            <ImportModal
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                entityName="Question"
                entityNamePlural="Questions"
                apiEndpoint="/service-forms/questions"
                onImportComplete={handleImportSuccess}
                filterAttributes={[]} // Not used for export here, we use importFields
                importFields={[
                    { id: 'question_code', label: 'Question Code' },
                    { id: 'question_text', label: 'Activity Description', required: true },
                    { id: 'answer_type', label: 'Answer Type (boolean, text)', required: true },
                    { id: 'service_type', label: 'Service Type (Inspection, Testing)', required: true },
                    { id: 'plant_name', label: 'Plant Name', required: true },
                    { id: 'categories', label: 'Category', required: true },
                    { id: 'products', label: 'Product', required: true },
                    { id: 'frequencies', label: 'Frequency', required: true },
                    { id: 'is_mandatory', label: 'Mandatory', required: false },
                    { id: 'requires_photo', label: 'Photo Required', required: false },
                    { id: 'requires_notes', label: 'Notes Required', required: false },
                    { id: 'help_text', label: 'Help Text', required: false },
                    { id: 'standards', label: 'Standards', required: false },
                    { id: 'conditions', label: 'Conditions', required: false }
                ]}
            />

            <Sheet open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] p-0">
                    <EntityHistoryDrawer
                        config={{
                            entityName: 'Question',
                            entityNamePlural: 'Questions',
                            apiEndpoint: '/api/v1/questions', // Dummy endpoint to satisfy interface
                            fields: [] // Dummy fields
                        }}
                        selectedEntityForComments={selectedHistoryEntity?.id || null}
                        selectedEntityName={selectedHistoryEntity?.name}
                        onToggleHistory={() => setHistoryDrawerOpen(false)}
                    />
                </SheetContent>
            </Sheet>
        </div>
    );
}
