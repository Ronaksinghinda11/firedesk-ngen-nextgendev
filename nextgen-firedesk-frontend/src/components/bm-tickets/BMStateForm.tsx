// BM State Form - Dynamic form based on current state
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SparePartsSelector } from './SparePartsSelector';
import { toast } from '@/hooks/use-toast';
import { bmTicketApi } from '@/services/api/bmTicketApi';
import { Upload } from 'lucide-react';

interface BMStateFormProps {
  ticket: any;
  onSuccess?: () => void;
  userRole: 'technician' | 'manager' | 'admin';
}

export function BMStateForm({ ticket, onSuccess, userRole }: BMStateFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>(ticket.bm_metadata || {});
  const [spares, setSpares] = useState<any[]>([]);

  const canEdit = () => {
    const state = ticket.bm_state;
    if (userRole === 'technician') {
      return ['ASSIGNED', 'ACKNOWLEDGED', 'DIAGNOSIS', 'ACTION_IN_PROGRESS', 'TESTING', 'REWORK'].includes(state);
    }
    if (userRole === 'manager' || userRole === 'admin') {
      return ['SUPERVISOR_REVIEW'].includes(state);
    }
    return false;
  };

  const getNextState = () => {
    const stateMap: Record<string, string> = {
      'ASSIGNED': 'ACKNOWLEDGED',
      'ACKNOWLEDGED': 'DIAGNOSIS',
      'DIAGNOSIS': 'ACTION_IN_PROGRESS',
      'ACTION_IN_PROGRESS': 'TESTING',
      'TESTING': 'CLOSURE_SUBMITTED',
      'CLOSURE_SUBMITTED': 'SUPERVISOR_REVIEW',
      'SUPERVISOR_REVIEW': 'CLOSED',
      'REWORK': 'ACTION_IN_PROGRESS',
    };
    return stateMap[ticket.bm_state] || null;
  };

  const getFormFields = () => {
    const state = ticket.bm_state;

    switch (state) {
      case 'ASSIGNED':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm text-blue-900">
                Click "Acknowledge" to accept this ticket and start working on it. The SLA timer will begin.
              </p>
            </div>
          </div>
        );

      case 'ACKNOWLEDGED':
      case 'DIAGNOSIS':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Issue Type <span className="text-red-500">*</span></Label>
              <Input
                value={formData.issue_type || ''}
                onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                placeholder="e.g., Electrical Failure, Mechanical Wear"
              />
            </div>
            <div className="space-y-2">
              <Label>Root Cause Description <span className="text-red-500">*</span></Label>
              <Textarea
                value={formData.root_cause || ''}
                onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                placeholder="Describe the root cause of the problem..."
                rows={4}
              />
            </div>
          </div>
        );

      case 'ACTION_IN_PROGRESS':
      case 'REWORK':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action Type <span className="text-red-500">*</span></Label>
              <Select
                value={formData.action_type || ''}
                onValueChange={(value) => setFormData({ ...formData, action_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPAIR">Repair</SelectItem>
                  <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="TEMPORARY_FIX">Temporary Fix</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Work Description <span className="text-red-500">*</span></Label>
              <Textarea
                value={formData.work_description || ''}
                onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
                placeholder="Describe the work performed..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_time || ''}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_time || ''}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Downtime (minutes)</Label>
              <Input
                type="number"
                value={formData.downtime_minutes || ''}
                onChange={(e) => setFormData({ ...formData, downtime_minutes: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            {/* Spare Parts */}
            <SparePartsSelector
              selectedSpares={spares}
              onChange={setSpares}
            />

            <div className="space-y-2">
              <Label>Before Photos</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Upload before photos (TODO: integrate file upload)</p>
              </div>
            </div>
          </div>
        );

      case 'TESTING':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>System Restored <span className="text-red-500">*</span></Label>
              <Select
                value={formData.system_restored !== undefined ? formData.system_restored.toString() : ''}
                onValueChange={(value) => setFormData({ ...formData, system_restored: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Functional Test Status <span className="text-red-500">*</span></Label>
              <Select
                value={formData.test_status || ''}
                onValueChange={(value) => setFormData({ ...formData, test_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASS">Pass</SelectItem>
                  <SelectItem value="FAIL">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>After Photos</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Upload after photos (TODO: integrate file upload)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Additional remarks..."
                rows={3}
              />
            </div>
          </div>
        );

      case 'CLOSURE_SUBMITTED':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm text-yellow-900">
              Waiting for supervisor review. The supervisor will either approve or request rework.
            </p>
          </div>
        );

      case 'SUPERVISOR_REVIEW':
        if (userRole === 'manager' || userRole === 'admin') {
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Supervisor Remarks</Label>
                <Textarea
                  value={formData.supervisor_remarks || ''}
                  onChange={(e) => setFormData({ ...formData, supervisor_remarks: e.target.value })}
                  placeholder="Add your review comments..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Final Remarks</Label>
                <Textarea
                  value={formData.final_remarks || ''}
                  onChange={(e) => setFormData({ ...formData, final_remarks: e.target.value })}
                  placeholder="Final remarks before closing..."
                  rows={3}
                />
              </div>
            </div>
          );
        }
        return null;

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            No editable form for current state
          </div>
        );
    }
  };

  const handleSubmit = async (action: 'transition' | 'rework' = 'transition') => {
    setLoading(true);
    try {
      // Validate required fields based on state
      if (ticket.bm_state === 'DIAGNOSIS') {
        if (!formData.issue_type || !formData.root_cause) {
          toast({
            title: 'Validation Error',
            description: 'Issue type and root cause are required',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      // First, attach spares if any
      if (spares.length > 0 && (ticket.bm_state === 'ACTION_IN_PROGRESS' || ticket.bm_state === 'REWORK')) {
        await bmTicketApi.attachSpares(ticket.id, spares);
      }

      // Then transition state
      const nextState = action === 'rework' ? 'REWORK' : getNextState();
      if (!nextState) {
        throw new Error('Invalid state transition');
      }

      await bmTicketApi.transitionState(ticket.id, nextState, formData);

      toast({
        title: 'Success',
        description: `Ticket transitioned to ${nextState}`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ticket',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit()) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Ticket</CardTitle>
        <CardDescription>
          Fill in the required information for {ticket.bm_state.replace(/_/g, ' ').toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {getFormFields()}

          <div className="flex justify-end gap-3 pt-4 border-t">
            {ticket.bm_state === 'SUPERVISOR_REVIEW' && (userRole === 'manager' || userRole === 'admin') ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit('rework')}
                  disabled={loading}
                  className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300"
                >
                  Request Rework
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit('transition')}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Approving...' : 'Approve & Close'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() => handleSubmit('transition')}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Submitting...' : `Submit & Continue`}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
