import { useState, useEffect } from 'react';
import { incidentApi } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface TeamAssignmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    incidentId: string;
    plantId: string;
    onSuccess: () => void;
}

const TeamAssignmentDialog = ({ open, onOpenChange, incidentId, plantId, onSuccess }: TeamAssignmentDialogProps) => {
    const { toast } = useToast();
    const [availableMembers, setAvailableMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [teamLeaderId, setTeamLeaderId] = useState<string>('no_leader');

    useEffect(() => {
        if (open && incidentId) {
            fetchAvailableMembers();
        }
    }, [open, incidentId]);

    const fetchAvailableMembers = async () => {
        try {
            setLoading(true);
            const response = await incidentApi.getAvailableMembers(incidentId);
            setAvailableMembers(response.data || []);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to load available members',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedMembers([]);
        setTeamLeaderId('no_leader');
        onOpenChange(false);
    };

    const toggleMember = (userId: string) => {
        setSelectedMembers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedMembers.length === 0) {
            toast({
                title: 'Validation Error',
                description: 'Please select at least one team member',
                variant: 'destructive'
            });
            return;
        }

        if (teamLeaderId && teamLeaderId !== 'no_leader' && !selectedMembers.includes(teamLeaderId)) {
            toast({
                title: 'Validation Error',
                description: 'Team leader must be one of the selected members',
                variant: 'destructive'
            });
            return;
        }

        try {
            setSubmitting(true);
            await incidentApi.assignTeam(incidentId, {
                teamMemberIds: selectedMembers,
                teamLeaderId: (teamLeaderId && teamLeaderId !== 'no_leader') ? teamLeaderId : undefined
            });

            toast({
                title: 'Success',
                description: 'Team assigned successfully'
            });

            handleClose();
            onSuccess();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to assign team',
                variant: 'destructive'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Assign Team to Incident</DialogTitle>
                        <DialogDescription>
                            Select team members from the incident's plant. One of them can be designated as the team leader.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {loading ? (
                            <div className="text-center text-muted-foreground">Loading available members...</div>
                        ) : availableMembers.length === 0 ? (
                            <div className="text-center text-muted-foreground">No available members found in this plant</div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>Team Members *</Label>
                                    <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                                        {availableMembers.map((member) => (
                                            <div key={member.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={member.id}
                                                    checked={selectedMembers.includes(member.id)}
                                                    onCheckedChange={() => toggleMember(member.id)}
                                                />
                                                <Label
                                                    htmlFor={member.id}
                                                    className="flex-1 cursor-pointer font-normal"
                                                >
                                                    <div>
                                                        <div className="font-medium">{member.name}</div>
                                                        <div className="text-xs text-muted-foreground">{member.email}</div>
                                                    </div>
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                                    </p>
                                </div>

                                {selectedMembers.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Team Leader (Optional)</Label>
                                        <Select value={teamLeaderId} onValueChange={setTeamLeaderId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select team leader" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="no_leader">No leader</SelectItem>
                                                {availableMembers
                                                    .filter((m) => selectedMembers.includes(m.id))
                                                    .map((member) => (
                                                        <SelectItem key={member.id} value={member.id}>
                                                            {member.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || loading || selectedMembers.length === 0}>
                            {submitting ? 'Assigning...' : 'Assign Team'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default TeamAssignmentDialog;
