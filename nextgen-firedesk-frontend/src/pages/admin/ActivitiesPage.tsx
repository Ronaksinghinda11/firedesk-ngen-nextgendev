import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity as ActivityIcon, 
  Wrench, 
  Factory, 
  Users, 
  UserCog, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Package
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  userName: string;
  userType: string;
  description: string;
  createdAt: string;
}

export const ActivitiesPage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivities();
  }, [page]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/activity?page=${page}&limit=20`);
      
      if ((response as any).success) {
        setActivities((response as any).activities || []);
        setTotal((response as any).total || 0);
        setTotalPages((response as any).totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      toast({
        title: "Error",
        description: "Failed to fetch activities",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'technician':
        return <Wrench className="h-5 w-5 text-blue-600" />;
      case 'plant':
        return <Factory className="h-5 w-5 text-green-600" />;
      case 'user':
        return <Users className="h-5 w-5 text-purple-600" />;
      case 'manager':
        return <UserCog className="h-5 w-5 text-orange-600" />;
      case 'city':
        return <Building2 className="h-5 w-5 text-indigo-600" />;
      case 'state':
        return <MapPin className="h-5 w-5 text-pink-600" />;
      case 'category':
      case 'product':
        return <Package className="h-5 w-5 text-teal-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'default';
      case 'updated':
        return 'secondary';
      case 'deleted':
        return 'destructive';
      case 'login':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Log</h1>
          <p className="text-muted-foreground mt-1">
            Complete history of system activities and actions
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/overview')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <ActivityIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Page</p>
                <p className="text-2xl font-bold">{page} of {totalPages}</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Showing</p>
                <p className="text-2xl font-bold">{activities.length} items</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Recent Activities
          </CardTitle>
          <CardDescription>
            Detailed log of all system activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse p-4 border rounded-lg">
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      {getActionIcon(activity.entityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>by {activity.userName}</span>
                        <span>•</span>
                        <span>{activity.entityType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Badge variant={getActionBadgeVariant(activity.action)}>
                      {activity.action}
                    </Badge>
                    <div className="text-xs text-muted-foreground text-right">
                      <p>{getTimeAgo(activity.createdAt)}</p>
                      <p className="opacity-75">{formatDateTime(activity.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ActivityIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No activities found</p>
              <p className="text-sm">Activities will appear here once actions are performed</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivitiesPage;
