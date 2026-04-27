// src/components/generic/hooks/useBulkActions.ts
// Extracted from GenericEntityPage.tsx - Lines 261, 1341-1600

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { BaseEntity, EntityConfig } from "../types/entity.types";
import { buildUpdateData } from "../utils/archiveUtils";
import { exportSelectedToCSV } from "../utils/csvUtils";

interface UseBulkActionsProps {
    config: EntityConfig;
    entities: BaseEntity[];
    archivedEntities: BaseEntity[];
    selectedEntities: Set<string>;
    setSelectedEntities: React.Dispatch<React.SetStateAction<Set<string>>>;
    setEntities: React.Dispatch<React.SetStateAction<BaseEntity[]>>;
    loadEntities: () => Promise<void>;
    handleViewArchive: () => Promise<void>;
    archiveStatus: "active" | "archived";
}

interface UseBulkActionsReturn {
    showBulkActions: boolean;
    setShowBulkActions: React.Dispatch<React.SetStateAction<boolean>>;
    handleBulkActions: () => void;
    handleBulkDelete: () => Promise<void>;
    handleBulkArchive: () => Promise<void>;
    handleBulkRestore: () => Promise<void>;
    handleBulkExport: () => void;
}

/**
 * Hook for managing bulk entity actions.
 * Extracted from GenericEntityPage.tsx lines 261, 1341-1600
 */
export function useBulkActions({
    config,
    entities,
    archivedEntities,
    selectedEntities,
    setSelectedEntities,
    setEntities,
    loadEntities,
    handleViewArchive,
    archiveStatus,
}: UseBulkActionsProps): UseBulkActionsReturn {
    const [showBulkActions, setShowBulkActions] = useState(false);

    const handleBulkActions = useCallback(() => {
        setShowBulkActions((prev) => {
            if (!prev) {
                setSelectedEntities(new Set());
            }
            return !prev;
        });
    }, [setSelectedEntities]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedEntities.size === 0) {
            toast({
                title: `No ${config.entityNamePlural} Selected`,
                description: `Please select at least one ${config.entityName.toLowerCase()} to delete`,
                variant: "destructive",
            });
            return;
        }

        const selectedCount = selectedEntities.size;

        toast({
            title: "Processing",
            description: `Deleting ${selectedCount} ${config.entityNamePlural.toLowerCase()}...`,
        });

        try {
            // Delete each selected entity via API
            const deletePromises = Array.from(selectedEntities).map((entityId) =>
                api.delete(`${config.apiEndpoint}/${entityId}`)
            );

            await Promise.all(deletePromises);

            // Update UI after successful deletion
            setEntities((prev) => prev.filter((e) => !selectedEntities.has(e.id)));
            setSelectedEntities(new Set());
            setShowBulkActions(false);

            toast({
                title: "Bulk Delete Successful",
                description: `Successfully deleted ${selectedCount} ${config.entityNamePlural.toLowerCase()}`,
            });
        } catch (error: any) {
            console.error("❌ Bulk delete error:", error);
            let errorMessage =
                error.message ||
                error.response?.data?.message ||
                "Bulk delete operation failed";

            if (errorMessage.includes("constraint")) {
                errorMessage = `Cannot delete some ${config.entityNamePlural.toLowerCase()} because they are being used by other records. Please reassign those records first.`;
            }

            toast({
                title: "Bulk Delete Failed",
                description: errorMessage,
                variant: "destructive",
                duration: 5000,
            });

            // Refresh to show current state
            loadEntities();
        }
    }, [selectedEntities, config, setEntities, setSelectedEntities, loadEntities]);

    const handleBulkArchive = useCallback(async () => {
        if (selectedEntities.size === 0) {
            toast({
                title: `No ${config.entityNamePlural} Selected`,
                description: `Please select at least one ${config.entityName.toLowerCase()} to archive`,
                variant: "destructive",
            });
            return;
        }

        const selectedCount = selectedEntities.size;

        toast({
            title: "Processing",
            description: `Archiving ${selectedCount} ${config.entityNamePlural.toLowerCase()}...`,
        });

        try {
            // Archive by updating status to 'Inactive' for each selected entity
            const archivePromises = Array.from(selectedEntities).map((entityId) => {
                const entity = entities.find((e) => e.id === entityId);
                if (!entity) return Promise.resolve();

                // Use the generic helper function to build update data
                const updateData = buildUpdateData(entity, "Inactive", config);

                console.log(`📤 Bulk archive data for ${entity.name}:`, updateData);

                return api.put(`${config.apiEndpoint}/${entityId}`, updateData);
            });
            await Promise.all(archivePromises);

            setSelectedEntities(new Set());
            setShowBulkActions(false);

            toast({
                title: "Bulk Archive Successful",
                description: `Successfully archived ${selectedCount} ${config.entityNamePlural.toLowerCase()}`,
            });

            // Reload entities from server to show updated status
            loadEntities();
        } catch (error: any) {
            console.error("❌ Bulk archive error:", error);
            const errorMessage =
                error.message ||
                error.response?.data?.message ||
                "Bulk archive operation failed";

            toast({
                title: "Bulk Archive Failed",
                description: errorMessage,
                variant: "destructive",
                duration: 5000,
            });

            // Refresh to show current state
            loadEntities();
        }
    }, [selectedEntities, entities, config, setSelectedEntities, loadEntities]);

    const handleBulkRestore = useCallback(async () => {
        if (selectedEntities.size === 0) {
            toast({
                title: `No ${config.entityNamePlural} Selected`,
                description: `Please select at least one ${config.entityName.toLowerCase()} to restore`,
                variant: "destructive",
            });
            return;
        }

        const selectedCount = selectedEntities.size;

        toast({
            title: "Processing",
            description: `Restoring ${selectedCount} ${config.entityNamePlural.toLowerCase()}...`,
        });

        try {
            // Restore by updating status to 'Active' for each selected entity
            const restorePromises = Array.from(selectedEntities).map((entityId) => {
                // Find entity in archivedEntities since we are in archive view
                const entity = archivedEntities.find((e) => e.id === entityId);
                if (!entity) return Promise.resolve();

                // Use the generic helper function to build update data
                const updateData = buildUpdateData(entity, "Active", config);

                console.log(`📤 Bulk restore data for ${entity.name}:`, updateData);

                return api.put(`${config.apiEndpoint}/${entityId}`, updateData);
            });
            await Promise.all(restorePromises);

            setSelectedEntities(new Set());
            setShowBulkActions(false);

            toast({
                title: "Bulk Restore Successful",
                description: `Successfully restored ${selectedCount} ${config.entityNamePlural.toLowerCase()}`,
            });

            // Reload archived entities to refresh the list
            handleViewArchive();
        } catch (error: any) {
            console.error("❌ Bulk restore error:", error);
            const errorMessage =
                error.message ||
                error.response?.data?.message ||
                "Bulk restore operation failed";

            toast({
                title: "Bulk Restore Failed",
                description: errorMessage,
                variant: "destructive",
                duration: 5000,
            });

            // Refresh to show current state
            handleViewArchive();
        }
    }, [selectedEntities, archivedEntities, config, setSelectedEntities, handleViewArchive]);

    const handleBulkExport = useCallback(() => {
        const sourceEntities = archiveStatus === "active" ? entities : archivedEntities;
        exportSelectedToCSV(sourceEntities, selectedEntities, config);
    }, [entities, archivedEntities, selectedEntities, config, archiveStatus]);

    return {
        showBulkActions,
        setShowBulkActions,
        handleBulkActions,
        handleBulkDelete,
        handleBulkArchive,
        handleBulkRestore,
        handleBulkExport,
    };
}
