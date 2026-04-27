import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Check, Minus } from 'lucide-react';
import { plantService } from '@/services/plant.service';
import { questionApi } from '@/services/api/questionApi';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Local Interface for Plant structure
interface PlantWithCategories {
    id: string;
    plantName?: string;
    plant_name?: string;
    categories?: { id: string; category_name?: string }[];
}

// Helper for Frequency Colors (From ServiceForms.tsx)
const frequencyColors: Record<string, string> = {
    'D': 'bg-red-100 text-red-700 border-red-200',
    'W': 'bg-orange-100 text-orange-700 border-orange-200',
    'F': 'bg-amber-100 text-amber-700 border-amber-200',
    'M': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Q': 'bg-lime-100 text-lime-700 border-lime-200',
    'HY': 'bg-green-100 text-green-700 border-green-200',
    'Y': 'bg-teal-100 text-teal-700 border-teal-200',
    '2Y': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    '5Y': 'bg-blue-100 text-blue-700 border-blue-200',
};

// Helper for Frequency Badges
const FrequencyBadge = ({ code }: { code: string }) => {
    // Map code to full name if needed, or use code
    const labelMap: Record<string, string> = {
        'D': 'Daily', 'W': 'Weekly', 'M': 'Monthly', 'Q': 'Quarterly',
        'HY': 'Half-Yearly', 'Y': 'Yearly', '2Y': '2 Years', '5Y': '5 Years'
    };
    return (
        <Badge
            variant="outline"
            className={cn("bg-gray-100 text-gray-700 font-medium border-0",
                // Custom colors based on code
                code === 'D' && "bg-red-100 text-red-700",
                code === 'W' && "bg-orange-100 text-orange-700",
                code === 'M' && "bg-green-100 text-green-700", // Screenshot uses green for M?
                code === 'Q' && "bg-yellow-100 text-yellow-700",
                code === 'HY' && "bg-orange-100 text-orange-800", // Screenshot shows Half-Yearly as orange/brown?
                // Adjusting to match screenshot "Daily" is pinkish? "Quarterly" yellow?
            )}
        >
            {labelMap[code] || code}
        </Badge>
    );
};

