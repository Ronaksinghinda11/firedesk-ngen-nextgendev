// src/components/generic/hooks/useEntityArchive.ts
// Extracted from GenericEntityPage.tsx - Lines 265, 1772-1946, 2024-2098

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { BaseEntity, EntityConfig } from "../types/entity.types";
import { buildUpdateData } from "../utils/archiveUtils";

interface UseEntityArchiveProps {
    config: EntityConfig;
    entities: BaseEntity[];
    setEntities: React.Dispatch<React.SetStateAction<BaseEntity[]>>;
    loadEntities: () => Promise<void>;
}

interface UseEntityArchiveReturn {
    archiveStatus: "active" | "archived";
    setArchiveStatus: React.Dispatch<React.SetStateAction<"active" | "archived">>;
    archivedEntities: BaseEntity[];
    setArchivedEntities: React.Dispatch<React.SetStateAction<BaseEntity[]>>;
    handleViewArchive: () => Promise<void>;
    handleRestoreFromArchive: (entityId: string) => Promise<void>;
    handleArchive: (entity: BaseEntity) => Promise<void>;
}

/**
 * Hook for managing archive/restore operations.
 * Extracted from GenericEntityPage.tsx lines 265, 1772-1946, 2024-2098
 */
export function useEntityArchive({
    config,
    entities,
    setEntities,
    loadEntities,
}: UseEntityArchiveProps): UseEntityArchiveReturn {
    const [archiveStatus, setArchiveStatus] = useState<"active" | "archived">("active");
    const [archivedEntities, setArchivedEntities] = useState<BaseEntity[]>([]);

    const effectiveConfig = config;

    const handleViewArchive = useCallback(async () => {
        setArchiveStatus("archived");

        // Load archived entities (status = 'Inactive')
        try {
            console.log(`📦 Loading archived ${config.entityNamePlural}...`);
            const response = await api.get(config.apiEndpoint, {
                params: { status: config.archiveStatusValue || 'Inactive' }
            });

            let entityData: any[] = [];

            // Extract data using the same logic as loadEntities
            if (config.transformResponse) {
                // Pass the full response object, not response.data
                const transformed = config.transformResponse(response);
                console.log(`🔄 After transformResponse:`, transformed);

                if (config.responseKey && (transformed as any)[config.responseKey]) {
                    entityData = (transformed as any)[config.responseKey];
                    console.log(
                        `🔑 Using responseKey "${config.responseKey}" after transform:`,
                        entityData
                    );
                } else {
                    entityData = transformed;
                    console.log(
                        `📋 No responseKey, using transformed data directly:`,
                        entityData
                    );
                }
            } else if (
                config.responseKey &&
                (response as any).data?.[config.responseKey]
            ) {
                entityData = (response as any).data[config.responseKey];
            } else if ((response as any).data?.[config.entityNamePlural]) {
                entityData = (response as any).data[config.entityNamePlural];
            } else if (Array.isArray((response as any).data)) {
                entityData = (response as any).data;
            } else if (
                (response as any).data?.data &&
                Array.isArray((response as any).data.data)
            ) {
                entityData = (response as any).data.data;
            }

            // Ensure entityData is an array before filtering
            if (!Array.isArray(entityData)) {
                console.warn("⚠️ entityData is not an array:", entityData);
                entityData = [];
            }

            // Filter archived entities based on configuration
            const archivedData = entityData.filter((entity) => {
                // If entity has explicit isArchived field
                if (entity.hasOwnProperty("isArchived")) {
                    return entity.isArchived === true;
                }

                // If custom archive status is configured (e.g., 'Deactive' for Assets)
                if (
                    config.archiveStatusValue &&
                    entity.status === config.archiveStatusValue
                ) {
                    return true;
                }

                // Show Inactive entities in archive view (default archived status)
                // This applies whether or not supportsArchive is enabled
                if (entity.status === "Inactive") {
                    return true;
                }

                return false;
            });

            console.log(
                `📊 Archive filter applied. Found ${archivedData.length} archived entities.`
            );
            console.log(
                `📊 supportsArchive: ${effectiveConfig.supportsArchive}, archiveStatusValue: ${config.archiveStatusValue}`
            );

            console.log(
                `✅ Loaded ${archivedData.length} archived ${config.entityNamePlural}`
            );
            setArchivedEntities(archivedData);

            toast({
                title: "Archive View",
                description: `Found ${archivedData.length
                    } archived ${config.entityNamePlural.toLowerCase()}`,
            });
        } catch (error: any) {
            console.error("❌ Error loading archived entities:", error);
            toast({
                title: "Error Loading Archive",
                description: error.response?.data?.message || error.message,
                variant: "destructive",
            });
        }
    }, [config, effectiveConfig]);

    const handleRestoreFromArchive = useCallback(async (entityId: string) => {
        const entityToRestore = archivedEntities.find((e) => e.id === entityId);
        if (!entityToRestore) return;

        try {
            console.log(`🔄 Restoring ${config.entityName}:`, entityToRestore);

            // Build update data for restoring
            let updateData: Record<string, any> = {};

            // Include all archiveFields specified in config
            if (config.archiveFields && config.archiveFields.length > 0) {
                config.archiveFields.forEach((field) => {
                    if (
                        field !== "status" &&
                        field !== "isArchived" &&
                        (entityToRestore as any)[field] !== undefined
                    ) {
                        updateData[field] = (entityToRestore as any)[field];
                    }
                });
            }

            // Determine restore status
            if ((entityToRestore as any).hasOwnProperty("isArchived")) {
                // Entity has explicit isArchived field
                updateData.isArchived = false;
                updateData.status = "Active";
            } else if (config.archiveStatusValue) {
                // Entity was archived with custom status (e.g., 'Deactive')
                // Determine what the default active status should be for this entity type
                // For Assets with 'Deactive', restore to 'In-House' (common default)
                // For Products with 'Deactive', restore to 'Active'
                if (config.entityName === "Asset") {
                    updateData.status = "In-House"; // Default active status for Assets
                } else {
                    updateData.status = "Active"; // Default for most entities
                }
            } else {
                // Simply restore to Active status
                updateData.status = "Active";
            }

            // Apply transformData if available to clean up the data
            if (config.transformData) {
                updateData = config.transformData(updateData);
            }

            console.log(`📤 Restore data to send:`, updateData);

            // Make API call to update status
            await api.put(`${config.apiEndpoint}/${entityId}`, updateData);

            console.log(`✅ ${config.entityName} restored successfully`);

            // Reload archived entities to refresh the list
            handleViewArchive();

            toast({
                title: `${config.entityName} Restored`,
                description: `${entityToRestore.name} has been restored to active status`,
            });
        } catch (error: any) {
            console.error("❌ Error restoring entity:", error);
            toast({
                title: "Error Restoring",
                description: error.response?.data?.message || error.message,
                variant: "destructive",
            });
        }
    }, [archivedEntities, config, handleViewArchive]);

    const handleArchive = useCallback(async (entity: BaseEntity) => {
        try {
            console.log(`📦 Archiving ${config.entityName}:`, entity);

            // Build update data for archiving
            let updateData: Record<string, any> = {};

            // Include all archiveFields specified in config
            if (config.archiveFields && config.archiveFields.length > 0) {
                config.archiveFields.forEach((field) => {
                    const value = (entity as any)[field];
                    // Only include fields that are not undefined AND not null
                    // This prevents sending null values that might fail validation
                    if (
                        field !== "status" &&
                        field !== "isArchived" &&
                        value !== undefined &&
                        value !== null
                    ) {
                        updateData[field] = value;
                    }
                });
            }

            // Determine archive status
            if ((entity as any).hasOwnProperty("isArchived")) {
                // Entity has explicit isArchived field
                updateData.isArchived = true;
                updateData.status = entity.status; // Keep current status
            } else if (config.archiveStatusValue) {
                // Use custom archive status value (e.g., 'Deactive' for Assets)
                // Use custom field name if specified (e.g., 'completedStatus' for tickets)
                const statusField = config.archiveStatusField || 'status';
                updateData[statusField] = config.archiveStatusValue;
            } else {
                // Default: Most entities don't support true archiving
                // Instead, they just become Inactive (disabled)
                updateData.status = "Inactive";
                console.warn(
                    `⚠️ ${config.entityName} doesn't have archive support. Setting status to Inactive instead.`
                );
            }

            // Apply transformData if available to clean up the data
            if (config.transformData) {
                updateData = config.transformData(updateData);
            }

            console.log(`📤 Archive data to send:`, updateData);

            await api.put(`${config.apiEndpoint}/${entity.id}`, updateData);

            const actionLabel = effectiveConfig.supportsArchive ? "Archived" : "Deactivated";
            toast({
                title: `${config.entityName} ${actionLabel}`,
                description: `${entity.name} has been ${actionLabel.toLowerCase()}`,
            });

            // Reload entities from server to show updated status
            loadEntities();
        } catch (error: any) {
            console.error("❌ Archive error:", error);
            const errorMessage =
                error.message ||
                error.response?.data?.message ||
                "Archive operation failed";

            toast({
                title: "Operation Failed",
                description: errorMessage,
                variant: "destructive",
                duration: 5000,
            });
        }
    }, [config, effectiveConfig, loadEntities]);

    return {
        archiveStatus,
        setArchiveStatus,
        archivedEntities,
        setArchivedEntities,
        handleViewArchive,
        handleRestoreFromArchive,
        handleArchive,
    };
}
