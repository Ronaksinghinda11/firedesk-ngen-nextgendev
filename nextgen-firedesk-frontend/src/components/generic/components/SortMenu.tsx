// src/components/generic/components/SortMenu.tsx
import React from "react";
import { ArrowUp, ArrowDown, Plus, X, GripVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { SortConfig, FilterAttribute } from "../types/entity.types";

interface SortMenuProps {
    sorts: SortConfig[];
    attributes: FilterAttribute[];
    onUpdateSorts: (sorts: SortConfig[]) => void;
}

export function SortMenu({ sorts, attributes, onUpdateSorts }: SortMenuProps) {
    const handleAddSort = () => {
        const availableAttr = attributes.find(a => !sorts.some(s => s.field === a.id));
        if (availableAttr) {
            onUpdateSorts([...sorts, { field: availableAttr.id, direction: "asc" }]);
        }
    };

    const handleUpdateSort = (index: number, updates: Partial<SortConfig>) => {
        const newSorts = [...sorts];
        newSorts[index] = { ...newSorts[index], ...updates };
        onUpdateSorts(newSorts);
    };

    const handleRemoveSort = (index: number) => {
        onUpdateSorts(sorts.filter((_, i) => i !== index));
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div id="sort-menu-trigger" className="hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg border border-gray-200">
                <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <DropdownMenuLabel className="p-0 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Configure Sorting
                    </DropdownMenuLabel>
                    <button
                        onClick={() => onUpdateSorts([])}
                        className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
                    >
                        Reset
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    {sorts.length > 0 ? (
                        sorts.map((sort, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 w-12 font-medium">
                                    {index === 0 ? "Sort by" : "Then by"}
                                </span>
                                <div className="flex-grow">
                                    <Select
                                        value={sort.field}
                                        onValueChange={(val) => handleUpdateSort(index, { field: val })}
                                    >
                                        <SelectTrigger className="h-8 text-xs bg-white border-gray-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {attributes.map(attr => (
                                                <SelectItem key={attr.id} value={attr.id} className="text-xs">
                                                    {attr.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500 border-gray-200"
                                    onClick={() => handleUpdateSort(index, { direction: sort.direction === "asc" ? "desc" : "asc" })}
                                >
                                    {sort.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-red-500"
                                    onClick={() => handleRemoveSort(index)}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 bg-gray-50/30 border border-dashed border-gray-200 rounded-md">
                            <p className="text-xs text-gray-400 italic">No sorting rules applied.</p>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 bg-gray-50/30 border-t border-gray-100">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddSort}
                        disabled={sorts.length >= attributes.length}
                        className="h-8 w-full border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50 text-orange-600 gap-1.5"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add sort level</span>
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
