// src/components/generic/components/EntityDynamicFilterPanel.tsx
import React from "react";
import { Plus, X, ListFilter, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { FilterAttribute, ActiveFilter } from "../types/entity.types";
import { FilterRow } from "./FilterRow";

interface EntityDynamicFilterPanelProps {
    attributes: FilterAttribute[];
    activeFilters: ActiveFilter[];
    onAddFilter: (attributeId: string) => void;
    onUpdateFilter: (id: string, updates: Partial<ActiveFilter>) => void;
    onRemoveFilter: (id: string) => void;
    onClearAll: () => void;
    onApply?: () => void; // Callback to close the filter panel
}

export function EntityDynamicFilterPanel({
    attributes,
    activeFilters,
    onAddFilter,
    onUpdateFilter,
    onRemoveFilter,
    onClearAll,
    onApply
}: EntityDynamicFilterPanelProps) {
    if (attributes.length === 0) return null;

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm animate-in fade-in zoom-in-95 duration-200 mb-2">
            {/* Compact Header with Filters Inline */}
            <div className="px-3 py-2">
                {/* Top row: Label + Clear All + Apply */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        <ListFilter className="h-3 w-3" />
                        <span>Filters</span>
                        {activeFilters.length > 0 && (
                            <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                                {activeFilters.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {activeFilters.length > 0 && (
                            <button
                                onClick={onClearAll}
                                className="text-[10px] text-gray-400 hover:text-red-500 font-medium transition-colors"
                            >
                                Clear All
                            </button>
                        )}
                        {onApply && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={onApply}
                                className="h-6 px-3 text-[10px] bg-orange-500 hover:bg-orange-600 text-white gap-1"
                            >
                                <Check className="h-3 w-3" />
                                Apply
                            </Button>
                        )}
                    </div>
                </div>

                {/* Grid layout: Filter rows + Add filter button side by side */}
                <div className="flex flex-wrap items-start gap-2">
                    <AnimatePresence initial={false}>
                        {activeFilters.map(filter => (
                            <FilterRow
                                key={filter.id}
                                filter={filter}
                                attributes={attributes}
                                onUpdate={onUpdateFilter}
                                onRemove={onRemoveFilter}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Add Filter Button - inline with filters */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50 text-orange-600 gap-1 shrink-0"
                            >
                                <Plus className="h-3 w-3" />
                                <span>Add filter</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
                            {attributes
                                .filter(attr => attr.filterable !== false) // Only show filterable attributes
                                .map(attr => (
                                    <DropdownMenuItem
                                        key={attr.id}
                                        onClick={() => onAddFilter(attr.id)}
                                        className="text-xs py-1.5 cursor-pointer"
                                    >
                                        {attr.label}
                                    </DropdownMenuItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Empty state - only show when no filters */}
                {activeFilters.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">Click "Add filter" to start filtering</p>
                )}
            </div>
        </div>
    );
}

export default EntityDynamicFilterPanel;

