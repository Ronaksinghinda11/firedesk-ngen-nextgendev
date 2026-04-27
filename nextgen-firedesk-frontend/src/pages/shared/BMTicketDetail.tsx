// BM Ticket Detail Page - Works for all roles (Admin, Manager, Technician)
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wrench, AlertCircle, Clock, Package, MapPin } from 'lucide-react';
import { bmTicketApi } from '@/services/api/bmTicketApi';
import { BMWorkflowTimeline } from '@/components/bm-tickets/BMWorkflowTimeline';
import { SLATimer } from '@/components/bm-tickets/SLATimer';
import { BMStateForm } from '@/components/bm-tickets/BMStateForm';
import { SparePartsSelector } from '@/components/bm-tickets/SparePartsSelector';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BMTicketDetailProps {
  role: 'admin' | 'manager' | 'technician';
}

export function BMTicketDetail({ role }: BMTicketDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadTicket();
    }
  }, [id]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const data = await bmTicketApi.getBMTicket(id!);
      setTicket(data);
    } catch (error: any) {
      console.error('Error loading ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ticket details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colorMap: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-700 border-red-300',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      LOW: 'bg-green-100 text-green-700 border-green-300',
    };
    return colorMap[priority] || 'bg-gray-100 text-gray-700';
  };

  const getStateBadge = (state: string) => {
    const stateMap: Record<string, { label: string; color: string }> = {
      CREATED: { label: 'Created', color: 'bg-gray-100 text-gray-700' },
      NOTIFIED: { label: 'Notified', color: 'bg-blue-100 text-blue-700' },
      ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
      ACKNOWLEDGED: { label: 'Acknowledged', color: 'bg-purple-100 text-purple-700' },
      DIAGNOSIS: { label: 'Diagnosis', color: 'bg-yellow-100 text-yellow-700' },
      ACTION_IN_PROGRESS: { label: 'In Progress', color: 'bg-orange-100 text-orange-700' },
      TESTING: { label: 'Testing', color: 'bg-indigo-100 text-indigo-700' },
      CLOSURE_SUBMITTED: { label: 'Awaiting Review', color: 'bg-yellow-100 text-yellow-700' },
      SUPERVISOR_REVIEW: { label: 'Under Review', color: 'bg-purple-100 text-purple-700' },
      CLOSED: { label: 'Closed', color: 'bg-green-100 text-green-700' },
      REWORK: { label: 'Rework Required', color: 'bg-red-100 text-red-700' },
    };
    const config = stateMap[state] || { label: state, color: 'bg-gray-100 text-gray-700' };
    return (
      <Badge className={`${config.color} border`}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Ticket not found</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Wrench className="w-6 h-6 text-orange-500" />
              <h1 className="text-2xl font-bold">{ticket.ticket_code}</h1>
              {getStateBadge(ticket.bm_state)}
              <Badge className={getPriorityBadge(ticket.priority)}>
                {ticket.priority} Priority
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">
              {ticket.maintenance_type === 'BREAKDOWN' ? 'Breakdown' : 'Compliance'} Maintenance
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Task Name</p>
                  <p className="font-semibold">{ticket.task_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Asset / System</p>
                  <p className="font-semibold">
                    {ticket.asset?.name || 'N/A'} - {ticket.asset?.asset_code}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-semibold">
                    {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assigned To</p>
                  <p className="font-semibold">
                    {ticket.technician?.name || 'Unassigned'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Problem Description</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded border">
                  {ticket.task_description}
                </p>
              </div>

              {ticket.bm_metadata?.issue_type && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Issue Type:</span>
                  <Badge variant="outline">{ticket.bm_metadata.issue_type}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* State Form */}
          <BMStateForm
            ticket={ticket}
            onSuccess={loadTicket}
            userRole={role}
          />

          {/* Spare Parts (Read-only if already consumed) */}
          {ticket.spareConsumptions && ticket.spareConsumptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Consumed Spare Parts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ticket.spareConsumptions.map((consumption: any, index: number) => (
                    <div key={consumption.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          {consumption.spare?.name || 'Unknown Spare'}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          ₹{consumption.total_cost.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Quantity: {consumption.quantity_used} {consumption.spare?.unit || 'units'}</p>
                        <p>Unit Cost: ₹{consumption.unit_cost.toFixed(2)}</p>
                        {consumption.remarks && <p>Remarks: {consumption.remarks}</p>}
                        <p className="text-xs text-gray-500">
                          Used on {format(new Date(consumption.used_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {ticket.total_spare_cost && (
                    <div className="border-t-2 pt-3 flex justify-between items-center font-bold text-lg">
                      <span>Total Spare Cost:</span>
                      <span className="text-blue-600">₹{ticket.total_spare_cost.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata Display (for closed/completed tickets) */}
          {ticket.bm_state === 'CLOSED' && ticket.bm_metadata && (
            <Card>
              <CardHeader>
                <CardTitle>Work Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.bm_metadata.root_cause && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Root Cause</p>
                    <p className="text-gray-900">{ticket.bm_metadata.root_cause}</p>
                  </div>
                )}
                {ticket.bm_metadata.action_type && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Action Taken</p>
                    <Badge variant="outline">{ticket.bm_metadata.action_type}</Badge>
                  </div>
                )}
                {ticket.bm_metadata.work_description && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Work Description</p>
                    <p className="text-gray-900">{ticket.bm_metadata.work_description}</p>
                  </div>
                )}
                {ticket.bm_metadata.downtime_minutes !== undefined && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Downtime</p>
                    <p className="text-gray-900">{ticket.bm_metadata.downtime_minutes} minutes</p>
                  </div>
                )}
                {ticket.bm_metadata.test_status && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Test Status</p>
                    <Badge className={ticket.bm_metadata.test_status === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {ticket.bm_metadata.test_status}
                    </Badge>
                  </div>
                )}
                {ticket.bm_metadata.final_remarks && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Final Remarks</p>
                    <p className="text-gray-900 bg-blue-50 p-3 rounded border border-blue-200">
                      {ticket.bm_metadata.final_remarks}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Timeline & SLA */}
        <div className="space-y-6">
          {/* SLA Timer */}
          {ticket.slaStatus && (
            <SLATimer
              slaStatus={ticket.slaStatus}
              acknowledgedAt={ticket.acknowledged_at}
              slaDeadline={ticket.sla_deadline}
              priority={ticket.priority}
            />
          )}

          {/* Workflow Timeline */}
          <BMWorkflowTimeline
            currentState={ticket.bm_state}
            stateTransitions={ticket.stateTransitions || []}
          />

          {/* Quick Actions (for managers/admins) */}
          {(role === 'admin' || role === 'manager') && ticket.bm_state === 'NOTIFIED' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={async () => {
                    try {
                      // TODO: Open assign technician modal
                      toast({
                        title: 'Feature Coming Soon',
                        description: 'Technician assignment modal will open here',
                      });
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error.message,
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  Assign Technician
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
