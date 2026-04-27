import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, FileText, AlertCircle, ChevronDown, ChevronUp, Upload, X } from 'lucide-react';
import { Incident, IncidentCapaStep, incidentApi, uploadApi } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';

interface UserInfo {
    id: string;
    email: string;
    name: string;
}

interface CapaWorkflowTabProps {
    incident: Incident;
    onUpdate: () => void;
    currentUser: UserInfo;
    isTeamMember: boolean;
    isTeamCreator: boolean;
}

const CapaWorkflowTab = ({ incident, onUpdate, currentUser, isTeamMember, isTeamCreator }: CapaWorkflowTabProps) => {
    const { toast } = useToast();
    const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
    const [reviewingStepId, setReviewingStepId] = useState<string | null>(null);
    const [stepResponse, setStepResponse] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileUploading, setFileUploading] = useState(false);

    const capaSteps = incident.capaSteps || [];

    const getStepIcon = (status: string) => {
        switch (status) {
            case 'Approved':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'Rejected':
                return <XCircle className="h-4 w-4 text-red-600" />;
            case 'Pending Approval':
                return <Clock className="h-4 w-4 text-yellow-600" />;
            case 'In Progress':
                return <FileText className="h-4 w-4 text-blue-600" />;
            default:
                return <FileText className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStepStatusColor = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'bg-green-100 text-green-800';
            case 'Rejected':
                return 'bg-red-100 text-red-800';
            case 'Pending Approval':
                return 'bg-yellow-100 text-yellow-800';
            case 'In Progress':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleExpandStep = (step: IncidentCapaStep) => {
        if (expandedStepId === step.id) {
            setExpandedStepId(null);
            setStepResponse('');
            setSelectedFile(null);
        } else {
            setExpandedStepId(step.id);
            setStepResponse(step.stepResponse || '');
            setSelectedFile(null);
            setReviewingStepId(null);
        }
    };

    const handleExpandReview = (step: IncidentCapaStep) => {
        if (reviewingStepId === step.id) {
            setReviewingStepId(null);
            setRejectionReason('');
        } else {
            setReviewingStepId(step.id);
            setRejectionReason('');
            setExpandedStepId(null);
        }
    };

    const handleSubmitStep = async (step: IncidentCapaStep) => {
        if (!stepResponse.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Step response is required',
                variant: 'destructive'
            });
            return;
        }

        if (step.isDocumentRequired && !selectedFile) {
            toast({
                title: 'Validation Error',
                description: 'Document upload is required for this step',
                variant: 'destructive'
            });
            return;
        }

        try {
            setSubmitting(true);
            let documentsData = null;

            if (selectedFile) {
                setFileUploading(true);
                try {
                    const uploadResult = await uploadApi.uploadFile(selectedFile);
                    documentsData = {
                        name: uploadResult.data.originalName,
                        url: uploadResult.data.url,
                        type: uploadResult.data.mimetype,
                        size: uploadResult.data.size
                    };
                } catch (error) {
                    console.error("Upload failed", error);
                    toast({
                        title: 'Upload Failed',
                        description: 'Failed to upload document. Please try again.',
                        variant: 'destructive'
                    });
                    setSubmitting(false);
                    setFileUploading(false);
                    return;
                }
                setFileUploading(false);
            }

            await incidentApi.submitCapaStep(incident.id, step.id, {
                stepResponse,
                documentsData: documentsData
            });

            toast({
                title: 'Success',
                description: step.isApprovalRequired
                    ? 'CAPA step submitted for approval'
                    : 'CAPA step completed'
            });

            setExpandedStepId(null);
            setStepResponse('');
            setSelectedFile(null);
            onUpdate();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to submit CAPA step',
                variant: 'destructive'
            });
        } finally {
            setSubmitting(false);
            setFileUploading(false);
        }
    };

    const handleReviewStep = async (step: IncidentCapaStep, approved: boolean) => {
        if (!approved && !rejectionReason.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Rejection reason is required',
                variant: 'destructive'
            });
            return;
        }

        try {
            setSubmitting(true);
            await incidentApi.reviewCapaStep(incident.id, step.id, {
                approved,
                rejectionReason: approved ? undefined : rejectionReason
            });

            toast({
                title: 'Success',
                description: `CAPA step ${approved ? 'approved' : 'rejected'} successfully`
            });

            setReviewingStepId(null);
            setRejectionReason('');
            onUpdate();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to review CAPA step',
                variant: 'destructive'
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (capaSteps.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">No CAPA steps initialized yet.</p>
                <p className="text-xs mt-1">CAPA steps will be created when a team is assigned.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {capaSteps.map((step) => {
                const isExpanded = expandedStepId === step.id;
                const isReviewing = reviewingStepId === step.id;
                const canSubmit = (step.status === 'Not Started' || step.status === 'Rejected') && isTeamMember;
                const canReview = step.status === 'Pending Approval' && isTeamCreator;

                return (
                    <div key={step.id} className="border rounded-lg bg-white overflow-hidden">
                        {/* Step Header - Compact */}
                        <div className="px-3 py-2 flex items-center justify-between bg-gray-50/50 border-b">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                {getStepIcon(step.status)}
                                <span className="font-medium text-sm truncate">
                                    Step {step.stepNumber}: {step.stepName}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge className={`${getStepStatusColor(step.status)} text-xs`}>{step.status}</Badge>
                                {canSubmit && (
                                    <Button
                                        size="sm"
                                        variant={isExpanded ? "secondary" : "default"}
                                        className="h-7 text-xs"
                                        onClick={() => handleExpandStep(step)}
                                    >
                                        {isExpanded ? <><ChevronUp className="h-3 w-3 mr-1" />Close</> : 'Submit Response'}
                                    </Button>
                                )}
                                {canReview && (
                                    <Button
                                        size="sm"
                                        variant={isReviewing ? "secondary" : "outline"}
                                        className="h-7 text-xs"
                                        onClick={() => handleExpandReview(step)}
                                    >
                                        {isReviewing ? <><ChevronUp className="h-3 w-3 mr-1" />Close</> : 'Review'}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Step Content - Compact */}
                        <div className="px-3 py-2 text-xs space-y-2">
                            {step.stepDescription && (
                                <p className="text-muted-foreground">{step.stepDescription}</p>
                            )}

                            <div className="flex gap-4 text-muted-foreground">
                                <span>Document: <Badge variant={step.isDocumentRequired ? 'default' : 'secondary'} className="text-[10px] ml-1">{step.isDocumentRequired ? 'Yes' : 'No'}</Badge></span>
                                <span>Approval: <Badge variant={step.isApprovalRequired ? 'default' : 'secondary'} className="text-[10px] ml-1">{step.isApprovalRequired ? 'Yes' : 'Auto'}</Badge></span>
                            </div>

                            {/* Existing Response */}
                            {step.stepResponse && !isExpanded && (
                                <div className="bg-gray-50 p-2 rounded border mt-2">
                                    <p className="text-xs font-medium text-gray-600 mb-1">Response:</p>
                                    <p className="text-sm whitespace-pre-wrap">{step.stepResponse}</p>
                                    {step.documentsData && (
                                        <div className="mt-2 flex items-center gap-2 text-xs bg-white p-1.5 rounded border">
                                            <FileText className="h-3 w-3 text-primary" />
                                            <span className="truncate flex-1">{step.documentsData.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs text-primary"
                                                onClick={() => {
                                                    const url = step.documentsData.url;
                                                    const baseUrl = (import.meta as any).env?.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
                                                    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
                                                    window.open(fullUrl, '_blank');
                                                }}
                                            >
                                                View
                                            </Button>
                                        </div>
                                    )}
                                    {step.submitter && (
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            Submitted by {step.submitter.name} on {step.submittedAt ? new Date(step.submittedAt).toLocaleString() : 'N/A'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Rejection Reason Display */}
                            {step.status === 'Rejected' && step.rejectionReason && !isExpanded && (
                                <div className="bg-red-50 p-2 rounded border border-red-200">
                                    <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason:</p>
                                    <p className="text-xs text-red-600">{step.rejectionReason}</p>
                                </div>
                            )}

                            {/* Approval Info */}
                            {step.status === 'Approved' && step.approver && (
                                <p className="text-[10px] text-muted-foreground">
                                    Approved by {step.approver.name} on {step.approvedAt ? new Date(step.approvedAt).toLocaleString() : 'N/A'}
                                </p>
                            )}
                        </div>

                        {/* Inline Submit Form */}
                        {isExpanded && (
                            <div className="px-3 py-3 border-t bg-blue-50/30 space-y-3">
                                <div>
                                    <Label className="text-xs font-medium">Your Response *</Label>
                                    <Textarea
                                        value={stepResponse}
                                        onChange={(e) => setStepResponse(e.target.value)}
                                        placeholder="Enter your response for this CAPA step..."
                                        rows={3}
                                        className="mt-1 text-sm"
                                    />
                                </div>

                                {step.isDocumentRequired && (
                                    <div>
                                        <Label className="text-xs font-medium">Supporting Document *</Label>
                                        <div className="mt-1 border border-dashed rounded p-3 bg-white">
                                            <input
                                                type="file"
                                                id={`doc-${step.id}`}
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setSelectedFile(e.target.files[0]);
                                                    }
                                                }}
                                                disabled={submitting || fileUploading}
                                            />
                                            {selectedFile ? (
                                                <div className="flex items-center gap-2 text-sm text-green-600">
                                                    <FileText className="h-4 w-4" />
                                                    <span className="truncate flex-1">{selectedFile.name}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-red-500"
                                                        onClick={() => setSelectedFile(null)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="flex items-center justify-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-primary"
                                                    onClick={() => document.getElementById(`doc-${step.id}`)?.click()}
                                                >
                                                    <Upload className="h-4 w-4" />
                                                    <span>Click to upload document</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {step.isApprovalRequired && (
                                    <div className="bg-blue-100 p-2 rounded text-xs text-blue-800">
                                        This step requires approval from the team creator after submission.
                                    </div>
                                )}

                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" size="sm" onClick={() => setExpandedStepId(null)} disabled={submitting}>
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={() => handleSubmitStep(step)} disabled={submitting}>
                                        {submitting ? 'Submitting...' : 'Submit'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Inline Review Form */}
                        {isReviewing && (
                            <div className="px-3 py-3 border-t bg-yellow-50/30 space-y-3">
                                <div>
                                    <Label className="text-xs font-medium">Step Response:</Label>
                                    <div className="mt-1 bg-white p-2 rounded border text-sm">
                                        {step.stepResponse}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs font-medium">Rejection Reason (if rejecting)</Label>
                                    <Textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Provide reason for rejection..."
                                        rows={2}
                                        className="mt-1 text-sm"
                                    />
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" size="sm" onClick={() => setReviewingStepId(null)} disabled={submitting}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleReviewStep(step, false)} disabled={submitting}>
                                        Reject
                                    </Button>
                                    <Button size="sm" onClick={() => handleReviewStep(step, true)} disabled={submitting}>
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default CapaWorkflowTab;
