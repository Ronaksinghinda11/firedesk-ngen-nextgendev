import React from "react";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { EntityConfig } from "../types/entity.types";

interface EntityPaginationProps {
    config: EntityConfig;
    currentPage: number;
    totalPages: number;
    startIndex: number;
    paginatedEntitiesLength: number;
    totalItems: number;
    itemsPerPage: number;
    filteredEntitiesLength: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (value: number) => void;
}

export function EntityPagination({
    config,
    currentPage,
    totalPages,
    startIndex,
    paginatedEntitiesLength,
    totalItems,
    itemsPerPage,
    filteredEntitiesLength,
    onPageChange,
    onItemsPerPageChange,
}: EntityPaginationProps) {
    if (totalPages <= 1 && paginatedEntitiesLength === 0) {
        return null;
    }

    const total = config.pagination ? totalItems : filteredEntitiesLength;
    const end = Math.min(startIndex + paginatedEntitiesLength, total);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-1.5 bg-white border-t border-gray-100 shadow-inner transition-all duration-300">
            {/* Left: Results Info */}
            <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                <div className="hidden md:block">
                    Showing <span className="text-gray-700 font-semibold">{startIndex + 1}</span> to{" "}
                    <span className="text-gray-700 font-semibold">{end}</span> of{" "}
                    <span className="text-gray-700 font-semibold">{total}</span> results
                </div>

                {/* Rows per page selector */}
                <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
                    <span className="hidden lg:inline text-[10px] uppercase font-bold tracking-wider text-gray-400">Rows per page</span>
                    <Select
                        value={String(itemsPerPage)}
                        onValueChange={(val) => onItemsPerPageChange(Number(val))}
                    >
                        <SelectTrigger className="h-8 w-16 text-xs bg-gray-50 border-gray-200 focus:ring-orange-500 font-semibold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10" className="text-xs">10</SelectItem>
                            <SelectItem value="25" className="text-xs">25</SelectItem>
                            <SelectItem value="50" className="text-xs">50</SelectItem>
                            <SelectItem value="100" className="text-xs">100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Right: Navigation Controls */}
            <div className="flex items-center gap-3">
                {/* Advanced Navigation (Icon based) */}
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-30"
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        title="First Page"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-30"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        title="Previous Page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </div>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1.5 mx-1">
                    {(() => {
                        const maxButtons = 5;
                        const buttons = [];
                        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

                        if (endPage - startPage < maxButtons - 1) {
                            startPage = Math.max(1, endPage - maxButtons + 1);
                        }

                        for (let i = startPage; i <= endPage; i++) {
                            buttons.push(
                                <Button
                                    key={i}
                                    variant={currentPage === i ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => onPageChange(i)}
                                    className={`h-8 w-8 rounded-md text-xs font-bold transition-all duration-200 active:scale-90 ${currentPage === i
                                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200"
                                        : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                                        }`}
                                >
                                    {i}
                                </Button>
                            );
                        }

                        return (
                            <>
                                {startPage > 1 && <span className="text-gray-300 text-xs px-1">•••</span>}
                                {buttons}
                                {endPage < totalPages && <span className="text-gray-300 text-xs px-1">•••</span>}
                            </>
                        );
                    })()}
                </div>

                {/* Right Navigation */}
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-30"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        title="Next Page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-30"
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        title="Last Page"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default EntityPagination;
