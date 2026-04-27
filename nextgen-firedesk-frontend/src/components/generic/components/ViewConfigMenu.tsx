// src/components/generic/components/ViewConfigMenu.tsx
import React from "react";
import { Check, Columns, Star, Users, Layout, Plus, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EntityField } from "../types/entity.types";

interface ViewConfigMenuProps {
    fields: EntityField[];
    visibleColumns: string[];
    onToggleColumn: (field: string) => void;
    onResetColumns: () => void;
}

export function ViewConfigMenu({
    fields,
    visibleColumns,
    onToggleColumn,
    onResetColumns
}: ViewConfigMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div id="view-config-menu-trigger" className="hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-0 shadow-lg border border-gray-200">
                <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <DropdownMenuLabel className="p-0 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Column Display
                    </DropdownMenuLabel>
                    <button
                        onClick={onResetColumns}
                        className="text-xs text-gray-400 hover:text-orange-500 font-medium transition-colors"
                    >
                        Reset
                    </button>
                </div>

                <div className="p-1 max-h-80 overflow-y-auto">
                    {fields.map(field => (
                        <DropdownMenuCheckboxItem
                            key={field.name}
                            checked={visibleColumns.includes(field.name)}
                            onCheckedChange={() => onToggleColumn(field.name)}
                            className="text-xs py-2 cursor-pointer"
                        >
                            {field.label}
                        </DropdownMenuCheckboxItem>
                    ))}
                </div>

                <DropdownMenuSeparator className="m-0 bg-gray-100" />

                <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                    <DropdownMenuLabel className="p-0 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Saved Views
                    </DropdownMenuLabel>
                </div>

                <div className="p-1">
                    <DropdownMenuItem className="text-xs py-2 gap-2 cursor-pointer">
                        <Star className="h-3.5 w-3.5 text-orange-400" />
                        <span>My Default View</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs py-2 gap-2 cursor-pointer text-gray-400">
                        <Users className="h-3.5 w-3.5" />
                        <span>Shared Views (None)</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem className="text-xs py-2 gap-2 cursor-pointer text-orange-600 font-medium bg-orange-50/50">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create new view...</span>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ViewConfigMenu;
