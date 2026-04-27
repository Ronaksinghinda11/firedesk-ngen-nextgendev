import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { calendarApi, ServiceSubmission } from '@/services/api/calendarApi';
import { Loader2, User } from 'lucide-react';

interface TechnicianAssignmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    service: ServiceSubmission | null;
    onSuccess: () => void;
}

interface Technician {
    id: string;
    technicianId: string;
    user: {
        name: string;
        email: string;
    };
    plantId?: string;
    plants?: { id: string }[];
    categoryId?: string;
    categories?: { id: string }[];
    technicianType: string;
    status: string;
}

export function TechnicianAssignmentDialog({
    open,
    onOpenChange,
    service,
    onSuccess
}: TechnicianAssignmentDialogProps) {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open && service) {
            fetchTechnicians();
            setSelectedTechnicianId('');
        }
    }, [open, service]);

    const fetchTechnicians = async () => {
        if (!service) return;

        try {
            setLoading(true);
            // Use the eligible technicians endpoint which does proper filtering on the backend
            const response = await calendarApi.getEligibleTechnicians(service.id);

            if (response.success && response.technicians) {
                // Map the response to our Technician interface
                const eligibleTechnicians: Technician[] = response.technicians.map((tech: any) => ({
                    id: tech.id,
                    technicianId: tech.technicianCode || tech.id,
                    user: {
                        name: tech.name || 'Unknown',
                        email: tech.email || ''
                    },
                    technicianType: tech.technicianType || 'In House',
                    status: 'Active'
                }));
                setTechnicians(eligibleTechnicians);
            } else {
                setTechnicians([]);
            }
        } catch (error) {
            console.error('Failed to fetch technicians:', error);
            toast.error('Failed to load eligible technicians');
            setTechnicians([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!service || !selectedTechnicianId) {
            console.log('Missing data - service:', !!service, 'technicianId:', selectedTechnicianId);
            return;
        }

        try {
            setSubmitting(true);
            console.log(`🔧 Assigning technician ${selectedTechnicianId} to service ${service.id}`);
            const response = await calendarApi.assignTechnician(service.id, selectedTechnicianId);
            console.log('📥 Response:', response);

            if (response.success) {
                toast.success('Technician assigned successfully');
                onSuccess();
                onOpenChange(false);
            } else {
                console.log('❌ Assignment failed:', response);
                toast.error('Failed to assign technician');
            }
        } catch (error: any) {
            console.error('Failed to assign technician:', error);
            toast.error(error.response?.data?.message || 'Failed to assign technician');
        } finally {
            setSubmitting(false);
        }
    };

    if (!service) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Technician</DialogTitle>
                    <DialogDescription>
                        Assign a technician to service <span className="font-medium text-foreground">{service.asset.assetCode}</span> at {service.plant.plantName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Service Details</Label>
                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                            <div className="flex justify-between">
                                <span>Frequency:</span>
                                <span className="font-medium text-foreground">{service.frequency.frequencyName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Scheduled Date:</span>
                                <span className="font-medium text-foreground">
                                    {new Date(service.scheduledDate).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Location:</span>
                                <span className="font-medium text-foreground">{service.asset.location}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="technician">Select Technician</Label>
                        <Select
                            value={selectedTechnicianId}
                            onValueChange={setSelectedTechnicianId}
                            disabled={loading || submitting}
                        >
                            <SelectTrigger id="technician">
                                <SelectValue placeholder={loading ? "Loading technicians..." : "Select a technician"} />
                            </SelectTrigger>
                            <SelectContent>
                                {technicians.length === 0 && !loading ? (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                        No active technicians found for this plant.
                                    </div>
                                ) : (
                                    technicians.map((tech) => (
                                        <SelectItem key={tech.id} value={tech.id}>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span>{tech.user.name}</span>
                                                <span className="text-xs text-muted-foreground">({tech.technicianType})</span>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleAssign} disabled={!selectedTechnicianId || submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign Technician
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
