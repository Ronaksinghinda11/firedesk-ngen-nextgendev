/**
 * Admin Tickets Page
 *
 * Displays tickets from all plants with full CRUD operations.
 * Uses GenericEntityPage template with full CRUD operations.
 */

import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { Badge } from '@/components/ui/badge';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Entity } from '@/types/permissions';
import { ticketApi } from '@/services/api/ticketApi';
import type { TicketFormData, TicketDropdownData, Asset } from '@/types/ticket.types';
import { CheckCircle, XCircle, Eye, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';



export const ticketsConfig: EntityConfig = {
    entityName: 'Ticket',
    entityNamePlural: 'Tickets',
    apiEndpoint: '/tickets',
    responseKey: 'tickets',

    // Permission-based access control
    permissionEntity: Entity.TICKETS,
    enforcePermissions: true,

    // No archive support
    supportsArchive: false,

    // UI customization
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'bulkActions', 'history'],

    // Remove formLayout and formSections entirely
    fields: [],


    // Transform response data
    transformResponse: (data: any) => {
        if (!data) return { tickets: [] };
        const ticketsArray = data.tickets || [];
        const transformedTickets = ticketsArray.map((ticket: any) => ({
            ...ticket,
            status: ticket.completedStatus,
            plant: ticket.plant || { plantName: 'Unknown' },
            building: ticket.building || { buildingName: 'N/A' },
            asset: ticket.asset || { assetId: 'N/A' },
            technician: ticket.technician || { name: 'Unassigned' },
            category: ticket.category || { categoryName: 'N/A' },
        }));
        return { tickets: transformedTickets };
    },

    // generic implementation with filter attributes
    filterAttributes: [
        { id: 'ticketId', label: 'ID', type: 'text', sortable: true, sticky: true },
        { id: 'taskName', label: 'Description', type: 'text', sortable: true },
        { id: 'plant', label: 'Plant', type: 'select', dynamicOptionsFromEntities: true, entityField: 'plantName' },
        { id: 'building', label: 'Building', type: 'select', dynamicOptionsFromEntities: true, entityField: 'buildingName' },
        { id: 'technician', label: 'Technician', type: 'select', dynamicOptionsFromEntities: true, entityField: 'name' }, // Use 'name' from technician object
        { id: 'targetDate', label: 'Target Date', type: 'date' },

    ],

    // Custom table columns with visibility check
    customColumns: (ticket: any, isVisible?: (id: string) => boolean) => {
        const checkVisible = isVisible || (() => true);
        return (
            <>
                {checkVisible('ticketId') && (
                    <TableCell className="font-medium sticky left-0 z-30 bg-white shadow-[1px_0_0_0_#f3f4f6]">
                        {ticket.ticketId || 'N/A'}
                    </TableCell>
                )}

                {checkVisible('taskName') && (
                    <TableCell>
                        <div>
                            <div className="font-medium">{ticket.taskName}</div>
                            {ticket.taskDescription && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">{ticket.taskDescription}</div>
                            )}
                        </div>
                    </TableCell>
                )}

                {checkVisible('plant') && (
                    <TableCell>{ticket.plant?.plantName || 'N/A'}</TableCell>
                )}

                {checkVisible('building') && (
                    <TableCell>{ticket.building?.buildingName || 'N/A'}</TableCell>
                )}

                {checkVisible('technician') && (
                    <TableCell>
                        {ticket.technician?.name ? (
                            <div>
                                <div className="font-medium">{ticket.technician.name}</div>
                                {ticket.technician.email && (
                                    <div className="text-xs text-gray-500">{ticket.technician.email}</div>
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-400">Unassigned</span>
                        )}
                    </TableCell>
                )}

                {checkVisible('targetDate') && (
                    <TableCell>{new Date(ticket.targetDate).toLocaleDateString('en-GB')}</TableCell>
                )}

                {checkVisible('status') && (
                    <TableCell>
                        <span
                            className={
                                ticket.completedStatus === 'Completed' ? 'text-green-600 font-medium' :
                                    ticket.completedStatus === 'Pending' ? 'text-yellow-600 font-medium' :
                                        ticket.completedStatus === 'Rejected' ? 'text-red-600 font-medium' :
                                            'text-gray-600'
                            }
                        >
                            {ticket.completedStatus || 'Pending'}
                        </span>
                    </TableCell>
                )}

            </>
        )
    },

    // Custom status rendering (overrides default status badge)
    customStatusRender: (ticket: any) => (
        <Badge
            variant={
                ticket.completedStatus === 'Completed' ? "default" :
                    ticket.completedStatus === 'Rejected' ? "destructive" :
                        ticket.completedStatus === 'Waiting for approval' ? "secondary" :
                            "outline"
            }
            className="text-xs"
        >
            {ticket.completedStatus}
        </Badge>
    ),
};

export default function AdminTickets() {
    const navigate = useNavigate();
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [rejectComment, setRejectComment] = useState('');
    const [approveComment, setApproveComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleApprove = async () => {
        if (!selectedTicket) return;

        try {
            setIsSubmitting(true);
            await ticketApi.approve(selectedTicket.id, approveComment || undefined);
            toast.success('Ticket approved successfully');
            setShowApproveDialog(false);
            setApproveComment('');
            setSelectedTicket(null);
            setRefreshTrigger(prev => prev + 1); // Trigger refresh
        } catch (error: any) {
            console.error('Failed to approve ticket:', error);
            toast.error(error.response?.data?.message || 'Failed to approve ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!selectedTicket || !rejectComment.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        try {
            setIsSubmitting(true);
            await ticketApi.reject(selectedTicket.id, rejectComment);
            toast.success('Ticket rejected');
            setShowRejectDialog(false);
            setRejectComment('');
            setSelectedTicket(null);
            setRefreshTrigger(prev => prev + 1); // Trigger refresh
        } catch (error: any) {
            console.error('Failed to reject ticket:', error);
            toast.error(error.response?.data?.message || 'Failed to reject ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFixedStatusBadge = (response: any) => {
        if (response.isFixed === null || response.isFixed === undefined) return null;

        return (
            <Badge
                variant={response.isFixed ? "default" : "secondary"}
                className="text-xs ml-2"
            >
                {response.isFixed ? '✓ Fixed' : '✗ Not Fixed'}
            </Badge>
        );
    };

    // Plant filter now handled automatically by GenericEntityPage
    const configWithPlantFilter: any = {
        ...ticketsConfig,
        enablePlantFilter: true,
        fetchTrigger: refreshTrigger, // Pass refresh trigger to force re-fetch
        
        // Navigation overrides
        onCreate: () => navigate('/admin/tickets/create'),
        onEdit: (ticket: any) => navigate(`/admin/tickets/${ticket.id}`), // Navigate to detail view on row click (admin can view/approve)
        // Add custom row actions for approval/rejection
        customActions: (ticket: any) => {
            if (ticket.completedStatus === 'Waiting for approval') {
                return (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setSelectedTicket(ticket);
                                setShowDetailsDialog(true);
                            }}
                            title="View Details"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                                setSelectedTicket(ticket);
                                setShowApproveDialog(true);
                            }}
                            title="Approve"
                        >
                            <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                                setSelectedTicket(ticket);
                                setShowRejectDialog(true);
                            }}
                            title="Reject"
                        >
                            <XCircle className="h-4 w-4" />
                        </Button>
                    </div>
                );
            }

            // For Completed or Rejected tickets, show view details button
            if (ticket.completedStatus === 'Completed' || ticket.completedStatus === 'Rejected') {
                return (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setSelectedTicket(ticket);
                                setShowDetailsDialog(true);
                            }}
                            title="View Submission History"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                );
            }

            return null;
        },
    };

    return (
        <>
            <GenericEntityPage config={configWithPlantFilter} />

            {/* Ticket Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Ticket Details - {selectedTicket?.ticketId}</DialogTitle>
                        <DialogDescription>{selectedTicket?.taskName}</DialogDescription>
                    </DialogHeader>
                    {selectedTicket && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium mb-2">Description</h4>
                                <p className="text-sm text-gray-600">{selectedTicket.taskDescription || 'No description'}</p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">Asset & Location</h4>
                                <div className="text-sm space-y-1">
                                    <p><span className="font-medium">Asset:</span> {selectedTicket.asset?.assetId || 'N/A'}</p>
                                    <p><span className="font-medium">Plant:</span> {selectedTicket.plant?.plantName || 'N/A'}</p>
                                    <p><span className="font-medium">Building:</span> {selectedTicket.building?.buildingName || 'N/A'}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">Submission History</h4>
                                {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedTicket.responses.map((response: any) => (
                                            <div key={response.id} className="border-l-2 border-gray-200 pl-3 py-2">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="font-medium text-sm">{response.user?.name || 'Unknown'}</span>
                                                    <Badge variant="outline" className="text-xs">{response.responseType}</Badge>
                                                    {response.responseType === 'submission' && getFixedStatusBadge(response)}
                                                    <span className="text-xs text-gray-500 ml-auto">
                                                        {new Date(response.createdAt).toLocaleString('en-GB')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700">{response.comment}</p>
                                                {response.photoUrls && response.photoUrls.length > 0 && (
                                                    <div className="mt-2 flex gap-2 flex-wrap">
                                                        {response.photoUrls.map((url: string, idx: number) => {
                                                            // Ensure URL is absolute/correctly formatted
                                                            const safeUrl = url.startsWith('http') ? url : url.startsWith('/') ? url : `/${url}`;
                                                            // Handle proxy/backend path if needed (assuming /upload/ID format involves valid backend route)
                                                            return (
                                                                <a key={idx} href={safeUrl} target="_blank" rel="noopener noreferrer">
                                                                    <img src={safeUrl} alt="Evidence" className="h-16 w-16 object-cover rounded border" />
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No submissions yet</p>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                            Close
                        </Button>
                        {selectedTicket?.completedStatus === 'Waiting for approval' && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        setShowDetailsDialog(false);
                                        setShowRejectDialog(true);
                                    }}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                                <Button
                                    onClick={() => {
                                        setShowDetailsDialog(false);
                                        setShowApproveDialog(true);
                                    }}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Ticket</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to approve this ticket? This will mark it as completed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Optional Comment</label>
                            <Textarea
                                value={approveComment}
                                onChange={(e) => setApproveComment(e.target.value)}
                                placeholder="Add an optional comment..."
                                rows={3}
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowApproveDialog(false);
                                setApproveComment('');
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleApprove} disabled={isSubmitting}>
                            {isSubmitting ? 'Approving...' : 'Approve'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Ticket</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this ticket. The technician will be able to see this and resubmit.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Rejection Reason *</label>
                            <Textarea
                                value={rejectComment}
                                onChange={(e) => setRejectComment(e.target.value)}
                                placeholder="Explain why this ticket is being rejected..."
                                rows={4}
                                className="mt-2"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowRejectDialog(false);
                                setRejectComment('');
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectComment.trim() || isSubmitting}
                        >
                            {isSubmitting ? 'Rejecting...' : 'Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}