/**
 * Manager Group Service Page
 *
 * ⚠️ BACKEND TODO: Create /group-service API endpoint
 * Currently showing placeholder until backend route is created.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Layers, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GroupService() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Group Services</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage group services for bulk operations
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardContent className="text-center py-12">
          <Layers className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Group Service Management</h3>
          <p className="text-muted-foreground mb-4">
            This feature requires the <code className="px-2 py-1 bg-muted rounded text-sm">/group-service</code> backend endpoint
          </p>
          <Badge variant="outline" className="mb-2">
            <AlertCircle className="h-3 w-3 mr-1" />
            Backend Endpoint Required
          </Badge>
          <p className="text-xs text-muted-foreground mt-4">
            Once the backend route is created, this page will use GenericEntityPage template for full CRUD operations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
