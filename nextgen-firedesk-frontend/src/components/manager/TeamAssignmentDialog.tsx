import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, UserPlus, Users } from 'lucide-react';
import { managerApi } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';

interface TeamMember {
  tempId: string;
  userId?: string;
  externalPersonName?: string;
  externalPersonEmail?: string;
  externalPersonPhone?: string;
  role: string;
  displayName: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  userType?: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLeaderId, setTeamLeaderId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // External member form state - COMMENTED OUT (Future requirement)
  // const [showExternalForm, setShowExternalForm] = useState(false);
  // const [externalName, setExternalName] = useState('');
  // const [externalEmail, setExternalEmail] = useState('');
  // const [externalPhone, setExternalPhone] = useState('');
  // const [externalRole, setExternalRole] = useState('External');

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await managerApi.incidents.getAvailableUsers(searchQuery, plantId);

      // Backend now filters out admin users and filters by plant association
      setUsers(response.data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const addInternalUser = (user: User, role: string) => {
    // Check if already added
    if (teamMembers.some(m => m.userId === user.id)) {
      toast({
        title: "Already Added",
        description: `${user.name} is already in the team`,
        variant: "destructive"
      });
      return;
    }

    const member: TeamMember = {
      tempId: `internal-${user.id}`,
      userId: user.id,
      role,
      displayName: `${user.name} (${user.email})`
    };

    setTeamMembers([...teamMembers, member]);

    // Auto-select as team leader if first member
    if (teamMembers.length === 0) {
      setTeamLeaderId(member.tempId);
    }
  };

  // COMMENTED OUT: Add external member function (Future requirement)
  // const addExternalMember = () => {
  //   if (!externalName || !externalEmail) {
  //     toast({
  //       title: "Missing Information",
  //       description: "Name and email are required for external members",
  //       variant: "destructive"
  //     });
  //     return;
  //   }

  //   const member: TeamMember = {
  //     tempId: `external-${Date.now()}`,
  //     externalPersonName: externalName,
  //     externalPersonEmail: externalEmail,
  //     externalPersonPhone: externalPhone,
  //     role: externalRole,
  //     displayName: `${externalName} (${externalEmail}) - External`
  //   };

  //   setTeamMembers([...teamMembers, member]);

  //   // Auto-select as team leader if first member
  //   if (teamMembers.length === 0) {
  //     setTeamLeaderId(member.tempId);
  //   }

  //   // Reset form
  //   setExternalName('');
  //   setExternalEmail('');
  //   setExternalPhone('');
  //   setExternalRole('External');
  //   setShowExternalForm(false);
  // };

  const removeMember = (tempId: string) => {
    setTeamMembers(teamMembers.filter(m => m.tempId !== tempId));
    if (teamLeaderId === tempId) {
      setTeamLeaderId(teamMembers.length > 1 ? teamMembers[0].tempId : '');
    }
  };

  const handleSubmit = async () => {
    if (teamMembers.length === 0) {
      toast({
        title: "No Team Members",
        description: "Please add at least one team member",
        variant: "destructive"
      });
      return;
    }

    if (!teamLeaderId) {
      toast({
        title: "No Team Leader",
        description: "Please select a team leader",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      // Find the team leader's userId or email for backend
      const leader = teamMembers.find(m => m.tempId === teamLeaderId);
      const leaderIdentifier = leader?.userId || leader?.externalPersonEmail || '';

      // Prepare assignments for API
      const assignments = teamMembers.map(member => ({
        userId: member.userId || null,
        externalPersonName: member.externalPersonName || null,
        externalPersonEmail: member.externalPersonEmail || null,
        externalPersonPhone: member.externalPersonPhone || null,
        role: member.role
      }));

      await managerApi.incidents.assignTeam(incidentId, assignments, leaderIdentifier);

      toast({
        title: "Success",
        description: "Team assigned successfully"
      });

      onSuccess();
      onOpenChange(false);
      setTeamMembers([]);
      setTeamLeaderId('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to assign team",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Team to Incident</DialogTitle>
          <DialogDescription>
            Select internal team members and designate a team leader
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add Team Members */}
          <div className="space-y-3">
            <Label>Add Team Members</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No users found</div>
              ) : (
                <div className="divide-y">
                  {users.map(user => (
                    <div key={user.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <Select onValueChange={(role) => addInternalUser(user, role)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Add as..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Safety Engineer">Safety Engineer</SelectItem>
                          <SelectItem value="Investigator">Investigator</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COMMENTED OUT: Add External Member UI (Future requirement) */}
          {/* <div className="space-y-3">
            {!showExternalForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExternalForm(true)}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add External Team Member
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <Label>External Team Member</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExternalForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Name *"
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Email *"
                  value={externalEmail}
                  onChange={(e) => setExternalEmail(e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={externalPhone}
                  onChange={(e) => setExternalPhone(e.target.value)}
                />
                <Select value={externalRole} onValueChange={setExternalRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="External">External</SelectItem>
                    <SelectItem value="Safety Engineer">Safety Engineer</SelectItem>
                    <SelectItem value="Investigator">Investigator</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addExternalMember} className="w-full">
                  Add Member
                </Button>
              </div>
            )}
          </div> */}

          {/* Team Members List & Leader Selection */}
          {teamMembers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <Label>Team Members ({teamMembers.length})</Label>
              </div>
              <RadioGroup value={teamLeaderId} onValueChange={setTeamLeaderId}>
                <div className="space-y-2">
                  {teamMembers.map(member => (
                    <div
                      key={member.tempId}
                      className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <RadioGroupItem value={member.tempId} id={member.tempId} />
                        <Label htmlFor={member.tempId} className="cursor-pointer flex-1">
                          <div>
                            <p className="font-medium">{member.displayName}</p>
                            <p className="text-sm text-gray-600">{member.role}</p>
                          </div>
                        </Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.tempId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              <p className="text-sm text-gray-600">
                Select the team leader who will fill CAPA steps
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || teamMembers.length === 0}>
            {submitting ? 'Assigning...' : 'Assign Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamAssignmentDialog;
