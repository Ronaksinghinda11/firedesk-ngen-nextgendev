/**
 * Service Submission View Page for Admins
 * View submitted service forms with answers
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
    Package,
    MapPin,
    Building2,
    Calendar,
    Clock,
    User,
    CheckCircle2,
    Image as ImageIcon,
    FileDown,
    Loader2,
    Eye,
    Download,
    X,
} from 'lucide-react';
import adminServiceFormApi from '@/services/api/adminServiceFormApi';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function ServiceSubmissionView() {
    const { id } = useParams<{ id: string }>(); // Changed from serviceId to id to match route param
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [serviceData, setServiceData] = useState<any>(null);
    const [formData, setFormData] = useState<any>(null);
    const [statistics, setStatistics] = useState<any>(null);
    const [hasAnswers, setHasAnswers] = useState<boolean>(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [showPdfPreview, setShowPdfPreview] = useState(false);

    useEffect(() => {
        if (id) {
            fetchServiceFormView();
        }
    }, [id]);

    const fetchServiceFormView = async () => {
        try {
            setLoading(true);
            const response = await adminServiceFormApi.getServiceSubmissionView(id!);

            if (response.success) {
                setServiceData(response.data.service);
                setFormData(response.data.form);
                setStatistics(response.data.statistics);
                setHasAnswers(response.data.hasAnswers);
            } else {
                throw new Error(response.message || 'Failed to fetch service form');
            }
        } catch (error: any) {
            console.error('Error fetching service form:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to load service form',
                variant: 'destructive',
            });
            navigate('/admin/calendar');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!id) {
            toast({
                title: 'Error',
                description: 'Service ID not found',
                variant: 'destructive',
            });
            return;
        }

        try {
            setPdfLoading(true);
            const { blobUrl } = await adminServiceFormApi.getSubmissionPDF(id);
            setPdfPreviewUrl(blobUrl);
            setShowPdfPreview(true);
        } catch (error: any) {
            console.error('Error loading PDF:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to load PDF',
                variant: 'destructive',
            });
        } finally {
            setPdfLoading(false);
        }
    };

    const handleActualDownload = () => {
        if (pdfPreviewUrl && serviceData) {
            const fileName = `service-submission-${serviceData.asset?.name || 'form'}-${new Date().toISOString().split('T')[0]}.pdf`;
            adminServiceFormApi.downloadFromUrl(pdfPreviewUrl, fileName);
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
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; label: string }> = {
            PENDING: { color: 'bg-yellow-500', label: 'Pending' },
            IN_PROGRESS: { color: 'bg-blue-500', label: 'In Progress' },
            SUBMITTED: { color: 'bg-purple-500', label: 'Submitted' },
            COMPLETED: { color: 'bg-green-500', label: 'Completed' },
            REJECTED: { color: 'bg-red-500', label: 'Rejected' },
            APPROVED: { color: 'bg-green-600', label: 'Approved' },
        };

        const config = statusConfig[status] || { color: 'bg-gray-500', label: status };
        return (
            <Badge className={`${config.color} text-white`}>
                {config.label}
            </Badge>
        );
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }

    if (!serviceData || !formData) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-7xl mx-auto">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-gray-500 mb-4">Service form not found</p>
                            <Button onClick={() => navigate('/admin/calendar')}>
                                Back to Calendar
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/admin/calendar')}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Calendar
                            </Button>

                            {/* View as PDF Button */}
                            <Button
                                variant="outline"
                                className="bg-white hover:bg-gray-50"
                                disabled={pdfLoading}
                                onClick={handleDownloadPDF}
                            >
                                {pdfLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Eye className="h-4 w-4 mr-2" />
                                )}
                                View as PDF
                            </Button>
                        </div>

                        {/* Service Info Card */}
                        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-2xl border-blue-400/20">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
                            <CardHeader className="relative">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-3xl font-bold tracking-tight">
                                            {formData.serviceName}
                                        </CardTitle>
                                        <p className="text-blue-50/90 text-base mt-2">
                                            Submission #{serviceData.submissionNumber}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {getStatusBadge(serviceData.status)}
                                        {serviceData.approvalStatus && getStatusBadge(serviceData.approvalStatus)}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="relative">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    {/* Asset Info */}
                                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                        <div className="bg-white/20 p-2.5 rounded-lg">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-50/70 uppercase tracking-wide font-medium">
                                                Asset ID
                                            </p>
                                            <p className="font-semibold text-lg mt-0.5">
                                                {serviceData.asset?.assetCode || serviceData.asset?.assetId || 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                        <div className="bg-white/20 p-2.5 rounded-lg">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-50/70 uppercase tracking-wide font-medium">
                                                Location
                                            </p>
                                            <p className="font-semibold text-lg mt-0.5">
                                                {serviceData.asset?.location || 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Building */}
                                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                        <div className="bg-white/20 p-2.5 rounded-lg">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-50/70 uppercase tracking-wide font-medium">
                                                Building
                                            </p>
                                            <p className="font-semibold text-lg mt-0.5">
                                                {serviceData.asset?.building || 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Scheduled Date */}
                                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                        <div className="bg-white/20 p-2.5 rounded-lg">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-50/70 uppercase tracking-wide font-medium">
                                                Scheduled
                                            </p>
                                            <p className="font-semibold text-lg mt-0.5">
                                                {new Date(serviceData.scheduledDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Assigned Technicians */}
                                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                        <div className="bg-white/20 p-2.5 rounded-lg">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-50/70 uppercase tracking-wide font-medium">
                                                Assigned Technicians
                                            </p>
                                            {serviceData.assignedTechnicians && serviceData.assignedTechnicians.length > 0 ? (
                                                <p className="font-semibold text-lg mt-0.5">
                                                    {serviceData.assignedTechnicians.map((tech: any) => tech.name).filter(Boolean).join(', ') || 'Unknown'}
                                                </p>
                                            ) : serviceData.technician?.name ? (
                                                <p className="font-semibold text-lg mt-0.5">
                                                    {serviceData.technician.name}
                                                </p>
                                            ) : (
                                                <p className="font-semibold text-lg mt-0.5 text-white/60 italic">
                                                    Not assigned
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Completed By */}
                                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                        <div className="bg-white/20 p-2.5 rounded-lg">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-50/70 uppercase tracking-wide font-medium">
                                                Completed By
                                            </p>
                                            {serviceData.submittedBy?.name ? (
                                                <p className="font-semibold text-lg mt-0.5">
                                                    {serviceData.submittedBy.name}
                                                </p>
                                            ) : (
                                                <p className="font-semibold text-lg mt-0.5 text-white/60 italic">
                                                    Not completed
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Geo Location Row */}
                                {(serviceData.asset?.lat && serviceData.asset?.long) && (
                                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 mb-4">
                                        <div className="bg-white/20 p-2.5 rounded-lg">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-50/70 uppercase tracking-wide font-medium">
                                                Geo Location
                                            </p>
                                            <p className="font-semibold text-lg mt-0.5">
                                                Lat: {serviceData.asset.lat}, Long: {serviceData.asset.long}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Timeline */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {serviceData.submittedAt && (
                                        <div className="flex items-center gap-2 text-white/90 text-sm bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <Clock className="h-4 w-4" />
                                            <span>Submitted: {new Date(serviceData.submittedAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {serviceData.submittedBy && (
                                        <div className="flex items-center gap-2 text-white/90 text-sm bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <User className="h-4 w-4" />
                                            <span>By: {serviceData.submittedBy.user?.name}</span>
                                        </div>
                                    )}
                                    {serviceData.approvedAt && (
                                        <div className="flex items-center gap-2 text-white/90 text-sm bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>Reviewed: {new Date(serviceData.approvedAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Statistics */}
                    {statistics && (
                        <Card className="mb-6">
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-blue-600">{statistics.totalQuestions}</p>
                                        <p className="text-sm text-gray-600 mt-1">Total Questions</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-green-600">{statistics.questionsWithPhotos}</p>
                                        <p className="text-sm text-gray-600 mt-1">With Photos</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-orange-600">{statistics.questionsWithNotes}</p>
                                        <p className="text-sm text-gray-600 mt-1">With Notes</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Approval Remarks */}
                    {serviceData.approvalRemarks && (
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="text-lg">Manager Remarks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700">{serviceData.approvalRemarks}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Form Content */}
                    <Card className="mb-6">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-200">
                            <CardTitle className="text-xl font-semibold text-gray-800">
                                {hasAnswers ? 'Submitted Form' : 'Form Preview'}
                            </CardTitle>
                        </CardHeader>
                        {!hasAnswers && (
                            <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
                                <div className="flex items-start gap-3">
                                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-yellow-900">Service Not Yet Submitted</p>
                                        <p className="text-sm text-yellow-700 mt-1">
                                            This service is currently <strong>{serviceData.status}</strong>.
                                            The questions below will be answered by the technician when they complete the service.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                        <tr>
                                            <th className="px-4 py-4 text-center w-20 font-semibold text-sm">SL No</th>
                                            <th className="px-6 py-4 text-left font-semibold text-sm">Question</th>
                                            <th className="px-6 py-4 text-left font-semibold text-sm">Answer</th>
                                            <th className="px-6 py-4 text-left font-semibold text-sm">Notes</th>
                                            <th className="px-6 py-4 text-center font-semibold text-sm">Photo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.sections.map((section: any, sectionIndex: number) => (
                                            <Fragment key={section.id}>
                                                {/* Section Header */}
                                                <tr className="bg-gradient-to-r from-blue-50 to-blue-100/30">
                                                    <td colSpan={5} className="px-6 py-3 font-semibold text-gray-800 text-base border-y border-blue-200">
                                                        {section.sectionName}
                                                        {section.description && (
                                                            <span className="text-sm text-gray-600 ml-2 font-normal">
                                                                - {section.description}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Questions */}
                                                {section.questions.map((question: any, questionIndex: number) => {
                                                    const slNo = `${sectionIndex + 1}.${questionIndex + 1}`;
                                                    const answer = question.answer;

                                                    return (
                                                        <tr key={question.id} className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors duration-150">
                                                            <td className="px-4 py-4 text-center font-semibold text-gray-700">
                                                                {slNo}
                                                            </td>
                                                            <td className="px-6 py-4 border-l border-gray-200">
                                                                <div>
                                                                    <p className="font-medium text-gray-800">{question.questionText}</p>
                                                                    {question.helpText && (
                                                                        <p className="text-sm text-gray-500 mt-1">{question.helpText}</p>
                                                                    )}
                                                                    {question.isMandatory && (
                                                                        <Badge variant="destructive" className="mt-2 text-xs">
                                                                            Required
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 border-l border-gray-200">
                                                                {answer ? (
                                                                    <div className="space-y-2">
                                                                        <p className={`font-medium ${answer.answerValue === 'true' ? 'text-green-600' :
                                                                            answer.answerValue === 'false' ? 'text-red-600' :
                                                                                'text-gray-900'
                                                                            }`}>
                                                                            {answer.answerValue === 'true' ? 'Satisfactory' :
                                                                                answer.answerValue === 'false' ? 'Unsatisfactory' :
                                                                                    answer.answerValue || 'N/A'}
                                                                        </p>
                                                                        {answer.answeredAt && (
                                                                            <p className="text-xs text-gray-500">
                                                                                {new Date(answer.answeredAt).toLocaleString()}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400">Not answered</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 border-l border-gray-200">
                                                                {answer?.notes ? (
                                                                    <p className="text-sm text-gray-700">{answer.notes}</p>
                                                                ) : (
                                                                    <span className="text-gray-400 text-sm">No notes</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 border-l border-gray-200 text-center">
                                                                {answer?.photoBase64 ? (
                                                                    <button
                                                                        onClick={() => setSelectedPhoto(answer.photoBase64)}
                                                                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg cursor-pointer transition-colors text-sm text-blue-700 font-medium"
                                                                    >
                                                                        <ImageIcon className="h-4 w-4" />
                                                                        View
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-gray-400 text-sm">No photo</span>
                                                                )}
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
            </div>

            {/* Photo Viewer Dialog */}
            <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Photo Evidence</DialogTitle>
                    </DialogHeader>
                    {selectedPhoto && (
                        <div className="flex justify-center">
                            <img
                                src={selectedPhoto}
                                alt="Evidence"
                                className="max-h-[70vh] object-contain rounded-lg"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* PDF Preview Dialog */}
            <Dialog open={showPdfPreview} onOpenChange={handleClosePdfPreview}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            PDF Preview
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
        </>
    );
}
