/**
 * Manager Tickets Page
 *
 * Displays tickets from plants assigned to the current manager.
 * Uses GenericEntityPage template with full CRUD operations.
 */

import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { Badge } from '@/components/ui/badge';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { Entity } from '@/types/permissions';
import { ticketApi } from '@/services/api/ticketApi';
import type { TicketFormData, TicketDropdownData, Asset } from '@/types/ticket.types';
import { CheckCircle, XCircle, Eye, CalendarIcon, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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


// Wizard steps configuration
const TICKET_WIZARD_STEPS = [
  { id: 'basic', name: 'Basic Information', description: 'Plant, asset, and category selection' },
  { id: 'details', name: 'Task Details', description: 'Task information and assignment' },
];

// Wizard steps component
const TicketWizardSteps = ({
  step,
  formData,
  setFormData
}: {
  step: string;
  formData: any;
  setFormData: any;
}) => {
  const [dropdownData, setDropdownData] = useState<TicketDropdownData>({
    plants: [],
    categories: [],
    technicians: [],
  });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    // Load dropdown data for the form
    const fetchDropdownData = async () => {
      try {
        const data = await ticketApi.getDropdownData();
        setDropdownData(data);
      } catch (error) {
        console.error('Failed to load dropdown data:', error);
      }
    };

    fetchDropdownData();
  }, []);


  // Load assets when plant and category are selected
  useEffect(() => {
    const fetchAssets = async () => {
      if (formData.plantId && formData.categoryId) {
        setLoadingAssets(true);
        try {
          const fetchedAssets = await ticketApi.getAssets(formData.plantId, formData.categoryId);
          setAssets(fetchedAssets);
        } catch (error) {
          console.error('Failed to load assets:', error);
          setAssets([]);
        } finally {
          setLoadingAssets(false);
        }
      } else {
        setAssets([]);
      }
    };

    fetchAssets();
  }, [formData.plantId, formData.categoryId]);

  // Auto-populate building when asset is selected
  useEffect(() => {
    if (formData.assetId && assets.length > 0) {
      const selectedAsset = assets.find(a => a.id === formData.assetId);
      if (selectedAsset && selectedAsset.buildingId) {
        setFormData({
          ...formData,
          buildingId: selectedAsset.buildingId,
          assetId: formData.assetId // Keep assetId
        });
      }
    }
  }, [formData.assetId, assets]);


  const renderFormWithSections = () => {
    switch (step) {
      case 'basic':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Location & Asset</CardTitle>
                <CardDescription>Select plant, category, and asset for this ticket</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Plant *</label>
                    <select
                      value={formData.plantId || ''}
                      onChange={(e) => setFormData({ ...formData, plantId: e.target.value, assetId: '', categoryId: '' })}
                      className="w-full p-2 border border-gray-300 rounded-md h-10 text-sm"
                      required
                    >
                      <option value="">Select Plant</option>
                      {dropdownData.plants.map((plant) => (
                        <option key={plant.id} value={plant.id}>
                          {plant.plantName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Category *</label>
                    <select
                      value={formData.categoryId || ''}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, assetId: '' })}
                      className="w-full p-2 border border-gray-300 rounded-md h-10 text-sm"
                      required
                      disabled={!formData.plantId}
                    >
                      <option value="">Select Category</option>
                      {dropdownData.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Asset *</label>
                  <select
                    value={formData.assetId || ''}
                    onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md h-10 text-sm"
                    required
                    disabled={!formData.plantId || !formData.categoryId || loadingAssets}
                  >
                    <option value="">{loadingAssets ? 'Loading assets...' : 'Select Asset'}</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.assetId} {asset.buildingRef?.buildingName ? `- ${asset.buildingRef.buildingName}` : ''}
                      </option>
                    ))}
                  </select>
                  {!formData.plantId || !formData.categoryId ? (
                    <p className="text-xs text-gray-500">Please select plant and category first</p>
                  ) : null}
                </div>
                {formData.buildingId && (
                  <div className="p-3 bg-blue-50 rounded-md flex items-center gap-2">
                    <span className="font-medium text-sm text-blue-800">Building:</span>
                    <span className="text-sm text-blue-700">Auto-populated from selected asset</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Target Date</CardTitle>
                <CardDescription>When should this task be completed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Target Date <span className="text-red-500">*</span></label>
                  <Popover open={isDatePickerOpen} onOpenChange={(open) => {
                    setIsDatePickerOpen(open);
                    if (open) setTempDate(formData.targetDate ? new Date(formData.targetDate) : undefined);
                  }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10 border-gray-300",
                          !formData.targetDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.targetDate ? (
                          format(new Date(formData.targetDate), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tempDate}
                        onSelect={setTempDate}
                        disabled={(date) => date < new Date(new Date().toISOString().split('T')[0])}
                        initialFocus
                      />
                      <div className="flex items-center justify-end gap-2 p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTempDate(formData.targetDate ? new Date(formData.targetDate) : undefined);
                            setIsDatePickerOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setFormData({ ...formData, targetDate: tempDate ? format(tempDate, "yyyy-MM-dd") : "" });
                            setIsDatePickerOpen(false);
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Task Information</CardTitle>
                <CardDescription>Describe the task to be performed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Task Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.taskName || ''}
                    onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                    placeholder="Enter task name"
                    className="w-full p-2 border border-gray-300 rounded-md h-10 text-sm"
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Task Description</label>
                  <Textarea
                    value={formData.taskDescription || ''}
                    onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                    placeholder="Enter detailed description (optional)"
                    className="w-full p-2 border border-gray-300 rounded-md min-h-[100px] text-sm"
                    maxLength={500}
                  />
                  {formData.taskDescription && (
                    <p className="text-xs text-gray-500">{formData.taskDescription.length}/500 characters</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Technician Assignment</CardTitle>
                <CardDescription>Assign a technician to this ticket (optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Technician</label>
                  <select
                    value={formData.technicianId || ''}
                    onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md h-10 text-sm"
                  >
                    <option value="">No technician assigned</option>
                    {dropdownData.technicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name} ({technician.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">You can assign a technician now or later</p>
                </div>
              </CardContent>
            </Card>

            {formData.id && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Ticket Status</CardTitle>
                  <CardDescription>Update the completion status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={formData.completedStatus || 'Pending'}
                      onChange={(e) => setFormData({ ...formData, completedStatus: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md h-10 text-sm"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Waiting for approval">Waiting for approval</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return renderFormWithSections();
};

export const ticketsConfig: EntityConfig = {
  entityName: 'Ticket',
  entityNamePlural: 'Tickets',
  apiEndpoint: '/api/manager/tickets',
  responseKey: 'tickets',

  // Permission-based access control
  permissionEntity: Entity.TICKETS,
  enforcePermissions: true,

  // No archive support for tickets
  supportsArchive: false,

  // UI customization: Hide specific buttons on Create/Edit page
  hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],

  // UI customization: Hide kebab menu from listing rows
  hideListingRowKebab: true,

  // UI customization: Limit top menu items to specific actions
  limitTopMenuItems: ['export', 'bulkActions', 'history'],

  // Required fields property (even though we use wizard)
  fields: [
    { name: 'plantId', label: 'Plant', type: 'text', required: true },
    { name: 'categoryId', label: 'Category', type: 'text', required: true },
    { name: 'assetId', label: 'Asset', type: 'text', required: true },
    { name: 'taskName', label: 'Task Name', type: 'text', required: true },
    { name: 'targetDate', label: 'Target Date', type: 'date', required: true },
  ],



  transformResponse: (data: any) => {
    if (!data) return { tickets: [] };

    // Extract tickets array from response object
    const ticketsArray = data.tickets || [];

    // Transform each ticket
    const transformedTickets = ticketsArray.map((ticket: any) => ({
      ...ticket,
      status: ticket.completedStatus, // Map completedStatus to status for GenericEntityPage
      plant: ticket.plant || { plantName: 'Unknown' },
      building: ticket.building || { buildingName: 'N/A' },
      asset: ticket.asset || { assetId: 'N/A' },
      technician: ticket.technician || { name: 'Unassigned' },
      category: ticket.category || { categoryName: 'N/A' },
    }));

    // Return in the same structure (with responseKey)
    return { tickets: transformedTickets };
  },

  // Custom table headers (Status, Created At, and Actions are auto-added by GenericEntityPage)
  customHeaders: [
    'ID',
    'DESCRIPTION',
    'PLANT',
    'BUILDING',
    'TECHNICIAN',
    'TARGET DATE',
  ],

  // Custom table columns
  customColumns: (ticket: any, isVisible: (fieldId: string) => boolean) => (
    <>
      <TableCell className="font-medium">{ticket.ticketId || 'N/A'}</TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{ticket.taskName}</div>
          {ticket.taskDescription && (
            <div className="text-sm text-gray-500 truncate max-w-xs">{ticket.taskDescription}</div>
          )}
        </div>
      </TableCell>
      <TableCell>{ticket.plant?.plantName || 'N/A'}</TableCell>
      <TableCell>{ticket.building?.buildingName || 'N/A'}</TableCell>
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
      <TableCell>{new Date(ticket.targetDate).toLocaleDateString('en-GB')}</TableCell>
    </>
  ),

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

export default function ManagerTickets() {
  const navigate = useNavigate();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editTicket, setEditTicket] = useState<any>(null);

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

  const configWithPlantFilter: any = {
    ...ticketsConfig,
    enablePlantFilter: true,
    refreshTrigger, // Pass refresh trigger to force re-fetch
    
    // Navigation overrides to use our new full-page create form
    onCreate: () => navigate('/manager/tickets/create'),
    // Override the default double-click/row edit action to route to the detail view
    onEdit: (ticket: any) => navigate(`/manager/tickets/${ticket.id}`),

    // Add custom row actions for approval/rejection and detail navigation
    customRowActions: (ticket: any) => {
      return (
        <div className="flex gap-2 items-center">
          {/* Bigger explicit View Details button instead of tiny Chevron */}
          <Button
            size="sm"
            variant="secondary"
            className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/manager/tickets/${ticket.id}`);
            }}
            title="View Details"
          >
            <Eye className="h-4 w-4 mr-1.5" />
            <span>View Ticket</span>
          </Button>

          {ticket.completedStatus === 'Waiting for approval' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedTicket(ticket);
                  setShowDetailsDialog(true);
                }}
                title="Details"
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
            </>
          )}
        </div>
      );
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
