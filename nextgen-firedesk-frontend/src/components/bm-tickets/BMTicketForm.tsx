// BM Ticket Create Form Component
import React, { useState, useEffect } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Wrench } from 'lucide-react';
import { bmTicketApi } from '@/services/api/bmTicketApi';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface BMTicketFormProps {
  onSuccess?: (ticket: any) => void;
  onCancel?: () => void;
}

export function BMTicketForm({ onSuccess, onCancel }: BMTicketFormProps) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    asset_id: '',
    maintenance_type: 'BREAKDOWN' as 'BREAKDOWN' | 'COMPLIANCE',
    priority: 'MEDIUM' as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    task_name: '',
    task_description: '',
    issue_type: '',
    technician_id: '',
    target_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      // Load assets
      const assetsRes = await api.get('/assets');
      setAssets(assetsRes.assets || []);

      // Load issue types
      const issueTypesRes = await bmTicketApi.getIssueTypes();
      setIssueTypes(issueTypesRes);

      // Load technicians
      const techRes = await api.get('/tickets/dropdown-data');
      setTechnicians(techRes.technicians || []);
    } catch (error: any) {
      console.error('Error loading dropdown data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form data',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.asset_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select an asset/system',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.task_name || !formData.task_description) {
      toast({
        title: 'Validation Error',
        description: 'Task name and problem description are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const ticket = await bmTicketApi.createBMTicket({
        ...formData,
        problem_description: formData.task_description,
        bm_metadata: {
          issue_type: formData.issue_type,
          severity: formData.priority,
          problem_description: formData.task_description,
        }
      });

      toast({
        title: 'Success',
        description: `BM Ticket ${ticket.ticket_code} created successfully`,
      });

      if (onSuccess) {
        onSuccess(ticket);
      }
    } catch (error: any) {
      console.error('Error creating BM ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create BM ticket',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-orange-500" />
          <CardTitle>Create Breakdown / Compliance Maintenance Ticket</CardTitle>
        </div>
        <CardDescription>
          Create a new maintenance ticket for equipment breakdown or compliance check
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Selection */}
          <div className="space-y-2">
            <Label htmlFor="asset_id">
              Asset / System <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.asset_id}
              onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset or system" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name} - {asset.asset_code || asset.assetId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Maintenance Type */}
          <div className="space-y-2">
            <Label>
              Maintenance Type <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="maintenance_type"
                  value="BREAKDOWN"
                  checked={formData.maintenance_type === 'BREAKDOWN'}
                  onChange={(e) => setFormData({ ...formData, maintenance_type: 'BREAKDOWN' })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Breakdown Maintenance</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="maintenance_type"
                  value="COMPLIANCE"
                  checked={formData.maintenance_type === 'COMPLIANCE'}
                  onChange={(e) => setFormData({ ...formData, maintenance_type: 'COMPLIANCE' })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Compliance Check</span>
              </label>
            </div>
          </div>

          {/* Priority/Severity */}
          <div className="space-y-2">
            <Label htmlFor="priority">
              Priority / Severity <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CRITICAL">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-600" />
                    <span>Critical (4 hour SLA)</span>
                  </div>
                </SelectItem>
                <SelectItem value="HIGH">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-500" />
                    <span>High (24 hour SLA)</span>
                  </div>
                </SelectItem>
                <SelectItem value="MEDIUM">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span>Medium (48 hour SLA)</span>
                  </div>
                </SelectItem>
                <SelectItem value="LOW">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span>Low (72 hour SLA)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="task_name">
              Task Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="task_name"
              placeholder="e.g., Motor Overheating Issue"
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
            />
          </div>

          {/* Problem Description */}
          <div className="space-y-2">
            <Label htmlFor="task_description">
              Problem Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="task_description"
              placeholder="Describe the problem in detail..."
              value={formData.task_description}
              onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
              rows={4}
            />
          </div>

          {/* Issue Type */}
          <div className="space-y-2">
            <Label htmlFor="issue_type">Issue Type (Optional)</Label>
            <Select
              value={formData.issue_type}
              onValueChange={(value) => setFormData({ ...formData, issue_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name} <span className="text-gray-500 text-xs">({type.category})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assign Technician */}
          <div className="space-y-2">
            <Label htmlFor="technician_id">Assign to Technician (Optional)</Label>
            <Select
              value={formData.technician_id}
              onValueChange={(value) => setFormData({ ...formData, technician_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign later" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label htmlFor="target_date">Target Completion Date</Label>
            <Input
              id="target_date"
              type="datetime-local"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            />
          </div>

          {/* Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">SLA Timer</p>
              <p>
                The SLA timer will start when the assigned technician acknowledges this ticket.
                {formData.priority === 'CRITICAL' && ' Critical tickets must be resolved within 4 hours.'}
                {formData.priority === 'HIGH' && ' High priority tickets must be resolved within 24 hours.'}
                {formData.priority === 'MEDIUM' && ' Medium priority tickets must be resolved within 48 hours.'}
                {formData.priority === 'LOW' && ' Low priority tickets must be resolved within 72 hours.'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? 'Creating...' : 'Create BM Ticket'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
