// src/components/generic/hooks/useEntityFilters.ts
// Extracted from GenericEntityPage.tsx - Lines 270-280, 313-407, 2538-2588

import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import {
    BaseEntity,
    FilterOptions,
    EntitySettings,
    ViewMode
} from "../types/entity.types";

interface UseEntityFiltersProps {
    entityNamePlural: string;
    entities: BaseEntity[];
    archivedEntities: BaseEntity[];
    archiveStatus: "active" | "archived";
}

interface UseEntityFiltersReturn {
    // Filter state
    filterOptions: FilterOptions;
    setFilterOptions: React.Dispatch<React.SetStateAction<FilterOptions>>;
    appliedFilters: FilterOptions;
    setAppliedFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
    showFilter: boolean;
    setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;

    // Settings state
    settings: EntitySettings;
    setSettings: React.Dispatch<React.SetStateAction<EntitySettings>>;
    showSettings: boolean;
    setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;

    // View mode
    viewMode: ViewMode;
    setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;

    // Computed values
    filteredEntities: BaseEntity[];

    // Actions
    applyFilter: () => void;
    resetFilter: () => void;
    saveSettings: () => void;
    handleViewModeChange: (mode: ViewMode) => void;
}

/**
 * Hook for managing entity filters, sorting, and display settings.
 * Extracted from GenericEntityPage.tsx lines 270-280, 313-407, 2538-2588
 */
export function useEntityFilters({
    entityNamePlural,
    entities,
    archivedEntities,
    archiveStatus,
}: UseEntityFiltersProps): UseEntityFiltersReturn {
    // Filter state: UI state vs applied state
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        status: "all",
        dateRange: "all",
        sortBy: "name",
    });

    const [appliedFilters, setAppliedFilters] = useState<FilterOptions>({
        status: "all",
        dateRange: "all",
        sortBy: "name",
    });

    const [showFilter, setShowFilter] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Initialize viewMode from localStorage settings
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const savedSettings = localStorage.getItem(`settings_${entityNamePlural}`);
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                return (parsed.defaultView as ViewMode) || "table";
            } catch {
                return "table";
            }
        }
        return "table";
    });

    const [settings, setSettings] = useState<EntitySettings>({
        itemsPerPage: "10",
        defaultView: "table",
    });

    // Sync viewMode with settings.defaultView on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem(`settings_${entityNamePlural}`);
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setSettings(parsed);
            setViewMode(parsed.defaultView as ViewMode);
        }
    }, [entityNamePlural]);

    // Compute filtered entities without modifying the original array
    const getFilteredEntities = useCallback((): BaseEntity[] => {
        let filtered = [
            ...(archiveStatus === "active" ? entities : archivedEntities),
        ];

        // Apply status filter using APPLIED filters, not UI filter options
        if (appliedFilters.status !== "all") {
            filtered = filtered.filter(
                (entity) => entity.status === appliedFilters.status
            );
        }

        // Apply date range filter - FIXED: Use appliedFilters instead of filterOptions
        if (appliedFilters.dateRange !== "all") {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            filtered = filtered.filter((entity) => {
                const entityDate = new Date(entity.createdAt);

                switch (appliedFilters.dateRange) {
                    case "today":
                        // Check if created today
                        const entityToday = new Date(
                            entityDate.getFullYear(),
                            entityDate.getMonth(),
                            entityDate.getDate()
                        );
                        return entityToday.getTime() === today.getTime();

                    case "week":
                        // Check if created in the last 7 days
                        const weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return entityDate >= weekAgo;

                    case "month":
                        // Check if created in the last 30 days
                        const monthAgo = new Date(today);
                        monthAgo.setDate(monthAgo.getDate() - 30);
                        return entityDate >= monthAgo;

                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        if (appliedFilters.sortBy === "name") {
            filtered.sort((a, b) => {
                const aName = a.name || "";
                const bName = b.name || "";
                return aName.localeCompare(bName);
            });
        } else if (appliedFilters.sortBy === "date") {
            filtered.sort(
                (a, b) =>
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
        }

        return filtered;
    }, [entities, archivedEntities, archiveStatus, appliedFilters]);

    const filteredEntities = getFilteredEntities();

    const applyFilter = useCallback(() => {
        setAppliedFilters(filterOptions);
        setShowFilter(false);

        toast({
            title: "Filter Applied",
            description: `Filters have been applied successfully`,
        });
    }, [filterOptions]);

    const resetFilter = useCallback(() => {
        const defaultFilters: FilterOptions = {
            status: "all",
            dateRange: "all",
            sortBy: "name",
        };
        setFilterOptions(defaultFilters);
        setAppliedFilters(defaultFilters);
        setShowFilter(false);
    }, []);

    const saveSettings = useCallback(() => {
        // Sync viewMode with settings.defaultView
        setViewMode(settings.defaultView as ViewMode);

        // Persist to localStorage immediately
        localStorage.setItem(
            `settings_${entityNamePlural}`,
            JSON.stringify(settings)
        );

        toast({
            title: "Settings Saved",
            description: "Your preferences have been updated",
        });
        setShowSettings(false);
    }, [settings, entityNamePlural]);

    const handleViewModeChange = useCallback((mode: ViewMode) => {
        setViewMode(mode);
        // Update settings state
        const newSettings = { ...settings, defaultView: mode };
        setSettings(newSettings);

        // Persist to localStorage immediately
        localStorage.setItem(
            `settings_${entityNamePlural}`,
            JSON.stringify(newSettings)
        );
    }, [settings, entityNamePlural]);

    return {
        filterOptions,
        setFilterOptions,
        appliedFilters,
        setAppliedFilters,
        showFilter,
        setShowFilter,
        settings,
        setSettings,
        showSettings,
        setShowSettings,
        viewMode,
        setViewMode,
        filteredEntities,
        applyFilter,
        resetFilter,
        saveSettings,
        handleViewModeChange,
    };
}
