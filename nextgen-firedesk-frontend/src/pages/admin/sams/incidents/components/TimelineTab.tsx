import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { incidentApi, IncidentActivity } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import { Clock, User, AlertCircle } from 'lucide-react';

interface TimelineTabProps {
    incidentId: string;
}

const TimelineTab = ({ incidentId }: TimelineTabProps) => {
    const { toast } = useToast();
    const [activities, setActivities] = useState<IncidentActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTimeline();
    }, [incidentId]);

    const fetchTimeline = async () => {
        try {
            setLoading(true);
            const response = await incidentApi.getTimeline(incidentId);
            setActivities(response.data || []);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to load timeline',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    // Format metadata key to human-readable label
    const formatKey = (key: string) => {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/Id$/, '')
            .replace(/^./, s => s.toUpperCase())
            .trim();
    };

    // Check if a value looks like a UUID
    const isUUID = (val: any) => {
        if (typeof val !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    };

    // Format metadata into readable items, hiding UUIDs
    const formatMetadata = (metadata: any) => {
        if (!metadata || typeof metadata !== 'object') return null;

        const items: { label: string; value: string }[] = [];

        for (const [key, val] of Object.entries(metadata)) {
            // Skip UUID values - they're not human-readable
            if (isUUID(val)) continue;
            // Skip arrays of UUIDs
            if (Array.isArray(val) && val.length > 0 && val.every(v => isUUID(v))) continue;

            const label = formatKey(key);
            let displayValue: string;

            if (Array.isArray(val)) {
                displayValue = val.join(', ');
            } else if (typeof val === 'object' && val !== null) {
                continue; // Skip nested objects
            } else {
                displayValue = String(val);
            }

            items.push({ label, value: displayValue });
        }

        return items.length > 0 ? items : null;
    };

    const getActivityColor = (action: string) => {
        if (action.includes('Created')) return 'bg-blue-100 text-blue-800';
        if (action.includes('Assigned')) return 'bg-green-100 text-green-800';
        if (action.includes('Submitted')) return 'bg-purple-100 text-purple-800';
        if (action.includes('Approved')) return 'bg-green-100 text-green-800';
        if (action.includes('Rejected')) return 'bg-red-100 text-red-800';
        if (action.includes('Closed')) return 'bg-gray-600 text-white';
        return 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">Loading timeline...</div>
                </CardContent>
            </Card>
        );
    }

    if (activities.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No activity recorded yet.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="relative space-y-4">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                    {activities.map((activity, index) => (
                        <div key={activity.id} className="relative flex gap-4 pl-12">
                            {/* Timeline dot */}
                            <div className="absolute left-2 -translate-x-1/2 w-4 h-4 rounded-full bg-background border-2 border-primary" />

                            <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <Badge className={getActivityColor(activity.action)}>{activity.action}</Badge>
                                        {activity.description && (
                                            <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                                        <Clock className="h-3 w-3" />
                                        {new Date(activity.createdAt).toLocaleString()}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">
                                        {activity.performer?.name || 'Unknown User'}
                                    </span>
                                </div>

                                {(() => {
                                    const items = formatMetadata(activity.metadata);
                                    if (!items) return null;
                                    return (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {items.map((item, i) => (
                                                <span key={i} className="inline-flex items-center text-xs bg-muted px-2 py-1 rounded">
                                                    <span className="font-medium text-muted-foreground">{item.label}:</span>
                                                    <span className="ml-1">{item.value}</span>
                                                </span>
                                            ))}
                                        </div>
                                    );
                                })()}

                                {index < activities.length - 1 && <div className="border-b pt-2" />}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default TimelineTab;
