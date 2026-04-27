// src/components/generic/components/EntityFilterBar.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Columns,
    Save,
    X,
    Search,
    Plus,
    Check
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { SortConfig, FilterAttribute, EntityField } from "../types/entity.types";

interface EntityFilterBarProps {
    activeFilterCount: number;
    showFilterPanel: boolean;
    onToggleFilterPanel: () => void;
    onClearAllFilters: () => void;
    onSaveView: () => void;
    globalSearch: string;
    onGlobalSearchChange: (value: string) => void;
    // Sort props
    sorts: SortConfig[];
    sortAttributes: FilterAttribute[];
    onUpdateSorts: (sorts: SortConfig[]) => void;
    // Column props
    fields: EntityField[];
    visibleColumns: string[];
    onToggleColumn: (field: string) => void;
    onResetColumns: () => void;
}

export function EntityFilterBar({
    activeFilterCount,
    showFilterPanel,
    onToggleFilterPanel,
    onClearAllFilters,
    onSaveView,
    globalSearch,
    onGlobalSearchChange,
    sorts,
    sortAttributes,
    onUpdateSorts,
    fields,
    visibleColumns,
    onToggleColumn,
    onResetColumns
}: EntityFilterBarProps) {

    const handleAddSort = (field: string) => {
        if (!sorts.some(s => s.field === field)) {
            onUpdateSorts([...sorts, { field, direction: "asc" }]);
        }
    };

    const handleToggleSortDirection = (field: string) => {
        const newSorts = sorts.map(s =>
            s.field === field
                ? { ...s, direction: s.direction === "asc" ? "desc" as const : "asc" as const }
                : s
        );
        onUpdateSorts(newSorts);
    };

    const handleRemoveSort = (field: string) => {
        onUpdateSorts(sorts.filter(s => s.field !== field));
    };

    const getSortForField = (field: string) => sorts.find(s => s.field === field);

    return (
        <div className="bg-white rounded-lg border border-gray-200 px-2 py-1.5 shadow-sm mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
                {/* Search Input - Compact */}
                <div className="relative flex-grow max-w-[180px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={globalSearch}
                        onChange={(e) => onGlobalSearchChange(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>

                <div className="h-5 w-px bg-gray-200" />

                {/* Sort Dropdown - Integrated */}
                {/* <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 gap-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                            <span>Sort</span>
                            {sorts.length > 0 && (
                                <span className="ml-1 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                                    {sorts.length}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-60">
                        <DropdownMenuLabel className="text-xs text-gray-500">
                            Sort by field
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {sortAttributes.map(attr => {
                            const existingSort = getSortForField(attr.id);
                            return (
                                <DropdownMenuItem
                                    key={attr.id}
                                    className="text-xs py-1.5 cursor-pointer flex items-center justify-between"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (existingSort) {
                                            handleToggleSortDirection(attr.id);
                                        } else {
                                            handleAddSort(attr.id);
                                        }
                                    }}
                                >
                                    <span>{attr.label}</span>
                                    {existingSort && (
                                        <div className="flex items-center gap-1">
                                            {existingSort.direction === "asc" ? (
                                                <ArrowUp className="h-3 w-3 text-orange-600" />
                                            ) : (
                                                <ArrowDown className="h-3 w-3 text-orange-600" />
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveSort(attr.id);
                                                }}
                                                className="ml-1 text-gray-400 hover:text-red-500"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}
                                </DropdownMenuItem>
                            );
                        })}
                        {sorts.length > 0 && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-xs py-1.5 text-red-600 cursor-pointer"
                                    onClick={() => onUpdateSorts([])}
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Clear all sorting
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu> */}

                {/* Columns Dropdown - Integrated */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 gap-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                            <Columns className="h-3.5 w-3.5" />
                            <span>Columns</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 max-h-[300px] overflow-y-auto">
                        <DropdownMenuLabel className="text-xs text-gray-500 flex items-center justify-between">
                            <span>Show columns</span>
                            <button
                                onClick={onResetColumns}
                                className="text-[10px] text-orange-600 hover:text-orange-700"
                            >
                                Reset
                            </button>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {/* Show sortAttributes (filterAttributes) which match table columns */}
                        {sortAttributes.length > 0 ? (
                            sortAttributes
                                .filter(attr => !(attr as any).hideFromColumnSelector) // Filter out attributes marked to hide from column selector
                                .map(attr => {
                                const isMandatory = (attr as any).mandatory === true;
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={attr.id}
                                        checked={visibleColumns.includes(attr.id)}
                                        onCheckedChange={() => !isMandatory && onToggleColumn(attr.id)}
                                        onSelect={(e) => e.preventDefault()}
                                        className={`text-xs py-1.5 ${isMandatory ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                        disabled={isMandatory}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {attr.label}
                                            {isMandatory && (
                                                <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            )}
                                        </span>
                                    </DropdownMenuCheckboxItem>
                                );
                            })
                        ) : (
                            fields.map(field => (
                                <DropdownMenuCheckboxItem
                                    key={field.name}
                                    checked={visibleColumns.includes(field.name)}
                                    onCheckedChange={() => onToggleColumn(field.name)}
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-xs py-1.5 cursor-pointer"
                                >
                                    {field.label}
                                </DropdownMenuCheckboxItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-5 w-px bg-gray-200" />

                {/* Save View - Compact */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSaveView}
                    className="h-7 px-2 gap-1 text-xs text-gray-500 hover:bg-gray-100"
                >
                    <Save className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Save</span>
                </Button>

                {/* Clear Filters - Only when filters active */}
                {activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearAllFilters}
                        className="h-7 px-2 gap-1 text-xs text-red-600 hover:bg-red-50"
                    >
                        <X className="h-3.5 w-3.5" />
                        <span>Clear ({activeFilterCount})</span>
                    </Button>
                )}
            </div>
        </div>
    );
}

export default EntityFilterBar;
