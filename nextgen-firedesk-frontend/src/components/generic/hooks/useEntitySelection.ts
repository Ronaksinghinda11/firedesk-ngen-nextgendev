// src/components/generic/hooks/useEntitySelection.ts
// Extracted from GenericEntityPage.tsx - Lines 262-264, 1348-1421

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { BaseEntity, EntityConfig } from "../types/entity.types";

interface UseEntitySelectionProps {
    entities: BaseEntity[];
    config: EntityConfig;
}

interface UseEntitySelectionReturn {
    selectedEntities: Set<string>;
    setSelectedEntities: React.Dispatch<React.SetStateAction<Set<string>>>;
    handleSelectEntity: (entityId: string) => void;
    handleSelectAll: () => void;
    handleSelectAllAssets: () => Promise<void>;
    handleClearSelection: () => void;
    isAllSelected: boolean;
}

/**
 * Hook for managing entity row selection.
 * Extracted from GenericEntityPage.tsx lines 262-264, 1348-1421
 */
export function useEntitySelection({
    entities,
    config,
}: UseEntitySelectionProps): UseEntitySelectionReturn {
    const [selectedEntities, setSelectedEntities] = useState<Set<string>>(
        new Set()
    );

    const handleSelectEntity = useCallback((entityId: string) => {
        setSelectedEntities((prev) => {
            const newSelected = new Set(prev);
            if (newSelected.has(entityId)) {
                newSelected.delete(entityId);
            } else {
                newSelected.add(entityId);
            }
            return newSelected;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        const currentPageIds = entities.map((e) => e.id);

        setSelectedEntities((prev) => {
            const allCurrentPageSelected = currentPageIds.every((id) => prev.has(id));
            const newSelected = new Set(prev);

            if (allCurrentPageSelected) {
                // Deselect all on current page (but keep other pages' selections)
                currentPageIds.forEach((id) => newSelected.delete(id));
            } else {
                // Select all on current page (add to existing selections)
                currentPageIds.forEach((id) => newSelected.add(id));
            }

            return newSelected;
        });
    }, [entities]);

    // Select ALL entities across all pages by fetching all IDs from the API
    const handleSelectAllAssets = useCallback(async () => {
        try {
            toast({
                title: "Loading...",
                description: `Fetching all ${config.entityNamePlural.toLowerCase()}...`,
            });

            // Fetch all entities without pagination to get all IDs
            const response = await api.get(config.apiEndpoint, {
                params: { limit: 10000 } // High limit to get all
            });

            let allEntities: any[] = [];
            const responseKey = config.responseKey || config.entityNamePlural.toLowerCase();

            if (response && typeof response === 'object') {
                if (Array.isArray((response as any)[responseKey])) {
                    allEntities = (response as any)[responseKey];
                } else if (Array.isArray((response as any).data)) {
                    allEntities = (response as any).data;
                } else if (Array.isArray(response)) {
                    allEntities = response;
                }
            }

            const allIds = allEntities.map((e: any) => e.id);
            setSelectedEntities(new Set(allIds));

            toast({
                title: "All Selected",
                description: `Selected ${allIds.length} ${config.entityNamePlural.toLowerCase()}.`,
            });
        } catch (error: any) {
            console.error('Error fetching all entities:', error);
            toast({
                title: "Selection Failed",
                description: "Could not fetch all items. Try selecting page by page.",
                variant: "destructive",
            });
        }
    }, [config]);

    const handleClearSelection = useCallback(() => {
        setSelectedEntities(new Set());
    }, []);

    const isAllSelected = entities.length > 0 && entities.every((e) => selectedEntities.has(e.id));

    return {
        selectedEntities,
        setSelectedEntities,
        handleSelectEntity,
        handleSelectAll,
        handleSelectAllAssets,
        handleClearSelection,
        isAllSelected,
    };
}