export default function PlantQuestionsView() {
    const { id: plantId } = useParams();
    const navigate = useNavigate();

    // 1. Fetch Plant Details (to get Categories)
    const { data: plant, isLoading: isLoadingPlant } = useQuery({
        queryKey: ['plant', plantId],
        queryFn: async () => {
            // We need plant categories. plantService.getById might not return categories if not populated? 
            // Ideally we need a robust fetch. plantService.getAllPlants returns populated plants.
            // Let's use that and find. Or api call if available.
            // Assuming plantService.getById logic or fall back to getAll
            try {
                // Try specific get if available or getAll
                const res = await plantService.getAllPlants();
                return res.plants?.find((p: any) => p.id === plantId) as unknown as PlantWithCategories;
            } catch (e) {
                console.error(e);
                return null;
            }
        }
    });

    // 2. Fetch All Questions
    const { data: allQuestions = [], isLoading: isLoadingQuestions } = useQuery({
        queryKey: ['questions'],
        queryFn: async () => {
            const res = await questionApi.getAll();
            return res.data || [];
        }
    });

    // 3. Fetch Frequencies (for mapping IDs to Codes)
    const { data: frequencies = [] } = useQuery({
        queryKey: ['frequencies'],
        queryFn: async () => {
            const res = await api.get<any>('/service-forms/frequencies');
            return res.data || [];
        }
    });

    if (isLoadingPlant || isLoadingQuestions) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!plant) {
        return <div className="p-6">Plant not found</div>;
    }

    // Filter Questions for this Plant
    const plantCategoryIds = plant.categories?.map((c: any) => c.id || c.category_id) || [];

    // Filter questions that belong to one of the plant's categories
    const plantQuestions = allQuestions.filter((q: any) => {
        const qCatId = q.categories?.[0]?.id;
        return plantCategoryIds.includes(qCatId);
    });

    // Group by Service Type
    // The screenshot groups by "Inspection", "Testing", "Maintenance"
    const groupedQuestions = {
        inspection: plantQuestions.filter((q: any) => (q.question_type || '').toLowerCase() === 'inspection'),
        testing: plantQuestions.filter((q: any) => (q.question_type || '').toLowerCase() === 'testing'),
        maintenance: plantQuestions.filter((q: any) => (q.question_type || '').toLowerCase() === 'maintenance'),
    };

    // Helper: Get frequency codes for a question
    const getFreqCodes = (q: any) => {
        // q.frequencies usually contains objects { frequency_code, ... }
        // or q.frequency_ids
        let codes: string[] = [];
        if (q.frequencies && q.frequencies.length > 0) {
            codes = q.frequencies.map((f: any) => f.frequency_code);
        } else if (q.frequency_ids && frequencies.length > 0) {
            // Map IDs
            codes = q.frequency_ids.map((fid: string) =>
                frequencies.find((f: any) => f.id === fid)?.frequency_code
            ).filter(Boolean);
        }
        return [...new Set(codes)]; // Unique
    };

    const renderSection = (title: string, questions: any[]) => {
        if (questions.length === 0) return null;

        return (
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                    <span className="text-gray-500">—</span>
                    <span className="text-gray-500 text-sm">{title} questions for {plant.plantName || plant.plant_name}</span>
                </div>

                <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                    <Table>
                        <TableHeader className="bg-orange-50/50">
                            <TableRow>
                                <TableHead className="w-12 text-center font-bold text-gray-600">#</TableHead>
                                <TableHead className="w-[300px] font-bold text-gray-600">QUESTION TEXT</TableHead>
                                <TableHead className="w-[150px] font-bold text-gray-600">PRODUCT</TableHead>
                                <TableHead className="w-[200px] font-bold text-gray-600">HELP TEXT</TableHead>
                                <TableHead className="w-[150px] font-bold text-gray-600">FREQUENCIES</TableHead>
                                <TableHead className="w-[300px] font-bold text-gray-600">CONDITIONS</TableHead>
                                <TableHead className="w-24 text-center font-bold text-gray-600">REQUIRED</TableHead>
                                <TableHead className="w-24 text-center font-bold text-gray-600">PHOTO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {questions.map((q, idx) => {
                                const freqCodes = getFreqCodes(q);
                                return (
                                    <TableRow key={q.id}>
                                        <TableCell className="text-center font-medium">
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">
                                                {idx + 1}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900">
                                            {q.question_text}
                                            {q.is_mandatory && <span className="text-red-500 ml-1">*</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {q.products?.map((p: any) => (
                                                    <Badge key={p.id} variant="secondary" className="bg-gray-100 text-gray-700 font-normal border border-gray-200">
                                                        {p.product_name}
                                                    </Badge>
                                                ))}
                                                {(!q.products || q.products.length === 0) && (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-500">
                                            {q.help_text || <span className="text-gray-300">-</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {freqCodes.map(code => (
                                                    <FrequencyBadge key={code} code={code} />
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {q.conditions?.map((c: any, cIdx: number) => {
                                                    // For Master Questions, c is the ConditionMaster object directly
                                                    const conditionName = c.condition_name;
                                                    const severity = c.severity_level;
                                                    const score = c.priority_score;
                                                    const joinData = c.QuestionCondition; // Junction data if needed

                                                    return (
                                                        <div key={cIdx} className="flex items-center justify-between bg-gray-50 p-1.5 rounded border border-gray-100 text-xs">
                                                            <span className="font-medium text-gray-700 truncate max-w-[150px]" title={conditionName}>
                                                                {conditionName}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <Badge variant="outline" className="h-5 px-1 bg-white">
                                                                    {severity}
                                                                </Badge>
                                                                <span className="text-gray-500 text-[10px]">P: {score}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {(!q.conditions || q.conditions.length === 0) && (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {q.is_mandatory ? (
                                                <Check className="h-4 w-4 text-green-500 mx-auto" />
                                            ) : (
                                                <Minus className="h-4 w-4 text-gray-300 mx-auto" />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {q.requires_photo ? (
                                                <Check className="h-4 w-4 text-green-500 mx-auto" />
                                            ) : (
                                                <Minus className="h-4 w-4 text-gray-300 mx-auto" />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    const location = useLocation();
    const isManager = location.pathname.includes('/manager');
    const backPath = isManager ? '/manager/service-forms' : '/admin/service-forms';

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50/50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="-ml-2">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-gray-200" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{plant.plantName || plant.plant_name} Questions</h1>
                        <p className="text-sm text-gray-500">Master list of all questions configured for this plant</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 max-w-7xl mx-auto w-full">
                {renderSection('Inspection', groupedQuestions.inspection)}
                {renderSection('Testing', groupedQuestions.testing)}
                {renderSection('Maintenance', groupedQuestions.maintenance)}

                {Object.values(groupedQuestions).every(arr => arr.length === 0) && (
                    <div className="text-center py-20">
                        <p className="text-gray-500">No questions found for this plant.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
