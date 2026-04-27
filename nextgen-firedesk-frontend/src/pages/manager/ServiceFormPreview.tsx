/**
 * Service Form Preview Page for Managers
 * View the structure of a service form template
 */

import { useEffect, useState, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
    ArrowLeft,
    FileText,
    Factory,
    Tag,
    ChevronDown,
    Eye,
    Download
} from 'lucide-react';
import managerServiceFormApi from '@/services/api/managerServiceFormApi';
import { serviceFormApi } from '@/services/api/serviceFormApi';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { INSPECTION_FREQUENCIES } from '@/constants/serviceFormConstants';

export default function ServiceFormPreview() {
    const { formId } = useParams<{ formId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<any>(null);
    const [pdfLoading, setPdfLoading] = useState<string | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [currentFrequency, setCurrentFrequency] = useState<string | null>(null);

    useEffect(() => {
        if (formId) {
            fetchFormDetails();
        }
    }, [formId]);

    const fetchFormDetails = async () => {
        try {
            setLoading(true);
            const response = await managerServiceFormApi.getFormById(formId!);

            if (response.success) {
                setFormData(response.data);
            } else {
                throw new Error(response.message || 'Failed to fetch form details');
            }
        } catch (error: any) {
            console.error('Error fetching form details:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to load form details',
                variant: 'destructive',
            });
            navigate('/manager/service-forms');
        } finally {
            setLoading(false);
        }
    };

    const handlePDFDownload = async (frequency: string) => {
        if (!formData || !formId) return;

        // Check if any questions exist for this frequency
        const questionsForFrequency = formData.sections?.reduce((acc: number, section: any) => {
            return acc + (section.questions?.filter((q: any) =>
                q.applicableFrequencies?.includes(frequency)
            ).length || 0);
        }, 0) || 0;

        if (questionsForFrequency === 0) {
            toast({
                title: 'No Questions',
                description: `No questions found for ${INSPECTION_FREQUENCIES[frequency]?.name || frequency} frequency`,
                variant: 'destructive',
            });
            return;
        }

        try {
            setPdfLoading(frequency);
            setCurrentFrequency(frequency);

            // Use the same API method as admin
            const { blobUrl, filename } = await serviceFormApi.getPDFPreview(formId!, frequency);

            setPdfPreviewUrl(blobUrl);
            toast({
                title: 'Success',
                description: 'PDF generated successfully',
            });
            setShowPdfPreview(true);
        } catch (err: any) {
            console.error('PDF generation error:', err);
            toast({
                title: 'Error',
                description: err.response?.data?.message || err.message || 'Failed to generate PDF',
                variant: 'destructive',
            });
        } finally {
            setPdfLoading(null);
        }
    };

    const handleActualDownload = () => {
        if (pdfPreviewUrl && formData && currentFrequency) {
            const filename = `service-form-${formData.serviceName || formData.formCode}-${currentFrequency}-${new Date().toISOString().split('T')[0]}.pdf`;
            serviceFormApi.downloadFromUrl(pdfPreviewUrl, filename);

            toast({
                title: 'Success',
                description: 'PDF downloaded successfully',
            });
        }
    };

    const handleClosePdfPreview = () => {
        setShowPdfPreview(false);
        // Revoke the blob URL to free memory
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
        setCurrentFrequency(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-7xl mx-auto">
                    <Skeleton className="h-10 w-48 mb-6" />
                    <Card className="mb-6">
                        <CardHeader>
                            <Skeleton className="h-8 w-64 mb-2" />
                            <Skeleton className="h-4 w-96" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-96 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!formData) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-7xl mx-auto">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-gray-500 mb-4">Form not found</p>
                            <Button onClick={() => navigate('/manager/service-forms')}>
                                Back to Forms List
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/manager/service-forms')}
                        className="mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Forms List
                    </Button>

                    {/* Form Info Card */}
                    <Card className="relative overflow-hidden bg-white shadow-sm border-gray-200">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <CardTitle className="text-2xl font-bold text-gray-900">
                                            {formData.serviceName}
                                        </CardTitle>
                                        {formData.formCode && (
                                            <Badge variant="outline" className="text-xs">
                                                {formData.formCode}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-gray-600 text-base">
                                        {formData.description || 'No description provided'}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {/* PDF Download Button */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 border-0"
                                                disabled={pdfLoading !== null}
                                            >
                                                <FileText className="h-4 w-4 mr-2" />
                                                {pdfLoading ? 'Generating...' : 'View as PDF'}
                                                <ChevronDown className="h-4 w-4 ml-2" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            {Object.values(INSPECTION_FREQUENCIES).map((freq) => {
                                                const questionCount = formData?.sections?.reduce((acc: number, section: any) => {
                                                    return acc + (section.questions?.filter((q: any) =>
                                                        q.applicableFrequencies?.includes(freq.code)
                                                    ).length || 0);
                                                }, 0) || 0;

                                                return (
                                                    <DropdownMenuItem
                                                        key={freq.code}
                                                        onClick={() => handlePDFDownload(freq.code)}
                                                        disabled={questionCount === 0 || pdfLoading !== null}
                                                        className="flex justify-between"
                                                    >
                                                        <span>{freq.name}</span>
                                                        <Badge variant="secondary" className="ml-2 text-xs">
                                                            {questionCount}
                                                        </Badge>
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {formData.plant && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Factory className="h-4 w-4" />
                                            <span>{formData.plant.plantName}</span>
                                        </div>
                                    )}
                                    {formData.serviceCategory && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Tag className="h-4 w-4" />
                                            <span>{formData.serviceCategory.categoryName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                </div>

                {/* Form Content */}
                <Card className="mb-6">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <CardTitle className="text-xl font-semibold text-gray-800">
                                Form Structure
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100 text-gray-700 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-center w-20 font-semibold text-sm">SL No</th>
                                        <th className="px-6 py-3 text-left font-semibold text-sm">Question</th>
                                        <th className="px-6 py-3 text-left font-semibold text-sm">Type</th>
                                        <th className="px-6 py-3 text-left font-semibold text-sm">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.sections?.map((section: any, sectionIndex: number) => (
                                        <Fragment key={section.id}>
                                            {/* Section Header */}
                                            <tr className="bg-gray-50/80">
                                                <td colSpan={4} className="px-6 py-3 font-semibold text-gray-800 text-base border-y border-gray-200">
                                                    {section.sectionName}
                                                    {section.description && (
                                                        <span className="text-sm text-gray-600 ml-2 font-normal">
                                                            - {section.description}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Questions */}
                                            {section.questions?.map((question: any, questionIndex: number) => {
                                                const slNo = `${sectionIndex + 1}.${questionIndex + 1}`;

                                                return (
                                                    <tr key={question.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="px-4 py-4 text-center font-semibold text-gray-500">
                                                            {slNo}
                                                        </td>
                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                            <div>
                                                                <p className="font-medium text-gray-800">{question.questionText}</p>
                                                                {question.helpText && (
                                                                    <p className="text-sm text-gray-500 mt-1">{question.helpText}</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                            <Badge variant="secondary" className="font-mono text-xs">
                                                                {question.answerType}
                                                            </Badge>
                                                            {question.questionType && (
                                                                <Badge variant="outline" className="ml-2 text-xs">
                                                                    {question.questionType}
                                                                </Badge>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 border-l border-gray-200">
                                                            <div className="flex flex-wrap gap-2">
                                                                {question.isMandatory && (
                                                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                                                )}
                                                                {question.requiresPhoto && (
                                                                    <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                                                                        Photo Required
                                                                    </Badge>
                                                                )}
                                                                {question.requiresNotes && (
                                                                    <Badge variant="outline" className="text-xs border-yellow-200 text-yellow-700 bg-yellow-50">
                                                                        Notes Required
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* PDF Preview Dialog */}
            <Dialog open={showPdfPreview} onOpenChange={handleClosePdfPreview}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            PDF Preview - {currentFrequency && INSPECTION_FREQUENCIES[currentFrequency]?.name}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleActualDownload}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 min-h-0">
                        {pdfPreviewUrl && (
                            <object
                                data={`${pdfPreviewUrl}#toolbar=1&navpanes=0`}
                                type="application/pdf"
                                className="w-full h-full border rounded-lg"
                                title="PDF Preview"
                            >
                                <embed
                                    src={`${pdfPreviewUrl}#toolbar=1&navpanes=0`}
                                    type="application/pdf"
                                    className="w-full h-full"
                                />
                            </object>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
