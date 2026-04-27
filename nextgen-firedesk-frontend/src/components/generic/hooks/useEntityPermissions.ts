// src/components/generic/hooks/useEntityPermissions.ts
// Extracted from GenericEntityPage.tsx - Lines 212-233

import { usePermissions } from "@/hooks/usePermissions";
import { Entity, Action } from "@/types/permissions";

interface UseEntityPermissionsProps {
    permissionEntity?: Entity;
    enforcePermissions?: boolean;
}

interface UseEntityPermissionsReturn {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canRead: boolean;
    hasPermission: (entity: Entity, action: Action) => boolean;
    isAdmin: () => boolean;
}

/**
 * Hook for checking entity permissions.
 * ALL users (including Admin) must have actual permissions assigned.
 * No role-based bypasses - permissions are strictly enforced.
 */
export function useEntityPermissions({
    permissionEntity,
    enforcePermissions = false,
}: UseEntityPermissionsProps): UseEntityPermissionsReturn {
    const { hasPermission, isAdmin, canView } = usePermissions();

    // NOTE: No Admin bypass - all users must have permissions assigned
    // This ensures Admin with "View Only" cannot create/update/delete

    const canCreate = permissionEntity && enforcePermissions
        ? hasPermission(permissionEntity, Action.CREATE)
        : true;

    const canUpdate = permissionEntity && enforcePermissions
        ? hasPermission(permissionEntity, Action.UPDATE)
        : true;

    const canDelete = permissionEntity && enforcePermissions
        ? hasPermission(permissionEntity, Action.DELETE)
        : true;

    const canRead = permissionEntity && enforcePermissions
        ? hasPermission(permissionEntity, Action.READ)
        : true;

    return {
        canCreate,
        canUpdate,
        canDelete,
        canRead,
        hasPermission,
        isAdmin,
    };
}
