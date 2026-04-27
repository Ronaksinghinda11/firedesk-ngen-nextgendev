// src/pages/RolesPage.tsx
import React, { useEffect, useState } from 'react';
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { api } from '@/lib/api';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PermissionsSection, PermissionLevelBadge, PermissionSummary } from '@/components/admin/PermissionLevelSelector';
import {
  Entity,
  PermissionLevel,
  Permissions,
  PERMISSION_LEVEL_ACTIONS,
  ENTITY_LABELS
} from '@/types/permissions';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permissions;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const RolesPage: React.FC = () => {
  // Helper function to initialize default permissions
  const getDefaultPermissions = (): Record<Entity, PermissionLevel> => {
    const defaults: Record<Entity, PermissionLevel> = {} as Record<Entity, PermissionLevel>;
    Object.values(Entity).forEach(entity => {
      defaults[entity] = PermissionLevel.NONE;
    });
    return defaults;
  };

  const roleConfig: EntityConfig = {
    entityName: 'Role',
    entityNamePlural: 'Roles',
    // Backend: GET /roles
    apiEndpoint: '/roles',
    responseKey: 'roles',

    // Permission-based access control
    permissionEntity: Entity.ROLES,
    enforcePermissions: true,

    // Configure fields for archive/restore operations
    // IMPORTANT: Role archiving requires admin permissions on backend
    // Non-admin users will receive 403 Forbidden errors when attempting to archive roles
    // This is expected behavior for security - only admins should modify roles
    archiveFields: ['name', 'description', 'permissions', 'status'],
    supportsArchive: false, // Roles cannot be archived
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'bulkActions', 'history'],

    // Filter attributes for sorting and column visibility
    filterAttributes: [
      { id: 'name', label: 'Role Name', type: 'text' as const, operators: ['contains', 'is', 'isNot'], mandatory: true },
      { id: 'description', label: 'Description', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'isDefault', label: 'Type', type: 'select' as const, operators: ['is', 'isNot'], options: [{ value: 'true', label: 'Default' }, { value: 'false', label: 'Custom' }] },
      { id: 'permissions', label: 'Permissions', type: 'text' as const, filterable: false }, // Display-only, not filterable
      { id: 'created_at', label: 'Created At', type: 'date' as const, operators: ['before', 'after'] },
      { id: 'updated_at', label: 'Updated At', type: 'date' as const, operators: ['before', 'after'] },
    ],

    fields: [
      {
        name: 'name',
        label: 'Role Name',
        type: 'text',
        required: true,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
      },
    ],

    // Form sections with custom headers
    formSections: [
      { id: 'basicInfo', title: 'Basic Information' },
      { id: 'permissions', title: 'Permissions', noHeader: true } // PermissionsSection renders its own header
    ],

    formLayout: "sections",
    formGridAlignment: "start", // Cards align to top, don't stretch to equal heights

    renderWizardStep: (step: string, formData: any, setFormData: any, currentStep: string, setCurrentStep: any) => {
      switch (step) {
        case 'basicInfo':
          return (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-gray-700">
                  Role Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter role name"
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role's purpose and scope"
                  className="min-h-[70px] text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>
          );

        case 'permissions':
          // Initialize permissions if not set
          if (!formData.permissionLevels) {
            const defaultLevels = getDefaultPermissions();
            setFormData({ ...formData, permissionLevels: defaultLevels });
          }

          return (
            <PermissionsSection
              permissions={formData.permissionLevels || getDefaultPermissions()}
              onChange={(entity: Entity, level: PermissionLevel) => {
                setFormData((prev) => ({
                  ...prev,
                  permissionLevels: {
                    ...(prev.permissionLevels || getDefaultPermissions()),
                    [entity]: level
                  }
                }));
              }}
              onBulkChange={(updates: Record<Entity, PermissionLevel>) => {
                setFormData((prev) => ({
                  ...prev,
                  permissionLevels: updates
                }));
              }}
            />
          );

        default:
          return null;
      }
    },

    onWizardNext: (currentStep: string, formData: any): boolean => {
      if (currentStep === 'basicInfo') {
        if (!formData.name) {
          return false;
        }
      }
      return true;
    },

    transformData: (formData: any) => {
      // Convert permission levels to new granular format
      const permissionLevels = formData.permissionLevels || getDefaultPermissions();
      const entities: Record<string, any> = {};

      // Build the entities permission object
      Object.entries(permissionLevels).forEach(([entity, level]) => {
        entities[entity] = {
          level: level,
          actions: { ...PERMISSION_LEVEL_ACTIONS[level as PermissionLevel] }
        };
      });

      return {
        name: formData.name,
        description: formData.description || '',
        permissions: {
          entities
        }
      };
    },

    transformResponse: (response: any) => {
      console.log('🔍 Raw API response for Roles:', response);

      let rolesData = [];

      if (Array.isArray(response.roles)) {
        rolesData = response.roles;
      } else if (Array.isArray(response.data?.roles)) {
        rolesData = response.data.roles;
      } else if (response.success && Array.isArray(response.roles)) {
        rolesData = response.roles;
      }

      console.log('📊 Roles array found, length:', rolesData.length);

      const transformedData = rolesData.map((item: any) => {
        console.log('🔍 Processing role item:', item);
        console.log('🔍 Role name:', item.name);
        console.log('🔍 Permissions type:', Array.isArray(item.permissions) ? 'array' : typeof item.permissions);

        // Initialize with default permissions (all NONE)
        let permissionLevels = getDefaultPermissions();

        // NEW FORMAT: Backend returns permissions as array of {entity_name, action_name}
        if (Array.isArray(item.permissions) && item.permissions.length > 0) {
          console.log('✅ New backend format detected - converting permission array');

          // Group permissions by entity
          const permissionsByEntity: Record<string, Record<string, boolean>> = {};

          item.permissions.forEach((p: { entity_name: string; action_name: string }) => {
            if (!permissionsByEntity[p.entity_name]) {
              permissionsByEntity[p.entity_name] = {};
            }
            permissionsByEntity[p.entity_name][p.action_name] = true;
          });

          console.log('📊 Permissions by entity:', permissionsByEntity);

          // Derive permission level from actions for each entity
          Object.entries(permissionsByEntity).forEach(([entityName, actions]) => {
            // Check if entity exists in our Entity enum
            const entityKey = Object.entries(Entity).find(
              ([_, value]) => value === entityName || value.toLowerCase() === entityName.toLowerCase()
            );

            if (entityKey) {
              const entity = entityKey[1] as Entity;
              const actionsObj = actions as Record<string, boolean>;

              // Derive level based on actions present
              if (actionsObj.create && actionsObj.delete && actionsObj.update && actionsObj.read) {
                permissionLevels[entity] = PermissionLevel.FULL_CRUD;
              } else if (actionsObj.update || actionsObj.assign) {
                permissionLevels[entity] = PermissionLevel.ASSIGN_UPDATE_VIEW;
              } else if (actionsObj.read) {
                permissionLevels[entity] = PermissionLevel.VIEW;
              } else {
                permissionLevels[entity] = PermissionLevel.NONE;
              }

              console.log(`   Entity: ${entityName} → Level: ${permissionLevels[entity]}`);
            } else {
              console.warn(`   ⚠️ Unknown entity: ${entityName}`);
            }
          });
        }
        // OLD FORMAT: permissions.entities JSON object (fallback)
        else if (item.permissions?.entities) {
          console.log('✅ Old JSON format detected - extracting permission levels');
          Object.entries(item.permissions.entities).forEach(([entity, perm]: [string, any]) => {
            if (Object.values(Entity).includes(entity as Entity)) {
              permissionLevels[entity as Entity] = perm.level || PermissionLevel.NONE;
            }
          });
        } else {
          console.warn('⚠️ No permissions found - using defaults (all NONE)');
        }

        console.log('✅ Final permissionLevels:', permissionLevels);

        // Count total permissions for display
        const permissionCount = Array.isArray(item.permissions) ? item.permissions.length : 0;

        const transformed = {
          id: item.id,
          name: item.name || 'Unnamed',
          description: item.description || '',
          permissions: item.permissions || [],
          permissionLevels,
          permissionCount,
          isDefault: item.is_default || item.isDefault || false,
          created_at: item.created_at || item.createdAt || new Date().toISOString(),
          updated_at: item.updated_at || item.updatedAt,
        };

        console.log('🔄 Transformed role:', transformed);
        return transformed;
      });

      return {
        ...response,
        roles: transformedData
      };
    },



    customColumns: (role: any, isVisible: (field: string) => boolean) => {
      // Extract permission levels for display
      const permissionLevels = role.permissionLevels || {};

      return (
        <>
          {/* Role Name - Sticky */}
          {isVisible('name') && (
            <TableCell className="font-medium bg-white md:sticky md:left-0 z-10 min-w-[150px] md:border-r border-gray-100">
              {role.name || 'Unnamed'}
            </TableCell>
          )}

          {/* Description */}
          {isVisible('description') && (
            <TableCell>
              {role.description || 'No description'}
            </TableCell>
          )}

          {/* Type */}
          {isVisible('isDefault') && (
            <TableCell>
              <span
                className={`text-xs font-semibold ${role.isDefault
                  ? 'text-sky-500'
                  : 'text-slate-500'
                  }`}
              >
                {role.isDefault ? 'Default' : 'Custom'}
              </span>
            </TableCell>
          )}

          {/* Permissions Summary */}
          {isVisible('permissions') && (
            <TableCell>
              {role.permissionCount > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-600">
                    {role.permissionCount} permissions
                  </span>
                  {Object.keys(permissionLevels).length > 0 && (
                    <PermissionSummary permissions={permissionLevels} />
                  )}
                </div>
              ) : Object.keys(permissionLevels).length > 0 ? (
                <PermissionSummary permissions={permissionLevels} />
              ) : (
                <span className="text-xs text-muted-foreground">No permissions configured</span>
              )}
            </TableCell>
          )}

          {/* Created At */}
          {isVisible('created_at') && (
            <TableCell className="text-sm text-gray-600">
              {role.created_at
                ? new Date(role.created_at).toLocaleDateString()
                : "N/A"}
            </TableCell>
          )}

          {/* Updated At */}
          {isVisible('updated_at') && (
            <TableCell className="text-sm text-gray-600">
              {role.updated_at
                ? new Date(role.updated_at).toLocaleDateString()
                : "N/A"}
            </TableCell>
          )}

          {/* Actions column will be added automatically */}
        </>
      );
    },

    customActions: (entity: any) => {
      // You can add custom actions here if needed
      return null;
    },
  };

  return <GenericEntityPage config={roleConfig} />;
};