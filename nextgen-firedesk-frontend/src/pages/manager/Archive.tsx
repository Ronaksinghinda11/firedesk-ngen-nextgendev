/**
 * Manager Archive Page
 *
 * View and manage archived/inactive entities.
 * Uses GenericEntityPage template for consistency.
 */

import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Archive as ArchiveIcon, Calendar, Package } from 'lucide-react';
import { Entity } from '@/types/permissions';

export default function Archive() {
  const archiveConfig: EntityConfig = {
    entityName: 'Archived Item',
    entityNamePlural: 'Archive',
    apiEndpoint: '/assets',
    responseKey: 'assets',

    // Permission-based access control
    permissionEntity: Entity.ARCHIVE,
    enforcePermissions: true,

    // Filter to show only archived/deactive items
    transformResponse: (response) => {
      const allAssets = response.assets || [];
      const archivedAssets = allAssets.filter((asset: any) =>
        asset.status === 'Deactive'
      );
      return { ...response, assets: archivedAssets };
    },

    // Custom columns for archive display
    customColumns: (entity: any) => (
      <>
        <TableCell>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{entity.assetName || entity.name || 'N/A'}</div>
              <div className="text-xs text-muted-foreground">{entity.assetId || entity.id}</div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm">{entity.plant?.plantName || 'N/A'}</span>
        </TableCell>
        <TableCell>
          <span className="text-sm">{entity.category?.categoryName || 'N/A'}</span>
        </TableCell>
        <TableCell>
          <Badge variant="secondary">
            {entity.status || 'Deactive'}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {entity.updatedAt ? new Date(entity.updatedAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </TableCell>
      </>
    ),

    customHeaders: [
      'Item Name',
      'Plant',
      'Category',
      'Status',
      'Archived Date'
    ],

    // Hide create button for archive page
    hideCreateButton: true,

    // No fields needed - archive is read-only
    fields: [],
  };

  // Plant filter now handled automatically by GenericEntityPage
  const configWithPlantFilter: EntityConfig = {
    ...archiveConfig,
    enablePlantFilter: true,
  };

  return <GenericEntityPage config={configWithPlantFilter} />;
}
